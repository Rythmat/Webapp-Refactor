import { jwtDecode } from 'jwt-decode';
import { AuthContextData, UserRole } from './types';

export function decodeToken(
  token: string | null,
): Omit<AuthContextData, 'error' | 'isPending'> {
  if (!token) {
    return { userId: null, token: null, expiresAt: null, role: null };
  }

  try {
    const decoded = jwtDecode<{
      user_id: string;
      exp: number;
      role: UserRole;
    }>(token);

    return {
      userId: decoded.user_id,
      token,
      expiresAt: decoded.exp,
      role: decoded.role,
    };
  } catch (error) {
    return { userId: null, token: null, expiresAt: null, role: null };
  }
}
