import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  PrismaClient,
  RequestMode,
  RequestStatus,
  RepairJobStatus,
  ShopCategory,
  type Shop,
  type User,
} from "@prisma/client";

const prisma = new PrismaClient();

const areaCoords: { name: string; lat: number; lng: number }[] = [
  { name: "Dhanmondi",    lat: 23.7461, lng: 90.3742 },
  { name: "Gulshan",      lat: 23.7925, lng: 90.4078 },
  { name: "Banani",       lat: 23.7940, lng: 90.4023 },
  { name: "Mirpur",       lat: 23.8042, lng: 90.3688 },
  { name: "Uttara",       lat: 23.8759, lng: 90.3795 },
  { name: "Mohammadpur",  lat: 23.7662, lng: 90.3587 },
  { name: "New Market",   lat: 23.7327, lng: 90.3854 },
  { name: "Farmgate",     lat: 23.7565, lng: 90.3903 },
  { name: "Tejgaon",      lat: 23.7594, lng: 90.3988 },
  { name: "Bashundhara",  lat: 23.8130, lng: 90.4250 },
];

const specialtiesPool = [
  "MacBook Air M2 Repair",
  "Battery replacement",
  "Keyboard repair",
  "Display repair",
  "Charging port replacement",
  "Motherboard repair",
  "Water damage recovery",
  "SSD upgrade",
];

const reviewTexts = [
  "Fast service and clear communication throughout the repair.",
  "Good pricing and the technician explained the issue properly.",
  "The repair was completed on time and the device works well now.",
  "Friendly staff and professional handling.",
  "Pickup and drop-off were smooth. Would use again.",
  "The diagnosis was accurate and the final cost was fair.",
  "Solid service overall. The shop kept me updated.",
  "Quick turnaround and good quality parts.",
];

