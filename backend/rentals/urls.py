from django.urls import path
from .views import OrderCreateView, ClientOrderListView

app_name = 'rentals'

urlpatterns = [
    path('create/', OrderCreateView.as_view(), name='order_create'),
    path('my-orders/', ClientOrderListView.as_view(), name='client_orders'),
]
