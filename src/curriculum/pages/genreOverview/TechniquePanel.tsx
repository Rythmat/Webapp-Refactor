import { ArrowRight } from 'lucide-react';
import {
  PROMPT_FRAME,
  PROMPT_WASH,
  PromptPillButton,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import type { GenreLevelProfile } from '@/curriculum/types/genreProfile';
import type { ActivitySectionId } from '../../types/activity';
import { EYEBROW } from './genreOverviewShared';

const SECTIONS = [
  { key: 'melody', id: 'A', label: 'Melody' },
  { key: 'chords', id: 'B', label: 'Chords' },
  { key: 'bass', id: 'C', label: 'Bass' },
  { key: 'performance', id: 'D', label: 'Performance' },
] as const satisfies readonly {
  key: keyof GenreLevelProfile['technique'];
  id: ActivitySectionId;
  label: string;
}[];

/** What each of the level's sections works on, each a way into it. */
export function TechniquePanel({
  level,
  onOpenSection,
}: {
  level: GenreLevelProfile;
  onOpenSection: (id: ActivitySectionId) => void;
}) {
  return (
    <div data-genre-overview-panel="technique" className="flex flex-col gap-3">
      {SECTIONS.map(({ key, id, label }) => {
        const entry = level.technique[key];
        return (
          <section
            key={key}
            className={cn(
              PROMPT_FRAME,
              PROMPT_WASH,
              'flex items-start justify-between gap-4 p-5 max-[639px]:flex-col',
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <h3 className={EYEBROW}>{label}</h3>
              <p className="text-base text-[#e8e8f0]">{entry.summary}</p>
              <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 marker:text-white/30">
                {entry.details.map((d) => (
                  <li key={d} className="text-sm leading-6 text-white/55">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <PromptPillButton
              variant="outline"
              data-course-jump={key}
              onClick={() => onOpenSection(id)}
              className="gap-1.5 max-[639px]:h-11"
            >
              Jump In <ArrowRight aria-hidden className="size-3.5" />
            </PromptPillButton>
          </section>
        );
      })}
    </div>
  );
}
