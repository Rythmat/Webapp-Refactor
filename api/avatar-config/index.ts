// ── GET / PUT /api/avatar-config ─────────────────────────────────────────
// GET returns the authenticated user's saved avatar config (for load-on-login,
// cross-device). PUT stores it. Keyed by the auth token's user id.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRedis,
  verifyAuthToken,
  getAvatarConfig,
  setAvatarConfig,
} from './_utils';

const NOISE_TYPES = ['simplex', 'diagonal', 'circle', 'sinCos', 'line'];

// Full AvatarConfig shape check — a partial/corrupt blob would render as NaN.
function isValidAvatarConfig(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  const num = (x: unknown): boolean =>
    typeof x === 'number' && !Number.isNaN(x);
  if (
    !num(c.seed) ||
    typeof c.noiseType !== 'string' ||
    !NOISE_TYPES.includes(c.noiseType) ||
    !num(c.paletteIndex) ||
    !num(c.cellSize) ||
    !num(c.zoom) ||
    typeof c.isGradient !== 'boolean' ||
    (c.orientation !== 'pointy' && c.orientation !== 'flat') ||
    !num(c.hueShift) ||
    !num(c.saturationShift) ||
    !num(c.lightnessShift)
  ) {
    return false;
  }
  return (
    c.paletteOverride === undefined ||
    (Array.isArray(c.paletteOverride) &&
      c.paletteOverride.every((x) => typeof x === 'string'))
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const auth = await verifyAuthToken(req.headers.authorization ?? null);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const redis = getRedis();

  if (req.method === 'GET') {
    const config = await getAvatarConfig(redis, auth.sub);
    res.status(200).json({ config: config ?? null });
    return;
  }

  if (req.method === 'PUT') {
    const config = req.body;
    if (!isValidAvatarConfig(config)) {
      res.status(400).json({ error: 'Invalid avatar config' });
      return;
    }
    await setAvatarConfig(redis, auth.sub, config);
    res.status(200).json({ success: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
