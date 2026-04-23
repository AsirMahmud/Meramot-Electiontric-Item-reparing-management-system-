import type { Response } from "express";
import prisma from "../models/prisma.js";
import type { AuthenticatedRequest as AuthedRequest } from "../middleware/require-auth.js";

export async function getProfile(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        avatarUrl: true,
        address: true,
        city: true,
        area: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateProfile(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name, phone, address, city, area } = req.body as Record<string, string | undefined>;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        area: area?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        avatarUrl: true,
        address: true,
        city: true,
        area: true,
        updatedAt: true,
      },
    });

    return res.json({ message: "Profile updated", user });
  } catch (error) {
    console.error("updateProfile error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
