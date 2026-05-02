/**
 * Seed: Diversify repair request statuses for a realistic admin dashboard.
 *
 * 1. Fix ~21 non-COMPLETED orphan requests → COMPLETED
 * 2. Pick ~80 completed requests and redistribute across active statuses
 *    so the admin dashboard shows realistic activity.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function diversify() {
  console.log("═".repeat(60));
  console.log("  🔄 Diversifying repair request statuses");
  console.log("═".repeat(60));

  // ── Step 1: Fix orphan requests that aren't COMPLETED ──
  const orphans = await p.repairRequest.findMany({
    where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
    select: { id: true, status: true, title: true },
  });
  console.log(`\n📌 Found ${orphans.length} non-completed requests to fix first`);

  if (orphans.length > 0) {
    await p.repairRequest.updateMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
      data: { status: "COMPLETED" },
    });
    console.log(`  ✅ Set ${orphans.length} orphan requests → COMPLETED`);
  }

  // ── Step 2: Pick ~80 completed requests and diversify ──
  const completed = await p.repairRequest.findMany({
    where: { status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    take: 200, // pool to pick from
    select: {
      id: true,
      repairJob: { select: { id: true } },
      bids: { select: { id: true } },
    },
  });

  // Split into groups for different statuses
  const withJob = completed.filter((r) => r.repairJob);
  const withBids = completed.filter((r) => r.bids.length > 0 && !r.repairJob);
  const noBidsNoJob = completed.filter((r) => r.bids.length === 0 && !r.repairJob);

  console.log(`\n📊 Pool: ${withJob.length} with jobs, ${withBids.length} with bids only, ${noBidsNoJob.length} bare`);

  // Distribution plan:
  //   10 PENDING      (new, no action yet)
  //   10 BIDDING      (vendors are bidding)
  //   5  ASSIGNED     (vendor picked, job created)
  //   5  PICKUP_SCHEDULED
  //   5  AT_SHOP
  //   10 DIAGNOSING
  //   10 WAITING_APPROVAL
  //   10 REPAIRING
  //   5  RETURN_SCHEDULED
  //   5  CANCELLED

  // --- PENDING: use bare requests (no bids, no job) ---
  const pendingIds = noBidsNoJob.slice(0, 10).map((r) => r.id);
  if (pendingIds.length) {
    await p.repairRequest.updateMany({
      where: { id: { in: pendingIds } },
      data: { status: "PENDING" },
    });
    console.log(`  → ${pendingIds.length} set to PENDING`);
  }

  // --- BIDDING: use requests that have bids ---
  const biddingPool = withBids.slice(0, 10);
  const biddingIds = biddingPool.map((r) => r.id);
  if (biddingIds.length) {
    await p.repairRequest.updateMany({
      where: { id: { in: biddingIds } },
      data: { status: "BIDDING" },
    });
    // Set bids back to ACTIVE
    for (const r of biddingPool) {
      await p.bid.updateMany({
        where: { repairRequestId: r.id },
        data: { status: "ACTIVE" },
      });
    }
    console.log(`  → ${biddingIds.length} set to BIDDING (bids → ACTIVE)`);
  }

  // --- Requests with jobs → various in-progress states ---
  const jobStates: Array<{
    requestStatus: string;
    jobStatus: string;
    count: number;
  }> = [
    { requestStatus: "ASSIGNED", jobStatus: "CREATED", count: 5 },
    { requestStatus: "PICKUP_SCHEDULED", jobStatus: "PICKUP_SCHEDULED", count: 5 },
    { requestStatus: "AT_SHOP", jobStatus: "AT_SHOP", count: 5 },
    { requestStatus: "DIAGNOSING", jobStatus: "DIAGNOSING", count: 10 },
    { requestStatus: "WAITING_APPROVAL", jobStatus: "WAITING_APPROVAL", count: 10 },
    { requestStatus: "REPAIRING", jobStatus: "REPAIRING", count: 10 },
    { requestStatus: "RETURN_SCHEDULED", jobStatus: "READY_TO_RETURN", count: 5 },
  ];

  let jobOffset = 0;
  for (const state of jobStates) {
    const batch = withJob.slice(jobOffset, jobOffset + state.count);
    if (batch.length === 0) continue;

    const reqIds = batch.map((r) => r.id);
    const jobIds = batch.map((r) => r.repairJob!.id);

    await p.repairRequest.updateMany({
      where: { id: { in: reqIds } },
      data: {
        status: state.requestStatus as any,
        completedAt: undefined,
      },
    });

    await p.repairJob.updateMany({
      where: { id: { in: jobIds } },
      data: {
        status: state.jobStatus as any,
        completedAt: null,
      },
    });

    console.log(`  → ${batch.length} set to ${state.requestStatus} (job: ${state.jobStatus})`);
    jobOffset += state.count;
  }

  // --- CANCELLED: pick from remaining bare requests ---
  const cancelledIds = noBidsNoJob.slice(10, 15).map((r) => r.id);
  if (cancelledIds.length) {
    await p.repairRequest.updateMany({
      where: { id: { in: cancelledIds } },
      data: { status: "CANCELLED" },
    });
    console.log(`  → ${cancelledIds.length} set to CANCELLED`);
  }

  // ── Final summary ──
  const summary = await p.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(`
    SELECT status, COUNT(*)::int as count 
    FROM "RepairRequest" 
    GROUP BY status 
    ORDER BY count DESC
  `);
  console.log("\n📊 Final status distribution:");
  for (const row of summary) {
    console.log(`  ${row.status}: ${row.count}`);
  }

  console.log("\n" + "═".repeat(60));
}

diversify().finally(() => p.$disconnect());
