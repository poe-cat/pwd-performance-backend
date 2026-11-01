
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import healthRoutes from "./routes/health.routes.js";
import productsRoutes from "./routes/products.routes.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import trainingPackageRoutes from "./routes/training-package.routes.js";

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
  credentials: true,
}));

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.use("/health", healthRoutes);
app.use("/products", productsRoutes);
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/training-packages", trainingPackageRoutes);


export default app;
