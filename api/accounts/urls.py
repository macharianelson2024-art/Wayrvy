from django.urls import path

from .views import LoginView ,SignupView , RefreshView ,LogoutView ,MeView

urlpatterns = [
    path("login/", LoginView.as_view()),
    path("signup/", SignupView.as_view()),
    path("refresh/", RefreshView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("me/", MeView.as_view()),
]