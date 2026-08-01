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
import { useStartClassroomSession } from '../../live/useStartClassroomSession';
import { PHASE_FULL_NAMES, PHASES } from '../../phases';
import { publishDay } from '../../publish/publishDay';
import { usePublishedDays } from '../../publish/usePublishedDays';
import {
  findDanglingInteractionIds,
  slideInteractionIds,
} from '../../slides/deck';
import {
  deleteSlideAt,
  duplicateSlideAt,
  insertSlideAt,
  moveSlide,
  newSlide,
  setSlideInteractions,
  updateSlideAt,
} from '../../slides/deckEdit';
import { deckFromCells } from '../../slides/deckFromCells';
import type { Slide, SlideKind } from '../../slides/types';
import type {
  AgePreset,
  Cell,
  CellRationale,
  Day,
  Interaction,
  StudentLanguage,
} from '../../types';
import { useLocalPlan } from '../useLocalPlan';
import { AssignPanel } from './AssignPanel';
import { EditorTopBar } from './EditorTopBar';
import { Filmstrip } from './Filmstrip';
import { RationaleSidePanel } from './RationaleSidePanel';
import { SlideCanvas } from './SlideCanvas';
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
  const { publishDayToClassroom } = usePublishedDays(cid);
  const startClassroomSession = useStartClassroomSession();

  const [draft, setDraft] = useState<Day | undefined>(() => {
    const d = dayId ? getDay(dayId) : undefined;
    return d ? withDeck(d) : undefined;
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [language, setLanguage] = useState<StudentLanguage>('en');
  // Age preset is pinned to 'high' (the canvas/present type-scale baseline); the
  // Middle/High/College picker was removed from the editor chrome.
  const agePreset: AgePreset = 'high';
  const [rationaleCollapsed, setRationaleCollapsed] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

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

  const addSlide = useCallback(
    (kind: SlideKind) => {
      const phase = slides[clampedIndex]?.phase ?? PHASES[0];
      updateSlides(
        insertSlideAt(slides, newSlide(kind, phase), clampedIndex + 1),
      );
      setSelectedIndex(clampedIndex + 1);
    },
    [slides, clampedIndex, updateSlides],
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

  const danglingRefs = useMemo(
    () => (draft ? findDanglingInteractionIds(publishDay(draft)) : []),
    [draft],
  );

  const handlePublish = useCallback(async () => {
    if (!draft) return;
    setPublishError(null);
    if (danglingRefs.length > 0) {
      setPublishError(
        `Slides reference missing interactions: ${danglingRefs.join(', ')}`,
      );
      return;
    }
    try {
      await publishDayToClassroom({ classroomId: cid, day: draft });
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Publish failed');
    }
  }, [draft, cid, publishDayToClassroom, danglingRefs]);

  const handleStartSession = useCallback(async () => {
    if (!draft) return;
    setPublishError(null);
    if (danglingRefs.length > 0) {
      setPublishError(
        `Slides reference missing interactions: ${danglingRefs.join(', ')}`,
      );
      return;
    }
    try {
      const pd = await publishDayToClassroom({ classroomId: cid, day: draft });
      const started = await startClassroomSession({
        classroomId: cid,
        publishedDayId: pd.id,
      });
      navigate(
        TeacherRoutes.session({
          classroomId: cid,
          sessionId: started.sessionId,
        }),
      );
    } catch (err) {
      setPublishError(
        err instanceof Error ? err.message : 'Start session failed',
      );
    }
  }, [
    draft,
    cid,
    publishDayToClassroom,
    startClassroomSession,
    navigate,
    danglingRefs,
  ]);

  if (!draft || !selected) return null;

  const snapshot = publishDay(draft);
  const cell = draft.cells[selected.phase];
  const cellInteractions = cell.presentation.interactions ?? [];
  const slideInteractions = slideInteractionIds(selected)
    .map((id) => cellInteractions.find((i) => i.id === id))
    .filter((i): i is Interaction => i !== undefined);

  return (
    <div className="flex w-full flex-col">
      <EditorTopBar
        classroomId={cid}
        dayId={draft.id}
        label={draft.label}
        onLabelChange={updateLabel}
        savedLabel={savedLabel}
        language={language}
        onLanguageChange={setLanguage}
        publishError={publishError}
        assignActive={assignOpen}
        onAssign={() => setAssignOpen((v) => !v)}
        onPublish={handlePublish}
        onStartSession={handleStartSession}
      />

      {assignOpen && (
        <AssignPanel
          classroomId={cid}
          day={draft}
          onClose={() => setAssignOpen(false)}
        />
      )}

      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex h-[58vh] min-h-[420px]">
            <SlideCanvas
              key={selected.id}
              slide={selected}
              language={language}
              agePreset={agePreset}
              onPatch={patchSelected}
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
    </div>
  );
};
