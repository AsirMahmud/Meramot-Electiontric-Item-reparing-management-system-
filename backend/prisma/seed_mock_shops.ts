import { PrismaClient, ShopCategory } from "@prisma/client";

const prisma = new PrismaClient();

const mockShops = [
  {
    id: "shop-1",
    name: "ProTech Solutions",
    slug: "protech-solutions",
    description: '"OEM parts only. Certified Apple technicians. 12-month warranty included."',
    address: "Banani DOHS, Dhaka",
    city: "Dhaka",
    area: "Banani",
    priceLevel: 2,
    hasVoucher: true,
    freeDelivery: false,
    hasDeals: false,
    categories: [ShopCategory.COURIER_PICKUP, ShopCategory.IN_SHOP_REPAIR],
    specialties: ["MacBook Air M2 repair", "battery replacement", "logic board repair", "laptop", "phone"],
    lat: 23.7938,
    lng: 90.4048,
    isFeatured: true,
    inspectionFee: 300,
    baseLaborFee: 500,
    pickupFee: 100,
    expressFee: 400,
    reviewsToGenerate: { 5: 12, 4: 3, 3: 1, 2: 0, 1: 0 } // Total 16, avg 4.68
  },
  {
    id: "shop-2",
    name: "The Gadget Den",
    slug: "the-gadget-den",
    description: '"Express service available. Right around the corner from Main St. Mall."',
    address: "Gulshan 1, Dhaka",
    city: "Dhaka",
    area: "Gulshan",
    priceLevel: 3,
    hasVoucher: false,
    freeDelivery: false,
    hasDeals: false,
    categories: [ShopCategory.IN_SHOP_REPAIR],
    specialties: ["MacBook Air M2 repair", "screen replacement", "keyboard repair", "tablet", "smartwatch"],
    lat: 23.7806,
    lng: 90.4168,
    isFeatured: true,
    inspectionFee: 500,
    baseLaborFee: 800,
    pickupFee: 150,
    expressFee: 500,
    reviewsToGenerate: { 5: 8, 4: 5, 3: 2, 2: 1, 1: 0 } // Total 16, avg 4.25
  },
  {
    id: "shop-3",
    name: "Budget Fixer",
    slug: "budget-fixer",
    description: '"Affordable high-quality generic replacement screens. 30-day warranty."',
    address: "Dhanmondi, Dhaka",
    city: "Dhaka",
    area: "Dhanmondi",
    priceLevel: 1,
    hasVoucher: true,
    freeDelivery: false,
    hasDeals: true,
    categories: [ShopCategory.IN_SHOP_REPAIR],
    specialties: ["MacBook Air M2 repair", "display replacement", "screen repair", "console", "printer"],
    lat: 23.7461,
    lng: 90.3742,
    isFeatured: true,
    inspectionFee: 100,
    baseLaborFee: 300,
    pickupFee: 50,
    expressFee: 200,
    reviewsToGenerate: { 5: 5, 4: 7, 3: 3, 2: 1, 1: 1 } // Total 17, avg 3.82
  },
  {
    id: "shop-4",
    name: "MacMaster Repairs",
    slug: "macmaster-repairs",
    description: '"OEM parts only. Certified Apple replacement tools in stock."',
    address: "Mohakhali, Dhaka",
    city: "Dhaka",
    area: "Mohakhali",
    priceLevel: 2,
    hasVoucher: false,
    freeDelivery: false,
    hasDeals: false,
    categories: [ShopCategory.IN_SHOP_REPAIR],
    specialties: ["MacBook Air M2 repair", "certified apple support"],
    lat: 23.7776,
    lng: 90.3995,
    inspectionFee: 250,
    baseLaborFee: 600,
    pickupFee: 100,
    expressFee: 350,
    reviewsToGenerate: { 5: 4, 4: 0, 3: 0, 2: 0, 1: 0 }
  },
  {
    id: "shop-5",
    name: "The iDoc Garage",
    slug: "the-idoc-garage",
    description: '"Silicon Valley fixers. Bravest service, and in local pickup."',
    address: "Uttara Sector 11, Dhaka",
    city: "Dhaka",
    area: "Uttara",
    priceLevel: 3,
    hasVoucher: false,
    freeDelivery: true,
    hasDeals: false,
    categories: [ShopCategory.COURIER_PICKUP, ShopCategory.IN_SHOP_REPAIR],
    specialties: ["MacBook Air M2 repair", "battery replacement"],
    lat: 23.8759,
    lng: 90.3888,
    inspectionFee: 500,
    baseLaborFee: 700,
    pickupFee: 0,
    expressFee: 500,
    reviewsToGenerate: { 5: 3, 4: 1, 3: 0, 2: 0, 1: 0 }
  },
  {
    id: "shop-6",
    name: "ByteSize Repairs",
    slug: "bytesize-repairs",
    description: '"Express screen replacement with quick turnaround."',
    address: "Mirpur DOHS, Dhaka",
    city: "Dhaka",
    area: "Mirpur",
    priceLevel: 3,
    hasVoucher: false,
    freeDelivery: false,
    hasDeals: false,
    categories: [ShopCategory.IN_SHOP_REPAIR],
    specialties: ["MacBook Air M2 repair", "screen replacement", "keyboard repair"],
    lat: 23.8373,
    lng: 90.3668,
    inspectionFee: 400,
    baseLaborFee: 700,
    pickupFee: 120,
    expressFee: 450,
    reviewsToGenerate: { 5: 15, 4: 2, 3: 0, 2: 0, 1: 0 }
  },
  {
    id: "shop-7",
    name: "AppleCore Solutions",
    slug: "applecore-solutions",
    description: '"Expert Apple device repair. Same-day service available."',
    address: "Badda, Dhaka",
    city: "Dhaka",
    area: "Badda",
    priceLevel: 3,
    hasVoucher: false,
    freeDelivery: false,
    hasDeals: false,
    categories: [ShopCategory.COURIER_PICKUP, ShopCategory.IN_SHOP_REPAIR],
    specialties: ["MacBook Air M2 repair", "logic board repair", "water damage"],
    lat: 23.7805,
    lng: 90.4267,
    inspectionFee: 450,
    baseLaborFee: 800,
    pickupFee: 100,
    expressFee: 500,
    reviewsToGenerate: { 5: 6, 4: 5, 3: 1, 2: 0, 1: 0 }
  },
  {
    id: "shop-8",
    name: "Main Street Tech",
    slug: "main-street-tech",
    description: '"Reliable everyday repairs at fair prices. Walk-ins welcome."',
    address: "Tejgaon, Dhaka",
    city: "Dhaka",
    area: "Tejgaon",
    priceLevel: 2,
    hasVoucher: false,
    freeDelivery: false,
    hasDeals: false,
    categories: [ShopCategory.IN_SHOP_REPAIR],
    specialties: ["MacBook Air M2 repair", "trackpad replacement", "battery replacement"],
    lat: 23.7603,
    lng: 90.3905,
    inspectionFee: 200,
    baseLaborFee: 400,
    pickupFee: 80,
    expressFee: 300,
    reviewsToGenerate: { 5: 20, 4: 2, 3: 0, 2: 0, 1: 1 }
  },
  {
    id: "shop-9",
    name: "Precision Fix",
    slug: "precision-fix",
    description: '"Affordable high-quality generic replacement battery. 90-day warranty."',
    address: "Rampura, Dhaka",
    city: "Dhaka",
    area: "Rampura",
    priceLevel: 2,
    hasVoucher: false,
    freeDelivery: true,
    hasDeals: false,
    categories: [ShopCategory.COURIER_PICKUP, ShopCategory.IN_SHOP_REPAIR],
    specialties: ["MacBook Air M2 repair", "battery replacement", "pickup service"],
    lat: 23.7612,
    lng: 90.4208,
    inspectionFee: 200,
    baseLaborFee: 450,
    pickupFee: 0,
    expressFee: 300,
    reviewsToGenerate: { 5: 8, 4: 6, 3: 4, 2: 2, 1: 1 }
  },
  {
    id: "shop-10",
    name: "Micro-Maestro",
    slug: "micro-maestro",
    description: '"Specialist in micro soldering and board-level repair. 30-day warranty."',
    address: "Mohammadpur, Dhaka",
    city: "Dhaka",
    area: "Mohammadpur",
    priceLevel: 2,
    hasVoucher: false,
    freeDelivery: false,
    hasDeals: false,
    categories: [ShopCategory.IN_SHOP_REPAIR],
    specialties: ["MacBook Air M2 repair", "micro soldering", "board repair"],
    lat: 23.7658,
    lng: 90.3584,
    inspectionFee: 350,
    baseLaborFee: 600,
    pickupFee: 100,
    expressFee: 400,
    reviewsToGenerate: { 5: 2, 4: 4, 3: 5, 2: 3, 1: 2 }
  },
  {
    id: "shop-11",
    name: "Westside Computery",
    slug: "westside-computery",
    description: "CPU, storage, and keyboard replacement specialists. 30-day warranty.",
    address: "Wari, Dhaka",
    city: "Dhaka",
    area: "Wari",
    priceLevel: 2,
    hasVoucher: false,
    freeDelivery: false,
    hasDeals: false,
    categories: [ShopCategory.IN_SHOP_REPAIR],
    specialties: ["MacBook Air M2 repair", "storage replacement", "keyboard repair"],
    lat: 23.7174,
    lng: 90.4183,
    inspectionFee: 150,
    baseLaborFee: 400,
    pickupFee: 80,
    expressFee: 250,
    reviewsToGenerate: { 5: 10, 4: 8, 3: 2, 2: 0, 1: 0 }
  },
  {
    id: "shop-12",
    name: "The Gear Lab",
    slug: "the-gear-lab",
    description: '"Screen repair and genuine spare parts available. Warranty included."',
    address: "Bashundhara, Dhaka",
    city: "Dhaka",
    area: "Bashundhara",
    priceLevel: 2,
    hasVoucher: false,
    freeDelivery: false,
    hasDeals: false,
    categories: [ShopCategory.IN_SHOP_REPAIR, ShopCategory.SPARE_PARTS],
    specialties: ["MacBook Air M2 repair", "replacement parts", "screen repair"],
    lat: 23.8183,
    lng: 90.4328,
    inspectionFee: 250,
    baseLaborFee: 500,
    pickupFee: 100,
    expressFee: 350,
    reviewsToGenerate: { 5: 5, 4: 5, 3: 5, 2: 1, 1: 1 }
  },
];

