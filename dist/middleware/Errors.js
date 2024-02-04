"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const ErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";
    switch (err.statusCode) {
        case constants_1.constants.VALIDATION_ERROR:
            res.status(err.statusCode).json({
                title: "Validation Error",
                message: err.message,
                statusCode: err.statusCode
            });
            break;
        case constants_1.constants.NOT_FOUND:
            res.status(err.statusCode).json({
                title: "Not Found Error",
                message: err.message,
                statusCode: err.statusCode
            });
            break;
        case constants_1.constants.UNAUTHORIZED_ERROR:
            res.status(err.statusCode).json({
                title: "UNAUTHORIZED_ERROR",
                message: err.message,
                statusCode: err.statusCode
            });
            break;
        case constants_1.constants.FORBIDDEN:
            res.status(err.statusCode).json({
                title: "FORBIDDEN",
                message: err.message,
                statusCode: err.statusCode
            });
            break;
        case constants_1.constants.SERVER_ERROR:
            res.status(err.statusCode).json({
                title: "SERVER_ERROR",
                message: err.message,
                statusCode: err.statusCode
            });
            break;
        default:
            console.log("no error or unknown error.");
            break;
    }
};
exports.default = ErrorHandler;
