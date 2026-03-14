import { Router } from "express";

import authRoutes from "./auth.routes.js";
import roomRoutes from "./room.routes.js";
import systemRoutes from "./system.routes.js";
import feedbackRoutes from "./feedback.routes.js";

const router = Router();

router.use("/", systemRoutes);
router.use("/auth", authRoutes);
router.use("/rooms", roomRoutes);
router.use("/feedback", feedbackRoutes);

export default router;
