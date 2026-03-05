import { verify } from 'jsonwebtoken';

interface TokenPayload {
  user_id: string;
  exp: number;
  role: 'student' | 'teacher' | 'admin';
}

const JWT_SECRET = process.env.JWT_SECRET;

export function verifyToken(token: string): TokenPayload | null {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    return verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export function getUserFromRequest(
  authHeader: string | undefined,
): TokenPayload | null {
  const token = extractToken(authHeader);
  if (!token) return null;
  return verifyToken(token);
}
