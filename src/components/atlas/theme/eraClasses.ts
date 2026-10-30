import type { EraId } from '@/components/atlas/data/musicalEras';

/** Each era's colour as a background class (static, so Tailwind keeps it). */
export const ERA_BG: Record<EraId, string> = {
  ancient: 'bg-atlas-era-ancient',
  renaissance: 'bg-atlas-era-renaissance',
  'classical-romantic': 'bg-atlas-era-classical-romantic',
  'early-modern': 'bg-atlas-era-early-modern',
  postwar: 'bg-atlas-era-postwar',
  'electronic-hiphop': 'bg-atlas-era-electronic-hiphop',
  'global-digital': 'bg-atlas-era-global-digital',
};
