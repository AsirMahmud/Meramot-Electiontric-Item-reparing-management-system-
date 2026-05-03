const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shops = await prisma.shop.findMany({
    where: { categories: { has: 'COURIER_PICKUP' } },
    select: { name: true, categories: true, isPublic: true, isActive: true }
  });
  console.log('Courier Pickup Shops:', shops);
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
