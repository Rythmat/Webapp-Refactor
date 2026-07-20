/* eslint-disable react/jsx-sort-props */
import { Activity, Mic2, Music, User } from 'lucide-react';
import { type ElementType, type FC, useEffect, useState } from 'react';
import { AvatarEditor } from '@/components/Profile/AvatarEditor';
import { UserAvatarPattern } from '@/components/ui/UserAvatarPattern';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useMe } from '@/hooks/data';
import { useAvatarConfig } from '@/hooks/useAvatarConfig';
import { useUserBioPreferences } from '@/hooks/useUserBioPreferences';
import { type AvatarConfig, defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { ALL_FOCUS, ALL_GENRES, ALL_INSTRUMENTS } from '@/types/userProfile';
import { SettingsCard } from '../../SettingsCard';
import { SettingsSectionHeader } from '../../SettingsSectionHeader';

interface TagProps {
  label: string;
  icon?: ElementType;
  active?: boolean;
  onClick?: () => void;
}

const Tag: FC<TagProps> = ({ label, icon: Icon, active, onClick }) => (
  <div
    onClick={onClick}
    className="flex cursor-pointer select-none items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all"
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

export const ProfileSection = () => {
  const { data: user } = useMe();
  const displayName = user?.nickname || user?.username || 'USER';

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

  const { config: savedAvatarConfig, saveConfig: saveAvatarConfig } =
    useAvatarConfig(
      user?.id,
      (user as Record<string, unknown> | undefined)?.avatarConfig,
    );

  // Local editing state — drives the live preview and gets debounce-persisted.
  const [editingConfig, setEditingConfig] = useState<AvatarConfig | undefined>(
    undefined,
  );

  // Adopt the saved config once it loads (server or localStorage cache) so
  // the editor starts from the user's last known state.
  useEffect(() => {
    if (savedAvatarConfig && !editingConfig) {
      setEditingConfig(savedAvatarConfig);
    }
  }, [savedAvatarConfig, editingConfig]);

  const activeConfig =
    editingConfig ?? savedAvatarConfig ?? defaultAvatarConfig(displayName);

  // Debounced auto-save — 500 ms after the last change, persist locally +
  // fire the PUT. Cleanup cancels any pending write when the config changes
  // again, so mid-drag intermediate values never hit the network.
  useEffect(() => {
    if (!editingConfig) return;
    const t = setTimeout(() => saveAvatarConfig(editingConfig), 500);
    return () => clearTimeout(t);
  }, [editingConfig, saveAvatarConfig]);

  return (
    <div className="flex flex-col gap-8">
      <SettingsSectionHeader
        title="Profile"
        description="Your identity, bio, and visibility across the app."
      />

      <SettingsCard
        title="Avatar"
        description="Adjust the hex pattern — every change saves automatically."
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="size-40 overflow-hidden rounded-full shadow-2xl"
            style={{ border: '4px solid var(--color-accent)' }}
          >
            <Avatar className="size-full rounded-full">
              <AvatarFallback className="relative overflow-hidden p-0">
                <UserAvatarPattern
                  className="size-full"
                  userName={displayName}
                  config={activeConfig}
                />
              </AvatarFallback>
            </Avatar>
          </div>
          <div
            className="rounded-full px-4 py-2 text-lg backdrop-blur-sm"
            style={{
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            {displayName}
          </div>
        </div>
        <AvatarEditor value={activeConfig} onChange={setEditingConfig} />
      </SettingsCard>

      <SettingsCard
        title={
          <div className="flex items-center gap-2">
            <User size={18} />
            <span>Bio</span>
          </div>
        }
        description="Tell others what you play, love, and focus on."
      >
        <div className="flex items-center justify-between pb-2">
          <span className="text-sm text-white/60">Visibility</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white/60">
              {visibility === 'public' ? 'Public' : 'Private'}
            </span>
            <Switch
              checked={visibility === 'public'}
              onCheckedChange={toggleVisibility}
            />
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <h3
              className="mb-3 text-sm"
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
              className="mb-3 text-sm"
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
              className="mb-3 text-sm"
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
      </SettingsCard>
    </div>
  );
};
