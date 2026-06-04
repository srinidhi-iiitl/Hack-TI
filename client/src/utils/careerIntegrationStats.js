import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function fetchCareerIntegrationStats(provider, profileUrl) {
  if (!profileUrl) return null;

  if (provider === 'github') {
    return fetchGithubStats(profileUrl);
  }

  if (provider === 'leetcode') {
    return fetchLeetcodeStats(profileUrl);
  }

  return null;
}

export function getCareerProfileLabel(provider, profileUrl) {
  if (!profileUrl) return '';
  try {
    const url = new URL(profileUrl);
    return `${url.hostname.replace(/^www\./, '')}${url.pathname}`.replace(/\/$/, '');
  } catch {
    return profileUrl;
  }
}

async function fetchGithubStats(profileUrl) {
  const username = extractGithubUsername(profileUrl);
  if (!username) return null;

  const [userResult, repoResult] = await Promise.allSettled([
    axios.get(`https://api.github.com/users/${encodeURIComponent(username)}`, { timeout: 7000 }),
    axios.get(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100`, { timeout: 7000 }),
  ]);

  const user = userResult.status === 'fulfilled' ? userResult.value.data : {};
  const repos = repoResult.status === 'fulfilled' && Array.isArray(repoResult.value.data) ? repoResult.value.data : [];
  const totalStars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);

  return {
    username,
    repositories: user.public_repos ?? repos.length,
    followers: user.followers ?? 0,
    following: user.following ?? 0,
    stars: totalStars,
  };
}

async function fetchLeetcodeStats(profileUrl) {
  const username = extractLeetcodeUsername(profileUrl);
  if (!username) return null;

  const response = await axios.get(`${API_BASE_URL}/api/career-integrations/leetcode-stats`, {
    params: { username },
    headers: authHeaders(),
    timeout: 10000,
  });
  const data = response.data || {};
  const stats = data.data || data;

  return {
    username: stats.username || username,
    solved: stats.solved ?? 0,
    rank: stats.rank ?? null,
    contestRating: stats.contestRating ?? null,
    contests: stats.contests ?? 0,
  };
}

function extractGithubUsername(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://github.com/${trimmed}`);
    return url.pathname.split('/').filter(Boolean)[0] || '';
  } catch {
    return trimmed.replace(/^@/, '');
  }
}

function extractLeetcodeUsername(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://leetcode.com/u/${trimmed}`);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[0] === 'u' ? parts[1] || '' : parts[0] || '';
  } catch {
    return trimmed.replace(/^@/, '');
  }
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` };
}
