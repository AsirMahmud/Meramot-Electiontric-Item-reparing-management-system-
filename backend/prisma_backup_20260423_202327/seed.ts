import bcrypt from "bcryptjs";
import {
  PrismaClient,
  RequestMode,
  RequestStatus,
  RepairJobStatus,
  ShopCategory,
} from "@prisma/client";

const prisma = new PrismaClient();

const areas = [
  "Dhanmondi",
  "Gulshan",
  "Banani",
  "Mirpur",
  "Uttara",
  "Mohammadpur",
  "New Market",
  "Farmgate",
  "Tejgaon",
  "Bashundhara",
];

const specialtiesPool = [
  "MacBook Air M2 Repair",
  "Battery replacement",
  "Keyboard repair",
  "Display repair",
  "Charging port replacement",
  "Motherboard repair",
  "Water damage recovery",
  "SSD upgrade",
];

function randomFrom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset<T>(arr: T[], count: number) {
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
}

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "customer@meramot.demo" },
    update: {},
    create: {
      username: "customerdemo",
      email: "customer@meramot.demo",
      passwordHash,
      name: "Customer Demo",
      phone: "+8801700000000",
      address: "12 Lake Road",
      city: "Dhaka",
      area: "Dhanmondi",
    },
  });

  const shopSeedData = [
    { name: "Dhaka Device Doctors", slug: "dhaka-device-doctors" },
    { name: "Gulshan Gadget Care", slug: "gulshan-gadget-care" },
    { name: "Banani Tech Bench", slug: "banani-tech-bench" },
    { name: "Mirpur Laptop Lab", slug: "mirpur-laptop-lab" },
    { name: "Uttara FixPoint", slug: "uttara-fixpoint" },
    { name: "Mohammadpur Device Depot", slug: "mohammadpur-device-depot" },
    { name: "New Market Repair Works", slug: "new-market-repair-works" },
    { name: "Farmgate Tech Rescue", slug: "farmgate-tech-rescue" },
    { name: "Tejgaon Circuit Care", slug: "tejgaon-circuit-care" },
    { name: "Bashundhara Laptop Lounge", slug: "bashundhara-laptop-lounge" },
    { name: "ByteBack Solutions", slug: "byteback-solutions" },
    { name: "Pixel Repair Station", slug: "pixel-repair-station" },
    { name: "Motherboard Masters", slug: "motherboard-masters" },
    { name: "QuickFix Electronics", slug: "quickfix-electronics" },
    { name: "Urban Device Clinic", slug: "urban-device-clinic" },
    { name: "Prime Laptop Care", slug: "prime-laptop-care" },
    { name: "Screen & Circuit", slug: "screen-and-circuit" },
    { name: "Trusted Tech Service", slug: "trusted-tech-service" },
    { name: "CoreFix Bangladesh", slug: "corefix-bangladesh" },
    { name: "Laptop Harbor", slug: "laptop-harbor" },
  ];
  
  const shops = [];
  
  for (let i = 0; i < shopSeedData.length; i++) {
    const { name, slug } = shopSeedData[i];
  
    const shop = await prisma.shop.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        description: "Professional electronics repair service.",
        address: `${10 + i + 1} Main Road`,
        city: "Dhaka",
        area: randomFrom(areas),
        ratingAvg: Number((3.5 + Math.random() * 1.5).toFixed(1)),
        reviewCount: Math.floor(Math.random() * 200),
        priceLevel: Math.floor(Math.random() * 3) + 1,
        hasVoucher: (i + 1) % 2 === 0,
        freeDelivery: (i + 1) % 4 === 0,
        hasDeals: (i + 1) % 5 === 0,
        categories: [
          ShopCategory.COURIER_PICKUP,
          ShopCategory.IN_SHOP_REPAIR,
        ],
        specialties: randomSubset(specialtiesPool, 3),
      },
    });
  
    shops.push(shop);
  }

  const completedRequest = await prisma.repairRequest.create({
    data: {
      userId: user.id,
      title: "MacBook Air M2 Repair",
      deviceType: "Laptop",
      brand: "Apple",
      model: "MacBook Air M2",
      problem: "Battery drains too quickly",
      issueCategory: "Battery",
      imageUrls: [],
      mode: RequestMode.CHECKUP_AND_REPAIR,
      status: RequestStatus.COMPLETED,
      preferredPickup: true,
    },
  });

  await prisma.repairJob.create({
    data: {
      repairRequestId: completedRequest.id,
      shopId: shops[0].id,
      status: RepairJobStatus.COMPLETED,
      diagnosisNotes: "Battery replaced with original cell.",
      finalQuotedAmount: 145,
      customerApproved: true,
      startedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  const activeRequest = await prisma.repairRequest.create({
    data: {
      userId: user.id,
      title: "ThinkPad keyboard issue",
      deviceType: "Laptop",
      brand: "Lenovo",
      model: "ThinkPad T14",
      problem: "Several keys are unresponsive",
      issueCategory: "Keyboard",
      imageUrls: [],
      mode: RequestMode.DIRECT_REPAIR,
      status: RequestStatus.REPAIRING,
      preferredPickup: false,
    },
  });

  await prisma.repairJob.create({
    data: {
      repairRequestId: activeRequest.id,
      shopId: shops[1].id,
      status: RepairJobStatus.REPAIRING,
      diagnosisNotes: "Keyboard assembly needs replacement.",
      finalQuotedAmount: 95,
      customerApproved: true,
      startedAt: new Date(),
    },
  });

}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });