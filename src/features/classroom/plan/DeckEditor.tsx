/**
 * DeckEditor (Phase 4) — freeform slide-list editor for a Day's interactive
 * deck. Reorder / insert / delete / edit slides of every kind. Interaction-,
 * app-route-, and showcase-slides reference interactions that live in the
 * owning phase cell (authored via InteractionEditor); this picks from them so
 * the two never desync. The publish gate (DayEditor) blocks go-live on any
 * dangling reference.
 */
import { ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PHASES, STUDENT_PHASE_LABELS, type PhaseKey } from '../phases';
import { slideInteractionIds } from '../slides/deck';
import {
  deleteSlideAt,
  insertSlideAt,
  moveSlide,
  newSlide,
  updateSlideAt,
} from '../slides/deckEdit';
import type { Slide, SlideDeck, SlideKind } from '../slides/types';
import type { DayCells, Interaction, LocalizedText } from '../types';

const KIND_LABELS: Record<SlideKind, string> = {
  content: 'Content',
  media: 'Media',
  interaction: 'Question',
  'app-route': 'App route',
  'studio-collab': 'Studio',
  showcase: 'Showcase',
};

const INPUT =
  'w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-sm text-white outline-none focus:border-white/30';

export interface DeckEditorProps {
  deck: SlideDeck | undefined;
  cells: DayCells;
  onChangeSlides: (slides: Slide[]) => void;
  onCreateDeck: () => void;
}