async function seedShopReviews(users: User[]) {
  // Fetch ALL shops from DB — not just seeded ones — to ensure every shop gets reviews
  const shops = await prisma.shop.findMany();
  console.log(`  Found ${shops.length} total shops in database.`);
  const userIds = users.map(u => u.id);

  // ── FULL CLEANUP: Delete ALL seed-generated financial + review data ──
  // Order matters due to foreign key constraints: children first, parents last.
  console.log("  Cleaning up previous seed data...");
  await prisma.escrowLedger.deleteMany({ where: { customerUserId: { in: userIds } } });
  await prisma.ledgerEntry.deleteMany({ where: { payment: { userId: { in: userIds } } } });
  await prisma.payment.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.rating.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.repairJob.deleteMany({ where: { repairRequest: { userId: { in: userIds } } } });
  await prisma.repairRequest.deleteMany({ where: { userId: { in: userIds } } });

  const ratingData: any[] = [];
  const requestData: any[] = [];
  const jobData: any[] = [];
  const paymentData: any[] = [];
  const ledgerData: any[] = [];
  const escrowLedgerData: any[] = [];

  // Track which users have already rated which shops to enforce uniqueness
  const usedPairs = new Set<string>();

  for (const shop of shops) {
    // Each shop gets 30–80 reviews (well under 500 user cap)
    const reviewCount = Math.floor(Math.random() * 50) + 30;
    const selectedUsers = randomSubset(users, reviewCount);

    for (const user of selectedUsers) {
      const pairKey = `${user.id}::${shop.id}`;
      if (usedPairs.has(pairKey)) continue; // enforce @@unique([userId, shopId])
      usedPairs.add(pairKey);

      // ── Realistic star distribution ──
      // Target average: ~4.0-4.3 per shop (typical for repair services)
      // 5★: 35%  4★: 25%  3★: 20%  2★: 12%  1★: 8%
      const r = Math.random();
      let score: number;
      if      (r < 0.08) score = 1;
      else if (r < 0.20) score = 2;
      else if (r < 0.40) score = 3;
      else if (r < 0.65) score = 4;
      else               score = 5;

      // ~30% of ratings include a written review
      const hasText = Math.random() < 0.30;
      const reviewText = hasText ? randomFrom(reviewTexts) : null;

      // Timeline: request → job start → job complete → payment → review
      const reviewDate = new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000);
      const requestDate = new Date(reviewDate.getTime() - 14 * 24 * 60 * 60 * 1000);
      const jobStartDate = new Date(reviewDate.getTime() - 10 * 24 * 60 * 60 * 1000);
      const jobCompleteDate = new Date(reviewDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      const paymentDate = new Date(reviewDate.getTime() - 2 * 24 * 60 * 60 * 1000);

      // Realistic repair amount: 800–8000 BDT
      const amount = Math.floor(Math.random() * 7200) + 800;

      // ── 1. RepairRequest ──
      const requestId = crypto.randomUUID();
      requestData.push({
        id: requestId,
        userId: user.id,
        title: randomFrom(["Screen Repair", "Battery Replacement", "Keyboard Fix", "Charging Port", "General Checkup", "Motherboard Repair", "Water Damage Recovery", "SSD Upgrade"]),
        deviceType: randomFrom(["Laptop", "Phone", "Tablet", "Desktop"]),
        problem: "Device issue requiring professional repair",
        mode: RequestMode.DIRECT_REPAIR,
        status: RequestStatus.COMPLETED,
        quotedFinalAmount: amount,
        createdAt: requestDate,
      });

      // ── 2. RepairJob (linked to request + shop) ──
      const jobId = crypto.randomUUID();
      jobData.push({
        id: jobId,
        repairRequestId: requestId,
        shopId: shop.id,
        status: RepairJobStatus.COMPLETED,
        customerApproved: true,
        finalQuotedAmount: amount,
        startedAt: jobStartDate,
        completedAt: jobCompleteDate,
        createdAt: requestDate,
      });

      // ── 3. Payment (PAID + escrow HELD) ──
      const paymentId = crypto.randomUUID();
      const transactionRef = `MMT-SEED-${paymentId.slice(0, 8).toUpperCase()}`;
      paymentData.push({
        id: paymentId,
        userId: user.id,
        repairRequestId: requestId,
        amount,
        currency: "BDT",
        method: "SSLCOMMERZ",
        status: "PAID",
        escrowStatus: "HELD",
        transactionRef,
        paidAt: paymentDate,
        createdAt: paymentDate,
      });

      // ── 4. LedgerEntry (financial audit trail) ──
      ledgerData.push({
        id: crypto.randomUUID(),
        paymentId,
        amount,
        type: "CUSTOMER_PAYMENT",
        direction: "CREDIT",
        description: `Customer payment for repair job`,
        createdAt: paymentDate,
      });

      // ── 5. EscrowLedger (escrow hold for admin dashboard) ──
      escrowLedgerData.push({
        id: crypto.randomUUID(),
        paymentId,
        repairRequestId: requestId,
        customerUserId: user.id,
        shopId: shop.id,
        amount,
        grossAmount: amount,
        action: "PAYMENT_HELD",
        note: "Payment held in escrow after successful transaction",
        createdAt: paymentDate,
      });

      // ── 6. Rating ──
      ratingData.push({
        userId: user.id,
        shopId: shop.id,
        score,
        review: reviewText,
        createdAt: reviewDate,
      });
    }
  }

  // ── Bulk insert in dependency order ──
  console.log(`  Inserting ${requestData.length} repair requests...`);
  await prisma.repairRequest.createMany({ data: requestData, skipDuplicates: true });
  console.log(`  Inserting ${jobData.length} repair jobs...`);
  await prisma.repairJob.createMany({ data: jobData, skipDuplicates: true });
  console.log(`  Inserting ${paymentData.length} payments...`);
  await prisma.payment.createMany({ data: paymentData, skipDuplicates: true });
  console.log(`  Inserting ${ledgerData.length} ledger entries...`);
  await prisma.ledgerEntry.createMany({ data: ledgerData, skipDuplicates: true });
  console.log(`  Inserting ${escrowLedgerData.length} escrow ledger entries...`);
  await prisma.escrowLedger.createMany({ data: escrowLedgerData, skipDuplicates: true });
  console.log(`  Inserting ${ratingData.length} ratings...`);
  await prisma.rating.createMany({ data: ratingData, skipDuplicates: true });

  // ── Sync aggregate fields for EVERY shop in DB ──
  // This ensures non-seeded shops also get their stale ratingAvg/reviewCount reset
  const allShops = await prisma.shop.findMany({ select: { id: true } });
  console.log(`  Syncing rating aggregates for all ${allShops.length} shops...`);
  for (const s of allShops) {
    const aggregate = await prisma.rating.aggregate({
      where: { shopId: s.id, isHidden: false },
      _avg: { score: true },
      _count: { score: true },
    });

    await prisma.shop.update({
      where: { id: s.id },
      data: {
        ratingAvg: Number((aggregate._avg.score ?? 0).toFixed(1)),
        reviewCount: aggregate._count.score,
      },
    });
  }
  console.log("  ✓ Shop reviews and financial data seeded successfully.");
}

