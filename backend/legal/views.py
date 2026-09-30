"""
VOLTMAXHUB — Legal Court PDF Generator Views
"""
from rest_framework import permissions, status
from rest_framework.views import APIView
from django.http import HttpResponse
from django.http import JsonResponse
from rentals.models import RentalOrder
from .services import generate_davo_arizasi_html


class LegalCourtPDFPreviewView(APIView):
    """
    Admin View: Generate & Preview/Download Legal Court Claim (Da'vo Arizasi) for defaulted rental
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, order_id):
        try:
            order = RentalOrder.objects.get(pk=order_id)
        except RentalOrder.DoesNotExist:
            return HttpResponse('Buyurtma topilmadi.', status=404)

        html_content = generate_davo_arizasi_html(order)

        # Check if PDF output format requested, else output HTML court document preview
        output_format = request.GET.get('format', 'html')
        if output_format == 'pdf':
            try:
                import weasyprint
                pdf_bytes = weasyprint.HTML(string=html_content).write_pdf()
                response = HttpResponse(pdf_bytes, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="Davo_Arizasi_Order_{order.id}.pdf"'
                return response
            except Exception as e:
                return JsonResponse({'error': f'PDF yaratilmadi: {e}'}, status=503)

        return HttpResponse(html_content, content_type='text/html; charset=utf-8')
