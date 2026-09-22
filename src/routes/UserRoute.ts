import express from "express";
import {
    SendOtpViaSms,
    verifyOtp,
    refreshAccessToken,
    getCurrentUser,
    UpdateUser,
    getAllUsers,
    updateProfile,
    logoutUser,
    logoutAllDevices,
    uploadImagesToS3,
    deleteFromS3
} from "../controllers/UserController";
import { authMiddleware } from '../middleware/authMiddleware'
import { uploadPhoto } from "../middleware/uploadImages";
import { chatUpload } from "../middleware/Multer";

const router = express.Router();

// --- public auth routes ---
router.post('/sendotp', SendOtpViaSms)
router.post('/verifyotp', verifyOtp)
router.post('/refresh', refreshAccessToken)
// logout only needs the refresh cookie, so an expired access token must not block it.
router.post('/logout', logoutUser)
router.get('/logout', logoutUser) // kept for the older client

// --- authenticated routes ---
router.get('/me', authMiddleware, getCurrentUser)
router.post('/logout-all', authMiddleware, logoutAllDevices)
router.put('/updateuser/:id', authMiddleware, UpdateUser)
router.put('/updateprofile/:id', authMiddleware, uploadPhoto.array('images', 1), updateProfile)
router.get('/', authMiddleware, getAllUsers)
router.post('/images', authMiddleware, chatUpload.array('image', 5), uploadImagesToS3)
router.delete('/img/:key', authMiddleware, deleteFromS3)

export default router;
