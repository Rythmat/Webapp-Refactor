/**
 * SlideDeckEditor — the WYSIWYG slide editor that replaces the old form-based
 * DayEditor. The lesson is authored as a slide DECK (`day.deck.slides`, the
 * single source of truth) rendered through the same `SlidePresentBody` used
 * when Presenting, so "what you edit is what you present."
 *
 * Edit routing: slide content → the deck; interactions → the phase cell + the
 * slide's ids (via setSlideInteractions, one transaction, no dangling refs);
 * rationale / activity provenance → the phase cell's rationale (off-slide, so
 * the firewall is preserved). Autosave + publish/session gating are lifted
 * verbatim from DayEditor.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { insertActivityIntoCell } from '../../content/applySeed';
import type { Activity } from '../../content/types';
import { PHASE_FULL_NAMES, PHASES } from '../../phases';
import { publishDay } from '../../publish/publishDay';
import { slideInteractionIds } from '../../slides/deck';
import {
  deleteSlideAt,
  duplicateSlideAt,
  insertSlideAt,
  moveSlide,
  newSlide,
  setSlideInteractions,
  updateSlideAt,
} from '../../slides/deckEdit';
import {
  deckFromCells,
  revealForInteraction,
} from '../../slides/deckFromCells';
import {
  SLIDE_TEMPLATES,
  buildTemplateSlide,
  type SlideTemplateId,
} from '../../slides/templates/slideTemplates';
import type { Slide, SlideBlockKey } from '../../slides/types';
import type {
  AgePreset,
  Cell,
  CellRationale,
  Day,
  Interaction,
  InteractionType,
  StudentLanguage,
} from '../../types';
import { emptyInteraction } from '../InteractionEditor';
import { useLocalPlan } from '../useLocalPlan';
import { ChooseContentButton } from './ChooseContentButton';
import { EditorTopBar } from './EditorTopBar';
import { Filmstrip } from './Filmstrip';
import { RationaleSidePanel } from './RationaleSidePanel';
import { SlideCanvas } from './SlideCanvas';
import { TextFormatMenu } from './TextFormatMenu';
import { ContentPickerDialog } from './contentPicker/ContentPickerDialog';
import type { PickedTile, SlideMediaEmbed } from './contentPicker/catalog';
import '../../presentation.css';

const AUTOSAVE_DEBOUNCE_MS = 500;

/** Load a Day, backfilling a deck from its cells when it has none. */
const withDeck = (day: Day): Day =>
  day.deck && day.deck.slides.length > 0
    ? day
    : { ...day, deck: deckFromCells(day) };

