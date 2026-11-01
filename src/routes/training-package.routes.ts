
import { Router } from "express";
import { getTrainingPackages } from "../controllers/training-package.controller.js";

const router = Router();

router.get("/", getTrainingPackages);

export default router;
