import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'meco_super_secret_jwt_key_2026';
const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: TEN_DAYS_MS
};

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
let telegramPollingStarted = false;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

function setAuthCookie(res, user) {
  const token = jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: '10d' }
  );
  res.cookie('token', token, COOKIE_OPTIONS);
  return token;
}

// Rolling Session Middleware: renews 10-day expiration cookie on active user requests
app.use((req, res, next) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      const newToken = jwt.sign(
        { id: decoded.id, phone: decoded.phone, role: decoded.role },
        JWT_SECRET,
        { expiresIn: '10d' }
      );
      res.cookie('token', newToken, COOKIE_OPTIONS);
    } catch (err) {
      res.clearCookie('token'); // no maxAge on clearCookie (Express 5 compat)
    }
  }
  next();
});

// Automated Rental Tracker
async function checkOverdueRentals() {
  try {
    const now = new Date();
    const activeRentals = await prisma.order.findMany({
      where: {
        type: 'RENT',
        status: { in: ['ACTIVE', 'APPROVED', 'PENDING'] },
        endDate: { lt: now }
      }
    });

    for (const rental of activeRentals) {
      const daysOverdue = Math.floor((now - new Date(rental.endDate)) / (1000 * 60 * 60 * 24));
      let newStatus = 'OVERDUE';
      if (daysOverdue >= 3) {
        newStatus = 'LEGAL_PROCESS';
      }
      await prisma.order.update({
        where: { id: rental.id },
        data: { status: newStatus }
      });
    }
  } catch (err) {
    console.error('Error checking overdue rentals:', err);
  }
}

checkOverdueRentals();

// ── AUTHENTICATION API ──────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, login, password } = req.body;
    const userPhone = phone || login;
    if (!userPhone) {
      return res.status(400).json({ error: 'Telefon raqami yoki loginni kiriting.' });
    }

    let user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user && (userPhone === 'admin' || userPhone.includes('9990011'))) {
      user = await prisma.user.create({
        data: {
          phone: userPhone,
          password: password || 'admin123',
          fullName: 'Bosh Administrator',
          role: 'ADMIN'
        }
      });
    } else if (!user) {
      user = await prisma.user.create({
        data: {
          phone: userPhone,
          password: password || '123456',
          fullName: 'Mijoz ' + userPhone.slice(-4),
          role: userPhone.includes('9990011') || userPhone.includes('admin') ? 'ADMIN' : 'CLIENT'
        }
      });
    } else if (password && user.password && user.password !== password) {
      return res.status(400).json({ error: 'Parol noto\'g\'ri kiritildi.' });
    }

    setAuthCookie(res, user);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { phone, password, fullName } = req.body;
    if (!phone || !fullName) {
      return res.status(400).json({ error: 'Telefon raqami va F.I.SH to\'ldirilishi shart.' });
    }

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return res.status(400).json({ error: 'Bu telefon raqami allaqachon ro\'yxatdan o\'tgan.' });
    }

    const assignedRole = (phone === 'admin' || phone === '+998909990011' || phone === '9990011') ? 'ADMIN' : 'CLIENT';

    const user = await prisma.user.create({
      data: {
        phone,
        password: password || '123456',
        fullName,
        role: assignedRole
      }
    });

    setAuthCookie(res, user);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Note: /api/auth/google is handled below after settings API

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.json({ success: false, user: null });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      res.clearCookie('token'); // no maxAge on clearCookie (Express 5 compat)
      return res.json({ success: false, user: null });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      res.clearCookie('token'); // no maxAge on clearCookie (Express 5 compat)
      return res.json({ success: false, user: null });
    }

    setAuthCookie(res, user);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token'); // no maxAge on clearCookie (Express 5 compat)
  res.json({ success: true, message: 'Tizimdan muvaffaqiyatli chiqildi.' });
});

// Update User Profile (Avatar / Name) API
app.patch('/api/users/profile', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Avtorizatsiyadan o\'tilmagan' });
    }
    const { avatar, fullName } = req.body;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(avatar !== undefined ? { avatar } : {}),
        ...(fullName !== undefined ? { fullName } : {})
      }
    });
    res.json({ success: true, user: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto Seed 4 Solar Panel Cards if missing
async function ensureSolarPanelsSeed() {
  try {
    const existingPanels = await prisma.product.findMany({ where: { category: 'SOLAR_PANEL' } });
    if (existingPanels.length === 0) {
      const defaultPanels = [
        {
          title: 'Meco 450W Mono PERC Panel',
          category: 'SOLAR_PANEL',
          capacity: '450W / 24V Monocrystalline',
          description: '21.8% yuqori samaradorlikka ega Monokristall quyosh paneli. Shamol va qor yuklamalariga chidamli, IP68 suv o\'tmas korpus va MC4 konnektorlar.',
          buyPrice: 1800000,
          oldBuyPrice: 2200000,
          rentPrice: 45000,
          oldRentPrice: 60000,
          stock: 15,
          images: JSON.stringify(['/assets/solar_450w.png']),
          usageSpecs: JSON.stringify([
            { name: 'Samaradorlik', icon: 'zap', runTime: '21.8%' },
            { name: 'Kafolat', icon: 'shield', runTime: '25 Yil' },
            { name: 'Himoya', icon: 'cloud', runTime: 'IP68 Water' },
            { name: 'Salmoq', icon: 'box', runTime: '21 kg' }
          ]),
          isAvailable: true
        },
        {
          title: 'Meco 550W Bifacial Glass-Glass',
          category: 'SOLAR_PANEL',
          capacity: '550W (+100W Rear Gain)',
          description: 'Ikki tomonlama quyosh nuri yutuvchi Double-Glass Bifacial panel. Orqa tomonidan qo\'shimcha 20% gacha quvvat ishlab chiqaradi.',
          buyPrice: 2400000,
          oldBuyPrice: 2900000,
          rentPrice: 65000,
          oldRentPrice: 85000,
          stock: 10,
          images: JSON.stringify(['/assets/solar_550w.png']),
          usageSpecs: JSON.stringify([
            { name: 'Samaradorlik', icon: 'zap', runTime: '22.5%' },
            { name: 'Kafolat', icon: 'shield', runTime: '30 Yil' },
            { name: 'Shisha', icon: 'box', runTime: 'Double Glass' },
            { name: 'Salmoq', icon: 'box', runTime: '27 kg' }
          ]),
          isAvailable: true
        },
        {
          title: 'Meco 200W Portable Foldable',
          category: 'SOLAR_PANEL',
          capacity: '200W / 18V Travel Panel',
          description: 'Kemping va sayohatlar uchun buklanadigan yengil portativ quyosh paneli. ETFE qoplamali, og\'irligi atigi 4.2kg.',
          buyPrice: 2100000,
          oldBuyPrice: 2500000,
          rentPrice: 50000,
          oldRentPrice: 70000,
          stock: 12,
          images: JSON.stringify(['/assets/solar_200w_foldable.png']),
          usageSpecs: JSON.stringify([
            { name: 'Portativlik', icon: 'box', runTime: '4.2 kg (Buklanadigan)' },
            { name: 'Qoplama', icon: 'shield', runTime: 'ETFE Premium' },
            { name: 'Chiquv', icon: 'zap', runTime: 'MC4 + DC5521' },
            { name: 'Kafolat', icon: 'shield', runTime: '2 Yil' }
          ]),
          isAvailable: true
        },
        {
          title: 'Meco 670W Ultra Industrial Panel',
          category: 'SOLAR_PANEL',
          capacity: '670W / 40V N-Type TopCon',
          description: "Tadbirkorlik ob'yektlari, fermer xo'jaliklari va sanoat bino tomlari uchun o'ta baquvvat N-Type TopCon panel.",
          buyPrice: 3200000,
          oldBuyPrice: 3800000,
          rentPrice: 85000,
          oldRentPrice: 110000,
          stock: 8,
          images: JSON.stringify(['/assets/solar_670w.png']),
          usageSpecs: JSON.stringify([
            { name: 'Texnologiya', icon: 'zap', runTime: 'N-Type TopCon' },
            { name: 'Samaradorlik', icon: 'zap', runTime: '23.1%' },
            { name: 'Kafolat', icon: 'shield', runTime: '30 Yil' },
            { name: 'Salmoq', icon: 'box', runTime: '33 kg' }
          ]),
          isAvailable: true
        }
      ];
      for (const p of defaultPanels) {
        await prisma.product.create({ data: p });
      }
      console.log('✅ Seeded 4 default Solar Panel cards successfully.');
    }
  } catch (err) {
    console.error('Solar Panel seed error:', err);
  }
}
ensureSolarPanelsSeed();

// ── 1. PRODUCTS API (FULL CRUD: GET, POST, PATCH, DELETE) ──────────────────
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        orders: true,
        reviews: true
      }
    });
    const formatted = products.map(p => ({
      ...p,
      category: p.category || 'GENERATOR',
      images: p.images ? JSON.parse(p.images) : [],
      usageSpecs: p.usageSpecs ? JSON.parse(p.usageSpecs) : [],
      totalOrders: p.orders ? p.orders.length : 0,
      totalRevenue: p.orders ? p.orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0) : 0
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { title, category, capacity, description, buyPrice, rentPrice, oldBuyPrice, oldRentPrice, stock, images, usageSpecs, isAvailable } = req.body;
    const product = await prisma.product.create({
      data: {
        title,
        category: category || 'GENERATOR',
        capacity: capacity || '1kWh',
        description: description || '',
        buyPrice: buyPrice ? Number(buyPrice) : null,
        rentPrice: rentPrice ? Number(rentPrice) : null,
        oldBuyPrice: oldBuyPrice ? Number(oldBuyPrice) : null,
        oldRentPrice: oldRentPrice ? Number(oldRentPrice) : null,
        stock: stock ? Number(stock) : 1,
        images: JSON.stringify(images || []),
        usageSpecs: JSON.stringify(usageSpecs || []),
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true
      }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, capacity, description, buyPrice, rentPrice, oldBuyPrice, oldRentPrice, stock, images, usageSpecs, isAvailable } = req.body;

    const dataToUpdate = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (category !== undefined) dataToUpdate.category = category;
    if (capacity !== undefined) dataToUpdate.capacity = capacity;
    if (description !== undefined) dataToUpdate.description = description;
    if (buyPrice !== undefined) dataToUpdate.buyPrice = buyPrice ? Number(buyPrice) : null;
    if (rentPrice !== undefined) dataToUpdate.rentPrice = rentPrice ? Number(rentPrice) : null;
    if (oldBuyPrice !== undefined) dataToUpdate.oldBuyPrice = oldBuyPrice ? Number(oldBuyPrice) : null;
    if (oldRentPrice !== undefined) dataToUpdate.oldRentPrice = oldRentPrice ? Number(oldRentPrice) : null;
    if (stock !== undefined) dataToUpdate.stock = Number(stock);
    if (images !== undefined) dataToUpdate.images = JSON.stringify(images);
    if (usageSpecs !== undefined) dataToUpdate.usageSpecs = JSON.stringify(usageSpecs);
    if (isAvailable !== undefined) dataToUpdate.isAvailable = Boolean(isAvailable);

    const product = await prisma.product.update({
      where: { id },
      data: dataToUpdate
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete associated orders/reviews first to maintain integrity
    await prisma.order.deleteMany({ where: { productId: id } });
    await prisma.review.deleteMany({ where: { productId: id } });

    await prisma.product.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Mahsulot muvaffaqiyatli o\'chirildi.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 2. ORDERS API ──────────────────────────────────────────────────────────
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: true,
        product: true
      },
      orderBy: { createdAt: 'desc' }
    });
    const formatted = orders.map(o => ({
      ...o,
      product: o.product ? {
        ...o.product,
        images: o.product.images ? JSON.parse(o.product.images) : [],
        usageSpecs: o.product.usageSpecs ? JSON.parse(o.product.usageSpecs) : []
      } : null
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const {
      userId,
      phone,
      fullName,
      productId,
      type,
      startDate,
      endDate,
      totalAmount,
      passportSeries,
      pinfl,
      passportFront,
      passportBack,
      selfieUrl
    } = req.body;

    if (type === 'RENT' && !/^\d{14}$/.test(String(pinfl || ''))) {
      return res.status(400).json({ error: 'Ijara uchun 14 xonali PINFL/JSHSHIR majburiy.' });
    }
    if (type === 'RENT' && (!String(passportSeries || '').trim() || !passportFront || !selfieUrl)) {
      return res.status(400).json({ error: 'Ijara uchun pasport seriyasi, pasport rasmi va pasport bilan selfi majburiy.' });
    }

    let user;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user && phone) {
      user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            phone,
            password: '123456',
            fullName: fullName || 'Mijoz',
            passportSeries: passportSeries || null,
            pinfl: pinfl || null,
            passportFront: passportFront || null,
            passportBack: passportBack || null,
            selfieUrl: selfieUrl || null,
            isVerified: false
          }
        });
      }
    }

    if (!user) {
      return res.status(400).json({ error: 'Foydalanuvchi ma\'lumotlari ko\'rsatilmadi.' });
    }

    if (type === 'RENT' && (passportSeries || pinfl)) {
      await prisma.verification.create({
        data: {
          userId: user.id,
          passportSeries: passportSeries || 'AA0000000',
          pinfl: pinfl || '00000000000000',
          passportFront: passportFront || null,
          passportBack: passportBack || null,
          selfieUrl: selfieUrl || null,
          status: 'PENDING'
        }
      });
      await prisma.user.update({
        where: { id: user.id },
        data: {
          fullName: fullName || user.fullName,
          passportSeries: passportSeries || user.passportSeries,
          pinfl: pinfl || user.pinfl,
          passportFront: passportFront || user.passportFront,
          selfieUrl: selfieUrl || user.selfieUrl
        }
      });
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        productId,
        type: type || 'BUY',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        totalAmount: Number(totalAmount),
        status: type === 'BUY' ? 'APPROVED' : (user.isVerified ? 'APPROVED' : 'PENDING')
      },
      include: {
        product: true,
        user: true
      }
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { user: true, product: true }
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 3. REVIEWS & SHARHLAR API ──────────────────────────────────────────────
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { userName, location, rating, comment } = req.body;
    if (!userName || !comment) {
      return res.status(400).json({ error: 'Ismingiz va sharh matnini kiriting.' });
    }
    const review = await prisma.review.create({
      data: {
        userName,
        location: location || 'Toshkent',
        rating: Number(rating) || 5,
        comment
      }
    });
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 4. BIZGA BOG'LANISH / CONTACT API ──────────────────────────────────────
app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const { name, phone, subject, message } = req.body;
    if (!name || !phone || !message) {
      return res.status(400).json({ error: 'Ismingiz, telefon raqamingiz va xabar to\'ldirilishi shart.' });
    }
    const contact = await prisma.contactMessage.create({
      data: {
        name,
        phone,
        subject: subject || 'Umumiy savol',
        message
      }
    });
    res.json({ success: true, contact });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.contactMessage.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 4.5. REGISTERED USERS, SITE SETTINGS & VISITOR TRACKER API ────────────
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'ADMIN' } },
      orderBy: { createdAt: 'desc' },
      include: { orders: true, verifications: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    let settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: { id: 'default' }
      });
    }
    const { botToken: _secret, myIdClientSecret: _myIdSecret, ...safeSettings } = settings;
    res.json(safeSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { 
      telegram, instagram, phone, email, address, botChatId, 
      penaltyRate, legalNoticeDays, visitCount,
      deliveryStartHour, deliveryEndHour, deliverySlotLabel,
      maxRentalDays, minRentalDays,
      myIdEnabled, myIdClientId, myIdClientSecret
    } = req.body;

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'default' },
      update: {
        telegram,
        instagram,
        phone,
        email,
        address,
        // Telegram credentials are read only from server environment variables.
        ...(botChatId !== undefined ? { botChatId } : {}),
        ...(penaltyRate !== undefined ? { penaltyRate: Number(penaltyRate) } : {}),
        ...(legalNoticeDays !== undefined ? { legalNoticeDays: Number(legalNoticeDays) } : {}),
        ...(visitCount !== undefined ? { visitCount: Number(visitCount) } : {}),
        ...(deliveryStartHour !== undefined ? { deliveryStartHour: Number(deliveryStartHour) } : {}),
        ...(deliveryEndHour !== undefined ? { deliveryEndHour: Number(deliveryEndHour) } : {}),
        ...(deliverySlotLabel !== undefined ? { deliverySlotLabel } : {}),
        ...(maxRentalDays !== undefined ? { maxRentalDays: Number(maxRentalDays) } : {}),
        ...(minRentalDays !== undefined ? { minRentalDays: Number(minRentalDays) } : {}),
        ...(myIdEnabled !== undefined ? { myIdEnabled: Boolean(myIdEnabled) } : {}),
        ...(myIdClientId !== undefined ? { myIdClientId } : {}),
        ...(myIdClientSecret !== undefined ? { myIdClientSecret } : {})
      },
      create: {
        id: 'default',
        telegram: telegram || 'https://t.me/meco_solar_uz',
        instagram: instagram || 'https://instagram.com/meco.uzbekistan',
        phone: phone || '+998 71 200 50 50',
        email: email || 'info@meco.uz',
        address: address || 'Toshkent sh., Chilonzor t., 10-mavze 4-uy',
        botChatId: botChatId || '',
        penaltyRate: penaltyRate ? Number(penaltyRate) : 0.5,
        legalNoticeDays: legalNoticeDays ? Number(legalNoticeDays) : 3,
        visitCount: visitCount !== undefined ? Number(visitCount) : 1420,
        deliveryStartHour: deliveryStartHour !== undefined ? Number(deliveryStartHour) : 6,
        deliveryEndHour: deliveryEndHour !== undefined ? Number(deliveryEndHour) : 9,
        deliverySlotLabel: deliverySlotLabel || "06:00 - 09:00 (Ertalabki)",
        maxRentalDays: maxRentalDays !== undefined ? Number(maxRentalDays) : 30,
        minRentalDays: minRentalDays !== undefined ? Number(minRentalDays) : 1,
        myIdEnabled: myIdEnabled !== undefined ? Boolean(myIdEnabled) : true,
        myIdClientId: myIdClientId || '',
        myIdClientSecret: myIdClientSecret || ''
      }
    });
    const { botToken: _secret, myIdClientSecret: _myIdSecret, ...safeSettings } = settings;
    res.json(safeSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── ADMIN CREDENTIALS CHANGE API ──────────────────────────────────────────
app.post('/api/settings/admin-credentials', async (req, res) => {
  try {
    const { newLogin, newPassword } = req.body;
    let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (adminUser) {
      adminUser = await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          phone: newLogin || adminUser.phone,
          password: newPassword || adminUser.password
        }
      });
    } else {
      adminUser = await prisma.user.create({
        data: {
          phone: newLogin || 'admin',
          password: newPassword || 'admin123',
          fullName: 'MECO Administrator',
          role: 'ADMIN',
          isVerified: true
        }
      });
    }
    res.json({ success: true, message: 'Admin login va paroli muvaffaqiyatli saqlandi!', adminUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GOOGLE OAUTH AUTHENTICATION API ──────────────────────────────────────
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google token (credential) taqdim etilmadi.' });
    }

    // Real Google ID Token tekshiruvi
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      return res.status(401).json({ error: 'Google token yaroqsiz yoki muddati o\'tgan.' });
    }

    const userEmail = payload.email;
    const userName = payload.name || payload.email;
    const picture = payload.picture || '';

    if (!userEmail) {
      return res.status(400).json({ error: 'Google hisobdan email olinmadi.' });
    }

    // Foydalanuvchini topish yoki yaratish
    let user = await prisma.user.findFirst({
      where: { phone: userEmail }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: userEmail,
          fullName: userName,
          password: 'google_oauth_authenticated',
          role: 'CLIENT',
          isVerified: false
        }
      });
    }

    setAuthCookie(res, user);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post('/api/stats/visit', async (req, res) => {
  try {
    let settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: { id: 'default', visitCount: 1421 }
      });
    } else {
      settings = await prisma.siteSettings.update({
        where: { id: 'default' },
        data: { visitCount: settings.visitCount + 1 }
      });
    }
    res.json({ success: true, visitCount: settings.visitCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ── 5. KYC VERIFICATION API ────────────────────────────────────────────────
app.get('/api/verifications', async (req, res) => {
  try {
    const verifications = await prisma.verification.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(verifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/verifications', async (req, res) => {
  try {
    const { userId, phone, passportSeries, pinfl, passportFront, passportBack, selfieUrl } = req.body;
    if (!String(passportSeries || '').trim() || !/^\d{14}$/.test(String(pinfl || '')) || !passportFront || !selfieUrl) {
      return res.status(400).json({ error: 'KYC uchun pasport seriyasi, 14 xonali PINFL, pasport rasmi va pasport bilan selfi majburiy.' });
    }
    let targetUserId = userId;
    if (!targetUserId && phone) {
      let u = await prisma.user.findUnique({ where: { phone } });
      if (!u) {
        u = await prisma.user.create({ data: { phone, passportSeries, pinfl, isVerified: false } });
      }
      targetUserId = u.id;
    }

    if (targetUserId) {
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          ...(passportSeries ? { passportSeries } : {}),
          ...(pinfl ? { pinfl } : {}),
          isVerified: false
        }
      }).catch(e => console.error('User passport update error:', e));
    }

    const verification = await prisma.verification.create({
      data: {
        userId: targetUserId,
        passportSeries: passportSeries || '',
        pinfl: pinfl || '',
        passportFront,
        passportBack,
        selfieUrl,
        status: 'PENDING'
      }
    });
    res.json(verification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/verifications/:id', async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'KYC holatini o‘zgartirish uchun admin ruxsati kerak.' });
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const verification = await prisma.verification.update({
      where: { id },
      data: { status, rejectionReason }
    });

    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: verification.userId },
        data: { isVerified: true }
      });
    } else if (status === 'REJECTED') {
      await prisma.user.update({
        where: { id: verification.userId },
        data: { isVerified: false }
      });
    }
    res.json(verification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/users/:id/kyc-status', async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'KYC holatini o‘zgartirish uchun admin ruxsati kerak.' });
    const { id } = req.params;
    const { isVerified } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isVerified: Boolean(isVerified) }
    });

    const newStatus = isVerified ? 'APPROVED' : 'REJECTED';
    await prisma.verification.updateMany({
      where: { userId: id },
      data: { status: newStatus }
    });

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 6. PAYMENT CHECKOUT API (CLICK / PAYME) ────────────────────────────────
app.post('/api/checkout/click', async (req, res) => {
  const { orderId, amount } = req.body;
  const merchantId = process.env.CLICK_MERCHANT_ID || '12345';
  const serviceId = process.env.CLICK_SERVICE_ID || '67890';
  const returnUrl = encodeURIComponent('http://localhost:5173/payment/success');
  
  const clickCheckoutUrl = `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${amount}&transaction_param=${orderId}&return_url=${returnUrl}`;

  res.json({ success: true, redirectUrl: clickCheckoutUrl, provider: 'CLICK' });
});

