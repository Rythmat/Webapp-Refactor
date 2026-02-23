import React, { useMemo } from 'react';
import { HexagonPattern } from './HexagonPattern';
import type { PatternCoord } from './HexagonPattern';

interface UserAvatarPatternProps {
  userName: string;
  className?: string;
}

function hashStringToUint32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function toHexColor(value: number): string {
  const hex = (value & 0xffffff).toString(16).padStart(6, '0');
  return `#${hex}`;
}

function generateColors(userName: string): string[] {
  const seed = hashStringToUint32(userName || 'USER');
  const step = 0x1f3d5b;
  const colors: string[] = [];

  for (let i = 0; i < 5; i += 1) {
    // Use simple hex arithmetic off the username hash, then clamp brightness up
    const raw = (seed + step * (i + 1)) & 0xffffff;
    const boosted =
      (((raw >> 16) & 0xff) | 0x40) << 16 |
      (((raw >> 8) & 0xff) | 0x30) << 8 |
      ((raw & 0xff) | 0x30);
    colors.push(toHexColor(boosted));
  }

  return colors;
}

function generatePattern(userName: string): PatternCoord[] {
  const rng = createSeededRng(hashStringToUint32(userName || 'USER'));
  const rows = 12;
  const cols = 16;
  const coords: PatternCoord[] = [];

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const dx = (c - 7.5) / 7.5;
      const dy = (r - 5.5) / 5.5;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const centerBias = Math.max(0, 1 - distance);
      const threshold = 0.78 - centerBias * 0.28;

      if (rng() > threshold) {
        coords.push({ r, c });
      }
    }
  }

  // Ensure we always have visible pattern density
  if (coords.length < 20) {
    for (let i = 0; i < 24; i += 1) {
      const r = Math.floor(rng() * rows);
      const c = Math.floor(rng() * cols);
      if (!coords.some((p) => p.r === r && p.c === c)) {
        coords.push({ r, c });
      }
    }
  }

  return coords;
}

export const UserAvatarPattern: React.FC<UserAvatarPatternProps> = ({
  userName,
  className,
}) => {
  const colors = useMemo(() => generateColors(userName), [userName]);
  const pattern = useMemo(() => generatePattern(userName), [userName]);

  return (
    <HexagonPattern
      className={className}
      colorsOverride={colors}
      fixedPattern={pattern}
    />
  );
};

