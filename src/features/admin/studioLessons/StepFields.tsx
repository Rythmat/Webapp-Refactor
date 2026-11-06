/* eslint-disable react/jsx-sort-props */
import { ArrowUp, Plus, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import ANCHORS from '@/content/studioLessons/anchors.json';
import {
  CHECK_CATALOG,
  defaultCheckParams,
  getCheckEntry,
  type CheckParamSpec,
} from '@/content/studioLessons/checkCatalog';
import { stepUsesPrism } from '@/content/studioLessons/premium';
import {
  STUDIO_LESSON_DOCK_TABS,
  STUDIO_LESSON_VIEWS,
  type StudioLessonStep,
} from '@/content/studioLessons/schemas';
import { InlineSelect } from '../content/visual/Editable';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { CONSOLE_LABEL, consoleTabClass } from '../ui/styles';

/**
 * One step's fields in the lesson editor: its words, what it spotlights,
 * what the Studio does as it starts, and what makes it pass.
 */

export const INPUT =
  'w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none';

const Field = ({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <label className={`flex min-w-0 flex-col gap-1 ${className ?? ''}`}>
    <span className={CONSOLE_LABEL}>{label}</span>
    {children}
    {hint && <span className="text-xs text-white/40">{hint}</span>}
  </label>
);

type Patch = (patch: Partial<StudioLessonStep>) => void;

export const StepFields = ({
  step,
  onPatch,
}: {
  step: StudioLessonStep;
  onPatch: Patch;
}) => (
  <div className="flex flex-col gap-5">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Field label="Stage" hint="The card’s section label.">
        <input
          className={INPUT}
          value={step.stage}
          onChange={(e) => onPatch({ stage: e.target.value })}
          placeholder="STAGE 2 — KEY"
        />
      </Field>
      <Field label="Step id" hint="Lowercase and dashes; unique in the lesson.">
        <input
          className={`${INPUT} tabular-nums`}
          value={step.id}
          onChange={(e) => onPatch({ id: e.target.value })}
        />
      </Field>
    </div>
    <Field
      label="Instruction"
      hint="What the student does. **Bold** with double asterisks."
    >
      <textarea
        className={INPUT}
        rows={2}
        value={step.instruction}
        onChange={(e) => onPatch({ instruction: e.target.value })}
      />
    </Field>
    <Field label="Hint" hint="An optional second line.">
      <input
        className={INPUT}
        value={step.hint ?? ''}
        onChange={(e) => onPatch({ hint: e.target.value || undefined })}
      />
    </Field>

    <AnchorPicker
      value={step.target}
      onChange={(target) => onPatch({ target })}
    />
    <RackField step={step} onPatch={onPatch} />
    <RequiresFields step={step} onPatch={onPatch} />
    <CheckPicker step={step} onPatch={onPatch} />
    {step.demo && (
      <div className="flex items-center gap-2 text-sm text-white/70">
        <span className={CONSOLE_LABEL}>Demo</span>
        Plays the “watch me” demo of {step.demo.lesson} › {step.demo.step}.
        <button
          type="button"
          className="text-xs text-white/50 underline-offset-2 hover:text-white hover:underline"
          onClick={() => onPatch({ demo: undefined })}
        >
          Remove
        </button>
      </div>
    )}
    {stepUsesPrism(step) && (
      <p className="text-xs text-amber-300/80">
        This step is in Prism, so the lesson needs Premium.
      </p>
    )}
  </div>
);

// ── Spotlight ──────────────────────────────────────────────────────────────

type Anchor = { id: string; area: string };
const ANCHOR_LIST = ANCHORS as Anchor[];
const KNOWN = new Set(ANCHOR_LIST.map((a) => a.id));

const targetsOf = (target: StudioLessonStep['target']): string[] =>
  target === undefined ? [] : typeof target === 'string' ? [target] : target;

/** The anchors a step spotlights, first on screen first, from the Studio's list. */
export const AnchorPicker = ({
  value,
  onChange,
}: {
  value: StudioLessonStep['target'];
  onChange: (target: StudioLessonStep['target']) => void;
}) => {
  const targets = targetsOf(value);
  const [query, setQuery] = useState('');
  const set = (next: string[]) =>
    onChange(
      next.length === 0 ? undefined : next.length === 1 ? next[0] : next,
    );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ANCHOR_LIST.filter(
      (a) =>
        !targets.includes(a.id) &&
        (a.id.includes(q) || a.area.toLowerCase().includes(q)),
    ).slice(0, 40);
  }, [query, targets]);

  const add = (id: string) => {
    if (!id || targets.includes(id)) return;
    set([...targets, id]);
    setQuery('');
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className={CONSOLE_LABEL}>Spotlight</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {targets.length === 0 && (
          <span className="text-sm text-white/40">
            None: the card sits in the middle, with no ring.
          </span>
        )}
        {targets.map((id, i) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/85"
          >
            <span className="tabular-nums">{id}</span>
            {!KNOWN.has(id) && (
              <ConsoleBadge
                tone="warning"
                title="Not among the anchors the Studio renders: check the id."
              >
                unknown
              </ConsoleBadge>
            )}
            {i > 0 && (
              <button
                type="button"
                aria-label={`Try ${id} earlier`}
                title="Try it earlier"
                className="text-white/40 hover:text-white"
                onClick={() => {
                  const next = [...targets];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  set(next);
                }}
              >
                <ArrowUp className="size-3" />
              </button>
            )}
            <button
              type="button"
              aria-label={`Remove ${id}`}
              className="text-white/40 hover:text-white"
              onClick={() => set(targets.filter((t) => t !== id))}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="relative max-w-md">
        <input
          className={INPUT}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(matches[0]?.id ?? query.trim());
            }
          }}
          placeholder="Find an anchor: transport-play, prism-key, fx-add-…"
          aria-label="Find an anchor to spotlight"
        />
        {matches.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-white/10 bg-[#141416] py-1 shadow-lg"
          >
            {matches.map((a) => (
              <li key={a.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="flex w-full items-baseline justify-between gap-3 px-2 py-1 text-left text-sm hover:bg-white/10"
                  onClick={() => add(a.id)}
                >
                  <span className="tabular-nums text-white/90">{a.id}</span>
                  <span className="truncate text-xs text-white/40">
                    {a.area}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <span className="text-xs text-white/40">
        With more than one, the first on screen wins (a button, then the window
        it opens).
      </span>
    </div>
  );
};

// ── Rack ───────────────────────────────────────────────────────────────────

const RACKS = [
  { value: 'track', label: 'The selected track’s' },
  { value: 'master', label: 'Master’s' },
  { value: 'return:A', label: 'Return A’s' },
  { value: 'return:B', label: 'Return B’s' },
];

const RackField = ({
  step,
  onPatch,
}: {
  step: StudioLessonStep;
  onPatch: Patch;
}) =>
  targetsOf(step.target).some((t) => t.startsWith('fx-add-')) ? (
    <Field label="Effect rack" hint="Which rack an fx-add-… spotlight means.">
      <InlineSelect
        value={step.rack ?? 'track'}
        options={RACKS}
        onChange={(rack) =>
          onPatch({ rack: rack === 'track' ? undefined : rack })
        }
        ariaLabel="Effect rack"
      />
    </Field>
  ) : null;

// ── Before the step ────────────────────────────────────────────────────────

const LEAVE = '—';

const RequiresFields = ({
  step,
  onPatch,
}: {
  step: StudioLessonStep;
  onPatch: Patch;
}) => {
  const r = step.requires ?? {};
  const patch = (next: Partial<NonNullable<StudioLessonStep['requires']>>) =>
    onPatch({ requires: { ...r, ...next } });
  const toggle = (
    key: 'clearClipSelection' | 'effectsLibrary' | 'soundsOpen',
    label: string,
  ) => (
    <label className="flex items-center gap-2 text-sm text-white/75">
      <input
        type="checkbox"
        checked={r[key] === true}
        onChange={(e) => patch({ [key]: e.target.checked || undefined })}
      />
      {label}
    </label>
  );
  return (
    <div className="flex flex-col gap-2">
      <span className={CONSOLE_LABEL}>As the step starts, the Studio…</span>
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
        <div className="flex items-center gap-2 text-sm text-white/75">
          Opens the view
          <InlineSelect
            value={r.view ?? LEAVE}
            options={[LEAVE, ...STUDIO_LESSON_VIEWS]}
            onChange={(v) =>
              patch({
                view:
                  v === LEAVE
                    ? undefined
                    : (v as (typeof STUDIO_LESSON_VIEWS)[number]),
              })
            }
            ariaLabel="View"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-white/75">
          Opens the dock on
          <InlineSelect
            value={
              r.channelStripTab === undefined
                ? LEAVE
                : r.channelStripTab === null
                  ? 'closed'
                  : r.channelStripTab
            }
            options={[LEAVE, ...STUDIO_LESSON_DOCK_TABS, 'closed']}
            onChange={(v) =>
              patch({
                channelStripTab:
                  v === LEAVE
                    ? undefined
                    : v === 'closed'
                      ? null
                      : (v as (typeof STUDIO_LESSON_DOCK_TABS)[number]),
              })
            }
            ariaLabel="Dock tab"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-white/75">
          Sets the library
          <InlineSelect
            value={
              r.libraryOpen === undefined
                ? LEAVE
                : r.libraryOpen
                  ? 'open'
                  : 'closed'
            }
            options={[LEAVE, 'open', 'closed']}
            onChange={(v) =>
              patch({
                libraryOpen: v === LEAVE ? undefined : v === 'open',
              })
            }
            ariaLabel="Library"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-white/75">
          Shows in Mix the rack of
          <InlineSelect
            value={
              !r.mixRack
                ? LEAVE
                : r.mixRack.kind === 'master'
                  ? 'Master'
                  : `Return ${r.mixRack.id}`
            }
            options={[LEAVE, 'Master', 'Return A', 'Return B']}
            onChange={(v) =>
              patch({
                mixRack:
                  v === LEAVE
                    ? undefined
                    : v === 'Master'
                      ? { kind: 'master' }
                      : { kind: 'return', id: v.endsWith('A') ? 'A' : 'B' },
              })
            }
            ariaLabel="Mix rack"
          />
        </div>
        {toggle('effectsLibrary', 'Opens the Add effect window')}
        {toggle('soundsOpen', 'Unfolds the instrument’s sounds')}
        {toggle(
          'clearClipSelection',
          'Clears the clip selection (piano roll on the selected track)',
        )}
        <div className="flex items-center gap-2 text-sm text-white/75">
          Shows the automation of
          <input
            className={`${INPUT} w-32`}
            value={r.automationParam ?? ''}
            onChange={(e) =>
              patch({ automationParam: e.target.value || undefined })
            }
            placeholder="volume"
            aria-label="Automation parameter"
          />
        </div>
      </div>
    </div>
  );
};

// ── Passes when ────────────────────────────────────────────────────────────

const CHECK_OPTIONS = CHECK_CATALOG.map((c) => ({
  value: c.name,
  label: `${c.group} · ${c.label}`,
}));

type Mode = 'next' | 'code' | 'named';

const modeOf = (step: StudioLessonStep): Mode =>
  !step.check ? 'next' : step.check.kind;

const CheckPicker = ({
  step,
  onPatch,
}: {
  step: StudioLessonStep;
  onPatch: Patch;
}) => {
  const mode = modeOf(step);
  // The code check a step had when it opened, to go back to.
  const [codeRef] = useState(
    step.check?.kind === 'code' ? step.check : undefined,
  );
  const named = step.check?.kind === 'named' ? step.check : null;
  const entry = named ? getCheckEntry(named.name) : undefined;

  const choose = (next: Mode) => {
    if (next === 'next') onPatch({ check: undefined });
    else if (next === 'code' && codeRef) onPatch({ check: codeRef });
    else if (next === 'named') {
      const name = CHECK_CATALOG[0].name;
      onPatch({
        check: { kind: 'named', name, params: defaultCheckParams(name) },
      });
    }
  };

  const modes: { mode: Mode; label: string }[] = [
    { mode: 'next', label: 'The student clicks Next' },
    ...(codeRef ? [{ mode: 'code' as const, label: 'Its code check' }] : []),
    { mode: 'named', label: 'A ready-made check' },
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className={CONSOLE_LABEL}>Passes when</span>
      <div
        role="radiogroup"
        aria-label="Passes when"
        className="flex flex-wrap gap-1.5"
      >
        {modes.map((m) => (
          <button
            key={m.mode}
            type="button"
            role="radio"
            aria-checked={mode === m.mode}
            className={consoleTabClass(mode === m.mode, 'sm')}
            onClick={() => choose(m.mode)}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode === 'code' && step.check?.kind === 'code' && (
        <p className="text-sm text-white/60">
          The check the code gives {step.check.lesson} › {step.check.step}: what
          it detects stays as it ships, wherever the step moves.
        </p>
      )}
      {named && (
        <div className="flex flex-col gap-3 rounded-lg border border-white/[0.08] p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <InlineSelect
              value={named.name}
              options={CHECK_OPTIONS}
              onChange={(name) =>
                onPatch({
                  check: {
                    kind: 'named',
                    name: name as typeof named.name,
                    params: defaultCheckParams(name),
                  },
                })
              }
              ariaLabel="Ready-made check"
            />
          </div>
          {entry && <p className="text-xs text-white/50">{entry.passes}</p>}
          {entry && entry.params.length > 0 && (
            <div className="flex flex-wrap items-end gap-4">
              {entry.params.map((spec) => (
                <ParamField
                  key={spec.key}
                  spec={spec}
                  value={named.params[spec.key]}
                  onChange={(value) =>
                    onPatch({
                      check: {
                        ...named,
                        params: { ...named.params, [spec.key]: value },
                      },
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ParamField = ({
  spec,
  value,
  onChange,
}: {
  spec: CheckParamSpec;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
}) => {
  if (spec.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm text-white/75">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        {spec.label}
      </label>
    );
  }
  if (spec.type === 'choice') {
    return (
      <Field label={spec.label}>
        <InlineSelect
          value={String(value ?? spec.default)}
          options={spec.options}
          onChange={onChange}
          ariaLabel={spec.label}
        />
      </Field>
    );
  }
  if (spec.type === 'number') {
    return (
      <Field label={spec.label} className="w-28">
        <input
          type="number"
          className={INPUT}
          value={
            typeof value === 'number' ? value : Number(value ?? spec.default)
          }
          min={spec.min}
          max={spec.max}
          step={spec.step ?? 1}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </Field>
    );
  }
  const listId = `check-${spec.key}-suggestions`;
  return (
    <Field label={spec.label} className="w-48">
      <input
        className={INPUT}
        value={String(value ?? '')}
        list={spec.suggestions ? listId : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {spec.suggestions && (
        <datalist id={listId}>
          {spec.suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </Field>
  );
};

export const AddStepButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 self-start rounded-full border border-dashed border-white/15 px-3 py-1.5 text-sm text-white/60 hover:border-white/30 hover:text-white"
  >
    <Plus className="size-4" /> Add step
  </button>
);
