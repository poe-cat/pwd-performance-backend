
import { Router } from "express";
import { getUsers } from "../controllers/admin.controller.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get("/users", requireAuth, requireAdmin, getUsers);

export default router;
