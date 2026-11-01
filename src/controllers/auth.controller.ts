
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";

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


const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
}).strict();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function login(
  req: Request,
  res: Response
): Promise<void> {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: "Nieprawidłowe dane logowania",
    });
    return;
  }

  try {
    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        error: "Nieprawidłowy e-mail lub hasło",
      });
      return;
    }

    const isValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isValid) {
      res.status(401).json({
        error: "Nieprawidłowy e-mail lub hasło",
      });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("Brak JWT_SECRET");
    }

    const token = jwt.sign({}, secret, {
      subject: String(user.id),
      expiresIn: "1h",
      algorithm: "HS256",
      issuer: "k2-performance",
      audience: "k2-performance-web",
    });

    res.cookie("access_token", token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000,
    });

    res.json({
      message: "Zalogowano pomyślnie",
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Błąd logowania:", error);
    res.status(500).json({
      error: "Wystąpił błąd serwera",
    });
  }
}

export function me(req: Request, res: Response): void {
  const { isActive, ...user } = res.locals.user;
  res.json({ data: user });
}

export function logout(
  _req: Request,
  res: Response
): void {
  res.clearCookie("access_token", cookieOptions);
  res.json({ message: "Wylogowano pomyślnie" });
}
