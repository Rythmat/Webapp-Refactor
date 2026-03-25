import React, { useMemo, useState } from 'react';
import { useMe } from '@/hooks/data';
import { useDiscoverUsers } from '@/hooks/data/useDiscoverUsers';
import { useUserBioPreferences } from '@/hooks/useUserBioPreferences';
import { rankMatches } from '@/lib/userMatching';
import { ALL_GENRES } from '@/types/userProfile';
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
import { UserMatchCard } from './UserMatchCard';

export const ConnectInlet: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Network');
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const { data: user } = useMe();
  const { instruments, genres, focus } = useUserBioPreferences(user?.id);
  const { data: discoverUsers, isLoading } = useDiscoverUsers();

  const allMatches = useMemo(() => {
    if (!discoverUsers) return [];
    const myBio = {
      instruments: [...instruments],
      genres: [...genres],
      focus: [...focus],
    };
    return rankMatches(myBio, discoverUsers);
  }, [discoverUsers, instruments, genres, focus]);

  const filteredMatches = useMemo(() => {
    if (!genreFilter) return allMatches;
    return allMatches.filter((m) => m.commonGenres.includes(genreFilter));
  }, [allMatches, genreFilter]);

  return (
    <div className="flex h-full flex-col">
      <HeaderBar title="Connect" />
      <div className="custom-scrollbar flex-1 overflow-y-auto px-8 pb-12">
        {/* Tabs */}
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center gap-4 border-b border-white/10 pb-4 text-sm text-gray-400">
            {['Network', 'Messages', 'Collaborations'].map((tab) => (
              <button
                key={tab}
                className={`-mb-4 border-b-2 pb-4 transition-colors ${activeTab === tab ? 'border-white text-white' : 'border-transparent hover:text-gray-200'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <h2 className="font-serif text-xl text-white">
              Recommended for You
            </h2>

            {/* Genre filter pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setGenreFilter(null)}
                className={`rounded-full px-3 py-1 text-xs transition-all ${
                  !genreFilter
                    ? 'bg-white text-black font-medium'
                    : 'text-gray-400 hover:bg-white/10 border border-white/10'
                }`}
              >
                All
              </button>
              {ALL_GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenreFilter(genreFilter === g ? null : g)}
                  className={`rounded-full px-3 py-1 text-xs transition-all ${
                    genreFilter === g
                      ? 'bg-white text-black font-medium'
                      : 'text-gray-400 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Match cards */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl border border-white/5 bg-[#151515]"
                  />
                ))}
              </div>
            ) : filteredMatches.length > 0 ? (
              <div className="space-y-3">
                {filteredMatches.map((m) => (
                  <UserMatchCard key={m.user.id} match={m} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-[#151515] p-8 text-center text-sm text-gray-500">
                No users found
              </div>
            )}
          </div>

          {/* Online Now sidebar */}
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/5 bg-[#151515] p-6">
              <h3 className="mb-4 font-serif text-lg text-white">Online Now</h3>
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="relative size-8 rounded-full bg-gray-700">
                      <div className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-[#151515] bg-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-200">User {i}</div>
                      <div className="text-[10px] text-gray-500">In Studio</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
