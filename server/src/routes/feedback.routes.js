import { Router } from "express";
import { submitFeedback } from "../controllers/feedback.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, submitFeedback);

export default router;
