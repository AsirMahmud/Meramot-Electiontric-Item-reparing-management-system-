import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import prisma from "../models/prisma.js";

interface DeliveryAdminJwtPayload {
  sub: string;
  aud?: string;
}

export async function requireDeliveryAdminAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ message: "Missing delivery admin authorization token" });
  }

  try {
    let decoded: any;
    let isAdmin = false;

    try {
      decoded = jwt.verify(token, env.jwtSecretDeliveryAdmin) as DeliveryAdminJwtPayload;
      if (decoded.aud !== "delivery_admin" || !decoded.sub) {
        throw new Error("Invalid delivery admin token");
      }
    } catch {
      // Fallback: Check if it's a standard Main Admin token
      decoded = jwt.verify(token, env.jwtSecret) as any;
      if (!decoded.id && !decoded.sub) {
        throw new Error("Invalid admin token");
      }
      isAdmin = true;
    }

    const userId = decoded.sub || decoded.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "DELIVERY_ADMIN")) {
      return res.status(403).json({ message: "Delivery admin access denied" });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ message: "Account is not active" });
    }

    req.deliveryAdminAuth = { userId: user.id };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired authorization token" });
  }
}
