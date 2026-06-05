import React, { useMemo } from 'react';
import { defaultAvatarConfig, type AvatarConfig } from '@/lib/avatarHexGrid';
import { HexAvatarSVG } from './HexAvatarSVG';

interface ProjectAvatarPatternProps {
  projectName: string;
  className?: string;
  config?: AvatarConfig | null;
}

/**
 * Procedural hexagon-grid icon for a studio project, deterministically derived
 * from its name (same generator as the user avatars). Rendered non-circular so
 * it fills a rounded square tile; let the container clip the corners.
 */
export const ProjectAvatarPattern: React.FC<ProjectAvatarPatternProps> = ({
  projectName,
  className,
  config,
}) => {
  const effectiveConfig = useMemo(
    () => config ?? defaultAvatarConfig(projectName),
    [config, projectName],
  );

  return (
    <HexAvatarSVG
      config={effectiveConfig}
      className={className}
      circular={false}
    />
  );
};
