import { useMemo } from 'react';
import {
  useActivityBank,
  useCloBank,
  useLessonSeedBank,
  useThemeBank,
} from '@/features/classroom/content/hooks';
import { IDEA_BANK } from '@/features/classroom/content/ideaBank';
import type { PhaseKey } from '@/features/classroom/phases';
import type { InspectKind } from '../frame/useOfficeInspector';
import {
  MONTHS,
  activityFields,
  goalText,
  phaseName,
  seedFields,
  themeFields,
  type LibrarySection,
} from './libraryModel';

/** One Library item, as every view of the Library shows it. */
export interface LibraryEntry {
  section: LibrarySection;
  kind: InspectKind;
  id: string;
  eyebrow: string;
  title: string;
  meta?: string;
  /** What search reads. */
  fields: (string | undefined | null)[];
  phase?: PhaseKey;
  /** Seeds: a full lesson or one activity. */
  seedKind?: 'day' | 'activity';
  themeId?: string;
  personal: boolean;
}

/** Every bank, canonical plus the teacher's own, as Library entries. */
export const useLibraryEntries = (): Record<LibrarySection, LibraryEntry[]> => {
  const { seeds } = useLessonSeedBank();
  const { themes, byId: themeById } = useThemeBank();
  const { activities } = useActivityBank();
  const { clos } = useCloBank();

  return useMemo(
    () => ({
      seeds: seeds.map((s) => ({
        section: 'seeds',
        kind: 'seed',
        id: s.id,
        eyebrow: s.kind === 'day' ? 'Full lesson' : 'One activity',
        title: s.title.en,
        meta: themeById(s.themeId)?.title.en,
        fields: [...seedFields(s), themeById(s.themeId)?.title.en],
        seedKind: s.kind,
        themeId: s.themeId,
        personal: s.source === 'personal',
      })),
      themes: [...themes]
        .sort((a, b) => (a.month ?? 99) - (b.month ?? 99))
        .map((t) => ({
          section: 'themes',
          kind: 'theme',
          id: t.id,
          eyebrow: t.month ? MONTHS[t.month - 1] : 'Theme',
          title: t.title.en,
          meta: `${t.seedIds.length} ${t.seedIds.length === 1 ? 'seed' : 'seeds'}`,
          fields: themeFields(t),
          personal: t.source === 'personal',
        })),
      activities: activities.map((a) => ({
        section: 'activities',
        kind: 'activity',
        id: a.id,
        eyebrow: phaseName(a.phase),
        title: a.title.en,
        meta: a.purpose,
        fields: activityFields(a),
        phase: a.phase,
        personal: a.source === 'personal',
      })),
      goals: clos.map((c) => ({
        section: 'goals',
        kind: 'goal',
        id: c.id,
        eyebrow:
          c.type === 'content-language' ? 'Language' : phaseName(c.phase),
        title: goalText(c),
        fields: [goalText(c)],
        phase: c.phase,
        personal: c.source === 'personal',
      })),
      ideas: IDEA_BANK.recurringFormats.map((f) => ({
        section: 'ideas',
        kind: 'idea',
        id: f.id,
        eyebrow: 'Recurring format',
        title: f.title,
        meta: f.description,
        fields: [f.title, f.description, ...(f.possibleUses ?? [])],
        personal: false,
      })),
    }),
    [seeds, themes, themeById, activities, clos],
  );
};
