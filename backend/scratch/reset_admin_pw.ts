import prisma from "../src/models/prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  try {
    const password = "Mustahid123#";
    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.update({
      where: { email: "mustahid000@gmail.com" },
      data: { passwordHash }
    });
    
    console.log(`Updated password for ${user.email}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
