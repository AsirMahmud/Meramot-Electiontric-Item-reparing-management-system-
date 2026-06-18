import { PrismaClient } from "@prisma/client";

const passwords = ["", "postgres", "admin", "password", "123456", "root"];

async function check() {
  for (const p of passwords) {
    const url = `postgresql://postgres:${p}@localhost:5432/postgres?schema=public`;
    const prisma = new PrismaClient({
      datasourceUrl: url,
    });
    try {
      await prisma.$connect();
      console.log("SUCCESS with password: '" + p + "'");
      await prisma.$disconnect();
      return;
    } catch (e) {
      console.log("Failed with password: '" + p + "'");
    } finally {
      await prisma.$disconnect();
    }
  }
  console.log("No common password worked.");
}

check();
