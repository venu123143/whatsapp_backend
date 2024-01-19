import express from "express";
import { createMessage, updateMessage } from "../controllers/MessageController";

const router = express.Router();

router.post('/create',createMessage)
router.put('/update',updateMessage)


export default router
