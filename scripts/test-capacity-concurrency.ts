
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { createCapacityHold } from "../src/services/capacity.service.js";

const TEST_USERS = 13;
const MAX_CAPACITY = 12;

async function main() {
  // Zabezpieczenie przed przypadkowym użyciem
  // zwykłej bazy aplikacji.
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Brak DATABASE_URL.");
  }

  const databaseName = new URL(databaseUrl).pathname.slice(1);

  if (databaseName !== "k2_performance_test") {
    throw new Error(
      "Test może działać wyłącznie na bazie k2_performance_test."
    );
  }

  console.log("Baza testowa:", databaseName);

  // Tworzymy pakiet testowy.
  const trainingPackage = await prisma.trainingPackage.create({
    data: {
      name: "Pakiet testowy",
      description: "Test współbieżności rezerwacji",
      durationMonths: 1,
      price: 499,
      isActive: true,
    },
  });

  // Tworzymy 13 użytkowników testowych.
  const users = [];

  for (let i = 1; i <= TEST_USERS; i++) {
    const user = await prisma.user.create({
      data: {
        email: `capacity-test-${Date.now()}-${i}@example.com`,
        passwordHash: "TEST_ONLY",
        firstName: "Test",
        lastName: `User${i}`,
        role: "CLIENT",
      },
    });

    users.push(user);
  }

  console.log("Utworzono użytkowników:", users.length);

  // Wysyłamy 13 równoczesnych wywołań serwisu.
  const results = await Promise.allSettled(
    users.map((user) =>
      createCapacityHold(user.id, trainingPackage.id)
    )
  );

  const successful = results.filter(
    (result) => result.status === "fulfilled"
  );

  const rejected = results.filter(
    (result) => result.status === "rejected"
  );

  console.log("Udane rezerwacje:", successful.length);
  console.log("Odrzucone rezerwacje:", rejected.length);

  for (const result of rejected) {
    if (result.status === "rejected") {
      console.log("Przyczyna odrzucenia:", String(result.reason));
    }
  }

  // Weryfikujemy faktyczny stan PostgreSQL.
  const activeHolds = await prisma.capacityHold.count({
    where: {
      packageId: trainingPackage.id,
      status: "ACTIVE",
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  console.log("Ważne rezerwacje w bazie:", activeHolds);

  if (
    successful.length === MAX_CAPACITY &&
    rejected.length === 1 &&
    activeHolds === MAX_CAPACITY
  ) {
    console.log("TEST ZALICZONY: limit 12 miejsc zachowany.");
  } else {
    throw new Error(
      "TEST NIEZALICZONY: wyniki nie odpowiadają oczekiwaniom."
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
