import { Router } from "express";

import authRoutes from "./auth.routes.js";
import systemRoutes from "./system.routes.js";

const router = Router();

router.use("/", systemRoutes);
router.use("/auth", authRoutes);

export default router;
