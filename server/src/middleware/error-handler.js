import { StatusCodes } from "http-status-codes";

export function notFoundHandler(req, res, next) {
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    error.statusCode = StatusCodes.NOT_FOUND;
    next(error);
}

export function errorHandler(error, req, res, next) {
    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;

    if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
        console.error(error);
    }

    if (res.headersSent) {
        return next(error);
    }

    return res.status(statusCode).json({
        error: {
            message:
                statusCode === StatusCodes.INTERNAL_SERVER_ERROR
                    ? "Internal server error"
                    : error.message,
            statusCode,
        },
    });
}
