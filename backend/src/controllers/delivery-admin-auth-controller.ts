import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../models/prisma.js";
import { env } from "../config/env.js";

function signDeliveryAdminToken(user: { id: string; username: string; email: string }) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email,
      aud: "delivery_admin",
    },
    env.jwtSecretDeliveryAdmin,
    { expiresIn: "8h" },
  );
}

export async function deliveryAdminLogin(req: Request, res: Response) {
  try {
    const { identifier, password } = req.body as {
      identifier?: string;
      password?: string;
    };

    if (!identifier || !password) {
      return res.status(400).json({
        message: "identifier and password are required",
      });
    }

    const cleanIdentifier = identifier.trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanIdentifier.toLowerCase() }, { username: cleanIdentifier }],
      },
    });

    if (!user || user.role !== "DELIVERY_ADMIN") {
      return res.status(401).json({ message: "Invalid delivery admin credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return res.status(401).json({ message: "Invalid delivery admin credentials" });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ message: "Delivery admin account is not active" });
    }

    const token = signDeliveryAdminToken(user);

    return res.json({
      message: "Delivery admin login successful",
      token,
      tokenType: "delivery_admin",
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("deliveryAdminLogin error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function getDeliveryAdminMe(req: Request, res: Response) {
  try {
    const userId = req.deliveryAdminAuth?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (error) {
    console.error("getDeliveryAdminMe error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