function randomFrom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset<T>(arr: T[], count: number) {
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
}

async function main() {
  // Create hardwired admin account
  // Credentials are NOT stored in this file - they come from environment variables
  // Password hash is computed securely without storing plaintext anywhere in codebase
  
  // Admin password should be set in .env or environment
  // If not set, the seed will fail with clear error message
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    console.error("❌ ERROR: ADMIN_PASSWORD environment variable is required");
    console.error("   Please set ADMIN_PASSWORD in your .env file");
    process.exit(1);
  }

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: "mustahid000@gmail.com" },
    update: { passwordHash: adminPasswordHash, role: "ADMIN" },
    create: {
      email: "mustahid000@gmail.com",
      username: "mustahid_admin",
      name: "Mustahid",
      phone: "+8801700000001",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
      isEmailVerified: true,
    },
  });

  console.log("✓ Admin account ready:", admin.email);

  // Create demo customer account
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "customer@meramot.demo" },
    update: {},
    create: {
      username: "customerdemo",
      email: "customer@meramot.demo",
      passwordHash,
      name: "Customer Demo",
      phone: "+8801700000000",
      address: "12 Lake Road",
      city: "Dhaka",
      area: "Dhanmondi",
    },
  });

  const shopSeedData = [
    { name: "Dhaka Device Doctors", slug: "dhaka-device-doctors" },
    { name: "Gulshan Gadget Care", slug: "gulshan-gadget-care" },
    { name: "Banani Tech Bench", slug: "banani-tech-bench" },
    { name: "Mirpur Laptop Lab", slug: "mirpur-laptop-lab" },
    { name: "Uttara FixPoint", slug: "uttara-fixpoint" },
    { name: "Mohammadpur Device Depot", slug: "mohammadpur-device-depot" },
    { name: "New Market Repair Works", slug: "new-market-repair-works" },
    { name: "Farmgate Tech Rescue", slug: "farmgate-tech-rescue" },
    { name: "Tejgaon Circuit Care", slug: "tejgaon-circuit-care" },
    { name: "Bashundhara Laptop Lounge", slug: "bashundhara-laptop-lounge" },
    { name: "ByteBack Solutions", slug: "byteback-solutions" },
    { name: "Pixel Repair Station", slug: "pixel-repair-station" },
    { name: "Motherboard Masters", slug: "motherboard-masters" },
    { name: "QuickFix Electronics", slug: "quickfix-electronics" },
    { name: "Urban Device Clinic", slug: "urban-device-clinic" },
    { name: "Prime Laptop Care", slug: "prime-laptop-care" },
    { name: "Screen & Circuit", slug: "screen-and-circuit" },
    { name: "Trusted Tech Service", slug: "trusted-tech-service" },
    { name: "CoreFix Bangladesh", slug: "corefix-bangladesh" },
    { name: "Laptop Harbor", slug: "laptop-harbor" },
  ];
  
  const shops: Shop[] = [];
  
  for (let i = 0; i < shopSeedData.length; i++) {
    const { name, slug } = shopSeedData[i];
    const areaInfo = areaCoords[i % areaCoords.length];
    // Add slight jitter so shops in the same area aren't at identical coords
    const jitterLat = (Math.random() - 0.5) * 0.006;
    const jitterLng = (Math.random() - 0.5) * 0.006;
    const shopLat = Number((areaInfo.lat + jitterLat).toFixed(6));
    const shopLng = Number((areaInfo.lng + jitterLng).toFixed(6));
  
    const shopUserEmail = `vendor${i}@meramot.demo`;
    const shopUser = await prisma.user.upsert({
      where: { email: shopUserEmail },
      update: {},
      create: {
        username: `vendor_${slug}`,
        email: shopUserEmail,
        passwordHash,
        name: `${name} Owner`,
        phone: `+88018000000${i.toString().padStart(2, '0')}`,
        role: "VENDOR",
      },
    });

    const vendorApp = await prisma.vendorApplication.upsert({
      where: { businessEmail: shopUserEmail },
      update: {},
      create: {
        userId: shopUser.id,
        ownerName: `${name} Owner`,
        businessEmail: shopUserEmail,
        phone: shopUser.phone!,
        shopName: name,
        address: `${10 + i + 1} Main Road`,
        city: "Dhaka",
        area: areaInfo.name,
        lat: shopLat,
        lng: shopLng,
        specialties: randomSubset(specialtiesPool, 3),
        courierPickup: true,
        inShopRepair: true,
        spareParts: false,
        status: "APPROVED",
        reviewedAt: new Date(),
      },
    });

    const shop = await prisma.shop.upsert({
      where: { slug },
      update: {
        vendorApplicationId: vendorApp.id,
        lat: shopLat,
        lng: shopLng,
        area: areaInfo.name,
      },
      create: {
        vendorApplicationId: vendorApp.id,
        name,
        slug,
        description: "Professional electronics repair service.",
        address: `${10 + i + 1} Main Road`,
        city: "Dhaka",
        area: areaInfo.name,
        lat: shopLat,
        lng: shopLng,
        ratingAvg: Number((3.5 + Math.random() * 1.5).toFixed(1)),
        reviewCount: Math.floor(Math.random() * 200),
        priceLevel: Math.floor(Math.random() * 3) + 1,
        hasVoucher: (i + 1) % 2 === 0,
        freeDelivery: (i + 1) % 4 === 0,
        hasDeals: (i + 1) % 5 === 0,
        inspectionFee: (() => { const pl = Math.floor(Math.random() * 3) + 1; return [100, 150, 200][pl - 1] + Math.floor(Math.random() * 3) * 50; })(), // 100-300 for budget, 150-350 for mid, 200-400 for premium
        baseLaborFee: Math.floor(Math.random() * 6 + 3) * 100, // 300 to 800
        pickupFee: Math.floor(Math.random() * 3) * 50 + 50, // 50, 100, or 150
        expressFee: Math.floor(Math.random() * 4 + 2) * 100, // 200 to 500
        setupComplete: true,
        isPublic: true,
        categories: [
          ShopCategory.COURIER_PICKUP,
          ShopCategory.IN_SHOP_REPAIR,
        ],
        specialties: randomSubset(specialtiesPool, 3),
      },
    });

    await prisma.shopStaff.upsert({
      where: {
        shopId_userId: {
          shopId: shop.id,
          userId: shopUser.id,
        },
      },
      update: {},
      create: {
        shopId: shop.id,
        userId: shopUser.id,
        role: "OWNER",
        isActive: true,
      },
    });
  
    shops.push(shop);
  }

  const completedRequest = await prisma.repairRequest.create({
    data: {
      userId: user.id,
      title: "MacBook Air M2 Repair",
      deviceType: "Laptop",
      brand: "Apple",
      model: "MacBook Air M2",
      problem: "Battery drains too quickly",
      issueCategory: "Battery",
      imageUrls: [],
      mode: RequestMode.CHECKUP_AND_REPAIR,
      status: RequestStatus.COMPLETED,
      preferredPickup: true,
    },
  });

  await prisma.repairJob.create({
    data: {
      repairRequestId: completedRequest.id,
      shopId: shops[0].id,
      status: RepairJobStatus.COMPLETED,
      diagnosisNotes: "Battery replaced with original cell.",
      finalQuotedAmount: 12500, // Realistic BDT for MacBook Air M2 Battery
      customerApproved: true,
      startedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  const activeRequest = await prisma.repairRequest.create({
    data: {
      userId: user.id,
      title: "ThinkPad keyboard issue",
      deviceType: "Laptop",
      brand: "Lenovo",
      model: "ThinkPad T14",
      problem: "Several keys are unresponsive",
      issueCategory: "Keyboard",
      imageUrls: [],
      mode: RequestMode.DIRECT_REPAIR,
      status: RequestStatus.REPAIRING,
      preferredPickup: false,
    },
  });

  await prisma.repairJob.create({
    data: {
      repairRequestId: activeRequest.id,
      shopId: shops[1].id,
      status: RepairJobStatus.REPAIRING,
      diagnosisNotes: "Keyboard assembly needs replacement.",
      finalQuotedAmount: 4500, // Realistic BDT for ThinkPad keyboard
      customerApproved: true,
      startedAt: new Date(),
    },
  });

  // Create 500 dummy users with realistic Bangladeshi names
  const firstNames = [
    "Rahim", "Karim", "Jamal", "Hasan", "Hussain", "Arif", "Shakib", "Tamim",
    "Rafiq", "Sohel", "Imran", "Farhan", "Nabil", "Tanvir", "Mahfuz", "Ashiq",
    "Sabbir", "Rakib", "Saiful", "Nazmul", "Mehedi", "Jubayer", "Fahim", "Shafiq",
    "Rayhan", "Anik", "Siam", "Rashed", "Minhaj", "Tahmid", "Zubair", "Rimon",
    "Nusrat", "Fatima", "Ayesha", "Tasnim", "Lamia", "Sadia", "Rafia", "Maliha",
    "Sumaiya", "Nahida", "Jannatul", "Mariam", "Tabassum", "Farhana", "Sharmin",
    "Nasreen", "Rumana", "Tania", "Afsana", "Israt", "Laboni", "Mitu", "Rima",
    "Shapla", "Shirin", "Kamrun", "Sabina", "Habiba", "Dilruba", "Moushumi",
  ];
  const lastNames = [
    "Ahmed", "Hossain", "Rahman", "Islam", "Uddin", "Alam", "Khan", "Miah",
    "Chowdhury", "Sarker", "Das", "Bhuiyan", "Siddique", "Haque", "Talukder",
    "Begum", "Khatun", "Sultana", "Akter", "Mahmud", "Kabir", "Rashid",
    "Kamal", "Faruk", "Hasan", "Ali", "Sheikh", "Molla", "Biswas", "Roy",
  ];

  await prisma.user.createMany({
    data: Array.from({ length: 500 }).map((_, i) => {
      const first = firstNames[i % firstNames.length];
      const last = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
      return {
        username: `reviewer_${i}`,
        email: `dummy_reviewer_${i}@meramot.demo`,
        passwordHash,
        name: `${first} ${last}`,
        phone: `+8801900${i.toString().padStart(4, '0')}`,
        role: "CUSTOMER",
      };
    }),
    skipDuplicates: true,
  });

  // Update names for any existing dummy users (skipDuplicates won't update them)
  for (let i = 0; i < 500; i++) {
    const first = firstNames[i % firstNames.length];
    const last = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    await prisma.user.updateMany({
      where: { email: `dummy_reviewer_${i}@meramot.demo` },
      data: { name: `${first} ${last}` },
    });
  }

  const dummyUsers = await prisma.user.findMany({
    where: { email: { startsWith: 'dummy_reviewer_' } },
  });

  // Generate review distribution
  await seedShopReviews(dummyUsers);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });