import { useQuery } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { useMe } from '@/hooks/data';
import { readBioForUser } from '@/hooks/useUserBioPreferences';
import type { DiscoverableUser } from '@/types/userProfile';

/**
 * Fetch real users from the system and enrich with their stored bio preferences.
 * Excludes the current user and users who set their profile to private.
 */
export function useDiscoverUsers() {
  const musicAtlas = useMusicAtlas();
  const { data: me } = useMe();

  return useQuery({
    queryKey: ['discover-users', me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const students = await musicAtlas.students.getStudents({
        status: 'active',
      });

      const discoverable: DiscoverableUser[] = [];

      for (const s of students) {
        if (s.id === me?.id) continue;

        // Enrich with localStorage bio when available (e.g. shared classroom machine)
        const bio = readBioForUser(s.id);

        // Respect user's privacy preference
        if (bio.visibility === 'private') continue;

        discoverable.push({
          id: s.id,
          nickname: s.nickname,
          avatarSeed: s.nickname,
          avatarConfig: s.avatarConfig,
          bio,
        });
      }

      return discoverable;
    },
    staleTime: 30_000,
  });
}
