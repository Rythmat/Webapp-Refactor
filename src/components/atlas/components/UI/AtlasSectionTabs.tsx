import { Link } from 'react-router-dom';
import { ATLAS_FOCUS } from '@/components/atlas/components/UI/primitives';
import {
  ATLAS_SECTIONS,
  sectionOf,
} from '@/components/atlas/navigation/sections';
import {
  useAtlasFrame,
  useAtlasNavigate,
} from '@/components/atlas/navigation/useAtlasNavigate';
import { AtlasRoutes } from '@/constants/routes';
import { cn } from '@/lib/utils';

/**
 * The Globe's five sections, on the Globe itself: the same names, order and
 * look as the /atlas dashboard's tab bar (GlobeTabBar) — plain text tabs,
 * white for the one you are in — so moving between the two never changes
 * what a section is called or where it sits. "Globe" goes back to the
 * dashboard.
 *
 * A section is a frame (navigation/sections.ts), so switching keeps the stop
 * and adds no step to Back.
 */
export function AtlasSectionTabs() {
  const active = useAtlasFrame(sectionOf);
  const navigate = useAtlasNavigate();
  return (
    <nav
      aria-label="Globe sections"
      className="flex min-w-0 flex-1 items-center gap-x-4 overflow-x-auto px-1 [scrollbar-width:none] lg:gap-x-5"
    >
      <Link
        className={cn(
          'flex shrink-0 items-center gap-2 rounded-lg text-atlas-text transition-opacity hover:opacity-90',
          ATLAS_FOCUS,
        )}
        title="The Globe dashboard"
        to={AtlasRoutes.root.definition}
      >
        <img
          alt=""
          className="size-7"
          draggable={false}
          src="/icons/globe-icon.svg"
        />
        <span className="text-lg font-medium lg:text-xl">Globe</span>
      </Link>
      {ATLAS_SECTIONS.map((section) => (
        <button
          key={section.id}
          aria-current={active === section.id ? 'page' : undefined}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-lg text-lg font-medium transition-colors lg:text-xl',
            active === section.id
              ? 'text-atlas-text'
              : 'text-atlas-text-2 hover:text-atlas-text',
            ATLAS_FOCUS,
          )}
          type="button"
          onClick={() => navigate.toSection(section.id)}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}
