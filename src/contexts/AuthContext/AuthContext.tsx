import { useAuth0, type AuthenticationError } from '@auth0/auth0-react';
import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import SuperJSON from 'superjson';
import { setCurrentAppSessionId } from '@/auth/app-session-store';
import {
  onSessionError,
  type SessionErrorPayload,
} from '@/auth/session-errors';
import { Env } from '@/constants/env';
import { ProfileRoutes } from '@/constants/routes';
import { showError } from '@/util/toast';
import { useGlobalMusicAtlas } from '../MusicAtlasContext/api';
import {
  AuthAppUser,
  AuthContextData,
  AuthContextValue,
  CreateStudentParams,
  CreateTeacherParams,
  UserRole,
} from './types';

const getApiErrorMessage = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const maybeError = value as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };

  const apiMessage =
    maybeError.response?.data?.message || maybeError.response?.data?.error;

  if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
    return apiMessage;
  }

  if (
    typeof maybeError.message === 'string' &&
    maybeError.message.trim().length > 0
  ) {
    return maybeError.message;
  }

  return null;
};

const mapMe = (value: unknown): AuthAppUser | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const payload = value as Record<string, unknown>;

  if (typeof payload.id !== 'string' || payload.id.length === 0) {
    return null;
  }

  const organizations = Array.isArray(payload.organizations)
    ? payload.organizations.map(
        (entry) => entry as AuthAppUser['organizations'][number],
      )
    : [];
  const username =
    typeof payload.username === 'string' ? payload.username : null;
  const nickname =
    typeof payload.nickname === 'string' ? payload.nickname : (username ?? '');

  return {
    ...payload,
    id: payload.id,
    role: (typeof payload.role === 'string'
      ? (payload.role as UserRole)
      : 'student') as UserRole,
    email: (payload.email as string | null) ?? null,
    fullName: (payload.fullName as string | null) ?? null,
    nickname,
    school: (payload.school as string | null) ?? null,
    createdAt: payload.createdAt as Date,
    updatedAt: payload.updatedAt as Date,
    auth0Sub: (payload.auth0Sub as string | null) ?? null,
    avatarUrl: (payload.avatarUrl as string | null) ?? null,
    avatarConfig: null,
    organizations,
    birthDate: (payload.birthDate as Date | null) ?? null,
    username,
  };
};

/** Messages shown to the user based on session error type. */
const SESSION_ERROR_MESSAGES: Record<string, string> = {
  SESSION_REPLACED:
    'You were signed out because your account was used on another device.',
  SESSION_EXPIRED: 'Your session expired due to inactivity.',
  SESSION_INVALID: 'Your session is invalid. Please sign in again.',
};

export const AuthContext = createContext<AuthContextValue>({
  userId: null,
  token: null,
  appSessionId: null,
  expiresAt: null,
  error: null,
  role: null,
  isAuth0Loading: true,
  isAuth0Authenticated: false,
  isPending: false,
  isBootstrapLoading: false,
  appUser: null,
  setToken: () => {},
  signInWithEmailAndPassword: async () => {},
  signInWithUsernameAndPassword: async () => {},
  signInWithProvider: async () => {},
  signUp: async () => {},
  signUpAsTeacher: async () => {},
  signUpAsStudent: async () => {},
  signOut: async () => {},
});

