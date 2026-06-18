import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const applications = await prisma.vendorApplication.findMany({
    where: { applicantUserId: null },
  });

  console.log(`Found ${applications.length} applications without applicantUserId`);

  for (const app of applications) {
    const user = await prisma.user.findUnique({
      where: { email: app.businessEmail },
    });

    if (user) {
      await prisma.vendorApplication.update({
        where: { id: app.id },
        data: { applicantUserId: user.id },
      });
      console.log(`Updated application ${app.id} with user ${user.id}`);
    } else {
      console.log(`Could not find user for application ${app.id} (${app.businessEmail})`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
