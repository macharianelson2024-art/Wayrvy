from django.contrib.auth.models import update_last_login
from rest_framework import status, serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    LoginSerializer,
    SignupSerializer,
    UserSerializer,
    RefreshSerializer,
)
from .tokens import (
    build_auth_response,
    get_client,
    REFRESH_COOKIE_NAME,
    REFRESH_COOKIE_PATH,
)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_authenticate_header(self, request):
        return 'Bearer realm="api"'

    def post(self, request):
        client = get_client(request)
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return build_auth_response(data["refresh"], data["user"], client)


class SignupView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        client = get_client(request)
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        if api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, user)
        return build_auth_response(refresh, user, client, status.HTTP_201_CREATED)


class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        client = get_client(request)
        if client == "web":
            token = request.COOKIES.get(REFRESH_COOKIE_NAME)
        else:
            token = request.data.get("refresh")

        try:
            if not token:
                raise AuthenticationFailed("No refresh token provided.")
            serializer = RefreshSerializer(data={"refresh": token})
            serializer.is_valid(raise_exception=True)
        except AuthenticationFailed as exc:
            response = Response(
                {"detail": exc.detail}, status=status.HTTP_401_UNAUTHORIZED
            )
            if client == "web":
                response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
            return response

        data = serializer.validated_data
        return build_auth_response(data["refresh"], data["user"], client)


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        client = get_client(request)
        if client == "web":
            token = request.COOKIES.get(REFRESH_COOKIE_NAME)
        else:
            token = request.data.get("refresh")

        if token:
            try:
                RefreshToken(token).blacklist()
            except Exception:
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        if client == "web":
            response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
        return response


class MeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "second_name", "withdraw_after"]


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = MeUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)