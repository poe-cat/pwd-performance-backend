
import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";

export async function getTrainingPackages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const packages = await prisma.trainingPackage.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        durationMonths: true,
        price: true,
      },
      orderBy: {
        durationMonths: "asc",
      },
    });

    res.status(200).json({
      data: packages,
    });
  } catch (error) {
    next(error);
  }
}
