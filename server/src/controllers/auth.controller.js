export function getCurrentUser(req, res) {
    const authContext = req.authContext;

    res.status(200).json({
        dbUser: authContext.dbUser ?? null,
        orgId: authContext.orgId,
        sessionId: authContext.sessionId,
        timestamp: new Date().toISOString(),
        userId: authContext.userId,
    });
}