app.post('/api/checkout/payme', async (req, res) => {
  const { orderId, amount } = req.body;
  const merchantId = process.env.PAYME_MERCHANT_ID || '5f123456789';
  const amountTiyn = amount * 100;
  
  const payload = `m=${merchantId};ac.order_id=${orderId};a=${amountTiyn}`;
  const encodedPayload = Buffer.from(payload).toString('base64');
  const paymeCheckoutUrl = `https://checkout.paycom.uz/${encodedPayload}`;

  res.json({ success: true, redirectUrl: paymeCheckoutUrl, provider: 'PAYME' });
});

// ── 7. LEGAL AUTO-PDF ENGINE (DA'VO ARIZASI GENERATOR) ────────────────────
app.get('/api/legal/davo-arizasi/:orderId', async (req, res) => {
  try {
    // The legal document contains sensitive customer identity data.
    if (req.user?.role !== 'ADMIN') return res.status(403).send('Ruxsat yo‘q. Admin sifatida kiring.');
    const { orderId } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, product: true }
    });

    if (!order) {
      return res.status(404).send('Buyurtma topilmadi.');
    }

    const todayStr = new Date().toLocaleDateString('uz-UZ');
    const endDateStr = order.endDate ? new Date(order.endDate).toLocaleDateString('uz-UZ') : '—';
    const now = new Date();
    const daysOverdue = order.endDate ? Math.max(1, Math.floor((now - new Date(order.endDate)) / (1000 * 60 * 60 * 24))) : 5;
    
    const baseAmount = order.totalAmount || 1000000;
    const penaltyRate = 0.005;
    const penaltyAmount = Math.round(baseAmount * penaltyRate * daysOverdue);
    const totalClaimAmount = baseAmount + penaltyAmount;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="uz">
    <head>
      <meta charset="UTF-8">
      <title>Da'vo Arizasi — MECO CRM Legal Engine</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 14pt; line-height: 1.5; margin: 40px; color: #000; }
        .header { text-align: right; margin-left: 50%; font-size: 12pt; margin-bottom: 30px; }
        .title { text-align: center; font-weight: bold; font-size: 16pt; margin: 20px 0; text-transform: uppercase; }
        .subtitle { text-align: center; font-size: 12pt; font-style: italic; margin-bottom: 20px; }
        .content { text-align: justify; text-indent: 30px; margin-bottom: 15px; }
        .claim-box { border: 2px solid #000; padding: 15px; margin: 20px 0; background: #f9f9f9; }
        .footer { margin-top: 50px; display: flex; justify-space-between; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; background: #0070f3; color: white; padding: 12px; border-radius: 6px; text-align: center;">
        <strong>MECO LEGAL AUTO-PDF ENGINE:</strong> Ushbu hujjat rasmiy sud arizasi (Da'vo arizasi) hisoblanadi. Chop etish uchun Ctrl+P / Cmd+P bosing.
      </div>

      <div class="header">
        <strong>Fuqarolik ishlari bo'yicha Toshkent shahar Sudiga</strong><br>
        <strong>Da'vogar:</strong> "MECO SOLAR POWER" MChJ<br>
        Manzil: Toshkent sh., Chilonzor t., 10-mavze 4-uy<br>
        Tel: +998 71 200-00-00<br><br>
        <strong>Javobgar:</strong> ${order.user.fullName || 'Alisher Qayumov'}<br>
        Pasport: ${order.user.passportSeries || 'AA1234567'}, PINFL: ${order.user.pinfl || '31204958390124'}<br>
        Telefon: ${order.user.phone}<br>
        Manzil: ${order.user.address || 'Toshkent shahri'}
      </div>

      <div class="title">DA'VO ARIZASI</div>
      <div class="subtitle">(Mol-mulkni qaytarish va ijara qarzdorligini hamda penyani undirish to'g'risida)</div>

      <p class="content">
        Da'vogar "MECO SOLAR POWER" MChJ va Javobgar <strong>${order.user.fullName || 'Alisher Qayumov'}</strong> o'rtasida 
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
        <li>Javobgar <strong>${order.user.fullName || 'Alisher Qayumov'}</strong>dan "MECO SOLAR POWER" MChJ foydasiga <strong>${order.product.title}</strong> uskunasi natursida (asl holatda) majburiy tartibda olib berilsin.</li>
        <li>Javobgardan Da'vogar foydasiga <strong>${totalClaimAmount.toLocaleString()} UZS</strong> miqdoridagi ijara qarzi va penya undirilsin.</li>
        <li>Sud xarajatlari va davlat boji Javobgar zimmasiga yuklatilsin.</li>
      </ol>

      <div style="margin-top: 40px;">
        <strong>Ilovalar:</strong><br>
        1. Ommaviy oferta shartnomasi nusxasi.<br>
        2. Mijoz KYC pasport va PINFL ma'lumotlari nusxasi.<br>
        3. Uskunani topshirish-qabul qilish dalolatnomasi va buyurtma cheki (#${order.id}).
      </div>

      <div style="margin-top: 50px; display: flex; justify-space-between;">
        <div>
          Sana: <strong>${todayStr}</strong>
        </div>
        <div>
          <strong>"MECO SOLAR POWER" MChJ Direktori:</strong> _______________ (Imzo)
        </div>
      </div>
    </body>
    </html>
    `;

    res.send(htmlContent);
  } catch (error) {
    res.status(500).send('Xatolik yuz berdi: ' + error.message);
  }
});

// ── 8. TELEGRAM BOT DISPATCH ENGINE FOR LEGAL PETITION ────────────────────
app.post('/api/legal/send-telegram', async (req, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Telegram hujjatlarini yuborish uchun admin sifatida kiring.' });
    const { orderId, chatId } = req.body;
    const activeToken = process.env.TELEGRAM_BOT_TOKEN || '';
    const adminChatId = process.env.TELEGRAM_CHAT_ID || '';

    let messageText = '';
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true, product: true }
      });
      if (order) {
        const todayStr = new Date().toLocaleDateString('uz-UZ');
        const endDateStr = order.endDate ? new Date(order.endDate).toLocaleDateString('uz-UZ') : '—';
        const now = new Date();
        const daysOverdue = order.endDate ? Math.floor((now - new Date(order.endDate)) / (1000 * 60 * 60 * 24)) : 0;
        if (order.type !== 'RENT' || daysOverdue <= 3 || ['COMPLETED', 'CANCELLED'].includes(order.status)) {
          return res.status(400).json({ error: 'PDF faqat 3 kundan ko‘p kechikkan va qaytarilmagan ijara uchun yuboriladi.' });
        }
        const baseAmount = order.totalAmount || 1000000;
        const penaltyAmount = Math.round(baseAmount * 0.005 * daysOverdue);
        const totalClaimAmount = baseAmount + penaltyAmount;

        messageText = `⚖️ *RASMIY DA'VO ARIZASI (SUD ARIZASI)*\n` +
          `----------------------------------------\n` +
          `🏛 *Sud:* Fuqarolik ishlari bo'yicha Toshkent shahar sudi\n` +
          `🏢 *Da'vogar:* "MECO SOLAR POWER" MChJ\n` +
          `👤 *Javobgar:* ${order.user?.fullName || 'Mijoz'}\n` +
          `📞 *Tel:* ${order.user?.phone || '—'}\n` +
          `🪪 *Pasport:* ${order.user?.passportSeries || '—'}, PINFL: ${order.user?.pinfl || '—'}\n\n` +
          `📦 *Uskuna:* ${order.product?.title || 'Meco Generator'} (${order.product?.capacity || ''})\n` +
          `📅 *Shartnoma muddati tugagan sana:* ${endDateStr} (${daysOverdue} kun o'tgan)\n\n` +
          `💰 *UNDIRILADIGAN SUMMA:* \n` +
          `• Asosiy qarz: ${baseAmount.toLocaleString()} UZS\n` +
          `• Penya (0.5%/kun): ${penaltyAmount.toLocaleString()} UZS\n` +
          `• *JAMI DA'VO SUMMASI: ${totalClaimAmount.toLocaleString()} UZS*\n\n` +
          `📌 FK 535, 553-moddalariga asosan sud tartibida undirish so'raladi.\n` +
          `📄 Rasmiy da'vo arizasi PDF fayl sifatida ilova qilindi.`;
      }
    }

    if (!messageText) return res.status(404).json({ error: 'Ijara buyurtmasi topilmadi.' });

    if (!activeToken) return res.status(503).json({ error: 'Serverda TELEGRAM_BOT_TOKEN sozlanmagan.' });
    if (!adminChatId) return res.status(503).json({ error: 'Server .env faylida admin TELEGRAM_CHAT_ID sozlanmagan.' });
    if (String(chatId || '') !== String(adminChatId)) return res.status(403).json({ error: 'Mijoz hujjatlari faqat sozlangan admin Telegram chatiga yuboriladi.' });
    if (!orderId) return res.status(400).json({ error: 'Ijara buyurtmasi ID ko‘rsatilmagan.' });

    // Render from the active Prisma order. The legacy Django PDF endpoint uses
    // a separate PostgreSQL database and cannot see these SQLite orders.
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true, product: true } });
    if (!order) return res.status(404).json({ error: 'Ijara buyurtmasi topilmadi.' });
    const { spawn } = await import('node:child_process');
    const python = process.env.PYTHON_BIN || 'backend/venv/bin/python';
    const script = 'import sys; from weasyprint import HTML; sys.stdout.buffer.write(HTML(string=sys.stdin.buffer.read().decode("utf-8")).write_pdf())';
    const renderer = spawn(python, ['-c', script], { stdio: ['pipe', 'pipe', 'pipe'] });
    const pdf = await new Promise((resolve, reject) => {
      const chunks = [];
      let renderError = '';
      renderer.stdout.on('data', chunk => chunks.push(chunk));
      renderer.stderr.on('data', chunk => { renderError += chunk.toString(); });
      renderer.on('error', reject);
      renderer.on('close', code => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`PDF yaratilmadi: ${renderError.slice(-500)}`)));
      const safe = value => String(value || '—').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
      renderer.stdin.end(`<html><head><meta charset="utf-8"><style>body{font-family:serif;font-size:14pt;line-height:1.5;margin:36px}.title{text-align:center;font-weight:bold;font-size:18pt;margin:24px}li{margin:12px 0}</style></head><body><h2 style="text-align:right">MECO SOLAR POWER MChJ<br>Da’vogar</h2><div class="title">DA’VO ARIZASI</div><p>Fuqarolik ishlari bo‘yicha sudga</p><p>Javobgar: <b>${safe(order.user?.fullName)}</b><br>Telefon: ${safe(order.user?.phone)}<br>Manzil: ${safe(order.user?.address)}</p><p>Buyurtma: #${safe(order.id)}<br>Mahsulot: ${safe(order.product?.title)}<br>Ijara muddati: ${order.endDate ? new Date(order.endDate).toLocaleDateString('uz-UZ') : '—'}</p><p>Ijara muddati tugaganidan so‘ng mahsulot qaytarilmaganligi sababli, uni qaytarish va shartnoma bo‘yicha hisob-kitobni amalga oshirish so‘raladi.</p><p>Ilovalar: ijara shartnomasi va buyurtma ma’lumotlari.</p><p style="margin-top:60px">Sana: ${new Date().toLocaleDateString('uz-UZ')} <span style="float:right">Imzo: ______________</span></p></body></html>`);
    });
    const form = new FormData();
    form.append('chat_id', String(chatId || ''));
    form.append('caption', messageText.slice(0, 1024));
    form.append('document', new Blob([pdf], { type: 'application/pdf' }), `Mijoz_${orderId}_davo.pdf`);
    const response = await fetch(`https://api.telegram.org/bot${activeToken}/sendDocument`, { method: 'POST', body: form });
    const result = await response.json();
    if (!result.ok) throw new Error(result.description || 'Telegram API xatoligi');
    res.json({ success: true, result, previewText: messageText, message: 'PDF va mijoz ma’lumotlari admin Telegram chatiga yuborildi.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/telegram/status', async (_req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const publicApi = process.env.PUBLIC_API_URL || '';
  const status = { tokenConfigured: Boolean(token), publicApiConfigured: Boolean(publicApi), webhookConfigured: false, pollingMode: true, lastWebhookError: null, error: null };
  if (token) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const result = await response.json();
      if (!result.ok) throw new Error(result.description || 'Telegram API xatoligi');
      status.webhookConfigured = Boolean(result.result?.url);
      status.lastWebhookError = result.result?.last_error_message || null;
    } catch (error) { status.error = error.message; }
  }
  res.json(status);
});

