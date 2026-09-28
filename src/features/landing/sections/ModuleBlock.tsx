import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { Fragment, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { appHref } from '@/constants/hosts';
import { ModuleDemo } from '../tour/ModuleDemo';
import type { SceneProps } from '../tour/scenes/sceneTypes';
import { TOUR_BY_ID, type TourScript } from '../tour/tourSteps';
import { Statement } from './Statement';
import { moduleIcon } from './moduleIcons';
import type { LandingModule } from './modules';
import { scrollToModule } from './scrollToModule';

/** A module section's title — its app icon + name — above the statement. */
export const SectionTitle = ({
  id,
  label,
  icon,
  className,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  className?: string;
}) => (
  <h2
    id={id}
    className={cn(
      'flex items-center gap-3 text-xl text-white md:text-2xl',
      className,
    )}
  >
    {icon}
    {label}
  </h2>
);

const OUTLINE_LINK =
  'group inline-flex w-fit items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/30 hover:text-white';

/** "Open" gets the hero Open's hover: shine sweep, brighter fill, press-in. */
const OPEN_LINK = cn(
  OUTLINE_LINK,
  'landing-shine bg-white/[0.04] transition-[color,background-color,border-color,transform] duration-200 hover:bg-white/[0.08] active:scale-[0.96]',
);

/** Outlined "See more ↓": scrolls to a module's section on the page (bento row). */
export const SeeMoreLink = ({
  id,
  className,
}: {
  id: string;
  className?: string;
}) => (
  <a
    href={`#${id}`}
    onClick={scrollToModule(id)}
    className={cn(OUTLINE_LINK, className)}
  >
    See more
    <ArrowDown className="size-3.5 transition-transform group-hover:translate-y-0.5" />
  </a>
);

/**
 * Outlined "Open ↗": the module in the app (module blocks). An app path stays
 * in the router; on the marketing host `appHref` makes it an absolute link to
 * the app host, where sign-in brings the visitor back to it.
 */
export const OpenLink = ({
  path,
  className,
}: {
  path: string;
  className?: string;
}) => {
  const href = appHref(path);
  const content = (
    <>
      Open
      <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
    </>
  );
  return href.startsWith('/') ? (
    <Link to={href} className={cn(OPEN_LINK, className)}>
      {content}
    </Link>
  ) : (
    <a href={href} className={cn(OPEN_LINK, className)}>
      {content}
    </a>
  );
};

/** Two feature cells in a hairline grid (shared by every module block). */
export const FeatureCells = ({
  features,
}: {
  features: NonNullable<LandingModule['features']>;
}) => (
  <div className="grid border-t border-white/[0.08] md:grid-cols-2">
    {features.map((f, i) => (
      <div
        key={f.title}
        className={
          i === 0
            ? 'border-b border-white/[0.08] px-6 py-10 md:border-b-0 md:border-r md:px-10'
            : 'px-6 py-10 md:px-10'
        }
      >
        <h4 className="text-lg text-white">{f.title}</h4>
        <p className="mt-1 max-w-[40ch] text-[15px] text-white/50">{f.body}</p>
      </div>
    ))}
  </div>
);

/** A live demo on its panel: edge to edge (`bleed`) or padded and raised. */
const DemoPanel = ({
  script,
  Scene,
  bleed,
}: {
  script: TourScript;
  Scene: ComponentType<SceneProps>;
  bleed?: boolean;
}) =>
  bleed ? (
    <div className="border-t border-white/[0.08]">
      <ModuleDemo tab={script} Scene={Scene} bleed />
    </div>
  ) : (
    <div className="border-t border-white/[0.08] bg-white/[0.02] px-4 py-10 md:px-10 md:py-14">
      {/* Centered at its max size on full-width pages (no-op in the TOC column). */}
      <ModuleDemo
        tab={script}
        Scene={Scene}
        className="mx-auto w-full max-w-[1150px]"
      />
    </div>
  );

/**
 * A demo section: a two-tone statement (an optional title or tag above it,
 * `aside` under it), the live guided demo on a raised panel, any `more` demos
 * (each under its own statement), then optional feature cells. With a title,
 * the title is the section's h2 and the statements h3s. `bleed` runs the
 * demos edge to edge (see `ModuleDemo`). Shared by the landing's module blocks
 * and the /features pages.
 */
export const DemoSection = ({
  id,
  title,
  tag,
  statement,
  aside,
  script,
  Scene,
  more,
  bleed,
  features,
}: {
  id: string;
  title?: { label: string; icon: ReactNode };
  tag?: string;
  statement: { lead: string; rest: string };
  aside?: ReactNode;
  script: TourScript;
  Scene: ComponentType<SceneProps>;
  more?: LandingModule['more'];
  bleed?: boolean;
  features?: LandingModule['features'];
}) => (
  <section
    id={id}
    data-module={id}
    aria-labelledby={`${id}-title`}
    className="scroll-mt-16 border-b border-white/[0.08]"
  >
    <div className="flex flex-col gap-6 px-6 pb-14 pt-20 md:px-10 md:pt-28">
      {title && (
        <SectionTitle
          id={`${id}-title`}
          label={title.label}
          icon={title.icon}
        />
      )}
      {tag && (
        <span className="w-fit rounded-md bg-white/10 px-2 py-0.5 text-sm font-medium text-white/80">
          {tag}
        </span>
      )}
      <Statement
        id={title ? undefined : `${id}-title`}
        as={title ? 'h3' : 'h2'}
        lead={statement.lead}
        rest={statement.rest}
      />
      {aside}
    </div>
    <DemoPanel script={script} Scene={Scene} bleed={bleed} />
    {more?.map((d) => (
      <Fragment key={d.script.label}>
        <div className="border-t border-white/[0.08] px-6 pb-14 pt-20 md:px-10 md:pt-28">
          <Statement
            as={title ? 'h3' : 'h2'}
            lead={d.statement.lead}
            rest={d.statement.rest}
          />
        </div>
        <DemoPanel script={d.script} Scene={d.Scene} bleed={bleed} />
      </Fragment>
    ))}
    {features && <FeatureCells features={features} />}
  </section>
);

/** One module's featured block in the landing's TOC flow. */
export const ModuleBlock = ({ module: m }: { module: LandingModule }) => {
  const tab = TOUR_BY_ID[m.id];
  if (!m.Scene) return null;
  return (
    <DemoSection
      id={m.id}
      title={{ label: m.label, icon: moduleIcon(m.id, 'size-8') }}
      statement={m.statement}
      aside={<OpenLink path={m.app} />}
      script={tab}
      Scene={m.Scene}
      more={m.more}
      bleed={m.bleed}
      features={m.features}
    />
  );
};
