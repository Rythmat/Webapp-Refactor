import React, { useMemo } from 'react';
import { generateAvatarPolygons, type AvatarConfig } from '@/lib/avatarHexGrid';

interface HexAvatarSVGProps {
  config: AvatarConfig;
  size?: number;
  className?: string;
  circular?: boolean;
}

export const HexAvatarSVG: React.FC<HexAvatarSVGProps> = ({
  config,
  size = 256,
  className,
  circular = true,
}) => {
  const data = useMemo(
    () => generateAvatarPolygons(config, size, size),
    // Stringify config for stable memo key
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(config), size],
  );

  const clipId = `avatar-clip-${size}`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${data.width} ${data.height}`}
      preserveAspectRatio="xMidYMid slice"
      width={size}
      height={size}
    >
      {circular && (
        <defs>
          <clipPath id={clipId}>
            <circle
              cx={data.width / 2}
              cy={data.height / 2}
              r={Math.min(data.width, data.height) / 2}
            />
          </clipPath>
        </defs>
      )}
      <g clipPath={circular ? `url(#${clipId})` : undefined}>
        {data.polygons.map((poly, i) => (
          <polygon
            key={i}
            points={poly.points}
            fill={poly.fill}
            opacity={poly.opacity}
          />
        ))}
      </g>
    </svg>
  );
};
