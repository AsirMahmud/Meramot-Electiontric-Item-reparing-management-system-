import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const payments = await prisma.payment.findMany({
    where: {
      status: "PAID",
      ledgerEntries: {
        none: {
          type: "CUSTOMER_PAYMENT",
        },
      },
    },
  });

  console.log(`Found ${payments.length} payments missing CUSTOMER_PAYMENT ledger entries`);

  for (const payment of payments) {
    await prisma.ledgerEntry.create({
      data: {
        paymentId: payment.id,
        amount: payment.amount,
        type: "CUSTOMER_PAYMENT",
        direction: "CREDIT",
        description: "Customer payment recorded during bulk seed",
        createdAt: payment.paidAt || payment.createdAt,
      },
    });
    console.log(`Created ledger entry for payment ${payment.id}`);
  }

  console.log("✅ Ledger sync completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
