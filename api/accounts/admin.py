from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import User
from .utils import normalize_phone


class CleanContactMixin:
    """Same phone/email normalisation the manager uses, so admin edits match signups."""

    def clean_phone(self):
        try:
            return normalize_phone(self.cleaned_data["phone"])
        except ValueError as e:
            raise forms.ValidationError(str(e))

    def clean_email(self):
        return self.cleaned_data["email"].lower()


class UserAdminCreationForm(CleanContactMixin, UserCreationForm):
    class Meta:
        model = User
        fields = ("phone", "first_name", "second_name", "email")


class UserAdminChangeForm(CleanContactMixin, UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserAdminChangeForm
    add_form = UserAdminCreationForm

    list_display = ["phone", "first_name", "second_name", "date_joined", "is_active"]
    list_filter = ["is_active", "is_staff"]
    search_fields = ["phone", "email", "first_name", "second_name"]
    ordering = ["-date_joined"]
    readonly_fields = ["date_joined", "last_login"]

    fieldsets = (
        (None, {"fields": ("phone", "password")}),
        ("Personal info", {"fields": ("first_name", "second_name", "email", "withdraw_after")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("phone", "first_name", "second_name", "email", "password1", "password2"),
        }),
    )