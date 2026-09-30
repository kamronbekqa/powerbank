"""
VOLTMAXHUB — Custom User Model & KYC Verification Models
Primary identifier: phone number (not username)
"""
import re
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom manager for phone-based authentication."""

    def _validate_phone(self, phone):
        phone = re.sub(r'\s+', '', str(phone).strip())
        if not re.match(r'^\+?[0-9]{9,15}$', phone):
            raise ValueError(f"Invalid phone number: {phone}")
        return phone

    def create_user(self, phone, password=None, **extra_fields):
        if not phone:
            raise ValueError("Phone number is required.")
        phone = self._validate_phone(phone)
        extra_fields.setdefault('is_active', True)
        user = self.model(phone=phone, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(phone, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    VOLTMAXHUB custom user model.
    Phone is used as the primary identifier instead of username.
    """

    class Role(models.TextChoices):
        CLIENT = 'CLIENT', 'Mijoz'
        ADMIN = 'ADMIN', 'Administrator'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Faol'
        INACTIVE = 'inactive', 'Faolsiz'
        BLOCKED = 'blocked', 'Bloklangan'

    phone = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="Telefon raqam",
        help_text="Masalan: +998901234567"
    )
    first_name = models.CharField(max_length=100, blank=True, verbose_name="Ism")
    last_name = models.CharField(max_length=100, blank=True, verbose_name="Familiya")
    email = models.EmailField(blank=True, null=True, verbose_name="Email")

    # KYC Details
    passport_series = models.CharField(max_length=10, blank=True, null=True, verbose_name="Pasport seriyasi & raqami")
    pinfl = models.CharField(max_length=14, blank=True, null=True, verbose_name="JSHSHIR (PINFL)")
    address = models.TextField(blank=True, null=True, verbose_name="Yashash manzili")

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.CLIENT,
        verbose_name="Roli"
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
        verbose_name="Status"
    )

    is_staff = models.BooleanField(default=False, verbose_name="Xodim")
    is_active = models.BooleanField(default=True, verbose_name="Faol")

    created_at = models.DateTimeField(default=timezone.now, verbose_name="Ro'yxatdan o'tgan")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Yangilangan")

    objects = UserManager()

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "Foydalanuvchi"
        verbose_name_plural = "Foydalanuvchilar"
        ordering = ['-created_at']

    def __str__(self):
        full = self.get_full_name()
        return f"{full} ({self.phone})" if full else self.phone

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name or self.phone

    @property
    def is_verified(self):
        """Check if customer has approved KYC verification."""
        try:
            return hasattr(self, 'kyc') and self.kyc.status == KYCVerification.Status.APPROVED
        except Exception:
            return False

    @property
    def verification_status(self):
        """Return current KYC verification status or PENDING/NOT_SUBMITTED."""
        try:
            return self.kyc.status if hasattr(self, 'kyc') else 'NOT_SUBMITTED'
        except Exception:
            return 'NOT_SUBMITTED'


class KYCVerification(models.Model):
    """
    Client Identity Verification (KYC) Submission
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Kutilmoqda'
        APPROVED = 'APPROVED', 'Tasdiqlandi'
        REJECTED = 'REJECTED', 'Rad etildi'

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='kyc',
        verbose_name="Foydalanuvchi"
    )
    passport_front = models.ImageField(upload_to='kyc/passports/', verbose_name="Pasport old qismi")
    passport_back = models.ImageField(upload_to='kyc/passports/', verbose_name="Pasport orqa qismi")
    selfie_with_passport = models.ImageField(upload_to='kyc/selfies/', verbose_name="Pasport bilan selfie")

    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="Hujjat holati"
    )
    rejection_reason = models.TextField(blank=True, null=True, verbose_name="Rad etish sababi")
    reviewed_at = models.DateTimeField(blank=True, null=True, verbose_name="Ko'rib chiqilgan vaqt")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yuborilgan vaqt")

    class Meta:
        verbose_name = "KYC Hujjat"
        verbose_name_plural = "KYC Hujjatlar"
        ordering = ['-created_at']

    def __str__(self):
        return f"KYC — {self.user.phone} ({self.get_status_display()})"
