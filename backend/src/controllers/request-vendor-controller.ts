import { RequestStatus, RepairJobStatus } from "@prisma/client";
import type { Response } from "express";
import prisma from "../models/prisma.js";
import type { AuthenticatedRequest as AuthedRequest } from "../middleware/require-auth.js";
import { sendOrderStatusEmail } from "../services/email-service.js";

export async function acceptBid(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const requestId = String(req.params.requestId);
    const bidId = String(req.params.bidId);

    const existingRequest = await prisma.repairRequest.findFirst({
      where: {
        id: requestId,
        userId,
      },
      include: {
        repairJob: true,
      },
    });

    if (!existingRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (existingRequest.repairJob || (existingRequest.status !== RequestStatus.PENDING && existingRequest.status !== RequestStatus.BIDDING)) {
      return res.status(400).json({ message: "Request already has an assigned job or is not in bidding" });
    }

    const bidToAccept = await prisma.bid.findFirst({
      where: {
        id: bidId,
        repairRequestId: requestId,
        status: "ACTIVE",
      },
      include: {
        shop: true,
      },
    });

    if (!bidToAccept) {
      return res.status(404).json({ message: "Valid bid not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create RepairJob
      const repairJob = await tx.repairJob.create({
        data: {
          repairRequestId: requestId,
          shopId: bidToAccept.shopId,
          acceptedBidId: bidId,
          status: RepairJobStatus.CREATED,
        },
      });

      // 2. Update Request Status
      const request = await tx.repairRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.ASSIGNED,
          requestedShopId: bidToAccept.shopId,
        },
      });

      // 3. Mark other bids as rejected
      await tx.bid.updateMany({
        where: {
          repairRequestId: requestId,
          id: { not: bidId },
        },
        data: {
          status: "DECLINED",
        },
      });

      // 4. Update accepted bid status to WON
      await tx.bid.update({
        where: { id: bidId },
        data: {
          status: "ACCEPTED",
        },
      });

      return { repairJob, request };
    });

    // Notify user via email if they have one
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      await sendOrderStatusEmail({
        to: user.email,
        customerName: user.name,
        orderTitle: existingRequest.id,
        status: RequestStatus.ASSIGNED,
        shopName: bidToAccept.shop.name,
      }).catch((error) => console.error("accept bid email failed", error));
    }

    return res.status(200).json({
      message: "Bid accepted successfully",
      repairJob: result.repairJob,
      request: result.request,
    });
  } catch (error) {
    console.error("acceptBid error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function createSupportTicket(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const requestId = String(req.params.requestId);
    const { subject, message } = req.body;

    if (!subject || !message) return res.status(400).json({ message: "Subject and message are required" });

    const existingRequest = await prisma.repairRequest.findFirst({
      where: { id: requestId, userId },
      include: { repairJob: true },
    });

    if (!existingRequest) return res.status(404).json({ message: "Request not found" });

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        repairRequestId: requestId,
        repairJobId: existingRequest.repairJob?.id,
        shopId: existingRequest.repairJob?.shopId,
        subject: String(subject),
        message: String(message),
      },
    });

    return res.status(201).json({ message: "Support ticket created", ticket });
  } catch (error) {
    console.error("createSupportTicket error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function createDispute(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const requestId = String(req.params.requestId);
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ message: "Dispute reason is required" });

    const existingRequest = await prisma.repairRequest.findFirst({
      where: { id: requestId, userId },
      include: { repairJob: true },
    });

    if (!existingRequest) return res.status(404).json({ message: "Request not found" });
    if (!existingRequest.repairJob) return res.status(400).json({ message: "Cannot dispute a request without a repair job" });

    // Find the shop owner (againstId)
    const shopStaff = await prisma.shopStaff.findFirst({
      where: { shopId: existingRequest.repairJob.shopId, role: "OWNER" }
    });

    const disputeId = `cm${Math.random().toString(36).substring(2, 15)}`;
    
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DisputeCase" (id, "repairRequestId", "openedById", "againstId", status, "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5::"DisputeStatus", NOW(), NOW())`,
      disputeId,
      requestId,
      userId,
      shopStaff?.userId || existingRequest.repairJob.shopId,
      "OPEN"
    );

    // Create the initial note containing the reason
    await prisma.disputeNote.create({
      data: {
        disputeCaseId: disputeId,
        authorId: userId,
        note: String(reason),
      }
    });

    return res.status(201).json({ message: "Dispute created successfully" });
  } catch (error) {
    console.error("createDispute error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
