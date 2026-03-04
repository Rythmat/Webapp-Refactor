import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeFreeCredits } from '../lib/db';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const MUSIC_ATLAS_API_URL = process.env.MUSIC_ATLAS_API_URL!;

function getRedirectUri(req: VercelRequest): string {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}/api/auth/google`;
}

function getFrontendUrl(req: VercelRequest): string {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const redirectUri = getRedirectUri(req);
  const code = req.query.code as string | undefined;

  // Step 1: No code → redirect to Google consent screen
  if (!code) {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  // Step 2: Exchange code for tokens
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.redirect(`${getFrontendUrl(req)}/auth/sign-in?error=google_token_failed`);
    }

    // Step 3: Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();
    const email = userData.email as string;
    const fullName = userData.name as string | undefined;

    if (!email) {
      return res.redirect(`${getFrontendUrl(req)}/auth/sign-in?error=no_email`);
    }

    // Step 4: Upsert user via existing backend
    const oauthRes = await fetch(`${MUSIC_ATLAS_API_URL}/auth/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'google', email, fullName }),
    });

    const oauthData = await oauthRes.json();

    if (!oauthData.token) {
      return res.redirect(`${getFrontendUrl(req)}/auth/sign-in?error=auth_failed`);
    }

    // Step 5: Initialize free credits for new users
    if (oauthData.isNewUser && oauthData.userId) {
      await initializeFreeCredits(oauthData.userId);
    }

    // Step 6: Redirect to frontend with token
    return res.redirect(`${getFrontendUrl(req)}/auth/sign-in#token=${oauthData.token}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return res.redirect(`${getFrontendUrl(req)}/auth/sign-in?error=google_auth_error`);
  }
}
