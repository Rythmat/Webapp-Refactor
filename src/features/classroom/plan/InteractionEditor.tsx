import {
  ArrowDown,
  ArrowUp,
  MessageSquare,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Type,
  BarChart3,
  Layout,
} from 'lucide-react';
import { useState } from 'react';
import {
  MODULE_CAPABILITIES,
  type AtlasExpects,
  type AtlasModule,
} from '../msp/capabilities';
import type { Interaction, InteractionType } from '../types';

export const INTERACTION_TYPES: {
  value: InteractionType;
  label: string;
  Icon: typeof MessageSquare;
  description: string;
}[] = [
  {
    value: 'choice',
    label: 'Choice',
    Icon: Layout,
    description: 'One or many correct answers.',
  },
  {
    value: 'text',
    label: 'Text',
    Icon: Type,
    description: 'Short-answer typed response.',
  },
  {
    value: 'number',
    label: 'Number',
    Icon: BarChart3,
    description: 'A numeric answer with optional min/max.',
  },
  {
    value: 'draw',
    label: 'Draw',
    Icon: Pencil,
    description: 'Sketch on blank / staff / keyboard / grid.',
  },
  {
    value: 'check-in',
    label: 'Check-in',
    Icon: Sparkles,
    description: 'Teacher-eyes-only wellness pulse.',
  },
];

