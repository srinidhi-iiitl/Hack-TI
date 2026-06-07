import axios from 'axios';

const GITHUB_API_URL = 'https://api.github.com';
const REQUEST_TIMEOUT_MS = Number(process.env.INTEGRATION_TIMEOUT_MS) || 4500;

export async function fetchGithubProfile(username) {
  const githubRef = parseGithubReference(username);
  const cleanUsername = sanitizeGithubUsername(githubRef.username);

  if (!cleanUsername) {
    return buildGithubFallback(username, 'GitHub username is missing or invalid');
  }

  try {
    const client = axios.create({
      baseURL: GITHUB_API_URL,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'LifeTwin-MVP',
      },
    });

    const [profileResponse, reposResponse, eventsResponse, selectedRepoResponse] = await Promise.allSettled([
      client.get(`/users/${cleanUsername}`),
      client.get(`/users/${cleanUsername}/repos`, {
        params: {
          sort: 'updated',
          per_page: 100,
        },
      }),
      client.get(`/users/${cleanUsername}/events/public`, {
        params: {
          per_page: 30,
        },
      }),
      githubRef.repo ? client.get(`/repos/${cleanUsername}/${githubRef.repo}`) : Promise.resolve(null),
    ]);

    if (profileResponse.status !== 'fulfilled') {
      return buildGithubFallback(cleanUsername, 'GitHub profile could not be fetched');
    }

    const profile = profileResponse.value.data;
    const repos = reposResponse.status === 'fulfilled' ? reposResponse.value.data : [];
    const selectedRepo = selectedRepoResponse.status === 'fulfilled' ? selectedRepoResponse.value?.data : null;
    const events = eventsResponse.status === 'fulfilled' ? eventsResponse.value.data : [];
    const languages = summarizeLanguages(repos);
    const recentActivityCount = countRecentEvents(events, 14);
    const totalStars = selectedRepo
      ? Number(selectedRepo.stargazers_count || 0)
      : repos.reduce((sum, repo) => sum + Number(repo.stargazers_count || 0), 0);

    return {
      source: 'github',
      connected: true,
      username: cleanUsername,
      name: profile.name || '',
      profileUrl: githubRef.url || profile.html_url || '',
      selectedRepo: selectedRepo?.name || githubRef.repo || '',
      avatarUrl: profile.avatar_url || '',
      publicRepos: githubRef.repo ? 1 : profile.public_repos || 0,
      totalStars,
      followers: profile.followers || 0,
      following: profile.following || 0,
      accountCreatedAt: profile.created_at || null,
      topLanguages: languages,
      recentActivityCount,
      repositories: repos.map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        language: repo.language || 'Unknown',
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        updatedAt: repo.updated_at,
      })),
      activityTypes: summarizeEventTypes(events),
      fetchedAt: new Date().toISOString(),
      error: '',
    };
  } catch (error) {
    return buildGithubFallback(cleanUsername, 'GitHub integration unavailable');
  }
}

function sanitizeGithubUsername(username) {
  const value = extractGithubUsername(username);
  return /^[a-zA-Z0-9-]{1,39}$/.test(value) ? value : '';
}

function extractGithubUsername(input) {
  return parseGithubReference(input).username;
}

function parseGithubReference(input) {
  const value = String(input || '').trim().replace(/^@/, '');

  if (!value) return { username: '', repo: '', url: '' };

  try {
    const url = new URL(value.startsWith('http') ? value : `https://github.com/${value}`);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

    if (hostname !== 'github.com') return { username: value, repo: '', url: '' };

    const [username = '', repo = ''] = url.pathname.split('/').filter(Boolean);
    return {
      username,
      repo,
      url: username ? `https://github.com/${username}${repo ? `/${repo}` : ''}` : '',
    };
  } catch {
    const [username = '', repo = ''] = value.split('/').filter(Boolean);
    return {
      username,
      repo,
      url: username ? `https://github.com/${username}${repo ? `/${repo}` : ''}` : '',
    };
  }
}

function summarizeLanguages(repos) {
  const counts = repos.reduce((summary, repo) => {
    const language = repo.language || 'Unknown';
    summary[language] = (summary[language] || 0) + 1;
    return summary;
  }, {});

  return Object.entries(counts)
    .map(([language, count]) => ({ language, count }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 5);
}

function summarizeEventTypes(events) {
  const counts = events.reduce((summary, event) => {
    summary[event.type] = (summary[event.type] || 0) + 1;
    return summary;
  }, {});

  return Object.entries(counts)
    .map(([type, count]) => ({ type, count }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 5);
}

function countRecentEvents(events, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return events.filter((event) => new Date(event.created_at).getTime() >= cutoff).length;
}

function buildGithubFallback(username, error) {
  return {
    source: 'github',
    connected: false,
    username: String(username || '').trim(),
    name: '',
    profileUrl: '',
    avatarUrl: '',
    publicRepos: 0,
    totalStars: 0,
    followers: 0,
    following: 0,
    accountCreatedAt: null,
    topLanguages: [],
    recentActivityCount: 0,
    repositories: [],
    activityTypes: [],
    fetchedAt: new Date().toISOString(),
    error,
  };
}
