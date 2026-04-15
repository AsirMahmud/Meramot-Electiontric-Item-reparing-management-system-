import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import prisma from "../models/prisma.js";

interface DeliveryJwtPayload {
  sub: string;
  aud?: string;
}

export async function requireDeliveryAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ message: "Missing delivery authorization token" });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecretDelivery) as DeliveryJwtPayload;
    if (decoded.aud !== "delivery" || !decoded.sub) {
      return res.status(401).json({ message: "Invalid delivery token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, role: true },
    });

    if (!user || user.role !== "DELIVERY") {
      return res.status(403).json({ message: "Delivery access denied" });
    }

    const rider = await prisma.riderProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, isActive: true, registrationStatus: true },
    });

    if (!rider) {
      return res.status(403).json({ message: "Delivery account incomplete" });
    }

    if (!rider.isActive) {
      return res.status(403).json({ message: "Delivery account is suspended" });
    }

    req.deliveryAuth = {
      userId: user.id,
      riderProfileId: rider.id,
      registrationStatus: rider.registrationStatus,
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired delivery token" });
  }
}

/** Blocks partners until an admin approves registration (GET /me is exempt). */
export function requireApprovedDeliveryPartner(req: Request, res: Response, next: NextFunction) {
  const status = req.deliveryAuth?.registrationStatus;
  if (status !== "APPROVED") {
    return res.status(403).json({
      message:
        status === "PENDING"
          ? "Delivery partner registration is pending admin approval"
          : "Delivery partner registration is not approved",
    });
  }
  return next();
}
