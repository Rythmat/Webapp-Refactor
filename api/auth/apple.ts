import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
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
  return jwt.sign(
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
      const { code, id_token, user } = req.body;

      if (!code) {
        return res.redirect(`${getFrontendUrl(req)}/auth/sign-in?error=apple_no_code`);
      }

      // Exchange code for tokens
      const clientSecret = generateClientSecret();
      const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: APPLE_CLIENT_ID,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenRes.json();
      const appleIdToken = tokenData.id_token || id_token;

      if (!appleIdToken) {
        return res.redirect(`${getFrontendUrl(req)}/auth/sign-in?error=apple_token_failed`);
      }

      // Decode Apple's id_token to get email
      const decoded = jwt.decode(appleIdToken) as { email?: string; sub?: string } | null;
      const email = decoded?.email;

      if (!email) {
        return res.redirect(`${getFrontendUrl(req)}/auth/sign-in?error=no_email`);
      }

      // Apple only sends user name on first authorization
      let fullName: string | undefined;
      if (user) {
        try {
          const userData = typeof user === 'string' ? JSON.parse(user) : user;
          const first = userData?.name?.firstName || '';
          const last = userData?.name?.lastName || '';
          fullName = [first, last].filter(Boolean).join(' ') || undefined;
        } catch {
          // Name parsing failed, continue without it
        }
      }

      // Upsert user via existing backend
      const oauthRes = await fetch(`${MUSIC_ATLAS_API_URL}/auth/oauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'apple', email, fullName }),
      });

      const oauthData = await oauthRes.json();

      if (!oauthData.token) {
        return res.redirect(`${getFrontendUrl(req)}/auth/sign-in?error=auth_failed`);
      }

      // Initialize free credits for new users
      if (oauthData.isNewUser && oauthData.userId) {
        await initializeFreeCredits(oauthData.userId);
      }

      return res.redirect(`${getFrontendUrl(req)}/auth/sign-in#token=${oauthData.token}`);
    } catch (error) {
      console.error('Apple OAuth error:', error);
      return res.redirect(`${getFrontendUrl(req)}/auth/sign-in?error=apple_auth_error`);
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
