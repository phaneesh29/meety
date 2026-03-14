import { StatusCodes } from "http-status-codes";
import { db } from "../db/index.js";
import { feedback } from "../db/schema/index.js";

export async function submitFeedback(req, res, next) {
    try {
        const { message } = req.body;
        const userId = req.authContext.userId;

        if (!message) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Feedback message is required." });
        }

        const [newFeedback] = await db
            .insert(feedback)
            .values({ userId, message })
            .returning();

        return res.status(StatusCodes.CREATED).json({ feedback: newFeedback });
    } catch (error) {
        return next(error);
    }
}
