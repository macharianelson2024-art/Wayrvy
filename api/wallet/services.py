import logging
import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import transaction
from django.db.models import Sum, Q
from django.utils import timezone

from .models import (
    Goal,
    Transaction,
    TransactionAuditLog,
    PaymentReference,
    IdempotencyKey,
)

logger = logging.getLogger(__name__)

INSTANT_WITHDRAWAL_FEE_RATE = Decimal("0.10")
MAX_DEPOSIT_KES = 100_000
MAX_WITHDRAWAL_KES = 500_000


# ============================================================================
# Goal & balance helpers
# ============================================================================

def ensure_default_goal(user):
    goal, created = Goal.objects.get_or_create(
        user=user,
        is_default=True,
        defaults={"name": Goal.DEFAULT_NAME},
    )
    if created:
        logger.info("Created default goal for user %s", user.pk)
    return goal


def goal_balance(goal) -> int:
    """Net balance for one goal: deposits received minus withdrawals (pending + released)."""
    agg = goal.transactions.aggregate(
        deposits=Sum("amount", filter=Q(kind="deposit", status="received")),
        withdrawals=Sum(
            "amount",
            filter=Q(kind="withdrawal", status__in=["pending", "released"]),
        ),
    )
    return (agg["deposits"] or 0) - (agg["withdrawals"] or 0)


def goal_available(goal) -> int:
    return max(0, goal_balance(goal))


def user_totals(user):
    agg = user.transactions.aggregate(
        deposits=Sum("amount", filter=Q(kind="deposit", status="received")),
        released=Sum("amount", filter=Q(kind="withdrawal", status="released")),
        pending=Sum("amount", filter=Q(kind="withdrawal", status="pending")),
    )
    deposits = agg["deposits"] or 0
    released = agg["released"] or 0
    pending = agg["pending"] or 0
    return {
        "total_saved": deposits - released,
        "available": deposits - released - pending,
        "pending": pending,
    }


# ============================================================================
# Auditing
# ============================================================================

def log_transaction_change(tx: Transaction, field: str, old, new, *, changed_by=None, reason=""):
    TransactionAuditLog.objects.create(
        transaction=tx,
        field=field,
        old_value=str(old) if old is not None else "",
        new_value=str(new) if new is not None else "",
        changed_by=changed_by,
        reason=reason,
    )


# ============================================================================
# Idempotency
# ============================================================================

def get_cached_idempotent_response(user, key):
    try:
        record = IdempotencyKey.objects.get(user=user, key=key)
        return record.response_status, record.response_body
    except IdempotencyKey.DoesNotExist:
        return None


def cache_idempotent_response(user, key, status_code, body):
    IdempotencyKey.objects.create(
        user=user,
        key=key,
        response_status=status_code,
        response_body=body,
    )


# ============================================================================
# Fee calculation
# ============================================================================

def instant_withdrawal_fee(amount: int) -> int:
    if amount <= 0:
        return 0
    raw = (Decimal(amount) * INSTANT_WITHDRAWAL_FEE_RATE).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    )
    return max(1, int(raw))


# ============================================================================
# Deposits
# ============================================================================

class DepositError(Exception):
    def __init__(self, message, field="amount"):
        super().__init__(message)
        self.message = message
        self.field = field


class DepositResult:
    def __init__(self, transaction: Transaction, awaiting_mpesa: bool):
        self.transaction = transaction
        self.awaiting_mpesa = awaiting_mpesa

    @property
    def status(self):
        return self.transaction.status


