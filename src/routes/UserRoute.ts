import express from "express";
import { SendOtpViaSms, verifyOtp, UpdateUser, getAllUsers, updateProfile, logoutUser,uploadImagesToS3, deleteFromS3 } from "../controllers/UserController";
import { authMiddleware } from '../middleware/authMiddleware'
import { uploadPhoto } from "../middleware/uploadImages";
import { chatUpload } from "../middleware/Multer";

const router = express.Router();

router.post('/sendotp', SendOtpViaSms)
router.post('/verifyotp', verifyOtp)
router.put('/updateuser/:id', authMiddleware, UpdateUser)
router.put('/updateprofile/:id', authMiddleware, uploadPhoto.array('images', 1), updateProfile)
router.get('/', authMiddleware, getAllUsers)
router.get('/logout', logoutUser)
router.post('/images', chatUpload.array('image', 5), uploadImagesToS3)
router.delete('/img/:key',  deleteFromS3)
export default router;
