import { constants, Constants } from "./constants"
import { Request, Response, NextFunction } from "express"
import FancyError from "../utils/FancyError"

const titles: Record<number, string> = {
    [constants.VALIDATION_ERROR]: "Validation Error",
    [constants.UNAUTHORIZED_ERROR]: "UNAUTHORIZED_ERROR",
    [constants.FORBIDDEN]: "FORBIDDEN",
    [constants.NOT_FOUND]: "Not Found Error",
    [constants.SERVER_ERROR]: "SERVER_ERROR",
}

const ErrorHandler = (err: FancyError, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        return next(err)
    }
    const statusCode = err.statusCode || 500
    const message = err.message || "Internal Server Error"

    if (statusCode >= 500) {
        console.error(`${req.method} ${req.originalUrl} ->`, err)
    }

    // every status gets an answer, an unmapped one no longer leaves the request hanging.
    res.status(statusCode).json({
        title: titles[statusCode] || "Error",
        message,
        code: err.code,
        statusCode,
        success: false,
    })
}

export default ErrorHandler
export type { Constants }
