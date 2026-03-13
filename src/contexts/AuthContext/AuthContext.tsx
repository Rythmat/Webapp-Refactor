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
import { Env } from '@/constants/env';
import { ProfileRoutes } from '@/constants/routes';
import { useGlobalMusicAtlas } from '../MusicAtlasContext/api';
import {
  AuthAppUser,
  AuthContextData,
  AuthContextValue,
  CreateStudentParams,
  CreateTeacherParams,
  UserRole,
} from './types';

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
    organizations,
    birthDate: (payload.birthDate as Date | null) ?? null,
    username,
  };
};

export const AuthContext = createContext<AuthContextValue>({
  userId: null,
  token: null,
  expiresAt: null,
  error: null,
  role: null,
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
  const [isTokenLoading, setIsTokenLoading] = useState(false);

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

  const musicAtlas = useGlobalMusicAtlas({ token });

  const apiBase = Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';
  const returnTo = continuePath || ProfileRoutes.root();

  const persistSessionToken = useCallback(
    async (nextToken: string) => {
      await fetch(`${apiBase}/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: nextToken }),
        credentials: 'include',
      }).catch(() => undefined);
    },
    [apiBase],
  );

  const syncAuth0Token = useCallback(async (): Promise<string | null> => {
    try {
      setIsTokenLoading(true);
      const nextToken = await getAccessTokenSilently();
      setToken(nextToken);
      await persistSessionToken(nextToken);
      setError(null);
      return nextToken;
    } catch (caught) {
      setToken(null);
      setAppUser(null);

      const sdkError = caught as AuthenticationError | null;
      if (sdkError?.error === 'login_required') {
        // Do not force a new login loop during startup token probing.
        setError(null);
        return null;
      }

      setError('Unable to continue your session. Please sign in again.');
      console.error('Auth0 token sync failed:', caught);
      return null;
    } finally {
      setIsTokenLoading(false);
    }
  }, [getAccessTokenSilently, persistSessionToken]);

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
    enabled: Boolean(token),
    staleTime: 30_000,
    queryFn: async () => {
      return musicAtlas.auth.getAuthMe();
    },
  });

  const isBootstrapLoading =
    isAuth0Loading || isTokenLoading || meQuery.isLoading;
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

    if (isAuth0Authenticated) {
      setToken(null);
      setAppUser(null);
    }

    setError('Unable to authorize your session. Please sign in again.');
  }, [isAuth0Authenticated, meQuery.isError]);

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
      ensureAccessToken,
      isAuth0Authenticated,
      location.pathname,
      location.search,
      meQuery,
      startAuthLogin,
    ],
  );

  const signOut = useCallback(async () => {
    void fetch(`${apiBase}/auth/session`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => undefined);

    setToken(null);
    setAppUser(null);

    await logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [apiBase, logout]);

  const dataValue = useMemo((): AuthContextData => {
    return {
      userId: appUser?.id ?? null,
      token,
      expiresAt: null,
      role: appUser?.role ?? null,
      error,
      isPending,
      isBootstrapLoading,
      appUser,
    };
  }, [appUser, error, isPending, isBootstrapLoading, token]);

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
