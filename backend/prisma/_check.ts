/**
 * Deep data integrity check — verifies all foreign key relationships
 * and catches orphaned/broken records.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function deepCheck() {
  console.log("═".repeat(60));
  console.log("  🔍 DEEP DATA INTEGRITY CHECK");
  console.log("═".repeat(60));

  // 1. RepairRequests without valid user
  const orphanedRequests = await p.$queryRawUnsafe<any[]>(`
    SELECT rr.id, rr.title, rr.status 
    FROM "RepairRequest" rr
    LEFT JOIN "User" u ON rr."userId" = u.id
    WHERE u.id IS NULL
    LIMIT 5
  `);
  console.log(`\n❌ Repair requests without valid user: ${orphanedRequests.length}`);

  // 2. RepairJobs without valid repairRequest
  const orphanedJobs = await p.$queryRawUnsafe<any[]>(`
    SELECT rj.id, rj.status 
    FROM "RepairJob" rj
    LEFT JOIN "RepairRequest" rr ON rj."repairRequestId" = rr.id
    WHERE rr.id IS NULL
    LIMIT 5
  `);
  console.log(`❌ Repair jobs without valid request: ${orphanedJobs.length}`);

  // 3. RepairJobs without valid shop
  const jobsNoShop = await p.$queryRawUnsafe<any[]>(`
    SELECT rj.id, rj.status, rj."shopId"
    FROM "RepairJob" rj
    LEFT JOIN "Shop" s ON rj."shopId" = s.id
    WHERE s.id IS NULL
    LIMIT 5
  `);
  console.log(`❌ Repair jobs without valid shop: ${jobsNoShop.length}`);

  // 4. Payments without valid repairRequest
  const paymentsNoRequest = await p.$queryRawUnsafe<any[]>(`
    SELECT p.id, p.status, p."repairRequestId"
    FROM "Payment" p
    LEFT JOIN "RepairRequest" rr ON p."repairRequestId" = rr.id
    WHERE p."repairRequestId" IS NOT NULL AND rr.id IS NULL
    LIMIT 5
  `);
  console.log(`❌ Payments without valid request: ${paymentsNoRequest.length}`);

  // 5. Payments without valid user
  const paymentsNoUser = await p.$queryRawUnsafe<any[]>(`
    SELECT p.id, p.status, p."userId"
    FROM "Payment" p
    LEFT JOIN "User" u ON p."userId" = u.id
    WHERE u.id IS NULL
    LIMIT 5
  `);
  console.log(`❌ Payments without valid user: ${paymentsNoUser.length}`);

  // 6. Ratings without valid shop
  const ratingsNoShop = await p.$queryRawUnsafe<any[]>(`
    SELECT r.id, r.score, r."shopId"
    FROM "Rating" r
    LEFT JOIN "Shop" s ON r."shopId" = s.id
    WHERE s.id IS NULL
    LIMIT 5
  `);
  console.log(`❌ Ratings without valid shop: ${ratingsNoShop.length}`);

  // 7. Ratings without valid user
  const ratingsNoUser = await p.$queryRawUnsafe<any[]>(`
    SELECT r.id, r.score, r."userId"
    FROM "Rating" r
    LEFT JOIN "User" u ON r."userId" = u.id
    WHERE u.id IS NULL
    LIMIT 5
  `);
  console.log(`❌ Ratings without valid user: ${ratingsNoUser.length}`);

  // 8. EscrowLedger without valid payment
  const escrowNoPayment = await p.$queryRawUnsafe<any[]>(`
    SELECT e.id, e.action
    FROM "EscrowLedger" e
    LEFT JOIN "Payment" p ON e."paymentId" = p.id
    WHERE e."paymentId" IS NOT NULL AND p.id IS NULL
    LIMIT 5
  `);
  console.log(`❌ Escrow entries without valid payment: ${escrowNoPayment.length}`);

  // 9. LedgerEntry without valid payment
  const ledgerNoPayment = await p.$queryRawUnsafe<any[]>(`
    SELECT l.id, l.type
    FROM "LedgerEntry" l
    LEFT JOIN "Payment" p ON l."paymentId" = p.id
    WHERE l."paymentId" IS NOT NULL AND p.id IS NULL
    LIMIT 5
  `);
  console.log(`❌ Ledger entries without valid payment: ${ledgerNoPayment.length}`);

  // 10. Shops without ShopStaff (owner)
  const shopsNoStaff = await p.$queryRawUnsafe<any[]>(`
    SELECT s.id, s.name 
    FROM "Shop" s
    LEFT JOIN "ShopStaff" ss ON ss."shopId" = s.id
    WHERE ss.id IS NULL
    LIMIT 10
  `);
  console.log(`❌ Shops without any staff/owner: ${shopsNoStaff.length}`);
  for (const s of shopsNoStaff) {
    console.log(`    → ${s.name} (${s.id})`);
  }

  // 11. Shops with ratingAvg/reviewCount mismatch
  const ratingMismatches = await p.$queryRawUnsafe<any[]>(`
    SELECT s.id, s.name, s."ratingAvg", s."reviewCount", 
           COALESCE(r.avg_score, 0) as actual_avg, 
           COALESCE(r.count, 0) as actual_count
    FROM "Shop" s
    LEFT JOIN (
      SELECT "shopId", AVG(score)::numeric(3,1) as avg_score, COUNT(*)::int as count
      FROM "Rating" WHERE "isHidden" = false GROUP BY "shopId"
    ) r ON r."shopId" = s.id
    WHERE ABS(COALESCE(s."ratingAvg", 0) - COALESCE(r.avg_score, 0)) > 0.2
       OR ABS(COALESCE(s."reviewCount", 0) - COALESCE(r.count, 0)) > 2
    LIMIT 10
  `);
  console.log(`\n⚠️ Shops with rating/review count mismatch: ${ratingMismatches.length}`);
  for (const m of ratingMismatches.slice(0, 5)) {
    console.log(`    → ${m.name}: stored(${m.ratingAvg}/${m.reviewCount}) vs actual(${m.actual_avg}/${m.actual_count})`);
  }

  // 12. Quick query test — simulating what the admin repair-requests endpoint does
  console.log("\n🧪 Testing admin repair-requests query (first 10)...");
  try {
    const testRequests = await p.repairRequest.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        mode: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        repairJobs: {
          select: {
            id: true,
            status: true,
            shop: { select: { id: true, name: true } },
          },
        },
        bids: {
          select: {
            id: true,
            totalCost: true,
            status: true,
            shop: { select: { id: true, name: true } },
          },
        },
      },
    });
    console.log(`  ✅ Query works! Got ${testRequests.length} requests`);
    for (const r of testRequests.slice(0, 3)) {
      console.log(`    → ${r.title} [${r.status}] by ${r.user.name} — ${r.repairJobs.length} jobs, ${r.bids.length} bids`);
    }
  } catch (err: any) {
    console.log(`  ❌ Query FAILED: ${err.message.slice(0, 200)}`);
  }

  console.log("\n" + "═".repeat(60));
}

deepCheck().finally(() => p.$disconnect());
