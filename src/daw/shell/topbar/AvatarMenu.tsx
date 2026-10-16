import {
  ArrowLeft,
  Award,
  Bell,
  Flame,
  Music2,
  Settings2,
  User,
} from 'lucide-react';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopRailStats } from '@/components/ClassroomLayout/useTopRailStats';
import { UserAvatarPattern } from '@/components/ui/UserAvatarPattern';
import { cn } from '@/components/utilities';
import {
  ProfileRoutes,
  SettingsRoutes,
  StudioRoutes,
  UserRoutes,
} from '@/constants/routes';
import {
  CHORD_NOTATION_OPTIONS,
  useChordNotationSwitcher,
  type ChordNotation,
} from '@/lib/chordNotation';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { FOCUS_RING, TYPE_CLASS } from '@/daw/ui/styles';
import { Tooltip } from '@/daw/ui/Tooltip';

// ── The avatar menu (milestone 2.5, owner decision 7) ──────────────────────
//
// Focus mode hides the app's TopRail in the editor, so what it showed of the
// student moves here: the avatar (with a dot for notifications), and in the
// menu their name, level, XP and streak, then Profile, Awards,
// Notifications, the chord-notation switch (once it is on in Settings ▸
// Look & Feel), the app's settings and Back to Studio. The stats come from
// the same hook as the TopRail's (useTopRailStats). The practice screen's
// header has it too.

export const AvatarMenu = memo(function AvatarMenu({
  className,
}: {
  className?: string;
}) {
  const navigate = useNavigate();
  const {
    totalXp,
    level,
    streakDays,
    unlockedCount,
    notificationCount,
    userName,
    avatarConfig,
  } = useTopRailStats();
  const notation = useChordNotationSwitcher();

  return (
    <Menu>
      <Tooltip content="Your account" side="bottom">
        <MenuTrigger
          aria-label={`${userName}: account menu`}
          data-testid="avatar-menu"
          className={cn(
            'relative inline-flex size-7 shrink-0 items-center justify-center rounded-full',
            FOCUS_RING,
            className,
          )}
        >
          <span className="size-7 overflow-hidden rounded-full border border-daw-hairline">
            <UserAvatarPattern
              className="size-full"
              userName={userName}
              config={avatarConfig}
            />
          </span>
          {notificationCount > 0 ? (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-daw-record ring-2 ring-daw-bg"
            />
          ) : null}
        </MenuTrigger>
      </Tooltip>
      <MenuContent align="end" sideOffset={6} className="w-64">
        <div className="flex items-center gap-3 px-2 pb-2 pt-1.5">
          <span className="size-9 shrink-0 overflow-hidden rounded-full border border-daw-hairline">
            <UserAvatarPattern
              className="size-full"
              userName={userName}
              config={avatarConfig}
            />
          </span>
          <div className="min-w-0">
            <div
              className={cn(TYPE_CLASS.title, 'truncate text-daw-text')}
              data-testid="avatar-menu-name"
            >
              {userName}
            </div>
            <div
              className={cn(TYPE_CLASS.label, 'text-daw-text-2 tabular-nums')}
              data-testid="avatar-menu-stats"
            >
              Level {level} · {totalXp.toLocaleString()} XP
            </div>
            {streakDays > 0 ? (
              <div
                className={cn(
                  TYPE_CLASS.label,
                  'flex items-center gap-1 text-daw-text-2',
                )}
              >
                <Flame aria-hidden className="size-3.5" />
                {streakDays}-day streak
              </div>
            ) : null}
          </div>
        </div>
        <MenuSeparator />
        <MenuItem icon={<User />} onSelect={() => navigate(UserRoutes.root())}>
          Profile
        </MenuItem>
        <MenuItem
          icon={<Award />}
          onSelect={() => navigate(ProfileRoutes.awards())}
        >
          {unlockedCount > 0 ? `Awards (${unlockedCount})` : 'Awards'}
        </MenuItem>
        <MenuItem icon={<Bell />} disabled>
          {notificationCount > 0
            ? `Notifications (${notificationCount})`
            : 'No notifications'}
        </MenuItem>
        {notation.enabled ? (
          <MenuSub>
            <MenuSubTrigger icon={<Music2 />}>Chord notation</MenuSubTrigger>
            <MenuSubContent>
              <MenuRadioGroup
                value={notation.notation}
                onValueChange={(value) =>
                  notation.setNotation(value as ChordNotation)
                }
              >
                {CHORD_NOTATION_OPTIONS.map((option) => (
                  <MenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuSubContent>
          </MenuSub>
        ) : null}
        <MenuItem
          icon={<Settings2 />}
          onSelect={() => navigate(SettingsRoutes.root())}
        >
          App settings
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon={<ArrowLeft />}
          onSelect={() => navigate(StudioRoutes.root())}
        >
          Back to Studio
        </MenuItem>
      </MenuContent>
    </Menu>
  );
});
