import { ArrowRight, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  GO_PILL,
  GO_PILL_ENABLED,
  PROMPT_FRAME,
  PROMPT_WASH,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { StudioRoutes } from '@/constants/routes';
import type { ActivityItem } from '@/hooks/data';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';
import { useHomeProjects } from './useHomeProjects';

/** Starts a live collaborative Studio session (as Studio › Start a Session). */
const COLLAB_HREF = `${StudioRoutes.editor.definition}?collab=new`;

/** The project's tile: the same seeded SVG the activity rail shows. */
const ProjectTile = ({ seed }: { seed: string }) => {
  const src = useMemo(
    () =>
      `data:image/svg+xml;utf8,${encodeURIComponent(generateStudioTileSvg(seed))}`,
    [seed],
  );
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="size-11 shrink-0 rounded-lg object-cover"
    />
  );
};

const ProjectRow = ({ project }: { project: ActivityItem }) => (
  <Link
    to={project.route}
    className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 outline-none transition-colors duration-150 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50"
  >
    <ProjectTile seed={project.id} />
    <span className="min-w-0">
      <span className="block truncate text-[0.9375rem] leading-5 text-white">
        {project.title}
      </span>
      <span className="block truncate text-[0.8125rem] leading-5 text-white/55">
        {project.subtitle}
      </span>
    </span>
  </Link>
);

/**
 * Home's right column: the student's recent Studio projects (the unsaved
 * session on this device and their saved ones, newest first; each opens in
 * the editor), and Collaborate, which starts a live session they can share
 * by room code. "View all" opens the Studio Dashboard.
 */
export const HomeProjectsCard = () => {
  const { projects } = useHomeProjects();

  return (
    <section
      aria-labelledby="home-projects-heading"
      // The prompt box's card (hairline edge, 20px corners, soft shadow,
      // light wash), as the Studio card beside it. Side by side it fills its
      // grid cell (absolute, so its list never makes the row taller): the
      // row is the Studio card's height, which follows its video, and the
      // list scrolls when it has more than fits. Stacked, it has its own.
      className={cn(
        PROMPT_FRAME,
        PROMPT_WASH,
        'flex min-h-[29.125rem] flex-col gap-5 p-5',
        '@2xl:absolute @2xl:inset-0 @2xl:min-h-0',
        '@container/projects',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* A size up from the other headers' icons: its art sits small
            in its frame. */}
          <span
            aria-hidden
            className="size-8 shrink-0 bg-white"
            style={{
              maskImage: 'url(/icons/projects-icon.svg)',
              WebkitMaskImage: 'url(/icons/projects-icon.svg)',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
            }}
          />
          <h2
            id="home-projects-heading"
            className="min-w-0 text-base leading-6 text-white"
          >
            Projects
          </h2>
        </div>
        <Link
          // Every project, in the editor's Projects dialog (the Studio
          // Dashboard's list went, owner 2026-10-24).
          to={`${StudioRoutes.editor()}?projects=1`}
          aria-label="View all projects"
          className="group flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm text-white/70 outline-none transition-colors duration-150 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
        >
          {/* Just the arrow on a narrow card, so it never meets the heading. */}
          <span className="hidden @[13.5rem]/projects:inline">View all</span>
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform duration-150 motion-safe:group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <div className="-mx-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {projects === null ? (
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <div className="size-11 shrink-0 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
            </div>
          ))
        ) : projects.length === 0 ? (
          <p className="m-auto max-w-64 px-2 text-center text-sm leading-6 text-white/55">
            No projects yet. Start one from the Studio, or collaborate on one
            with friends.
          </p>
        ) : (
          projects.map((p) => <ProjectRow key={p.id} project={p} />)
        )}
      </div>

      {/* The card's one action: a white pill, like the Studio card's
          New project. */}
      <Link
        to={COLLAB_HREF}
        className={cn(GO_PILL, GO_PILL_ENABLED, 'justify-center')}
      >
        <Users aria-hidden className="size-4" />
        Collaborate
      </Link>
    </section>
  );
};
