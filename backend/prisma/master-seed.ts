/**
 * MASTER SEED — Single entry point for all seed data.
 * Run: npx tsx prisma/master-seed.ts
 * 
 * Requires env: ADMIN_PASSWORD
 * 
 * Execution order:
 *   1. seed.ts           → Admin, 20 shops w/ vendors, 500 reviewers, reviews+payments
 *   2. seed_mock_shops.ts → 12 additional shops with reviews
 *   3. seed-delivery.ts  → Delivery riders, zones, demo deliveries
 *   4. seed_bidding_test.ts → 2 test vendors + 8 bidding requests
 *   5. seed_bulk_users.ts → 10 test users with tickets/disputes
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seeds = [
  { file: "seed.ts", label: "Core (admin, shops, reviewers, financial data)" },
  { file: "seed_mock_shops.ts", label: "Mock shops with reviews" },
  { file: "seed-delivery.ts", label: "Delivery workflow demo data" },
  { file: "seed_bidding_test.ts", label: "Bidding test data" },
  { file: "seed_bulk_users.ts", label: "Bulk users with tickets/disputes" },
];

async function main() {
  console.log("═".repeat(60));
  console.log("  🌱 MERAMOT MASTER SEED");
  console.log("═".repeat(60));

  if (!process.env.ADMIN_PASSWORD) {
    console.error("❌ ADMIN_PASSWORD environment variable is required");
    process.exit(1);
  }

  for (const seed of seeds) {
    const filePath = path.join(__dirname, seed.file);
    console.log(`\n▶ Running: ${seed.label} (${seed.file})`);
    try {
      execSync(`npx tsx "${filePath}"`, {
        stdio: "inherit",
        env: { ...process.env },
        cwd: path.join(__dirname, ".."),
      });
      console.log(`✅ ${seed.file} completed`);
    } catch (err) {
      console.error(`❌ ${seed.file} failed:`, err);
      process.exit(1);
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("  ✅ ALL SEEDS COMPLETED SUCCESSFULLY");
  console.log("═".repeat(60));

  // Delete legacy/redundant seed files
  const redundant = ["seed_comprehensive.ts", "seed.customers.ts", "seed.shops.ts"];
  const fs = await import("fs");
  for (const file of redundant) {
    const fp = path.join(__dirname, file);
    if (fs.existsSync(fp)) {
      fs.unlinkSync(fp);
      console.log(`🗑️  Deleted redundant: ${file}`);
    }
  }
}

main();
