import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Render and other cloud providers often aggressively kill idle TCP connections (e.g. after 5 mins).
// This background heartbeat queries the DB every 2 minutes to keep the connection pool active
// and prevent "Error in PostgreSQL connection: Error { kind: Closed, cause: None }".
setInterval(() => {
  prisma.$queryRaw`SELECT 1`.catch(() => {
    // Ignore errors here; if the DB is truly down, the next actual request will fail normally.
  });
}, 120000); // 120 seconds

export default prisma;