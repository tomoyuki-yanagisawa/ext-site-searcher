import { readFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function releaseNeeded({ apiUrl, repository, token, version, request = fetch }) {
  if (!apiUrl || !repository || !token || !version) {
    throw new Error('Missing GitHub API configuration or package version');
  }
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  };
  const repoUrl = `${apiUrl}/repos/${repository}`;
  const repo = await request(repoUrl, { headers });
  if (repo.status !== 200) throw new Error(`Repository lookup failed (HTTP ${repo.status})`);

  const release = await request(`${repoUrl}/releases/tags/${encodeURIComponent(`v${version}`)}`, { headers });
  if (release.status === 200) return false;
  if (release.status === 404) return true;
  throw new Error(`Release lookup failed (HTTP ${release.status})`);
}

async function main() {
  const { version } = JSON.parse(await readFile('package.json', 'utf8'));
  const needed = await releaseNeeded({
    apiUrl: process.env.GITHUB_API_URL,
    repository: process.env.GITHUB_REPOSITORY,
    token: process.env.GH_TOKEN,
    version,
  });
  if (!process.env.GITHUB_OUTPUT) throw new Error('Missing GITHUB_OUTPUT');
  await appendFile(process.env.GITHUB_OUTPUT, `version=${version}\nneeded=${needed}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
