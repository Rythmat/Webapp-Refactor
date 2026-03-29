import { jwtDecode } from 'jwt-decode';
import { AuthContextData, UserRole } from './types';

export function decodeToken(
  token: string | null,
): Omit<AuthContextData, 'error' | 'isPending'> {
  if (!token) {
    return {
      userId: null,
      token: null,
      expiresAt: null,
      role: null,
      isAuth0Loading: false,
      isAuth0Authenticated: false,
      appSessionId: null,
      appUser: null,
      isBootstrapLoading: false,
    };
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
      isAuth0Loading: false,
      isAuth0Authenticated: true,
      appSessionId: null,
      appUser: null,
      isBootstrapLoading: false,
    };
  } catch {
    return {
      userId: null,
      token: null,
      expiresAt: null,
      role: null,
      isAuth0Loading: false,
      isAuth0Authenticated: false,
      appSessionId: null,
      appUser: null,
      isBootstrapLoading: false,
    };
  }
}
