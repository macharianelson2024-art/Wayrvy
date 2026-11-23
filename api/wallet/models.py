import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower


class Goal(models.Model):
    DEFAULT_NAME = "General savings"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="goals",
    )
    name = models.CharField(max_length=60)
    target_amount = models.PositiveIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1)]
    )
    target_date = models.DateField(null=True, blank=True)
    is_default = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(is_default=True),
                name="one_default_goal_per_user",
            ),
            models.UniqueConstraint(
                Lower("name"),
                "user",
                condition=Q(archived_at__isnull=True),
                name="unique_active_goal_name_per_user",
            ),
            models.CheckConstraint(
                condition=Q(target_amount__isnull=True) | Q(target_amount__gte=1),
                name="goal_target_amount_positive",
            ),
        ]

    def __str__(self):
        return self.name


class Transaction(models.Model):
    class Kind(models.TextChoices):
        DEPOSIT = "deposit", "Deposit"
        WITHDRAWAL = "withdrawal", "Withdrawal"

    class Status(models.TextChoices):
        RECEIVED = "received", "Received"     # deposits land here
        PENDING = "pending", "Pending"        # withdrawals waiting for release
        RELEASED = "released", "Released"     # withdrawal paid out
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    goal = models.ForeignKey(
        Goal, on_delete=models.PROTECT, related_name="transactions"
    )
    kind = models.CharField(max_length=16, choices=Kind.choices)
    amount = models.PositiveIntegerField()
    fee = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=16, choices=Status.choices)
    reference = models.CharField(max_length=64, blank=True)
    release_at = models.DateTimeField(null=True, blank=True)
    payment_reference = models.ForeignKey(
        "PaymentReference",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="transactions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["goal", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.kind} {self.amount} ({self.status})"


class PaymentReference(models.Model):
    """
    M-PESA receipt + Daraja callback data for a payment.
    Populated when STK push is wired; null for manual deposits.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant_request_id = models.CharField(max_length=64, blank=True)
    checkout_request_id = models.CharField(max_length=64, blank=True)
    mpesa_receipt = models.CharField(max_length=64, blank=True, db_index=True)
    result_code = models.PositiveSmallIntegerField(null=True, blank=True)
    result_desc = models.CharField(max_length=255, blank=True)
    raw_callback = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.mpesa_receipt or str(self.id)[:8]


class IdempotencyKey(models.Model):
    """
    Prevents duplicate transaction creation from retries or double-clicks.
    The client sends a key with each money-movement request; the server stores
    the response and returns the same response if the key is seen again.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    key = models.CharField(max_length=64, db_index=True)
    response_status = models.PositiveSmallIntegerField()
    response_body = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "key")]
        indexes = [models.Index(fields=["user", "key"])]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user_id}:{self.key}"


class TransactionAuditLog(models.Model):
    """
    Append-only history of changes to transactions.
    Never updated, never deleted.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(
        Transaction, on_delete=models.CASCADE, related_name="audit_log"
    )
    field = models.CharField(max_length=32)
    old_value = models.CharField(max_length=64, blank=True)
    new_value = models.CharField(max_length=64, blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    reason = models.CharField(max_length=120, blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at"]
        indexes = [models.Index(fields=["transaction", "-changed_at"])]

    def __str__(self):
        return f"{self.transaction_id}.{self.field}"