import prisma from "./src/models/prisma.js";
async function main() {
  await prisma.vendorApplication.create({
    data: {
      ownerName: "John Doe",
      businessEmail: "john@electronics.demo",
      phone: "+880123456789",
      shopName: "John's Tech Repair",
      address: "123 Main St, Dhaka",
      city: "Dhaka",
      area: "Gulshan",
      status: "PENDING",
      specialties: ["Laptops", "Smartphones"],
      courierPickup: true,
      inShopRepair: true,
      spareParts: false,
      notes: "Looking forward to joining the platform."
    }
  });
  console.log("Seed successful: Created 1 pending vendor application.");
  process.exit(0);
}
main();
