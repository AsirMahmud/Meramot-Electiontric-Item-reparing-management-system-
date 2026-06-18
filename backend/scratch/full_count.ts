import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const counts = {
    users: await prisma.user.count(),
    shops: await prisma.shop.count(),
    vendorApps: await prisma.vendorApplication.count(),
    payments: await prisma.payment.count(),
    ledgerEntries: await prisma.ledgerEntry.count(),
    supportTickets: await prisma.supportTicket.count(),
    repairRequests: await prisma.repairRequest.count(),
  };
  console.log(JSON.stringify(counts, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
