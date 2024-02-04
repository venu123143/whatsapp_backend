"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const MessageController_1 = require("../controllers/MessageController");
const router = express_1.default.Router();
router.post('/create', MessageController_1.createMessage);
router.put('/update', MessageController_1.updateMessage);
exports.default = router;