app.post('/api/telegram/setup-webhook', async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin ruxsati kerak.' });
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const publicApi = process.env.PUBLIC_API_URL || '';
  if (!token) return res.status(503).json({ error: 'TELEGRAM_BOT_TOKEN server .env faylida sozlanmagan.' });
  if (!/^https:\/\//i.test(publicApi)) return res.status(503).json({ error: 'PUBLIC_API_URL ommaviy HTTPS server manziliga sozlanmagan.' });
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${publicApi.replace(/\/$/, '')}/api/telegram/webhook` })
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.description || 'Telegram webhook sozlanmadi.');
    res.json({ success: true, message: 'Telegram webhook sozlandi.' });
  } catch (error) { res.status(502).json({ error: error.message }); }
});

// Telegram webhook: /start replies to its sender; private customer data goes
// only to the explicitly configured administrator chat.
app.post('/api/telegram/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const message = req.body?.message;
    const chatId = message?.chat?.id;
    if (!chatId || !/^\/start(?:@\w+)?(?:\s|$)/.test(message?.text || '')) return;

    const api = (method) => token ? `https://api.telegram.org/bot${token}/${method}` : '';
    if (!token) {
      console.error('Telegram /start received but TELEGRAM_BOT_TOKEN is missing from server environment.');
      return;
    }
    const sendMessage = async (targetChatId, text) => {
      const response = await fetch(api('sendMessage'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: targetChatId, text: text.slice(0, 4000) }) });
      const result = await response.json();
      if (!result.ok) throw new Error(result.description || 'Telegram sendMessage xatoligi');
      return result;
    };

    const customers = await prisma.user.findMany({ where: { role: 'CLIENT' }, orderBy: { createdAt: 'desc' } });
    const rentals = await prisma.order.findMany({
      where: { type: 'RENT', endDate: { lt: new Date(Date.now() - 3 * 86400000) }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      include: { user: true, product: true }, orderBy: { endDate: 'asc' }
    });
    await sendMessage(chatId, `🤖 MECO bot ishga ulandi. Jami mijoz: ${customers.length}. 3 kundan oshgan ijara: ${rentals.length} ta.`);
    const adminChatId = process.env.TELEGRAM_CHAT_ID || '';
    if (adminChatId && String(chatId) === String(adminChatId)) {
      const lines = customers.slice(0, 35).map((customer, index) => `${index + 1}. ${customer.fullName || 'Mijoz'} — ${customer.phone}`);
      await sendMessage(adminChatId, `📊 MECO mijozlar hisoboti\nJami mijoz: ${customers.length}\n3 kundan oshgan ijara: ${rentals.length}\n\n${lines.join('\n') || 'Hozircha mijoz yo‘q.'}`);
      for (const order of rentals) await sendMessage(adminChatId, `⚠️ ${order.user?.fullName || 'Mijoz'} (${order.user?.phone || 'telefon yo‘q'}) — ${order.product?.title || 'Ijara'}, muddati ${Math.floor((Date.now() - new Date(order.endDate)) / 86400000)} kun o‘tgan. Buyurtma: ${order.id}.`);
    }
  } catch (error) {
    console.error('Telegram /start report failed:', error.message);
  }
});

