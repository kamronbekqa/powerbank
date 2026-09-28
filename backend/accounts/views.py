"""
MECO — Accounts & KYC Views
"""
from rest_framework import status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import KYCVerification
from .serializers import UserSerializer, KYCVerificationSerializer

User = get_user_model()


class PhoneAuthView(APIView):
    """
    Phone Authentication / Login (Simulates fast OTP verification or direct token generation)
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone = request.data.get('phone', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        role = request.data.get('role', User.Role.CLIENT)

        if not phone:
            return Response({'error': 'Telefon raqam kiritilishi shart.'}, status=status.HTTP_400_BAD_REQUEST)

        user, created = User.objects.get_or_create(phone=phone)
        if created:
            user.first_name = first_name or 'Mijoz'
            user.last_name = last_name or ''
            user.role = role
            user.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Retrieve and update current user's profile & KYC info
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class SubmitKYCView(APIView):
    """
    Upload KYC documents (Passport front, back, selfie)
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        passport_series = request.data.get('passport_series')
        pinfl = request.data.get('pinfl')
        address = request.data.get('address')

        if passport_series:
            user.passport_series = passport_series
        if pinfl:
            user.pinfl = pinfl
        if address:
            user.address = address
        user.save()

        kyc_obj, _ = KYCVerification.objects.get_or_create(user=user)
        
        if 'passport_front' in request.FILES:
            kyc_obj.passport_front = request.FILES['passport_front']
        if 'passport_back' in request.FILES:
            kyc_obj.passport_back = request.FILES['passport_back']
        if 'selfie_with_passport' in request.FILES:
            kyc_obj.selfie_with_passport = request.FILES['selfie_with_passport']

        kyc_obj.status = KYCVerification.Status.PENDING
        kyc_obj.save()

        return Response({
            'message': 'KYC hujjatlari ko\'rib chiqish uchun yuborildi.',
            'kyc': KYCVerificationSerializer(kyc_obj).data
        }, status=status.HTTP_200_OK)


class AdminKYCListView(generics.ListAPIView):
    """
    Admin View: List all submitted KYC verification requests
    """
    serializer_class = KYCVerificationSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = KYCVerification.objects.all().order_by('-created_at')


class AdminKYCReviewView(APIView):
    """
    Admin View: Approve or Reject customer KYC request
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            kyc = KYCVerification.objects.get(pk=pk)
        except KYCVerification.DoesNotExist:
            return Response({'error': 'KYC hujjat topilmadi.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')  # 'approve' or 'reject'
        reason = request.data.get('rejection_reason', '')

        if action == 'approve':
            kyc.status = KYCVerification.Status.APPROVED
            kyc.rejection_reason = ''
        elif action == 'reject':
            kyc.status = KYCVerification.Status.REJECTED
            kyc.rejection_reason = reason
        else:
            return Response({'error': 'Noto\'g\'ri harakat. "approve" yoki "reject" bo\'lishi kerak.'}, status=status.HTTP_400_BAD_REQUEST)

        kyc.reviewed_at = timezone.now()
        kyc.save()

        return Response({
            'message': f'Hujjat holati: {kyc.get_status_display()}',
            'kyc': KYCVerificationSerializer(kyc).data
        })