export const SlideDeckEditor = () => {
  const { classroomId, dayId } = useParams<{
    classroomId: string;
    dayId: string;
  }>();
  const navigate = useNavigate();
  const { getDay, saveDay } = useLocalPlan();
  const cid = classroomId ?? '';

  const [draft, setDraft] = useState<Day | undefined>(() => {
    const d = dayId ? getDay(dayId) : undefined;
    return d ? withDeck(d) : undefined;
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState<SlideBlockKey | null>(
    null,
  );
  const [language, setLanguage] = useState<StudentLanguage>('en');
  // Age preset is pinned to 'high' (the canvas/present type-scale baseline); the
  // Middle/High/College picker was removed from the editor chrome.
  const agePreset: AgePreset = 'high';
  const [rationaleCollapsed, setRationaleCollapsed] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // The Add-slide template awaiting a content pick (opens a scoped picker).
  const [pendingTemplate, setPendingTemplate] =
    useState<SlideTemplateId | null>(null);

  // Bounce back to the plan list if the dayId isn't in the plan.
  useEffect(() => {
    if (dayId && getDay(dayId) === undefined) {
      navigate(TeacherRoutes.plan({ classroomId: cid }));
    }
  }, [dayId, getDay, navigate, cid]);

  // Autosave the draft (debounced) — persists the backfilled deck too.
  useEffect(() => {
    if (!draft) return;
    const handle = setTimeout(() => {
      saveDay(draft);
      setSavedAt(Date.now());
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [draft, saveDay]);

  const slides = draft?.deck?.slides ?? [];
  const clampedIndex = Math.min(selectedIndex, Math.max(0, slides.length - 1));
  const selected: Slide | undefined = slides[clampedIndex];

  // Selection is lifted here so the toolbar's text-format tool can target it;
  // clear it when the active slide changes (the SlideCanvas key-remount used to
  // reset this when the state lived inside the canvas).
  useEffect(() => {
    setSelectedBlock(null);
  }, [clampedIndex]);

  const updateSlides = useCallback((next: Slide[]) => {
    setDraft((prev) =>
      prev?.deck ? { ...prev, deck: { ...prev.deck, slides: next } } : prev,
    );
  }, []);

  const patchSelected = useCallback(
    (patch: Partial<Slide>) => {
      setDraft((prev) =>
        prev?.deck
          ? {
              ...prev,
              deck: {
                ...prev.deck,
                slides: updateSlideAt(prev.deck.slides, clampedIndex, patch),
              },
            }
          : prev,
      );
    },
    [clampedIndex],
  );

  // Add-slide opens the template's content picker; the slide is seeded on pick.
  const addSlide = useCallback((templateId: SlideTemplateId) => {
    setPendingTemplate(templateId);
  }, []);

  // Seed a template slide from the picked content and insert it after the
  // current slide (inheriting its phase). Cancelling the picker inserts nothing.
  const seedFromTemplate = useCallback(
    (tile: PickedTile, embed?: SlideMediaEmbed) => {
      if (!pendingTemplate) return;
      const phase = slides[clampedIndex]?.phase ?? PHASES[0];
      const slide = buildTemplateSlide(pendingTemplate, phase, { tile, embed });
      updateSlides(insertSlideAt(slides, slide, clampedIndex + 1));
      setSelectedIndex(clampedIndex + 1);
      setPendingTemplate(null);
    },
    [pendingTemplate, slides, clampedIndex, updateSlides],
  );

  // Adding a student-response component inserts a NEW question slide (interaction
  // kind) after the current one, seeded with an empty interaction of that type;
  // the teacher fills in the question/options in the side-panel editor, and
  // students answer it live. Content slides can't hold interactions, so this is
  // a dedicated slide (one transaction: insert slide + write the interaction).
  const insertResponseSlide = useCallback(
    (type: InteractionType) => {
      const phase = slides[clampedIndex]?.phase ?? PHASES[0];
      const interaction = emptyInteraction(type);
      const reveal = revealForInteraction(interaction);
      const base = newSlide('interaction', phase);
      const slide = reveal ? ({ ...base, reveal } as typeof base) : base;
      setDraft((prev) => {
        if (!prev?.deck) return prev;
        const nextSlides = insertSlideAt(
          prev.deck.slides,
          slide,
          clampedIndex + 1,
        );
        const withSlide = {
          ...prev,
          deck: { ...prev.deck, slides: nextSlides },
        };
        return setSlideInteractions(withSlide, slide.id, [interaction]);
      });
      setSelectedIndex(clampedIndex + 1);
    },
    [slides, clampedIndex],
  );

  const duplicateSlide = useCallback((index: number) => {
    setDraft((prev) => (prev ? duplicateSlideAt(prev, index) : prev));
    setSelectedIndex(index + 1);
  }, []);

  const deleteSlide = useCallback(
    (index: number) => {
      if (slides.length <= 1) return;
      updateSlides(deleteSlideAt(slides, index));
      setSelectedIndex((cur) => {
        const shifted = cur > index ? cur - 1 : cur;
        return Math.max(0, Math.min(shifted, slides.length - 2));
      });
    },
    [slides, updateSlides],
  );

  const moveSlideBy = useCallback(
    (index: number, delta: number) => {
      const next = moveSlide(slides, index, delta);
      if (next === slides) return;
      updateSlides(next);
      setSelectedIndex((cur) =>
        cur === index ? index + delta : cur === index + delta ? index : cur,
      );
    },
    [slides, updateSlides],
  );

  const sortByPhase = useCallback(() => {
    const selId = slides[clampedIndex]?.id;
    const sorted = [...slides].sort(
      (a, b) => PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase),
    );
    updateSlides(sorted);
    setSelectedIndex(
      Math.max(
        0,
        sorted.findIndex((s) => s.id === selId),
      ),
    );
  }, [slides, clampedIndex, updateSlides]);

  const setSelectedInteractions = useCallback(
    (interactions: Interaction[]) => {
      if (!selected) return;
      setDraft((prev) =>
        prev ? setSlideInteractions(prev, selected.id, interactions) : prev,
      );
    },
    [selected],
  );

  const updateRationale = useCallback(
    (phaseKey: Slide['phase'], rationale: CellRationale) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const cell = prev.cells[phaseKey];
        const nextCell: Cell = { ...cell, rationale };
        return { ...prev, cells: { ...prev.cells, [phaseKey]: nextCell } };
      });
    },
    [],
  );

  const insertActivity = useCallback(
    (phaseKey: Slide['phase'], activity: Activity) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const nextCell = insertActivityIntoCell(activity, prev.cells[phaseKey]);
        return { ...prev, cells: { ...prev.cells, [phaseKey]: nextCell } };
      });
    },
    [],
  );

  const updateLabel = useCallback((label: string) => {
    setDraft((prev) => (prev ? { ...prev, label } : prev));
  }, []);

  const savedLabel = useMemo(() => {
    if (savedAt === null) return null;
    const secondsAgo = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
    return secondsAgo < 5 ? 'Saved' : 'Saved a moment ago';
  }, [savedAt]);

  if (!draft || !selected) return null;

  const snapshot = publishDay(draft);
  const cell = draft.cells[selected.phase];
  const cellInteractions = cell.presentation.interactions ?? [];
  const slideInteractions = slideInteractionIds(selected)
    .map((id) => cellInteractions.find((i) => i.id === id))
    .filter((i): i is Interaction => i !== undefined);

  // The text-format tool only targets text blocks (title / prompt / body).
  const textBlock: SlideBlockKey | null =
    selectedBlock === 'title' ||
    selectedBlock === 'prompt' ||
    selectedBlock === 'body'
      ? selectedBlock
      : null;

  // The "+ Choose content" pill shows on EVERY slide's toolbar. Launch tiles
  // only render on content slides, so non-content slides start from an empty
  // set (the pill stays available but its tiles are a content-slide feature).
  const contentTiles =
    selected.kind === 'content' ? (selected.launchTiles ?? []) : [];

  return (
    <div className="flex w-full flex-col">
      <EditorTopBar
        classroomId={cid}
        label={draft.label}
        onLabelChange={updateLabel}
        savedLabel={savedLabel}
        language={language}
        onLanguageChange={setLanguage}
        chooseContent={
          <ChooseContentButton
            tiles={contentTiles}
            onChange={(tiles) =>
              patchSelected({
                launchTiles: tiles.length ? tiles : undefined,
              })
            }
            onEmbedMedia={(embed) => patchSelected(embed)}
            onAddResponse={insertResponseSlide}
          />
        }
        textTool={
          <TextFormatMenu
            blockKey={textBlock}
            style={textBlock ? selected.textStyle?.[textBlock] : undefined}
            onChange={(next) => {
              if (textBlock) {
                patchSelected({
                  textStyle: { ...selected.textStyle, [textBlock]: next },
                });
              }
            }}
          />
        }
      />

      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex h-[58vh] min-h-[420px]">
            <SlideCanvas
              key={selected.id}
              slide={selected}
              language={language}
              agePreset={agePreset}
              onPatch={patchSelected}
              selectedBlock={selectedBlock}
              onSelectBlock={setSelectedBlock}
              interactions={slideInteractions}
            />
          </div>
          <Filmstrip
            slides={slides}
            selectedIndex={clampedIndex}
            snapshot={snapshot}
            onSelect={setSelectedIndex}
            onAdd={addSlide}
            onDuplicate={duplicateSlide}
            onDelete={deleteSlide}
            onMove={moveSlideBy}
            onSortByPhase={sortByPhase}
          />
        </div>

        <RationaleSidePanel
          slide={selected}
          phaseFullName={PHASE_FULL_NAMES[selected.phase]}
          rationale={cell.rationale}
          onRationaleChange={(r) => updateRationale(selected.phase, r)}
          slideInteractions={slideInteractions}
          onInteractionsChange={setSelectedInteractions}
          onInsertActivity={(a) => insertActivity(selected.phase, a)}
          activityAddedIds={cell.rationale.activityRefs ?? []}
          collapsed={rationaleCollapsed}
          onToggleCollapsed={() => setRationaleCollapsed((v) => !v)}
        />
      </div>

      {/* Add-slide template flow: a content picker scoped to the template's one
          domain; on pick, the seeded slide is inserted. */}
      {pendingTemplate &&
        (() => {
          const domain = SLIDE_TEMPLATES.find(
            (t) => t.id === pendingTemplate,
          )?.pickerDomain;
          return domain ? (
            <ContentPickerDialog
              open
              domains={[domain]}
              onSelect={seedFromTemplate}
              onOpenChange={(o) => {
                if (!o) setPendingTemplate(null);
              }}
            />
          ) : null;
        })()}
    </div>
  );
};
