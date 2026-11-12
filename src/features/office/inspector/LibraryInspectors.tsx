import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { EmptyState } from '@/daw/ui/EmptyState';
import { TYPE_CLASS } from '@/daw/ui/styles';
import {
  useActivityBank,
  useCloBank,
  useLessonSeedBank,
  useThemeBank,
} from '@/features/classroom/content/hooks';
import { IDEA_BANK } from '@/features/classroom/content/ideaBank';
import { PHASES } from '@/features/classroom/phases';
import { phaseSectionsLabel } from '@/features/classroom/slides/sections';
import {
  LIBRARY_SCOPE,
  withInspect,
  type InspectKind,
} from '../frame/useOfficeInspector';
import { MONTHS, phaseName } from '../library/libraryModel';
import { IdCover } from '../ui/ClassCover';
import { StatusPill } from '../ui/StatusPill';
import { OFFICE_ROW } from '../ui/styles';
import { InspectorBody, InspectorSection } from './InspectorParts';
import { MakeLessonForm } from './MakeLessonForm';

// ── The Library's items in the Inspector (owner, 2026-11-09) ───────────────
// A seed, a theme, an activity, a learning goal or an idea: what it is,
// what's in it, what it links to, and — for seeds and activities — the
// way to make a lesson from it.

const Missing = () => (
  <EmptyState
    title="This isn't in the Library"
    description="It may have been removed, or it was made on another device."
  />
);

