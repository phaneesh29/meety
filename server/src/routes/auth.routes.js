import { Router } from "express";

import { getCurrentUser } from "../controllers/auth.controller.js";
import { requireApiAuth, requireDbUser } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireApiAuth, requireDbUser, getCurrentUser);

export default router;
