import express from 'express';
import {
  signup,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  googleAuth,
  sendPasswordOtp,
  verifyPasswordOtp,
  setPassword,
  createPassword,
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * PUBLIC ROUTES
 */

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 * @body    { firstName, lastName, email, password, confirmPassword }
 */
router.post('/signup', asyncHandler(signup));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 * @body    { email, password }
 */
router.post('/login', asyncHandler(login));
router.post('/google', asyncHandler(googleAuth));
router.post('/logout', authenticateToken, asyncHandler(logout));
router.get('/me', authenticateToken, asyncHandler(getProfile));

/**
 * PROTECTED ROUTES (Require Authentication)
 */

/**
 * @route   GET /api/auth/profile
 * @desc    Get authenticated user's profile
 * @access  Private
 */
router.get('/profile', authenticateToken, asyncHandler(getProfile));

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 * @body    { firstName, lastName, bio, phone, language, timezone, notifications }
 */
router.put('/profile', authenticateToken, asyncHandler(updateProfile));

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 * @body    { oldPassword, newPassword, confirmPassword }
 */
router.post('/change-password', authenticateToken, asyncHandler(changePassword));
router.put('/change-password', authenticateToken, asyncHandler(changePassword));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));
router.post('/send-password-otp', asyncHandler(sendPasswordOtp));
router.post('/verify-password-otp', asyncHandler(verifyPasswordOtp));
router.post('/set-password', asyncHandler(setPassword));
router.post('/create-password', asyncHandler(createPassword));

export default router;
