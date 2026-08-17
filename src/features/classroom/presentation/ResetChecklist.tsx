/**
 * Reflect-phase reset checklist. Check state is deliberately ephemeral — it
 * lives in the uncontrolled inputs and evaporates when the slide unmounts.
 * Shared by the "present" surface (SlidePresentBody) and the live projector /
 * student surfaces (ContentSlide).
 */
import type { LocalizedText, StudentLanguage } from '../types';
import { pickLocalized } from './localized';

export const ResetChecklist = ({
  items,
  language,
}: {
  items: LocalizedText[];
  language: StudentLanguage;
}) => (
  <ul className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
    {items.map((item, i) => (
      <li key={i}>
        <label className="flex cursor-pointer items-center gap-3 text-white/85">
          <input type="checkbox" className="size-5 accent-white" />
          <span style={{ fontSize: 'var(--slide-body-fz)' }}>
            {pickLocalized(item, language)}
          </span>
        </label>
      </li>
    ))}
  </ul>
);
