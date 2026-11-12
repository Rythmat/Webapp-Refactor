/**
 * SlideDeckEditor — the WYSIWYG slide editor that replaces the old form-based
 * DayEditor. The lesson is authored as a slide DECK (`day.deck.slides`, the
 * single source of truth) rendered through the same `SlideStage` used
 * when Presenting, so "what you edit is what you present."
 *
 * Edit routing: slide content → the deck; interactions → the phase cell + the
 * slide's ids (via setSlideInteractions, one transaction, no dangling refs);
 * rationale / activity provenance → the phase cell's rationale (off-slide, so
 * the firewall is preserved). Autosave + publish/session gating are lifted
 * verbatim from DayEditor.
 */
import { Check, Play, Plus, Radio } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { OFFICE_LESSONS_SCOPE } from '@/constants/officeScopes';
import { OfficeRoutes, TeacherRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import {
  OfficeRailSlot,
  OfficeTopActions,
} from '@/features/office/frame/railSlot';
import { useCanEditClassroom } from '@/hooks/data';
import { insertActivityIntoCell } from '../../content/applySeed';
import type { Activity } from '../../content/types';
import { useGoLive } from '../../live/useGoLive';
import { publishDay } from '../../publish/publishDay';
import { useTeacherConfig } from '../../settings/useTeacherConfig';
import { CORTEX_LESSON_TEMPLATE_ID } from '../../slides/cortex/buildDeck';
import { COPY, RESET_CHECKLIST } from '../../slides/cortex/copy';
import type { CortexLessonPlan, GroupRole } from '../../slides/cortex/types';
import { slideInteractionIds } from '../../slides/deck';
import {
  deleteSlideAt,
  duplicateSlideAt,
  insertSlideAt,
  moveSlide,
  moveSlideToSection,
  newSlide,
  setSlideInteractions,
  updateSlideAt,
} from '../../slides/deckEdit';
import {
  deckFromCells,
  revealForInteraction,
} from '../../slides/deckFromCells';
import { groupActivityOf } from '../../slides/focus/lessonFocus';
import {
  applyGroupPick,
  applyShowcasePick,
  isShowcasePortrait,
  isSubjectSlide,
} from '../../slides/focus/lessonPicks';
import {
  SECTION_PHASE,
  phaseSectionsLabel,
  sectionInsertIndex,
  sectionOf,
  sortSlidesBySection,
  type SlideSection,
} from '../../slides/sections';
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
import { EditorTopBar } from './EditorTopBar';
import { Filmstrip } from './Filmstrip';
import { GroupFocusBanner, type GroupMatch } from './GroupFocusBanner';
import { RationaleSidePanel } from './RationaleSidePanel';
import { SlideCanvas } from './SlideCanvas';
import { TextFormatMenu } from './TextFormatMenu';
import { ContentPickerDialog } from './contentPicker/ContentPickerDialog';
import type { PickedTile, SlideMediaEmbed } from './contentPicker/catalog';
import { LessonContentPicker } from './lessonPicker/LessonContentPicker';
import type { SectionAddOption } from './sectionMenu';
import '../../presentation.css';

const AUTOSAVE_DEBOUNCE_MS = 500;

/** Load a Day, backfilling a deck from its cells when it has none. */
const withDeck = (day: Day): Day =>
  day.deck && day.deck.slides.length > 0
    ? day
    : { ...day, deck: deckFromCells(day) };

/** A launch tile's id: unique within the slide. */
const tileUid = (): string =>
  `lt-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;

export const SlideDeckEditor = () => {
  const { classroomId, dayId } = useParams<{
    classroomId: string;
    dayId: string;
  }>();
  const navigate = useNavigate();
  const cid = classroomId ?? '';
  const { getDay, saveDay } = useLocalPlan(cid);
  const goLive = useGoLive(cid);
  // A lesson from the Office's Lessons tab belongs to no class: it goes live
  // once it's taught to one.
  const ownLesson = cid === OFFICE_LESSONS_SCOPE;
  // Viewers may READ a deck but never write one. Gating the save path rather
  // than each control means a new button cannot silently become writable.
  const canEdit = useCanEditClassroom(cid);

  const [draft, setDraft] = useState<Day | undefined>(() => {
    const d = dayId ? getDay(dayId) : undefined;
    return d ? withDeck(d) : undefined;
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState<SlideBlockKey | null>(
    null,
  );
  const [language, setLanguage] = useState<StudentLanguage>('en');
  // Per-section age preset. This used to be hard-coded 'high' while
  // `agePresetDefault` sat in settings with ZERO readers — a picker teachers
  // could set that changed nothing. It now resolves per classroom.
  const { config: teacherConfig } = useTeacherConfig(cid);
  const agePreset: AgePreset = teacherConfig.agePresetDefault;
  const [rationaleCollapsed, setRationaleCollapsed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // The Add-slide template awaiting a content pick (opens a scoped picker),
  // and the section the new slide goes into.
  const [pendingTemplate, setPendingTemplate] = useState<{
    templateId: SlideTemplateId;
    section: SlideSection;
  } | null>(null);

  // Bounce back to the plan list if the dayId isn't in the plan.
  useEffect(() => {
    if (dayId && getDay(dayId) === undefined) {
      navigate(
        ownLesson
          ? OfficeRoutes.lessons()
          : TeacherRoutes.plan({ classroomId: cid }),
      );
    }
  }, [dayId, getDay, navigate, cid, ownLesson]);

  // Autosave the draft (debounced) — persists the backfilled deck too.
  useEffect(() => {
    if (!draft) return;
    const handle = setTimeout(() => {
      if (canEdit) saveDay(draft);
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

  /**
   * Put a new slide at the end of its section (and its interactions in that
   * section's phase cell, in the same transaction), then select it.
   */
  const insertIntoSection = useCallback(
    (slide: Slide, interactions: Interaction[] = []) => {
      const index = sectionInsertIndex(slides, sectionOf(slide));
      setDraft((prev) => {
        if (!prev?.deck) return prev;
        const withSlide = {
          ...prev,
          deck: {
            ...prev.deck,
            slides: insertSlideAt(
              prev.deck.slides,
              slide,
              sectionInsertIndex(prev.deck.slides, sectionOf(slide)),
            ),
          },
        };
        return interactions.length
          ? setSlideInteractions(withSlide, slide.id, interactions)
          : withSlide;
      });
      setSelectedIndex(index);
    },
    [slides],
  );

  // A section's "Add" menu: what that section is for.
  const addToSection = useCallback(
    (section: SlideSection, option: SectionAddOption) => {
      const phase = SECTION_PHASE[section];
      const stamp = <T extends Slide>(slide: T): T => ({ ...slide, section });
      switch (option.kind) {
        case 'template':
          setPendingTemplate({ templateId: option.templateId, section });
          return;
        case 'lesson': {
          // Onto the section's first slide, or a new one, then the picker.
          const at = slides.findIndex((s) => sectionOf(s) === section);
          if (at >= 0) setSelectedIndex(at);
          else insertIntoSection(stamp(newSlide('content', phase)));
          setPickerOpen(true);
          return;
        }
        case 'blank':
          insertIntoSection(stamp(newSlide('content', phase)));
          return;
        case 'reset':
          insertIntoSection(
            stamp({
              ...newSlide('content', phase),
              title: COPY.resetTitle,
              resetChecklist: [...RESET_CHECKLIST],
            } as Slide),
          );
          return;
        case 'studio':
          insertIntoSection(
            stamp({
              ...newSlide('studio-collab', phase),
              grouping: option.grouping,
              presetId: 'personal-project-time',
              title:
                option.grouping === 'pairs'
                  ? { en: 'Studio in pairs', es: 'Studio en parejas' }
                  : COPY.projectTitle,
            } as Slide),
          );
          return;
        case 'share': {
          const offer: Interaction = {
            ...emptyInteraction('showcase'),
            question: COPY.shareQuestion,
          };
          insertIntoSection(
            stamp({
              ...newSlide('showcase', phase),
              presetId: 'share-day',
              title: COPY.shareTitle,
              prompt: COPY.sharePrompt,
            } as Slide),
            [offer],
          );
          return;
        }
        case 'response': {
          const base = emptyInteraction(option.type);
          const interaction: Interaction = {
            ...base,
            ...(option.shareable !== undefined
              ? { shareable: option.shareable }
              : {}),
            ...(option.level
              ? {
                  checkIn: { style: 'feelings', level: option.level },
                  question:
                    section === 'reflect'
                      ? {
                          en: 'How are you leaving today?',
                          es: '¿Cómo te vas hoy?',
                        }
                      : base.question,
                }
              : {}),
            ...(section === 'reflect' && option.type === 'text'
              ? { question: COPY.exitQuestion }
              : {}),
          };
          const reveal = revealForInteraction(interaction);
          const slide = stamp(newSlide('interaction', phase));
          insertIntoSection(
            {
              ...slide,
              ...(option.level ? { presetId: 'greeting-check-in' } : {}),
              ...(reveal && interaction.shareable ? { reveal } : {}),
            } as Slide,
            [interaction],
          );
          return;
        }
      }
    },
    [insertIntoSection, slides],
  );

  // Seed a template slide from the picked content and put it in the section
  // it was added to. Cancelling the picker inserts nothing.
  const seedFromTemplate = useCallback(
    (tile: PickedTile, embed?: SlideMediaEmbed) => {
      if (!pendingTemplate) return;
      const { templateId, section } = pendingTemplate;
      const slide = buildTemplateSlide(templateId, SECTION_PHASE[section], {
        tile,
        embed,
      });
      insertIntoSection({ ...slide, section } as Slide);
      setPendingTemplate(null);
    },
    [pendingTemplate, insertIntoSection],
  );

  // Move the selected slide to another section; it stays selected.
  const changeSection = useCallback(
    (section: SlideSection) => {
      if (!draft || !selected) return;
      const { day, index } = moveSlideToSection(draft, selected.id, section);
      setDraft(day);
      if (index >= 0) setSelectedIndex(index);
    },
    [draft, selected],
  );

  // Adding a student-response component inserts a NEW question slide (interaction
  // kind) after the current one, seeded with an empty interaction of that type;
  // the teacher fills in the question/options in the side-panel editor, and
  // students answer it live. Content slides can't hold interactions, so this is
  // a dedicated slide (one transaction: insert slide + write the interaction).
  const insertResponseSlide = useCallback(
    (type: InteractionType) => {
      const current = slides[clampedIndex];
      const section = current ? sectionOf(current) : 'connect';
      const interaction = emptyInteraction(type);
      const reveal = revealForInteraction(interaction);
      const base = {
        ...newSlide('interaction', SECTION_PHASE[section]),
        section,
      };
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

  const sortBySection = useCallback(() => {
    const selId = slides[clampedIndex]?.id;
    const sorted = sortSlidesBySection(slides);
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

  // The lesson's subject: the Group Project keeps to it (owner, 2026-11-10).
  const focusId = draft.deck?.templateRef?.focusId;
  // The picker's two lesson picks. Choosing the Showcase redraws the
  // Showcase slide (the selected one, or the lesson's first) and sets the
  // subject; choosing the Group Project makes the selected slide (or the
  // lesson's first Group Project slide) run it.
  const firstIn = (section: SlideSection) =>
    sectionOf(selected) === section
      ? selected
      : draft.deck?.slides.find((s) => sectionOf(s) === section);
  const chooseShowcase = (plan: CortexLessonPlan) => {
    // The subject's portrait when the lesson has one (it may sit in Connect,
    // carrying the check-in), never its song or globe slide.
    const target =
      sectionOf(selected) === 'showcase' && !isSubjectSlide(selected)
        ? selected
        : (draft.deck?.slides.find(isShowcasePortrait) ?? firstIn('showcase'));
    setDraft((prev) =>
      prev
        ? target
          ? applyShowcasePick(prev, target.id, plan)
          : {
              ...prev,
              deck: prev.deck && {
                ...prev.deck,
                templateRef: {
                  ...(prev.deck.templateRef ?? {
                    templateId: CORTEX_LESSON_TEMPLATE_ID,
                  }),
                  focusId: plan.focus.id,
                },
              },
            }
        : prev,
    );
  };
  const chooseGroup = (
    plan: CortexLessonPlan,
    role: GroupRole,
    ref: string,
    label: string,
  ) => {
    const target = firstIn('groupProject');
    if (!target) return;
    setDraft((prev) =>
      prev ? applyGroupPick(prev, target.id, plan, role, ref, label) : prev,
    );
  };

  const matchShowcase = (match: GroupMatch) => {
    setSelectedInteractions([match.interaction]);
    patchSelected({ title: match.title, prompt: match.prompt });
    setDraft((prev) =>
      prev?.deck?.templateRef
        ? {
            ...prev,
            deck: {
              ...prev.deck,
              templateRef: { ...prev.deck.templateRef, role: match.role },
            },
          }
        : prev,
    );
  };

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
      {pickerOpen && (
        <LessonContentPicker
          open
          onOpenChange={setPickerOpen}
          // The portrait offers the subject, even when it is the Connect
          // slide (it carries the check-in).
          section={
            isShowcasePortrait(selected) ? 'showcase' : sectionOf(selected)
          }
          focusId={focusId}
          currentGroupRef={groupActivityOf(slideInteractions[0])?.ref}
          onShowcase={chooseShowcase}
          onGroup={chooseGroup}
          onLink={(tile, embed) => {
            patchSelected({
              launchTiles: [...contentTiles, { id: tileUid(), ...tile }],
              ...(embed ?? {}),
            });
          }}
          onAddResponse={insertResponseSlide}
        />
      )}
      {/* The lesson's verbs on the Office's top rail, in place of the class's
          Go Live menu: saved state, then Present, Go Live (saved
          first, so the class gets what's on screen). */}
      <OfficeTopActions>
        {savedLabel && (
          <span className="inline-flex items-center gap-1 text-[0.75rem] text-daw-text-3 max-lg:sr-only">
            <Check aria-hidden className="size-3.5" />
            {savedLabel}
          </span>
        )}
        <Button asChild size="pill" variant="pill" className="max-md:hidden">
          <Link
            to={TeacherRoutes.present({ classroomId: cid, dayId: draft.id })}
          >
            <Play aria-hidden />
            Present
          </Link>
        </Button>
        {!ownLesson && (
          <Button
            size="pill"
            variant="primary"
            disabled={!canEdit}
            title={canEdit ? undefined : 'Viewers cannot start a live session'}
            onClick={() => {
              saveDay(draft);
              void goLive(draft);
            }}
          >
            <Radio aria-hidden />
            <span className="max-sm:sr-only">Go Live</span>
          </Button>
        )}
      </OfficeTopActions>
      <OfficeRailSlot>
        <span className="text-[0.8125rem] tabular-nums text-daw-text-3">
          Slide {clampedIndex + 1} of {slides.length}
        </span>
      </OfficeRailSlot>
      <EditorTopBar
        classroomId={cid}
        label={draft.label}
        onLabelChange={updateLabel}
        language={language}
        onLanguageChange={setLanguage}
        chooseContent={
          <Button
            variant="pill"
            size="pill"
            onClick={() => setPickerOpen(true)}
          >
            <Plus aria-hidden />
            Content
          </Button>
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
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto [scrollbar-width:thin] [&>*]:shrink-0">
          {focusId &&
            selected.kind === 'app-route' &&
            sectionOf(selected) === 'groupProject' && (
              <GroupFocusBanner
                focusId={focusId}
                interaction={slideInteractions[0]}
                onMatch={matchShowcase}
              />
            )}
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
            onAdd={addToSection}
            onDuplicate={duplicateSlide}
            onDelete={deleteSlide}
            onMove={moveSlideBy}
            onSortBySection={sortBySection}
          />
        </div>

        <RationaleSidePanel
          slide={selected}
          phaseFullName={phaseSectionsLabel(selected.phase).en}
          onSectionChange={canEdit ? changeSection : undefined}
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
            (t) => t.id === pendingTemplate.templateId,
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
