"""
VOLTMAXHUB — Rentals & Booking Engine Views
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import datetime
from .models import RentalOrder
from products.models import Product
from .serializers import RentalOrderSerializer


class OrderCreateView(APIView):
    """
    Client Booking / Rental Order Creation API
    Calculates total price based on (end_date - start_date) * daily_price
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        product_id = request.data.get('product_id')
        start_date_str = request.data.get('start_date')
        end_date_str = request.data.get('end_date')

        if not product_id or not start_date_str or not end_date_str:
            return Response({'error': 'Mahsulot ID, boshlanish va tugash sanalari talab etiladi.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({'error': 'Mahsulot topilmadi.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Sana formati noto\'g\'ri (YYYY-MM-DD).' }, status=status.HTTP_400_BAD_REQUEST)

        days = (end_date - start_date).days
        if days <= 0:
            return Response({'error': 'Tugash sanasi boshlanish sanasidan keyin bo\'lishi shart.'}, status=status.HTTP_400_BAD_REQUEST)

        total_price = float(product.daily_price) * days

        order = RentalOrder.objects.create(
            user=user,
            product=product,
            start_date=start_date,
            end_date=end_date,
            total_price=total_price,
            status=RentalOrder.Status.PENDING_VERIFICATION if not user.is_verified else RentalOrder.Status.APPROVED
        )

        return Response({
            'message': 'Buyurtma muvaffaqiyatli yaratildi.',
            'order': RentalOrderSerializer(order).data
        }, status=status.HTTP_201_CREATED)


class ClientOrderListView(generics.ListAPIView):
    """
    List user's active & past rental orders
    """
    serializer_class = RentalOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return RentalOrder.objects.filter(user=self.request.user).order_by('-created_at')


class AdminOrderListView(generics.ListAPIView):
    """
    Admin View: List all rental orders across platform
    """
    serializer_class = RentalOrderSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = RentalOrder.objects.all().order_by('-created_at')


class AdminOrderUpdateStatusView(APIView):
    """
    Admin View: Change Order Status (e.g. APPROVED, ACTIVE, RETURNED, OVERDUE_LEGAL)
    """
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        try:
            order = RentalOrder.objects.get(pk=pk)
        except RentalOrder.DoesNotExist:
            return Response({'error': 'Buyurtma topilmadi.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status not in RentalOrder.Status.values:
            return Response({'error': 'Noto\'g\'ri status.'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = new_status
        order.save()

        return Response({
            'message': f'Status o\'zgartirildi: {order.get_status_display()}',
            'order': RentalOrderSerializer(order).data
        })
