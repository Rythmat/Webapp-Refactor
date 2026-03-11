import React, { useMemo } from 'react';
import { defaultAvatarConfig, type AvatarConfig } from '@/lib/avatarHexGrid';
import { HexAvatarSVG } from './HexAvatarSVG';

interface UserAvatarPatternProps {
  userName: string;
  className?: string;
  config?: AvatarConfig | null;
}

export const UserAvatarPattern: React.FC<UserAvatarPatternProps> = ({
  userName,
  className,
  config,
}) => {
  const effectiveConfig = useMemo(
    () => config ?? defaultAvatarConfig(userName),
    [config, userName],
  );

  return (
    <HexAvatarSVG config={effectiveConfig} className={className} circular />
  );
};