@transaction.atomic
def create_deposit(user, goal_id, amount: int) -> DepositResult:
    """
    Create a deposit. Returns a DepositResult.
    Raises DepositError on business-rule violation.

    Behavior depends on settings.DEPOSIT_MODE:
        "manual": mark as received immediately (dev/testing)
        "mpesa":  create as pending, fire STK push, wait for callback
    """
    if not isinstance(amount, int) or amount < 1:
        raise DepositError("Enter an amount of at least KES 1.")
    if amount > MAX_DEPOSIT_KES:
        raise DepositError(f"Maximum deposit is KES {MAX_DEPOSIT_KES:,}.")

    try:
        goal = Goal.objects.select_for_update().get(
            pk=goal_id, user=user, archived_at__isnull=True
        )
    except Goal.DoesNotExist:
        raise DepositError("Goal not found.", field="goal_id")

    # Enforce the goal's target limit, if a target is set.
    # Row is locked, so no concurrent deposit can slip in between check and insert.
    if goal.target_amount is not None:
        current = goal_balance(goal)
        if current + amount > goal.target_amount:
            remaining = max(0, goal.target_amount - current)
            if remaining == 0:
                raise DepositError(
                    f"This goal has reached its target of KES {goal.target_amount:,}.",
                    field="amount",
                )
            raise DepositError(
                f"This deposit would exceed the goal's target of KES {goal.target_amount:,}. "
                f"You can deposit up to KES {remaining:,}.",
                field="amount",
            )

    mode = getattr(settings, "DEPOSIT_MODE", "manual")

    tx = Transaction.objects.create(
        user=user,
        goal=goal,
        kind=Transaction.Kind.DEPOSIT,
        amount=amount,
        fee=0,
        status=(
            Transaction.Status.RECEIVED
            if mode == "manual"
            else Transaction.Status.PENDING
        ),
    )
    log_transaction_change(
        tx, "created", None, f"{tx.kind}:{amount}", reason=f"deposit:{mode}"
    )

    if mode == "manual":
        return DepositResult(tx, awaiting_mpesa=False)

    from .daraja import initiate_stk_push, DarajaError

    try:
        stk = initiate_stk_push(
            phone=user.phone,
            amount=amount,
            account_reference="Wayrvy",
            description=f"Deposit to {goal.name}",
        )
    except DarajaError as e:
        tx.status = Transaction.Status.FAILED
        tx.save(update_fields=["status"])
        log_transaction_change(
            tx, "status", "pending", "failed", reason=f"stk-fail:{e}"
        )
        raise DepositError(
            "Could not reach M-PESA. Try again in a moment.", field="__form"
        )

    ref = PaymentReference.objects.create(
        merchant_request_id=stk.get("MerchantRequestID", ""),
        checkout_request_id=stk.get("CheckoutRequestID", ""),
        result_code=None,
        result_desc="",
        raw_callback=stk,
    )
    tx.payment_reference = ref
    tx.save(update_fields=["payment_reference"])

    return DepositResult(tx, awaiting_mpesa=True)


# ============================================================================
# Withdrawals
# ============================================================================

class WithdrawalError(Exception):
    def __init__(self, message, field="amount"):
        super().__init__(message)
        self.message = message
        self.field = field


@transaction.atomic
def create_withdrawal(user, goal_id, amount: int) -> Transaction:
    if not isinstance(amount, int) or amount < 1:
        raise WithdrawalError("Enter an amount of at least KES 1.")
    if amount > MAX_WITHDRAWAL_KES:
        raise WithdrawalError(f"Maximum withdrawal is KES {MAX_WITHDRAWAL_KES:,}.")

    try:
        goal = Goal.objects.select_for_update().get(
            pk=goal_id, user=user, archived_at__isnull=True
        )
    except Goal.DoesNotExist:
        raise WithdrawalError("Goal not found.", field="goal_id")

    available = goal_available(goal)
    if amount > available:
        raise WithdrawalError(
            f"Available to withdraw is KES {available:,}.", field="amount"
        )

    release_at = timezone.now() + timezone.timedelta(hours=user.withdraw_after)

    tx = Transaction.objects.create(
        user=user,
        goal=goal,
        kind=Transaction.Kind.WITHDRAWAL,
        amount=amount,
        fee=0,
        status=Transaction.Status.PENDING,
        release_at=release_at,
    )
    log_transaction_change(
        tx, "created", None, f"{tx.kind}:{amount}", reason="withdrawal:pending"
    )
    return tx


# ============================================================================
# Release worker
# ============================================================================

@transaction.atomic
def release_due_withdrawals():
    now = timezone.now()
    due = (
        Transaction.objects
        .select_for_update(skip_locked=True)
        .filter(
            kind=Transaction.Kind.WITHDRAWAL,
            status=Transaction.Status.PENDING,
            release_at__lte=now,
        )
    )
    count = 0
    for tx in due:
        tx.status = Transaction.Status.RELEASED
        tx.save(update_fields=["status"])
        log_transaction_change(
            tx, "status", "pending", "released", reason="auto-release"
        )
        count += 1
    return count