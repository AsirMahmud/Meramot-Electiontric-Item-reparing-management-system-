import { Request, Response } from "express";
import prisma from "../models/prisma";

export const getShops = async (req: Request, res: Response) => {
  try {
    const shops = await prisma.shop.findMany();
    res.json(shops);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
