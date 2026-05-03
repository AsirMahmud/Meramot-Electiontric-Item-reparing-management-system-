import prisma from "../src/models/prisma.js";

async function main() {
  try {
    const featuredCount = await prisma.shop.count({
      where: { isFeatured: true, isActive: true }
    });
    const totalCount = await prisma.shop.count();
    
    console.log(`Total shops: ${totalCount}`);
    console.log(`Featured & Active shops: ${featuredCount}`);
    
    if (featuredCount === 0 && totalCount > 0) {
      console.log("No featured shops found. Marking all active shops as featured for demo...");
      await prisma.shop.updateMany({
        where: { isActive: true },
        data: { isFeatured: true }
      });
      console.log("Updated shops.");
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
