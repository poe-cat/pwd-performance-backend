import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.leadStatus.upsert({
    where: { name: "Nowy" },
    update: {},
    create: { name: "Nowy" },
  });

  await prisma.leadStatus.upsert({
    where: { name: "Kontakt" },
    update: {},
    create: { name: "Kontakt" },
  });

  await prisma.leadStatus.upsert({
    where: { name: "W trakcie" },
    update: {},
    create: { name: "W trakcie" },
  });

  await prisma.leadStatus.upsert({
    where: { name: "Zamknięty" },
    update: {},
    create: { name: "Zamknięty" },
  });

  await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Plan treningowy START",
      description: "Gotowy plan treningowy PDF dla osób rozpoczynających regularne treningi.",
      price: 99.00,
      pdfFilePath: "plans/start.pdf",
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Plan treningowy SIŁA",
      description: "Plan PDF ukierunkowany na rozwój siły i podstawowych wzorców ruchowych.",
      price: 149.00,
      pdfFilePath: "plans/sila.pdf",
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: "Plan treningowy REDUKCJA",
      description: "Plan PDF dla osób nastawionych na redukcję masy ciała i poprawę kondycji.",
      price: 129.00,
      pdfFilePath: "plans/redukcja.pdf",
      isActive: true,
    },
  });

  console.log("Seed zakończony.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });