import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    env[key] = val;
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const botToken = env.TELEGRAM_BOT_TOKEN || '';
  const botChatId = env.TELEGRAM_CHAT_ID || '';

  if (!botToken || !botChatId) {
    console.error('TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID .env da topilmadi');
    process.exit(1);
  }

  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const companyName = settings?.companyName || 'VOLTMAXHUB';

  const orderId = 'daed6c35-b5f8-4573-ad51-31493869d3bc';
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, product: true }
  });

  if (!order) {
    console.error('Demo order topilmadi');
    process.exit(1);
  }

  const todayStr = new Date().toLocaleDateString('uz-UZ');
  const endDateStr = order.endDate ? new Date(order.endDate).toLocaleDateString('uz-UZ') : '—';
  const now = new Date();
  const daysOverdue = order.endDate ? Math.max(1, Math.floor((now - new Date(order.endDate)) / (1000 * 60 * 60 * 24))) : 5;

  const baseAmount = order.totalAmount || 1500000;
  const penaltyRate = 0.005;
  const penaltyAmount = Math.round(baseAmount * penaltyRate * daysOverdue);
  const totalClaimAmount = baseAmount + penaltyAmount;

  const htmlContent = `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <title>Da'vo Arizasi — ${companyName} CRM Legal Engine</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 14pt; line-height: 1.5; margin: 40px; color: #000; }
    .header { text-align: right; margin-left: 50%; font-size: 12pt; margin-bottom: 30px; }
    .title { text-align: center; font-weight: bold; font-size: 16pt; margin: 20px 0; text-transform: uppercase; }
    .subtitle { text-align: center; font-size: 12pt; font-style: italic; margin-bottom: 20px; }
    .content { text-align: justify; text-indent: 30px; margin-bottom: 15px; }
    .claim-box { border: 2px solid #000; padding: 15px; margin: 20px 0; background: #f9f9f9; }
    .footer { margin-top: 50px; display: flex; justify-content: space-between; }
    .demo-banner { background: #ffeb3b; color: #000; padding: 10px; text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 20px; border: 2px dashed #f57f17; }
    @media print { body { margin: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print demo-banner">NAMUNA / DEMO — BU HUJJAT SUD TOMONIDAN TASDIQLANMAGAN</div>

  <div class="header">
    <strong>Fuqarolik ishlari bo'yicha Toshkent shahar Sudiga</strong><br>
    <strong>Da'vogar:</strong> "${companyName}" MChJ<br>
    Manzil: Toshkent sh., Chilonzor t., 10-mavze 4-uy<br>
    Tel: +998 71 200 50 50<br><br>
    <strong>Javobgar:</strong> ${order.user.fullName || 'Demo Foydalanuvchi'}<br>
    Pasport: ${order.user.passportSeries || 'AA0000000'}, PINFL: ${order.user.pinfl || '12345678901234'}<br>
    Telefon: ${order.user.phone}<br>
    Manzil: ${order.user.address || 'Demo shahri'}
  </div>

  <div class="title">DA'VO ARIZASI</div>
  <div class="subtitle">(Mol-mulkni qaytarish va ijara qarzdorligini hamda penyani undirish to'g'risida)</div>

  <p class="content">
    Da'vogar "${companyName}" MChJ va Javobgar <strong>${order.user.fullName || 'Demo Foydalanuvchi'}</strong> o'rtasida
    elektron ommaviy oferta shartnomasi bilan <strong>${order.product.title}</strong> (sig'imi: ${order.product.capacity})
    uskunasini vaqtincha ijaraga berish bo'yicha shartnoma tuzilgan.
  </p>

  <p class="content">
    Shartnoma shartlariga ko'ra, Javobgar uskunani <strong>${endDateStr}</strong> sanasiga qadar qaytarishi hamda
    ijara haqini to'liq to'lashi shart edi. Biroq, Javobgar shartnoma majburiyatlarini qo'pol ravishda buzib,
    ijara muddati tugagan bo'lishiga qaramay (<strong>${daysOverdue} kun o'tgan</strong>), uskunani Da'vogarga qaytarmadi va ijara haqini to'lamadi.
  </p>

  <p class="content">
    O'zbekiston Respublikasi Fuqarolik Kodeksining 535-moddasiga muvofiq, ijara shartnomasi bo'yicha ijaraga beruvchi ijaraga oluvchiga mol-mulkni haq evaziga vaqtincha egalik qilish va foydalanish uchun topshirish majburiyatini oladi. FK 553-moddasiga ko'ra, ijara shartnomasi bekor qilinganda ijaraga oluvchi ijaraga beruvchiga mol-mulkni qanday holatda olgan bo'lsa, shunday holatda qaytarishi shart.
  </p>

  <div class="claim-box">
    <strong>UNDIRILADIGAN JAMI SUMMA HISOB-KITOBI:</strong><br>
    1. Asosiy ijara qarzi: <strong>${baseAmount.toLocaleString()} UZS</strong><br>
    2. Shartnomaviy penya (${daysOverdue} kun uchun 0.5%): <strong>${penaltyAmount.toLocaleString()} UZS</strong><br>
    <strong>JAMI UNDIRILISHI SO'RALAYOTGAN DA'VO SUMMASI: ${totalClaimAmount.toLocaleString()} UZS</strong>
  </div>

  <div class="title" style="font-size: 13pt; text-align: left;">YUQORIDAGILARDAN KELIB CHIQIB, SO'RAYMAN:</div>

  <ol style="margin-left: 20px; line-height: 1.8;">
    <li>Javobgar <strong>${order.user.fullName || 'Demo Foydalanuvchi'}</strong>dan "${companyName}" MChJ foydasiga <strong>${order.product.title}</strong> uskunasi natursida (asl holatda) majburiy tartibda olib berilsin.</li>
    <li>Javobgardan Da'vogar foydasiga <strong>${totalClaimAmount.toLocaleString()} UZS</strong> miqdoridagi ijara qarzi va penya undirilsin.</li>
    <li>Sud xarajatlari va davlat boji Javobgar zimmasiga yuklatilsin.</li>
  </ol>

  <div style="margin-top: 40px;">
    <strong>Ilovalar:</strong><br>
    1. Ommaviy oferta shartnomasi nusxasi.<br>
    2. Mijoz KYC pasport va PINFL ma'lumotlari nusxasi.<br>
    3. Uskunani topshirish-qabul qilish dalolatnomasi va buyurtma cheki (#${order.id}).
  </div>

  <div style="margin-top: 50px; display: flex; justify-content: space-between;">
    <div>Sana: <strong>${todayStr}</strong></div>
    <div><strong>"${companyName}" MChJ Direktori:</strong> _______________ (Imzo)</div>
  </div>
</body>
</html>`;

  const htmlPath = '/home/kamronbek/Desktop/KOTTA_BOLLANI_SAYTI/demo_davo_arizasi.html';
  const pdfPath = '/home/kamronbek/Desktop/KOTTA_BOLLANI_SAYTI/demo_davo_arizasi.pdf';
  fs.writeFileSync(htmlPath, htmlContent);
  console.log('HTML saqlandi:', htmlPath);

  const { spawn } = await import('node:child_process');
  const python = 'backend/venv/bin/python';
  const script = 'import sys; from weasyprint import HTML; sys.stdout.buffer.write(HTML(string=sys.stdin.buffer.read().decode("utf-8")).write_pdf())';
  const renderer = spawn(python, ['-c', script], { stdio: ['pipe', 'pipe', 'pipe'] });

  const pdf = await new Promise((resolve, reject) => {
    const chunks = [];
    let renderError = '';
    renderer.stdout.on('data', chunk => chunks.push(chunk));
    renderer.stderr.on('data', chunk => { renderError += chunk.toString(); });
    renderer.on('error', reject);
    renderer.on('close', code => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`PDF yaratilmadi: ${renderError.slice(-500)}`));
    });
    renderer.stdin.end(htmlContent);
  });

  fs.writeFileSync(pdfPath, pdf);
  console.log('PDF saqlandi:', pdfPath, `(${pdf.length} bytes)`);

  const messageText = `⚖️ *RASMIY DA'VO ARIZASI (SUD ARIZASI)* — DEMO\n` +
    `----------------------------------------\n` +
    `🏛 *Sud:* Fuqarolik ishlari bo'yicha Toshkent shahar sudi\n` +
    `🏢 *Da'vogar:* "${companyName}" MChJ\n` +
    `👤 *Javobgar:* ${order.user?.fullName || 'Demo Foydalanuvchi'}\n` +
    `📞 *Tel:* ${order.user?.phone || '—'}\n` +
    `🪪 *Pasport:* ${order.user?.passportSeries || '—'}, PINFL: ${order.user?.pinfl || '—'}\n\n` +
    `📦 *Uskuna:* ${order.product?.title || 'MECO Generator'} (${order.product?.capacity || ''})\n` +
    `📅 *Shartnoma muddati tugagan sana:* ${endDateStr} (${daysOverdue} kun o'tgan)\n\n` +
    `💰 *UNDIRILADIGAN SUMMA:*\n` +
    `• Asosiy qarz: ${baseAmount.toLocaleString()} UZS\n` +
    `• Penya (0.5%/kun): ${penaltyAmount.toLocaleString()} UZS\n` +
    `• *JAMI DA'VO SUMMASI: ${totalClaimAmount.toLocaleString()} UZS*\n\n` +
    `📌 FK 535, 553-moddalariga asosan sud tartibida undirish so'raladi.\n` +
    `📄 Rasmiy da'vo arizasi PDF fayl sifatida ilova qilindi.`;

  const form = new FormData();
  form.append('chat_id', botChatId);
  form.append('caption', messageText.slice(0, 1024));
  form.append('document', new Blob([pdf], { type: 'application/pdf' }), 'demo_davo_arizasi.pdf');

  const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: 'POST',
    body: form
  });
  const tgResult = await tgRes.json();

  if (tgResult.ok) {
    console.log('✅ Telegram xabari yuborildi!');
    console.log('   message_id:', tgResult.result?.message_id);
    console.log('   chat_id:', tgResult.result?.chat?.id);
  } else {
    console.error('❌ Telegram xatosi:', tgResult.error_code, '-', tgResult.description);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Xatolik:', err.message);
  process.exit(1);
});