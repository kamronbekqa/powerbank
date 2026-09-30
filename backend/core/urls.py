"""
VOLTMAXHUB — Django URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# ── Admin branding ────────────────────────────────────────────────────────────
admin.site.site_header = "VOLTMAXHUB Admin"
admin.site.site_title = "VOLTMAXHUB CRM"
admin.site.index_title = "VOLTMAXHUB Boshqaruv Paneli"

urlpatterns = [
    # Django Admin (backend CRM)
    path('django-admin/', admin.site.urls),

    # API routes
    path('api/auth/', include('accounts.urls')),
    path('api/products/', include('products.urls')),
    path('api/rentals/', include('rentals.urls')),
    path('api/verification/', include('verification.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/legal/', include('legal.urls')),
    path('api/contact/', include('contact.urls')),

    # Admin API (frontend admin panel)
    path('api/admin/', include('accounts.admin_urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
