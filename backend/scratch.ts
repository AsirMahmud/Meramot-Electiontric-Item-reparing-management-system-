import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fixing null methods in payments...");
  const updated = await prisma.payment.updateMany({
    where: {
      method: null
    },
    data: {
      method: "SSLCOMMERZ"
    }
  });

  console.log(`Updated ${updated.count} payments with missing methods.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
