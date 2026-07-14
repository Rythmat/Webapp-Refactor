import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { useMe } from '@/hooks/data';
import { avatarConfigApi } from '@/hooks/data/useAvatarConfigs';
import { readBioForUser } from '@/hooks/useUserBioPreferences';
import type { AvatarConfig } from '@/lib/avatarHexGrid';
import type { DiscoverableUser, UserBioPreferences } from '@/types/userProfile';

/** Public bios for the given ids, keyed by id (private/unset omitted server-side). */
async function fetchPublicBios(
  token: string,
  ids: string[],
): Promise<Record<string, UserBioPreferences>> {
  const res = await fetch('/api/bio/list', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(`bio/list ${res.status}`);
  return res.json();
}

const bioIsEmpty = (b: UserBioPreferences): boolean =>
  b.instruments.length + b.genres.length + b.focus.length === 0;

/**
 * Discoverable users for the Connect section: active students enriched with
 * their public bio from the `/api/bio/list` serverless route (Upstash). Excludes
 * the current user, private profiles, and users with no bio (they can't produce
 * a meaningful match). Falls back to per-device localStorage bios when the
 * serverless route isn't reachable (e.g. plain Vite dev).
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
      let avatarConfigs: Record<string, AvatarConfig> = {};
      if (token) {
        const ids = others.map((s) => s.id);
        const [bios, avatars] = await Promise.all([
          fetchPublicBios(token, ids).catch(() => ({})), // dev/offline fallback
          avatarConfigApi.batch(token, ids).catch(() => ({})),
        ]);
        serverBios = bios;
        avatarConfigs = avatars;
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
          avatarConfig: avatarConfigs[s.id],
          bio,
        });
      }

      return discoverable;
    },
    staleTime: 30_000,
  });
}
