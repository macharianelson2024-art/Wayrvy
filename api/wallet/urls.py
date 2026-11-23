from django.urls import path

from .views import (
    DashboardSummaryView,
    DepositView,
    GoalArchiveView,
    GoalDetailView,
    GoalListCreateView,
    TransactionDetailView,
    TransactionListView,
    WithdrawalView,
)

urlpatterns = [
    path("goals/", GoalListCreateView.as_view()),
    path("goals/<uuid:pk>/", GoalDetailView.as_view()),
    path("goals/<uuid:pk>/archive/", GoalArchiveView.as_view()),
    path("dashboard/", DashboardSummaryView.as_view()),
    path("transactions/", TransactionListView.as_view()),
    path("transactions/<uuid:pk>/", TransactionDetailView.as_view()),
    path("deposits/", DepositView.as_view()),
    path("withdrawals/", WithdrawalView.as_view()),
]