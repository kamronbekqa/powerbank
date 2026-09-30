"""
VOLTMAXHUB Legal Engine — Court Application (Da'vo Arizasi) Generator
Injects defaulted client details & calculates overdue penalty according to Uzbek Civil Code rental guidelines.
"""
import os
from django.conf import settings
from django.utils import timezone


def generate_davo_arizasi_html(rental_order):
    """
    Generates Uzbek Court Claim Application (Da'vo Arizasi) HTML content.
    """
    user = rental_order.user
    product = rental_order.product
    today = timezone.now().date()
    
    overdue_days = max((today - rental_order.end_date).days, rental_order.overdue_days or 1)
    daily_penalty = float(product.daily_price) * 0.05  # 5% daily penalty
    total_penalty = daily_penalty * overdue_days
    grand_total = float(rental_order.total_price) + total_penalty

    html_content = f"""<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>Da'vo Arizasi — VOLTMAXHUB #{rental_order.id}</title>
    <style>
        body {{ font-family: 'Times New Roman', Times, serif; font-size: 14pt; line-height: 1.6; margin: 40px; color: #000; }}
        .header {{ text-align: right; margin-bottom: 30px; font-size: 12pt; }}
        .title {{ text-align: center; font-weight: bold; font-size: 16pt; margin: 20px 0; text-transform: uppercase; }}
        .content {{ text-align: justify; text-indent: 30px; margin-bottom: 15px; }}
        .details-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        .details-table th, .details-table td {{ border: 1px solid #000; padding: 8px 12px; text-align: left; font-size: 12pt; }}
        .details-table th {{ background-color: #f2f2f2; }}
        .signature {{ margin-top: 50px; display: flex; justify-content: space-between; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="header">
        <strong>Fuqarolik ishlari bo‘yicha tuman sudiga</strong><br>
        <strong>Da'vogar:</strong> "VOLTMAXHUB" MChJ<br>
        <strong>Manzil:</strong> Toshkent sh., Chilonzor t., 10-mavze<br>
        <strong>Javobgar:</strong> {user.get_full_name() or 'Mijoz'}<br>
        <strong>Tel:</strong> {user.phone}<br>
        <strong>Pasport:</strong> {user.passport_series or 'Noma\'lum'}<br>
        <strong>PINFL (JSHSHIR):</strong> {user.pinfl or 'Noma\'lum'}<br>
        <strong>Manzil:</strong> {user.address or 'Noma\'lum'}
    </div>

    <div class="title">
        DA'VO ARIZASI<br>
        <span style="font-size: 12pt; font-weight: normal;">(Ijara shartnomasi majburiyatlarini bajarmaslik va mulkni qaytarish hamda zararni undirish to‘g‘risida)</span>
    </div>

    <div class="content">
        Da'vogar "VOLTMAXHUB" MChJ va javobgar <strong>{user.get_full_name()}</strong> o‘rtasida {rental_order.start_date.strftime('%d.%m.%Y')} yilda ommaviy oferta (ijara shartnomasi) tuzilgan. Shartnomaga muvofiq, da'vogar javobgarga <strong>"{product.title}"</strong> uskunasini {rental_order.start_date.strftime('%d.%m.%Y')} dan {rental_order.end_date.strftime('%d.%m.%Y')} gacha vaqtinchalik foydalanishga bergan.
    </div>

    <div class="content">
        Biroq, javobgar ijara muddati tugagandan so‘ng ({rental_order.end_date.strftime('%d.%m.%Y')}), shartnoma majburiyatlarini buzib, uskunani belgilangan muddatda da'vogarga qaytarmagan. Hozirgi kunga qadar kelib tushgan muddati o‘tgan kunlar soni <strong>{overdue_days} kun</strong>ni tashkil etadi.
    </div>

    <table class="details-table">
        <tr>
            <th>Ko‘rsatkich</th>
            <th>Hisoblangan Summa</th>
        </tr>
        <tr>
            <td>Asosiy Ijara Summasi</td>
            <td>{rental_order.total_price:,.0f} UZS</td>
        </tr>
        <tr>
            <td>Muddati o‘tgan kunlar uchun penya ({overdue_days} kun × 5%)</td>
            <td>{total_penalty:,.0f} UZS</td>
        </tr>
        <tr>
            <th>Jami undirilishi lozim bo‘lgan summa</th>
            <th>{grand_total:,.0f} UZS</th>
        </tr>
    </table>

    <div class="content">
        O‘zbekiston Respublikasi Fuqarolik Kodeksining 535, 550 va 553-moddalariga asosan,
    </div>

    <div class="title" style="font-size: 14pt;">SO‘RAYMAN:</div>

    <div class="content">
        1. Javobgar <strong>{user.get_full_name()}</strong> dan da'vogar "VOLTMAXHUB" MChJ foydasiga <strong>{grand_total:,.0f} UZS</strong> miqdoridagi qarzdorlik va penyani undirishni;
    </div>
    <div class="content">
        2. Javobgarga vaqtincha foydalanishga berilgan <strong>"{product.title}"</strong> uskunasini naturada qaytarib berish majburiyatini yuklashni;
    </div>
    <div class="content">
        3. Sud xarajatlarini javobgar zimmasiga yuklashni.
    </div>

    <br>
    <table style="width: 100%; margin-top: 40px;">
        <tr>
            <td><strong>Sana:</strong> {today.strftime('%d.%m.%Y')} y.</td>
            <td style="text-align: right;"><strong>"VOLTMAXHUB" MChJ Direktori: ___________</strong></td>
        </tr>
    </table>
</body>
</html>"""
    return html_content
