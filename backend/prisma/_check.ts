import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function audit() {
  console.log("═".repeat(60));
  console.log("  📊 FULL DATABASE AUDIT");
  console.log("═".repeat(60));

  // Shops
  const totalShops = await p.shop.count();
  const publicActive = await p.shop.count({ where: { isPublic: true, isActive: true } });
  const notPublic = await p.shop.count({ where: { isPublic: false } });
  const notActive = await p.shop.count({ where: { isActive: false } });
  const nullCoords = await p.shop.count({ where: { OR: [{ lat: null }, { lng: null }] } });
  const featured = await p.shop.count({ where: { isFeatured: true } });
  console.log("\n🏪 SHOPS:");
  console.log(`  Total: ${totalShops}`);
  console.log(`  Public+Active: ${publicActive}`);
  console.log(`  Not public: ${notPublic}`);
  console.log(`  Not active: ${notActive}`);
  console.log(`  Null coords: ${nullCoords}`);
  console.log(`  Featured: ${featured}`);

  // Vendors
  const totalVendors = await p.user.count({ where: { role: "VENDOR" } });
  const suspendedVendors = await p.user.count({ where: { role: "VENDOR", status: "SUSPENDED" } });
  const approvedApps = await p.vendorApplication.count({ where: { status: "APPROVED" } });
  const pendingApps = await p.vendorApplication.count({ where: { status: "PENDING" } });
  const rejectedApps = await p.vendorApplication.count({ where: { status: "REJECTED" } });
  console.log("\n👤 VENDORS:");
  console.log(`  Vendor users: ${totalVendors}`);
  console.log(`  Suspended: ${suspendedVendors}`);
  console.log(`  Approved apps: ${approvedApps}`);
  console.log(`  Pending apps: ${pendingApps}`);
  console.log(`  Rejected apps: ${rejectedApps}`);

  // Repair requests
  const totalRequests = await p.repairRequest.count();
  const byStatus = await p.$queryRawUnsafe(`SELECT status, COUNT(*)::int as count FROM "RepairRequest" GROUP BY status ORDER BY count DESC`);
  console.log("\n🔧 REPAIR REQUESTS:");
  console.log(`  Total: ${totalRequests}`);
  for (const row of byStatus as any[]) {
    console.log(`    ${row.status}: ${row.count}`);
  }

  // Repair jobs
  const totalJobs = await p.repairJob.count();
  const jobsByStatus = await p.$queryRawUnsafe(`SELECT status, COUNT(*)::int as count FROM "RepairJob" GROUP BY status ORDER BY count DESC`);
  console.log("\n🛠️ REPAIR JOBS:");
  console.log(`  Total: ${totalJobs}`);
  for (const row of jobsByStatus as any[]) {
    console.log(`    ${row.status}: ${row.count}`);
  }

  // Bids
  const totalBids = await p.bid.count().catch(() => -1);
  console.log("\n🏷️ BIDS:");
  console.log(`  Total: ${totalBids}`);

  // Payments
  const totalPayments = await p.payment.count();
  console.log("\n💰 PAYMENTS:");
  console.log(`  Total: ${totalPayments}`);

  // Ratings
  const totalRatings = await p.rating.count();
  console.log("\n⭐ RATINGS:");
  console.log(`  Total: ${totalRatings}`);

  // Users
  const totalUsers = await p.user.count();
  const customers = await p.user.count({ where: { role: "CUSTOMER" } });
  const admins = await p.user.count({ where: { role: "ADMIN" } });
  const delivery = await p.user.count({ where: { role: "DELIVERY" } });
  console.log("\n👥 USERS:");
  console.log(`  Total: ${totalUsers}`);
  console.log(`  Customers: ${customers}`);
  console.log(`  Vendors: ${totalVendors}`);
  console.log(`  Delivery: ${delivery}`);
  console.log(`  Admins: ${admins}`);

  // Check for orphans: shops without vendor applications
  const orphanShops = await p.shop.count({ where: { vendorApplicationId: null } });
  console.log("\n⚠️ INTEGRITY:");
  console.log(`  Shops without vendor app: ${orphanShops}`);

  // Check repair requests without user
  const orphanRequests = await p.repairRequest.count({ where: { userId: null as any } }).catch(() => 0);
  console.log(`  Repair requests without user: ${orphanRequests}`);

  console.log("\n" + "═".repeat(60));
}

audit().finally(() => p.$disconnect());
