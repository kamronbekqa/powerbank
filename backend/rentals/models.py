"""
VOLTMAXHUB — Rental Order Model & Engine
"""
from django.db import models
from django.conf import settings
from products.models import Product
from django.utils import timezone


class RentalOrder(models.Model):
    class Status(models.TextChoices):
        PENDING_VERIFICATION = 'PENDING_VERIFICATION', 'Hujjat kutilmoqda'
        APPROVED = 'APPROVED', 'Tasdiqlangan'
        ACTIVE = 'ACTIVE', 'Faol ijara'
        RETURNED = 'RETURNED', 'Qaytarilgan'
        OVERDUE_LEGAL = 'OVERDUE_LEGAL', 'Sud jarayonida (Muddati o\'tgan)'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name="Mijoz"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name="Mahsulot"
    )
    start_date = models.DateField(verbose_name="Ijara boshlanish sanasi")
    end_date = models.DateField(verbose_name="Ijara tugash sanasi")
    total_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Jami ijara summasi")
    status = models.CharField(
        max_length=25,
        choices=Status.choices,
        default=Status.PENDING_VERIFICATION,
        verbose_name="Buyurtma holati"
    )
    pdf_file = models.FileField(
        upload_to='legal_pdfs/',
        blank=True,
        null=True,
        verbose_name="Sud Arizasi (PDF)"
    )
    overdue_days = models.PositiveIntegerField(default=0, verbose_name="Muddati o'tgan kunlar")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Buyurtma vaqti")

    class Meta:
        verbose_name = "Ijara Buyurtmasi"
        verbose_name_plural = "Ijara Buyurtmalari"
        ordering = ['-created_at']

    def __str__(self):
        return f"Buyurtma #{self.id} — {self.user.get_full_name() or self.user.phone} ({self.get_status_display()})"

    @property
    def is_overdue(self):
        """Check if active rental passed end_date by >3 days."""
        if self.status in [self.Status.RETURNED]:
            return False
        today = timezone.now().date()
        days_past = (today - self.end_date).days
        return days_past > 3
