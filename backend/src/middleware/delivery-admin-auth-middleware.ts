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
    const decoded = jwt.verify(token, env.jwtSecretDeliveryAdmin) as DeliveryAdminJwtPayload;
    if (decoded.aud !== "delivery_admin" || !decoded.sub) {
      return res.status(401).json({ message: "Invalid delivery admin token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, role: true, status: true },
    });

    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ message: "Delivery admin access denied" });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ message: "Delivery admin account is not active" });
    }

    req.deliveryAdminAuth = { userId: user.id };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired delivery admin token" });
  }
}
