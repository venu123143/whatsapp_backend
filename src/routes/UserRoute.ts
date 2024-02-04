import express from "express";
import { SendOtpViaSms, verifyOtp, UpdateUser, getAllUsers, updateProfile, logoutUser } from "../controllers/UserController";
import { authMiddleware } from '../middleware/authMiddleware'
import { uploadPhoto } from "../middleware/uploadImages";

const router = express.Router();

router.post('/sendotp', SendOtpViaSms)
router.post('/verifyotp', verifyOtp)
router.put('/updateuser/:id', authMiddleware, UpdateUser)
router.put('/updateprofile/:id', authMiddleware, uploadPhoto.array('images', 1), updateProfile)
router.get('/', authMiddleware, getAllUsers)
router.get('/logout', logoutUser)

export default router;
