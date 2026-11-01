
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(12).max(128),
}).strict();

export async function register(
  req: Request,
  res: Response
): Promise<void> {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: "Nieprawidłowe dane rejestracji",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  const { firstName, lastName, email, password } = result.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      res.status(409).json({
        error: "Konto z tym adresem e-mail już istnieje",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role: "CLIENT",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: "Konto zostało utworzone",
      data: user,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        error: "Konto z tym adresem e-mail już istnieje",
      });
      return;
    }

    console.error("Błąd rejestracji:", error);

    res.status(500).json({
      error: "Wystąpił błąd serwera",
    });
  }
}
