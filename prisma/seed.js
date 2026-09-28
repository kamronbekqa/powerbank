import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCTS = [
  {
    title: 'Meco 320Wh (100W)',
    capacity: '320Wh / 100W (300W Peak)',
    description: 'MEGMEET INSIDE 320Wh LiFePO4 8000+ tsiklli ixcham solar power bank. Type-C 100W PD max, 150W DC, MPPT 100W solar input. Salmog\'i 2.8 kg (185*185*91mm).',
    buyPrice: 2800000,
    oldBuyPrice: 3500000,
    rentPrice: 150000,
    oldRentPrice: 200000,
    stock: 10,
    images: JSON.stringify(['/assets/meco_320wh.png']),
    usageSpecs: JSON.stringify([
      { name: 'Smartphone (10W)', icon: 'phone', runTime: '30+ marta' },
      { name: 'Noutbuk (60W)', icon: 'laptop', runTime: '5 - 6 soat' },
      { name: 'Ventilyator (40W)', icon: 'fan', runTime: '6 - 7 soat' },
      { name: 'LED Lampalar (10W x 3)', icon: 'lightbulb', runTime: '10 soat' },
      { name: 'Wi-Fi Router (10W)', icon: 'wifi', runTime: '28 soat' },
      { name: 'Type-C Max Output (100W)', icon: 'laptop', runTime: '3 soat' }
    ]),
    isAvailable: true
  },
  {
    title: 'Meco 1kWh (300W)',
    capacity: '1004.8Wh / 300W Pure Sine',
    description: 'MEGMEET INSIDE 1004.8Wh LiFePO4 8000+ tsiklli quyosh generatori. Pure sine-wave AC port, 350W grid AC zaryadlash va 200W solar PV input. Salmog\'i 8.9 kg (257*210*208.5mm).',
    buyPrice: 7000000,
    oldBuyPrice: 8800000,
    rentPrice: 150000,
    oldRentPrice: 220000,
    stock: 8,
    images: JSON.stringify(['/assets/meco_1kwh.png']),
    usageSpecs: JSON.stringify([
      { name: 'Lamp (20W)', icon: 'lightbulb', runTime: '50 soat' },
      { name: 'Fan (30W)', icon: 'fan', runTime: '33 soat' },
      { name: 'TV (100W)', icon: 'tv', runTime: '10 soat' },
      { name: 'Phone (2942mAh)', icon: 'phone', runTime: '90 marta' },
      { name: 'Laptop (60W)', icon: 'laptop', runTime: '16 soat' },
      { name: 'Car Fridge (60W)', icon: 'fridge', runTime: '16 soat' },
      { name: 'Projectors (100W)', icon: 'tv', runTime: '10 soat' },
      { name: 'Hairdryer (200W)', icon: 'fan', runTime: '5 soat' },
      { name: 'Ventilator (40W)', icon: 'fan', runTime: '25 soat' },
      { name: 'Pet Feeder (6W)', icon: 'wifi', runTime: '166 soat' }
    ]),
    isAvailable: true
  },
  {
    title: 'Meco 1kWh Pro',
    capacity: '1024Wh / 1500W Peak',
    description: 'Tezkor zaryadlash funksiyasiga va kuchaytirilgan inverterga ega professional 1kWh model.',
    buyPrice: 8300000,
    oldBuyPrice: 9900000,
    rentPrice: 180000,
    oldRentPrice: 240000,
    stock: 6,
    images: JSON.stringify(['/assets/meco_1kwh.png']),
    usageSpecs: JSON.stringify([
      { name: 'Muzlatgich (120W)', icon: 'fridge', runTime: '8 - 10 soat' },
      { name: 'Mikrotolqinli pech (800W)', icon: 'microwave', runTime: '1.2 soat' },
      { name: 'Ventilyator (50W)', icon: 'fan', runTime: '18 soat' },
      { name: 'Televizor & Wi-Fi (100W)', icon: 'tv', runTime: '9 - 10 soat' },
      { name: 'Kofe apparati (1000W)', icon: 'coffee', runTime: '1 soat (25 finjon)' },
      { name: 'Noutbuk (60W)', icon: 'laptop', runTime: '15 soat' }
    ]),
    isAvailable: true
  },
  {
    title: 'Meco 1.8kWh',
    capacity: '1800Wh / 1800W',
    description: 'Ommabop xonadonlar, kemping va qurilish uskunalari uchun universal elektr manbai.',
    buyPrice: 12000000,
    rentPrice: 220000,
    stock: 5,
    images: JSON.stringify(['/assets/meco_1_8kwh.png']),
    usageSpecs: JSON.stringify([
      { name: 'Muzlatgich (150W)', icon: 'fridge', runTime: '10 - 12 soat' },
      { name: 'Televizor (80W)', icon: 'tv', runTime: '20 soat' },
      { name: 'Kir yuvish mashinasi (500W eco)', icon: 'washing', runTime: '3 - 4 tsikl' },
      { name: 'Suv nasosi (750W)', icon: 'pump', runTime: '2.2 soat' },
      { name: 'Ventilyator (50W)', icon: 'fan', runTime: '32 soat' },
      { name: 'Kompyuter / Monoblok (150W)', icon: 'computer', runTime: '10 - 11 soat' }
    ]),
    isAvailable: true
  },
  {
    title: 'Meco 2kWh',
    capacity: '2048Wh / 2000W',
    description: 'LiFePO4 akkumulyatorli, 3500+ sikl ishlash resursiga ega baquvvat elektr stansiyasi.',
    buyPrice: 14500000,
    rentPrice: 280000,
    stock: 4,
    images: JSON.stringify(['/assets/meco_2kwh.png']),
    usageSpecs: JSON.stringify([
      { name: 'Uy muzlatgichi (150W)', icon: 'fridge', runTime: '12 - 14 soat' },
      { name: 'Konditsioner 9000 BTU (800W)', icon: 'ac', runTime: '2.5 - 3.5 soat' },
      { name: 'Televizor (80W)', icon: 'tv', runTime: '23 soat' },
      { name: 'Suv nasosi (1000W)', icon: 'pump', runTime: '1.8 soat' },
      { name: 'Drel / Perforator (800W)', icon: 'drill', runTime: '2.2 soat' },
      { name: 'Noutbuklar (60W x 3)', icon: 'laptop', runTime: '10+ soat' }
    ]),
    isAvailable: true
  },
  {
    title: 'Meco 3.6kWh',
    capacity: '3600Wh / 3000W',
    description: 'Katta ob\'yektlar va uylar uchun yuqori quvvatli quyosh generatori. Konditsioner va suv nasosini tortadi.',
    buyPrice: 23000000,
    rentPrice: 420000,
    stock: 3,
    images: JSON.stringify(['/assets/meco_3_6kwh.png']),
    usageSpecs: JSON.stringify([
      { name: 'Konditsioner 12000 BTU (1000W)', icon: 'ac', runTime: '3.2 - 4 soat' },
      { name: 'Muzlatgich (150W)', icon: 'fridge', runTime: '22 soat' },
      { name: 'Suv nasosi (1500W)', icon: 'pump', runTime: '2.2 soat' },
      { name: 'Kir yuvish mashinasi (1000W)', icon: 'washing', runTime: '3.2 soat' },
      { name: 'Yoritish + TV + Muzlatgich (350W)', icon: 'home', runTime: '9 - 10 soat' }
    ]),
    isAvailable: true
  },
  {
    title: 'Meco 3.6kWh Pro',
    capacity: '3600Wh / 3600W Pure Sine',
    description: 'Sanoat va tijorat maqsadlari uchun 3.6kW uzluksiz quvvat beruvchi professional energiya tizimi.',
    buyPrice: 27000000,
    rentPrice: 500000,
    stock: 2,
    images: JSON.stringify(['https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=600&auto=format&fit=crop&q=60']),
    usageSpecs: JSON.stringify([
      { name: 'Sanoat muzlatgichi (250W)', icon: 'fridge', runTime: '13 - 14 soat' },
      { name: 'Inverter Payvandlash (2000W)', icon: 'tool', runTime: '1.6 soat' },
      { name: 'Konditsioner 18000 BTU (1500W)', icon: 'ac', runTime: '2.2 soat' },
      { name: 'To\'liq uy majmuasi (500W)', icon: 'home', runTime: '6.5 soat' },
      { name: 'Suv nasosi (1500W)', icon: 'pump', runTime: '2.2 soat' }
    ]),
    isAvailable: true
  },
  {
    title: 'Meco 5.4kWh',
    capacity: '5376Wh / 5000W',
    description: 'Meco liniyasidagi eng kuchli sig\'imli elektr stansiyasi. To\'liq avtonom energiya ta\'minoti.',
    buyPrice: 37000000,
    rentPrice: 700000,
    stock: 2,
    images: JSON.stringify(['https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600&auto=format&fit=crop&q=60']),
    usageSpecs: JSON.stringify([
      { name: 'Butun xonadon (600W o\'rtacha)', icon: 'home', runTime: '8 - 9 soat' },
      { name: 'Konditsioner (1200W)', icon: 'ac', runTime: '4.2 soat' },
      { name: 'Muzlatgich (150W)', icon: 'fridge', runTime: '32 soat' },
      { name: 'Televizor & Kompyuter (200W)', icon: 'tv', runTime: '24 soat' },
      { name: 'Suv nasosi (1500W)', icon: 'pump', runTime: '3.2 soat' },
      { name: 'Elektromobil (3.5kW zaryad)', icon: 'car', runTime: '1.4 soat (25km)' }
    ]),
    isAvailable: true
  },
  {
    title: 'Cola Solar 1000',
    capacity: '1000W Solar Kit',
    description: 'Monokristall panellar to\'plami. Meco stansiyalarini quyosh nuridan tezkor zaryadlash uchun.',
    buyPrice: 9900000,
    rentPrice: 180000,
    stock: 7,
    images: JSON.stringify(['https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=60']),
    usageSpecs: JSON.stringify([
      { name: 'Meco 1kWh Zaryadlash', icon: 'zap', runTime: '1.2 - 1.5 soat' },
      { name: 'Meco 3.6kWh Zaryadlash', icon: 'zap', runTime: '3.8 - 4.5 soat' },
      { name: 'Quyoshdagi quvvat', icon: 'sun', runTime: '800W - 950W real' }
    ]),
    isAvailable: true
  }
];

async function main() {
  console.log('Seeding Meco products, users, reviews and contact messages...');

  await prisma.review.deleteMany({});
  await prisma.contactMessage.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.verification.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Seed Products
  for (const prod of PRODUCTS) {
    await prisma.product.create({ data: prod });
  }
  console.log(`Successfully seeded ${PRODUCTS.length} Meco products.`);

  // 2. Seed Users & 2 Demo Verified Accounts
  const clientUser = await prisma.user.create({
    data: {
      phone: '+998901234567',
      password: 'user123',
      fullName: 'Alisher Qayumov',
      passportSeries: 'AA1234567',
      pinfl: '31204958390124',
      address: 'Toshkent sh., Yunusobod t., 4-mavze 12-uy',
      isVerified: true,
      role: 'CLIENT'
    }
  });

  const adminUser = await prisma.user.create({
    data: {
      phone: '+998909990011',
      password: 'admin123',
      fullName: 'Meco Administrator',
      isVerified: true,
      role: 'ADMIN'
    }
  });


  // 3. Seed Reviews
  const reviews = [
    {
      userName: 'Otabek Mirzayev',
      location: 'Toshkent sh.',
      rating: 5,
      comment: 'Meco 3.6kWh generatorini to\'y marosimi uchun 2 kunga ijaraga oldik. Konditsioner va barcha ovoz kuchaytirgichlarni muammosiz tortdi. KYC rasmiylashtiruvi 5 minutda bitdi, juda qulay!'
    },
    {
      userName: 'Sardor Ergashev',
      location: 'Samarqand sh.',
      rating: 5,
      comment: 'Meco 1kWh generatorini kemping va tog\'ga dam olishga olib ketdik. Noutbuklar va sovutgichni uzluksiz 12 soat ishlatib berdi. Rahmat Meco jamoasiga!'
    },
    {
      userName: 'Rustam Farmonov',
      location: 'Buxoro sh.',
      rating: 5,
      comment: 'Perforator va svarka aparati uchun Meco 3.6kWh Pro modelini sotib oldik. Xitoy benzin generatorlariga qaraganda shovqinsiz va ekonomichny. 1 yillik rasmiy kafolati bor ekan.'
    },
    {
      userName: 'Dilnoza Axmedova',
      location: 'Toshkent sh.',
      rating: 5,
      comment: 'Chiroq o\'chganida Meco 1.8kWh juda qo\'l keldi. Muzlatgichimizdagi mahsulotlar buzilmadi va ventilyator tuni bilan ishladi. Narxi va xizmati a\'lo darajada!'
    }
  ];

  for (const rev of reviews) {
    await prisma.review.create({ data: rev });
  }

  // 4. Seed Contact Messages
  await prisma.contactMessage.create({
    data: {
      name: 'Jasur Rahimov',
      phone: '+998935554433',
      subject: 'Ulgurji sotib olish',
      message: 'Bizning qurilish kompaniyamiz uchun 5 ta Meco 3.6kWh generator sotib olmoqchimiz. Tijorat taklifini yuboring.'
    }
  });

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
