"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const GroupController_1 = require("../controllers/GroupController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/create', authMiddleware_1.authMiddleware, GroupController_1.createGroup);
router.get('/getall', authMiddleware_1.authMiddleware, GroupController_1.getGroups);
router.get('/:groupId', authMiddleware_1.authMiddleware, GroupController_1.getGroupById);
router.put('/:groupId', authMiddleware_1.authMiddleware, GroupController_1.updateGroup);
router.put('/addUserToGroup/:groupId', authMiddleware_1.authMiddleware, GroupController_1.addUserToGroup);
router.put('/addAdminToGroup/:groupId', authMiddleware_1.authMiddleware, GroupController_1.addAdminToGroup);
router.put('/deleteUserFromAdmins/:groupId', authMiddleware_1.authMiddleware, GroupController_1.deleteUserFromAdmins);
router.put('/leaveUserFromGroup/:groupId', authMiddleware_1.authMiddleware, GroupController_1.leaveUserFromGroup);
router.delete('/:groupId', authMiddleware_1.authMiddleware, GroupController_1.deleteGroup);
exports.default = router;
