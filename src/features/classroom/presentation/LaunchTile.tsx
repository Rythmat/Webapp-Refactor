import { ExternalLink, Settings } from 'lucide-react';
import type { LaunchTile as LaunchTileData, StudentLanguage } from '../types';
import { pickLocalized } from './localized';
import { resolveModuleUrl } from './resolveModuleUrl';

interface LaunchTileProps {
  tile: LaunchTileData;
  language: StudentLanguage;
  /** For accessibility / tracking — which phase this tile belongs to. */
  phaseLabel: string;
}

const MODULE_LABEL: Record<LaunchTileData['module'], string> = {
  learn: 'Learn',
  studio: 'Studio',
  globe: 'Globe',
  arcade: 'Arcade',
};

/**
 * A single Atlas module launch tile inside a phase card.
 *
 * Clicking opens the module in a new tab so the teacher can model, then
 * close the tab to return to the projected board with position preserved
 * (the board is untouched behind the new tab; nothing else to do).
 *
 * If the module has no configured URL, the tile renders as a disabled
 * "Configure in Settings" affordance rather than dead-linking — per the
 * fresh-build brief's launch-tile contract.
 */
export const LaunchTile = ({ tile, language, phaseLabel }: LaunchTileProps) => {
  const url = resolveModuleUrl(tile);
  const label = tile.label
    ? pickLocalized(tile.label, language)
    : `Open ${MODULE_LABEL[tile.module]}`;

  if (!url) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-black/20 bg-transparent px-4 py-2 text-sm text-black/50"
        aria-label={`${MODULE_LABEL[tile.module]} — configure in Settings`}
      >
        <Settings className="h-4 w-4" />
        <span>{MODULE_LABEL[tile.module]} — Configure in Settings</span>
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${label} (${phaseLabel})`}
      className="inline-flex items-center gap-2 rounded-full bg-black text-white px-4 py-2 text-sm font-medium transition-transform hover:-translate-y-px hover:bg-black/85"
      style={{ padding: 'var(--pres-tile-pad)' }}
    >
      <span className="uppercase text-[10px] tracking-widest opacity-70">
        {MODULE_LABEL[tile.module]}
      </span>
      <span>{label}</span>
      <ExternalLink className="h-4 w-4 opacity-70" />
    </a>
  );
};
