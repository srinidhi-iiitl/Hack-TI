import User from '../models/User.js';

const DEFAULT_PROVIDER = 'gargi_fitband';

export const getHealthIntegration = async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  return res.status(200).json({
    success: true,
    data: buildHealthIntegration(user),
  });
};

export const updateHealthIntegration = async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const integrationLink = sanitize(req.body?.integrationLink);

  if (!integrationLink) {
    return res.status(400).json({ success: false, message: 'Health integration link is required' });
  }

  user.healthIntegration = {
    connected: true,
    provider: sanitize(req.body?.provider) || DEFAULT_PROVIDER,
    integrationLink,
    lastSync: new Date(),
  };
  user.links = { ...(user.links || {}), fitband: integrationLink };

  await user.save();

  return res.status(200).json({
    success: true,
    data: buildHealthIntegration(user),
  });
};

export const deleteHealthIntegration = async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  user.healthIntegration = {
    connected: false,
    provider: DEFAULT_PROVIDER,
    integrationLink: '',
    lastSync: null,
  };
  user.links = { ...(user.links || {}), fitband: '' };

  await user.save();

  return res.status(200).json({
    success: true,
    data: buildHealthIntegration(user),
  });
};

function buildHealthIntegration(user) {
  const integration = user.healthIntegration || {};
  const link = sanitize(integration.integrationLink || user.links?.fitband);

  return {
    connected: Boolean(integration.connected && link),
    provider: integration.provider || DEFAULT_PROVIDER,
    integrationLink: link,
    lastSync: integration.lastSync || null,
  };
}

function sanitize(value = '') {
  return typeof value === 'string' ? value.trim() : '';
}
