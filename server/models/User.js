import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User Schema
 * Defines the structure of user documents in MongoDB
 */
const userSchema = new mongoose.Schema(
  {
    // Basic Information
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },

    // Profile Information
    profilePhoto: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    phone: {
      type: String,
      default: null,
    },
    dob: {
      type: String,
      trim: true,
      default: '',
    },
    links: {
      linkedin: { type: String, trim: true, default: '' },
      github: { type: String, trim: true, default: '' },
      portfolio: { type: String, trim: true, default: '' },
      fitband: { type: String, trim: true, default: '' },
      banking: { type: String, trim: true, default: '' },
    },
    careerIntegrations: {
      github: { type: String, trim: true, default: '' },
      leetcode: { type: String, trim: true, default: '' },
      linkedin: { type: String, trim: true, default: '' },
    },
    healthIntegration: {
      connected: { type: Boolean, default: false },
      provider: { type: String, trim: true, default: 'gargi_fitband' },
      integrationLink: { type: String, trim: true, default: '' },
      lastSync: { type: Date, default: null },
    },

    // Subscription & Role
    role: {
      type: String,
      enum: ['user', 'premium', 'admin'],
      default: 'user',
    },
    subscriptionTier: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    subscriptionStartDate: {
      type: Date,
      default: null,
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },

    // Account Status
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      select: false,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Account Security
    lastLogin: {
      type: Date,
      default: null,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockoutUntil: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      select: false,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
      default: null,
    },

    // Firebase ID (optional, for Firebase Authentication)
    firebaseUID: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Metadata
    preferences: {
      language: { type: String, default: 'en' },
      timezone: { type: String, default: 'UTC' },
      theme: { type: String, default: 'dark' },
      notifications: { type: Boolean, default: true },
      twinAssistantEnabled: { type: Boolean, default: false },
      twinAssistantPreferences: {
        backgroundListening: { type: Boolean, default: true },
        wakeWordDetection: { type: Boolean, default: false },
        voiceResponses: { type: Boolean, default: false },
      },
      notificationPreferences: {
        goalNotifications: { type: Boolean, default: true },
        healthAlerts: { type: Boolean, default: true },
        financeAlerts: { type: Boolean, default: true },
        careerAlerts: { type: Boolean, default: true },
        dailyUpdateReminders: { type: Boolean, default: true },
        aiMotivationalMessages: { type: Boolean, default: true },
        emailNotifications: { type: Boolean, default: true },
        highPriorityOnly: { type: Boolean, default: false },
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

/**
 * Pre-save Hook: Hash password before saving
 * Only hashes if password is new or modified
 */
userSchema.pre('save', async function (next) {
  // Skip if password hasn't been modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance Method: Compare password with hash
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Instance Method: Get user profile (without sensitive data)
 */
userSchema.methods.getProfile = function () {
  const user = this.toObject();
  user.passwordSet = Boolean(user.password);
  delete user.password;
  delete user.verificationToken;
  return user;
};

/**
 * Instance Method: Check if account is locked
 */
userSchema.methods.isLocked = function () {
  return this.lockoutUntil && this.lockoutUntil > Date.now();
};

/**
 * Index for better query performance
 */
userSchema.index({ createdAt: 1 });
userSchema.index({ isActive: 1 });

const User = mongoose.model('User', userSchema);

export default User;
