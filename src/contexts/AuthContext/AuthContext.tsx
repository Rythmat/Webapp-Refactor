import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import useLocalStorageState from 'use-local-storage-state';
import { WildcardRoute } from '@/constants/routes';
import { useLogin, useRegister } from '@/hooks/data';
import { useMusicalForm } from '@/hooks/useMusicalForm';
import { useNow } from '@/hooks/useNow';
import { decodeToken } from './decodeToken';
import {
  AuthContextData,
  AuthContextValue,
  CreateStudentParams,
  CreateTeacherParams,
} from './types';

export const AuthContext = createContext<AuthContextValue>({
  userId: null,
  token: null,
  expiresAt: null,
  error: null,
  role: null,
  isPending: false,
  setToken: () => {},
  signInWithEmailAndPassword: async () => {},
  signInWithUsernameAndPassword: async () => {},
  signUpAsTeacher: async () => {},
  signUpAsStudent: async () => {},
  signOut: async () => {},
});

export const AuthContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useLocalStorageState<string | null>('token', {
    defaultValue: null,
    serializer: {
      parse: (value) => value,
      stringify: (value) => (value ? `${value}` : ''),
    },
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    mutateAsync: login,
    isPending: isLoggingIn,
    error: loginError,
  } = useLogin();

  const {
    mutateAsync: register,
    isPending: isRegistering,
    error: registerError,
  } = useRegister();

  const isPending = isLoggingIn || isRegistering;

  const continuePath = searchParams.get('continue');

  const identifierForm = useMusicalForm();

  const onAuthenticated = useCallback(() => {
    if (continuePath) {
      navigate(continuePath);
      identifierForm.playWelcomeAudio();
    } else {
      navigate(WildcardRoute.root());
      identifierForm.playWelcomeAudio();
    }
  }, [continuePath, navigate]);

  // Handle OAuth callback: read JWT from URL hash (#token=...)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#token=')) {
      const oauthToken = hash.slice(7);
      setToken(oauthToken);
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search,
      );
      onAuthenticated();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const now = useNow({ live: true });

  const dataValue = useMemo((): AuthContextData => {
    const decoded = token ? decodeToken(token) : null;
    const contextError = loginError?.message || registerError?.message || error;

    if (!decoded) {
      return {
        userId: null,
        token: null,
        expiresAt: null,
        role: null,
        error: contextError,
        isPending,
      };
    }

    if (!decoded.expiresAt || decoded.expiresAt < now.getTime() / 1000) {
      return {
        userId: null,
        token: null,
        expiresAt: null,
        role: null,
        error: contextError,
        isPending,
      };
    }

    return {
      userId: decoded.userId,
      token: decoded.token,
      expiresAt: decoded.expiresAt,
      role: decoded.role,
      error: contextError,
      isPending,
    };
  }, [error, now, token, isPending, loginError, registerError]);

  const signInWithEmailAndPassword = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await login({
          email,
          password,
        });

        const decoded = decodeToken(response.token);
        setToken(decoded.token);
        onAuthenticated();
      } catch (error) {
        setError(
          'Login attempt failed. Please check your credentials and try again.',
        );
        throw error;
      }
    },
    [onAuthenticated, setToken, login],
  );

  const signInWithUsernameAndPassword = useCallback(
    async (username: string, password: string) => {
      try {
        const response = await login({
          username,
          password,
        });

        const decoded = decodeToken(response.token);
        setToken(decoded.token);
        onAuthenticated();
      } catch (error) {
        setError(
          'Login attempt failed. Please check your credentials and try again.',
        );
        throw error;
      }
    },
    [onAuthenticated, setToken, login],
  );

  const signUpAsTeacher = useCallback(
    async (input: CreateTeacherParams) => {
      try {
        await register({
          ...input,
          role: 'teacher',
        });

        signInWithEmailAndPassword(input.email, input.password);
      } catch (error) {
        setError('Sign up attempt failed. Please try again.');
      }
    },
    [register, signInWithEmailAndPassword],
  );

  const signUpAsStudent = useCallback(
    async (input: CreateStudentParams) => {
      try {
        await register({
          ...input,
          role: 'student',
        });

        signInWithUsernameAndPassword(input.username, input.password);
      } catch (error) {
        setError('Sign up attempt failed. Please try again.');
      }
    },
    [register, signInWithUsernameAndPassword],
  );

  const signOut = useCallback(async () => {
    setToken(null);
  }, [setToken]);

  const value = useMemo((): AuthContextValue => {
    return {
      ...dataValue,
      setToken,
      signUpAsTeacher,
      signUpAsStudent,
      signInWithEmailAndPassword,
      signInWithUsernameAndPassword,
      signOut,
    };
  }, [
    dataValue,
    setToken,
    signInWithEmailAndPassword,
    signInWithUsernameAndPassword,
    signOut,
    signUpAsTeacher,
    signUpAsStudent,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
