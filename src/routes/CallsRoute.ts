import express from "express";
import { authMiddleware } from '../middleware/authMiddleware'
import { createCall, getCalls, updateCall,getLiveCalls } from "../controllers/CallsController";

const router = express.Router();

router.post('/create-call', authMiddleware, createCall)
router.get('/get-calls-history', authMiddleware, getCalls)
router.get('/get-live-calls', authMiddleware, getLiveCalls)
router.put('/update-call/:id', authMiddleware, updateCall)
// router.get('/logout', logoutUser)

export default router;
