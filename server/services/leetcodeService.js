import axios from 'axios';

const LEETCODE_STATS_URL = 'https://leetcode-stats-api.herokuapp.com';
const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';
const REQUEST_TIMEOUT_MS = Number(process.env.INTEGRATION_TIMEOUT_MS) || 4500;

export async function fetchLeetcodeProfile(username) {
  const cleanUsername = sanitizeLeetcodeUsername(username);

  if (!cleanUsername) {
    return buildLeetcodeFallback(username, 'LeetCode username is missing or invalid');
  }

  const statsApiData = await fetchLeetcodeStatsApi(cleanUsername);

  if (statsApiData.connected) {
    return statsApiData;
  }

  const graphqlData = await fetchLeetcodeGraphql(cleanUsername);

  if (graphqlData.connected) {
    return graphqlData;
  }

  return buildLeetcodeFallback(cleanUsername, graphqlData.error || statsApiData.error || 'LeetCode profile could not be verified');
}

async function fetchLeetcodeStatsApi(username) {
  try {
    const response = await axios.get(`${LEETCODE_STATS_URL}/${username}`, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'LifeTwin-MVP',
      },
    });

    const data = response.data || {};

    if (data.status === 'error') {
      return buildLeetcodeFallback(username, data.message || 'LeetCode profile could not be fetched');
    }

    return normalizeStatsApiResponse(username, data);
  } catch (error) {
    return buildLeetcodeFallback(username, 'LeetCode stats API unavailable');
  }
}

async function fetchLeetcodeGraphql(username) {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          ranking
          reputation
          userAvatar
          realName
        }
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      LEETCODE_GRAPHQL_URL,
      {
        query,
        variables: { username },
      },
      {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Referer: `https://leetcode.com/u/${username}/`,
          'User-Agent': 'LifeTwin-MVP',
        },
      }
    );

    const matchedUser = response.data?.data?.matchedUser;

    if (!matchedUser) {
      return buildLeetcodeFallback(username, 'LeetCode profile was not found');
    }

    return normalizeGraphqlResponse(username, matchedUser);
  } catch (error) {
    return buildLeetcodeFallback(username, 'LeetCode integration unavailable');
  }
}

function normalizeStatsApiResponse(username, data) {
  const totalSolved = Number(data.totalSolved || 0);
  const totalQuestions = Number(data.totalQuestions || 0);

  return {
    source: 'leetcode',
    provider: 'stats-api',
    connected: true,
    username,
    ranking: Number(data.ranking || 0),
    reputation: Number(data.reputation || 0),
    contributionPoints: Number(data.contributionPoints || 0),
    totalSolved,
    totalQuestions,
    easySolved: Number(data.easySolved || 0),
    mediumSolved: Number(data.mediumSolved || 0),
    hardSolved: Number(data.hardSolved || 0),
    acceptanceRate: Number(data.acceptanceRate || 0),
    solvedPercentage: totalQuestions > 0 ? Math.round((totalSolved / totalQuestions) * 100) : 0,
    fetchedAt: new Date().toISOString(),
    error: '',
  };
}

function normalizeGraphqlResponse(username, matchedUser) {
  const submissions = matchedUser.submitStats?.acSubmissionNum || [];
  const total = findSolvedCount(submissions, 'All');
  const easy = findSolvedCount(submissions, 'Easy');
  const medium = findSolvedCount(submissions, 'Medium');
  const hard = findSolvedCount(submissions, 'Hard');
  const totalSubmissions = findSubmissionCount(submissions, 'All');
  const acceptanceRate = totalSubmissions > 0 ? Math.round((total / totalSubmissions) * 100) : 0;

  return {
    source: 'leetcode',
    provider: 'graphql',
    connected: true,
    username: matchedUser.username || username,
    ranking: Number(matchedUser.profile?.ranking || 0),
    reputation: Number(matchedUser.profile?.reputation || 0),
    contributionPoints: 0,
    totalSolved: total,
    totalQuestions: 0,
    easySolved: easy,
    mediumSolved: medium,
    hardSolved: hard,
    submissions: totalSubmissions,
    acceptanceRate,
    solvedPercentage: 0,
    avatarUrl: matchedUser.profile?.userAvatar || '',
    realName: matchedUser.profile?.realName || '',
    fetchedAt: new Date().toISOString(),
    error: '',
  };
}

function findSolvedCount(submissions, difficulty) {
  const item = submissions.find((entry) => entry.difficulty === difficulty);
  return Number(item?.count || 0);
}

function findSubmissionCount(submissions, difficulty) {
  const item = submissions.find((entry) => entry.difficulty === difficulty);
  return Number(item?.submissions || 0);
}

function sanitizeLeetcodeUsername(username) {
  const value = extractLeetcodeUsername(username);
  return /^[a-zA-Z0-9_-]{1,40}$/.test(value) ? value : '';
}

function extractLeetcodeUsername(input) {
  const value = String(input || '').trim();

  if (!value) return '';

  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

    if (hostname !== 'leetcode.com') return value;

    const parts = url.pathname.split('/').filter(Boolean);
    const userIndex = parts.findIndex((part) => part.toLowerCase() === 'u');

    if (userIndex >= 0 && parts[userIndex + 1]) {
      return parts[userIndex + 1];
    }

    if (parts.length === 1) {
      return parts[0];
    }

    return '';
  } catch {
    return value;
  }
}

function buildLeetcodeFallback(username, error) {
  return {
    source: 'leetcode',
    provider: '',
    connected: false,
    username: String(username || '').trim(),
    ranking: 0,
    reputation: 0,
    contributionPoints: 0,
    totalSolved: 0,
    totalQuestions: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    acceptanceRate: 0,
    solvedPercentage: 0,
    fetchedAt: new Date().toISOString(),
    error,
  };
}
