// @ts-nocheck
import {
  BidStatus,
  DeliveryType,
  RepairJobStatus,
  RequestMode,
  RequestStatus,
} from "@prisma/client";
import type { Response } from "express";
import prisma from "../models/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { sendOrderStatusEmail } from "../services/email-service.js";
import { sendSms } from "../services/sms-service.js";
import { sendGmailApiEmail } from "../services/gmail-api-service.js";

function normalizeRequestStatus(status?: string): RequestStatus | undefined {
  if (!status) return undefined;
  return Object.values(RequestStatus).includes(status as RequestStatus)
    ? (status as RequestStatus)
    : undefined;
}

function normalizeDeliveryType(input?: string): DeliveryType | null {
  if (!input) return null;
  return Object.values(DeliveryType).includes(input as DeliveryType)
    ? (input as DeliveryType)
    : null;
}

function normalizeRequestMode(input?: string): RequestMode {
  if (input && Object.values(RequestMode).includes(input as RequestMode)) {
    return input as RequestMode;
  }
  return RequestMode.CHECKUP_AND_REPAIR;
}

function normalizeQuoteResponseAction(input?: string) {
  const action = (input || "").trim().toUpperCase();
  if (action === "ACCEPT" || action === "DECLINE") {
    return action;
  }
  return null;
}

