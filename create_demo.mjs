import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDemoAndSendPDF() {
  try {
    // 1. Create demo user
    const demoUser = await prisma.user.upsert({
      where: { phone: '+998 90 000 00 00' },
      update: {
        fullName: 'Demo Foydalanuvchi',
        address: 'Demo shahri, Namuna ko\'chasi 1',
        passportSeries: 'AA0000000',
        pinfl: '12345678901234',
      },
      create: {
        phone: '+998 90 000 00 00',
        password: 'demo123',
        fullName: 'Demo Foydalanuvchi',
        address: 'Demo shahri, Namuna ko\'chasi 1',
        passportSeries: 'AA0000000',
        pinfl: '12345678901234',
        isVerified: false,
        role: 'CLIENT',
      },
    });
    console.log('Demo user created:', demoUser.id);

    // 2. Create demo product if not exists
    let demoProduct = await prisma.product.findFirst({
      where: { title: 'MECO 1kWh (300W)' },
    });
    if (!demoProduct) {
      demoProduct = await prisma.product.create({
        data: {
          title: 'MECO 1kWh (300W)',
          category: 'GENERATOR',
          capacity: '1004.8Wh / 300W Pure Sine',
          description: 'Demo mahsulot',
          buyPrice: 7000000,
          rentPrice: 150000,
          stock: 1,
          images: JSON.stringify(['/assets/meco_1kwh.png']),
          usageSpecs: JSON.stringify([]),
          isAvailable: true,
        },
      });
    }
    console.log('Demo product:', demoProduct.id);

    // 3. Create overdue rental order (yesterday end date)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const demoOrder = await prisma.order.create({
      data: {
        userId: demoUser.id,
        productId: demoProduct.id,
        type: 'RENT',
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        endDate: yesterday,
        totalAmount: 1500000,
        status: 'ACTIVE',
      },
    });
    console.log('Demo order created:', demoOrder.id);

    // 4. Generate PDF using the legal endpoint
    const response = await fetch(`http://localhost:3001/api/legal/davo-arizasi/${demoOrder.id}`);
    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.status}`);
    }
    const htmlContent = await response.text();
    
    // Save HTML as PDF (we'll use the server's send-telegram endpoint)
    // Actually, let's use the send-telegram endpoint which generates PDF via WeasyPrint
    const sendResponse = await fetch('http://localhost:3001/api/legal/send-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: demoOrder.id,
        chatId: process.env.TELEGRAM_CHAT_ID || '6001392724',
      }),
    });
    
    const result = await sendResponse.json();
    console.log('Telegram send result:', JSON.stringify(result, null, 2));

    // Save HTML locally for demo
    const fs = await import('fs');
    fs.writeFileSync('/home/kamronbek/Desktop/KOTTA_BOLLANI_SAYTI/demo_davo_arizasi.html', htmlContent);
    console.log('HTML saved to demo_davo_arizasi.html');

    // Cleanup
    await prisma.order.delete({ where: { id: demoOrder.id } });
    await prisma.user.delete({ where: { id: demoUser.id } });
    console.log('Demo data cleaned up');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoAndSendPDF();