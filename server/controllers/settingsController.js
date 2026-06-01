import User from '../models/User.js';

export const getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json(buildSettingsResponse(user));
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { theme, notifications, twinAssistantEnabled } = req.body;

    if (theme !== undefined) {
      user.preferences.theme = String(theme);
    }

    if (notifications !== undefined) {
      user.preferences.notifications = Boolean(notifications);
    }

    if (twinAssistantEnabled !== undefined) {
      user.preferences.twinAssistantEnabled = Boolean(twinAssistantEnabled);
    }

    await user.save();

    return res.status(200).json(buildSettingsResponse(user));
  } catch (error) {
    next(error);
  }
};

function buildSettingsResponse(user) {
  return {
    theme: user.preferences?.theme || 'dark',
    notifications: user.preferences?.notifications ?? true,
    twinAssistantEnabled: user.preferences?.twinAssistantEnabled ?? false,
  };
}
