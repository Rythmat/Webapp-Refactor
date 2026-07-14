import React from 'react';
import { avatarConfigOrDefault } from '@/lib/avatarHexGrid';
import type { ConnectionMatch } from '@/types/userProfile';
import { HexAvatarSVG } from '../ui/HexAvatarSVG';

interface UserMatchCardProps {
  match: ConnectionMatch;
  compact?: boolean;
  onConnect?: () => void;
  /** Label for the action button. Defaults to "Connect". */
  actionLabel?: string;
}

// Shared picks (in common with you) read violet; the rest read as muted chips.
const SHARED_STYLE = {
  background: 'rgba(167, 139, 250, 0.22)',
  color: 'rgb(196, 181, 253)',
} as const;
const OTHER_STYLE = {
  background: 'rgba(255, 255, 255, 0.06)',
  color: 'var(--color-text-dim)',
} as const;

/** One bio category — every pick the user selected, shared ones highlighted. */
const BioRow: React.FC<{
  label: string;
  items: string[];
  shared: string[];
}> = ({ label, items, shared }) => {
  if (items.length === 0) return null;
  const sharedSet = new Set(shared);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 w-16 shrink-0 text-[10px] uppercase tracking-wide text-white/30">
        {label}
      </span>
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full px-2 py-0.5 text-[10px]"
          style={sharedSet.has(item) ? SHARED_STYLE : OTHER_STYLE}
        >
          {item}
        </span>
      ))}
    </div>
  );
};

export const UserMatchCard: React.FC<UserMatchCardProps> = ({
  match,
  compact,
  onConnect,
  actionLabel = 'Connect',
}) => {
  const {
    user,
    commonGenres,
    commonInstruments,
    commonFocus,
    complementarySkills,
    matchScore,
  } = match;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
            <HexAvatarSVG
              config={avatarConfigOrDefault(user.avatarConfig, user.avatarSeed)}
              circular
              className="size-[150%] opacity-60"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-medium text-white">
                {user.nickname}
              </h3>
              {matchScore > 0 && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums"
                  style={{
                    background:
                      matchScore >= 60
                        ? 'rgba(74, 222, 128, 0.15)'
                        : 'rgba(255, 255, 255, 0.08)',
                    color:
                      matchScore >= 60
                        ? 'rgb(74, 222, 128)'
                        : 'var(--color-text-dim)',
                  }}
                >
                  {matchScore}% match
                </span>
              )}
            </div>

            {/* Compact surfaces keep the old minimal common-genres line. */}
            {compact && commonGenres.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {commonGenres.map((g) => (
                  <span
                    key={g}
                    className="rounded-full px-2 py-0.5 text-[10px]"
                    style={SHARED_STYLE}
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Complementary pairings — what you bring vs. what they bring. */}
            {!compact && complementarySkills.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {complementarySkills.slice(0, 3).map((skill) => (
                  <span
                    key={skill.label}
                    className="text-[10px]"
                    style={{ color: 'var(--color-text-dim)' }}
                  >
                    {skill.yours} ↔ {skill.theirs}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onConnect}
          disabled={!onConnect}
          className="shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black transition-colors hover:bg-gray-200 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-white"
        >
          {actionLabel}
        </button>
      </div>

      {/* Their full bio selections — shared picks highlighted. */}
      {!compact && (
        <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
          <BioRow
            label="Plays"
            items={user.bio.instruments}
            shared={commonInstruments}
          />
          <BioRow
            label="Genres"
            items={user.bio.genres}
            shared={commonGenres}
          />
          <BioRow label="Focus" items={user.bio.focus} shared={commonFocus} />
        </div>
      )}
    </div>
  );
};
