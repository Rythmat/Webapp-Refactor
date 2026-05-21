import { AudioWaveform } from 'lucide-react';
import type { FC } from 'react';

export interface RecentProject {
  title: string;
  artist: string;
  icon: string;
}

interface RecentProjectsProps {
  projects: RecentProject[];
}

export const RecentProjects: FC<RecentProjectsProps> = ({ projects }) => {
  return (
    <div
      className="glass-panel-sm flex flex-col overflow-hidden rounded-2xl"
      style={{
        background: 'rgba(26, 26, 26, 0.7)',
        padding: 'clamp(0.85rem, 1.3vw, 1.5rem)',
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <AudioWaveform
          className="text-white/85"
          style={{
            width: 'clamp(0.95rem, 1.25vw, 1.15rem)',
            height: 'clamp(0.95rem, 1.25vw, 1.15rem)',
          }}
        />
        <span
          className="font-medium text-white"
          style={{ fontSize: 'clamp(0.75rem, 1.05vw, 1rem)' }}
        >
          Recent Projects
        </span>
      </div>
      <div
        className="grid flex-1 grid-cols-2 grid-rows-2"
        style={{
          columnGap: 'clamp(0.75rem, 1.3vw, 1.25rem)',
          rowGap: 'clamp(0.5rem, 1vw, 1rem)',
        }}
      >
        {projects.slice(0, 4).map((p, i) => (
          <div
            key={`${p.title}-${i}`}
            className="flex min-w-0 items-center gap-3"
          >
            <div
              className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg"
              style={{
                background: 'rgba(30, 30, 30, 0.6)',
                width: 'clamp(3rem, 4.2vw, 4.5rem)',
                height: 'clamp(3rem, 4.2vw, 4.5rem)',
              }}
            >
              <img
                src={p.icon}
                alt=""
                draggable={false}
                className="opacity-100"
                style={{
                  width: 'clamp(2.25rem, 3.2vw, 3.5rem)',
                  height: 'clamp(2.25rem, 3.2vw, 3.5rem)',
                }}
              />
            </div>
            <div className="min-w-0">
              <span
                className="block truncate text-white"
                style={{ fontSize: 'clamp(0.75rem, 1.05vw, 1rem)' }}
              >
                {p.title}
              </span>
              <span
                className="block text-white/55"
                style={{ fontSize: 'clamp(0.65rem, 0.85vw, 0.85rem)' }}
              >
                {p.artist}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
