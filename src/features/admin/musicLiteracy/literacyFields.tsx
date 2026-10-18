/* eslint-disable react/jsx-sort-props */
import { Check, X } from 'lucide-react';
import { useState, type FC, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import type { LiteracyHarmony } from '@/content/musicLiteracy/schemas';
import { CONSOLE_LABEL, consoleTabClass } from '../ui/styles';
import { HARMONY_LABEL } from './literacyChords';
import { control } from './literacyControls';
import type { LessonIssue } from './literacyLesson';

/**
 * The step editors' shared parts: a titled part of a step, the schema's
 * problems where they belong (`FieldIssues`), a row of pills to pick one
 * of (`Choice`), a pass that follows the lesson or says on or off, and the
 * step's section, picked from the lesson's or a new one.
 */

/** A part of a step: its title, a line on what it is, its tools. */
export const StepPart: FC<{
  title: string;
  hint?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Its problems, shown under it. */
  issues?: readonly LessonIssue[];
  /** The body path it edits, for the problems list to scroll to. */
  field?: string;
}> = ({ title, hint, actions, children, issues, field }) => (
  <section
    data-field={field}
    className="flex flex-col gap-2.5 border-t border-white/[0.06] pt-4"
  >
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <div className="min-w-0">
        <h3 className={CONSOLE_LABEL}>{title}</h3>
        {hint && <p className="text-xs text-white/40">{hint}</p>}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
    </div>
    {children}
    {issues && <FieldIssues issues={issues} />}
  </section>
);

/** The schema's problems with one field, each said once, in its words. */
export const FieldIssues: FC<{
  issues: readonly LessonIssue[];
  className?: string;
}> = ({ issues, className }) => {
  const messages = [...new Set(issues.map((issue) => issue.message))];
  if (!messages.length) return null;
  return (
    <ul
      data-field-issues
      className={cn('flex flex-col gap-0.5 text-xs text-red-300', className)}
    >
      {messages.map((message) => (
        <li key={message} className="flex items-start gap-1">
          <X className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </li>
      ))}
    </ul>
  );
};

export interface ChoiceOption<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
  disabled?: boolean;
}

/** Pills to pick one of: a radio group in the console's pill shape. */
export function Choice<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  /** The group's name. */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex flex-wrap items-center gap-1.5', className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={option.disabled}
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cn(
            consoleTabClass(value === option.value, 'sm'),
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Triads or 7ths. */
export const HarmonyChoice: FC<{
  value: LiteracyHarmony;
  onChange: (harmony: LiteracyHarmony) => void;
  label: string;
}> = ({ value, onChange, label }) => (
  <Choice
    label={label}
    value={value}
    onChange={onChange}
    options={[
      { value: 'triads', label: HARMONY_LABEL.triads, title: '“4 maj”' },
      { value: 'sevenths', label: HARMONY_LABEL.sevenths, title: '“4 maj7”' },
    ]}
  />
);

type PassSetting = 'lesson' | 'on' | 'off';

/**
 * A pass on one step: as the lesson has it (and what that is), or on or
 * off for this step alone.
 */
export const PassChoice: FC<{
  name: string;
  hint: string;
  /** The step's own setting; undefined follows the lesson. */
  value: boolean | undefined;
  /** What the lesson offers. */
  lesson: boolean;
  onChange: (value: boolean | undefined) => void;
  label: string;
  issues?: readonly LessonIssue[];
}> = ({ name, hint, value, lesson, onChange, label, issues }) => {
  const setting: PassSetting =
    value === undefined ? 'lesson' : value ? 'on' : 'off';
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className={CONSOLE_LABEL}>{name}</div>
      <Choice<PassSetting>
        label={label}
        value={setting}
        onChange={(next) =>
          onChange(next === 'lesson' ? undefined : next === 'on')
        }
        options={[
          {
            value: 'lesson',
            label: `Lesson’s (${lesson ? 'on' : 'off'})`,
            title: 'Whatever the lesson’s settings say',
          },
          { value: 'on', label: 'On' },
          { value: 'off', label: 'Off' },
        ]}
      />
      <p className="text-[11px] text-white/35">{hint}</p>
      {issues && <FieldIssues issues={issues} />}
    </div>
  );
};

const NEW_SECTION = '\u0000new';
const NO_SECTION = '';

/**
 * The step's section: none, one the lesson has, or a new one, named here.
 * The steps list groups steps under their sections.
 */
export const SectionPicker: FC<{
  value: string | undefined;
  sections: readonly string[];
  onChange: (section: string | undefined) => void;
  label: string;
}> = ({ value, sections, onChange, label }) => {
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState('');
  const commit = () => {
    setNaming(false);
    if (draft.trim()) onChange(draft.trim());
    setDraft('');
  };
  if (naming)
    return (
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          aria-label={`${label}: the new section’s name`}
          value={draft}
          placeholder="Create a Melody"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setDraft('');
              setNaming(false);
            }
          }}
          className={cn(control, 'w-44 py-1 text-sm')}
        />
        <button
          type="button"
          aria-label="Use this name"
          onMouseDown={(e) => e.preventDefault()}
          onClick={commit}
          className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
        >
          <Check className="size-3.5" />
        </button>
      </span>
    );
  return (
    <select
      aria-label={label}
      value={value ?? NO_SECTION}
      onChange={(e) => {
        const next = e.target.value;
        if (next === NEW_SECTION) setNaming(true);
        else onChange(next || undefined);
      }}
      className={cn(control, 'max-w-[14rem] py-1 text-sm')}
    >
      <option value={NO_SECTION}>No section</option>
      {sections.map((section) => (
        <option key={section} value={section}>
          {section}
        </option>
      ))}
      {value && !sections.includes(value) && (
        <option value={value}>{value}</option>
      )}
      <option value={NEW_SECTION}>New section…</option>
    </select>
  );
};
