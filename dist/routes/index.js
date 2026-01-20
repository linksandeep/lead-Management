"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const users_1 = __importDefault(require("./users"));
const leads_1 = __importDefault(require("./leads"));
const dashboard_1 = __importDefault(require("./dashboard"));
const status_1 = __importDefault(require("./status"));
const router = (0, express_1.Router)();
router.use('/auth', auth_1.default);
router.use('/users', users_1.default);
router.use('/leads', leads_1.default);
router.use('/dashboard', dashboard_1.default);
router.use('/statuses', status_1.default);
router.get('/health', (_req, res) => {
    res.json({
        success: true,
        message: 'API is healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map