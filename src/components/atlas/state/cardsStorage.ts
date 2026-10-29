import type { CardPrefs } from '@/components/atlas/types';

/**
 * The viewer's choices for the floating cards over the map, kept in their
 * browser like Layers (layersStorage.ts): whether the cards are hidden, and
 * whether the Legend card is open. Never in the URL, so a shared link looks
 * the same for everyone.
 */
export const CARDS_STORAGE_KEY = 'atlas-cards-v1';

/** Cards shown, the Legend folded: the map has the room until asked. */
export const DEFAULT_CARD_PREFS: CardPrefs = {
  hidden: false,
  legendOpen: false,
};

export function loadCardPrefs(): CardPrefs {
  try {
    const raw = window.localStorage.getItem(CARDS_STORAGE_KEY);
    if (!raw) return DEFAULT_CARD_PREFS;
    const stored = JSON.parse(raw) as Partial<Record<string, unknown>>;
    return {
      hidden:
        typeof stored.hidden === 'boolean'
          ? stored.hidden
          : DEFAULT_CARD_PREFS.hidden,
      legendOpen:
        typeof stored.legendOpen === 'boolean'
          ? stored.legendOpen
          : DEFAULT_CARD_PREFS.legendOpen,
    };
  } catch {
    // Private windows and blocked storage throw: the defaults stand.
    return DEFAULT_CARD_PREFS;
  }
}

export function saveCardPrefs(prefs: CardPrefs): void {
  try {
    window.localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable: the choice lasts as long as the page */
  }
}
