/**
 * Self-contained seed script for testing the live bidding system.
 *
 * Creates:
 *   • 3 test customers with 8 BIDDING repair requests
 *   • 2 fully approved vendors with shops, ready to place bids
 *
 * Run:  npx ts-node prisma/seed_bidding_test.ts
 *
 * All seeded users use password: password123
 */

import bcrypt from "bcryptjs";
import { PrismaClient, RequestMode, RequestStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔨 Seeding bidding test data...\n");

  const passwordHash = await bcrypt.hash("password123", 10);

  // ═══════════════════════════════════════════════════════════════════════
  // 1. CREATE FULLY APPROVED VENDORS WITH SHOPS
  // ═══════════════════════════════════════════════════════════════════════

  const vendorData = [
    {
      email: "testvendor1@meramot.demo",
      username: "testvendor1",
      name: "Arif Electronics",
      phone: "+8801855551111",
      shopName: "Arif Electronics Lab",
      shopSlug: "arif-electronics-lab",
      address: "22 Mirpur Road, Section 10",
      city: "Dhaka",
      area: "Mirpur",
      lat: 23.8060,
      lng: 90.3685,
      specialties: [
        "Battery replacement",
        "Display repair",
        "Charging port replacement",
        "Water damage recovery",
      ],
      inspectionFee: 300,
      baseLaborFee: 800,
      pickupFee: 150,
      expressFee: 400,
    },
    {
      email: "testvendor2@meramot.demo",
      username: "testvendor2",
      name: "Dhaka Laptop Clinic",
      phone: "+8801855552222",
      shopName: "Dhaka Laptop Clinic",
      shopSlug: "dhaka-laptop-clinic",
      address: "55 Dhanmondi R/A, Road 8",
      city: "Dhaka",
      area: "Dhanmondi",
      lat: 23.7470,
      lng: 90.3750,
      specialties: [
        "Motherboard repair",
        "Keyboard repair",
        "SSD upgrade",
        "Cooling",
        "Power supply",
      ],
      inspectionFee: 500,
      baseLaborFee: 800,
      pickupFee: 150,
      expressFee: 500,
    },
  ];

  const vendors: { userId: string; shopName: string }[] = [];

  for (const v of vendorData) {
    // Create vendor user
    const vendorUser = await prisma.user.upsert({
      where: { email: v.email },
      update: { role: "VENDOR" },
      create: {
        username: v.username,
        email: v.email,
        passwordHash,
        name: v.name,
        phone: v.phone,
        role: "VENDOR",
      },
    });

    // Create approved vendor application
    const vendorApp = await prisma.vendorApplication.upsert({
      where: { businessEmail: v.email },
      update: { status: "APPROVED" },
      create: {
        userId: vendorUser.id,
        ownerName: v.name,
        businessEmail: v.email,
        phone: v.phone,
        shopName: v.shopName,
        address: v.address,
        city: v.city,
        area: v.area,
        lat: v.lat,
        lng: v.lng,
        specialties: v.specialties,
        courierPickup: true,
        inShopRepair: true,
        spareParts: false,
        status: "APPROVED",
        reviewedAt: new Date(),
      },
    });

    // Create shop linked to the application
    const shop = await prisma.shop.upsert({
      where: { slug: v.shopSlug },
      update: {
        vendorApplicationId: vendorApp.id,
        setupComplete: true,
        isPublic: true,
        specialties: v.specialties,
        inspectionFee: v.inspectionFee,
        baseLaborFee: v.baseLaborFee,
        pickupFee: v.pickupFee,
        expressFee: v.expressFee,
      },
      create: {
        vendorApplicationId: vendorApp.id,
        name: v.shopName,
        slug: v.shopSlug,
        description: "Professional electronics repair service.",
        address: v.address,
        city: v.city,
        area: v.area,
        lat: v.lat,
        lng: v.lng,
        phone: v.phone,
        email: v.email,
        ratingAvg: 4.5,
        reviewCount: 0,
        priceLevel: 2,
        categories: ["COURIER_PICKUP", "IN_SHOP_REPAIR"],
        specialties: v.specialties,
        inspectionFee: v.inspectionFee,
        baseLaborFee: v.baseLaborFee,
        pickupFee: v.pickupFee,
        expressFee: v.expressFee,
        setupComplete: true,
        isPublic: true,
        isActive: true,
      },
    });

    // Link vendor user as shop OWNER
    await prisma.shopStaff.upsert({
      where: {
        shopId_userId: {
          shopId: shop.id,
          userId: vendorUser.id,
        },
      },
      update: {},
      create: {
        shopId: shop.id,
        userId: vendorUser.id,
        role: "OWNER",
        isActive: true,
      },
    });

    vendors.push({ userId: vendorUser.id, shopName: v.shopName });
  }

  console.log(`✅ Created ${vendors.length} approved vendors with shops:`);
  for (let i = 0; i < vendorData.length; i++) {
    console.log(
      `   • ${vendorData[i].shopName} — ${vendorData[i].email} / password123`,
    );
    console.log(
      `     Skills: ${vendorData[i].specialties.join(", ")}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. CREATE TEST CUSTOMERS
  // ═══════════════════════════════════════════════════════════════════════

  const customers = await Promise.all([
    prisma.user.upsert({
      where: { email: "rahim@meramot.demo" },
      update: {},
      create: {
        username: "rahim_uddin",
        email: "rahim@meramot.demo",
        passwordHash,
        name: "Rahim Uddin",
        phone: "+8801911111111",
        address: "45 Mirpur Road",
        city: "Dhaka",
        area: "Mirpur",
      },
    }),
    prisma.user.upsert({
      where: { email: "fatema@meramot.demo" },
      update: {},
      create: {
        username: "fatema_khatun",
        email: "fatema@meramot.demo",
        passwordHash,
        name: "Fatema Khatun",
        phone: "+8801922222222",
        address: "12 Gulshan Avenue",
        city: "Dhaka",
        area: "Gulshan",
      },
    }),
    prisma.user.upsert({
      where: { email: "karim@meramot.demo" },
      update: {},
      create: {
        username: "karim_hasan",
        email: "karim@meramot.demo",
        passwordHash,
        name: "Karim Hasan",
        phone: "+8801933333333",
        address: "78 Dhanmondi R/A",
        city: "Dhaka",
        area: "Dhanmondi",
      },
    }),
  ]);

  console.log(`\n✅ Created ${customers.length} test customers`);

  // ═══════════════════════════════════════════════════════════════════════
  // 3. CREATE REPAIR REQUESTS IN BIDDING STATUS
  // ═══════════════════════════════════════════════════════════════════════

  const repairRequestData = [
    // Customer 1: Rahim — 3 requests
    {
      userId: customers[0].id,
      title: "iPhone 14 screen cracked badly",
      deviceType: "Phone",
      brand: "Apple",
      model: "iPhone 14",
      issueCategory: "Display",
      problem:
        "Dropped my phone and the screen is completely shattered. Touch still works partially but display has dead zones on the left side. Need a full screen replacement with original quality display.",
      mode: RequestMode.DIRECT_REPAIR,
      contactPhone: "+8801911111111",
      preferredPickup: true,
      deliveryType: "REGULAR" as const,
      pickupAddress: "45 Mirpur Road, Dhaka",
    },
    {
      userId: customers[0].id,
      title: "Samsung Galaxy S23 battery swelling",
      deviceType: "Phone",
      brand: "Samsung",
      model: "Galaxy S23",
      issueCategory: "Battery",
      problem:
        "The back cover is bulging and the battery is visibly swollen. Phone gets extremely hot during charging and only lasts about 2 hours. Needs urgent battery replacement before it becomes dangerous.",
      mode: RequestMode.DIRECT_REPAIR,
      contactPhone: "+8801911111111",
      preferredPickup: true,
      deliveryType: "EXPRESS" as const,
      pickupAddress: "45 Mirpur Road, Dhaka",
    },
    {
      userId: customers[0].id,
      title: "Dell Inspiron won't turn on",
      deviceType: "Laptop",
      brand: "Dell",
      model: "Inspiron 15 3520",
      issueCategory: "Motherboard",
      problem:
        "Laptop suddenly stopped powering on. Charging LED blinks orange 3 times. No display, no fan spin. Was working fine yesterday. Might be a motherboard or power IC issue.",
      mode: RequestMode.CHECKUP_AND_REPAIR,
      contactPhone: "+8801911111111",
      preferredPickup: false,
    },

    // Customer 2: Fatema — 3 requests
    {
      userId: customers[1].id,
      title: "MacBook Pro overheating and throttling",
      deviceType: "Laptop",
      brand: "Apple",
      model: "MacBook Pro 2021 M1 Pro",
      issueCategory: "Cooling",
      problem:
        "MacBook gets extremely hot within 10 minutes of use. Fans run at max speed constantly. Performance drops significantly when hot. Thermal paste might need replacing and fan cleaning.",
      mode: RequestMode.CHECKUP_AND_REPAIR,
      contactPhone: "+8801922222222",
      preferredPickup: true,
      deliveryType: "REGULAR" as const,
      pickupAddress: "12 Gulshan Avenue, Dhaka",
    },
    {
      userId: customers[1].id,
      title: "iPad Air charging port loose",
      deviceType: "Tablet",
      brand: "Apple",
      model: "iPad Air 5th Gen",
      issueCategory: "Charging port",
      problem:
        "Lightning cable doesn't stay in firmly anymore. Have to hold it at an angle to charge. Sometimes it disconnects randomly during charging overnight. Need charging port replacement.",
      mode: RequestMode.DIRECT_REPAIR,
      contactPhone: "+8801922222222",
      preferredPickup: true,
      deliveryType: "REGULAR" as const,
      pickupAddress: "12 Gulshan Avenue, Dhaka",
    },
    {
      userId: customers[1].id,
      title: "HP printer paper jam and streaks",
      deviceType: "Printer",
      brand: "HP",
      model: "LaserJet Pro M404dn",
      issueCategory: "Paper jam",
      problem:
        "Printer jams every 3-4 pages. When it does print, there are horizontal streaks across the page. Tried cleaning the toner cartridge but issue persists. Roller might be worn out.",
      mode: RequestMode.CHECKUP_ONLY,
      contactPhone: "+8801922222222",
      preferredPickup: false,
    },

    // Customer 3: Karim — 2 requests
    {
      userId: customers[2].id,
      title: "Gaming PC random shutdowns",
      deviceType: "Desktop",
      brand: "Custom Build",
      model: "RTX 4070 / i7-13700K",
      issueCategory: "Power supply",
      problem:
        "PC randomly shuts down during gaming after about 30-45 minutes. No BSOD, just instant power off. Happens more with GPU-intensive games. Suspect PSU or overheating. Need full diagnosis.",
      mode: RequestMode.CHECKUP_AND_REPAIR,
      contactPhone: "+8801933333333",
      preferredPickup: true,
      deliveryType: "REGULAR" as const,
      pickupAddress: "78 Dhanmondi R/A, Dhaka",
    },
    {
      userId: customers[2].id,
      title: "JBL Flip 6 speaker no sound from left",
      deviceType: "Speaker",
      brand: "JBL",
      model: "Flip 6",
      issueCategory: "Audio",
      problem:
        "Left channel produces no sound at all. Right channel works fine. Bluetooth connects properly and music plays but only from the right driver. Might be a loose ribbon cable or blown driver.",
      mode: RequestMode.DIRECT_REPAIR,
      contactPhone: "+8801933333333",
      preferredPickup: false,
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const data of repairRequestData) {
    const existing = await prisma.repairRequest.findFirst({
      where: {
        userId: data.userId,
        title: data.title,
      },
    });

    if (existing) {
      await prisma.repairJob.deleteMany({ where: { repairRequestId: existing.id } });
      await prisma.repairRequest.delete({ where: { id: existing.id } });
    }

    await prisma.repairRequest.create({
      data: {
        userId: data.userId,
        title: data.title,
        deviceType: data.deviceType,
        brand: data.brand,
        model: data.model,
        issueCategory: data.issueCategory,
        problem: data.problem,
        imageUrls: [],
        mode: data.mode,
        status: RequestStatus.BIDDING,
        preferredPickup: data.preferredPickup,
        deliveryType: data.deliveryType,
        contactPhone: data.contactPhone,
        pickupAddress: data.pickupAddress,
      },
    });

    created++;
  }

  console.log(
    `\n✅ Repair requests: ${created} created, ${skipped} skipped (already exist)`,
  );

  // ═══════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════

  console.log("\n" + "═".repeat(64));
  console.log("  🎯 BIDDING TEST READY — all accounts use password: password123");
  console.log("═".repeat(64));
  console.log("\n  VENDORS (log in → go to /vendor/dashboard → place bids):");
  console.log("  ┌─────────────────────────┬──────────────────────────────┐");
  console.log("  │ Shop                    │ Email                        │");
  console.log("  ├─────────────────────────┼──────────────────────────────┤");
  console.log("  │ Arif Electronics Lab    │ testvendor1@meramot.demo     │");
  console.log("  │ Dhaka Laptop Clinic     │ testvendor2@meramot.demo     │");
  console.log("  └─────────────────────────┴──────────────────────────────┘");
  console.log("\n  CUSTOMERS (log in → go to /orders → see bids, accept/decline):");
  console.log("  ┌─────────────────────────┬──────────────────────────────┐");
  console.log("  │ Customer                │ Email                        │");
  console.log("  ├─────────────────────────┼──────────────────────────────┤");
  console.log("  │ Rahim Uddin             │ rahim@meramot.demo           │");
  console.log("  │ Fatema Khatun           │ fatema@meramot.demo          │");
  console.log("  │ Karim Hasan             │ karim@meramot.demo           │");
  console.log("  └─────────────────────────┴──────────────────────────────┘");
  console.log("\n  SKILL MATCHING:");
  console.log("  • Arif Electronics Lab → Display, Battery, Charging port, Water damage");
  console.log("  • Dhaka Laptop Clinic  → Motherboard, Keyboard, SSD, Cooling, Power supply");
  console.log("");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
