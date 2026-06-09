import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function getProducts(_req: Request, res: Response) {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      isActive: true,
      createdAt: true,
    },
  });

  res.json({
    data: products,
  });
}