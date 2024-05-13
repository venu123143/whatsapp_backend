"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const CallsController_1 = require("../controllers/CallsController");
const router = express_1.default.Router();
router.post('/create-call', authMiddleware_1.authMiddleware, CallsController_1.createCall);
router.get('/get-calls-history', authMiddleware_1.authMiddleware, CallsController_1.getCalls);
router.get('/get-live-calls', authMiddleware_1.authMiddleware, CallsController_1.getLiveCalls);
router.put('/update-call/:id', authMiddleware_1.authMiddleware, CallsController_1.updateCall);
exports.default = router;
