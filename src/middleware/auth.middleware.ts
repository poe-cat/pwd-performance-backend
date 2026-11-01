
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.access_token;

  if (typeof token !== "string") {
    res.status(401).json({ error: "Brak autoryzacji" });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET nie jest skonfigurowany");
    }

    const payload = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer: "k2-performance",
      audience: "k2-performance-web",
    });

    if (
      typeof payload === "string" ||
      !payload.sub ||
      !/^\d+$/.test(payload.sub)
    ) {
      res.status(401).json({ error: "Nieprawidłowa sesja" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: "Sesja wygasła" });
      return;
    }

    res.locals.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Nieprawidłowa sesja" });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Sesja wygasła" });
      return;
    }
    next(error);
  }
}
