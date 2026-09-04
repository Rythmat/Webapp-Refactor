import { Search, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { UserMatchCard } from '@/components/Profile/UserMatchCard';
import { useMe } from '@/hooks/data';
import { useStudents } from '@/hooks/data/students/useStudents';
import { readAvatarConfig } from '@/hooks/data/useAvatarConfigs';
import { useDiscoverUsers } from '@/hooks/data/useDiscoverUsers';
import { useUserBioPreferences } from '@/hooks/useUserBioPreferences';
import { type AvatarConfig } from '@/lib/avatarHexGrid';
import { rankMatches } from '@/lib/userMatching';
import type { ConnectionMatch } from '@/types/userProfile';

/** Build a minimal ConnectionMatch so search results reuse UserMatchCard. */
function minimalMatch(
  user: { id: string; nickname: string },
  avatarConfig?: AvatarConfig,
): ConnectionMatch {
  return {
    user: {
      id: user.id,
      nickname: user.nickname,
      avatarSeed: user.nickname,
      avatarConfig,
      bio: { instruments: [], genres: [], focus: [] },
    },
    commonGenres: [],
    commonInstruments: [],
    commonFocus: [],
    complementarySkills: [],
    matchScore: 0,
  };
}

/**
 * User-page "Discover" card — find musicians by name, and see people whose bio
 * overlaps yours.
 *
 * The mutual connection graph this card used to drive (request / accept /
 * decline, backed by `api/connections/*` in Upstash) has been removed: it keyed
 * the caller by their Auth0 `sub` but every id it was given was a `User.id`
 * UUID, so a request never reached its recipient and no pair could ever become
 * connected. The browse-and-discover half worked and is what remains.
 */
export const ConnectCard = () => {
  const { data: user } = useMe();
  const {
    instruments: selectedInstruments,
    genres: selectedGenres,
    focus: selectedFocus,
  } = useUserBioPreferences(user?.id);
  const { data: students } = useStudents({ status: 'active' });
  const { data: discoverUsers } = useDiscoverUsers();

  const [query, setQuery] = useState('');

  // No dedicated user-search endpoint exists; filter the active-users list
  // (getStudents) by name client-side. Excludes self.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return (students ?? [])
      .filter((s) => s.id !== user?.id && s.nickname.toLowerCase().includes(q))
      .slice(0, 8);
  }, [students, query, user?.id]);

  const suggestions = useMemo(() => {
    if (!discoverUsers) return [];
    const myBio = {
      instruments: [...selectedInstruments],
      genres: [...selectedGenres],
      focus: [...selectedFocus],
    };
    return rankMatches(myBio, discoverUsers).slice(0, 6);
  }, [discoverUsers, selectedInstruments, selectedGenres, selectedFocus]);

  const noBio = selectedGenres.size === 0 && selectedInstruments.size === 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-white">
        <UserPlus size={20} />
        <h2 className="text-2xl font-medium">Discover</h2>
      </div>

      {/* Search bar */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--color-border)',
        }}
      >
        <Search size={16} className="shrink-0 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search musicians by name…"
          className="flex-1 border-none bg-transparent text-sm text-white outline-none placeholder:text-white/40"
        />
      </div>

      {/* Search results */}
      {query.trim().length >= 2 && (
        <div className="space-y-3">
          {students === undefined ? (
            <div className="py-2 text-center text-sm text-white/50">
              Searching…
            </div>
          ) : results.length > 0 ? (
            results.map((r) => (
              <UserMatchCard
                key={r.id}
                match={minimalMatch(
                  r,
                  readAvatarConfig(r.avatarConfig) ?? undefined,
                )}
                compact
              />
            ))
          ) : (
            <div className="py-2 text-center text-sm text-white/50">
              No users found
            </div>
          )}
        </div>
      )}

      {/* Suggested people, ranked by bio overlap */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-white/70">Suggested for you</h3>
        {suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map((m) => (
              <UserMatchCard key={m.user.id} match={m} compact />
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-white/50">
            {noBio
              ? 'Add your instruments and genres above to get suggestions.'
              : 'No suggestions yet — try adding more genres above.'}
          </div>
        )}
      </div>
    </section>
  );
};
