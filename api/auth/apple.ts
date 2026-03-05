/* eslint-disable import/no-default-export */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { decode, sign } from 'jsonwebtoken';
import { initializeFreeCredits } from '../lib/db';

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID!;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID!;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID!;
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY!;
const MUSIC_ATLAS_API_URL = process.env.MUSIC_ATLAS_API_URL!;

function getRedirectUri(req: VercelRequest): string {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}/api/auth/apple`;
}

function getFrontendUrl(req: VercelRequest): string {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function generateClientSecret(): string {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      iss: APPLE_TEAM_ID,
      iat: now,
      exp: now + 15777000, // ~6 months
      aud: 'https://appleid.apple.com',
      sub: APPLE_CLIENT_ID,
    },
    APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    { algorithm: 'ES256', header: { alg: 'ES256', kid: APPLE_KEY_ID } },
  );
}

function redirectWithError(
  req: VercelRequest,
  res: VercelResponse,
  code: string,
) {
  return res.redirect(`${getFrontendUrl(req)}/auth/sign-in?error=${code}`);
}

function parseAppleFullName(user: unknown): string | undefined {
  if (!user) return undefined;
  try {
    const userData =
      typeof user === 'string' ? (JSON.parse(user) as unknown) : user;
    const typed = userData as {
      name?: { firstName?: string; lastName?: string };
    };
    const first = typed?.name?.firstName || '';
    const last = typed?.name?.lastName || '';
    return [first, last].filter(Boolean).join(' ') || undefined;
  } catch {
    return undefined;
  }
}

async function exchangeAppleCodeForIdToken(params: {
  code: string;
  idTokenFromBody?: string;
  redirectUri: string;
}): Promise<string | null> {
  const clientSecret = generateClientSecret();
  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      client_secret: clientSecret,
      code: params.code,
      grant_type: 'authorization_code',
      redirect_uri: params.redirectUri,
    }),
  });
  const tokenData = (await tokenRes.json()) as { id_token?: string };
  return tokenData.id_token || params.idTokenFromBody || null;
}

function getEmailFromAppleIdToken(idToken: string): string | undefined {
  const decoded = decode(idToken) as { email?: string } | null;
  return decoded?.email;
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const redirectUri = getRedirectUri(req);
  const { code, id_token, user } = req.body as {
    code?: string;
    id_token?: string;
    user?: unknown;
  };

  if (!code) return redirectWithError(req, res, 'apple_no_code');

  const appleIdToken = await exchangeAppleCodeForIdToken({
    code,
    idTokenFromBody: id_token,
    redirectUri,
  });
  if (!appleIdToken) return redirectWithError(req, res, 'apple_token_failed');

  const email = getEmailFromAppleIdToken(appleIdToken);
  if (!email) return redirectWithError(req, res, 'no_email');

  const fullName = parseAppleFullName(user);
  const oauthRes = await fetch(`${MUSIC_ATLAS_API_URL}/auth/oauth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'apple', email, fullName }),
  });
  const oauthData = (await oauthRes.json()) as {
    token?: string;
    isNewUser?: boolean;
    userId?: string;
  };

  if (!oauthData.token) return redirectWithError(req, res, 'auth_failed');

  if (oauthData.isNewUser && oauthData.userId) {
    await initializeFreeCredits(oauthData.userId);
  }

  return res.redirect(
    `${getFrontendUrl(req)}/auth/sign-in#token=${oauthData.token}`,
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const redirectUri = getRedirectUri(req);

  // GET: Redirect to Apple Sign-In
  if (req.method === 'GET') {
    const params = new URLSearchParams({
      client_id: APPLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'name email',
      response_mode: 'form_post',
    });

    return res.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
  }

  // POST: Apple callback (form_post)
  if (req.method === 'POST') {
    try {
      return await handlePost(req, res);
    } catch (error) {
      console.error('Apple OAuth error:', error);
      return redirectWithError(req, res, 'apple_auth_error');
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
