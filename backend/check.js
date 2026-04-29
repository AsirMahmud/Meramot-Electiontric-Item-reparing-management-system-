import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 2 })
  .then(console.log)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
