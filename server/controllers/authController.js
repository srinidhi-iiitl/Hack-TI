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

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "You don't have account with this mail",
        code: 'EMAIL_NOT_FOUND',
      });
    }

    const otp = generateOtp();
    user.passwordResetToken = hashOtp(otp);
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const emailResult = await sendPasswordResetOtpEmail(user.email, otp);

    if (!emailResult.sent) {
      return res.status(500).json({
        success: false,
        message: 'Unable to send OTP email. Please check mail configuration and try again.',
        code: 'OTP_EMAIL_FAILED',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your registered email.',
      data: { email: maskEmail(user.email), expiresInMinutes: 10 },
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, password, confirmPassword } = req.body;

    if (!email || !otp || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and password fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      passwordResetToken: hashOtp(otp),
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires +password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
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

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
}

async function sendPasswordResetOtpEmail(to, otp) {
  const subject = '[DigitalTwin] Password reset OTP';
  const text = [
    'DigitalTwin password reset',
    '',
    `Your OTP is ${otp}.`,
    'This OTP expires in 10 minutes.',
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#05070d;color:#f8fafc;padding:28px;">
      <div style="max-width:520px;margin:0 auto;border:1px solid rgba(255,255,255,0.12);border-radius:18px;background:#0b111a;padding:24px;">
        <p style="margin:0 0 10px;color:#7df3cc;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:800;">DigitalTwin Security</p>
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;">Reset your password</h1>
        <p style="margin:0;color:rgba(248,250,252,0.74);line-height:1.6;">Use this OTP to reset your DigitalTwin password.</p>
        <div style="margin:22px 0;border-radius:16px;background:rgba(123,97,255,0.16);border:1px solid rgba(123,97,255,0.34);padding:18px;text-align:center;">
          <div style="font-size:34px;letter-spacing:10px;font-weight:900;color:#ffffff;">${otp}</div>
        </div>
        <p style="margin:0;color:rgba(248,250,252,0.58);line-height:1.5;">This OTP expires in 10 minutes. If you did not request it, ignore this email.</p>
      </div>
    </div>
  `;

  const resendResult = await sendOtpWithResend(to, subject, text, html);
  if (resendResult.sent) return resendResult;
  return sendOtpWithSmtp(to, subject, text, html);
}

async function sendOtpWithResend(to, subject, text, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || /your-|example|api-key/i.test(apiKey)) {
    return { sent: false, provider: 'resend', error: 'RESEND_API_KEY missing or placeholder.' };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM || process.env.SMTP_FROM || 'DigitalTwin <onboarding@resend.dev>';
    const result = await resend.emails.send({ from, to, subject, text, html });
    if (result.error) return { sent: false, provider: 'resend', error: result.error.message || String(result.error) };
    return { sent: true, provider: 'resend' };
  } catch (error) {
    return { sent: false, provider: 'resend', error: error.message };
  }
}

async function sendOtpWithSmtp(to, subject, text, html) {
  const smtpPassword = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !smtpPassword) {
    return { sent: false, provider: 'smtp', error: 'SMTP configuration missing.' };
  }

  try {
    const { default: nodemailer } = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: String(smtpPassword).replace(/\s+/g, ''),
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return { sent: true, provider: 'smtp' };
  } catch (error) {
    return { sent: false, provider: 'smtp', error: error.message };
  }
}

function maskEmail(email = '') {
  const [name = '', domain = ''] = String(email).split('@');
  if (!domain) return '';
  return `${name.slice(0, 2)}***@${domain}`;
}

function sanitizeProfileText(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[<>]/g, '').trim().slice(0, 300);
}
