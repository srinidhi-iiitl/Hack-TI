import axios from 'axios';
import User from '../models/User.js';
import OnboardingProfile from '../models/OnboardingProfile.js';

const CAREER_DOMAINS = {
  software: ['github', 'leetcode', 'linkedin'],
  coding: ['github', 'leetcode', 'linkedin'],
  business: ['linkedin', 'portfolio', 'businessProfile'],
  creative: ['portfolio', 'linkedin', 'behance'],
};

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
  const next = normalizeCareerIntegrations({ ...current, ...incoming });

  user.careerIntegrations = next;
  user.links = {
    ...(user.links || {}),
    github: next.software.github,
    linkedin: next.software.linkedin,
    portfolio: next.business.portfolio || next.creative.portfolio || user.links?.portfolio || '',
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
  const career = user.careerIntegrations?.toObject?.() || user.careerIntegrations || {};
  const links = user.links || {};
  const legacyGithub = user.get?.('careerIntegrations.github');
  const legacyLeetcode = user.get?.('careerIntegrations.leetcode');
  const legacyLinkedin = user.get?.('careerIntegrations.linkedin');

  return normalizeCareerIntegrations({
    ...career,
    github: career.github || legacyGithub || links.github,
    leetcode: career.leetcode || legacyLeetcode,
    linkedin: career.linkedin || legacyLinkedin || links.linkedin,
    portfolio: links.portfolio,
  });
}

async function syncOnboardingCareerFields(userId, careerIntegrations) {
  const profile = await OnboardingProfile.findOne({ userId });
  const op = profile || new OnboardingProfile({ userId });

  op.githubUsername = extractGithubUsername(careerIntegrations.software.github);
  op.leetcodeUsername = extractLeetcodeUsername(careerIntegrations.software.leetcode);
  op.linkedinProfile = careerIntegrations.software.linkedin;

  await op.save();
}

function normalizeCareerIntegrations(value = {}) {
  const source = value || {};
  return {
    software: normalizeDomainLinks('software', {
      ...source.software,
      ...source.coding,
      github: source.software?.github ?? source.coding?.github ?? source.github,
      leetcode: source.software?.leetcode ?? source.coding?.leetcode ?? source.leetcode,
      linkedin: source.software?.linkedin ?? source.coding?.linkedin ?? source.linkedin,
    }),
    business: normalizeDomainLinks('business', {
      ...source.business,
      portfolio: source.business?.portfolio ?? source.portfolio,
    }),
    creative: normalizeDomainLinks('creative', source.creative),
  };
}

function normalizeDomainLinks(domain, links = {}) {
  const keys = CAREER_DOMAINS[domain] || [];
  return keys.reduce((acc, key) => {
    acc[key] = sanitizeLink(links?.[key]);
    return acc;
  }, {});
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
            submissions
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
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 0,
        submissions: 0,
        acceptanceRate: 0,
        rank: null,
        contestRating: null,
        contests: 0,
      };
    }

    const solvedStats = matchedUser.submitStatsGlobal?.acSubmissionNum || [];
    const allStats = solvedStats.find((item) => item.difficulty === 'All') || {};
    const easyStats = solvedStats.find((item) => item.difficulty === 'Easy') || {};
    const mediumStats = solvedStats.find((item) => item.difficulty === 'Medium') || {};
    const hardStats = solvedStats.find((item) => item.difficulty === 'Hard') || {};
    const solved = allStats.count ?? 0;
    const submissions = allStats.submissions ?? 0;
    const acceptanceRate = submissions > 0 ? Math.round((solved / submissions) * 100) : 0;

    return {
      username: matchedUser.username || username,
      solved,
      easySolved: easyStats.count ?? 0,
      mediumSolved: mediumStats.count ?? 0,
      hardSolved: hardStats.count ?? 0,
      submissions,
      acceptanceRate,
      rank: matchedUser.profile?.ranking ?? contest?.globalRanking ?? null,
      contestRating: contest?.rating ? Math.round(contest.rating) : null,
      contests: contest?.attendedContestsCount ?? 0,
    };
  } catch (error) {
    console.warn(`LeetCode career stats fetch failed for ${username}:`, error.message);
    return {
      username,
      solved: 0,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      submissions: 0,
      acceptanceRate: 0,
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
