/**
 * The Studio's grooves, read eagerly — the designer lists and edits them
 * alongside the lesson grooves. Admin-only: lessons and the Studio load them
 * on demand (registry.loadStudioGrooves).
 */

import type { DrumGroove } from '@/curriculum/engine/drumGrooves/drumGroove';

const files = import.meta.glob<DrumGroove>(
  '../../../curriculum/data/drumGrooves/studio/*.json',
  { eager: true, import: 'default' },
);

export const STUDIO_GROOVES: readonly DrumGroove[] = Object.values(files);
