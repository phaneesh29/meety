import { Router } from "express";

import systemRoutes from "./system.routes.js";

const router = Router();

router.use("/", systemRoutes);

export default router;
