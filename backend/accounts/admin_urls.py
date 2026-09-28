from django.urls import path
from .views import AdminKYCListView, AdminKYCReviewView
from rentals.views import AdminOrderListView, AdminOrderUpdateStatusView

app_name = 'accounts_admin'

urlpatterns = [
    path('verifications/', AdminKYCListView.as_view(), name='admin_kyc_list'),
    path('verifications/<int:pk>/review/', AdminKYCReviewView.as_view(), name='admin_kyc_review'),
    path('orders/', AdminOrderListView.as_view(), name='admin_orders_list'),
    path('orders/<int:pk>/status/', AdminOrderUpdateStatusView.as_view(), name='admin_orders_status'),
]
