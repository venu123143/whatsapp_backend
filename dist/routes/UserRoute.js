"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const UserController_1 = require("../controllers/UserController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadImages_1 = require("../middleware/uploadImages");
const router = express_1.default.Router();
router.post('/sendotp', UserController_1.SendOtpViaSms);
router.post('/verifyotp', UserController_1.verifyOtp);
router.put('/updateuser/:id', authMiddleware_1.authMiddleware, UserController_1.UpdateUser);
router.put('/updateprofile/:id', authMiddleware_1.authMiddleware, uploadImages_1.uploadPhoto.array('images', 1), UserController_1.updateProfile);
router.get('/', authMiddleware_1.authMiddleware, UserController_1.getAllUsers);
router.get('/logout', UserController_1.logoutUser);
exports.default = router;
