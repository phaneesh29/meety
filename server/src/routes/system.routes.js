import { Router } from "express";

import { getApiInfo, getHealthStatus } from "../controllers/system.controller.js";

const router = Router();

router.get("/", getApiInfo);
router.get("/health", getHealthStatus);

export default router;
