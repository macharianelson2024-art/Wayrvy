from django.urls import path
from .views_mpesa import MpesaCallbackView

urlpatterns = [
    path("callback/", MpesaCallbackView.as_view()),
]