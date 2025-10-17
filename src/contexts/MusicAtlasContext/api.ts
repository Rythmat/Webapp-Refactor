import { useState } from 'react';
import { useUpdateEffect } from 'react-use';
import SuperJSON from 'superjson';
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

const getClient = (params?: { token: string | null }) => {
  const { token = null } = params ?? {};

  return new HttpClient({
    ...DefaultConfig,
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  });
};

export const useGlobalMusicAtlas = (params?: { token: string | null }) => {
  const { token = null } = params ?? {};

  const [musicAtlas, setMusicAtlas] = useState(
    () => new Api(getClient({ token })),
  );

  useUpdateEffect(() => {
    setMusicAtlas(new Api(getClient({ token })));
  }, [token]);

  return musicAtlas;
};
