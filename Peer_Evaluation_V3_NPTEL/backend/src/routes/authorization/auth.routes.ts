import express from 'express';
import {
  registerUser,
  loginUser,
  sendOtpEmail,
  verifyOtp,
  forgotPassword,
  resetPassword,
  setPasswordFromInvite,
} from '../../controllers/authorization/auth.controller.ts';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/send', sendOtpEmail);
router.post('/verify', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/set-password-from-invite', setPasswordFromInvite);

export default router;
