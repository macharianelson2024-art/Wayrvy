from rest_framework import serializers

from .models import User

from django.contrib.auth.models import update_last_login
from rest_framework_simplejwt.serializers import TokenObtainSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from django.contrib.auth import password_validation
from django.db import IntegrityError
from .models import User
from .utils import normalize_phone



class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "phone", "first_name", "second_name", "email", "withdraw_after"]
        read_only_fields = fields
        



class LoginSerializer(TokenObtainSerializer):
    token_class = RefreshToken

    def validate(self, attrs):
        super().validate(attrs)
        refresh = self.get_token(self.user)
        if api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, self.user)
        return {"refresh": refresh, "user": self.user}



class RefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        try:
            data = super().validate(attrs)
            refresh = RefreshToken(data.get("refresh", attrs["refresh"]))
            user = User.objects.get(
                **{api_settings.USER_ID_FIELD: refresh[api_settings.USER_ID_CLAIM]}
            )
        except (TokenError, User.DoesNotExist):
            raise InvalidToken("Refresh token is invalid or expired.")
        return {"refresh": refresh, "user": user}
    


class SignupSerializer(serializers.ModelSerializer):
    phone = serializers.CharField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["phone", "first_name", "second_name", "email", "password", "withdraw_after"]

    def validate_phone(self, value):
        try:
            phone = normalize_phone(value)
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        if User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError("An account with this phone number already exists.")
        return phone

    def validate_email(self, value):
        email = value.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        try:
            return User.objects.create_user(**validated_data)
        except IntegrityError:
            raise serializers.ValidationError("An account with these details already exists.")