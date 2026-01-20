"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/login', authController_1.login);
router.post('/logout', authController_1.logout);
router.post('/register', auth_1.authenticateToken, auth_1.requireAdmin, authController_1.register);
router.get('/me', auth_1.authenticateToken, auth_1.requireAuth, authController_1.getMe);
router.put('/profile', auth_1.authenticateToken, auth_1.requireAuth, authController_1.updateProfile);
router.put('/change-password', auth_1.authenticateToken, auth_1.requireAuth, authController_1.changePassword);
router.post('/danger-reset', auth_1.authenticateToken, auth_1.requireAdmin, authController_1.dangerReset);
exports.default = router;
//# sourceMappingURL=auth.js.map