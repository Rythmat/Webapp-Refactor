/**
 * The lesson's content picker (owner, 2026-11-10): the app's real content,
 * chosen inside the teacher's lesson flow. It replaces "+ Choose content".
 *
 * It opens on what the selected slide is for:
 *   - the Showcase: choose the lesson's subject, an artist or a city; the
 *     Showcase slide is redrawn for it (globe left, photo right);
 *   - the Group Project: the three roles, each listing ONLY what is about the
 *     subject: the Promoter on the Globe, the Producer in the Studio, the
 *     Performer in Learn. The class does the one picked together;
 *   - anywhere else: the whole app, Learn · Studio · Globe · Arcade, as a link
 *     on the slide, plus the questions a slide can ask.
 */
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Check,
  Gamepad2,
  Globe2,
  MessageSquare,
  Music,
  Search,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { ContentGate } from '@/content/ContentGate';
import { DawDialog } from '@/daw/ui/DawDialog';
import { Segmented } from '@/daw/ui/Segmented';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { IdCover } from '@/features/office/ui/ClassCover';
import { OFFICE_CARD } from '@/features/office/ui/styles';
import { refFirewallCollision } from '../../../slides/contentRefs';
import { ROLE_NAME } from '../../../slides/cortex/copy';
import {
  LESSON_ATLAS_KEY,
  loadLessonAtlas,
} from '../../../slides/cortex/loadLessonAtlas';
import { planCortexLesson } from '../../../slides/cortex/planLesson';
import { searchFocus } from '../../../slides/cortex/suggestFocus';
import type { CortexLessonPlan, GroupRole } from '../../../slides/cortex/types';
import { GROUP_ROLES, useLessonPlan } from '../../../slides/focus/lessonFocus';
import type { SlideSection } from '../../../slides/sections';
import type { InteractionType } from '../../../types';
import { ArcadeTab } from '../contentPicker/ArcadeTab';
import { ErasTab } from '../contentPicker/ErasTab';
import { EventsTab } from '../contentPicker/EventsTab';
import { GenreTab } from '../contentPicker/GenreTab';
import { GlobeTab } from '../contentPicker/GlobeTab';
import { RegionsCitiesTab } from '../contentPicker/RegionsCitiesTab';
import { ResponsesTab } from '../contentPicker/ResponsesTab';
import { SongsTab } from '../contentPicker/SongsTab';
import { StudioTab } from '../contentPicker/StudioTab';
import { TheoryTab } from '../contentPicker/TheoryTab';
import type { PickedTile, SlideMediaEmbed } from '../contentPicker/catalog';

export type PickerRail =
  | 'lesson'
  | 'learn'
  | 'studio'
  | 'globe'
  | 'arcade'
  | 'questions';

const RAILS: { id: PickerRail; label: string; icon: LucideIcon }[] = [
  { id: 'lesson', label: 'For this lesson', icon: Sparkles },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'studio', label: 'Studio', icon: SlidersHorizontal },
  { id: 'globe', label: 'Globe', icon: Globe2 },
  { id: 'arcade', label: 'Arcade', icon: Gamepad2 },
  { id: 'questions', label: 'Questions', icon: MessageSquare },
];

const ROLE_ICON: Record<GroupRole, LucideIcon> = {
  promoter: Globe2,
  producer: SlidersHorizontal,
  performer: Music,
};

const ROLE_BLURB: Record<GroupRole, string> = {
  promoter: 'The class travels the Globe together.',
  producer: 'The class builds a track in the Studio, step by step.',
  performer: 'The class plays a Learn lesson together.',
};

/** The rail a slide's section opens on. */
export const railFor = (section: SlideSection): PickerRail =>
  section === 'showcase' || section === 'groupProject' ? 'lesson' : 'learn';

const RAIL_BUTTON = `flex h-9 w-full items-center gap-2.5 rounded-full px-3 text-left text-[0.8125rem] text-daw-text-2 hover:bg-white/[0.05] hover:text-daw-text aria-[current=true]:bg-white/[0.1] aria-[current=true]:font-bold aria-[current=true]:text-daw-text ${TRANSITION} ${FOCUS_RING}`;

const ROW = `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/[0.05] ${TRANSITION} ${FOCUS_RING}`;

const FIELD =
  'h-10 w-full rounded-full border border-daw-outline bg-transparent px-10 text-[0.875rem] text-daw-text placeholder:text-daw-text-3 focus:border-white/40 focus:outline-none';

