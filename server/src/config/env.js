import dotenv from "dotenv";

dotenv.config();

function parseRequiredString(value, name) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`${name} is required.`);
    }

    return value.trim();
}

function parsePositiveInteger(value, fallback, name) {
    const parsedValue = Number.parseInt(value ?? `${fallback}`, 10);

    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
        throw new Error(`${name} must be a positive number.`);
    }

    return parsedValue;
}

function parseTrustProxy(value, fallback) {
    const rawValue = value ?? fallback;

    if (rawValue === true || rawValue === false) {
        return rawValue;
    }

    if (rawValue === undefined) {
        return false;
    }

    const normalizedValue = String(rawValue).trim().toLowerCase();

    if (normalizedValue === "true") {
        return true;
    }

    if (normalizedValue === "false") {
        return false;
    }

    const parsedNumber = Number.parseInt(normalizedValue, 10);

    if (!Number.isNaN(parsedNumber) && parsedNumber >= 0) {
        return parsedNumber;
    }

    return rawValue;
}

const allowedNodeEnvs = new Set(["development", "test", "production"]);
const rawNodeEnv = process.env.NODE_ENV ?? "development";

const nodeEnv = allowedNodeEnvs.has(rawNodeEnv) ? rawNodeEnv : "development";
const port = parsePositiveInteger(process.env.PORT, 3000, "PORT");

const corsOrigin = process.env.CORS_ORIGIN ?? "*";
const trustProxy = parseTrustProxy(process.env.TRUST_PROXY, nodeEnv === "production" ? "1" : "false");
const rateLimitWindowMs = parsePositiveInteger(
    process.env.RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
    "RATE_LIMIT_WINDOW_MS",
);
const rateLimitMax = parsePositiveInteger(process.env.RATE_LIMIT_MAX, 100, "RATE_LIMIT_MAX");
const databaseUrl = parseRequiredString(process.env.DATABASE_URL, "DATABASE_URL");

export const env = {
    corsOrigin,
    databaseUrl,
    isDevelopment: nodeEnv === "development",
    isProduction: nodeEnv === "production",
    nodeEnv,
    port,
    rateLimitMax,
    rateLimitWindowMs,
    trustProxy,
};
