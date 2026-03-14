import { Router } from "express";
import { submitFeedback } from "../controllers/feedback.controller.js";
import { requireApiAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireApiAuth, submitFeedback);

export default router;
