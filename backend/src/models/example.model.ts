import type { Example } from "@prisma/client";
import prisma from "./prisma.js";

export const exampleModel = {
  async list(): Promise<Example[]> {
    return prisma.example.findMany({ orderBy: { createdAt: "desc" } });
  },

  async getById(id: string): Promise<Example | null> {
    return prisma.example.findUnique({ where: { id } });
  },

  async create(data: { title: string }): Promise<Example> {
    return prisma.example.create({ data });
  },
};
