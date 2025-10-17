import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useState } from 'react';
import { useUpdateEffect } from 'react-use';
import { useAuthToken } from '../AuthContext/hooks/useAuthToken';
import { useGlobalMusicAtlas } from './api';

export const MusicAtlasContext = createContext<
  ReturnType<typeof useGlobalMusicAtlas>
>(null!);

export const MusicAtlasContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const token = useAuthToken();
  const musicAtlas = useGlobalMusicAtlas({ token });

  const [queryClient, setQueryClient] = useState(() => new QueryClient());

  useUpdateEffect(() => {
    queryClient.clear();
    setQueryClient(new QueryClient());
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>
      <MusicAtlasContext.Provider value={musicAtlas}>
        {children}
      </MusicAtlasContext.Provider>
    </QueryClientProvider>
  );
};

export const GlobalMusicAtlasContext = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
