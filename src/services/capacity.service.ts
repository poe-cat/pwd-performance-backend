
import { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const MAX_CAPACITY = 12;
const HOLD_DURATION_MINUTES = 15;
const CAPACITY_LOCK_ID = 120012;

// Pobieranie aktualnej dostępności miejsc
export async function getCapacityAvailability(
  prismaClient: PrismaClient
) {
  const now = new Date();

  const activeEnrollments = await prismaClient.enrollment.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { endDate: null },
        { endDate: { gt: now } },
      ],
    },
    select: {
      userId: true,
    },
    distinct: ["userId"],
  });

  const activeHolds = await prismaClient.capacityHold.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: {
        gt: now,
      },
    },
    select: {
      userId: true,
    },
    distinct: ["userId"],
  });

  const occupiedUsers = new Set<number>([
    ...activeEnrollments.map((e) => e.userId),
    ...activeHolds.map((h) => h.userId),
  ]);

  const occupied = occupiedUsers.size;

  return {
    total: MAX_CAPACITY,
    occupied,
    available: Math.max(0, MAX_CAPACITY - occupied),
    isAvailable: occupied < MAX_CAPACITY,
  };
}

// Tworzenie lub ponowne wykorzystanie rezerwacji
export async function createCapacityHold(
  userId: number,
  packageId: number
) {
  return prisma.$transaction(
    async (tx) => {
      // Serializacja operacji przydzielania miejsc
      
    await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(${CAPACITY_LOCK_ID}::bigint)::text AS lock_result
    `;


      const now = new Date();

      // Oznaczanie wygasłych rezerwacji
      await tx.capacityHold.updateMany({
        where: {
          status: "ACTIVE",
          expiresAt: {
            lte: now,
          },
        },
        data: {
          status: "EXPIRED",
        },
      });

      // Sprawdzenie pakietu
      const trainingPackage = await tx.trainingPackage.findFirst({
        where: {
          id: packageId,
          isActive: true,
        },
      });

      if (!trainingPackage) {
        throw new Error(
          "Pakiet treningowy nie istnieje lub jest nieaktywny."
        );
      }

      // Sprawdzenie istniejącej rezerwacji
      const existingHold = await tx.capacityHold.findFirst({
        where: {
          userId,
          status: "ACTIVE",
          expiresAt: {
            gt: now,
          },
        },
      });

      if (existingHold) {
        return {
          hold: existingHold,
          created: false,
        };
      }

      // Sprawdzenie aktywnej współpracy
      const activeEnrollment = await tx.enrollment.findFirst({
        where: {
          userId,
          status: "ACTIVE",
          OR: [
            { endDate: null },
            { endDate: { gt: now } },
          ],
        },
      });

      if (activeEnrollment) {
        throw new Error(
          "Posiadasz już aktywną współpracę. Skorzystaj z przedłużenia."
        );
      }

      // Pobranie zajętych miejsc
      const enrollments = await tx.enrollment.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { endDate: null },
            { endDate: { gt: now } },
          ],
        },
        select: {
          userId: true,
        },
        distinct: ["userId"],
      });

      const holds = await tx.capacityHold.findMany({
        where: {
          status: "ACTIVE",
          expiresAt: {
            gt: now,
          },
        },
        select: {
          userId: true,
        },
        distinct: ["userId"],
      });

      const occupiedUsers = new Set<number>([
        ...enrollments.map((e) => e.userId),
        ...holds.map((h) => h.userId),
      ]);

      // Sprawdzenie limitu
      if (occupiedUsers.size >= MAX_CAPACITY) {
        throw new Error(
          "Brak wolnych miejsc na prowadzenie online."
        );
      }

      // Wyznaczenie terminu wygaśnięcia
      const expiresAt = new Date(
        now.getTime() + HOLD_DURATION_MINUTES * 60 * 1000
      );

      // Utworzenie nowej rezerwacji
      const hold = await tx.capacityHold.create({
        data: {
          userId,
          packageId,
          status: "ACTIVE",
          expiresAt,
        },
      });

      return {
        hold,
        created: true,
      };
    },
    {
      maxWait: 10000,
      timeout: 15000,
    }
  );
}

// Porządkowanie wygasłych rezerwacji
export async function expireCapacityHolds() {
  const now = new Date();

  const result = await prisma.capacityHold.updateMany({
    where: {
      status: "ACTIVE",
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: "EXPIRED",
    },
  });

  return {
    expiredCount: result.count,
  };
}
