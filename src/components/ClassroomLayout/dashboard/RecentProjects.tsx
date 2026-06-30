import { AudioWaveform, Plus } from 'lucide-react';
import type { CSSProperties, FC } from 'react';
import { CardShell, HeaderRow } from '@/components/ui/CardShell';
import { ProjectAvatarPattern } from '@/components/ui/ProjectAvatarPattern';

export interface RecentProject {
  id: string;
  title: string;
}

interface RecentProjectsProps {
  projects: RecentProject[];
  onOpenProject: (id: string) => void;
  onCreateNew: () => void;
}

const iconBoxStyle: CSSProperties = {
  background: 'rgba(30, 30, 30, 0.6)',
  width: 'clamp(3rem, 4.2vw, 4.5rem)',
  height: 'clamp(3rem, 4.2vw, 4.5rem)',
};

const titleStyle: CSSProperties = { fontSize: 'clamp(0.75rem, 1.05vw, 1rem)' };

const tileClass =
  'flex min-w-0 cursor-pointer items-center gap-3 rounded-lg text-left transition-colors hover:bg-white/5';

export const RecentProjects: FC<RecentProjectsProps> = ({
  projects,
  onOpenProject,
  onCreateNew,
}) => {
  // Backend returns projects ordered most-recently-touched first; show up to 4,
  // filling the grid left-to-right then top-to-bottom. When the user has fewer
  // than 4 saved projects, append a "Create New Project" tile after them.
  const shown = projects.slice(0, 4);
  const showCreateTile = projects.length < 4;

  return (
    <CardShell
      header={<HeaderRow icon={AudioWaveform} title="Recent Projects" />}
    >
      {/* Container query: stack 1-col when card is narrow, 2-col when wider.
          @sm here = card container query (>= 24rem), NOT the viewport. */}
      <div
        className="mt-4 grid grid-cols-1 @sm:grid-cols-2"
        style={{
          columnGap: 'clamp(0.75rem, 1.3vw, 1.25rem)',
          rowGap: 'clamp(0.5rem, 1vw, 1rem)',
        }}
      >
        {shown.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpenProject(p.id)}
            className={tileClass}
          >
            <div
              className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg"
              style={iconBoxStyle}
            >
              <ProjectAvatarPattern
                projectName={p.title}
                className="h-full w-full"
              />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-white" style={titleStyle}>
                {p.title}
              </span>
            </div>
          </button>
        ))}

        {showCreateTile && (
          <button type="button" onClick={onCreateNew} className={tileClass}>
            <div
              className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/15"
              style={iconBoxStyle}
            >
              <Plus
                className="text-white/70"
                style={{
                  width: 'clamp(1.4rem, 2vw, 2rem)',
                  height: 'clamp(1.4rem, 2vw, 2rem)',
                }}
              />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-white" style={titleStyle}>
                Create New Project
              </span>
            </div>
          </button>
        )}
      </div>
    </CardShell>
  );
};
