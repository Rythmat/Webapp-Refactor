import { Search, UserPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserMatchCard } from '@/components/Profile/UserMatchCard';
import { StudioRoutes, UserRoutes } from '@/constants/routes';
import {
  useConnectionUsers,
  type ConnectionUser,
} from '@/hooks/data/useConnections';
import type { ConnectionMatch } from '@/types/userProfile';
import '@/features/settings/settings.css';

/** Minimal ConnectionMatch so a connection reuses UserMatchCard (name+avatar). */
function toMatch(u: ConnectionUser): ConnectionMatch {
  return {
    user: {
      id: u.id,
      nickname: u.nickname,
      avatarSeed: u.nickname,
      avatarConfig: u.avatarConfig,
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
 * Connect + Collaborate — lists the user's accepted connections (built on the
 * User page) as suggested collaborators, with a search bar to filter them.
 * Selecting people and "Start a Session" opens the DAW in a fresh collaborative
 * room and auto-invites them (/studio/editor?collab=new&invite=<ids>).
 */
export const StudioCollaborate = () => {
  const navigate = useNavigate();
  const { connections, isLoading } = useConnectionUsers();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter((c) => c.nickname.toLowerCase().includes(q));
  }, [connections, query]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const startSession = () => {
    const ids = [...selected];
    const q = ids.length
      ? `?collab=new&invite=${ids.map(encodeURIComponent).join(',')}`
      : '?collab=new';
    navigate(`${StudioRoutes.editor.definition}${q}`);
  };

  return (
    <section
      aria-label="Connect and Collaborate"
      className="settings-root flex flex-col gap-4 md:gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-3">
          <Users className="h-7 w-7 text-white/85 md:h-8 md:w-8" />
          <h2 className="text-xl font-medium text-white md:text-2xl">
            Connect &amp; Collaborate
          </h2>
        </div>
        <button
          type="button"
          onClick={startSession}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-gray-200"
        >
          <UserPlus className="size-4" />
          {selected.size > 0
            ? `Start Session & Invite ${selected.size}`
            : 'Start a Session'}
        </button>
      </div>

      <div
        className="rounded-2xl border p-4 md:p-5"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderColor: 'var(--color-border)',
        }}
      >
        <p className="mb-4 text-sm text-white/60">
          Start a live collaborative session and invite the musicians you're
          connected with.
        </p>

        {/* Search bar — filters your connections */}
        {connections.length > 0 && (
          <div
            className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--color-border)',
            }}
          >
            <Search size={16} className="shrink-0 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your connections…"
              className="flex-1 border-none bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-white/5 bg-[#151515]"
              />
            ))}
          </div>
        ) : connections.length === 0 ? (
          <div className="py-4 text-center text-sm text-white/60">
            No connections yet — connect with musicians on your{' '}
            <Link to={UserRoutes.root()} className="text-white underline">
              profile
            </Link>{' '}
            to see them here.
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-4 text-center text-sm text-white/60">
            No connections match “{query}”.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const isSelected = selected.has(c.id);
              return (
                <UserMatchCard
                  key={c.id}
                  match={toMatch(c)}
                  compact
                  actionLabel={isSelected ? 'Added ✓' : 'Invite'}
                  onConnect={() => toggle(c.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
