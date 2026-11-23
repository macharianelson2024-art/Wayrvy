from django.utils import timezone
from rest_framework import serializers

from .models import Goal, Transaction
from .services import goal_balance

MAX_ACTIVE_GOALS = 10


class GoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Goal
        fields = ["id", "name", "target_amount", "target_date", "is_default", "created_at"]
        read_only_fields = ["id", "is_default", "created_at"]

    def validate_name(self, value):
        value = " ".join(value.split())
        if not value:
            raise serializers.ValidationError("Give your goal a name.")
        user = self.context["request"].user
        clash = Goal.objects.filter(
            user=user, archived_at__isnull=True, name__iexact=value
        )
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError("You already have a goal with this name.")
        return value

    def validate_target_date(self, value):
        if self.instance and value == self.instance.target_date:
            return value
        if value and value < timezone.localdate():
            raise serializers.ValidationError("Target date can't be in the past.")
        return value

    def validate(self, attrs):
        if self.instance is None:
            user = self.context["request"].user
            active = Goal.objects.filter(user=user, archived_at__isnull=True).count()
            if active >= MAX_ACTIVE_GOALS:
                raise serializers.ValidationError(
                    f"You can have up to {MAX_ACTIVE_GOALS} goals."
                )
        return attrs


class GoalWithBalanceSerializer(serializers.ModelSerializer):
    balance = serializers.SerializerMethodField()

    class Meta:
        model = Goal
        fields = [
            "id", "name", "target_amount", "target_date",
            "is_default", "created_at", "balance",
        ]
        read_only_fields = fields

    def get_balance(self, obj):
        return goal_balance(obj)


class TransactionSerializer(serializers.ModelSerializer):
    goal_name = serializers.CharField(source="goal.name", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id", "kind", "status", "amount", "fee",
            "goal_name", "reference", "release_at", "created_at",
        ]
        read_only_fields = fields


class DepositSerializer(serializers.Serializer):
    goal_id = serializers.UUIDField()
    amount = serializers.IntegerField(min_value=1)
    idempotency_key = serializers.CharField(max_length=64, required=False, allow_blank=True)


class WithdrawalSerializer(serializers.Serializer):
    goal_id = serializers.UUIDField()
    amount = serializers.IntegerField(min_value=1)
    idempotency_key = serializers.CharField(max_length=64, required=False, allow_blank=True)