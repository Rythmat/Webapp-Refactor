import { Check, Search, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { UserMatchCard } from '@/components/Profile/UserMatchCard';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { useMe } from '@/hooks/data';
import { useStudents } from '@/hooks/data/students/useStudents';
import { useAvatarConfigs } from '@/hooks/data/useAvatarConfigs';
import {
  connectionStatusFor,
  useConnectionMutations,
  useConnections,
  useConnectionUsers,
  type ConnectionSets,
  type ConnectionStatus,
} from '@/hooks/data/useConnections';
import { useDiscoverUsers } from '@/hooks/data/useDiscoverUsers';
import { useUserBioPreferences } from '@/hooks/useUserBioPreferences';
import { type AvatarConfig, avatarConfigOrDefault } from '@/lib/avatarHexGrid';
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

function labelFor(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'outgoing':
      return 'Requested';
    case 'incoming':
      return 'Accept';
    default:
      return 'Connect';
  }
}

/**
 * User-page "Connect" card — grow your network. Search any user and send a
 * connection request, respond to incoming requests, and see suggested people
 * (bio matches). Once both sides accept, the person becomes a suggested
 * collaborator on the Studio Dashboard's Connect & Collaborate card.
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
  const { data: sets } = useConnections();
  const { incoming } = useConnectionUsers();
  const { requestConnection, respondConnection } = useConnectionMutations();

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

  // Real saved avatars for the current search results.
  const searchIds = useMemo(() => results.map((r) => r.id), [results]);
  const { data: searchAvatars } = useAvatarConfigs(searchIds);

  const suggestions = useMemo(() => {
    if (!discoverUsers) return [];
    const myBio = {
      instruments: [...selectedInstruments],
      genres: [...selectedGenres],
      focus: [...selectedFocus],
    };
    // Only suggest people you can still connect with — anyone already
    // connected or pending is surfaced elsewhere (Connections / requests).
    return rankMatches(myBio, discoverUsers)
      .filter((m) => connectionStatusFor(m.user.id, sets) === 'none')
      .slice(0, 6);
  }, [discoverUsers, selectedInstruments, selectedGenres, selectedFocus, sets]);

  // A status-aware action for a user id, shared by search + suggestions.
  const actionFor = (id: string, sets_: ConnectionSets | undefined) => {
    const status = connectionStatusFor(id, sets_);
    return {
      actionLabel: labelFor(status),
      onConnect:
        status === 'none'
          ? () => requestConnection.mutate(id)
          : status === 'incoming'
            ? () => respondConnection.mutate({ requesterId: id, accept: true })
            : undefined,
    };
  };

  const noBio = selectedGenres.size === 0 && selectedInstruments.size === 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-white">
        <UserPlus size={20} />
        <h2 className="text-2xl font-medium">Connect</h2>
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
          placeholder="Search musicians by name to connect…"
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
            results.map((r) => {
              const { actionLabel, onConnect } = actionFor(r.id, sets);
              return (
                <UserMatchCard
                  key={r.id}
                  match={minimalMatch(r, searchAvatars?.[r.id])}
                  compact
                  actionLabel={actionLabel}
                  onConnect={onConnect}
                />
              );
            })
          ) : (
            <div className="py-2 text-center text-sm text-white/50">
              No users found
            </div>
          )}
        </div>
      )}

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-white/70">
            Connection requests
          </h3>
          <div className="space-y-2">
            {incoming.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-[#151515] p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-[#2A2A2A]">
                    <HexAvatarSVG
                      config={avatarConfigOrDefault(u.avatarConfig, u.nickname)}
                      circular
                      className="size-[150%] opacity-50"
                    />
                  </div>
                  <span className="truncate text-sm font-medium text-white">
                    {u.nickname}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      respondConnection.mutate({
                        requesterId: u.id,
                        accept: true,
                      })
                    }
                    className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black transition-colors hover:bg-gray-200"
                  >
                    <Check size={13} />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      respondConnection.mutate({
                        requesterId: u.id,
                        accept: false,
                      })
                    }
                    aria-label="Decline"
                    className="flex size-7 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested people to connect with */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-white/70">Suggested for you</h3>
        {suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map((m) => {
              const { actionLabel, onConnect } = actionFor(m.user.id, sets);
              return (
                <UserMatchCard
                  key={m.user.id}
                  match={m}
                  compact
                  actionLabel={actionLabel}
                  onConnect={onConnect}
                />
              );
            })}
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