/** Search the Atlas for the lesson's subject. */
const ShowcaseChooser = ({
  current,
  onPick,
}: {
  current?: string;
  onPick: (plan: CortexLessonPlan) => void;
}) => {
  const atlas = useQuery({
    queryKey: LESSON_ATLAS_KEY,
    queryFn: loadLessonAtlas,
    staleTime: Infinity,
  });
  const [query, setQuery] = useState('');
  const results = useMemo(
    () =>
      atlas.data
        ? searchFocus(atlas.data.graph, atlas.data.catalog, query)
        : [],
    [atlas.data, query],
  );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[0.8125rem] text-daw-text-2">
        The Showcase is who or where the lesson is about. Everything the class
        does in the Group Project comes from it.
      </p>
      <div className="relative">
        <Search
          aria-hidden
          className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-daw-text-3"
        />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="An artist or a city: Michael Jackson, Detroit…"
          aria-label="Search for the Showcase"
          className={FIELD}
        />
      </div>
      {atlas.isPending && (
        <p role="status" className="text-[0.8125rem] text-daw-text-3">
          Loading the Atlas…
        </p>
      )}
      {query.trim().length >= 2 && atlas.data && results.length === 0 && (
        <p className="text-[0.8125rem] text-daw-text-3">
          Nothing in the Atlas matches “{query}”.
        </p>
      )}
      <ul className="flex flex-col">
        {results.map((focus) => (
          <li key={focus.id}>
            <button
              type="button"
              className={ROW}
              onClick={() =>
                atlas.data &&
                onPick(
                  planCortexLesson(atlas.data.graph, atlas.data.catalog, focus),
                )
              }
            >
              <IdCover id={focus.id} className="size-10 rounded-lg" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[0.875rem] font-bold text-daw-text">
                  {focus.label}
                </span>
                <span className="text-[0.75rem] text-daw-text-3">
                  {focus.kind === 'artist' ? 'Artist' : 'Place'} ·{' '}
                  {focus.connections} connections
                </span>
              </span>
              {focus.id === current && (
                <Check aria-label="The Showcase now" className="size-4" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** The three roles, each listing only what is about the subject. */
const GroupChooser = ({
  focusId,
  currentRef,
  onPick,
  onChooseShowcase,
}: {
  focusId?: string;
  currentRef?: string;
  onPick: (plan: CortexLessonPlan, role: GroupRole, ref: string) => void;
  onChooseShowcase: () => void;
}) => {
  const { plan, related, loading } = useLessonPlan(focusId);
  if (!focusId) {
    return (
      <div className={`${OFFICE_CARD} flex flex-col items-start gap-3 p-5`}>
        <p className="text-[0.875rem] text-daw-text">
          Choose the Showcase first.
        </p>
        <p className="text-[0.8125rem] text-daw-text-2">
          The Group Project is always about the lesson's Showcase: its Globe
          tour, its sound in the Studio, its music in Learn.
        </p>
        <button
          type="button"
          onClick={onChooseShowcase}
          className={`${ROW} w-fit border border-daw-outline font-bold`}
        >
          <Sparkles aria-hidden className="size-4" />
          Choose the Showcase
        </button>
      </div>
    );
  }
  if (loading || !plan || !related) {
    return (
      <p role="status" className="text-[0.8125rem] text-daw-text-3">
        {loading
          ? 'Loading the Atlas…'
          : 'This lesson’s Showcase is no longer in the Atlas.'}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[0.8125rem] text-daw-text-2">
        Everything here is about{' '}
        <span className="font-bold text-daw-text">{plan.focus.label}</span>. The
        class does the one you pick together.
      </p>
      <div className="grid gap-3 lg:grid-cols-3">
        {GROUP_ROLES.map((role) => {
          const Icon = ROLE_ICON[role];
          return (
            <section
              key={role}
              aria-label={ROLE_NAME[role].en}
              className={`${OFFICE_CARD} flex min-w-0 flex-col gap-2 p-3`}
            >
              <header className="flex flex-col gap-0.5 px-1">
                <span className="flex items-center gap-2 text-[0.9375rem] font-bold text-daw-text">
                  <Icon aria-hidden className="size-4" />
                  {ROLE_NAME[role].en}
                </span>
                <span className="text-[0.75rem] text-daw-text-3">
                  {ROLE_BLURB[role]}
                </span>
              </header>
              {related[role].length === 0 ? (
                <p className="px-1 text-[0.8125rem] text-daw-text-3">
                  Nothing for {plan.focus.label} yet.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {related[role].map((option) => (
                    <li key={option.ref}>
                      <button
                        type="button"
                        className={ROW}
                        onClick={() => onPick(plan, role, option.ref)}
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[0.8125rem] text-daw-text">
                            {option.label}
                          </span>
                          {option.detail && (
                            <MicroLabel>{option.detail}</MicroLabel>
                          )}
                        </span>
                        {option.ref === currentRef && (
                          <Check
                            aria-label="The Group Project now"
                            className="size-4 shrink-0"
                          />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

type LearnTab = 'songs' | 'theory' | 'genre';
type GlobeTab = 'pathways' | 'places' | 'events' | 'eras';

export interface LessonContentPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The selected slide's section: what "For this lesson" offers. */
  section: SlideSection;
  /** The lesson's subject, `deck.templateRef.focusId`. */
  focusId?: string;
  /** The Group Project's activity now, to mark it. */
  currentGroupRef?: string;
  onShowcase: (plan: CortexLessonPlan) => void;
  onGroup: (plan: CortexLessonPlan, role: GroupRole, ref: string) => void;
  /** A link onto the slide, with media to embed beside it for some picks. */
  onLink: (tile: PickedTile, embed?: SlideMediaEmbed) => void;
  onAddResponse?: (type: InteractionType) => void;
}

export const LessonContentPicker = ({
  open,
  onOpenChange,
  section,
  focusId,
  currentGroupRef,
  onShowcase,
  onGroup,
  onLink,
  onAddResponse,
}: LessonContentPickerProps) => {
  const forLesson = section === 'showcase' || section === 'groupProject';
  const [rail, setRail] = useState<PickerRail>(() => railFor(section));
  // From the Group Project with no subject yet: choose it here.
  const [choosingShowcase, setChoosingShowcase] = useState(false);
  const [learnTab, setLearnTab] = useState<LearnTab>('songs');
  const [globeTab, setGlobeTab] = useState<GlobeTab>('pathways');

  const rails = RAILS.filter(
    (r) =>
      (r.id !== 'lesson' || forLesson) &&
      (r.id !== 'questions' || onAddResponse),
  );

  const close = () => onOpenChange(false);
  const link = (tile: PickedTile, embed?: SlideMediaEmbed) => {
    if (refFirewallCollision(tile)) return;
    onLink(tile, embed);
    close();
  };

  const showShowcase =
    rail === 'lesson' && (section === 'showcase' || choosingShowcase);

  return (
    <DawDialog
      open={open}
      onOpenChange={onOpenChange}
      size="full"
      title="Content"
      description="Learn, Studio, Globe and Arcade, inside your lesson."
      className="h-[min(760px,calc(100dvh-48px))] max-w-[min(1040px,calc(100vw-48px))]"
    >
      <div className="grid h-full min-h-0 gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="Content" className="flex flex-col gap-1 md:pt-1">
          {rails.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-current={rail === r.id}
              onClick={() => setRail(r.id)}
              className={RAIL_BUTTON}
            >
              <r.icon aria-hidden className="size-4" />
              {r.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 pb-2">
          {showShowcase && (
            <ShowcaseChooser
              current={focusId}
              onPick={(plan) => {
                onShowcase(plan);
                if (choosingShowcase) setChoosingShowcase(false);
                else close();
              }}
            />
          )}
          {rail === 'lesson' && !showShowcase && (
            <GroupChooser
              focusId={focusId}
              currentRef={currentGroupRef}
              onPick={(plan, role, ref) => {
                onGroup(plan, role, ref);
                close();
              }}
              onChooseShowcase={() => setChoosingShowcase(true)}
            />
          )}

          {rail === 'learn' && (
            <div className="flex flex-col gap-2">
              <Segmented<LearnTab>
                label="Learn"
                value={learnTab}
                onValueChange={setLearnTab}
                options={[
                  { value: 'songs', label: 'Songs' },
                  { value: 'theory', label: 'Theory' },
                  { value: 'genre', label: 'Genre' },
                ]}
                className="w-fit"
              />
              <ContentGate
                needs={learnTab === 'songs' ? ['songs'] : []}
                fallback={<Loading />}
              >
                {learnTab === 'songs' && <SongsTab onSelect={link} />}
                {learnTab === 'theory' && <TheoryTab onSelect={link} />}
                {learnTab === 'genre' && <GenreTab onSelect={link} />}
              </ContentGate>
            </div>
          )}

          {rail === 'studio' && <StudioTab onSelect={link} />}

          {rail === 'globe' && (
            <div className="flex flex-col gap-2">
              <Segmented<GlobeTab>
                label="Globe"
                value={globeTab}
                onValueChange={setGlobeTab}
                options={[
                  { value: 'pathways', label: 'Pathways' },
                  { value: 'places', label: 'Regions & cities' },
                  { value: 'events', label: 'Events' },
                  { value: 'eras', label: 'Eras' },
                ]}
                className="w-fit"
              />
              <ContentGate
                needs={
                  globeTab === 'pathways' || globeTab === 'events'
                    ? ['events']
                    : []
                }
                fallback={<Loading />}
              >
                {globeTab === 'pathways' && <GlobeTab onSelect={link} />}
                {globeTab === 'places' && <RegionsCitiesTab onSelect={link} />}
                {globeTab === 'events' && <EventsTab onSelect={link} />}
                {globeTab === 'eras' && <ErasTab onSelect={link} />}
              </ContentGate>
            </div>
          )}

          {rail === 'arcade' && <ArcadeTab onSelect={link} />}

          {rail === 'questions' && onAddResponse && (
            <ResponsesTab
              onPick={(type) => {
                onAddResponse(type);
                close();
              }}
            />
          )}
        </div>
      </div>
    </DawDialog>
  );
};

const Loading = () => (
  <p role="status" className={cn('px-1 py-8 text-[0.8125rem] text-daw-text-3')}>
    Loading content…
  </p>
);
