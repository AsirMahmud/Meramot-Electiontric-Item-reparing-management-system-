import prisma from "../src/models/prisma.js";

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true }
    });
    console.log("Users in Database:");
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
