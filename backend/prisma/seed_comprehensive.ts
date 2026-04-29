import bcrypt from "bcryptjs";
import {
  PrismaClient,
  RequestMode,
  RequestStatus,
  RepairJobStatus,
  ShopCategory,
  UserRole,
  PaymentStatus,
  EscrowStatus,
  LedgerEntryType,
  LedgerDirection,
  DisputeStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("≡ƒî▒ Starting Comprehensive Seeding...");

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Users
  console.log("≡ƒæñ Creating Users...");
  const customer = await prisma.user.upsert({
    where: { email: "customer@meramot.demo" },
    update: {},
    create: {
      username: "customer_demo",
      email: "customer@meramot.demo",
      passwordHash,
      name: "John Customer",
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });

  const vendorUser = await prisma.user.upsert({
    where: { email: "vendor@meramot.demo" },
    update: {},
    create: {
      username: "vendor_demo",
      email: "vendor@meramot.demo",
      passwordHash,
      name: "Ahmed ShopOwner",
      role: "VENDOR",
      status: "ACTIVE",
    },
  });

  // 2. Shops
  console.log("≡ƒÅ¬ Creating Shops...");
  const shop = await prisma.shop.upsert({
    where: { slug: "dhaka-pro-fix" },
    update: {},
    create: {
      name: "Dhaka Pro Fix",
      slug: "dhaka-pro-fix",
      description: "Premium electronics repair shop in Dhanmondi.",
      address: "15 Dhanmondi Road",
      city: "Dhaka",
      area: "Dhanmondi",
      ratingAvg: 4.8,
      reviewCount: 45,
      isActive: true,
      categories: [ShopCategory.IN_SHOP_REPAIR, ShopCategory.COURIER_PICKUP],
      staff: {
        create: {
          userId: vendorUser.id,
          role: "OWNER",
        },
      },
    },
  });

  // 3. Repair Requests & Jobs (For Settlement Testing)
  console.log("≡ƒ¢á∩╕Å Creating Repair Flow Data...");
  for (let i = 1; i <= 10; i++) {
    const request = await prisma.repairRequest.create({
      data: {
        userId: customer.id,
        title: `Repair Request #${i}`,
        deviceType: "Smartphone",
        brand: "Samsung",
        model: "Galaxy S22",
        problem: "Screen replacement needed",
        status: RequestStatus.COMPLETED,
        mode: RequestMode.DIRECT_REPAIR,
        requestedShopId: shop.id,
      },
    });

    const job = await prisma.repairJob.create({
      data: {
        repairRequestId: request.id,
        shopId: shop.id,
        status: RepairJobStatus.COMPLETED,
        finalQuotedAmount: 5000 + i * 100,
        customerApproved: true,
        completedAt: new Date(),
      },
    });

    const payment = await prisma.payment.create({
      data: {
        userId: customer.id,
        repairRequestId: request.id,
        amount: 5000 + i * 100,
        currency: "BDT",
        method: "SSLCOMMERZ",
        status: "PAID",
        escrowStatus: "HELD",
        transactionRef: `TXN-REF-${i}-${Date.now()}`,
        paidAt: new Date(),
      },
    });

    // Create a Ledger Entry for the Customer Payment
    await prisma.ledgerEntry.create({
      data: {
        paymentId: payment.id,
        amount: payment.amount,
        type: "CUSTOMER_PAYMENT",
        direction: "CREDIT",
        description: "Customer paid via SSLCommerz",
      },
    });
  }

  // 4. Disputes
  console.log("ΓÜû∩╕Å Creating Disputes...");
  const disputeRequest = await prisma.repairRequest.create({
    data: {
      userId: customer.id,
      title: "Broken Screen Again",
      deviceType: "Laptop",
      brand: "HP",
      problem: "Screen broke again after 2 days",
      status: RequestStatus.COMPLETED,
      mode: RequestMode.DIRECT_REPAIR,
      requestedShopId: shop.id,
    },
  });

  const disputePayment = await prisma.payment.create({
    data: {
      userId: customer.id,
      repairRequestId: disputeRequest.id,
      amount: 12000,
      currency: "BDT",
      method: "SSLCOMMERZ",
      status: "PAID",
      escrowStatus: "HELD",
      transactionRef: `TXN-DISPUTE-${Date.now()}`,
      paidAt: new Date(),
    },
  });

  await prisma.disputeCase.create({
    data: {
      openedById: customer.id,
      againstId: vendorUser.id,
      paymentId: disputePayment.id,
      repairRequestId: disputeRequest.id,
      status: "OPEN",
      notes: {
        create: {
          authorId: customer.id,
          note: "The shop used a low-quality screen and it cracked again within 48 hours.",
          isInternal: false,
        },
      },
    },
  });

  // 5. Support Tickets
  console.log("≡ƒÄ½ Creating Support Tickets...");
  await prisma.supportTicket.create({
    data: {
      userId: customer.id,
      subject: "Payment not reflecting",
      message: "I paid via bKash but my order still shows pending.",
      status: "OPEN",
      priority: "HIGH",
    },
  });

  console.log("Γ£à Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
