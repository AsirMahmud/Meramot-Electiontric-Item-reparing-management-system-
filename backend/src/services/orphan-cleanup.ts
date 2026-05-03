import prisma from "../models/prisma.js";

const ORPHAN_AGE_DAYS = 30;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run once per day

/**
 * Cleans up orphaned CUSTOMER accounts that were created solely from
 * a rejected vendor application and have no other activity.
 *
 * Criteria for deletion:
 * 1. Role is CUSTOMER (never got promoted to VENDOR)
 * 2. Has a vendor application in REJECTED status
 * 3. The rejection happened more than 30 days ago
 * 4. The user has zero repair requests (never used the platform as a customer)
 * 5. The user has zero ratings, payments, or support tickets
 */
async function cleanupOrphanedAccounts() {
  try {
    const cutoffDate = new Date(Date.now() - ORPHAN_AGE_DAYS * 24 * 60 * 60 * 1000);

    // Find users matching orphan criteria
    const orphanedUsers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        vendorApplications: {
          some: {
            status: "REJECTED",
            rejectedAt: { lt: cutoffDate },
          },
        },
        // No platform activity
        repairRequests: { none: {} },
        ratings: { none: {} },
        payments: { none: {} },
        supportTickets: { none: {} },
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    if (orphanedUsers.length === 0) {
      return { cleaned: 0 };
    }

    const orphanIds = orphanedUsers.map((user) => user.id);

    // Delete in a transaction: applications first (FK constraint), then users
    const result = await prisma.$transaction(async (tx) => {
      await tx.vendorApplication.deleteMany({
        where: { userId: { in: orphanIds } },
      });

      const deleted = await tx.user.deleteMany({
        where: { id: { in: orphanIds } },
      });

      return deleted.count;
    });

    console.log(
      `[cleanup] Removed ${result} orphaned account(s) from rejected vendor applications older than ${ORPHAN_AGE_DAYS} days.`,
    );

    return { cleaned: result };
  } catch (error) {
    console.error("[cleanup] Orphaned account cleanup failed:", error);
    return { cleaned: 0, error };
  }
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the periodic cleanup scheduler.
 * Runs immediately once on startup, then repeats every 24 hours.
 */
export function startOrphanCleanupScheduler() {
  // Run once immediately on startup (non-blocking)
  void cleanupOrphanedAccounts();

  // Schedule recurring cleanup
  cleanupTimer = setInterval(() => {
    void cleanupOrphanedAccounts();
  }, CLEANUP_INTERVAL_MS);

  // Prevent the timer from keeping the process alive during graceful shutdown
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  console.log(
    `[cleanup] Orphaned account cleanup scheduled (every ${CLEANUP_INTERVAL_MS / 3600000}h, accounts older than ${ORPHAN_AGE_DAYS} days)`,
  );
}

/**
 * Stop the cleanup scheduler (useful for tests or graceful shutdown).
 */
export function stopOrphanCleanupScheduler() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
