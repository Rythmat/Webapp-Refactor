/* eslint-disable react/jsx-sort-props */
/* eslint-disable tailwindcss/classnames-order */
import {
  Activity,
  ChevronRight,
  Mic2,
  Music,
  Pencil,
  User,
  Users,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { RealTimeAnalytics } from '@/components/ui/real-time-analytics';
import { MeshGradientBg } from '@/daw/components/MeshGradientBg';
import { AccountSettings } from '@/features/settings/sections/AccountSettings';
import { AudioSettings } from '@/features/settings/sections/AudioSettings';
import { BillingSettings } from '@/features/settings/sections/BillingSettings';
import { ContentCodesSettings } from '@/features/settings/sections/ContentCodesSettings';
import { HelpPanel } from '@/features/settings/sections/HelpPanel';
import { LookAndFeelSettings } from '@/features/settings/sections/LookAndFeelSettings';
import { MidiSettings } from '@/features/settings/sections/MidiSettings';
import { useMe } from '@/hooks/data';
import { useExperienceSummary } from '@/hooks/data/experience';
import { useDiscoverUsers } from '@/hooks/data/useDiscoverUsers';
import { useAvatarConfig } from '@/hooks/useAvatarConfig';
import { useUserBioPreferences } from '@/hooks/useUserBioPreferences';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { rankMatches } from '@/lib/userMatching';
import { ALL_INSTRUMENTS, ALL_GENRES, ALL_FOCUS } from '@/types/userProfile';
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
import { UserAvatarPattern } from '../ui/UserAvatarPattern';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Switch } from '../ui/switch';
import { AvatarEditorModal } from './AvatarEditorModal';
import { UserMatchCard } from './UserMatchCard';
import '@/features/settings/settings.css';

const TABS = ['Profile', 'General', 'Account', 'Billing'] as const;
type Tab = (typeof TABS)[number];

interface TagProps {
  label: string;
  icon?: React.ElementType;
  active?: boolean;
  onClick?: () => void;
}

const Tag: React.FC<TagProps> = ({ label, icon: Icon, active, onClick }) => (
  <div
    onClick={onClick}
    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs cursor-pointer select-none transition-all"
    style={{
      border: active
        ? '1px solid rgba(255,255,255,0.3)'
        : '1px solid var(--color-border)',
      background: active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
      color: active ? 'var(--color-text)' : 'var(--color-text-dim)',
    }}
  >
    {Icon && <Icon size={10} />}
    {label}
  </div>
);

