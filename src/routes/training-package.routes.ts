
import { Router } from "express";
import {
  getTrainingPackages,
  getTrainingCapacity,
  reserveTrainingCapacity,
} from "../controllers/training-package.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", getTrainingPackages);
router.get("/availability", getTrainingCapacity);

router.post("/reserve", requireAuth, reserveTrainingCapacity);

export default router;
