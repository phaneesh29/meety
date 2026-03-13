import { Router } from "express";

import { createRoom, deleteRoom, getMyRooms, getRoomByCode, getRoomAnalytics, getRoomMessages } from "../controllers/room.controller.js";
import { requireApiAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireApiAuth);

router.post("/", createRoom);
router.get("/", getMyRooms);
router.get("/:roomCode", getRoomByCode);
router.get("/:roomCode/analytics", getRoomAnalytics);
router.get("/:roomCode/messages", getRoomMessages);
router.delete("/:roomCode", deleteRoom);

export default router;
