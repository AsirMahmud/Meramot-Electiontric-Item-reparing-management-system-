/**
 * Seed script for testing the live bidding system.
 *
 * Creates 3 test customers and 8 repair requests in BIDDING status
 * so vendors can place bids from their dashboards.
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

  // ── 1. Create test customers ───────────────────────────────────────────

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

  console.log(`✅ Created ${customers.length} test customers`);
  console.log(
    customers
      .map((c) => `   • ${c.name} — ${c.email} / password123`)
      .join("\n")
  );

  // ── 2. Create repair requests in BIDDING status ────────────────────────

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
    // Check if a similar request already exists (avoid duplicates on re-run)
    const existing = await prisma.repairRequest.findFirst({
      where: {
        userId: data.userId,
        title: data.title,
      },
    });

    if (existing) {
      skipped++;
      continue;
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

  console.log(`\n✅ Repair requests: ${created} created, ${skipped} skipped (already exist)`);

  console.log("\n🎯 Summary:");
  console.log("   All requests are in BIDDING status — ready for vendor bids.");
  console.log("\n   Test accounts (password: password123):");
  console.log("   ┌───────────────────────────────┬─────────────────────────┐");
  console.log("   │ Customer                      │ Email                   │");
  console.log("   ├───────────────────────────────┼─────────────────────────┤");
  console.log("   │ Rahim Uddin                   │ rahim@meramot.demo      │");
  console.log("   │ Fatema Khatun                 │ fatema@meramot.demo     │");
  console.log("   │ Karim Hasan                   │ karim@meramot.demo      │");
  console.log("   └───────────────────────────────┴─────────────────────────┘");
  console.log("\n   To bid, log in as any vendor (vendor0@meramot.demo etc.)");
  console.log("   and visit /vendor/dashboard.\n");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
