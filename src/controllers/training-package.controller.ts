
import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import {
  getCapacityAvailability,
  createCapacityHold,
} from "../services/capacity.service.js";

// Pobieranie dostępnych pakietów treningowych
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

// Pobieranie liczby dostępnych miejsc
export async function getTrainingCapacity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const availability = await getCapacityAvailability(prisma);

    res.status(200).json({
      data: availability,
    });
  } catch (error) {
    next(error);
  }
}

// Tworzenie 15-minutowej rezerwacji miejsca
export async function reserveTrainingCapacity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = res.locals.user;

    if (!user || user.role !== "CLIENT") {
      res.status(403).json({
        error: "Rezerwacja jest dostępna tylko dla klientów.",
      });
      return;
    }

    const { packageId } = req.body ?? {};

    if (
      typeof packageId !== "number" ||
      !Number.isSafeInteger(packageId) ||
      packageId <= 0
    ) {
      res.status(400).json({
        error: "Nieprawidłowy identyfikator pakietu.",
      });
      return;
    }

    const { hold, created } = await createCapacityHold(
      user.id,
      packageId
    );

    res.status(created ? 201 : 200).json({
      data: {
        id: hold.id,
        packageId: hold.packageId,
        status: hold.status,
        expiresAt: hold.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
}
