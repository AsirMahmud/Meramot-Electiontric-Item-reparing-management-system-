import { PrismaClient, ShopCategory } from "@prisma/client";

const prisma = new PrismaClient();

const areas = [
  "Dhanmondi","Gulshan","Banani","Mirpur","Uttara",
  "Mohammadpur","New Market","Farmgate","Tejgaon","Bashundhara",
];

const specialtiesPool = [
  "Battery replacement",
  "Keyboard repair",
  "Display repair",
  "Charging port replacement",
  "Motherboard repair",
  "Water damage recovery",
  "SSD upgrade",
  "MacBook repair",
  "Gaming laptop optimization",
];

function randomFrom(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset(arr: any[], count: number) {
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
}

async function main() {
  for (let i = 1; i <= 50; i++) {
    const name = `TechFix Hub ${i}`;
    const slug = `techfix-hub-${i}`;

    await prisma.shop.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        description: "Reliable electronics and laptop repair service.",
        address: `${i * 3} Main Road`,
        city: "Dhaka",
        area: randomFrom(areas),
        ratingAvg: Number((3.5 + Math.random() * 1.5).toFixed(1)),
        reviewCount: Math.floor(Math.random() * 300),
        priceLevel: Math.floor(Math.random() * 3) + 1,
        hasVoucher: Math.random() > 0.5,
        freeDelivery: Math.random() > 0.6,
        hasDeals: Math.random() > 0.7,
        categories: [
          ShopCategory.COURIER_PICKUP,
          ShopCategory.IN_SHOP_REPAIR,
        ],
        specialties: randomSubset(specialtiesPool, 3),
      },
    });
  }

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());