const Title = ({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <MicroLabel>{eyebrow}</MicroLabel>
    <h3 className="text-[1.125rem] font-semibold leading-6 text-daw-text">
      {children}
    </h3>
  </div>
);

const Prose = ({ children }: { children: ReactNode }) => (
  <p
    className={cn(
      TYPE_CLASS.body,
      'whitespace-pre-wrap px-0.5 text-daw-text-2',
    )}
  >
    {children}
  </p>
);

const Chips = ({ items }: { items: readonly string[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((t) => (
      <StatusPill key={t}>{t}</StatusPill>
    ))}
  </div>
);

/** A row linking to another Library item, in the Inspector. */
const ItemLink = ({
  kind,
  id,
  children,
  meta,
}: {
  kind: InspectKind;
  id: string;
  children: ReactNode;
  meta?: string;
}) => {
  const { pathname, search } = useLocation();
  return (
    <li>
      <Link
        to={`${pathname}${withInspect(search, { kind, classroomId: LIBRARY_SCOPE, id })}`}
        className={cn(OFFICE_ROW, 'min-h-10 py-1.5')}
      >
        <span className="min-w-0 flex-1 truncate text-[0.875rem] text-daw-text">
          {children}
        </span>
        {meta && (
          <span className="shrink-0 text-[0.75rem] text-daw-text-3">
            {meta}
          </span>
        )}
        <ChevronRight
          aria-hidden
          className="size-3.5 shrink-0 text-daw-text-3"
        />
      </Link>
    </li>
  );
};

export const SeedInspector = ({ id }: { id: string }) => {
  const { byId } = useLessonSeedBank();
  const themes = useThemeBank();
  const seed = byId(id);
  if (!seed) return <Missing />;
  const theme = themes.byId(seed.themeId);
  return (
    <InspectorBody>
      <IdCover id={seed.id} className="mx-auto w-32 rounded-2xl" />
      <Title
        eyebrow={
          seed.kind === 'day'
            ? 'Lesson seed — full lesson'
            : 'Lesson seed — one activity'
        }
      >
        {seed.title.en}
      </Title>
      {seed.description && <Prose>{seed.description}</Prose>}
      <MakeLessonForm source={{ kind: 'seed', seed }} />
      {seed.kind === 'day' ? (
        <InspectorSection title="The lesson it makes">
          <ol className="flex flex-col gap-2 px-0.5">
            {PHASES.map((phase) => {
              const p = seed.template[phase]?.presentation;
              return (
                <li key={phase} className="flex flex-col">
                  <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
                    {phaseSectionsLabel(phase).en}
                  </span>
                  <span className="text-[0.875rem] text-daw-text">
                    {p?.title?.en || p?.prompt?.en || '—'}
                  </span>
                </li>
              );
            })}
          </ol>
        </InspectorSection>
      ) : (
        <InspectorSection title="Its activity">
          <ul className="-mx-1">
            <ItemLink
              kind="activity"
              id={seed.anchor.activity.id}
              meta={phaseName(seed.anchor.phase)}
            >
              {seed.anchor.activity.title.en}
            </ItemLink>
          </ul>
        </InspectorSection>
      )}
      {theme && (
        <InspectorSection title="Theme">
          <ul className="-mx-1">
            <ItemLink
              kind="theme"
              id={theme.id}
              meta={theme.month ? MONTHS[theme.month - 1] : undefined}
            >
              {theme.title.en}
            </ItemLink>
          </ul>
        </InspectorSection>
      )}
      {seed.songs.length > 0 && (
        <InspectorSection title="Songs">
          <Chips items={seed.songs} />
        </InspectorSection>
      )}
      {seed.tags.length > 0 && (
        <InspectorSection title="Tags">
          <Chips items={seed.tags} />
        </InspectorSection>
      )}
    </InspectorBody>
  );
};

export const ActivityInspector = ({ id }: { id: string }) => {
  const { byId } = useActivityBank();
  const activity = byId(id);
  if (!activity) return <Missing />;
  return (
    <InspectorBody>
      <Title eyebrow={`Activity — ${phaseName(activity.phase)}`}>
        {activity.title.en}
      </Title>
      {activity.purpose && <Prose>{activity.purpose}</Prose>}
      <MakeLessonForm source={{ kind: 'activity', activity }} />
      {activity.description && (
        <InspectorSection title="How it runs">
          <Prose>{activity.description}</Prose>
        </InspectorSection>
      )}
      {activity.learningOutcome && (
        <InspectorSection title="Students will">
          <Prose>{activity.learningOutcome}</Prose>
        </InspectorSection>
      )}
      {activity.assessment && (
        <InspectorSection title="Checking for understanding — teacher only">
          <Prose>{activity.assessment}</Prose>
        </InspectorSection>
      )}
      {activity.atlasResources.length > 0 && (
        <InspectorSection title="In Music Atlas">
          <ul className="flex flex-col gap-1.5 px-0.5">
            {activity.atlasResources.map((r, i) => (
              <li key={i} className="text-[0.875rem] text-daw-text-2">
                <span className="text-daw-text">{r.label}</span>
                <span className="text-daw-text-3"> · {r.module}</span>
              </li>
            ))}
          </ul>
        </InspectorSection>
      )}
    </InspectorBody>
  );
};

export const ThemeInspector = ({ id }: { id: string }) => {
  const { byId } = useThemeBank();
  const { byThemeId } = useLessonSeedBank();
  const theme = byId(id);
  if (!theme) return <Missing />;
  const seeds = byThemeId(theme.id);
  return (
    <InspectorBody>
      <IdCover id={theme.id} className="mx-auto w-32 rounded-2xl" />
      <Title
        eyebrow={theme.month ? `Theme — ${MONTHS[theme.month - 1]}` : 'Theme'}
      >
        {theme.title.en}
      </Title>
      {theme.focus && <Prose>{theme.focus}</Prose>}
      {theme.essentialQuestions.length > 0 && (
        <InspectorSection title="Essential questions">
          <ul className="flex list-disc flex-col gap-1 pl-5 text-[0.875rem] text-daw-text-2">
            {theme.essentialQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </InspectorSection>
      )}
      {seeds.length > 0 && (
        <InspectorSection title={`Lesson seeds (${seeds.length})`}>
          <ul className="-mx-1 flex flex-col">
            {seeds.map((s) => (
              <ItemLink
                key={s.id}
                kind="seed"
                id={s.id}
                meta={s.kind === 'day' ? 'Lesson' : 'Activity'}
              >
                {s.title.en}
              </ItemLink>
            ))}
          </ul>
        </InspectorSection>
      )}
      {theme.suggestedArtists.length > 0 && (
        <InspectorSection title="Artists to hear">
          <Chips items={theme.suggestedArtists} />
        </InspectorSection>
      )}
    </InspectorBody>
  );
};

const AXES = [
  ['awarenessOfFeeling', 'Feeling'],
  ['awarenessOfTechnique', 'Technique'],
  ['awarenessOfContext', 'Context'],
] as const;

export const GoalInspector = ({ id }: { id: string }) => {
  const { byId } = useCloBank();
  const { activities } = useActivityBank({ cloId: id });
  const goal = byId(id);
  if (!goal) return <Missing />;
  return (
    <InspectorBody>
      {goal.type === 'content-language' ? (
        <Title eyebrow={`Language goal — ${phaseName(goal.phase)}`}>
          {goal.statement}
        </Title>
      ) : (
        // Its three axes are the goal; a title repeating them says it twice.
        <MicroLabel>Learning goal — {phaseName(goal.phase)}</MicroLabel>
      )}
      {goal.type === 'learning' ? (
        <dl className="flex flex-col gap-2 px-0.5">
          {AXES.filter(([k]) => goal[k]).map(([k, label]) => (
            <div key={k} className="flex flex-col">
              <dt className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
                {label}
              </dt>
              <dd className="text-[0.875rem] text-daw-text">{goal[k]}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <InspectorSection title="Language focus">
          <Prose>{goal.languageFocus}</Prose>
        </InspectorSection>
      )}
      {activities.length > 0 && (
        <InspectorSection title="Activities that teach it">
          <ul className="-mx-1 flex flex-col">
            {activities.map((a) => (
              <ItemLink
                key={a.id}
                kind="activity"
                id={a.id}
                meta={phaseName(a.phase)}
              >
                {a.title.en}
              </ItemLink>
            ))}
          </ul>
        </InspectorSection>
      )}
    </InspectorBody>
  );
};

export const IdeaInspector = ({ id }: { id: string }) => {
  const idea = IDEA_BANK.recurringFormats.find((f) => f.id === id);
  if (!idea) return <Missing />;
  return (
    <InspectorBody>
      <IdCover id={idea.id} className="mx-auto w-32 rounded-2xl" />
      <Title eyebrow="Idea bank — a recurring format">{idea.title}</Title>
      <Prose>{idea.description}</Prose>
      {idea.possibleUses && idea.possibleUses.length > 0 && (
        <InspectorSection title="Use it for">
          <ul className="flex list-disc flex-col gap-1 pl-5 text-[0.875rem] text-daw-text-2">
            {idea.possibleUses.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </InspectorSection>
      )}
      {idea.createOptions.length > 0 && (
        <InspectorSection title="Students can make">
          <Chips items={idea.createOptions} />
        </InspectorSection>
      )}
      {idea.enduringUnderstandings.length > 0 && (
        <InspectorSection title="Big ideas">
          <ul className="flex list-disc flex-col gap-1 pl-5 text-[0.875rem] text-daw-text-2">
            {idea.enduringUnderstandings.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </InspectorSection>
      )}
    </InspectorBody>
  );
};
