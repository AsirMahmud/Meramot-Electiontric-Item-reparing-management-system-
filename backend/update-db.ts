import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const shops = await prisma.shop.findMany();
  if (shops.length > 0) {
    const firstShop = shops[0];
    const newSpecialties = [...firstShop.specialties, "phone", "laptop", "tablet", "smartwatch", "console", "printer"];
    // make it unique
    const uniqueSpecialties = Array.from(new Set(newSpecialties));
    
    await prisma.shop.update({
      where: { id: firstShop.id },
      data: { specialties: uniqueSpecialties }
    });
    console.log("Updated first shop with all keywords!");
  } else {
    console.log("No shops in database.");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
