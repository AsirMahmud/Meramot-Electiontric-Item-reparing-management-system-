import bcrypt from "bcryptjs";
import {
  DeliveryDirection,
  DeliveryStatus,
  DeliveryType,
  PrismaClient,
  RepairJobStatus,
  RequestMode,
  RequestSource,
  RequestStatus,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

async function upsertUser(params: {
  email: string;
  username: string;
  name: string;
  phone: string;
  role: UserRole;
  passwordHash: string;
}) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: params.email }, { username: params.username }],
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        email: params.email,
        username: params.username,
        name: params.name,
        phone: params.phone,
        role: params.role,
        passwordHash: params.passwordHash,
      },
    });
  }

  return prisma.user.create({
    data: {
      email: params.email,
      username: params.username,
      name: params.name,
      phone: params.phone,
      role: params.role,
      passwordHash: params.passwordHash,
    },
  });
}

async function main() {
  const plainPassword = "Delivery@123";
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const providedRiderPassword = "DM-phdr-y718-310";
  const providedRiderHash = await bcrypt.hash(providedRiderPassword, 10);

  const customer = await upsertUser({
    email: "customer.delivery.demo@meeramoot.test",
    username: "customer_delivery_demo",
    name: "Customer Demo",
    phone: "01700000001",
    role: UserRole.CUSTOMER,
    passwordHash,
  });

  const deliveryUser = await upsertUser({
    email: "delivery.agent.demo@meeramoot.test",
    username: "delivery_agent_demo",
    name: "Delivery Agent Demo",
    phone: "01700000002",
    role: UserRole.DELIVERY,
    passwordHash,
  });

  const providedDeliveryUser = await upsertUser({
    email: "delivery147l@meeramoot.test",
    username: "delivery147l",
    name: "Delivery 147L",
    phone: "01700000147",
    role: UserRole.DELIVERY,
    passwordHash: providedRiderHash,
  });

  const rider = await prisma.riderProfile.upsert({
    where: { userId: deliveryUser.id },
    update: {
      vehicleType: "Motorbike",
      status: "AVAILABLE",
      isActive: true,
      registrationStatus: "APPROVED",
    },
    create: {
      userId: deliveryUser.id,
      vehicleType: "Motorbike",
      status: "AVAILABLE",
      isActive: true,
      registrationStatus: "APPROVED",
    },
  });

  const providedRider = await prisma.riderProfile.upsert({
    where: { userId: providedDeliveryUser.id },
    update: {
      vehicleType: "Motorbike",
      status: "AVAILABLE",
      isActive: true,
      registrationStatus: "APPROVED",
    },
    create: {
      userId: providedDeliveryUser.id,
      vehicleType: "Motorbike",
      status: "AVAILABLE",
      isActive: true,
      registrationStatus: "APPROVED",
    },
  });

  const adminPlain = "DeliveryAdmin@123";
  const adminHash = await bcrypt.hash(adminPlain, 10);
  await upsertUser({
    email: "delivery.admin.demo@meeramoot.test",
    username: "delivery_admin_demo",
    name: "Delivery Ops Admin",
    phone: "01700000003",
    role: UserRole.DELIVERY_ADMIN,
    passwordHash: adminHash,
  });

  const zone = await prisma.coverageZone.upsert({
    where: { id: "delivery-seed-dhaka-central-zone" },
    update: {
      name: "Dhaka Central Zone",
      city: "Dhaka",
      area: "Dhanmondi",
      postalCode: "1209",
      isActive: true,
    },
    create: {
      id: "delivery-seed-dhaka-central-zone",
      name: "Dhaka Central Zone",
      city: "Dhaka",
      area: "Dhanmondi",
      postalCode: "1209",
      isActive: true,
    },
  });

  await prisma.riderCoverage.upsert({
    where: {
      riderProfileId_coverageZoneId: {
        riderProfileId: rider.id,
        coverageZoneId: zone.id,
      },
    },
    update: {},
    create: {
      riderProfileId: rider.id,
      coverageZoneId: zone.id,
    },
  });

  await prisma.riderCoverage.upsert({
    where: {
      riderProfileId_coverageZoneId: {
        riderProfileId: providedRider.id,
        coverageZoneId: zone.id,
      },
    },
    update: {},
    create: {
      riderProfileId: providedRider.id,
      coverageZoneId: zone.id,
    },
  });

  const shop = await prisma.shop.upsert({
    where: { slug: "delivery-demo-service-center" },
    update: {
      name: "Delivery Demo Service Center",
      address: "Road 2, Dhanmondi, Dhaka",
      city: "Dhaka",
      area: "Dhanmondi",
      supportsPickup: true,
      freeDelivery: false,
    },
    create: {
      name: "Delivery Demo Service Center",
      slug: "delivery-demo-service-center",
      address: "Road 2, Dhanmondi, Dhaka",
      city: "Dhaka",
      area: "Dhanmondi",
      supportsPickup: true,
      freeDelivery: false,
      categories: ["IN_SHOP_REPAIR", "COURIER_PICKUP"],
      specialties: ["Washing Machine", "Microwave Oven"],
    },
  });

  let repairRequest = await prisma.repairRequest.findFirst({
    where: {
      userId: customer.id,
      title: "Delivery workflow demo request",
    },
  });

  if (!repairRequest) {
    repairRequest = await prisma.repairRequest.create({
      data: {
        userId: customer.id,
        source: RequestSource.DIRECT_SERVICE,
        requestedShopId: shop.id,
        title: "Delivery workflow demo request",
        description: "Sample repair request for delivery testing",
        deviceType: "Washing Machine",
        brand: "Samsung",
        model: "WW80J42G0KW",
        issueCategory: "Drum Noise",
        problem: "Drum makes loud noise while spinning",
        imageUrls: [],
        mode: RequestMode.CHECKUP_AND_REPAIR,
        status: RequestStatus.PICKUP_SCHEDULED,
        preferredPickup: true,
        deliveryType: DeliveryType.REGULAR,
        contactPhone: customer.phone,
        pickupAddress: "House 10, Road 7, Dhanmondi, Dhaka",
        dropoffAddress: "Road 2, Dhanmondi, Dhaka",
      },
    });
  } else {
    repairRequest = await prisma.repairRequest.update({
      where: { id: repairRequest.id },
      data: {
        status: RequestStatus.PICKUP_SCHEDULED,
        preferredPickup: true,
        deliveryType: DeliveryType.REGULAR,
        pickupAddress: "House 10, Road 7, Dhanmondi, Dhaka",
        dropoffAddress: "Road 2, Dhanmondi, Dhaka",
      },
    });
  }

  const repairJob = await prisma.repairJob.upsert({
    where: { repairRequestId: repairRequest.id },
    update: {
      shopId: shop.id,
      status: RepairJobStatus.PICKUP_SCHEDULED,
      diagnosisNotes: "Demo job for delivery workflow",
    },
    create: {
      repairRequestId: repairRequest.id,
      shopId: shop.id,
      status: RepairJobStatus.PICKUP_SCHEDULED,
      diagnosisNotes: "Demo job for delivery workflow",
    },
  });

  const existingToShop = await prisma.delivery.findFirst({
    where: {
      repairJobId: repairJob.id,
      direction: DeliveryDirection.TO_SHOP,
    },
  });

  if (existingToShop) {
    await prisma.delivery.update({
      where: { id: existingToShop.id },
      data: {
        deliveryAgentId: rider.id,
        coverageZoneId: zone.id,
        type: DeliveryType.REGULAR,
        status: DeliveryStatus.SCHEDULED,
        partnerName: "Meeramoot Logistics",
        trackingCode: "MM-TO-SHOP-001",
        riderName: deliveryUser.name,
        riderPhone: deliveryUser.phone,
        pickupAddress: "House 10, Road 7, Dhanmondi, Dhaka",
        dropAddress: "Road 2, Dhanmondi, Dhaka",
        fee: 150,
        distanceKm: 4.2,
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
  } else {
    await prisma.delivery.create({
      data: {
        repairJobId: repairJob.id,
        deliveryAgentId: rider.id,
        coverageZoneId: zone.id,
        direction: DeliveryDirection.TO_SHOP,
        type: DeliveryType.REGULAR,
        status: DeliveryStatus.SCHEDULED,
        partnerName: "Meeramoot Logistics",
        trackingCode: "MM-TO-SHOP-001",
        riderName: deliveryUser.name ?? "Delivery Agent Demo",
        riderPhone: deliveryUser.phone ?? "01700000002",
        pickupAddress: "House 10, Road 7, Dhanmondi, Dhaka",
        dropAddress: "Road 2, Dhanmondi, Dhaka",
        fee: 150,
        distanceKm: 4.2,
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
  }

  const existingToCustomer = await prisma.delivery.findFirst({
    where: {
      repairJobId: repairJob.id,
      direction: DeliveryDirection.TO_CUSTOMER,
    },
  });

  if (existingToCustomer) {
    await prisma.delivery.update({
      where: { id: existingToCustomer.id },
      data: {
        deliveryAgentId: rider.id,
        coverageZoneId: zone.id,
        type: DeliveryType.REGULAR,
        status: DeliveryStatus.PENDING,
        partnerName: "Meeramoot Logistics",
        trackingCode: "MM-TO-CUSTOMER-001",
        riderName: deliveryUser.name,
        riderPhone: deliveryUser.phone,
        pickupAddress: "Road 2, Dhanmondi, Dhaka",
        dropAddress: "House 10, Road 7, Dhanmondi, Dhaka",
        fee: 170,
        distanceKm: 4.2,
      },
    });
  } else {
    await prisma.delivery.create({
      data: {
        repairJobId: repairJob.id,
        deliveryAgentId: rider.id,
        coverageZoneId: zone.id,
        direction: DeliveryDirection.TO_CUSTOMER,
        type: DeliveryType.REGULAR,
        status: DeliveryStatus.PENDING,
        partnerName: "Meeramoot Logistics",
        trackingCode: "MM-TO-CUSTOMER-001",
        riderName: deliveryUser.name ?? "Delivery Agent Demo",
        riderPhone: deliveryUser.phone ?? "01700000002",
        pickupAddress: "Road 2, Dhanmondi, Dhaka",
        dropAddress: "House 10, Road 7, Dhanmondi, Dhaka",
        fee: 170,
        distanceKm: 4.2,
      },
    });
  }

  const extraRequests = [
    {
      title: "Microwave no heating",
      deviceType: "Microwave Oven",
      issueCategory: "Not Heating",
      problem: "Starts normally but does not heat food",
      pickupAddress: "House 22, Road 5, Dhanmondi, Dhaka",
      toShopTracking: "MM-TO-SHOP-002",
      toCustomerTracking: "MM-TO-CUSTOMER-002",
      fee: 130,
    },
    {
      title: "Refrigerator cooling issue",
      deviceType: "Refrigerator",
      issueCategory: "Cooling Problem",
      problem: "Upper section is not cooling enough",
      pickupAddress: "House 7, Road 11, Dhanmondi, Dhaka",
      toShopTracking: "MM-TO-SHOP-003",
      toCustomerTracking: "MM-TO-CUSTOMER-003",
      fee: 190,
    },
    {
      title: "Air conditioner water leak",
      deviceType: "Air Conditioner",
      issueCategory: "Water Leakage",
      problem: "Indoor unit leaking water continuously",
      pickupAddress: "House 15, Road 3, Mohammadpur, Dhaka",
      toShopTracking: "MM-TO-SHOP-004",
      toCustomerTracking: "MM-TO-CUSTOMER-004",
      fee: 210,
    },
    {
      title: "Electric oven not turning on",
      deviceType: "Electric Oven",
      issueCategory: "Power Issue",
      problem: "No power after pressing start",
      pickupAddress: "House 42, Road 9, Dhanmondi, Dhaka",
      toShopTracking: "MM-TO-SHOP-005",
      toCustomerTracking: "MM-TO-CUSTOMER-005",
      fee: 160,
    },
    {
      title: "Water purifier filter warning",
      deviceType: "Water Purifier",
      issueCategory: "Filter Alert",
      problem: "Filter warning remains after replacement",
      pickupAddress: "House 9, Lake Circus, Kalabagan, Dhaka",
      toShopTracking: "MM-TO-SHOP-006",
      toCustomerTracking: "MM-TO-CUSTOMER-006",
      fee: 140,
    },
  ];

  for (const item of extraRequests) {
    let rr = await prisma.repairRequest.findFirst({
      where: {
        userId: customer.id,
        title: item.title,
      },
    });

    if (!rr) {
      rr = await prisma.repairRequest.create({
        data: {
          userId: customer.id,
          source: RequestSource.DIRECT_SERVICE,
          requestedShopId: shop.id,
          title: item.title,
          description: `Seeded delivery demo request: ${item.title}`,
          deviceType: item.deviceType,
          brand: "Generic",
          model: "Demo Model",
          issueCategory: item.issueCategory,
          problem: item.problem,
          imageUrls: [],
          mode: RequestMode.CHECKUP_AND_REPAIR,
          status: RequestStatus.PICKUP_SCHEDULED,
          preferredPickup: true,
          deliveryType: DeliveryType.REGULAR,
          contactPhone: customer.phone,
          pickupAddress: item.pickupAddress,
          dropoffAddress: shop.address,
        },
      });
    }

    const rj = await prisma.repairJob.upsert({
      where: { repairRequestId: rr.id },
      update: {
        shopId: shop.id,
        status: RepairJobStatus.PICKUP_SCHEDULED,
      },
      create: {
        repairRequestId: rr.id,
        shopId: shop.id,
        status: RepairJobStatus.PICKUP_SCHEDULED,
      },
    });

    const toShop = await prisma.delivery.findFirst({
      where: {
        repairJobId: rj.id,
        direction: DeliveryDirection.TO_SHOP,
      },
    });

    if (toShop) {
      await prisma.delivery.update({
        where: { id: toShop.id },
        data: {
          deliveryAgentId: null,
          coverageZoneId: zone.id,
          direction: DeliveryDirection.TO_SHOP,
          type: DeliveryType.REGULAR,
          status: DeliveryStatus.PENDING,
          partnerName: "Meeramoot Logistics",
          trackingCode: item.toShopTracking,
          riderName: null,
          riderPhone: null,
          pickupAddress: item.pickupAddress,
          dropAddress: shop.address,
          fee: item.fee,
          distanceKm: 3.8,
          scheduledAt: null,
          dispatchedAt: null,
          pickedUpAt: null,
          deliveredAt: null,
          cancellationReason: null,
        },
      });
    } else {
      await prisma.delivery.create({
        data: {
          repairJobId: rj.id,
          deliveryAgentId: null,
          coverageZoneId: zone.id,
          direction: DeliveryDirection.TO_SHOP,
          type: DeliveryType.REGULAR,
          status: DeliveryStatus.PENDING,
          partnerName: "Meeramoot Logistics",
          trackingCode: item.toShopTracking,
          pickupAddress: item.pickupAddress,
          dropAddress: shop.address,
          fee: item.fee,
          distanceKm: 3.8,
        },
      });
    }

    const toCustomer = await prisma.delivery.findFirst({
      where: {
        repairJobId: rj.id,
        direction: DeliveryDirection.TO_CUSTOMER,
      },
    });

    if (toCustomer) {
      await prisma.delivery.update({
        where: { id: toCustomer.id },
        data: {
          deliveryAgentId: null,
          coverageZoneId: zone.id,
          direction: DeliveryDirection.TO_CUSTOMER,
          type: DeliveryType.REGULAR,
          status: DeliveryStatus.PENDING,
          partnerName: "Meeramoot Logistics",
          trackingCode: item.toCustomerTracking,
          riderName: null,
          riderPhone: null,
          pickupAddress: shop.address,
          dropAddress: item.pickupAddress,
          fee: item.fee + 20,
          distanceKm: 3.8,
          scheduledAt: null,
          dispatchedAt: null,
          pickedUpAt: null,
          deliveredAt: null,
          cancellationReason: null,
        },
      });
    } else {
      await prisma.delivery.create({
        data: {
          repairJobId: rj.id,
          deliveryAgentId: null,
          coverageZoneId: zone.id,
          direction: DeliveryDirection.TO_CUSTOMER,
          type: DeliveryType.REGULAR,
          status: DeliveryStatus.PENDING,
          partnerName: "Meeramoot Logistics",
          trackingCode: item.toCustomerTracking,
          pickupAddress: shop.address,
          dropAddress: item.pickupAddress,
          fee: item.fee + 20,
          distanceKm: 3.8,
        },
      });
    }
  }

  console.log("Delivery workflow demo data is ready.");
  console.log("Delivery partner login:");
  console.log("  identifier: delivery.agent.demo@meeramoot.test");
  console.log(`  password: ${plainPassword}`);
  console.log("  identifier: delivery147l");
  console.log(`  password: ${providedRiderPassword}`);
  console.log("Delivery admin login (separate portal /delivery-admin):");
  console.log("  identifier: delivery.admin.demo@meeramoot.test");
  console.log(`  password: ${adminPlain}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