export const ProfilePage: React.FC = () => {
  const { data: user } = useMe();
  const { data: xpSummary } = useExperienceSummary();
  const navigate = useNavigate();

  const { xpThisWeek, xpLastWeek } = useMemo(() => {
    const timelineMap = new Map(
      (xpSummary?.timeline ?? []).map((row) => [row.date, row.totalExperience]),
    );
    const days: string[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const LABELS = ['Mon', 'Tues', 'Weds', 'Thurs', 'Fri', 'Sat', 'Sun'];
    const toPoints = (dates: string[]) =>
      dates.map((date, i) => ({
        label: LABELS[i] ?? '',
        value: timelineMap.get(date) ?? 0,
      }));
    return {
      xpThisWeek: toPoints(days.slice(7, 14)),
      xpLastWeek: toPoints(days.slice(0, 7)),
    };
  }, [xpSummary?.timeline]);
  const displayName = user?.nickname || user?.username || 'USER';
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);

  const {
    instruments: selectedInstruments,
    genres: selectedGenres,
    focus: selectedFocus,
    visibility,
    toggleInstrument,
    toggleGenre,
    toggleFocus,
    toggleVisibility,
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

  const { config: savedAvatarConfig, saveConfig: saveAvatarConfig } =
    useAvatarConfig(
      user?.id,
      (user as Record<string, unknown> | undefined)?.avatarConfig,
    );

  return (
    <div
      className="settings-root relative flex h-full flex-col"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <MeshGradientBg />
      <HeaderBar
        className="bg-neutral-900/60"
        showProfile={false}
        title="Settings"
      />

      <div className="relative flex flex-1 flex-col overflow-y-auto px-8 pb-12">
        <div className="w-full space-y-6">
          {/* Tab bar + close button */}
          <div className="relative flex items-center justify-center">
            <div
              className="glass-panel-sm flex w-fit items-center gap-1 rounded-lg p-1"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--color-border)',
              }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className="rounded-md px-6 py-2 text-sm font-medium transition-colors duration-150"
                  style={
                    activeTab === tab
                      ? {
                          background: 'var(--color-surface-3)',
                          color: 'var(--color-accent)',
                          borderBottom: '2px solid var(--color-accent)',
                        }
                      : {
                          color: 'var(--color-text-dim)',
                          background: 'transparent',
                          borderBottom: '2px solid transparent',
                        }
                  }
                  onClick={() => setActiveTab(tab)}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab)
                      e.currentTarget.style.color = 'var(--color-text)';
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab)
                      e.currentTarget.style.color = 'var(--color-text-dim)';
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="absolute right-0 flex size-8 items-center justify-center rounded-full transition-colors"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-accent)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.color = 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-accent)';
              }}
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'Profile' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                <div className="flex flex-col items-center justify-center lg:col-span-5">
                  <div
                    className="mb-4 rounded-full px-4 py-2 text-center font-serif text-lg backdrop-blur-sm"
                    style={{
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  >
                    {displayName}
                  </div>
                  <div className="relative mb-6 size-80">
                    <div
                      className="size-full overflow-hidden rounded-full shadow-2xl"
                      style={{ border: '4px solid var(--color-accent)' }}
                    >
                      <Avatar className="size-full rounded-full">
                        <AvatarFallback className="relative overflow-hidden p-0">
                          <UserAvatarPattern
                            className="size-full"
                            userName={displayName}
                            config={savedAvatarConfig}
                          />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAvatarEditorOpen(true)}
                      className="absolute bottom-2 right-2 z-10 flex size-9 items-center justify-center rounded-full transition-colors duration-150"
                      style={{
                        background: 'rgba(0,0,0,0.6)',
                        border: '2px solid var(--color-accent)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  <AvatarEditorModal
                    open={avatarEditorOpen}
                    onOpenChange={setAvatarEditorOpen}
                    initialConfig={
                      savedAvatarConfig ?? defaultAvatarConfig(displayName)
                    }
                    onSave={saveAvatarConfig}
                  />
                </div>
                <div className="lg:col-span-7">
                  <div className="mb-4 flex items-center justify-between">
                    <div
                      className="flex items-center gap-2"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <User size={20} />
                      <h2 className="font-serif text-lg">Bio</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-medium"
                        style={{ color: 'var(--color-text-dim)' }}
                      >
                        {visibility === 'public' ? 'Public' : 'Private'}
                      </span>
                      <Switch
                        checked={visibility === 'public'}
                        onCheckedChange={toggleVisibility}
                      />
                    </div>
                  </div>
                  <div
                    className="glass-panel-sm relative rounded-3xl p-8"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div className="space-y-6">
                      <div>
                        <h3
                          className="mb-3 font-serif text-sm"
                          style={{ color: 'var(--color-text-dim)' }}
                        >
                          Instruments
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {ALL_INSTRUMENTS.map((inst) => (
                            <Tag
                              key={inst}
                              label={inst}
                              icon={inst === 'Vocals' ? Mic2 : Music}
                              active={selectedInstruments.has(inst)}
                              onClick={() => toggleInstrument(inst)}
                            />
                          ))}
                        </div>
                      </div>
                      <div
                        className="h-px w-full"
                        style={{ background: 'var(--color-border)' }}
                      />
                      <div>
                        <h3
                          className="mb-3 font-serif text-sm"
                          style={{ color: 'var(--color-text-dim)' }}
                        >
                          Genres
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {ALL_GENRES.map((genre) => (
                            <Tag
                              key={genre}
                              label={genre}
                              icon={Activity}
                              active={selectedGenres.has(genre)}
                              onClick={() => toggleGenre(genre)}
                            />
                          ))}
                        </div>
                      </div>
                      <div
                        className="h-px w-full"
                        style={{ background: 'var(--color-border)' }}
                      />
                      <div>
                        <h3
                          className="mb-3 font-serif text-sm"
                          style={{ color: 'var(--color-text-dim)' }}
                        >
                          Focus
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {ALL_FOCUS.map((focus) => (
                            <Tag
                              key={focus}
                              label={focus}
                              icon={Activity}
                              active={selectedFocus.has(focus)}
                              onClick={() => toggleFocus(focus)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <div className="mb-4 flex items-center gap-6">
                    <h2
                      className="font-serif text-xl"
                      style={{ color: 'var(--color-text)' }}
                    >
                      XP
                    </h2>
                    <div
                      className="flex gap-4 text-xs font-medium"
                      style={{ color: 'var(--color-text-dim)' }}
                    >
                      <span>
                        Level {xpSummary?.level ?? 1} &middot;{' '}
                        {xpSummary?.totalExperience?.toLocaleString() ?? 0} XP
                        &middot; {xpSummary?.today?.totalExperience ?? 0} XP
                        today
                      </span>
                    </div>
                  </div>
                  <div
                    className="glass-panel-sm relative h-80 w-full rounded-3xl px-6 pt-4 pb-2"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <RealTimeAnalytics
                      thisWeek={xpThisWeek}
                      lastWeek={xpLastWeek}
                    />
                  </div>
                </div>
                <div className="mt-8 lg:col-span-4 lg:mt-0">
                  <div
                    className="mb-4 flex items-center gap-2"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <Users size={18} />
                    <h2 className="font-serif text-lg">Connect</h2>
                    <ChevronRight
                      size={16}
                      style={{ color: 'var(--color-text-dim)' }}
                    />
                  </div>
                  <div
                    className="glass-panel-sm relative rounded-3xl p-4"
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
                      <div
                        className="py-4 text-center text-sm"
                        style={{ color: 'var(--color-text-dim)' }}
                      >
                        {selectedGenres.size === 0 &&
                        selectedInstruments.size === 0
                          ? 'Select your instruments and genres to find matches'
                          : 'No matches yet — try selecting more genres'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* General Tab */}
          {activeTab === 'General' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <AudioSettings />
                </div>
                <div>
                  <LookAndFeelSettings />
                </div>
              </div>
              <MidiSettings />
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'Account' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <AccountSettings />
                </div>
                <div>
                  <HelpPanel />
                </div>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'Billing' && (
            <div className="space-y-6">
              <div className="space-y-6">
                <BillingSettings />
                <ContentCodesSettings />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logo — sticky to bottom */}
      <div className="flex justify-center py-4">
        <img
          src="/music-atlas-moving-logo.gif"
          alt="Music Atlas"
          className="h-24"
        />
      </div>
    </div>
  );
};
