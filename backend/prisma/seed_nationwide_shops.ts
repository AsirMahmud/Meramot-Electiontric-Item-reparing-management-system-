/**
 * seed_nationwide_shops.ts
 * Adds 100 additional approved vendor shops spread across all 8 divisions of Bangladesh.
 * Each shop gets 15-40 reviews with full repair request → job → payment → ledger pipeline.
 * Keeps existing 36 shops untouched — uses vendor indices 100–199 to avoid collisions.
 *
 * Run standalone:  npx tsx prisma/seed_nationwide_shops.ts
 * Or via master-seed.ts
 */

import {
  PrismaClient,
  RequestMode,
  RequestStatus,
  RepairJobStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// ── Bangladesh-wide locations: all 8 divisions ──
const locations: { city: string; area: string; lat: number; lng: number }[] = [
  // ── Dhaka Division (expanded) ──
  { city: "Dhaka", area: "Motijheel", lat: 23.7260, lng: 90.4198 },
  { city: "Dhaka", area: "Shahbag", lat: 23.7381, lng: 90.3952 },
  { city: "Dhaka", area: "Lalbagh", lat: 23.7192, lng: 90.3882 },
  { city: "Dhaka", area: "Jatrabari", lat: 23.7104, lng: 90.4345 },
  { city: "Dhaka", area: "Khilgaon", lat: 23.7522, lng: 90.4345 },
  { city: "Dhaka", area: "Shyamoli", lat: 23.7720, lng: 90.3650 },
  { city: "Dhaka", area: "Agargaon", lat: 23.7780, lng: 90.3801 },
  { city: "Dhaka", area: "Pallabi", lat: 23.8274, lng: 90.3636 },
  { city: "Dhaka", area: "Cantonment", lat: 23.8133, lng: 90.4031 },
  { city: "Dhaka", area: "Demra", lat: 23.7083, lng: 90.4958 },
  { city: "Narayanganj", area: "Narayanganj Sadar", lat: 23.6238, lng: 90.4968 },
  { city: "Narayanganj", area: "Siddhirganj", lat: 23.6872, lng: 90.4675 },
  { city: "Gazipur", area: "Tongi", lat: 23.8913, lng: 90.4056 },
  { city: "Gazipur", area: "Gazipur Sadar", lat: 23.9999, lng: 90.4203 },
  { city: "Manikganj", area: "Manikganj Sadar", lat: 23.8644, lng: 89.9112 },
  { city: "Munshiganj", area: "Munshiganj Sadar", lat: 23.5422, lng: 90.5305 },
  { city: "Tangail", area: "Tangail Sadar", lat: 24.2513, lng: 89.9163 },
  { city: "Savar", area: "Savar", lat: 23.8583, lng: 90.2567 },
  { city: "Keraniganj", area: "Keraniganj", lat: 23.6993, lng: 90.3432 },
  { city: "Narsingdi", area: "Narsingdi Sadar", lat: 23.9322, lng: 90.7143 },

  // ── Chittagong Division ──
  { city: "Chittagong", area: "Agrabad", lat: 22.3219, lng: 91.8110 },
  { city: "Chittagong", area: "GEC Circle", lat: 22.3559, lng: 91.8322 },
  { city: "Chittagong", area: "Nasirabad", lat: 22.3641, lng: 91.8234 },
  { city: "Chittagong", area: "Halishahar", lat: 22.3393, lng: 91.7901 },
  { city: "Chittagong", area: "Chawkbazar", lat: 22.3458, lng: 91.8382 },
  { city: "Chittagong", area: "Panchlaish", lat: 22.3604, lng: 91.8167 },
  { city: "Chittagong", area: "Bayezid", lat: 22.3772, lng: 91.8400 },
  { city: "Chittagong", area: "Pahartali", lat: 22.3552, lng: 91.7669 },
  { city: "Cox's Bazar", area: "Cox's Bazar Sadar", lat: 21.4272, lng: 92.0058 },
  { city: "Comilla", area: "Comilla Sadar", lat: 23.4607, lng: 91.1809 },
  { city: "Comilla", area: "Comilla Adarsha Sadar", lat: 23.4720, lng: 91.1640 },
  { city: "Noakhali", area: "Noakhali Sadar", lat: 22.8696, lng: 91.0995 },
  { city: "Feni", area: "Feni Sadar", lat: 23.0159, lng: 91.3976 },
  { city: "Brahmanbaria", area: "Brahmanbaria Sadar", lat: 23.9608, lng: 91.1115 },
  { city: "Chandpur", area: "Chandpur Sadar", lat: 23.2333, lng: 90.6712 },

  // ── Sylhet Division ──
  { city: "Sylhet", area: "Zindabazar", lat: 24.8949, lng: 91.8687 },
  { city: "Sylhet", area: "Amberkhana", lat: 24.9020, lng: 91.8695 },
  { city: "Sylhet", area: "Subid Bazar", lat: 24.8965, lng: 91.8707 },
  { city: "Sylhet", area: "Kumarpara", lat: 24.9083, lng: 91.8590 },
  { city: "Sylhet", area: "Shibganj", lat: 24.8876, lng: 91.8800 },
  { city: "Habiganj", area: "Habiganj Sadar", lat: 24.3744, lng: 91.4155 },
  { city: "Moulvibazar", area: "Moulvibazar Sadar", lat: 24.4831, lng: 91.7775 },
  { city: "Sunamganj", area: "Sunamganj Sadar", lat: 25.0658, lng: 91.3950 },

  // ── Rajshahi Division ──
  { city: "Rajshahi", area: "Shaheb Bazar", lat: 24.3745, lng: 88.6042 },
  { city: "Rajshahi", area: "Laxmipur", lat: 24.3686, lng: 88.6158 },
  { city: "Rajshahi", area: "New Market", lat: 24.3636, lng: 88.6247 },
  { city: "Rajshahi", area: "Upashahar", lat: 24.3810, lng: 88.6300 },
  { city: "Bogra", area: "Bogra Sadar", lat: 24.8465, lng: 89.3729 },
  { city: "Pabna", area: "Pabna Sadar", lat: 24.0064, lng: 89.2372 },
  { city: "Natore", area: "Natore Sadar", lat: 24.4206, lng: 88.9930 },
  { city: "Naogaon", area: "Naogaon Sadar", lat: 24.7936, lng: 88.9425 },

  // ── Khulna Division ──
  { city: "Khulna", area: "Boyra", lat: 22.8456, lng: 89.5403 },
  { city: "Khulna", area: "Sonadanga", lat: 22.8208, lng: 89.5549 },
  { city: "Khulna", area: "Khalishpur", lat: 22.8335, lng: 89.5250 },
  { city: "Khulna", area: "Daulatpur", lat: 22.8556, lng: 89.5064 },
  { city: "Jessore", area: "Jessore Sadar", lat: 23.1634, lng: 89.2022 },
  { city: "Kushtia", area: "Kushtia Sadar", lat: 23.9013, lng: 89.1204 },
  { city: "Satkhira", area: "Satkhira Sadar", lat: 22.7185, lng: 89.0705 },
  { city: "Bagerhat", area: "Bagerhat Sadar", lat: 22.6602, lng: 89.7895 },

  // ── Barishal Division ──
  { city: "Barishal", area: "Nathullabad", lat: 22.7010, lng: 90.3535 },
  { city: "Barishal", area: "Sadar Road", lat: 22.7055, lng: 90.3665 },
  { city: "Patuakhali", area: "Patuakhali Sadar", lat: 22.3596, lng: 90.3295 },
  { city: "Bhola", area: "Bhola Sadar", lat: 22.6859, lng: 90.6482 },
  { city: "Pirojpur", area: "Pirojpur Sadar", lat: 22.5791, lng: 89.9759 },

  // ── Rangpur Division ──
  { city: "Rangpur", area: "Jahaj Company", lat: 25.7439, lng: 89.2752 },
  { city: "Rangpur", area: "Modern", lat: 25.7560, lng: 89.2448 },
  { city: "Dinajpur", area: "Dinajpur Sadar", lat: 25.6217, lng: 88.6354 },
  { city: "Thakurgaon", area: "Thakurgaon Sadar", lat: 26.0418, lng: 88.4283 },
  { city: "Panchagarh", area: "Panchagarh Sadar", lat: 26.3411, lng: 88.5542 },
  { city: "Nilphamari", area: "Nilphamari Sadar", lat: 25.9316, lng: 88.8560 },
  { city: "Kurigram", area: "Kurigram Sadar", lat: 25.8054, lng: 89.6362 },
  { city: "Lalmonirhat", area: "Lalmonirhat Sadar", lat: 25.9923, lng: 89.4447 },
  { city: "Gaibandha", area: "Gaibandha Sadar", lat: 25.3288, lng: 89.5283 },

  // ── Mymensingh Division ──
  { city: "Mymensingh", area: "Mymensingh Sadar", lat: 24.7471, lng: 90.4203 },
  { city: "Mymensingh", area: "Ganginar Par", lat: 24.7536, lng: 90.4077 },
  { city: "Jamalpur", area: "Jamalpur Sadar", lat: 24.9375, lng: 89.9372 },
  { city: "Netrokona", area: "Netrokona Sadar", lat: 24.8703, lng: 90.7278 },
  { city: "Sherpur", area: "Sherpur Sadar", lat: 25.0204, lng: 90.0137 },
  { city: "Kishoreganj", area: "Kishoreganj Sadar", lat: 24.4449, lng: 90.7766 },
];

// ── Shop name parts ──
const prefixes = [
  "TechCare", "SmartFix", "RapidRepair", "ProDevice", "ElectroFix",
  "GadgetPro", "DigitalCare", "MicroTech", "CircuitHub", "PowerFix",
  "DeviceDoc", "QuickTech", "NanoRepair", "ByteFix", "PixelCare",
  "LogicBoard", "VoltFix", "ChipMaster", "ScreenPro", "DataSave",
];

const suffixes = [
  "Solutions", "Hub", "Station", "Center", "Lab",
  "Workshop", "Clinic", "Zone", "Point", "Express",
];

const specialtiesPool = [
  "Laptop Repair", "Phone Screen Replacement", "Battery Replacement",
  "Motherboard Repair", "Keyboard Repair", "Charging Port Fix",
  "Water Damage Recovery", "SSD Upgrade", "RAM Upgrade",
  "Display Repair", "Tablet Repair", "Smartwatch Repair",
  "Desktop Assembly", "Printer Repair", "Console Repair",
  "Data Recovery", "Virus Removal", "Network Setup",
  "CCTV Installation", "UPS Repair",
];

const reviewTexts = [
  "Great service! My laptop was fixed within 24 hours.",
  "Very professional team. Would definitely come back.",
  "Fair pricing and honest diagnosis. Recommended!",
  "Fixed my phone screen perfectly. Like new!",
  "Good communication throughout the repair process.",
  "The technician explained everything clearly.",
  "Quick turnaround and quality parts used.",
  "Excellent warranty support after the repair.",
  "Picked up and delivered on time. Very convenient.",
  "A bit pricey but the quality is worth it.",
  "Fast diagnosis and transparent pricing.",
  "My go-to repair shop in the area.",
  "Saved my water-damaged laptop. Amazing work!",
  "Professional setup and clean workshop.",
  "Best repair experience I've had so far.",
  null, null, null, null, null, // ~25% have no review text
];

const repairTitles = [
  "Screen Repair", "Battery Replacement", "Keyboard Fix",
  "Charging Port", "General Checkup", "Motherboard Repair",
  "Water Damage Recovery", "SSD Upgrade", "RAM Upgrade",
  "Display Replacement", "Trackpad Fix", "Speaker Repair",
  "Camera Fix", "Data Recovery", "Virus Removal",
];

const deviceTypes = ["Laptop", "Phone", "Tablet", "Desktop", "Smartwatch"];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset<T>(arr: T[], count: number): T[] {
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
}

async function main() {
  console.log("🏪 Seeding 100 nationwide shops across Bangladesh...\n");

  const passwordHash = await bcrypt.hash("password123", 10);
  const usedNames = new Set<string>();

  // Fetch existing users to use as reviewers
  let reviewerUsers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true },
    take: 500,
  });

  // If not enough customers, use all non-admin users
  if (reviewerUsers.length < 50) {
    reviewerUsers = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: { id: true },
      take: 500,
    });
  }

  console.log(`  Using ${reviewerUsers.length} existing users as reviewers\n`);

  // Track shop IDs for bulk review generation
  const newShopIds: string[] = [];
  let created = 0;

  // ── PHASE 1: Create all 100 shops ──
  for (let i = 0; i < 100; i++) {
    const loc = locations[i % locations.length];

    let shopName: string;
    do {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      shopName = `${prefix} ${suffix} ${loc.area}`;
    } while (usedNames.has(shopName));
    usedNames.add(shopName);

    const slug = slugify(shopName);
    const vendorEmail = `vendor_national_${i}@meramot.demo`;

    const shopLat = Number((loc.lat + (Math.random() - 0.5) * 0.008).toFixed(6));
    const shopLng = Number((loc.lng + (Math.random() - 0.5) * 0.008).toFixed(6));
    const priceLevel = Math.floor(Math.random() * 3) + 1;
    const specialties = randomSubset(specialtiesPool, 3 + Math.floor(Math.random() * 3));

    const inspectionFee = [100, 200, 400][priceLevel - 1] + Math.floor(Math.random() * 100);
    const baseLaborFee = [300, 500, 800][priceLevel - 1] + Math.floor(Math.random() * 200);
    const pickupFee = priceLevel === 1 ? 50 : priceLevel === 2 ? 100 : 150;
    const expressFee = [200, 350, 500][priceLevel - 1];

    try {
      const shopUser = await prisma.user.upsert({
        where: { email: vendorEmail },
        update: { role: "VENDOR" },
        create: {
          username: `vendor_${slug.slice(0, 30)}`,
          email: vendorEmail,
          passwordHash,
          name: `${shopName} Owner`,
          phone: `+8801${(9000000 + i).toString()}`,
          role: "VENDOR",
        },
      });

      const vendorApp = await prisma.vendorApplication.upsert({
        where: { businessEmail: vendorEmail },
        update: { status: "APPROVED", reviewedAt: new Date() },
        create: {
          userId: shopUser.id,
          ownerName: `${shopName} Owner`,
          businessEmail: vendorEmail,
          phone: shopUser.phone!,
          shopName,
          address: `${Math.floor(Math.random() * 200) + 1} Main Road, ${loc.area}`,
          city: loc.city,
          area: loc.area,
          lat: shopLat,
          lng: shopLng,
          specialties,
          courierPickup: true,
          inShopRepair: true,
          spareParts: Math.random() > 0.5,
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
          area: loc.area,
          city: loc.city,
          isPublic: true,
          isActive: true,
          isFeatured: i < 12,
          inspectionFee,
          baseLaborFee,
          pickupFee,
          expressFee,
        },
        create: {
          vendorApplicationId: vendorApp.id,
          name: shopName,
          slug,
          description: `Professional electronics repair service in ${loc.area}, ${loc.city}. Certified technicians with warranty on all repairs.`,
          address: `${Math.floor(Math.random() * 200) + 1} Main Road, ${loc.area}`,
          city: loc.city,
          area: loc.area,
          lat: shopLat,
          lng: shopLng,
          ratingAvg: 0,
          reviewCount: 0,
          priceLevel,
          hasVoucher: Math.random() > 0.6,
          freeDelivery: Math.random() > 0.75,
          hasDeals: Math.random() > 0.7,
          isFeatured: i < 12,
          inspectionFee,
          baseLaborFee,
          pickupFee,
          expressFee,
          setupComplete: true,
          isPublic: true,
          isActive: true,
          categories: ["IN_SHOP_REPAIR", "COURIER_PICKUP"],
          specialties,
        },
      });

      await prisma.shopStaff.upsert({
        where: { shopId_userId: { shopId: shop.id, userId: shopUser.id } },
        update: {},
        create: { shopId: shop.id, userId: shopUser.id, role: "OWNER", isActive: true },
      });

      newShopIds.push(shop.id);
      created++;
      if (created % 20 === 0) {
        console.log(`  ✓ ${created}/100 shops created (latest: ${shopName} — ${loc.city})`);
      }
    } catch (err: any) {
      console.warn(`  ⚠ Skipped ${shopName}: ${err.message?.slice(0, 80)}`);
    }
  }
  console.log(`\n✅ ${created} shops created. Now generating reviews & transactions...\n`);

  // ── PHASE 2: Generate reviews + transactions for all new shops ──
  // Batch arrays for bulk insert
  const ratingData: any[] = [];
  const requestData: any[] = [];
  const jobData: any[] = [];
  const paymentData: any[] = [];
  const ledgerData: any[] = [];
  const escrowData: any[] = [];
  const usedPairs = new Set<string>();

  for (const shopId of newShopIds) {
    // Each shop gets 15-40 reviews
    const reviewCount = 15 + Math.floor(Math.random() * 26);
    const selectedUsers = randomSubset(reviewerUsers, reviewCount);

    for (const user of selectedUsers) {
      const pairKey = `${user.id}::${shopId}`;
      if (usedPairs.has(pairKey)) continue;
      usedPairs.add(pairKey);

      // Star distribution: avg ~4.0
      const r = Math.random();
      let score: number;
      if      (r < 0.08) score = 1;
      else if (r < 0.20) score = 2;
      else if (r < 0.40) score = 3;
      else if (r < 0.65) score = 4;
      else               score = 5;

      const reviewDate = new Date(Date.now() - Math.floor(Math.random() * 120) * 24 * 60 * 60 * 1000);
      const requestDate = new Date(reviewDate.getTime() - 14 * 24 * 60 * 60 * 1000);
      const jobStartDate = new Date(reviewDate.getTime() - 10 * 24 * 60 * 60 * 1000);
      const jobCompleteDate = new Date(reviewDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      const paymentDate = new Date(reviewDate.getTime() - 2 * 24 * 60 * 60 * 1000);

      const amount = Math.floor(Math.random() * 7200) + 800;

      const requestId = crypto.randomUUID();
      requestData.push({
        id: requestId,
        userId: user.id,
        title: randomFrom(repairTitles),
        deviceType: randomFrom(deviceTypes),
        problem: "Device issue requiring professional repair",
        mode: RequestMode.DIRECT_REPAIR,
        status: RequestStatus.COMPLETED,
        quotedFinalAmount: amount,
        createdAt: requestDate,
      });

      const jobId = crypto.randomUUID();
      jobData.push({
        id: jobId,
        repairRequestId: requestId,
        shopId,
        status: RepairJobStatus.COMPLETED,
        customerApproved: true,
        finalQuotedAmount: amount,
        startedAt: jobStartDate,
        completedAt: jobCompleteDate,
        createdAt: requestDate,
      });

      const paymentId = crypto.randomUUID();
      const transactionRef = `MMT-NAT-${paymentId.slice(0, 8).toUpperCase()}`;
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

      ledgerData.push({
        id: crypto.randomUUID(),
        paymentId,
        amount,
        type: "CUSTOMER_PAYMENT",
        direction: "CREDIT",
        description: "Customer payment for repair job",
        createdAt: paymentDate,
      });

      escrowData.push({
        id: crypto.randomUUID(),
        paymentId,
        repairRequestId: requestId,
        customerUserId: user.id,
        shopId,
        amount,
        grossAmount: amount,
        action: "PAYMENT_HELD",
        note: "Payment held in escrow after successful transaction",
        createdAt: paymentDate,
      });

      ratingData.push({
        userId: user.id,
        shopId,
        score,
        review: randomFrom(reviewTexts),
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
  console.log(`  Inserting ${escrowData.length} escrow entries...`);
  await prisma.escrowLedger.createMany({ data: escrowData, skipDuplicates: true });
  console.log(`  Inserting ${ratingData.length} ratings...`);
  await prisma.rating.createMany({ data: ratingData, skipDuplicates: true });

  // ── PHASE 3: Sync rating aggregates for new shops ──
  console.log(`\n  Syncing rating aggregates for ${newShopIds.length} new shops...`);
  for (const shopId of newShopIds) {
    const aggregate = await prisma.rating.aggregate({
      where: { shopId, isHidden: false },
      _avg: { score: true },
      _count: { score: true },
    });

    await prisma.shop.update({
      where: { id: shopId },
      data: {
        ratingAvg: Number((aggregate._avg.score ?? 0).toFixed(1)),
        reviewCount: aggregate._count.score,
      },
    });
  }

  // Final stats
  const totalShops = await prisma.shop.count();
  const totalVendors = await prisma.user.count({ where: { role: "VENDOR" } });
  const publicShops = await prisma.shop.count({ where: { isPublic: true, isActive: true } });
  const totalRatings = await prisma.rating.count();
  const totalPayments = await prisma.payment.count();

  console.log(`\n${"═".repeat(50)}`);
  console.log(`  ✅ NATIONWIDE SEED COMPLETE`);
  console.log(`${"═".repeat(50)}`);
  console.log(`  Shops:       ${totalShops} (${publicShops} public)`);
  console.log(`  Vendors:     ${totalVendors}`);
  console.log(`  Ratings:     ${totalRatings}`);
  console.log(`  Payments:    ${totalPayments}`);
  console.log(`${"═".repeat(50)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
