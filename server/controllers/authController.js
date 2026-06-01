import crypto from 'crypto';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

/**
 * User Signup Controller
 * Registers a new user with email and password
 */
export const signup = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
        code: 'EMAIL_EXISTS',
      });
    }

    // Create new user
    const newUser = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase(),
      password,
    });

    await newUser.save();

    // Generate token
    const token = generateToken(newUser._id, newUser.email);

    // Send response
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: newUser.getProfile(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * User Login Controller
 * Authenticates user with email and password
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user and select password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.',
        code: 'ACCOUNT_LOCKED',
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment failed attempts
      user.failedLoginAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      }

      await user.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    user.lastLogin = new Date();
    user.isVerified = true; // Mark as verified on login
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.email);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getProfile(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get User Profile
 * Returns authenticated user's profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user.getProfile(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update User Profile
 * Updates user information (name, bio, phone, etc.)
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, email, bio, phone, dob, links, language, timezone, notifications } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (bio) user.bio = bio.trim();
    if (phone) user.phone = phone;
    if (dob !== undefined) user.dob = String(dob).trim();
    if (links && typeof links === 'object') {
      user.links = {
        ...user.links,
        linkedin: sanitizeProfileText(links.linkedin ?? user.links?.linkedin),
        github: sanitizeProfileText(links.github ?? user.links?.github),
        portfolio: sanitizeProfileText(links.portfolio ?? user.links?.portfolio),
        fitband: sanitizeProfileText(links.fitband ?? user.links?.fitband),
        banking: sanitizeProfileText(links.banking ?? user.links?.banking),
      };
    }

    // Update preferences
    if (language) user.preferences.language = language;
    if (timezone) user.preferences.timezone = timezone;
    if (notifications !== undefined) user.preferences.notifications = notifications;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user.getProfile(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change Password
 * Updates user password with old password verification
 */
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields are required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.user.userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify old password
    const isOldPasswordValid = await user.comparePassword(oldPassword);

    if (!isOldPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      const resetToken = crypto.randomBytes(24).toString('hex');
      user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists for this email, a reset link has been generated.',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Token and password fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

export default { signup, login, logout, getProfile, updateProfile, changePassword, forgotPassword, resetPassword };

function sanitizeProfileText(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[<>]/g, '').trim().slice(0, 300);
}
