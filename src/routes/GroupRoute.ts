import express from "express";
import { createGroup, getGroups, getGroupById, updateGroup, deleteGroup, deleteUserFromAdmins, addAdminToGroup, addUserToGroup, leaveUserFromGroup } from "../controllers/GroupController";
import { authMiddleware } from '../middleware/authMiddleware'

const router = express.Router();
// Group routes
router.post('/create', authMiddleware, createGroup);
router.get('/getall', authMiddleware, getGroups);
router.get('/:groupId', authMiddleware, getGroupById);
router.put('/:groupId', authMiddleware, updateGroup);
router.put('/addUserToGroup/:groupId', authMiddleware, addUserToGroup);
router.put('/addAdminToGroup/:groupId', authMiddleware, addAdminToGroup);
router.put('/deleteUserFromAdmins/:groupId', authMiddleware, deleteUserFromAdmins);
router.put('/leaveUserFromGroup/:groupId', authMiddleware, leaveUserFromGroup);
router.delete('/:groupId', authMiddleware, deleteGroup);


export default router
