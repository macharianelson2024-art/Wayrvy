from django.contrib import admin
from django.utils.html import format_html

from .models import (
    Goal,
    Transaction,
    PaymentReference,
    IdempotencyKey,
    TransactionAuditLog,
)


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "is_default", "archived_at", "created_at"]
    list_filter = ["is_default"]
    search_fields = ["name", "user__phone"]
    readonly_fields = ["is_default", "created_at"]
    raw_id_fields = ["user"]

    def has_delete_permission(self, request, obj=None):
        if obj is not None and obj.is_default:
            return False
        return super().has_delete_permission(request, obj)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        "short_id",
        "user",
        "goal",
        "kind",
        "amount_display",
        "status",
        "release_at",
        "created_at",
    ]
    list_filter = ["kind", "status", "created_at"]
    search_fields = ["user__phone", "goal__name", "reference", "id"]
    readonly_fields = ["id", "created_at"]
    raw_id_fields = ["user", "goal", "payment_reference"]
    date_hierarchy = "created_at"
    list_select_related = ["user", "goal"]
    ordering = ["-created_at"]

    fieldsets = (
        (None, {
            "fields": ("id", "user", "goal", "kind", "status"),
        }),
        ("Money", {
            "fields": ("amount", "fee", "reference", "payment_reference"),
        }),
        ("Timing", {
            "fields": ("release_at", "created_at"),
        }),
    )

    @admin.display(description="ID", ordering="id")
    def short_id(self, obj):
        return str(obj.id)[:8]

    @admin.display(description="Amount (KES)")
    def amount_display(self, obj):
        sign = "+" if obj.kind == "deposit" else "−"
        color = "#0E4F55" if obj.kind == "deposit" else "#B42318"
        amount_str = f"{obj.amount:,}"
        return format_html(
            '<span style="color:{};font-weight:600;">{} {}</span>',
            color, sign, amount_str,
        )


@admin.register(PaymentReference)
class PaymentReferenceAdmin(admin.ModelAdmin):
    list_display = ["short_id", "mpesa_receipt", "result_code", "created_at"]
    search_fields = ["mpesa_receipt", "merchant_request_id", "checkout_request_id"]
    readonly_fields = ["id", "created_at"]
    ordering = ["-created_at"]

    @admin.display(description="ID", ordering="id")
    def short_id(self, obj):
        return str(obj.id)[:8]


@admin.register(IdempotencyKey)
class IdempotencyKeyAdmin(admin.ModelAdmin):
    list_display = ["short_id", "user", "key", "response_status", "created_at"]
    search_fields = ["user__phone", "key"]
    readonly_fields = ["id", "created_at"]
    raw_id_fields = ["user"]
    ordering = ["-created_at"]

    @admin.display(description="ID", ordering="id")
    def short_id(self, obj):
        return str(obj.id)[:8]


@admin.register(TransactionAuditLog)
class TransactionAuditLogAdmin(admin.ModelAdmin):
    list_display = [
        "short_id",
        "transaction_link",
        "field",
        "old_value",
        "new_value",
        "changed_by",
        "reason",
        "changed_at",
    ]
    list_filter = ["field", "changed_at"]
    search_fields = ["transaction__id", "reason"]
    readonly_fields = [
        "id", "transaction", "field", "old_value", "new_value",
        "changed_by", "reason", "changed_at",
    ]
    raw_id_fields = ["transaction", "changed_by"]
    ordering = ["-changed_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="ID", ordering="id")
    def short_id(self, obj):
        return str(obj.id)[:8]

    @admin.display(description="Transaction")
    def transaction_link(self, obj):
        return str(obj.transaction_id)[:8]