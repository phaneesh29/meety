import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { clerkMiddleware } from "@clerk/express";

import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { apiRateLimiter } from "./middleware/rate-limit.js";
import apiRoutes from "./routes/index.js";
import webhookRoutes from "./routes/webhook.routes.js";

const app = express();

if (env.trustProxy !== false) {
    app.set("trust proxy", env.trustProxy);
}

app.disable("x-powered-by");


app.use("/webhooks", webhookRoutes);

app.use(helmet());
app.use(
    cors({
        origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(",").map((origin) => origin.trim()),
    }),
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.isProduction ? "combined" : "dev"));
app.use(
    clerkMiddleware({
        publishableKey: env.clerkPublishableKey,
        secretKey: env.clerkSecretKey,
    }),
);

app.get("/", (req, res) => {
    res.json({
        message: "Meety backend is up.",
        docs: "/api",
        health: "/api/health",
    });
});

app.use("/api", apiRateLimiter);
app.use("/api", apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
