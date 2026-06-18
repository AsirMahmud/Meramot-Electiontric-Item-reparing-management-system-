import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import bcrypt from 'bcryptjs';

async function main() {
  const email = "testvendor@meramot.com";
  const password = "password123";
  const passwordHash = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      username: "testvendor",
      email,
      passwordHash,
      role: "VENDOR_APPLICANT",
    }
  });

  const app = await prisma.vendorApplication.create({
    data: {
      userId: user.id,
      ownerName: "Test Owner",
      businessEmail: email,
      phone: "01711111111",
      shopName: "Test Shop",
      address: "123 Test St",
      status: "PENDING",
      courierPickup: false,
      inShopRepair: true,
      spareParts: false
    }
  });

  console.log("Created user and app");

  // Now test login logic
  const foundUser = await prisma.user.findFirst({
    where: { email }
  });

  if (!foundUser) {
    console.log("User not found");
    return;
  }

  const valid = await bcrypt.compare(password, foundUser.passwordHash);
  if (!valid) {
    console.log("Invalid credentials check failed");
  } else {
    console.log("Valid credentials!");
  }
}

main().finally(() => prisma.$disconnect());
