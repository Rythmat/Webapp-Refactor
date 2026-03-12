import type { VercelRequest } from '@vercel/node';

export function resolveApiBaseUrl(req: VercelRequest): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return process.env.MUSIC_ATLAS_API_URL || `${proto}://${host}`;
}

export async function proxyJsonRequest(params: {
  apiBaseUrl: string;
  path: string;
  method: 'GET' | 'POST';
  authHeader?: string;
  body?: unknown;
  extraHeaders?: Record<string, string>;
}) {
  const url = `${params.apiBaseUrl.replace(/\/$/, '')}${params.path}`;
  const response = await fetch(url, {
    method: params.method,
    headers: {
      'Content-Type': 'application/json',
      ...(params.authHeader ? { Authorization: params.authHeader } : {}),
      ...(params.extraHeaders ?? {}),
    },
    ...(params.body !== undefined ? { body: JSON.stringify(params.body) } : {}),
  });

  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}
