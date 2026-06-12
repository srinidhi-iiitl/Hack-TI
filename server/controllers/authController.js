import crypto from 'crypto';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { verifyFirebaseToken } from '../config/firebase.js';

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
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      email: email.toLowerCase(),
      password,
      authProvider: 'local',
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

    if (isGoogleAccount(user) && !user.password) {
      return res.status(401).json({
        success: false,
        code: 'GOOGLE_ACCOUNT',
        email: user.email,
        message: 'This account was created using Google.',
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

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered',
          code: 'EMAIL_EXISTS',
        });
      }
      user.email = normalizedEmail;
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (bio) user.bio = bio.trim();
    if (phone !== undefined) user.phone = String(phone).trim();
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

export const googleAuth = async (req, res, next) => {
  try {
    const { firebaseToken, name, email, photoURL, uid } = req.body;

    if (!firebaseToken || !email || !uid) {
      return res.status(400).json({
        success: false,
        message: 'Firebase token, email, and uid are required',
      });
    }

    const decodedToken = await verifyFirebaseToken(firebaseToken);

    if (decodedToken.uid !== uid) {
      return res.status(401).json({
        success: false,
        message: 'Firebase uid does not match the authenticated token',
        code: 'FIREBASE_UID_MISMATCH',
      });
    }

    const tokenEmail = decodedToken.email?.toLowerCase();
    const normalizedEmail = email.toLowerCase().trim();

    if (tokenEmail && tokenEmail !== normalizedEmail) {
      return res.status(401).json({
        success: false,
        message: 'Firebase email does not match the requested account',
        code: 'FIREBASE_EMAIL_MISMATCH',
      });
    }

    const displayName = sanitizeProfileText(name || decodedToken.name || normalizedEmail.split('@')[0]);
    const [firstName, lastName] = splitDisplayName(displayName);

    let user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { firebaseUid: uid },
        { firebaseUID: uid },
      ],
    }).select('+password');

    if (user) {
      user.firebaseUid = user.firebaseUid || uid;
      user.firebaseUID = user.firebaseUID || uid;
      user.name = user.name || displayName;
      user.profilePhoto = user.profilePhoto || photoURL || decodedToken.picture || null;
      user.photoURL = user.photoURL || photoURL || decodedToken.picture || null;
      if (!user.firstName) user.firstName = firstName;
      if (!user.lastName) user.lastName = lastName;
      if (!user.authProvider || user.authProvider === 'local') user.authProvider = 'google+password';
    } else {
      user = new User({
        firstName,
        lastName,
        name: displayName,
        email: normalizedEmail,
        profilePhoto: photoURL || decodedToken.picture || null,
        photoURL: photoURL || decodedToken.picture || null,
        firebaseUid: uid,
        firebaseUID: uid,
        authProvider: 'google',
        isVerified: true,
      });
    }

    user.lastLogin = new Date();
    user.isVerified = true;
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    await user.save();

    const token = generateToken(user._id, user.email);

    return res.status(user.createdAt?.getTime() === user.updatedAt?.getTime() ? 201 : 200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: user.getProfile(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
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

export const sendPasswordOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordResetRequestedAt');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', code: 'EMAIL_NOT_FOUND' });
    }

    if (!isGoogleAccount(user)) {
      return res.status(400).json({
        success: false,
        message: 'Password access can only be generated for Google-created accounts.',
        code: 'NOT_GOOGLE_ACCOUNT',
      });
    }

    if (user.passwordResetRequestedAt && Date.now() - user.passwordResetRequestedAt.getTime() < 60 * 1000) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another OTP.',
        code: 'OTP_RATE_LIMITED',
      });
    }

    const otp = generateOtp();
    user.passwordResetToken = hashOtp(otp);
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.passwordResetRequestedAt = new Date();
    await user.save();

    const emailResult = await sendPasswordResetOtpEmail(user.email, otp, 'Create Your Password');

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

export const verifyPasswordOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await findUserByValidPasswordOtp(email, otp);

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    return res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    next(error);
  }
};

export const setPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, new password, and confirm password are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const user = await findUserByValidPasswordOtp(email, otp, '+password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    if (!isGoogleAccount(user)) {
      return res.status(400).json({
        success: false,
        message: 'Password access can only be generated for Google-created accounts.',
        code: 'NOT_GOOGLE_ACCOUNT',
      });
    }

    user.password = newPassword;
    user.authProvider = 'google+password';
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetRequestedAt = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password created successfully. You can now log in with email and password.' });
  } catch (error) {
    next(error);
  }
};

export const createPassword = setPassword;

export default {
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
};

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
}

async function sendPasswordResetOtpEmail(to, otp, heading = 'Reset your password') {
  const subject = heading === 'Create Your Password' ? 'Create Your Password' : '[DigitalTwin] Password OTP';
  const text = [
    heading === 'Create Your Password' ? 'Your verification code is:' : `DigitalTwin ${heading.toLowerCase()}`,
    '',
    heading === 'Create Your Password' ? otp : `Your OTP is ${otp}.`,
    '',
    heading === 'Create Your Password' ? 'This code expires in 10 minutes.' : 'This OTP expires in 10 minutes.',
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#05070d;color:#f8fafc;padding:28px;">
      <div style="max-width:520px;margin:0 auto;border:1px solid rgba(255,255,255,0.12);border-radius:18px;background:#0b111a;padding:24px;">
        <p style="margin:0 0 10px;color:#7df3cc;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:800;">DigitalTwin Security</p>
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;">${heading}</h1>
        <p style="margin:0;color:rgba(248,250,252,0.74);line-height:1.6;">Use this OTP to continue with your DigitalTwin password request.</p>
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

function splitDisplayName(displayName) {
  const parts = sanitizeProfileText(displayName).split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || 'Google';
  const lastName = parts.join(' ') || 'User';
  return [firstName.slice(0, 50), lastName.slice(0, 50)];
}

function validatePassword(password) {
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
}

function findUserByValidPasswordOtp(email, otp, extraSelect = '') {
  return User.findOne({
    email: email.toLowerCase().trim(),
    passwordResetToken: hashOtp(otp),
    passwordResetExpires: { $gt: new Date() },
  }).select(`+passwordResetToken +passwordResetExpires ${extraSelect}`.trim());
}

function isGoogleAccount(user) {
  return Boolean(
    user?.authProvider?.includes('google') ||
    user?.providers?.includes?.('google') ||
    user?.firebaseUid ||
    user?.firebaseUID
  );
}
