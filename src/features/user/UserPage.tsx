/* eslint-disable react/jsx-sort-props */
import { ChevronRight, Users } from 'lucide-react';
import { useMemo } from 'react';
import { XpTrackerCard } from '@/components/ClassroomLayout/dashboard/XpTrackerCard';
import { UserMatchCard } from '@/components/Profile/UserMatchCard';
import { useMe } from '@/hooks/data';
import { useDiscoverUsers } from '@/hooks/data/useDiscoverUsers';
import { useUserBioPreferences } from '@/hooks/useUserBioPreferences';
import { rankMatches } from '@/lib/userMatching';
import { AvatarCard } from './AvatarCard';
import { BioCard } from './BioCard';
import '@/features/settings/settings.css';

/**
 * User page — Avatar + Bio + XP graph + Connect (user matching).
 *
 * Identity content (Avatar, Bio) moved out of the Settings hub in favor of
 * this dedicated user-facing surface. Legacy /settings/profile now redirects
 * here.
 */
export const UserPage = () => {
  const { data: user } = useMe();
  const displayName = user?.nickname || user?.username || 'friend';

  // Match ranking still reads from the bio preferences hook (BioCard owns the
  // UI; ranking here reflects the same underlying state).
  const {
    instruments: selectedInstruments,
    genres: selectedGenres,
    focus: selectedFocus,
  } = useUserBioPreferences(user?.id);

  const { data: discoverUsers } = useDiscoverUsers();

  const topMatches = useMemo(() => {
    if (!discoverUsers) return [];
    const myBio = {
      instruments: [...selectedInstruments],
      genres: [...selectedGenres],
      focus: [...selectedFocus],
    };
    return rankMatches(myBio, discoverUsers).slice(0, 6);
  }, [discoverUsers, selectedInstruments, selectedGenres, selectedFocus]);

  return (
    <div className="settings-root mx-auto flex w-full max-w-[1720px] flex-col gap-8 px-6 py-6 md:gap-12 md:px-10 md:py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-medium leading-tight text-white md:text-5xl lg:text-6xl">
          Welcome, {displayName}
        </h1>
        <p className="text-base text-white/60 md:text-lg">
          Your identity, progress, and the community around you.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <AvatarCard />

        <BioCard />

        {/* XP card */}
        <XpTrackerCard />

        {/* Connect card */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-white">
            <Users size={20} />
            <h2 className="text-2xl font-medium">Connect</h2>
            <ChevronRight size={16} className="text-white/50" />
          </div>
          <div
            className="glass-panel-sm relative rounded-3xl p-6"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--color-border)',
            }}
          >
            {topMatches.length > 0 ? (
              <div className="space-y-3">
                {topMatches.map((m) => (
                  <UserMatchCard key={m.user.id} match={m} compact />
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-white/60">
                {selectedGenres.size === 0 && selectedInstruments.size === 0
                  ? 'Select your instruments and genres above to find matches.'
                  : 'No matches yet — try selecting more genres above.'}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
