import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { useMe } from '@/hooks/data';
import { readAvatarConfig } from '@/hooks/data/useAvatarConfigs';
import { readBioForUser } from '@/hooks/useUserBioPreferences';
import { bioApi } from '@/lib/bio/api';
import type { DiscoverableUser, UserBioPreferences } from '@/types/userProfile';

const bioIsEmpty = (b: UserBioPreferences): boolean =>
  b.instruments.length + b.genres.length + b.focus.length === 0;

/**
 * Discoverable users for the Connect section: active users enriched with their
 * public bio from `user_bio` (music-atlas-api). Excludes the current user,
 * private profiles, and users with no bio (they can't produce a meaningful
 * match). Falls back to the per-device localStorage mirror when the API isn't
 * reachable — which only ever holds this device's own bio, so in practice that
 * path yields nothing but keeps the hook from throwing.
 */
export function useDiscoverUsers() {
  const musicAtlas = useMusicAtlas();
  const token = useAuthToken();
  const { data: me } = useMe();

  return useQuery({
    queryKey: ['discover-users', me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const students = await musicAtlas.students.getStudents({
        status: 'active',
      });
      const others = students.filter((s) => s.id !== me?.id);

      let serverBios: Record<string, UserBioPreferences> = {};
      if (token) {
        const ids = others.map((s) => s.id);
        // offline fallback — see readBioForUser below
        serverBios = await bioApi.list(token, ids).catch(() => ({}));
      }

      const discoverable: DiscoverableUser[] = [];
      for (const s of others) {
        const bio = serverBios[s.id] ?? readBioForUser(s.id);
        if (bio.visibility === 'private') continue; // guard the fallback path
        if (bioIsEmpty(bio)) continue; // nothing to match on
        discoverable.push({
          id: s.id,
          nickname: s.nickname,
          avatarSeed: s.nickname,
          // The students list carries each user's saved avatar (user.avatar_config).
          avatarConfig: readAvatarConfig(s.avatarConfig) ?? undefined,
          bio,
        });
      }

      return discoverable;
    },
    staleTime: 30_000,
  });
}