export const AuthContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const didPlayLoginJingleRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [appUser, setAppUser] = useState<AuthAppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [appSessionId, setAppSessionId] = useState<string | null>(null);
  const [isTokenLoading, setIsTokenLoading] = useState(false);
  /** Guard to prevent multiple simultaneous session-error logouts */
  const isSessionLogoutInProgressRef = useRef(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const continuePath = searchParams.get('continue');

  const {
    isAuthenticated: isAuth0Authenticated,
    isLoading: isAuth0Loading,
    error: auth0Error,
    getAccessTokenSilently,
    loginWithRedirect,
    logout,
  } = useAuth0();

  // Keep the module-level store in sync so raw-fetch API modules pick it up
  useEffect(() => {
    setCurrentAppSessionId(appSessionId);
  }, [appSessionId]);

  const musicAtlas = useGlobalMusicAtlas({ token, appSessionId });

  const apiBase = Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';
  const returnTo =
    continuePath ||
    (location.pathname.startsWith('/auth')
      ? ProfileRoutes.root()
      : `${location.pathname}${location.search}`);

  const persistSessionToken = useCallback(
    async (nextToken: string): Promise<string | null> => {
      try {
        const response = await fetch(`${apiBase}/auth/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: nextToken }),
          credentials: 'include',
        });
        if (response.ok) {
          const text = await response.text();
          // Backend uses SuperJSON serialization — parse accordingly
          const data = SuperJSON.parse(text) as {
            appSessionId?: string;
          };
          return data.appSessionId ?? null;
        }
      } catch {
        // Session creation failed — continue without app session
      }
      return null;
    },
    [apiBase],
  );

  const clearSession = useCallback(() => {
    const headers: Record<string, string> = {};
    if (appSessionId) {
      headers['X-App-Session'] = appSessionId;
    }
    void fetch(`${apiBase}/auth/session`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    }).catch(() => undefined);
    setAppSessionId(null);
  }, [apiBase, appSessionId]);

  /**
   * Hard logout: clears local state, clears backend session cookie, and
   * redirects to Auth0 logout. Optionally shows a user-facing message.
   */
  const hardLogout = useCallback(
    async (message?: string) => {
      if (isSessionLogoutInProgressRef.current) return;
      isSessionLogoutInProgressRef.current = true;

      clearSession();
      setToken(null);
      setAppUser(null);

      if (message) {
        showError(message);
      }

      try {
        await logout({
          logoutParams: {
            returnTo: window.location.origin,
          },
        });
      } finally {
        isSessionLogoutInProgressRef.current = false;
      }
    },
    [clearSession, logout],
  );

  // Listen for session errors emitted by the API interceptor
  useEffect(() => {
    return onSessionError((payload: SessionErrorPayload) => {
      const message = SESSION_ERROR_MESSAGES[payload.code] ?? payload.message;
      void hardLogout(message);
    });
  }, [hardLogout]);

  const syncAuth0Token = useCallback(async (): Promise<string | null> => {
    try {
      setIsTokenLoading(true);
      const nextToken = await getAccessTokenSilently({
        // Always request the API audience so /auth/me receives a verifiable JWT.
        authorizationParams: {
          audience: Env.get('VITE_AUTH0_AUDIENCE'),
        },
      });
      // Create the app session BEFORE setting the token, so the API client
      // has the appSessionId ready when meQuery fires on token change.
      const nextAppSessionId = await persistSessionToken(nextToken);
      setAppSessionId(nextAppSessionId);
      setToken(nextToken);
      setError(null);
      return nextToken;
    } catch (caught) {
      setToken(null);
      setAppSessionId(null);
      setAppUser(null);

      const sdkError = caught as AuthenticationError | null;

      // Hard logout on login_required, consent_required, or missing_refresh_token
      // These indicate that Auth0 can no longer silently provide a token.
      const hardLogoutErrors = new Set([
        'login_required',
        'consent_required',
        'missing_refresh_token',
        'invalid_grant',
      ]);

      if (sdkError?.error && hardLogoutErrors.has(sdkError.error)) {
        // Only force hard logout if the user was previously authenticated
        // (avoid redirect loops during initial startup probing)
        if (isAuth0Authenticated && token) {
          void hardLogout('Your session expired due to inactivity.');
        } else {
          setError(null);
        }
        return null;
      }

      setError('Unable to continue your session. Please sign in again.');
      console.error('Auth0 token sync failed:', caught);
      return null;
    } finally {
      setIsTokenLoading(false);
    }
  }, [
    getAccessTokenSilently,
    hardLogout,
    isAuth0Authenticated,
    persistSessionToken,
    token,
  ]);

  const ensureAccessToken = useCallback(async (): Promise<string | null> => {
    if (token) return token;
    if (!isAuth0Authenticated) return null;
    return await syncAuth0Token();
  }, [isAuth0Authenticated, syncAuth0Token, token]);

  const startAuthLogin = useCallback(
    async (
      params?: {
        screen_hint?: 'signup' | 'login';
        connection?: 'google-oauth2' | 'apple';
      },
      overrideReturnTo?: string,
    ) => {
      if (isAuth0Loading) {
        return;
      }

      await loginWithRedirect({
        appState: {
          returnTo: overrideReturnTo || returnTo,
        },
        authorizationParams: {
          ...(params?.screen_hint ? { screen_hint: params.screen_hint } : {}),
          ...(params?.connection ? { connection: params.connection } : {}),
        },
      });
    },
    [isAuth0Loading, loginWithRedirect, returnTo],
  );

  const meQuery = useQuery({
    queryKey: ['me', token],
    enabled: Boolean(token) && isAuth0Authenticated,
    staleTime: 30_000,
    queryFn: async () => {
      return musicAtlas.auth.getAuthMe();
    },
  });

  const isBootstrapLoading =
    isAuth0Loading ||
    (isAuth0Authenticated &&
      (isTokenLoading || (Boolean(token) && meQuery.isLoading)));
  const isPending = isBootstrapLoading;

  useEffect(() => {
    if (isAuth0Authenticated && !isAuth0Loading && !token) {
      void syncAuth0Token();
      return;
    }

    if (!isAuth0Authenticated && !token) {
      setAppUser(null);
    }
  }, [isAuth0Authenticated, isAuth0Loading, syncAuth0Token, token]);

  useEffect(() => {
    if (!meQuery.data) {
      return;
    }

    const mapped = mapMe(meQuery.data);
    setAppUser(mapped);

    if (!mapped) {
      return;
    }

    setError(null);

    const currentPath = window.location.pathname;
    const isOnAuthRoute = currentPath.startsWith('/auth');
    const isSignupCompletionPath =
      currentPath.startsWith('/auth/join/student') ||
      currentPath.startsWith('/auth/join/teacher');

    if (isOnAuthRoute && !isSignupCompletionPath) {
      const destination = continuePath || ProfileRoutes.root();
      navigate(destination);
    }
  }, [continuePath, meQuery.data, navigate]);

  useEffect(() => {
    if (!auth0Error) {
      return;
    }

    console.error('Auth0 SDK error:', auth0Error);
    setError(auth0Error.message || 'Authentication failed.');
  }, [auth0Error]);

  useEffect(() => {
    if (didPlayLoginJingleRef.current) {
      return;
    }

    if (!appUser || isBootstrapLoading) {
      return;
    }

    const hadInteractiveAuthCallback =
      typeof window !== 'undefined' &&
      sessionStorage.getItem('auth0:interactive-login-callback') === '1';

    if (!hadInteractiveAuthCallback) {
      return;
    }

    didPlayLoginJingleRef.current = true;
    sessionStorage.removeItem('auth0:interactive-login-callback');

    const welcomeAudio = new Audio('/welcome.mp3');
    void welcomeAudio.play().catch(() => undefined);
  }, [appUser, isBootstrapLoading]);

  useEffect(() => {
    if (!meQuery.isError) {
      return;
    }

    // Preserve Auth0 session to avoid callback/login loops; surface the real API error instead.
    const message =
      getApiErrorMessage(meQuery.error) ||
      'Unable to load your account profile. Please try refreshing.';
    setError(message);
    console.error(
      'Failed to load /auth/me after authentication:',
      meQuery.error,
    );
  }, [meQuery.error, meQuery.isError]);

  const signInWithEmailAndPassword = useCallback(
    async (_email: string, _password: string) => {
      try {
        await startAuthLogin({ screen_hint: 'login' });
      } catch {
        setError('Login attempt failed. Please try again.');
      }
    },
    [startAuthLogin],
  );

  const signInWithUsernameAndPassword = useCallback(
    async (_username: string, _password: string) => {
      try {
        await startAuthLogin({ screen_hint: 'login' });
      } catch {
        setError('Login attempt failed. Please try again.');
      }
    },
    [startAuthLogin],
  );

  const signInWithProvider = useCallback(
    async (provider: 'google' | 'apple') => {
      try {
        await startAuthLogin({
          screen_hint: 'login',
          connection: provider === 'google' ? 'google-oauth2' : 'apple',
        });
      } catch {
        setError('Login attempt failed. Please try again.');
      }
    },
    [startAuthLogin],
  );

  const signUp = useCallback(async () => {
    try {
      await startAuthLogin({ screen_hint: 'signup' });
    } catch {
      setError('Signup failed. Please try again.');
    }
  }, [startAuthLogin]);

  const signUpAsTeacher = useCallback(
    async (input: CreateTeacherParams) => {
      if (!isAuth0Authenticated) {
        await startAuthLogin(
          { screen_hint: 'signup' },
          location.pathname + location.search,
        );
        return;
      }

      const nextToken = await ensureAccessToken();

      if (!nextToken) {
        throw new Error('Authentication token is unavailable.');
      }

      const response = await fetch(`${apiBase}/auth/complete-signup/teacher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${nextToken}`,
          ...(appSessionId ? { 'X-App-Session': appSessionId } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        const message =
          body.message || body.error || 'Unable to complete teacher signup.';
        setError(message);
        throw new Error(message);
      }

      await meQuery.refetch();
      setError(null);
    },
    [
      apiBase,
      appSessionId,
      ensureAccessToken,
      isAuth0Authenticated,
      location.pathname,
      location.search,
      meQuery,
      startAuthLogin,
    ],
  );

  const signUpAsStudent = useCallback(
    async (input: CreateStudentParams) => {
      if (!isAuth0Authenticated) {
        await startAuthLogin(
          { screen_hint: 'signup' },
          location.pathname + location.search,
        );
        return;
      }

      const nextToken = await ensureAccessToken();

      if (!nextToken) {
        throw new Error('Authentication token is unavailable.');
      }

      const response = await fetch(`${apiBase}/auth/complete-signup/student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${nextToken}`,
          ...(appSessionId ? { 'X-App-Session': appSessionId } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        const message =
          body.message || body.error || 'Unable to complete student signup.';
        setError(message);
        throw new Error(message);
      }

      await meQuery.refetch();
      setError(null);
    },
    [
      apiBase,
      appSessionId,
      ensureAccessToken,
      isAuth0Authenticated,
      location.pathname,
      location.search,
      meQuery,
      startAuthLogin,
    ],
  );

  const signOut = useCallback(async () => {
    clearSession();
    setToken(null);
    setAppUser(null);

    await logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [clearSession, logout]);

  const dataValue = useMemo((): AuthContextData => {
    return {
      userId: appUser?.id ?? null,
      token,
      appSessionId,
      expiresAt: null,
      role: appUser?.role ?? null,
      error,
      isAuth0Loading,
      isAuth0Authenticated,
      isPending,
      isBootstrapLoading,
      appUser,
    };
  }, [
    appSessionId,
    appUser,
    error,
    isAuth0Authenticated,
    isAuth0Loading,
    isPending,
    isBootstrapLoading,
    token,
  ]);

  const value = useMemo((): AuthContextValue => {
    return {
      ...dataValue,
      setToken,
      signInWithEmailAndPassword,
      signInWithUsernameAndPassword,
      signInWithProvider,
      signUp,
      signUpAsTeacher,
      signUpAsStudent,
      signOut,
    };
  }, [
    dataValue,
    signInWithEmailAndPassword,
    signInWithUsernameAndPassword,
    signInWithProvider,
    signOut,
    signUp,
    signUpAsTeacher,
    signUpAsStudent,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
