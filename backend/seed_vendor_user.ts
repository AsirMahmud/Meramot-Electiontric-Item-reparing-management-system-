import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "john@electronics.demo";
  
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        username: "john_vendor",
        email: email,
        passwordHash: "dummy_hash",
        name: "John Electronics",
        role: "VENDOR",
        status: "ACTIVE",
      },
    });
    console.log(`Created user ${user.id} (${email})`);
  }

  await prisma.vendorApplication.update({
    where: { id: "cmoja4at30000b2pcbvl6xxtq" },
    data: { applicantUserId: user.id },
  });
  
  console.log(`Linked application to user ${user.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