export const DeckEditor = ({
  deck,
  cells,
  onChangeSlides,
  onCreateDeck,
}: DeckEditorProps) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  if (!deck) {
    return (
      <button
        type="button"
        onClick={onCreateDeck}
        className="inline-flex items-center gap-2 rounded-full border border-[#7ecfcf]/40 bg-[#7ecfcf]/[0.06] px-4 py-2 text-sm text-[#7ecfcf] hover:border-[#7ecfcf]/70"
      >
        <Plus className="h-4 w-4" />
        Add interactive slides
      </button>
    );
  }

  const slides = deck.slides;

  // Ids of every interaction that exists in the cells, per phase — the source
  // for interaction pickers + the dangling check.
  const interactionsByPhase = (phase: PhaseKey): Interaction[] =>
    cells[phase]?.presentation.interactions ?? [];
  const allInteractionIds = new Set(
    PHASES.flatMap((p) => interactionsByPhase(p).map((i) => i.id)),
  );

  const patchLocalized = (
    index: number,
    field: 'title' | 'prompt',
    lang: 'en' | 'es',
    value: string,
  ) => {
    const current = (slides[index][field] ?? { en: '' }) as LocalizedText;
    const next: LocalizedText = { ...current, [lang]: value };
    if (lang === 'es' && !value) delete next.es;
    onChangeSlides(updateSlideAt(slides, index, { [field]: next }));
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {slides.map((slide, index) => {
          const isOpen = expanded === slide.id;
          const refs = slideInteractionIds(slide);
          const dangling = refs.filter((id) => !allInteractionIds.has(id));
          return (
            <li
              key={slide.id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02]"
            >
              <div className="flex items-center gap-2 px-2.5 py-2">
                <GripVertical className="h-4 w-4 text-white/25" />
                <span className="text-xs text-white/40">{index + 1}</span>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/60">
                  {KIND_LABELS[slide.kind]}
                </span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">
                  {STUDENT_PHASE_LABELS[slide.phase].en}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-white/80">
                  {slide.title.en || (
                    <em className="text-white/30">Untitled</em>
                  )}
                </span>
                {dangling.length > 0 && (
                  <span
                    title={`Missing interaction: ${dangling.join(', ')}`}
                    className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-200"
                  >
                    missing ref
                  </span>
                )}
                <IconBtn
                  label="Move up"
                  disabled={index === 0}
                  onClick={() => onChangeSlides(moveSlide(slides, index, -1))}
                >
                  ↑
                </IconBtn>
                <IconBtn
                  label="Move down"
                  disabled={index === slides.length - 1}
                  onClick={() => onChangeSlides(moveSlide(slides, index, 1))}
                >
                  ↓
                </IconBtn>
                <IconBtn
                  label="Delete slide"
                  onClick={() => onChangeSlides(deleteSlideAt(slides, index))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn
                  label="Edit slide"
                  onClick={() => setExpanded(isOpen ? null : slide.id)}
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </IconBtn>
              </div>

              {isOpen && (
                <div className="flex flex-col gap-3 border-t border-white/[0.06] px-3 py-3">
                  <Row label="Title">
                    <input
                      className={INPUT}
                      value={slide.title.en}
                      placeholder="English"
                      onChange={(e) =>
                        patchLocalized(index, 'title', 'en', e.target.value)
                      }
                    />
                    <input
                      className={INPUT}
                      value={slide.title.es ?? ''}
                      placeholder="Español"
                      onChange={(e) =>
                        patchLocalized(index, 'title', 'es', e.target.value)
                      }
                    />
                  </Row>
                  <Row label="Prompt">
                    <input
                      className={INPUT}
                      value={slide.prompt?.en ?? ''}
                      placeholder="English (optional)"
                      onChange={(e) =>
                        patchLocalized(index, 'prompt', 'en', e.target.value)
                      }
                    />
                    <input
                      className={INPUT}
                      value={slide.prompt?.es ?? ''}
                      placeholder="Español (optional)"
                      onChange={(e) =>
                        patchLocalized(index, 'prompt', 'es', e.target.value)
                      }
                    />
                  </Row>
                  <Row label="Phase">
                    <select
                      className={INPUT}
                      value={slide.phase}
                      onChange={(e) =>
                        onChangeSlides(
                          updateSlideAt(slides, index, {
                            phase: e.target.value as PhaseKey,
                          }),
                        )
                      }
                    >
                      {PHASES.map((p) => (
                        <option key={p} value={p}>
                          {STUDENT_PHASE_LABELS[p].en}
                        </option>
                      ))}
                    </select>
                  </Row>

                  <KindFields
                    slide={slide}
                    phaseInteractions={interactionsByPhase(slide.phase)}
                    onPatch={(patch) =>
                      onChangeSlides(updateSlideAt(slides, index, patch))
                    }
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <span className="text-xs text-white/50">Add a slide:</span>
          {(Object.keys(KIND_LABELS) as SlideKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                // Inherit the last slide's phase (new slides append at the
                // end) so the deck stays phase-ordered — a new slide must not
                // default to the earliest phase after later-phase slides, or
                // it shows the wrong phase chip/accent on every surface. Fall
                // back to the first phase only for an empty deck.
                const inheritedPhase =
                  slides[slides.length - 1]?.phase ?? 'connectRegulate';
                onChangeSlides(
                  insertSlideAt(
                    slides,
                    newSlide(kind, inheritedPhase),
                    slides.length,
                  ),
                );
                setAdding(false);
              }}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 hover:border-white/25 hover:text-white"
            >
              {KIND_LABELS[kind]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="ml-auto text-xs text-white/40 hover:text-white/70"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:border-white/25 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Add slide
        </button>
      )}
    </div>
  );
};

const KindFields = ({
  slide,
  phaseInteractions,
  onPatch,
}: {
  slide: Slide;
  phaseInteractions: Interaction[];
  onPatch: (patch: Partial<Slide>) => void;
}) => {
  switch (slide.kind) {
    case 'content':
      return (
        <Row label="Variant">
          <select
            className={INPUT}
            value={slide.variant ?? 'plain'}
            onChange={(e) =>
              onPatch({
                variant: e.target.value as 'welcome' | 'section' | 'plain',
              })
            }
          >
            <option value="plain">Plain</option>
            <option value="welcome">Welcome</option>
            <option value="section">Section</option>
          </select>
        </Row>
      );
    case 'media':
      return (
        <Row label="YouTube">
          <input
            className={INPUT}
            value={slide.media.type === 'youtube' ? slide.media.videoId : ''}
            placeholder="Video id"
            onChange={(e) =>
              onPatch({ media: { type: 'youtube', videoId: e.target.value } })
            }
          />
        </Row>
      );
    case 'interaction':
      return (
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-white/40">
            Questions from this phase
          </span>
          <InteractionPicker
            interactions={phaseInteractions}
            selected={slide.interactionIds}
            multi
            onToggle={(id) => {
              const has = slide.interactionIds.includes(id);
              onPatch({
                interactionIds: has
                  ? slide.interactionIds.filter((x) => x !== id)
                  : [...slide.interactionIds, id],
              });
            }}
          />
          <Row label="Reveal">
            <select
              className={INPUT}
              value={slide.reveal ?? ''}
              onChange={(e) =>
                onPatch({
                  reveal: (e.target.value || undefined) as
                    | 'bars'
                    | 'wall'
                    | 'words'
                    | 'scale'
                    | undefined,
                })
              }
            >
              <option value="">Auto</option>
              <option value="bars">Bars</option>
              <option value="wall">Wall</option>
              <option value="words">Word cloud</option>
              <option value="scale">Scale</option>
            </select>
          </Row>
        </div>
      );
    case 'app-route':
    case 'showcase':
      return (
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-white/40">
            {slide.kind === 'app-route' ? 'Atlas activity' : 'Showcase prompt'}
          </span>
          <InteractionPicker
            interactions={phaseInteractions.filter((i) =>
              slide.kind === 'app-route'
                ? i.type === 'atlas'
                : i.type === 'showcase',
            )}
            selected={[slide.interactionId]}
            multi={false}
            onToggle={(id) => onPatch({ interactionId: id })}
          />
        </div>
      );
    case 'studio-collab':
      return (
        <Row label="Grouping">
          <select
            className={INPUT}
            value={slide.grouping}
            onChange={(e) =>
              onPatch({ grouping: e.target.value as 'pairs' | 'solo' })
            }
          >
            <option value="pairs">Pairs</option>
            <option value="solo">Solo</option>
          </select>
        </Row>
      );
  }
};

const InteractionPicker = ({
  interactions,
  selected,
  multi,
  onToggle,
}: {
  interactions: Interaction[];
  selected: string[];
  multi: boolean;
  onToggle: (id: string) => void;
}) => {
  if (interactions.length === 0) {
    return (
      <p className="text-xs text-white/40">
        No matching interactions in this phase — add one in the phase editor
        below, then reference it here.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1">
      {interactions.map((i) => (
        <li key={i.id}>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
            <input
              type={multi ? 'checkbox' : 'radio'}
              checked={selected.includes(i.id)}
              onChange={() => onToggle(i.id)}
              className="h-3.5 w-3.5 accent-[#7ecfcf]"
            />
            <span className="rounded bg-white/[0.06] px-1.5 text-[10px] text-white/50">
              {i.type}
            </span>
            <span className="truncate">{i.question.en || i.id}</span>
          </label>
        </li>
      ))}
    </ul>
  );
};

const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs uppercase tracking-wide text-white/40">
      {label}
    </span>
    <div className="flex flex-col gap-1.5 sm:flex-row">{children}</div>
  </div>
);

const IconBtn = ({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs text-white/50 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
  >
    {children}
  </button>
);
