export function getApiInfo(req, res) {
    res.json({
        message: "API is running.",
        version: "v1",
    });
}

export function getHealthStatus(req, res) {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
}
