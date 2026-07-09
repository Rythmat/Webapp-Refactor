/**
 * useMspTokenMint — public signature frozen against Ryan's Sprint 5 REST
 * swap. Sprint 4 body: mock JWT via mintTokenForUser. Sprint 5+:
 * `POST ${VITE_MUSIC_ATLAS_API_URL}/msp/token`.
 */
import { useCallback } from 'react';
import { useMe } from '@/hooks/data';
import { mintTokenForUser, type MintTokenInput } from './mspTokenStore';

export interface UseMspTokenMint {
  mintToken: (input: MintTokenInput) => Promise<string>;
}

export const useMspTokenMint = (): UseMspTokenMint => {
  const { data: me } = useMe();
  const userId = me?.id ?? null;

  const mintToken = useCallback(
    async (input: MintTokenInput) => {
      const { token } = mintTokenForUser(userId, input);
      return token;
    },
    [userId],
  );

  return { mintToken };
};
