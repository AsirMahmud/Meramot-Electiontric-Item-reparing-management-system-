import prisma from "../src/models/prisma.js";

async function main() {
  try {
    const userCount = await prisma.user.count();
    const shopCount = await prisma.shop.count();
    const vendorAppCount = await prisma.vendorApplication.count();
    const repairRequestCount = await prisma.repairRequest.count();
    
    console.log("Database Audit:");
    console.log(`- Users: ${userCount}`);
    console.log(`- Shops: ${shopCount}`);
    console.log(`- Vendor Applications: ${vendorAppCount}`);
    console.log(`- Repair Requests: ${repairRequestCount}`);
    
  } catch (error) {
    console.error("Error during audit:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