export async function createRepairRequest(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      title,
      description,
      deviceType,
      brand,
      model,
      issueCategory,
      problem,
      mode,
      preferredPickup,
      deliveryType,
      shopSlug,
      imageUrls,
    } = req.body as Record<string, any>;

    if (!title || !deviceType || !problem) {
      return res
        .status(400)
        .json({ message: "title, deviceType and problem are required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    const trimmedShopSlug = typeof shopSlug === "string" ? shopSlug.trim() : "";
    const isDirectFlow = Boolean(trimmedShopSlug);

    let matchedShop: null | { id: string; name: string; slug: string } = null;

    if (isDirectFlow) {
      matchedShop = await prisma.shop.findFirst({
        where: {
          slug: trimmedShopSlug,
          isActive: true,
        },
        select: { id: true, name: true, slug: true },
      });

      if (!matchedShop) {
        return res.status(404).json({ message: "Selected shop was not found" });
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const request = await tx.repairRequest.create({
        data: {
          userId,
          title: String(title).trim(),
          description: typeof description === "string" ? description.trim() : null,
          deviceType: String(deviceType).trim(),
          brand: typeof brand === "string" ? brand.trim() : null,
          model: typeof model === "string" ? model.trim() : null,
          issueCategory: typeof issueCategory === "string" ? issueCategory.trim() : null,
          problem: String(problem).trim(),
          imageUrls: Array.isArray(imageUrls) ? imageUrls.filter(u => typeof u === "string").slice(0, 4) : [],
          mode: normalizeRequestMode(typeof mode === "string" ? mode : undefined),
          preferredPickup: Boolean(preferredPickup),
          deliveryType: normalizeDeliveryType(
            typeof deliveryType === "string" ? deliveryType : undefined,
          ),
          status: isDirectFlow ? RequestStatus.PENDING : RequestStatus.BIDDING,
        },
      });

      let repairJob = null;

      if (isDirectFlow && matchedShop) {
        repairJob = await tx.repairJob.create({
          data: {
            repairRequestId: request.id,
            shopId: matchedShop.id,
            status: RepairJobStatus.CREATED,
          },
          select: {
            id: true,
            status: true,
            shop: { select: { id: true, name: true, slug: true } },
          },
        });
      }

      return { request, repairJob };
    });

    if (user?.email) {
      await sendOrderStatusEmail({
        to: user.email,
        customerName: user.name,
        orderRef: created.request.title,
        status: created.request.status,
        shopName: matchedShop?.name,
      }).catch((error) => console.error("request created email failed", error));
    }

    // Send SMS and Email to matching vendors for marketplace requests
    if (!isDirectFlow) {
      const keywords = [
        String(deviceType).trim(),
        typeof brand === "string" ? brand.trim() : "",
        typeof issueCategory === "string" ? issueCategory.trim() : ""
      ].filter(Boolean);

      if (keywords.length > 0) {
        const matchingShops = await prisma.shop.findMany({
          where: {
            isActive: true,
            liveNotificationsEnabled: true,
            specialties: { hasSome: keywords }
          },
          select: { phone: true, name: true, email: true }
        });

        // Fire and forget
        matchingShops.forEach((shop) => {
          const message = `Meramot: New repair request posted for ${keywords[0]}. Log in to your vendor dashboard to place your bid!`;
          if (shop.phone) {
            sendSms(shop.phone, message).catch(() => {});
          }
          if (shop.email) {
            sendGmailApiEmail({
              to: shop.email,
              subject: "New Relevant Repair Request - Meramot",
              html: `<p>Hello ${shop.name},</p><p>A new repair request matching your skills (${keywords[0]}) has just been posted on Meramot.</p><p><a href="https://meramot.com/vendor/dashboard">Log in to your dashboard</a> to place a bid now!</p>`
            }).catch(() => {});
          }
        });
      }
    } else if (isDirectFlow && matchedShop) {
      const directShop = await prisma.shop.findUnique({
        where: { id: matchedShop.id },
        select: { phone: true, email: true, name: true }
      });
      if (directShop?.phone) {
        sendSms(directShop.phone, `You have a new direct repair request: ${title}. Please check your dashboard.`).catch(() => {});
      }
      if (directShop?.email) {
        sendGmailApiEmail({
          to: directShop.email,
          subject: "New Direct Repair Request - Meramot",
          html: `<p>Hello ${directShop.name || "Vendor"},</p><p>You have received a new direct repair request: <b>${title}</b>.</p><p><a href="https://meramot.com/vendor/dashboard">Log in to your dashboard</a> to review it.</p>`
        }).catch(() => {});
      }
    }

    return res.status(201).json({
      message: isDirectFlow
        ? "Direct repair request created"
        : "Marketplace repair request created and opened for bidding",
      request: created.request,
      matchedShop,
      repairJob: created.repairJob,
    });
  } catch (error) {
    console.error("createRepairRequest error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function listMyRequests(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const status = normalizeRequestStatus(
      typeof (req.query.status as string) === "string" ? (req.query.status as string) : undefined,
    );

    const requests = await prisma.repairRequest.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        deviceType: true,
        brand: true,
        model: true,
        issueCategory: true,
        problem: true,
        mode: true,
        source: true,
        status: true,
        preferredPickup: true,
        deliveryType: true,
        quotedFinalAmount: true,
        approvedAt: true,
        rejectedAt: true,
        createdAt: true,
        updatedAt: true,
        bids: {
          orderBy: [{ status: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            partsCost: true,
            laborCost: true,
            totalCost: true,
            estimatedDays: true,
            notes: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            shop: {
              select: {
                id: true,
                name: true,
                slug: true,
                specialties: true,
                ratingAvg: true,
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            amount: true,
            currency: true,
            method: true,
            status: true,
            transactionRef: true,
            paidAt: true,
            createdAt: true,
            refunds: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                amount: true,
                reason: true,
                status: true,
                processedAt: true,
                createdAt: true,
              },
            },
          },
        },
        disputeCases: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            resolution: true,
            resolvedAt: true,
            createdAt: true,
          },
        },
        supportTickets: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
          },
        },
        repairJob: {
          select: {
            id: true,
            status: true,
            diagnosisNotes: true,
            finalQuotedAmount: true,
            finalQuoteItems: true,
            customerApproved: true,
            startedAt: true,
            completedAt: true,
            acceptedBid: {
              select: {
                id: true,
                partsCost: true,
                laborCost: true,
                totalCost: true,
                estimatedDays: true,
                notes: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            shop: {
              select: {
                id: true,
                name: true,
                slug: true,
                ratingAvg: true,
              },
            },
            deliveries: {
              orderBy: { createdAt: "desc" },
              take: 2,
              select: {
                id: true,
                direction: true,
                status: true,
                riderName: true,
                riderPhone: true,
                trackingCode: true,
                scheduledAt: true,
              },
            },
          },
        },
      },
    });

    return res.json(requests);
  } catch (error) {
    console.error("listMyRequests error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function acceptRequestBid(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { requestId, bidId } = req.params;

    const existingRequest = await prisma.repairRequest.findFirst({
      where: {
        id: requestId,
        userId,
      },
      select: {
        id: true,
        title: true,
        status: true,
        user: { select: { email: true, name: true } },
        repairJob: { select: { id: true } },
      },
    });

    if (!existingRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (existingRequest.status !== RequestStatus.BIDDING) {
      return res.status(400).json({ message: "This request is no longer in bidding" });
    }

    const selectedBid = await prisma.bid.findFirst({
      where: {
        id: bidId,
        repairRequestId: requestId,
      },
      select: {
        id: true,
        shopId: true,
        status: true,
        shop: { select: { name: true } },
      },
    });

    if (!selectedBid) {
      return res.status(404).json({ message: "Bid not found" });
    }

    if (selectedBid.status !== BidStatus.ACTIVE) {
      return res.status(400).json({ message: "Only active bids can be accepted" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const acceptedBid = await tx.bid.update({
        where: { id: bidId },
        data: { status: BidStatus.ACCEPTED },
        select: {
          id: true,
          partsCost: true,
          laborCost: true,
          totalCost: true,
          estimatedDays: true,
          notes: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Delete all losing bids from DB — vendors will only see the winner
      await tx.bid.deleteMany({
        where: {
          repairRequestId: requestId,
          id: { not: bidId },
        },
      });

      const repairJob = existingRequest.repairJob?.id
        ? await tx.repairJob.update({
            where: { id: existingRequest.repairJob.id },
            data: {
              shopId: selectedBid.shopId,
              acceptedBidId: bidId,
              status: RepairJobStatus.CREATED,
            },
            select: {
              id: true,
              status: true,
              shop: { select: { id: true, name: true, slug: true } },
            },
          })
        : await tx.repairJob.create({
            data: {
              repairRequestId: requestId,
              shopId: selectedBid.shopId,
              acceptedBidId: bidId,
              status: RepairJobStatus.CREATED,
            },
            select: {
              id: true,
              status: true,
              shop: { select: { id: true, name: true, slug: true } },
            },
          });

      const request = await tx.repairRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.ASSIGNED,
          approvedAt: new Date(),
          rejectedAt: null,
        },
        select: {
          id: true,
          status: true,
          approvedAt: true,
        },
      });

      return { acceptedBid, repairJob, request };
    });

    if (existingRequest.user.email) {
      await sendOrderStatusEmail({
        to: existingRequest.user.email,
        customerName: existingRequest.user.name,
        orderRef: existingRequest.title,
        status: result.request.status,
        shopName: selectedBid.shop.name,
      }).catch((error) => console.error("accept bid email failed", error));
    }

    // Send SMS to vendor whose bid was accepted
    const acceptedVendorShop = await prisma.shop.findUnique({
      where: { id: selectedBid.shopId },
      select: { phone: true, name: true }
    });

    if (acceptedVendorShop?.phone) {
      sendSms(
        acceptedVendorShop.phone,
        `Congratulations! Your bid for "${existingRequest.title}" was accepted. Please prepare for the device.`
      ).catch(() => {});
    }

    return res.json({
      message: "Bid accepted and repair job assigned",
      request: result.request,
      acceptedBid: result.acceptedBid,
      repairJob: result.repairJob,
    });
  } catch (error) {
    console.error("acceptRequestBid error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function declineRequestBid(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { requestId, bidId } = req.params;

    const existingRequest = await prisma.repairRequest.findFirst({
      where: {
        id: requestId,
        userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (existingRequest.status !== RequestStatus.BIDDING) {
      return res.status(400).json({ message: "This request is no longer in bidding" });
    }

    const bid = await prisma.bid.findFirst({
      where: {
        id: bidId,
        repairRequestId: requestId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!bid) {
      return res.status(404).json({ message: "Bid not found" });
    }

    if (bid.status !== BidStatus.ACTIVE) {
      return res.status(400).json({ message: "Only active bids can be declined" });
    }

    const updatedBid = await prisma.bid.update({
      where: { id: bidId },
      data: { status: BidStatus.DECLINED },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    return res.json({
      message: "Bid declined",
      bid: updatedBid,
    });
  } catch (error) {
    console.error("declineRequestBid error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function respondToFinalQuote(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { requestId } = req.params;
    const { action } = req.body as { action?: string };

    const normalizedAction = normalizeQuoteResponseAction(action);
    if (!normalizedAction) {
      return res.status(400).json({ message: "Action must be ACCEPT or DECLINE" });
    }

    const existingRequest = await prisma.repairRequest.findFirst({
      where: {
        id: requestId,
        userId,
      },
      select: {
        id: true,
        title: true,
        quotedFinalAmount: true,
        user: { select: { email: true, name: true } },
        repairJob: {
          select: {
            id: true,
            status: true,
            finalQuotedAmount: true,
            shop: { select: { name: true } },
          },
        },
      },
    });

    if (!existingRequest || !existingRequest.repairJob) {
      return res.status(404).json({ message: "Repair job not found for this request" });
    }

    if (existingRequest.repairJob.status !== RepairJobStatus.WAITING_APPROVAL) {
      return res.status(400).json({
        message: "There is no pending final quote awaiting your decision",
      });
    }

    const approved = normalizedAction === "ACCEPT";
    const nextRequestStatus = approved ? RequestStatus.REPAIRING : RequestStatus.REJECTED;
    const nextJobStatus = approved ? RepairJobStatus.REPAIRING : RepairJobStatus.CANCELLED;

    const result = await prisma.$transaction(async (tx) => {
      const repairJob = await tx.repairJob.update({
        where: { id: existingRequest.repairJob!.id },
        data: {
          customerApproved: approved,
          status: nextJobStatus,
          startedAt: approved ? new Date() : undefined,
        },
        select: {
          id: true,
          status: true,
          customerApproved: true,
          updatedAt: true,
        },
      });

      const request = await tx.repairRequest.update({
        where: { id: requestId },
        data: {
          status: nextRequestStatus,
          approvedAt: approved ? new Date() : undefined,
          rejectedAt: approved ? null : new Date(),
          quotedFinalAmount:
            existingRequest.repairJob?.finalQuotedAmount ?? existingRequest.quotedFinalAmount,
        },
        select: {
          id: true,
          status: true,
          approvedAt: true,
          rejectedAt: true,
          quotedFinalAmount: true,
        },
      });

      return { repairJob, request };
    });

    if (existingRequest.user.email) {
      await sendOrderStatusEmail({
        to: existingRequest.user.email,
        customerName: existingRequest.user.name,
        orderRef: existingRequest.title,
        status: result.request.status,
        shopName: existingRequest.repairJob.shop.name,
      }).catch((error) => console.error("final quote response email failed", error));
    }

    // Send SMS to vendor on quote response
    const repairJobShop = await prisma.shop.findFirst({
      where: { repairJobs: { some: { id: existingRequest.repairJob.id } } },
      select: { phone: true }
    });

    if (repairJobShop?.phone) {
      const responseText = approved ? "accepted" : "declined";
      sendSms(
        repairJobShop.phone,
        `The customer has ${responseText} your final quote for "${existingRequest.title}".`
      ).catch(() => {});
    }

    return res.json({
      message: approved
        ? "Final quote accepted. The vendor can continue with the repair."
        : "Final quote declined. The repair job has been closed.",
      request: result.request,
      repairJob: result.repairJob,
    });
  } catch (error) {
    console.error("respondToFinalQuote error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateRequestStatus(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { requestId } = req.params;
    const { status } = req.body as { status?: string };

    const nextStatus = normalizeRequestStatus(status);
    if (!nextStatus) {
      return res.status(400).json({ message: "Valid status is required" });
    }

    const existing = await prisma.repairRequest.findFirst({
      where: { id: requestId, userId },
      select: {
        id: true,
        title: true,
        user: { select: { email: true, name: true } },
        repairJob: { select: { id: true, shop: { select: { name: true } } } },
      },
    });

    if (!existing) return res.status(404).json({ message: "Request not found" });

    const updated = await prisma.$transaction(async (tx) => {
      const request = await tx.repairRequest.update({
        where: { id: requestId },
        data: { status: nextStatus },
      });

      if (existing.repairJob?.id) {
        const jobStatusMap: Partial<Record<RequestStatus, RepairJobStatus>> = {
          ASSIGNED: RepairJobStatus.CREATED,
          PICKUP_SCHEDULED: RepairJobStatus.PICKUP_SCHEDULED,
          PICKED_UP: RepairJobStatus.PICKED_UP,
          AT_SHOP: RepairJobStatus.AT_SHOP,
          DIAGNOSING: RepairJobStatus.DIAGNOSING,
          WAITING_APPROVAL: RepairJobStatus.WAITING_APPROVAL,
          REPAIRING: RepairJobStatus.REPAIRING,
          RETURNING: RepairJobStatus.RETURNING,
          COMPLETED: RepairJobStatus.COMPLETED,
          CANCELLED: RepairJobStatus.CANCELLED,
        };

        const mapped = jobStatusMap[nextStatus];
        if (mapped) {
          await tx.repairJob.update({
            where: { id: existing.repairJob.id },
            data: {
              status: mapped,
              ...(mapped === RepairJobStatus.COMPLETED
                ? { completedAt: new Date() }
                : {}),
            },
          });
        }
      }

      return request;
    });

    if (existing.user.email) {
      await sendOrderStatusEmail({
        to: existing.user.email,
        customerName: existing.user.name,
        orderRef: existing.title,
        status: updated.status,
        shopName: existing.repairJob?.shop.name,
      }).catch((error) => console.error("status email failed", error));
    }

    return res.json({ message: "Request status updated", request: updated });
  } catch (error) {
    console.error("updateRequestStatus error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
