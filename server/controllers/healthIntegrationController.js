import User from '../models/User.js';
import MockFitbandService from '../services/MockFitbandService.js';

const OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.location.read',
].join(' ');

export const getHealthIntegration = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({
      success: true,
      data: {
        connected: Boolean(user.healthIntegration?.connected),
        provider: user.healthIntegration?.provider || '',
        integrationLink: user.healthIntegration?.integrationLink || user.healthIntegration?.provider || '',
        lastSync: user.healthIntegration?.lastSync || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateHealthIntegration = async (req, res) => {
  const integrationLink = String(req.body?.integrationLink || '').trim();
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (integrationLink.endsWith('_fitband')) {
      user.healthIntegration = {
        connected: true,
        provider: integrationLink,
        integrationLink,
        lastSync: new Date(),
      };
      await user.save();
      return res.status(200).json({
        success: true,
        data: {
          connected: true,
          provider: integrationLink,
          integrationLink,
        },
      });
    }

    if (integrationLink.includes('googlefit')) {
      const queryOrigin = req.query.origin || '';
      const referrer = req.headers.referer || req.headers.referrer || '';
      let referrerOrigin = '';
      try {
        if (referrer) {
          referrerOrigin = new URL(referrer).origin;
        }
      } catch (err) {
        console.error('[HealthIntegrationController] Failed to parse referer', err);
      }

      const origin = queryOrigin || referrerOrigin || 'http://localhost:5173';
      const stateData = { userId, origin, integrationLink };
      const stateBase64 = Buffer.from(JSON.stringify(stateData)).toString('base64url');

      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT,
        response_type: 'code',
        scope: SCOPES,
        access_type: 'offline',
        include_granted_scopes: 'true',
        prompt: 'consent',
        state: stateBase64,
      });

      const url = `${OAUTH_URL}?${params.toString()}`;
      return res.status(200).json({
        success: true,
        url,
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid integration link' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteHealthIntegration = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.healthIntegration = {
      connected: false,
      provider: '',
      integrationLink: '',
      lastSync: null,
      googleFit: {
        accessToken: '',
        refreshToken: '',
        tokenExpiresAt: null,
        scope: '',
      },
    };
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        connected: false,
        provider: '',
        integrationLink: '',
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getHealthMetrics = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const accountName = user?.healthIntegration?.provider
      || user?.healthIntegration?.integrationLink
      || 'anjali_fitband';
    const metrics = MockFitbandService.getMetrics(accountName);

    return res.status(200).json({
      success: true,
      data: {
        source: metrics.source,
        lastSync: new Date().toISOString(),
        metrics,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export default {
  getHealthIntegration,
  updateHealthIntegration,
  deleteHealthIntegration,
  getHealthMetrics,
};
