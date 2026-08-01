import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { createContext, useState } from 'react';
import { useUpdateEffect } from 'react-use';
import { useAppSessionId } from '../AuthContext/hooks/useAppSessionId';
import { useAuthToken } from '../AuthContext/hooks/useAuthToken';
import { useGlobalMusicAtlas } from './api';

export const MusicAtlasContext = createContext<
  ReturnType<typeof useGlobalMusicAtlas>
>(null!);

/**
 * Is this error one where retrying cannot possibly help?
 *
 * 4xx is deterministic — the same request will fail the same way. Retrying it
 * three times (the TanStack default) turns one bad request into four, and each
 * one costs a full server-side auth pipeline plus a telemetry row. 408 and 429
 * are the exceptions: both are explicitly "try again".
 */
const isNonRetryable = (error: unknown): boolean => {
  const status =
    (error as { response?: { status?: number } })?.response?.status ??
    (error as { status?: number })?.status;

  if (typeof status === 'number') {
    return status < 500 && status !== 408 && status !== 429;
  }

  // The hand-rolled fetch modules throw Error('… failed (401): …'), so the
  // status is only available in the message. See lib/progress/api.ts.
  return /\((4\d\d)\)/.test(String((error as Error)?.message ?? ''));
};

/**
 * The app's single QueryClient.
 *
 * Previously there were two — one here and one in `GlobalMusicAtlasContext` —
 * with neither carrying any `defaultOptions`. That meant every query in the app
 * inherited `staleTime: 0`, `refetchOnMount`, `refetchOnWindowFocus` and
 * `retry: 3`, so navigating anywhere refetched everything and any failing
 * endpoint cost four requests.
 *
 * The values below sit BELOW every staleTime already hand-written in this
 * codebase (which range from 30s to 10min), so they change no decision anyone
 * made deliberately — they only put a floor under the many hooks that never
 * specified one.
 */
export const createAppQueryClient = (): QueryClient => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // The default 5min means Home → Studio → back after six minutes is a
        // full cold refetch. 30min covers a class period; the payloads are
        // small JSON and memory is not the constraint here.
        gcTime: 30 * 60_000,
        // These are classroom users who alt-tab constantly between the DAW,
        // video, and a second tab. Opt back in explicitly where it matters.
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) =>
          isNonRetryable(error) ? false : failureCount < 1,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
      },
      mutations: { retry: 0 },
    },
  });

  // Immutable music-theory dictionaries (hooks/data/prism/*). They change only
  // on deploy, so there is no reason to refetch them within a session.
  client.setQueryDefaults(['prism'], {
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  return client;
};

export const MusicAtlasContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const token = useAuthToken();
  const appSessionId = useAppSessionId();
  const musicAtlas = useGlobalMusicAtlas({ token, appSessionId });

  // Deliberately NOT a second QueryClient. `GlobalMusicAtlasContext` owns the
  // only one; a second client here meant AuthContext's queries (which mount
  // above this provider) and page queries lived in separate caches, so they
  // could never dedupe — `['me', token]` and `['me']` both fetched.
  const queryClient = useQueryClient();

  useUpdateEffect(() => {
    // Only on sign-out. The previous version also cleared on `null -> token`
    // at bootstrap, throwing away work already in flight. Full sign-out does a
    // document navigation via Auth0 logout() anyway, so this is belt-and-braces
    // for the session-revoked path.
    if (!token) queryClient.clear();
  }, [token, queryClient]);

  return (
    <MusicAtlasContext.Provider value={musicAtlas}>
      {children}
    </MusicAtlasContext.Provider>
  );
};

export const GlobalMusicAtlasContext = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [queryClient] = useState(createAppQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
