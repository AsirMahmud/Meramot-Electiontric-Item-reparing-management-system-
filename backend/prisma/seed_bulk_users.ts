import bcrypt from "bcryptjs";
import {
  PrismaClient,
  RequestMode,
  RequestStatus,
  RepairJobStatus,
  PaymentStatus,
  EscrowStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Bulk User Generation (10 Users)...");

  const passwordHash = await bcrypt.hash("password123", 10);
  
  // Find a shop to associate requests with
  const shop = await prisma.shop.findFirst();
  if (!shop) {
    console.error("❌ Error: No shops found. Please run comprehensive seed first.");
    return;
  }

  const userNames = [
    "Arif Ahmed", "Sultana Razia", "Tanvir Hossain", "Nabila Islam", 
    "Fahim Rahman", "Sadia Afrin", "Mahmudul Hasan", "Ishrat Jahan",
    "Rakibul Islam", "Tasnim Akter"
  ];

  for (let i = 0; i < userNames.length; i++) {
    const name = userNames[i];
    const email = `user${i + 1}@example.com`;
    const username = `user_test_${i + 1}`;

    console.log(`👤 Creating user: ${name}`);

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        username,
        email,
        passwordHash,
        name,
        phone: `+88018${1000000 + i}`,
        role: "CUSTOMER",
        status: "ACTIVE",
      },
    });

    // 1. Support Ticket
    await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: `Issue from ${name}`,
        message: `Hello, I am having trouble with my recent repair request. User ID: ${user.id}`,
        status: i % 2 === 0 ? "OPEN" : "IN_PROGRESS",
        priority: i % 3 === 0 ? "HIGH" : "MEDIUM",
      },
    });

    // 2. Repair Request & Payment
    const request = await prisma.repairRequest.create({
      data: {
        userId: user.id,
        title: `Smartphone Repair - ${name}`,
        deviceType: "Mobile",
        brand: i % 2 === 0 ? "Apple" : "Xiaomi",
        problem: "Battery replacement",
        status: RequestStatus.COMPLETED,
        mode: RequestMode.DIRECT_REPAIR,
        requestedShopId: shop.id,
      },
    });

    await prisma.repairJob.create({
      data: {
        repairRequestId: request.id,
        shopId: shop.id,
        status: RepairJobStatus.COMPLETED,
        finalQuotedAmount: 3000 + (i * 200),
        customerApproved: true,
      },
    });

    await prisma.payment.create({
      data: {
        userId: user.id,
        repairRequestId: request.id,
        amount: 3000 + (i * 200),
        currency: "BDT",
        method: "SSLCOMMERZ",
        status: "PAID",
        escrowStatus: "HELD",
        transactionRef: `TXN-BULK-${i}-${Date.now()}`,
        paidAt: new Date(),
      },
    });

    // 3. Complaint (Dispute) for every 3rd user
    if (i % 3 === 0) {
      console.log(`🚩 Creating dispute for: ${name}`);
      const disputeRequest = await prisma.repairRequest.create({
        data: {
          userId: user.id,
          title: `Faulty Repair Complaint - ${name}`,
          deviceType: "Mobile",
          brand: "Apple",
          problem: "The device is overheating after repair",
          status: RequestStatus.COMPLETED,
          mode: RequestMode.DIRECT_REPAIR,
          requestedShopId: shop.id,
        },
      });

      const disputePayment = await prisma.payment.create({
        data: {
          userId: user.id,
          repairRequestId: disputeRequest.id,
          amount: 4500,
          currency: "BDT",
          status: "PAID",
          escrowStatus: "HELD",
          transactionRef: `TXN-COMPLAINT-${i}-${Date.now()}`,
          paidAt: new Date(),
        },
      });

      // Find a vendor to complain against
      const shopOwner = await prisma.shopStaff.findFirst({
        where: { shopId: shop.id, role: "OWNER" },
        select: { userId: true }
      });

      await prisma.disputeCase.create({
        data: {
          openedById: user.id,
          againstId: shopOwner?.userId || null, 
          paymentId: disputePayment.id,
          repairRequestId: disputeRequest.id,
          status: "OPEN",
          notes: {
            create: {
              authorId: user.id,
              note: "I am extremely unhappy. The shop charged me but the phone is now unusable due to overheating.",
              isInternal: false,
            },
          },
        },
      });
    }
  }

  console.log("✅ Bulk Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
