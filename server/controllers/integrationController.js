

import axios from 'axios';
import User from '../models/User.js';
import OnboardingProfile from '../models/OnboardingProfile.js';

// ─── GET /api/integrations/status ─────────────────────────────────────────────
export const getIntegrationStatus = async (req, res, next) => {
  try {
    const [user, profile] = await Promise.all([
      User.findById(req.user.userId),
      OnboardingProfile.findOne({ userId: req.user.userId }),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const links = user.links || {};
    const p     = profile || {};

    const data = {
      github: {
        status:      p.githubUsername ? 'connected' : 'disconnected',
        username:    p.githubUsername || '',
        data:        p.githubData     || null,
        connectedAt: p.updatedAt      || null,
      },
      leetcode: {
        status:      p.leetcodeUsername ? 'connected' : 'disconnected',
        username:    p.leetcodeUsername  || '',
        data:        p.leetcodeData      || null,
        connectedAt: p.updatedAt         || null,
      },
      // ── NEW ──
      hackerrank: {
        status:      p.hackerrankUsername ? 'connected' : 'disconnected',
        username:    p.hackerrankUsername || '',
        data:        p.hackerrankData     || null,
        connectedAt: p.updatedAt          || null,
      },
      codeforces: {
        status:      p.codeforcesHandle ? 'connected' : 'disconnected',
        username:    p.codeforcesHandle  || '',
        data:        p.codeforcesData    || null,
        connectedAt: p.updatedAt         || null,
      },
      // ── END NEW ──
      fitbit: {
        status:      p.fitbitProfile ? 'connected' : 'disconnected',
        username:    p.fitbitProfile  || links.fitband || '',
        data:        null,
        connectedAt: p.updatedAt || null,
      },
      fitband: {
        status:      p.fitbitProfile ? 'connected' : 'disconnected',
        username:    p.fitbitProfile  || links.fitband || '',
        data:        null,
        connectedAt: p.updatedAt || null,
      },
      linkedin: {
        status:      p.linkedinProfile ? 'connected' : 'disconnected',
        username:    p.linkedinProfile  || '',
        data:        p.linkedinData     || null,
        connectedAt: p.updatedAt        || null,
      },
      banking: {
        status:      p.bankingProfile ? 'connected' : 'disconnected',
        profileLink: p.bankingProfile || links.banking || '',
        data:        null,
        connectedAt: p.updatedAt || null,
      },
      portfolio: {
        status:      links.portfolio ? 'connected' : 'disconnected',
        url:         links.portfolio  || '',
        data:        null,
        connectedAt: null,
      },
    };

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/integrations/connect ───────────────────────────────────────────
export const connectIntegration = async (req, res, next) => {
  try {
    const body = req.body || {};
    const { username, profileLink, url } = body;
    const integration = normalizeIntegrationName(body.integration);

    if (!integration) {
      return res.status(400).json({ success: false, message: 'integration field is required' });
    }

    const [user, profile] = await Promise.all([
      User.findById(req.user.userId),
      OnboardingProfile.findOne({ userId: req.user.userId }),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const op = profile || new OnboardingProfile({ userId: req.user.userId });

    let responseData = { status: 'connected', connectedAt: new Date().toISOString() };

    switch (integration) {

      // ── UNCHANGED ────────────────────────────────────────────────────────────

      case 'github': {
        if (!username) {
          return res.status(400).json({ success: false, message: 'GitHub username is required' });
        }
        op.githubUsername = username.trim();
        const ghData = await fetchGitHubStats(username.trim());
        op.githubData = ghData;
        user.links = { ...user.links, github: `https://github.com/${username.trim()}` };
        responseData = { ...responseData, username: username.trim(), data: ghData };
        break;
      }

      case 'leetcode': {
        if (!username) {
          return res.status(400).json({ success: false, message: 'LeetCode username is required' });
        }
        op.leetcodeUsername = username.trim();
        const lcData = await fetchLeetCodeStats(username.trim());
        op.leetcodeData = lcData;
        responseData = { ...responseData, username: username.trim(), data: lcData };
        break;
      }

      case 'fitbit': {
        const fitbitUser = username || profileLink || '';
        op.fitbitProfile  = fitbitUser.trim();
        user.links = { ...user.links, fitband: fitbitUser.trim() };
        responseData = { ...responseData, username: fitbitUser.trim(), data: buildMockFitbitData() };
        break;
      }

      case 'linkedin': {
        const li = username || profileLink || '';
        op.linkedinProfile = li.trim();
        user.links = { ...user.links, linkedin: li.trim() };
        responseData = { ...responseData, username: li.trim(), data: null };
        break;
      }

      case 'banking': {
        const bk = profileLink || username || '';
        op.bankingProfile = bk.trim();
        user.links = { ...user.links, banking: bk.trim() };
        responseData = { ...responseData, profileLink: bk.trim(), data: null };
        break;
      }

      case 'portfolio': {
        const pt = url || profileLink || '';
        user.links = { ...user.links, portfolio: pt.trim() };
        responseData = { ...responseData, url: pt.trim(), data: null };
        break;
      }

      // ── NEW: HackerRank ───────────────────────────────────────────────────────
      case 'hackerrank': {
        if (!username) {
          return res.status(400).json({ success: false, message: 'HackerRank username is required' });
        }
        op.hackerrankUsername = username.trim();
        const hrData = await fetchHackerRankStats(username.trim());
        op.hackerrankData = hrData;
        user.links = { ...user.links, hackerrank: `https://www.hackerrank.com/${username.trim()}` };
        responseData = { ...responseData, username: username.trim(), data: hrData };
        break;
      }

      // ── NEW: Codeforces ───────────────────────────────────────────────────────
      case 'codeforces': {
        if (!username) {
          return res.status(400).json({ success: false, message: 'Codeforces handle is required' });
        }
        op.codeforcesHandle = username.trim();
        const cfData = await fetchCodeforcesStats(username.trim());
        op.codeforcesData = cfData;
        user.links = { ...user.links, codeforces: `https://codeforces.com/profile/${username.trim()}` };
        responseData = { ...responseData, username: username.trim(), data: cfData };
        break;
      }
      // ── END NEW ───────────────────────────────────────────────────────────────

      default:
        return res.status(400).json({ success: false, message: `Unknown integration: ${integration}` });
    }

    await Promise.all([op.save(), user.save()]);

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

export const connectGithubIntegration = async (req, res, next) => {
  req.body = { ...(req.body || {}), integration: 'github' };
  return connectIntegration(req, res, next);
};

export const connectLeetcodeIntegration = async (req, res, next) => {
  req.body = { ...(req.body || {}), integration: 'leetcode' };
  return connectIntegration(req, res, next);
};

export const connectLinkedinIntegration = async (req, res, next) => {
  req.body = {
    ...(req.body || {}),
    integration: 'linkedin',
    profileLink: req.body?.linkedinProfile || req.body?.profileLink || req.body?.username,
  };
  return connectIntegration(req, res, next);
};

export const connectFitbandIntegration = async (req, res, next) => {
  req.body = {
    ...(req.body || {}),
    integration: 'fitband',
    username: req.body?.username || req.body?.fitbandProfile || req.body?.fitbitProfile || req.body?.profileLink,
  };
  return connectIntegration(req, res, next);
};

export const updateIntegration = async (req, res, next) => {
  return connectIntegration(req, res, next);
};

// ─── Legacy onboarding endpoints — UNCHANGED ──────────────────────────────────
export const getGithubIntegration = async (req, res, next) => {
  req.body = { ...(req.body || {}), integration: 'github', username: req.params?.username || req.body?.username };
  return connectIntegration(req, res, next);
};

export const getLeetcodeIntegration = async (req, res, next) => {
  req.body = { ...(req.body || {}), integration: 'leetcode', username: req.params?.username || req.body?.username };
  return connectIntegration(req, res, next);
};

export const postLinkedinIntegration = async (req, res, next) => {
  req.body = { ...(req.body || {}), integration: 'linkedin', profileLink: req.body?.linkedinProfile || req.body?.profileLink || req.body?.username };
  return connectIntegration(req, res, next);
};

// ─── NEW: Legacy-style GET handlers for HackerRank and Codeforces ─────────────
// Mirrors the same pattern as getGithubIntegration / getLeetcodeIntegration
// so the Career.jsx platform cards work identically.
export const getHackerrankIntegration = async (req, res, next) => {
  req.body = { ...(req.body || {}), integration: 'hackerrank', username: req.params?.username || req.body?.username };
  return connectIntegration(req, res, next);
};

export const getCodeforcesIntegration = async (req, res, next) => {
  req.body = { ...(req.body || {}), integration: 'codeforces', username: req.params?.handle || req.params?.username || req.body?.username };
  return connectIntegration(req, res, next);
};

// ─── POST /api/integrations/disconnect — UNCHANGED ────────────────────────────
export const disconnectIntegration = async (req, res, next) => {
  try {
    const integration = normalizeIntegrationName(req.body?.integration || req.query?.integration);

    if (!integration) {
      return res.status(400).json({ success: false, message: 'integration field is required' });
    }

    const [user, profile] = await Promise.all([
      User.findById(req.user.userId),
      OnboardingProfile.findOne({ userId: req.user.userId }),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const op = profile || new OnboardingProfile({ userId: req.user.userId });

    const fieldMap = {
      github:     () => { op.githubUsername = '';      op.githubData = {};      user.links = { ...user.links, github: '' }; },
      leetcode:   () => { op.leetcodeUsername = '';    op.leetcodeData = {}; },
      // ── NEW ──
      hackerrank: () => { op.hackerrankUsername = '';  op.hackerrankData = {};  user.links = { ...user.links, hackerrank: '' }; },
      codeforces: () => { op.codeforcesHandle = '';    op.codeforcesData = {};  user.links = { ...user.links, codeforces: '' }; },
      // ── END NEW ──
      fitbit:     () => { op.fitbitProfile = '';       user.links = { ...user.links, fitband: '' }; },
      linkedin:   () => { op.linkedinProfile = '';     user.links = { ...user.links, linkedin: '' }; },
      banking:    () => { op.bankingProfile = '';      user.links = { ...user.links, banking: '' }; },
      portfolio:  () => { user.links = { ...user.links, portfolio: '' }; },
    };

    if (!fieldMap[integration]) {
      return res.status(400).json({ success: false, message: `Unknown integration: ${integration}` });
    }

    fieldMap[integration]();
    await Promise.all([op.save(), user.save()]);

    return res.status(200).json({ success: true, data: { status: 'disconnected' } });
  } catch (error) {
    next(error);
  }
};

// ─── GitHub public stats fetcher — UNCHANGED ─────────────────────────────────
async function fetchGitHubStats(username) {
  try {
    const headers = { 'User-Agent': 'DigitalTwin-App' };
    const [userRes, reposRes] = await Promise.allSettled([
      axios.get(`https://api.github.com/users/${username}`, { headers, timeout: 6000 }),
      axios.get(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers, timeout: 6000 }),
    ]);

    const userData  = userRes.status  === 'fulfilled' ? userRes.value.data  : {};
    const reposData = reposRes.status === 'fulfilled' ? reposRes.value.data : [];

    const totalStars = Array.isArray(reposData)
      ? reposData.reduce((sum, r) => sum + (r.stargazers_count || 0), 0)
      : 0;

    const languages = Array.isArray(reposData)
      ? [...new Set(reposData.map(r => r.language).filter(Boolean))].slice(0, 5)
      : [];

    return {
      name:        userData.name         || username,
      bio:         userData.bio          || '',
      publicRepos: userData.public_repos || 0,
      followers:   userData.followers    || 0,
      following:   userData.following    || 0,
      totalStars,
      languages,
      avatarUrl:   userData.avatar_url   || '',
      htmlUrl:     userData.html_url     || `https://github.com/${username}`,
      fetchedAt:   new Date().toISOString(),
    };
  } catch {
    return { name: username, publicRepos: 0, totalStars: 0, languages: [], fetchedAt: new Date().toISOString() };
  }
}

// ─── LeetCode public stats fetcher — UNCHANGED ───────────────────────────────
async function fetchLeetCodeStats(username) {
  try {
    const query = `
      query userPublicProfile($username: String!) {
        matchedUser(username: $username) {
          username
          profile { realName ranking }
          submitStats { acSubmissionNum { difficulty count submissions } }
          userCalendar { streak totalActiveDays }
        }
      }
    `;

    const { data } = await axios.post(
      'https://leetcode.com/graphql',
      { query, variables: { username } },
      { headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' }, timeout: 8000 },
    );

    const user = data?.data?.matchedUser;
    if (!user) return buildMockLeetCodeData(username);

    const stats  = user.submitStats?.acSubmissionNum || [];
    const easy   = stats.find(s => s.difficulty === 'Easy')?.count   || 0;
    const medium = stats.find(s => s.difficulty === 'Medium')?.count || 0;
    const hard   = stats.find(s => s.difficulty === 'Hard')?.count   || 0;
    const total  = stats.find(s => s.difficulty === 'All')?.count    || easy + medium + hard;

    return {
      username,
      realName:     user.profile?.realName || username,
      ranking:      user.profile?.ranking  || 0,
      totalSolved:  total,
      easySolved:   easy,
      mediumSolved: medium,
      hardSolved:   hard,
      streak:       user.userCalendar?.streak       || 0,
      activeDays:   user.userCalendar?.totalActiveDays || 0,
      fetchedAt:    new Date().toISOString(),
    };
  } catch {
    return buildMockLeetCodeData(username);
  }
}

// ─── NEW: HackerRank stats fetcher ────────────────────────────────────────────
async function fetchHackerRankStats(username) {
  try {
    const response = await fetch(
      `https://www.hackerrank.com/rest/hackers/${username}/profile`,
      {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; DigitalTwin/1.0)' },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) throw new Error(`HackerRank returned ${response.status}`);

    const json  = await response.json();
    const model = json?.model || {};

    return {
      username:     model.username     || username,
      badges:       model.badges_count || 0,
      badgesCount:  model.badges_count || 0,
      certificates: model.certificates_count || 0,
      points:       model.score        || 0,
      rank:         model.country_rank || model.world_rank || '—',
      level:        model.level        || '—',
      fetchedAt:    new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`HackerRank fetch failed for ${username}:`, err.message);
    // Graceful fallback — connection still registers, just no live stats
    return {
      username,
      badges: 0, badgesCount: 0, certificates: 0, points: 0, rank: 'N/A',
      note: 'Profile may be private. Stats unavailable.',
      fetchedAt: new Date().toISOString(),
    };
  }
}

// ─── NEW: Codeforces stats fetcher ────────────────────────────────────────────
async function fetchCodeforcesStats(handle) {
  try {
    const response = await fetch(
      `https://codeforces.com/api/user.info?handles=${handle}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) throw new Error(`Codeforces API returned ${response.status}`);

    const json = await response.json();

    if (json.status !== 'OK' || !json.result?.length) {
      throw new Error(`Handle "${handle}" not found on Codeforces`);
    }

    const user = json.result[0];

    return {
      handle:        user.handle,
      rating:        user.rating        ?? 0,
      maxRating:     user.maxRating     ?? 0,
      rank:          user.rank          ?? 'unrated',
      maxRank:       user.maxRank       ?? 'unrated',
      contribution:  user.contribution  ?? 0,
      friendOfCount: user.friendOfCount ?? 0,
      fetchedAt:     new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`Codeforces fetch failed for ${handle}:`, err.message);
    return {
      handle,
      rating: 0, maxRating: 0, rank: 'unrated', contribution: 0,
      note: 'Could not fetch. Check the handle and try again.',
      fetchedAt: new Date().toISOString(),
    };
  }
}

// ─── Mock helpers — UNCHANGED ─────────────────────────────────────────────────
function buildMockLeetCodeData(username = 'user') {
  return {
    username,
    realName:     username,
    ranking:      Math.floor(Math.random() * 200000) + 50000,
    totalSolved:  Math.floor(Math.random() * 300) + 50,
    easySolved:   Math.floor(Math.random() * 120) + 30,
    mediumSolved: Math.floor(Math.random() * 130) + 15,
    hardSolved:   Math.floor(Math.random() * 50),
    streak:       Math.floor(Math.random() * 30),
    activeDays:   Math.floor(Math.random() * 200) + 30,
    isMock:       true,
    fetchedAt:    new Date().toISOString(),
  };
}

function buildMockFitbitData() {
  return {
    steps:          Math.floor(Math.random() * 4000) + 7000,
    sleepHours:     (Math.random() * 2 + 6).toFixed(1),
    avgHeartRate:   Math.floor(Math.random() * 20) + 62,
    hrv:            Math.floor(Math.random() * 30) + 45,
    activeCalories: Math.floor(Math.random() * 300) + 350,
    isMock:         true,
    fetchedAt:      new Date().toISOString(),
  };
}

function normalizeIntegrationName(integration = '') {
  const normalized = String(integration).trim().toLowerCase();
  if (normalized === 'fitband') return 'fitbit';
  return normalized;
}
