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

  // Create delivery admin account
  const deliveryAdminPasswordHash = await bcrypt.hash("DeliveryAdmin@123", 10);

  const deliveryAdmin = await prisma.user.upsert({
    where: { email: "delivery.admin.demo@meeramoot.test" },
    update: { passwordHash: deliveryAdminPasswordHash, role: "DELIVERY_ADMIN" },
    create: {
      email: "delivery.admin.demo@meeramoot.test",
      username: "delivery_admin",
      name: "Delivery Admin",
      phone: "+8801700000002",
      passwordHash: deliveryAdminPasswordHash,
      role: "DELIVERY_ADMIN",
      status: "ACTIVE",
      isEmailVerified: true,
    },
  });

  console.log("✓ Delivery Admin account ready:", deliveryAdmin.email);

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
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  type ShopSeed = {
    name: string; slug: string; description?: string; address?: string;
    area?: string; lat?: number; lng?: number; priceLevel?: number;
    hasVoucher?: boolean; freeDelivery?: boolean; hasDeals?: boolean;
    isFeatured?: boolean; inspectionFee?: number; baseLaborFee?: number;
    pickupFee?: number; expressFee?: number; specialties?: string[];
  };

  const shopSeedData: ShopSeed[] = [
    // ── 20 Original Shops ──
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
    // ── 12 Featured/Specialty Shops (formerly seed_mock_shops) ──
    { name: "ProTech Solutions", slug: "protech-solutions", description: "OEM parts only. Certified Apple technicians. 12-month warranty included.", area: "Banani", lat: 23.7938, lng: 90.4048, priceLevel: 2, hasVoucher: true, isFeatured: true, inspectionFee: 300, baseLaborFee: 500, pickupFee: 100, expressFee: 400, specialties: ["battery replacement", "logic board repair", "laptop", "phone"] },
    { name: "The Gadget Den", slug: "the-gadget-den", description: "Express service available. Premium repair center.", area: "Gulshan", lat: 23.7806, lng: 90.4168, priceLevel: 3, isFeatured: true, inspectionFee: 500, baseLaborFee: 800, pickupFee: 150, expressFee: 500, specialties: ["screen replacement", "keyboard repair", "tablet", "smartwatch"] },
    { name: "Budget Fixer", slug: "budget-fixer", description: "Affordable high-quality generic replacement screens. 30-day warranty.", area: "Dhanmondi", lat: 23.7461, lng: 90.3742, priceLevel: 1, hasVoucher: true, hasDeals: true, isFeatured: true, inspectionFee: 100, baseLaborFee: 300, pickupFee: 50, expressFee: 200, specialties: ["display replacement", "screen repair", "console", "printer"] },
    { name: "MacMaster Repairs", slug: "macmaster-repairs", description: "OEM parts only. Certified Apple replacement tools in stock.", area: "Mohakhali", lat: 23.7776, lng: 90.3995, priceLevel: 2, isFeatured: true, inspectionFee: 250, baseLaborFee: 600, pickupFee: 100, expressFee: 350, specialties: ["certified apple support", "MacBook repair"] },
    { name: "The iDoc Garage", slug: "the-idoc-garage", description: "Premium repair with free delivery.", area: "Uttara", lat: 23.8759, lng: 90.3888, priceLevel: 3, freeDelivery: true, inspectionFee: 500, baseLaborFee: 700, pickupFee: 0, expressFee: 500, specialties: ["battery replacement", "water damage recovery"] },
    { name: "ByteSize Repairs", slug: "bytesize-repairs", description: "Express screen replacement with quick turnaround.", area: "Mirpur", lat: 23.8373, lng: 90.3668, priceLevel: 3, isFeatured: true, inspectionFee: 400, baseLaborFee: 700, pickupFee: 120, expressFee: 450, specialties: ["screen replacement", "keyboard repair"] },
    { name: "AppleCore Solutions", slug: "applecore-solutions", description: "Expert Apple device repair. Same-day service available.", area: "Badda", lat: 23.7805, lng: 90.4267, priceLevel: 3, isFeatured: true, inspectionFee: 450, baseLaborFee: 800, pickupFee: 100, expressFee: 500, specialties: ["logic board repair", "water damage recovery"] },
    { name: "Main Street Tech", slug: "main-street-tech", description: "Reliable everyday repairs at fair prices. Walk-ins welcome.", area: "Tejgaon", lat: 23.7603, lng: 90.3905, priceLevel: 2, inspectionFee: 200, baseLaborFee: 400, pickupFee: 80, expressFee: 300, specialties: ["trackpad replacement", "battery replacement"] },
    { name: "Precision Fix", slug: "precision-fix", description: "High-quality generic replacement battery. 90-day warranty.", area: "Rampura", lat: 23.7612, lng: 90.4208, priceLevel: 2, freeDelivery: true, isFeatured: true, inspectionFee: 200, baseLaborFee: 450, pickupFee: 0, expressFee: 300, specialties: ["battery replacement", "pickup service"] },
    { name: "Micro-Maestro", slug: "micro-maestro", description: "Specialist in micro soldering and board-level repair. 30-day warranty.", area: "Mohammadpur", lat: 23.7658, lng: 90.3584, priceLevel: 2, inspectionFee: 350, baseLaborFee: 600, pickupFee: 100, expressFee: 400, specialties: ["micro soldering", "board repair"] },
    { name: "Westside Computery", slug: "westside-computery", description: "CPU, storage, and keyboard replacement specialists. 30-day warranty.", area: "Wari", lat: 23.7174, lng: 90.4183, priceLevel: 2, inspectionFee: 150, baseLaborFee: 400, pickupFee: 80, expressFee: 250, specialties: ["storage replacement", "keyboard repair"] },
    { name: "The Gear Lab", slug: "the-gear-lab", description: "Screen repair and genuine spare parts available. Warranty included.", area: "Bashundhara", lat: 23.8183, lng: 90.4328, priceLevel: 2, isFeatured: true, inspectionFee: 250, baseLaborFee: 500, pickupFee: 100, expressFee: 350, specialties: ["replacement parts", "screen repair"] },
  ];
  
  const shops: Shop[] = [];
  
  for (let i = 0; i < shopSeedData.length; i++) {
    const s = shopSeedData[i];
    const { name, slug } = s;
    // Use explicit coords if provided, otherwise cycle through areaCoords
    const areaInfo = areaCoords.find(a => a.name === s.area) || areaCoords[i % areaCoords.length];
    const shopLat = s.lat ?? Number((areaInfo.lat + (Math.random() - 0.5) * 0.006).toFixed(6));
    const shopLng = s.lng ?? Number((areaInfo.lng + (Math.random() - 0.5) * 0.006).toFixed(6));
    const shopArea = s.area ?? areaInfo.name;
  
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
        isEmailVerified: true,
        isPhoneVerified: true,
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
        address: s.address ?? `${10 + i + 1} Main Road`,
        city: "Dhaka",
        area: shopArea,
        lat: shopLat,
        lng: shopLng,
        specialties: s.specialties ?? randomSubset(specialtiesPool, 3),
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
        area: shopArea,
        isFeatured: s.isFeatured ?? false,
        inspectionFee: s.inspectionFee,
        baseLaborFee: s.baseLaborFee,
        pickupFee: s.pickupFee,
        expressFee: s.expressFee,
      },
      create: {
        vendorApplicationId: vendorApp.id,
        name,
        slug,
        description: s.description ?? "Professional electronics repair service.",
        address: s.address ?? `${10 + i + 1} Main Road`,
        city: "Dhaka",
        area: shopArea,
        lat: shopLat,
        lng: shopLng,
        ratingAvg: Number((3.5 + Math.random() * 1.5).toFixed(1)),
        reviewCount: Math.floor(Math.random() * 200),
        priceLevel: s.priceLevel ?? (Math.floor(Math.random() * 3) + 1),
        hasVoucher: s.hasVoucher ?? ((i + 1) % 2 === 0),
        freeDelivery: s.freeDelivery ?? ((i + 1) % 4 === 0),
        hasDeals: s.hasDeals ?? ((i + 1) % 5 === 0),
        isFeatured: s.isFeatured ?? false,
        inspectionFee: s.inspectionFee ?? ([100, 150, 200][Math.floor(Math.random() * 3)] + Math.floor(Math.random() * 3) * 50),
        baseLaborFee: s.baseLaborFee ?? (Math.floor(Math.random() * 6 + 3) * 100),
        pickupFee: s.pickupFee ?? (Math.floor(Math.random() * 3) * 50 + 50),
        expressFee: s.expressFee ?? (Math.floor(Math.random() * 4 + 2) * 100),
        setupComplete: true,
        isPublic: true,
        categories: [
          ShopCategory.COURIER_PICKUP,
          ShopCategory.IN_SHOP_REPAIR,
        ],
        specialties: s.specialties ?? randomSubset(specialtiesPool, 3),
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

  // ── PENDING VENDOR APPLICATIONS (for admin approval demo) ──
  console.log("  Creating pending vendor applications...");
  const pendingApplicants = [
    { name: "Sakib Al Hasan", email: "sakib.tech@gmail.com", phone: "+8801712345001", shopName: "Sakib's Phone Clinic", address: "House 15, Road 3, Mirpur 10", city: "Dhaka", area: "Mirpur", specialties: ["Phone screen repair", "Battery replacement", "Charging port fix"] },
    { name: "Nusrat Jahan", email: "nusrat.electronics@gmail.com", phone: "+8801812345002", shopName: "NJ Electronics Hub", address: "45 Elephant Road", city: "Dhaka", area: "New Market", specialties: ["Laptop motherboard repair", "SSD upgrade", "RAM replacement"] },
    { name: "Tanvir Rahman", email: "tanvir.fixlab@gmail.com", phone: "+8801912345003", shopName: "FixLab Bangladesh", address: "Block C, Bashundhara R/A", city: "Dhaka", area: "Bashundhara", specialties: ["MacBook repair", "iPad screen replacement", "Apple device specialist"] },
    { name: "Ayesha Siddiqua", email: "ayesha.repair@gmail.com", phone: "+8801612345004", shopName: "Ayesha Smart Repair", address: "22 Shantinagar", city: "Dhaka", area: "Shantinagar", specialties: ["Water damage recovery", "Micro soldering", "Data recovery"] },
    { name: "Imran Hossain", email: "imran.gadgetcare@gmail.com", phone: "+8801512345005", shopName: "Gadget Care Center", address: "Sector 7, Uttara", city: "Dhaka", area: "Uttara", specialties: ["Gaming console repair", "Desktop assembly", "Printer service"] },
  ];

  for (const applicant of pendingApplicants) {
    const appUser = await prisma.user.upsert({
      where: { email: applicant.email },
      update: {},
      create: {
        username: applicant.email.split("@")[0].replace(/\./g, "_"),
        email: applicant.email,
        passwordHash,
        name: applicant.name,
        phone: applicant.phone,
        role: "VENDOR_APPLICANT",
        status: "SUSPENDED",
        isEmailVerified: true,
        isPhoneVerified: false,
      },
    });

    const vendorApp = await prisma.vendorApplication.upsert({
      where: { businessEmail: applicant.email },
      update: {},
      create: {
        userId: appUser.id,
        ownerName: applicant.name,
        businessEmail: applicant.email,
        phone: applicant.phone,
        shopName: applicant.shopName,
        address: applicant.address,
        city: applicant.city,
        area: applicant.area,
        specialties: applicant.specialties,
        courierPickup: true,
        inShopRepair: true,
        spareParts: false,
        status: "PENDING",
      },
    });

    // Create shop stub (matches new application flow)
    const appSlug = applicant.shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const appShop = await prisma.shop.upsert({
      where: { slug: appSlug },
      update: {},
      create: {
        vendorApplicationId: vendorApp.id,
        name: applicant.shopName,
        slug: appSlug,
        address: applicant.address,
        city: applicant.city,
        area: applicant.area,
        phone: applicant.phone,
        email: applicant.email,
        categories: [ShopCategory.COURIER_PICKUP, ShopCategory.IN_SHOP_REPAIR],
        specialties: applicant.specialties,
        isActive: false,
        isPublic: false,
        setupComplete: false,
      },
    });

    await prisma.shopStaff.upsert({
      where: { shopId_userId: { shopId: appShop.id, userId: appUser.id } },
      update: {},
      create: { shopId: appShop.id, userId: appUser.id, role: "OWNER", isActive: true },
    });
  }
  console.log(`  ✓ ${pendingApplicants.length} pending vendor applications created.`);

  // ── DELIVERY RIDER REGISTRATIONS (with coordinates) ──
  console.log("  Creating delivery rider registrations...");
  const riderData = [
    { name: "Jubayer Ahmed", email: "jubayer.rider@gmail.com", phone: "+8801712346001", vehicle: "Motorbike", area: "Mirpur", lat: 23.8042, lng: 90.3688, status: "PENDING" as const },
    { name: "Morshed Alam", email: "morshed.rider@gmail.com", phone: "+8801812346002", vehicle: "Bicycle", area: "Dhanmondi", lat: 23.7461, lng: 90.3742, status: "PENDING" as const },
    { name: "Rifat Hasan", email: "rifat.rider@gmail.com", phone: "+8801912346003", vehicle: "Motorbike", area: "Gulshan", lat: 23.7925, lng: 90.4078, status: "APPROVED" as const },
    { name: "Sumaiya Akter", email: "sumaiya.rider@gmail.com", phone: "+8801612346004", vehicle: "Bicycle", area: "Uttara", lat: 23.8759, lng: 90.3795, status: "APPROVED" as const },
    { name: "Arman Khan", email: "arman.rider@gmail.com", phone: "+8801712346005", vehicle: "Motorbike", area: "Banani", lat: 23.7940, lng: 90.4023, status: "APPROVED" as const },
    { name: "Fahim Chowdhury", email: "fahim.rider@gmail.com", phone: "+8801812346006", vehicle: "Motorbike", area: "Tejgaon", lat: 23.7594, lng: 90.3988, status: "PENDING" as const },
  ];

  for (const rider of riderData) {
    const areaCoord = areaCoords.find(a => a.name === rider.area);
    const riderLat = rider.lat ?? areaCoord?.lat ?? 23.7806;
    const riderLng = rider.lng ?? areaCoord?.lng ?? 90.4078;

    const riderUser = await prisma.user.upsert({
      where: { email: rider.email },
      update: {},
      create: {
        username: rider.email.split("@")[0].replace(/\./g, "_"),
        email: rider.email,
        passwordHash,
        name: rider.name,
        phone: rider.phone,
        role: "DELIVERY",
        status: "ACTIVE",
        area: rider.area,
        city: "Dhaka",
        lat: riderLat,
        lng: riderLng,
        isEmailVerified: true,
        isPhoneVerified: true,
      },
    });

    await prisma.riderProfile.upsert({
      where: { userId: riderUser.id },
      update: {},
      create: {
        userId: riderUser.id,
        vehicleType: rider.vehicle,
        status: rider.status === "APPROVED" ? "AVAILABLE" : "OFFLINE",
        isActive: rider.status === "APPROVED",
        registrationStatus: rider.status,
        currentLat: riderLat + (Math.random() - 0.5) * 0.005,
        currentLng: riderLng + (Math.random() - 0.5) * 0.005,
      },
    });
  }
  console.log(`  ✓ ${riderData.length} delivery rider registrations created.`);

  // ── ADDITIONAL SUPPORT TICKETS (diverse statuses) ──
  console.log("  Creating support tickets...");
  const ticketData = [
    { subject: "Payment stuck in processing", message: "I paid via SSLCommerz but the order still shows pending after 2 hours.", priority: "HIGH", status: "OPEN" as const },
    { subject: "Wrong device returned", message: "I received a different phone back from the shop. My iPhone 14 was swapped with an iPhone 13.", priority: "HIGH", status: "ESCALATED" as const },
    { subject: "Shop not responding to messages", message: "I've been trying to reach the shop for 3 days about my repair status with no response.", priority: "MEDIUM", status: "OPEN" as const },
  ];

  for (const ticket of ticketData) {
    await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: ticket.subject,
        message: ticket.message,
        priority: ticket.priority,
        status: ticket.status,
      },
    });
  }
  console.log(`  ✓ ${ticketData.length} support tickets created.`);

  // ── REPAIR REQUEST SEEDS ──────────────────────────────────────────
  // Covers: DIRECT (PENDING), MARKETPLACE (BIDDING), and lifecycle stages
  console.log("  Creating repair request seeds...");

  // ── 1. COMPLETED request (demo customer → shop 0) ──
  const completedRequest = await prisma.repairRequest.create({
    data: {
      userId: user.id,
      source: "DIRECT_SERVICE",
      requestedShopId: shops[0].id,
      title: "MacBook Air M2 Battery Replacement",
      deviceType: "Laptop",
      brand: "Apple",
      model: "MacBook Air M2",
      problem: "Battery drains too quickly, only lasts 2 hours",
      issueCategory: "Battery",
      imageUrls: [],
      mode: RequestMode.CHECKUP_AND_REPAIR,
      status: RequestStatus.COMPLETED,
      preferredPickup: true,
      quotedFinalAmount: 12500,
      approvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.repairJob.create({
    data: {
      repairRequestId: completedRequest.id,
      shopId: shops[0].id,
      status: RepairJobStatus.COMPLETED,
      diagnosisNotes: "Battery replaced with genuine Apple cell. Full health restored.",
      finalQuotedAmount: 12500,
      customerApproved: true,
      startedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  // ── 2. REPAIRING request (demo customer → shop 1) ──
  const repairingRequest = await prisma.repairRequest.create({
    data: {
      userId: user.id,
      source: "DIRECT_CUSTOM_SHOP",
      requestedShopId: shops[1].id,
      title: "ThinkPad T14 Keyboard Fix",
      deviceType: "Laptop",
      brand: "Lenovo",
      model: "ThinkPad T14",
      problem: "Several keys are unresponsive after coffee spill",
      issueCategory: "Keyboard",
      imageUrls: [],
      mode: RequestMode.DIRECT_REPAIR,
      status: RequestStatus.REPAIRING,
      preferredPickup: false,
      quotedFinalAmount: 4500,
      approvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.repairJob.create({
    data: {
      repairRequestId: repairingRequest.id,
      shopId: shops[1].id,
      status: RepairJobStatus.REPAIRING,
      diagnosisNotes: "Keyboard assembly needs full replacement. Parts ordered.",
      finalQuotedAmount: 4500,
      customerApproved: true,
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // ── 3–5. PENDING DIRECT requests (waiting for shop approval) ──
  const pendingDirectRequests = [
    {
      title: "Samsung Galaxy S24 Screen Crack",
      deviceType: "Phone", brand: "Samsung", model: "Galaxy S24",
      problem: "Screen cracked from a drop, touch still works but glass is shattered",
      issueCategory: "Screen", mode: RequestMode.DIRECT_REPAIR,
      shopIdx: 2, source: "DIRECT_SERVICE" as const,
    },
    {
      title: "iPad Pro 12.9 Charging Port",
      deviceType: "Tablet", brand: "Apple", model: "iPad Pro 12.9",
      problem: "Charging port is loose, cable doesn't stay connected properly",
      issueCategory: "Charging Port", mode: RequestMode.CHECKUP_AND_REPAIR,
      shopIdx: 5, source: "DIRECT_SERVICE" as const,
    },
    {
      title: "Dell XPS 15 Fan Noise",
      deviceType: "Laptop", brand: "Dell", model: "XPS 15 9520",
      problem: "Fan makes loud grinding noise under any load, overheating issues",
      issueCategory: "Overheating", mode: RequestMode.CHECKUP_ONLY,
      shopIdx: 8, source: "DIRECT_CUSTOM_SHOP" as const,
    },
  ];

  for (const req of pendingDirectRequests) {
    await prisma.repairRequest.create({
      data: {
        userId: user.id,
        source: req.source,
        requestedShopId: shops[req.shopIdx].id,
        title: req.title,
        deviceType: req.deviceType,
        brand: req.brand,
        model: req.model,
        problem: req.problem,
        issueCategory: req.issueCategory,
        imageUrls: [],
        mode: req.mode,
        status: RequestStatus.PENDING,
        preferredPickup: true,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 3) * 60 * 60 * 1000),
      },
    });
  }
  console.log(`  ✓ ${pendingDirectRequests.length} PENDING (direct) repair requests created.`);

  // ── 6–9. BIDDING MARKETPLACE requests (open for vendor bids) ──
  const biddingRequests = [
    {
      title: "iPhone 15 Pro Water Damage Recovery",
      deviceType: "Phone", brand: "Apple", model: "iPhone 15 Pro",
      problem: "Phone fell in water, screen flickers and speaker is muffled",
      issueCategory: "Water Damage", mode: RequestMode.CHECKUP_AND_REPAIR,
      bidShops: [0, 3, 7, 12],  // indices into shops[] — 4 vendors bid
    },
    {
      title: "ASUS ROG Laptop Motherboard Issue",
      deviceType: "Laptop", brand: "ASUS", model: "ROG Strix G15",
      problem: "Laptop won't power on after a power surge, no LED indicators",
      issueCategory: "Motherboard", mode: RequestMode.CHECKUP_AND_REPAIR,
      bidShops: [1, 4, 9],  // 3 vendors bid
    },
    {
      title: "Google Pixel 8 Battery Swelling",
      deviceType: "Phone", brand: "Google", model: "Pixel 8",
      problem: "Battery is visibly swollen, back panel is lifting, phone gets hot",
      issueCategory: "Battery", mode: RequestMode.DIRECT_REPAIR,
      bidShops: [2, 6, 10, 15, 20],  // 5 vendors bid
    },
    {
      title: "HP Pavilion Display Flickering",
      deviceType: "Laptop", brand: "HP", model: "Pavilion 15",
      problem: "Display flickers randomly, sometimes goes black for a few seconds",
      issueCategory: "Display", mode: RequestMode.CHECKUP_AND_REPAIR,
      bidShops: [5, 11],  // 2 vendors bid
    },
  ];

  for (const req of biddingRequests) {
    const request = await prisma.repairRequest.create({
      data: {
        userId: user.id,
        source: "MARKETPLACE",
        title: req.title,
        deviceType: req.deviceType,
        brand: req.brand,
        model: req.model,
        problem: req.problem,
        issueCategory: req.issueCategory,
        imageUrls: [],
        mode: req.mode,
        status: RequestStatus.BIDDING,
        preferredPickup: true,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 48) * 60 * 60 * 1000),
      },
    });

    // Create bids from the specified shops
    for (const shopIdx of req.bidShops) {
      if (shopIdx >= shops.length) continue;
      const baseCost = Math.floor(Math.random() * 4000) + 1500;
      const laborCost = Math.floor(Math.random() * 2000) + 500;
      await prisma.bid.create({
        data: {
          repairRequestId: request.id,
          shopId: shops[shopIdx].id,
          partsCost: baseCost,
          laborCost: laborCost,
          totalCost: baseCost + laborCost,
          estimatedDays: Math.floor(Math.random() * 5) + 2,
          notes: randomFrom([
            "We have this part in stock, can start immediately.",
            "Experienced with this model. Quick turnaround guaranteed.",
            "Genuine parts only. 6-month warranty included.",
            "We'll diagnose for free first, then provide final quote.",
            "Same-day service available for this repair type.",
          ]),
          status: "ACTIVE",
        },
      });
    }
  }
  console.log(`  ✓ ${biddingRequests.length} BIDDING (marketplace) repair requests with bids created.`);

  // ── 10–11. ASSIGNED requests (bid accepted, job created, in progress) ──
  const assignedRequest = await prisma.repairRequest.create({
    data: {
      userId: user.id,
      source: "MARKETPLACE",
      title: "OnePlus 12 Back Glass Replacement",
      deviceType: "Phone", brand: "OnePlus", model: "OnePlus 12",
      problem: "Back glass cracked, camera module is fine but glass is shattered",
      issueCategory: "Back Panel",
      imageUrls: [],
      mode: RequestMode.DIRECT_REPAIR,
      status: RequestStatus.ASSIGNED,
      preferredPickup: true,
      quotedFinalAmount: 3200,
      approvedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
  });
  const assignedBid = await prisma.bid.create({
    data: {
      repairRequestId: assignedRequest.id,
      shopId: shops[3].id,
      partsCost: 2200, laborCost: 1000, totalCost: 3200,
      estimatedDays: 3,
      notes: "We have OnePlus genuine back panels in stock.",
      status: "ACCEPTED",
    },
  });
  await prisma.repairJob.create({
    data: {
      repairRequestId: assignedRequest.id,
      shopId: shops[3].id,
      acceptedBidId: assignedBid.id,
      status: RepairJobStatus.CREATED,
      finalQuotedAmount: 3200,
      customerApproved: true,
    },
  });

  // DIAGNOSING stage
  const diagnosingRequest = await prisma.repairRequest.create({
    data: {
      userId: user.id,
      source: "DIRECT_SERVICE",
      requestedShopId: shops[6].id,
      title: "MacBook Pro 14 Trackpad Unresponsive",
      deviceType: "Laptop", brand: "Apple", model: "MacBook Pro 14",
      problem: "Trackpad stopped clicking, force touch not working at all",
      issueCategory: "Trackpad",
      imageUrls: [],
      mode: RequestMode.CHECKUP_AND_REPAIR,
      status: RequestStatus.DIAGNOSING,
      preferredPickup: false,
      approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.repairJob.create({
    data: {
      repairRequestId: diagnosingRequest.id,
      shopId: shops[6].id,
      status: RepairJobStatus.DIAGNOSING,
      diagnosisNotes: "Inspecting trackpad flex cable and haptic engine...",
      startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
  });

  console.log("  ✓ ASSIGNED + DIAGNOSING repair requests created.");

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