import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const areas = [
  "Dhanmondi","Gulshan","Banani","Mirpur","Uttara",
  "Mohammadpur","New Market","Farmgate","Tejgaon","Bashundhara",
];

function randomFrom(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  for (let i = 1; i <= 30; i++) {
    await prisma.user.upsert({
      where: { email: `customer${i}@meramot.demo` },
      update: {},
      create: {
        username: `customer${i}`,
        email: `customer${i}@meramot.demo`,
        passwordHash,
        name: `Customer ${i}`,
        phone: `+88017${Math.floor(10000000 + Math.random() * 89999999)}`,
        address: `${i * 5} Lake Road`,
        city: "Dhaka",
        area: randomFrom(areas),
      },
    });
  }

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());