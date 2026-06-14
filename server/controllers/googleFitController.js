import axios from 'axios';
import User from '../models/User.js';
import GoogleFitService from '../services/GoogleFitService.js';

const OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.location.read',
].join(' ');

export const connect = async (req, res) => {
  const userId = req.user.userId;

  // Dynamic redirect support: capture query origin or referrer origin
  const queryOrigin = req.query.origin || '';
  const referrer = req.headers.referer || req.headers.referrer || '';
  let referrerOrigin = '';
  try {
    if (referrer) {
      referrerOrigin = new URL(referrer).origin;
    }
  } catch (err) {
    console.error('[GoogleFitController] Failed to parse referer', err);
  }

  const origin = queryOrigin || referrerOrigin || 'http://localhost:5173';

  const stateData = { userId, origin };
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

  const acceptsJson = String(req.headers.accept || '').includes('application/json') || req.query.json === '1';
  if (acceptsJson) {
    return res.status(200).json({ success: true, url });
  }
  return res.redirect(url);
};

export const callback = async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    const params = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT,
      grant_type: 'authorization_code',
    });

    const tokenRes = await axios.post(TOKEN_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = tokenRes.data || {};

    // Decode state
    let userId = '';
    let decodedOrigin = '';
    let integrationLink = 'anjali_googlefit';
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      userId = decodedState.userId;
      decodedOrigin = decodedState.origin;
      integrationLink = decodedState.integrationLink || integrationLink;
    } catch (err) {
      console.warn('[GoogleFitController] State decoding failed, falling back to raw state parameter:', err.message);
      userId = state;
    }

    const user = await User.findById(userId).select('+healthIntegration.googleFit.accessToken +healthIntegration.googleFit.refreshToken +healthIntegration.googleFit.tokenExpiresAt');
    if (!user) {
      console.error('[GoogleFitController] user not found for id', userId);
      return res.status(404).send('User not found');
    }

    user.healthIntegration = user.healthIntegration || {};
    user.healthIntegration.connected = true;
    user.healthIntegration.provider = integrationLink;
    user.healthIntegration.integrationLink = integrationLink;
    user.healthIntegration.lastSync = new Date();
    user.healthIntegration.googleFit = user.healthIntegration.googleFit || {};
    user.healthIntegration.googleFit.accessToken = data.access_token;
    user.healthIntegration.googleFit.refreshToken = data.refresh_token || user.healthIntegration.googleFit.refreshToken;
    user.healthIntegration.googleFit.tokenExpiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
    user.healthIntegration.googleFit.scope = data.scope || '';

    await user.save();
    console.log('Google Fit connected');

    // Validate origin against allowlist before redirecting
    const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
    let targetOrigin = '';
    if (decodedOrigin && ALLOWED_ORIGINS.includes(decodedOrigin)) {
      targetOrigin = decodedOrigin;
    } else {
      targetOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
    }

    const redirectUrl = `${targetOrigin}/health?connected=googlefit`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('[2] OAuth Callback - Token exchange failed:', err.response?.data || err.message);
    return res.status(500).json({ success: false, message: 'Token exchange failed' });
  }
};

export const live = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('+healthIntegration.googleFit.accessToken +healthIntegration.googleFit.refreshToken +healthIntegration.googleFit.tokenExpiresAt');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.healthIntegration?.provider?.includes('googlefit') || !user.healthIntegration?.connected) {
      return res.status(400).json({ success: false, message: 'Google Fit is not connected for this user' });
    }

    const metrics = await GoogleFitService.getLiveMetricsForUser(user);
    console.log('Google Fit sync completed');

    const result = {
      success: true,
      data: {
        source: 'Google Fit',
        lastSync: new Date().toISOString(),
        metrics,
      },
    };
    return res.status(200).json(result);
  } catch (err) {
    console.error('[GoogleFitController] live fetch failed:', err.message || err);
    return res.status(500).json({ success: false, message: err.message || 'Could not fetch live Google Fit data' });
  }
};

export default {
  connect,
  callback,
  live,
};