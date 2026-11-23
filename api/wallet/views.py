from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework import generics, serializers, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .mixins import IdempotentMixin
from .models import Goal, Transaction
from .serializers import (
    DepositSerializer,
    GoalSerializer,
    GoalWithBalanceSerializer,
    TransactionSerializer,
    WithdrawalSerializer,
)
from .services import (
    DepositError,
    WithdrawalError,
    create_deposit,
    create_withdrawal,
    goal_balance,
    user_totals,
)


# ============================================================================
# Goal endpoints
# ============================================================================

class UserGoalsMixin:
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Goal.objects.filter(
            user=self.request.user, archived_at__isnull=True
        )


class GoalListCreateView(UserGoalsMixin, generics.ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "GET":
            return GoalWithBalanceSerializer
        return GoalSerializer

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                serializer.save(user=self.request.user)
        except IntegrityError:
            raise serializers.ValidationError(
                {"name": "You already have a goal with this name."}
            )


class GoalDetailView(UserGoalsMixin, generics.RetrieveUpdateAPIView):
    serializer_class = GoalSerializer
    http_method_names = ["get", "patch", "head", "options"]


class GoalArchiveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            goal = Goal.objects.get(
                pk=pk, user=request.user, archived_at__isnull=True
            )
        except Goal.DoesNotExist:
            return Response({"detail": "Goal not found."}, status=404)

        if goal.is_default:
            return Response(
                {"detail": "The default goal can't be archived."}, status=400
            )

        goal.archived_at = timezone.now()
        goal.save(update_fields=["archived_at"])
        return Response(status=204)


# ============================================================================
# Dashboard
# ============================================================================

class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        totals = user_totals(user)

        # Goals: default first, others by last transaction activity, then by created_at.
        goals = (
            Goal.objects
            .filter(user=user, archived_at__isnull=True)
            .annotate(last_tx_at=Max("transactions__created_at"))
            .order_by("-is_default", "-last_tx_at", "-created_at")
        )

        # Recent activity: last 5 only.
        recent = (
            user.transactions
            .select_related("goal")
            .order_by("-created_at")[:5]
        )

        next_release = (
            user.transactions.filter(kind="withdrawal", status="pending")
            .order_by("release_at")
            .first()
        )

        return Response({
            "totals": totals,
            "withdraw_after": user.withdraw_after,
            "next_release_at": next_release.release_at if next_release else None,
            "goals": [
                {
                    "id": str(g.id),
                    "name": g.name,
                    "target_amount": g.target_amount,
                    "target_date": g.target_date,
                    "is_default": g.is_default,
                    "balance": goal_balance(g),
                }
                for g in goals
            ],
            "recent": [
                {
                    "id": str(t.id),
                    "kind": t.kind,
                    "status": t.status,
                    "amount": t.amount,
                    "fee": t.fee,
                    "goal_name": t.goal.name,
                    "release_at": t.release_at,
                    "created_at": t.created_at,
                }
                for t in recent
            ],
        })


# ============================================================================
# Activity
# ============================================================================

class TransactionPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = "page_size"
    max_page_size = 100


class TransactionListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TransactionSerializer
    pagination_class = TransactionPagination

    def get_queryset(self):
        qs = (
            self.request.user.transactions
            .select_related("goal")
            .order_by("-created_at")
        )
        kind = self.request.query_params.get("kind")
        if kind in ("deposit", "withdrawal"):
            qs = qs.filter(kind=kind)
        return qs


class TransactionDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return self.request.user.transactions.select_related("goal")


# ============================================================================
# Money movement
# ============================================================================

class DepositView(IdempotentMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return self.run_idempotent(request, self._do_deposit)

    def _do_deposit(self, request):
        serializer = DepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            result = create_deposit(
                user=request.user,
                goal_id=data["goal_id"],
                amount=data["amount"],
            )
        except DepositError as e:
            return Response({e.field: [e.message]}, status=400)

        return Response(
            {
                "transaction_id": str(result.transaction.id),
                "status": result.transaction.status,
                "message": (
                    "Check your phone and enter your M-PESA PIN."
                    if result.awaiting_mpesa
                    else "Deposit received."
                ),
            },
            status=201,
        )


class WithdrawalView(IdempotentMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return self.run_idempotent(request, self._do_withdraw)

    def _do_withdraw(self, request):
        serializer = WithdrawalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        password = request.data.get("password", "")
        if not password:
            return Response(
                {"password": ["Enter your password to confirm."]}, status=400
            )
        if not request.user.check_password(password):
            return Response({"password": ["Incorrect password."]}, status=400)

        try:
            tx = create_withdrawal(
                user=request.user,
                goal_id=data["goal_id"],
                amount=data["amount"],
            )
        except WithdrawalError as e:
            return Response({e.field: [e.message]}, status=400)

        return Response(
            {
                "transaction_id": str(tx.id),
                "status": tx.status,
                "release_at": tx.release_at,
                "message": "Withdrawal queued.",
            },
            status=201,
        )