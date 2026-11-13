import { describe, expect, it, vi } from 'vitest';
import { releaseNeeded } from '../.github/scripts/check-release.mjs';

const config = { apiUrl: 'https://api.github.com', repository: 'owner/repo', token: 'secret', version: '1.2.3+test' };

describe('releaseNeeded', () => {
  it.each([[200, false], [404, true]])('handles release status %s', async (status, expected) => {
    const request = vi.fn().mockResolvedValueOnce({ status: 200 }).mockResolvedValueOnce({ status });
    await expect(releaseNeeded({ ...config, request })).resolves.toBe(expected);
    expect(request).toHaveBeenNthCalledWith(1, 'https://api.github.com/repos/owner/repo', expect.any(Object));
    expect(request).toHaveBeenNthCalledWith(2, 'https://api.github.com/repos/owner/repo/releases/tags/v1.2.3%2Btest', {
      headers: { Authorization: 'Bearer secret', Accept: 'application/vnd.github+json' },
    });
  });

  it.each([401, 403, 404, 500])('fails when repository lookup returns %s', async (status) => {
    const request = vi.fn().mockResolvedValue({ status });
    await expect(releaseNeeded({ ...config, request })).rejects.toThrow(`Repository lookup failed (HTTP ${status})`);
    expect(request).toHaveBeenCalledOnce();
  });

  it.each([401, 403, 429, 500])('fails when release lookup returns %s', async (status) => {
    const request = vi.fn().mockResolvedValueOnce({ status: 200 }).mockResolvedValueOnce({ status });
    await expect(releaseNeeded({ ...config, request })).rejects.toThrow(`Release lookup failed (HTTP ${status})`);
  });

  it('propagates network failures', async () => {
    const request = vi.fn().mockRejectedValue(new Error('network failure'));
    await expect(releaseNeeded({ ...config, request })).rejects.toThrow('network failure');
  });

  it('rejects missing configuration', async () => {
    await expect(releaseNeeded({ ...config, token: '' })).rejects.toThrow('Missing GitHub API configuration');
  });
});
