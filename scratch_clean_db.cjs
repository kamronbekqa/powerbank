const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  await prisma.order.deleteMany({});
  await prisma.verification.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      role: { not: 'ADMIN' },
      phone: { notIn: ['+998901234567', 'admin'] }
    }
  });
  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: { visitCount: 0 },
    create: { id: 'default', visitCount: 0 }
  });
  console.log('SUCCESS! Reset visit count to 0 and cleaned demo records.');
  await prisma.$disconnect();
}

clean().catch(err => {
  console.error('Clean error:', err);
  process.exit(1);
});
