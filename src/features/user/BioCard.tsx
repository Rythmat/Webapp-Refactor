/* eslint-disable react/jsx-sort-props */
import { Activity, Mic2, Music, User } from 'lucide-react';
import type { ElementType, FC } from 'react';
import { Switch } from '@/components/ui/switch';
import { useMe } from '@/hooks/data';
import { useUserBioPreferences } from '@/hooks/useUserBioPreferences';
import { ALL_FOCUS, ALL_GENRES, ALL_INSTRUMENTS } from '@/types/userProfile';

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

/**
 * Bio card for the User page — Instruments / Genres / Focus tag selectors +
 * Public/Private visibility switch. Persists via useUserBioPreferences.
 */
export const BioCard = () => {
  const { data: user } = useMe();
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

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-white">
        <User size={20} />
        <h2 className="text-2xl font-medium">Bio</h2>
      </div>
      <div
        className="glass-panel-sm relative rounded-3xl p-6"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between pb-4">
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
      </div>
    </section>
  );
};
