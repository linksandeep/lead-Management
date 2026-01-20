"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const statusController_1 = require("../controllers/statusController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.authenticateToken, statusController_1.getStatuses);
router.post('/', auth_1.authenticateToken, auth_1.requireAdmin, statusController_1.createStatus);
router.delete('/:id', auth_1.authenticateToken, auth_1.requireAdmin, statusController_1.deleteStatus);
router.put('/order', auth_1.authenticateToken, auth_1.requireAdmin, statusController_1.updateStatusOrder);
exports.default = router;
//# sourceMappingURL=status.js.map