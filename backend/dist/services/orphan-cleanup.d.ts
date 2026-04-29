/**
 * Start the periodic cleanup scheduler.
 * Runs immediately once on startup, then repeats every 24 hours.
 */
export declare function startOrphanCleanupScheduler(): void;
/**
 * Stop the cleanup scheduler (useful for tests or graceful shutdown).
 */
export declare function stopOrphanCleanupScheduler(): void;
//# sourceMappingURL=orphan-cleanup.d.ts.map