async function startTelegramPolling() {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token || telegramPollingStarted) return;
  telegramPollingStarted = true;
  const baseUrl = `https://api.telegram.org/bot${token}`;
  let offset = 0;
  console.log('Telegram polling mode started (domain/webhook not required).');
  while (telegramPollingStarted) {
    try {
      const response = await fetch(`${baseUrl}/getUpdates?timeout=25&offset=${offset}`, { signal: AbortSignal.timeout(30000) });
      const result = await response.json();
      if (!result.ok) throw new Error(result.description || 'Telegram getUpdates xatoligi');
      for (const update of result.result || []) {
        offset = Math.max(offset, update.update_id + 1);
        const message = update.message;
        const chatId = message?.chat?.id;
        if (!chatId || !/^\/(?:start|id)(?:@\w+)?(?:\s|$)/.test(message.text || '')) continue;
        const sendMessage = async (text) => {
          const sent = await fetch(`${baseUrl}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000) })
          });
          const sendResult = await sent.json();
          if (!sendResult.ok) throw new Error(sendResult.description || 'Telegram sendMessage xatoligi');
        };
        if (String(message.text).startsWith('/id')) {
          await sendMessage(`Admin chat ID: ${chatId}\nBu raqamni serverdagi TELEGRAM_CHAT_ID sozlamasiga kiriting.`);
          continue;
        }
        const adminChatId = process.env.TELEGRAM_CHAT_ID || '';
        if (!adminChatId || String(chatId) !== String(adminChatId)) {
          await sendMessage(`MECO bot ishlayapti ✅\nSizning Telegram chat ID: ${chatId}\nAdmin hisoboti va 3 kundan oshgan ijara ma’lumotlari uchun shu ID ni TELEGRAM_CHAT_ID ga sozlang.`);
          continue;
        }
        const customers = await prisma.user.findMany({ where: { role: 'CLIENT' }, orderBy: { createdAt: 'desc' } });
        const overdue = await prisma.order.findMany({
          where: { type: 'RENT', endDate: { lt: new Date(Date.now() - 3 * 86400000) }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: { user: true, product: true }, orderBy: { endDate: 'asc' }
        });
        const customerLines = customers.slice(0, 35).map((customer, index) => `${index + 1}. ${customer.fullName || 'Mijoz'} — ${customer.phone}`);
        await sendMessage(`📊 MECO mijozlar hisoboti\nJami mijoz: ${customers.length}\n3 kundan oshgan ijara: ${overdue.length}\n\n${customerLines.join('\n') || 'Hozircha mijoz yo‘q.'}`);
        for (const order of overdue) {
          await sendMessage(`⚠️ ${order.user?.fullName || 'Mijoz'} (${order.user?.phone || 'telefon yo‘q'}) — ${order.product?.title || 'Ijara'}, muddati ${Math.floor((Date.now() - new Date(order.endDate)) / 86400000)} kun o‘tgan. Buyurtma: ${order.id}.`);
        }
      }
    } catch (error) {
      console.error('Telegram polling error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}


app.listen(PORT, () => {
  console.log(`MECO Backend API Server running on http://localhost:${PORT}`);
  startTelegramPolling();
});
