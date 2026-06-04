import axios from 'axios';
import User from '../models/User.js';
import OnboardingProfile from '../models/OnboardingProfile.js';

const CAREER_KEYS = ['github', 'leetcode', 'linkedin'];

export const getCareerIntegrations = async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  return res.status(200).json({
    success: true,
    data: buildCareerIntegrations(user),
  });
};

export const updateCareerIntegrations = async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const incoming = req.body?.careerIntegrations || req.body || {};
  const current = buildCareerIntegrations(user);
  const next = { ...current };

  CAREER_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(incoming, key)) {
      next[key] = sanitizeLink(incoming[key]);
    }
  });

  user.careerIntegrations = next;
  user.links = {
    ...(user.links || {}),
    github: next.github,
    linkedin: next.linkedin,
  };

  await Promise.all([
    user.save(),
    syncOnboardingCareerFields(req.user.userId, next),
  ]);

  return res.status(200).json({
    success: true,
    data: buildCareerIntegrations(user),
  });
};

export const getLeetcodeCareerStats = async (req, res) => {
  const username = extractLeetcodeUsername(req.query.username || req.query.profileUrl || '');

  if (!username) {
    return res.status(400).json({ success: false, message: 'LeetCode username is required' });
  }

  const stats = await fetchLeetcodeStats(username);

  return res.status(200).json({
    success: true,
    data: stats,
  });
};

export const getLeetcodeActivityCalendar = async (req, res) => {
  const username = extractLeetcodeUsername(req.query.username || req.query.profileUrl || '');

  if (!username) {
    return res.status(400).json({ success: false, message: 'LeetCode username is required' });
  }

  const calendar = await fetchLeetcodeSubmissionCalendar(username);

  return res.status(200).json({
    success: true,
    data: {
      username,
      calendar,
    },
  });
};

function buildCareerIntegrations(user) {
  const career = user.careerIntegrations || {};
  const links = user.links || {};

  return {
    github: sanitizeLink(career.github || links.github),
    leetcode: sanitizeLink(career.leetcode),
    linkedin: sanitizeLink(career.linkedin || links.linkedin),
  };
}

async function syncOnboardingCareerFields(userId, careerIntegrations) {
  const profile = await OnboardingProfile.findOne({ userId });
  const op = profile || new OnboardingProfile({ userId });

  op.githubUsername = extractGithubUsername(careerIntegrations.github);
  op.leetcodeUsername = extractLeetcodeUsername(careerIntegrations.leetcode);
  op.linkedinProfile = careerIntegrations.linkedin;

  await op.save();
}

function sanitizeLink(value = '') {
  return typeof value === 'string' ? value.trim() : '';
}

function extractGithubUsername(value = '') {
  const trimmed = sanitizeLink(value);
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://github.com/${trimmed}`);
    if (!url.hostname.replace(/^www\./, '').toLowerCase().includes('github.com')) return trimmed;
    return url.pathname.split('/').filter(Boolean)[0] || '';
  } catch {
    return trimmed.replace(/^@/, '');
  }
}

function extractLeetcodeUsername(value = '') {
  const trimmed = sanitizeLink(value);
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://leetcode.com/u/${trimmed}`);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[0] === 'u' ? parts[1] || '' : parts[0] || '';
  } catch {
    return trimmed.replace(/^@/, '');
  }
}

async function fetchLeetcodeStats(username) {
  const query = `
    query careerLeetcodeStats($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          ranking
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
      }
    }
  `;

  try {
    const response = await axios.post(
      'https://leetcode.com/graphql',
      { query, variables: { username } },
      {
        headers: {
          'Content-Type': 'application/json',
          Referer: `https://leetcode.com/u/${username}/`,
          'User-Agent': 'DigitalTwin-App',
        },
        timeout: 9000,
      },
    );

    const matchedUser = response.data?.data?.matchedUser;
    const contest = response.data?.data?.userContestRanking;

    if (!matchedUser) {
      return {
        username,
        solved: 0,
        rank: null,
        contestRating: null,
        contests: 0,
      };
    }

    const solvedStats = matchedUser.submitStatsGlobal?.acSubmissionNum || [];
    const solved = solvedStats.find((item) => item.difficulty === 'All')?.count ?? 0;

    return {
      username: matchedUser.username || username,
      solved,
      rank: matchedUser.profile?.ranking ?? contest?.globalRanking ?? null,
      contestRating: contest?.rating ? Math.round(contest.rating) : null,
      contests: contest?.attendedContestsCount ?? 0,
    };
  } catch (error) {
    console.warn(`LeetCode career stats fetch failed for ${username}:`, error.message);
    return {
      username,
      solved: 0,
      rank: null,
      contestRating: null,
      contests: 0,
    };
  }
}

async function fetchLeetcodeSubmissionCalendar(username) {
  const query = `
    query careerLeetcodeActivity($username: String!) {
      matchedUser(username: $username) {
        username
        submissionCalendar
      }
    }
  `;

  try {
    const response = await axios.post(
      'https://leetcode.com/graphql',
      { query, variables: { username } },
      {
        headers: {
          'Content-Type': 'application/json',
          Referer: `https://leetcode.com/u/${username}/`,
          'User-Agent': 'DigitalTwin-App',
        },
        timeout: 9000,
      },
    );

    const rawCalendar = response.data?.data?.matchedUser?.submissionCalendar;
    if (!rawCalendar) return {};

    return typeof rawCalendar === 'string' ? JSON.parse(rawCalendar) : rawCalendar;
  } catch (error) {
    console.warn(`LeetCode activity calendar fetch failed for ${username}:`, error.message);
    return {};
  }
}
