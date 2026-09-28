"""
MECO — Product & Inventory Models
"""
from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100, verbose_name="Kategoriya nomi")
    slug = models.SlugField(max_length=100, unique=True, verbose_name="Slug")
    icon = models.CharField(max_length=50, blank=True, default='box', verbose_name="Ikona")

    class Meta:
        verbose_name = "Kategoriya"
        verbose_name_plural = "Kategoriyalar"
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name="Kategoriya"
    )
    title = models.CharField(max_length=255, verbose_name="Mahsulot nomi")
    description = models.TextField(verbose_name="Tavsif")
    daily_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Kunlik ijara narxi (UZS)")
    deposit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Zalok summa (UZS)")
    image_url = models.URLField(max_length=500, blank=True, verbose_name="Rasm havolasi (URL)")
    is_available = models.BooleanField(default=True, verbose_name="Mavjudmi?")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")

    class Meta:
        verbose_name = "Mahsulot"
        verbose_name_plural = "Mahsulotlar"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} — {self.daily_price:,.0f} UZS/kun"
