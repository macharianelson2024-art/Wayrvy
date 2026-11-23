from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status
from .serializers import UserSerializer
from rest_framework_simplejwt.settings import api_settings
from django.conf import settings


ALLOWED_CLIENTS = {"android", "web"}
DEFAULT_CLIENT = "web"


def get_client(request):
    client = request.query_params.get("client", DEFAULT_CLIENT).lower()
    if client not in ALLOWED_CLIENTS:
        raise ValidationError({"client": "Must be 'android' or 'web'."})
    return client




REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/auth/"


def set_refresh_cookie(response, refresh):
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        str(refresh),
        max_age=int(api_settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        path=REFRESH_COOKIE_PATH,
    )


def build_auth_response(refresh, user, client, status_code=status.HTTP_200_OK):
    data = {
        "access": str(refresh.access_token),
        "user": UserSerializer(user).data,
    }
    if client == "android":
        data["refresh"] = str(refresh)

    response = Response(data, status=status_code)
    if client == "web":
        set_refresh_cookie(response, refresh)
    return response

