import { useMemo } from 'react';
import SuperJSON from 'superjson';
import { emitSessionError, parseSessionError } from '@/auth/session-errors';
import { Env } from '@/constants/env';
import { HttpClient, Api } from './musicAtlas.generated';

const DefaultConfig = {
  baseURL: Env.get('VITE_MUSIC_ATLAS_API_URL'),

  // Axios expects the any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformResponse: (data: any, _: unknown, status: number | undefined) => {
    if (status && status >= 200 && status < 300) {
      return SuperJSON.parse(data);
    }

    try {
      // Is it valid JSON?
      if (typeof data === 'string') {
        JSON.parse(data);
      }

      return data;
    } catch (__) {
      throw new Error(
        data ?? 'Connection error. Check your internet and try again.',
      );
    }
  },
};

type ClientParams = {
  token: string | null;
  appSessionId: string | null;
};

const getClient = (params?: ClientParams) => {
  const { token = null, appSessionId = null } = params ?? {};

  const headers: Record<string, string | undefined> = {
    Authorization: token ? `Bearer ${token}` : undefined,
  };

  if (appSessionId) {
    headers['X-App-Session'] = appSessionId;
  }

  const client = new HttpClient({
    ...DefaultConfig,
    headers,
  });

  // Intercept 401 responses to detect app-session errors
  client.instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        const sessionError = parseSessionError(error.response.data);
        if (sessionError) {
          emitSessionError(sessionError);
        }
      }
      return Promise.reject(error);
    },
  );

  return client;
};

export const useGlobalMusicAtlas = (params?: Partial<ClientParams>) => {
  const { token = null, appSessionId = null } = params ?? {};

  // useMemo so the client is available synchronously during the same render
  // that triggers queries — avoids race conditions with useUpdateEffect.
  return useMemo(
    () => new Api(getClient({ token, appSessionId })),
    [token, appSessionId],
  );
};
