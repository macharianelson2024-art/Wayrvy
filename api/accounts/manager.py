from django.contrib.auth.base_user import BaseUserManager
from django.db import transaction

from .utils import normalize_phone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def get_by_natural_key(self, username):
        try:
            phone = normalize_phone(username)
        except ValueError:
            raise self.model.DoesNotExist
        return self.get(**{self.model.USERNAME_FIELD: phone})

    def _create_user(self, phone, password, **extra_fields):
        if not phone:
            raise ValueError("Phone number is required")
        if not extra_fields.get("email"):
            raise ValueError("Email is required")
        if not extra_fields.get("first_name") or not extra_fields.get("second_name"):
            raise ValueError("First name and second name are required")

        extra_fields["email"] = self.normalize_email(extra_fields["email"]).lower()

        # User + default goal (created by the post_save signal) succeed or fail together
        with transaction.atomic(using=self._db):
            user = self.model(phone=normalize_phone(phone), **extra_fields)
            user.set_password(password)
            user.save(using=self._db)
        return user

    def create_user(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(phone, password, **extra_fields)

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields["is_staff"] is not True:
            raise ValueError("Superuser must have is_staff=True")
        if extra_fields["is_superuser"] is not True:
            raise ValueError("Superuser must have is_superuser=True")
        if not password:
            raise ValueError("Superuser must have a password")
        return self._create_user(phone, password, **extra_fields)