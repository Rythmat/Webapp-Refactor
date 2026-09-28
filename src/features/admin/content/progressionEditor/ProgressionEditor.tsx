import { Plus, Trash2 } from 'lucide-react';
import { type FC } from 'react';
import { GENRES } from '@/content/graph/genres';
import type { StructuredEditorProps } from '../editorTypes';

/**
 * A chord progression, as the back office edits it.
 *
 * Replaces the spreadsheets the library was seeded from ("Every Chord
 * Progression — 1 maj7.csv" and its siblings, 700 rows). Those were the seed;
 * this is the authoring surface, so a progression can be added, corrected and
 * connected without anyone opening a sheet again.
 *
 * Chords are written in the hybrid system the rest of the app uses — degree
 * then a three-letter quality: `1 maj7`, `5 dom7`, `6 min7`, `♭7 maj`. The
 * sheets used long-form names ('1 major7'), so an importer normalises on the
 * way in and this editor only ever shows the hybrid form.
 *
 * Vibes and styles are checkboxes over fixed vocabularies rather than free
 * text, because both are facets people will filter the Globe by: a typo makes
 * a progression invisible rather than wrong, which is harder to notice.
 */

/** The 16 the curriculum declares. The seed sheets used the first eight. */
const VIBES = [
  'cool',
  'sexy',
  'intriguing',
  'dark',
  'emotional',
  'sophisticated',
  'fun',
  'happy',
  'melancholic',
  'aggressive',
  'dreamy',
  'hypnotic',
  'triumphant',
  'spiritual',
  'rebellious',
  'romantic',
] as const;

interface ProgressionBody {
  id?: string;
  chords?: string[];
  vibes?: string[];
  styles?: string[];
  /** Songs that use it, by song id — the edge into the song graph. */
  songIds?: string[];
  notes?: string;
}

const inputClass =
  'min-w-0 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white/85 focus:border-white/30 focus:outline-none';

const Label: FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[11px] uppercase tracking-wide text-white/35">
    {children}
  </span>
);

/** A checkbox over a fixed vocabulary. */
const TagToggle: FC<{
  value: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}> = ({ value, checked, onToggle }) => (
  <label
    className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors ${
      checked
        ? 'border-[#7ecfcf] text-[#7ecfcf]'
        : 'border-white/12 text-white/45 hover:border-white/30 hover:text-white/70'
    }`}
  >
    <input
      type="checkbox"
      className="sr-only"
      checked={checked}
      onChange={(e) => onToggle(e.target.checked)}
    />
    {value}
  </label>
);

export const ProgressionEditor = ({
  body,
  onChange,
}: StructuredEditorProps) => {
  const prog = body as ProgressionBody;
  const chords = prog.chords ?? [];
  const vibes = prog.vibes ?? [];
  const styles = prog.styles ?? [];
  const songIds = prog.songIds ?? [];

  const patch = (p: Partial<ProgressionBody>) =>
    onChange({ ...(body as Record<string, unknown>), ...p });

  const toggle = (list: string[], value: string, on: boolean) =>
    on ? [...list, value] : list.filter((v) => v !== value);

  return (
    <section className="flex flex-col gap-5 p-6">
      {/* ── The progression itself ── */}
      <div className="flex flex-col gap-2">
        <Label>Chords</Label>
        <div className="flex flex-wrap items-center gap-2">
          {chords.map((chord, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-xs text-white/25">{i + 1}</span>
              <input
                value={chord}
                onChange={(e) =>
                  patch({
                    chords: chords.map((c, n) =>
                      n === i ? e.target.value : c,
                    ),
                  })
                }
                placeholder="1 maj7"
                className={`${inputClass} w-28`}
              />
              <button
                type="button"
                aria-label={`Remove chord ${i + 1}`}
                title={`Remove chord ${i + 1}`}
                onClick={() =>
                  patch({ chords: chords.filter((_, n) => n !== i) })
                }
                className="rounded p-1 text-white/25 hover:bg-white/5 hover:text-white/70"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => patch({ chords: [...chords, ''] })}
            className="flex items-center gap-1 rounded border border-dashed border-white/15 px-2 py-1 text-xs text-white/45 hover:border-white/35 hover:text-white/75"
          >
            <Plus size={12} /> Add chord
          </button>
        </div>
        <p className="text-xs text-white/30">
          Hybrid degrees, three-letter qualities — <code>1 maj7</code>,{' '}
          <code>5 dom7</code>, <code>♭7 maj</code>. Never a bare{' '}
          <code>1 7</code>.
        </p>
      </div>

      {/* ── How it feels ── */}
      <div className="flex flex-col gap-2">
        <Label>Vibe</Label>
        <div className="flex flex-wrap gap-1.5">
          {VIBES.map((v) => (
            <TagToggle
              key={v}
              value={v}
              checked={vibes.includes(v)}
              onToggle={(on) => patch({ vibes: toggle(vibes, v, on) })}
            />
          ))}
        </div>
      </div>

      {/* ── Where it lives ── */}
      <div className="flex flex-col gap-2">
        <Label>Style</Label>
        <div className="flex flex-wrap gap-1.5">
          {GENRES.filter((g) => g.taught).map((g) => (
            <TagToggle
              key={g.id}
              value={g.name}
              checked={styles.includes(g.id)}
              onToggle={(on) => patch({ styles: toggle(styles, g.id, on) })}
            />
          ))}
        </div>
      </div>

      {/* ── Songs that use it ── */}
      <div className="flex flex-col gap-2">
        <Label>Heard in</Label>
        {songIds.map((id, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={id}
              onChange={(e) =>
                patch({
                  songIds: songIds.map((s, n) =>
                    n === i ? e.target.value : s,
                  ),
                })
              }
              placeholder="song id, e.g. aint_no_mountain_high_enough"
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              aria-label="Remove song"
              title="Remove song"
              onClick={() =>
                patch({ songIds: songIds.filter((_, n) => n !== i) })
              }
              className="rounded p-1 text-white/25 hover:bg-white/5 hover:text-white/70"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => patch({ songIds: [...songIds, ''] })}
          className="flex items-center gap-1 self-start rounded border border-dashed border-white/15 px-2 py-1 text-xs text-white/45 hover:border-white/35 hover:text-white/75"
        >
          <Plus size={12} /> Add a song
        </button>
        <p className="text-xs text-white/30">
          A song id, not a title — this is the edge the Globe walks from a
          progression to the records that use it.
        </p>
      </div>

      {/* ── Anything worth saying ── */}
      <div className="flex flex-col gap-2">
        <Label>Notes</Label>
        <textarea
          value={prog.notes ?? ''}
          onChange={(e) => patch({ notes: e.target.value })}
          rows={2}
          placeholder="Why this one matters, where it comes from, what to listen for."
          className={`${inputClass} resize-y`}
        />
      </div>
    </section>
  );
};
