"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = void 0;
const sendError = (res, error, defaultStatusCode = 400) => {
    const statusCode = typeof error?.statusCode === 'number'
        ? error.statusCode
        : defaultStatusCode;
    return res.status(statusCode).json({
        success: false,
        message: error?.message || 'Something went wrong',
        details: error?.details ?? null
    });
};
exports.sendError = sendError;
//# sourceMappingURL=sendError.js.map