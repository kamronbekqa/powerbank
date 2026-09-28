from django.urls import path
from .views import LegalCourtPDFPreviewView

app_name = 'legal'

urlpatterns = [
    path('davo-arizasi/<int:order_id>/', LegalCourtPDFPreviewView.as_view(), name='davo_arizasi_preview'),
]
