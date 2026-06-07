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
  const githubRef = extractGithubReference(profileUrl);
  if (!githubRef.username) return null;

  const [userResult, repoListResult, singleRepoResult] = await Promise.allSettled([
    axios.get(`https://api.github.com/users/${encodeURIComponent(githubRef.username)}`, { timeout: 7000 }),
    axios.get(`https://api.github.com/users/${encodeURIComponent(githubRef.username)}/repos?per_page=100`, { timeout: 7000 }),
    githubRef.repo
      ? axios.get(`https://api.github.com/repos/${encodeURIComponent(githubRef.username)}/${encodeURIComponent(githubRef.repo)}`, { timeout: 7000 })
      : Promise.resolve(null),
  ]);

  const user = userResult.status === 'fulfilled' ? userResult.value.data : {};
  const repos = repoListResult.status === 'fulfilled' && Array.isArray(repoListResult.value.data) ? repoListResult.value.data : [];
  const selectedRepo = singleRepoResult.status === 'fulfilled' ? singleRepoResult.value?.data : null;
  const totalStars = selectedRepo
    ? Number(selectedRepo.stargazers_count || 0)
    : repos.reduce((sum, repo) => sum + Number(repo.stargazers_count || 0), 0);

  return {
    username: githubRef.username,
    repository: selectedRepo?.name || githubRef.repo || '',
    repositories: githubRef.repo ? 1 : user.public_repos ?? repos.length,
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
    easySolved: stats.easySolved ?? 0,
    mediumSolved: stats.mediumSolved ?? 0,
    hardSolved: stats.hardSolved ?? 0,
    submissions: stats.submissions ?? 0,
    acceptanceRate: stats.acceptanceRate ?? 0,
    rank: stats.rank ?? null,
    contestRating: stats.contestRating ?? null,
    contests: stats.contests ?? 0,
  };
}

function extractGithubReference(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return { username: '', repo: '' };
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://github.com/${trimmed}`);
    const [username = '', repo = ''] = url.pathname.split('/').filter(Boolean);
    return { username: username.replace(/^@/, ''), repo };
  } catch {
    const [username = '', repo = ''] = trimmed.replace(/^@/, '').split('/').filter(Boolean);
    return { username, repo };
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
