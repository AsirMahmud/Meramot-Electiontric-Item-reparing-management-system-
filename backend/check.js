import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const shops = await prisma.shop.findMany({ where: { isFeatured: true } });
  console.log(shops);
}

main().finally(() => prisma.$disconnect());
