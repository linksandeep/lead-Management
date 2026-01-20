"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken, auth_1.requireAuth);
router.get('/stats', dashboardController_1.getDashboardStats);
router.get('/admin-stats', auth_1.requireAdmin, dashboardController_1.getAdminDashboardStats);
router.get('/leads/by-status', dashboardController_1.getLeadsByStatus);
router.get('/leads/by-source', dashboardController_1.getLeadsBySource);
router.get('/recent-activity', dashboardController_1.getRecentActivity);
router.get('/metrics', dashboardController_1.getLeadMetrics);
exports.default = router;
//# sourceMappingURL=dashboard.js.map