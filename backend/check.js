import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.shop.updateMany({
    where: { isActive: true, isPublic: true },
    data: { isFeatured: true }
  });
  console.log("Updated active shops to be featured.");
}

main().finally(() => prisma.$disconnect());