const mockReviewTexts = {
  5: ["Excellent service!", "Very fast and professional.", "Highly recommend this shop.", "Perfect repair, works like new.", "Great communication and fair price.", "Will definitely come back!"],
  4: ["Good service, took a bit longer than expected.", "Solid repair, no issues.", "Friendly staff, fair pricing.", "Satisfied with the result."],
  3: ["Okay service, but could be faster.", "Repair was fine, but communication was lacking.", "Average experience."],
  2: ["Not very happy with the repair time.", "Price was higher than quoted.", "Had to return to fix a small issue."],
  1: ["Terrible experience.", "Would not recommend.", "Very unprofessional.", "My device is still broken."]
};

async function createDummyUsers(count: number) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await prisma.user.upsert({
      where: { email: `dummy${i}@example.com` },
      update: {},
      create: {
        email: `dummy${i}@example.com`,
        name: `Customer ${i + 1}`,
        username: `customer_${i + 1}`,
        passwordHash: "dummy_hash_123",
      }
    });
    users.push(user);
  }
  return users;
}

async function main() {
  console.log("Seeding mock shops...");
  
  // Create 30 dummy users to leave reviews
  const users = await createDummyUsers(30);

  for (const shop of mockShops) {
    // Calculate total review count and average
    let totalScore = 0;
    let reviewCount = 0;
    
    const reviewData: any[] = [];
    
    Object.entries(shop.reviewsToGenerate).forEach(([scoreStr, count]) => {
      const score = parseInt(scoreStr);
      for (let i = 0; i < count; i++) {
        totalScore += score;
        reviewCount++;
        
        // Pick a random user
        const randomUser = users[Math.floor(Math.random() * users.length)];
        // Pick a random review text based on score
        const texts = mockReviewTexts[score as keyof typeof mockReviewTexts];
        const reviewText = Math.random() > 0.3 ? texts[Math.floor(Math.random() * texts.length)] : null; // 70% chance to have text
        
        reviewData.push({
          userId: randomUser.id,
          score,
          review: reviewText,
          // Random date within the last 30 days
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000))
        });
      }
    });
    
    const ratingAvg = reviewCount > 0 ? Number((totalScore / reviewCount).toFixed(1)) : 0;

    const createdShop = await prisma.shop.upsert({
      where: { id: shop.id },
      update: {
        name: shop.name,
        slug: shop.slug,
        description: shop.description,
        address: shop.address,
        city: shop.city,
        area: shop.area,
        lat: shop.lat,
        lng: shop.lng,
        ratingAvg,
        reviewCount,
        priceLevel: shop.priceLevel,
        hasVoucher: shop.hasVoucher,
        freeDelivery: shop.freeDelivery,
        hasDeals: shop.hasDeals,
        categories: shop.categories,
        specialties: shop.specialties,
        isFeatured: shop.isFeatured || false,
        isActive: true,
        isPublic: true,
        setupComplete: true,
        baseLaborFee: shop.baseLaborFee,
        inspectionFee: shop.inspectionFee,
        pickupFee: shop.pickupFee,
        expressFee: shop.expressFee,
      },
      create: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        description: shop.description,
        address: shop.address,
        city: shop.city,
        area: shop.area,
        lat: shop.lat,
        lng: shop.lng,
        ratingAvg,
        reviewCount,
        priceLevel: shop.priceLevel,
        hasVoucher: shop.hasVoucher,
        freeDelivery: shop.freeDelivery,
        hasDeals: shop.hasDeals,
        categories: shop.categories,
        specialties: shop.specialties,
        isFeatured: shop.isFeatured || false,
        isActive: true,
        isPublic: true,
        setupComplete: true,
        baseLaborFee: shop.baseLaborFee,
        inspectionFee: shop.inspectionFee,
        pickupFee: shop.pickupFee,
        expressFee: shop.expressFee,
      },
    });
    
    console.log(`Created shop ${shop.name} with ${reviewCount} reviews (Avg: ${ratingAvg})`);
    
    // Clear existing reviews for this shop to avoid unique constraint violations
    await prisma.rating.deleteMany({
      where: { shopId: createdShop.id }
    });
    
    // Create the new reviews
    // We can't use createMany because of SQLite limitations, or if we want to ensure userId_shopId unique constraint
    // We'll just create them sequentially and ignore duplicates if a user accidentally gets picked twice
    const userIdsUsed = new Set();
    
    for (const r of reviewData) {
      if (userIdsUsed.has(r.userId)) continue; // Ensure one review per user per shop
      userIdsUsed.add(r.userId);
      
      await prisma.rating.create({
        data: {
          shopId: createdShop.id,
          userId: r.userId,
          score: r.score,
          review: r.review,
          createdAt: r.createdAt,
          updatedAt: r.createdAt
        }
      });
    }
  }
  console.log("Done seeding mock shops and reviews.");
}

main().finally(() => prisma.$disconnect());
