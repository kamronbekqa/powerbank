"""
MECO — Rentals DRF Serializers
"""
from rest_framework import serializers
from .models import RentalOrder
from products.serializers import ProductSerializer
from accounts.serializers import UserSerializer


class RentalOrderSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    product_detail = ProductSerializer(source='product', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = RentalOrder
        fields = [
            'id', 'user', 'user_detail', 'product', 'product_detail',
            'start_date', 'end_date', 'total_price', 'status', 'status_display',
            'pdf_file', 'overdue_days', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'total_price', 'pdf_file', 'overdue_days', 'created_at']
