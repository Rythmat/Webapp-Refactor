import React from 'react';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import type { ConnectionMatch } from '@/types/userProfile';
import { HexAvatarSVG } from '../ui/HexAvatarSVG';

interface UserMatchCardProps {
  match: ConnectionMatch;
  compact?: boolean;
  onConnect?: () => void;
}

export const UserMatchCard: React.FC<UserMatchCardProps> = ({
  match,
  compact,
  onConnect,
}) => {
  const { user, commonGenres, complementarySkills, matchScore } = match;

  return (
    <div
      className="flex items-center justify-between rounded-xl border border-white/5 bg-[#151515] p-4 transition-colors hover:border-white/20"
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Avatar */}
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-[#2A2A2A]">
          <HexAvatarSVG
            config={defaultAvatarConfig(user.avatarSeed)}
            circular
            className="size-[150%] opacity-50"
          />
        </div>

        {/* Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-white">
              {user.nickname}
            </h3>
            {matchScore > 0 && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
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
                {matchScore}%
              </span>
            )}
          </div>

          {/* Common genres */}
          {commonGenres.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {commonGenres.map((g) => (
                <span
                  key={g}
                  className="rounded-full px-2 py-0.5 text-[10px]"
                  style={{
                    background: 'rgba(139, 92, 246, 0.2)',
                    color: 'rgb(167, 139, 250)',
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Complementary skills */}
          {!compact && complementarySkills.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {complementarySkills.slice(0, 2).map((skill) => (
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

      {/* Connect button */}
      <button
        onClick={onConnect}
        className="shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black transition-colors hover:bg-gray-200"
      >
        Connect
      </button>
    </div>
  );
};
