import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_13pXFbiLENOg@ep-tiny-violet-ankx6d9i-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'VENDOR_APPLICANT' },
    select: { email: true, username: true }
  });
  console.log("VENDOR APPLICANTS IN LIVE DB:", users);
}

main().finally(() => prisma.$disconnect());
