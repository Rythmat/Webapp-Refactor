import type { SoundCategory, SoundOption } from './SoundBrowser';

// ── The Synth's patches by category (the dock's sound column) ──────────────
//
// The factory patches are named for what they are (BASS, WOBBLE, …), so a
// table puts each in a category; a pack's patches carry their own category
// and join the one of the same name (or start one after them); the
// student's own patches come last. Init is first: it is where a sound is
// built from scratch. A category with nothing in it isn't shown.

/** The factory categories in order, each with its patches. */
const FACTORY: readonly { label: string; patches: readonly string[] }[] = [
  { label: 'Init', patches: ['INITIALIZE'] },
  { label: 'Bass', patches: ['BASS', 'WOBBLE'] },
  { label: 'Lead', patches: ['LEAD', 'TRANCE'] },
  { label: 'Pad', patches: ['PAD', 'DRIFT'] },
  { label: 'Pluck', patches: ['PLUCK', 'SEQUENCE'] },
  { label: 'Chords', patches: ['CHORDS', 'STAB'] },
];

/** Where a factory patch the table doesn't know goes. */
const OTHER = 'Other';
export const MY_PATCHES = 'My patches';

const sound = (name: string): SoundOption => ({ id: name, label: name });

/**
 * The categories for the patches the synth has: its factory patches by
 * name, packs' by their category, the student's last.
 */
export function synthPatchCategories(
  factory: readonly string[],
  packs: readonly { name: string; category: string }[],
  user: readonly string[],
): SoundCategory[] {
  const groups = new Map<string, SoundOption[]>();
  const add = (label: string, name: string) => {
    const key = label.trim() || OTHER;
    // One group per category whatever its case ('bass' joins 'Bass').
    const existing = [...groups.keys()].find(
      (k) => k.toLowerCase() === key.toLowerCase(),
    );
    const list = groups.get(existing ?? key) ?? [];
    if (!list.some((s) => s.id === name)) list.push(sound(name));
    groups.set(existing ?? key, list);
  };
  for (const { label } of FACTORY) groups.set(label, []);
  for (const name of factory) {
    add(FACTORY.find((g) => g.patches.includes(name))?.label ?? OTHER, name);
  }
  for (const pack of packs) add(pack.category, pack.name);
  for (const name of user) add(MY_PATCHES, name);
  // 'My patches' after every other category.
  const mine = groups.get(MY_PATCHES);
  groups.delete(MY_PATCHES);
  if (mine) groups.set(MY_PATCHES, mine);
  return [...groups]
    .filter(([, sounds]) => sounds.length > 0)
    .map(([label, sounds]) => ({ id: label, label, sounds }));
}
