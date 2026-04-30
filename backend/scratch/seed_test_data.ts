import prisma from "../src/models/prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  try {
    console.log("Seeding test data...");

    const passwordHash = await bcrypt.hash("Password123!", 10);

    // 1. Create extra users if they don't exist
    const userEmails = ["asir.test@gmail.com", "mustahid.test@gmail.com", "siam.test@gmail.com"];
    const users = [];
    
    for (const email of userEmails) {
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            username: email.split("@")[0],
            name: email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1),
            passwordHash,
            role: "CUSTOMER",
            isEmailVerified: true,
          }
        });
      }
      users.push(user);
    }

    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const shops = await prisma.shop.findMany({ take: 5 });

    if (!admin || shops.length === 0) {
      console.error("Missing admin or shops. Run basic seed first.");
      return;
    }

    // 2. Create Repair Requests
    console.log("Creating repair requests...");
    const requests = [];
    for (let i = 0; i < 5; i++) {
      const user = users[i % users.length];
      const shop = shops[i % shops.length];
      const req = await prisma.repairRequest.create({
        data: {
          userId: user.id,
          requestedShopId: shop.id,
          title: `Repair for ${["iPhone 13", "MacBook Air", "Sony TV", "Microwave", "Washing Machine"][i]}`,
          problem: `The ${["screen is cracked", "battery is dead", "power button doesn't work", "makes a weird noise", "doesn't turn on"][i]}`,
          deviceType: ["MOBILE", "LAPTOP", "TV", "APPLIANCE", "APPLIANCE"][i],
          mode: "DIRECT_REPAIR",
          status: "COMPLETED",
        }
      });
      requests.push(req);
    }

    // 3. Create Payments
    console.log("Creating payments...");
    const payments = [];
    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];
      const payment = await prisma.payment.create({
        data: {
          userId: req.userId,
          repairRequestId: req.id,
          amount: 1500 + (i * 500),
          currency: "BDT",
          method: "SSLCOMMERZ",
          status: i === 4 ? "PENDING" : "PAID",
          transactionRef: `TRX-${Math.random().toString(36).substring(7).toUpperCase()}`,
          paidAt: i === 4 ? null : new Date(),
          escrowStatus: i === 0 ? "HELD" : i === 1 ? "RELEASED" : "NOT_APPLICABLE",
        }
      });
      payments.push(payment);
    }

    // 4. Create Support Tickets
    console.log("Creating support tickets...");
    const tickets = [];
    const subjects = [
      "Delayed repair",
      "Refund request",
      "Wrong parts used",
      "Payment failed but money deducted",
      "General inquiry"
    ];
    for (let i = 0; i < 5; i++) {
      const user = users[i % users.length];
      const ticket = await prisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: subjects[i],
          message: `This is a test message for ${subjects[i].toLowerCase()}. Please help me ASAP.`,
          status: i === 0 ? "OPEN" : i === 1 ? "IN_PROGRESS" : "RESOLVED",
          priority: i % 2 === 0 ? "HIGH" : "NORMAL",
          repairRequestId: requests[i].id,
        }
      });
      tickets.push(ticket);
    }

    // 5. Create Disputes
    console.log("Creating disputes...");
    for (let i = 0; i < 3; i++) {
      const payment = payments[i];
      const ticket = tickets[i];
      await prisma.disputeCase.create({
        data: {
          openedById: payment.userId,
          paymentId: payment.id,
          supportTicketId: ticket.id,
          repairRequestId: payment.repairRequestId,
          status: i === 0 ? "OPEN" : "INVESTIGATING",
        }
      });
    }

    console.log("Successfully seeded test data!");
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