const uid = (): string =>
  `ix-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;

export const emptyInteraction = (type: InteractionType): Interaction => {
  const base: Interaction = {
    id: uid(),
    type,
    question: { en: '' },
    // check-in + showcase are teacher-only (never projected).
    shareable: type !== 'check-in' && type !== 'showcase',
  };
  switch (type) {
    case 'choice':
      return {
        ...base,
        choice: { options: [{ en: '' }, { en: '' }], multi: false },
      };
    case 'text':
      return { ...base, text: { maxLen: 200 } };
    case 'number':
      return { ...base, number: {} };
    case 'draw':
      return { ...base, draw: { background: 'blank' } };
    case 'check-in':
      return { ...base, checkIn: { style: 'emoji' } };
    case 'atlas':
      return {
        ...base,
        atlas: { module: 'learn', activityRef: '', expects: 'completion' },
      };
    case 'showcase':
      return base;
  }
};

interface InteractionEditorProps {
  interactions: Interaction[];
  onChange: (next: Interaction[]) => void;
}

/**
 * Teacher-facing interaction list editor for one phase Cell. Add / remove /
 * reorder / edit any of the 5 built-in interaction types. Persistence lives
 * upstream (`DayEditor` autosaves the whole Day).
 */
export const InteractionEditor = ({
  interactions,
  onChange,
}: InteractionEditorProps) => {
  const [openTypePicker, setOpenTypePicker] = useState(false);

  const move = (idx: number, delta: number) => {
    const next = interactions.slice();
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const update = (idx: number, patch: Partial<Interaction>) => {
    const next = interactions.slice();
    next[idx] = { ...next[idx], ...patch };
    if (next[idx].type === 'check-in') {
      next[idx].shareable = false;
    }
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(interactions.filter((_, i) => i !== idx));
  };

  const add = (type: InteractionType) => {
    onChange([...interactions, emptyInteraction(type)]);
    setOpenTypePicker(false);
  };

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/85">
          <MessageSquare className="h-4 w-4" />
          <h4 className="text-sm font-medium">Interactions</h4>
          <span className="text-xs text-white/40">
            {interactions.length === 0
              ? 'none'
              : `${interactions.length} on this phase`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpenTypePicker((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 hover:border-white/25 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </header>

      {openTypePicker && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 md:grid-cols-3">
          {INTERACTION_TYPES.map(({ value, label, Icon, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => add(value)}
              className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-left text-xs text-white/80 hover:border-white/25 hover:bg-white/[0.04] hover:text-white"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
              <span className="text-[11px] text-white/50">{description}</span>
            </button>
          ))}
        </div>
      )}

      {interactions.length === 0 && !openTypePicker && (
        <p className="text-xs text-white/40">
          No interactions on this phase. Click{' '}
          <strong className="text-white/60">Add</strong> to insert a Choice /
          Text / Number / Draw / Check-in prompt.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {interactions.map((interaction, idx) => (
          <li key={interaction.id}>
            <InteractionRow
              interaction={interaction}
              index={idx}
              total={interactions.length}
              onUpdate={(patch) => update(idx, patch)}
              onRemove={() => remove(idx)}
              onMoveUp={() => move(idx, -1)}
              onMoveDown={() => move(idx, 1)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};

// ============================================================
// Row + inline form
// ============================================================

interface InteractionRowProps {
  interaction: Interaction;
  index: number;
  total: number;
  onUpdate: (patch: Partial<Interaction>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const InteractionRow = ({
  interaction,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: InteractionRowProps) => {
  const TypeIcon = INTERACTION_TYPES.find(
    (t) => t.value === interaction.type,
  )?.Icon;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <header className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/80">
          {TypeIcon && <TypeIcon className="h-3 w-3" />}
          {interaction.type}
        </span>
        <span className="text-xs text-white/40">#{index + 1}</span>
        <div className="ml-auto flex items-center gap-1">
          <IconBtn
            aria-label="Move up"
            onClick={onMoveUp}
            disabled={index === 0}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn
            aria-label="Move down"
            onClick={onMoveDown}
            disabled={index === total - 1}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn aria-label="Delete interaction" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </header>

      <QuestionField interaction={interaction} onUpdate={onUpdate} />
      <TypeSpecificFields interaction={interaction} onUpdate={onUpdate} />

      {interaction.type !== 'check-in' && (
        <label className="mt-1 flex items-center gap-2 text-xs text-white/60">
          <input
            type="checkbox"
            checked={interaction.shareable}
            onChange={(e) => onUpdate({ shareable: e.target.checked })}
            className="accent-white"
          />
          Shareable — allow this on the anonymous share overlay
        </label>
      )}
      {interaction.type === 'check-in' && (
        <p className="text-[11px] text-white/40">
          Check-in responses are teacher-eyes-only. Cannot be shared.
        </p>
      )}
    </div>
  );
};

const IconBtn = ({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    className="flex h-6 w-6 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
    {...props}
  >
    {children}
  </button>
);

const QuestionField = ({
  interaction,
  onUpdate,
}: {
  interaction: Interaction;
  onUpdate: (patch: Partial<Interaction>) => void;
}) => (
  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
    <TinyField
      label="Question (EN)"
      value={interaction.question.en}
      placeholder="What do students see?"
      onChange={(v) =>
        onUpdate({ question: { ...interaction.question, en: v } })
      }
    />
    <TinyField
      label="Question (ES)"
      value={interaction.question.es ?? ''}
      placeholder="Traducción (opcional)"
      onChange={(v) => {
        const next = { ...interaction.question };
        if (v) next.es = v;
        else delete next.es;
        onUpdate({ question: next });
      }}
    />
  </div>
);

const TypeSpecificFields = ({
  interaction,
  onUpdate,
}: {
  interaction: Interaction;
  onUpdate: (patch: Partial<Interaction>) => void;
}) => {
  switch (interaction.type) {
    case 'choice':
      return <ChoiceFields interaction={interaction} onUpdate={onUpdate} />;
    case 'text':
      return (
        <TinyNumberField
          label="Max characters"
          value={interaction.text?.maxLen ?? 200}
          onChange={(v) => onUpdate({ text: { maxLen: v ?? 200 } })}
        />
      );
    case 'number':
      return (
        <div className="grid grid-cols-2 gap-2">
          <TinyNumberField
            label="Min (optional)"
            value={interaction.number?.min}
            onChange={(v) =>
              onUpdate({
                number: { ...interaction.number, min: v ?? undefined },
              })
            }
          />
          <TinyNumberField
            label="Max (optional)"
            value={interaction.number?.max}
            onChange={(v) =>
              onUpdate({
                number: { ...interaction.number, max: v ?? undefined },
              })
            }
          />
        </div>
      );
    case 'draw':
      return (
        <TinySelectField
          label="Background"
          value={interaction.draw?.background ?? 'blank'}
          options={['blank', 'staff', 'keyboard', 'grid']}
          onChange={(v) =>
            onUpdate({
              draw: {
                background: v as 'blank' | 'staff' | 'keyboard' | 'grid',
              },
            })
          }
        />
      );
    case 'check-in':
      return (
        <TinySelectField
          label="Style"
          value={interaction.checkIn?.style ?? 'emoji'}
          options={['emoji', 'scale', 'word']}
          onChange={(v) =>
            onUpdate({
              checkIn: { style: v as 'emoji' | 'scale' | 'word' },
            })
          }
        />
      );
    case 'atlas': {
      const module: AtlasModule = interaction.atlas?.module ?? 'learn';
      const capability = MODULE_CAPABILITIES[module];
      const allowedExpects: readonly AtlasExpects[] = capability.expects;
      const currentExpects = interaction.atlas?.expects ?? 'completion';
      const expectsInScope: AtlasExpects = allowedExpects.includes(
        currentExpects,
      )
        ? currentExpects
        : allowedExpects[0];
      return (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <TinySelectField
              label="Module"
              value={module}
              options={['learn', 'studio', 'globe', 'arcade']}
              onChange={(v) => {
                const nextModule = v as AtlasModule;
                const nextAllowed: readonly AtlasExpects[] =
                  MODULE_CAPABILITIES[nextModule].expects;
                const nextExpects: AtlasExpects = nextAllowed.includes(
                  currentExpects,
                )
                  ? currentExpects
                  : nextAllowed[0];
                onUpdate({
                  atlas: {
                    module: nextModule,
                    activityRef: interaction.atlas?.activityRef ?? '',
                    expects: nextExpects,
                  },
                });
              }}
            />
            <TinyField
              label="Activity ref"
              value={interaction.atlas?.activityRef ?? ''}
              onChange={(v) =>
                onUpdate({
                  atlas: {
                    module,
                    activityRef: v,
                    expects: expectsInScope,
                  },
                })
              }
            />
            <TinySelectField
              label="Expects"
              value={expectsInScope}
              options={[...allowedExpects]}
              onChange={(v) =>
                onUpdate({
                  atlas: {
                    module,
                    activityRef: interaction.atlas?.activityRef ?? '',
                    expects: v as AtlasExpects,
                  },
                })
              }
            />
          </div>
          {!capability.embeddable && (
            <p className="text-[10px] text-white/40">
              Launches in a new tab — flow-back via /msp/response.
            </p>
          )}
        </div>
      );
    }
  }
};

const ChoiceFields = ({
  interaction,
  onUpdate,
}: {
  interaction: Interaction;
  onUpdate: (patch: Partial<Interaction>) => void;
}) => {
  const choice = interaction.choice ?? { options: [], multi: false };
  const setOption = (i: number, en: string) => {
    const next = choice.options.slice();
    next[i] = { ...next[i], en };
    onUpdate({ choice: { ...choice, options: next } });
  };
  const addOption = () => {
    onUpdate({
      choice: { ...choice, options: [...choice.options, { en: '' }] },
    });
  };
  const removeOption = (i: number) => {
    if (choice.options.length <= 2) return;
    onUpdate({
      choice: { ...choice, options: choice.options.filter((_, j) => j !== i) },
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs uppercase tracking-wide text-white/40">
        Options
      </label>
      <ul className="flex flex-col gap-1.5">
        {choice.options.map((option, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={option.en}
              placeholder={`Option ${i + 1}`}
              onChange={(e) => setOption(i, e.target.value)}
              className="flex-1 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => removeOption(i)}
              disabled={choice.options.length <= 2}
              aria-label={`Remove option ${i + 1}`}
              className="flex h-6 w-6 items-center justify-center rounded-md text-white/40 hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={addOption}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/70 hover:border-white/25 hover:text-white"
        >
          <Plus className="h-3 w-3" />
          Add option
        </button>
        <label className="ml-auto flex items-center gap-2 text-xs text-white/60">
          <input
            type="checkbox"
            checked={choice.multi}
            onChange={(e) =>
              onUpdate({ choice: { ...choice, multi: e.target.checked } })
            }
            className="accent-white"
          />
          Multi-select
        </label>
      </div>
    </div>
  );
};

// ============================================================
// Tiny reusable field primitives
// ============================================================

const TinyField = ({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs uppercase tracking-wide text-white/40">
      {label}
    </span>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
    />
  </label>
);

const TinyNumberField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | null) => void;
}) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs uppercase tracking-wide text-white/40">
      {label}
    </span>
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) =>
        onChange(e.target.value === '' ? null : Number(e.target.value))
      }
      className="w-full rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-xs text-white focus:border-white/25 focus:outline-none"
    />
  </label>
);

const TinySelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs uppercase tracking-wide text-white/40">
      {label}
    </span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-white/10 bg-[#1a1a1c] px-2 py-1 text-xs text-white focus:border-white/25 focus:outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);
