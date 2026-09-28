"""
MECO — Accounts & Verification DRF Serializers
"""
from rest_framework import serializers
from .models import User, KYCVerification


class UserSerializer(serializers.ModelSerializer):
    is_verified = serializers.ReadOnlyField()
    verification_status = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id', 'phone', 'first_name', 'last_name', 'email',
            'passport_series', 'pinfl', 'address', 'role',
            'status', 'is_verified', 'verification_status', 'created_at'
        ]
        read_only_fields = ['id', 'role', 'status', 'created_at']


class KYCVerificationSerializer(serializers.ModelSerializer):
    user_phone = serializers.ReadOnlyField(source='user.phone')
    user_full_name = serializers.ReadOnlyField(source='user.get_full_name')

    class Meta:
        model = KYCVerification
        fields = [
            'id', 'user', 'user_phone', 'user_full_name',
            'passport_front', 'passport_back', 'selfie_with_passport',
            'status', 'rejection_reason', 'reviewed_at', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'reviewed_at', 'created_at']
