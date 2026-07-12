import { Check, Settings2, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { cn } from '@/components/utilities';
import { StudioRoutes } from '@/constants/routes';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import {
  PROJECT_GENRES,
  PROJECT_INSTRUMENTS,
  PROJECT_STATUSES,
} from '@/daw/data/projectMeta';
import { useConnectionUsers } from '@/hooks/data/useConnections';
import {
  useProjectMetaMutations,
  type ProjectMeta,
} from '@/hooks/data/useProjectMeta';
import { avatarConfigOrDefault } from '@/lib/avatarHexGrid';
import {
  studioProjectsApi,
  type StudioProjectSummary,
} from '@/lib/studio-projects/api';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';
import { showError } from '@/util/toast';

interface StudioLibraryCardProps {
  project: StudioProjectSummary;
  meta: ProjectMeta;
  /** Called after this project is deleted so the parent can refresh the list. */
  onDeleted: () => void;
}

const ProjectHexTile = ({ seed }: { seed: string }) => {
  const svg = useMemo(() => generateStudioTileSvg(seed), [seed]);
  return (
    <HexWaveBackground
      src={svg}
      drain={false}
      ambient
      colorThreshold={0.05}
      brushRadius={40}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
};

const chipClass = (active: boolean) =>
  cn(
    'rounded-full border px-3 py-1 text-sm transition-colors',
    active
      ? 'border-white/25 bg-white/[0.12] text-white'
      : 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white',
  );

/**
 * One project in the Studio Library: the project tile + name/bpm, its library
 * tags (genre / status / instruments) and collaborator avatars, and a Manage
 * panel to edit those tags, add collaborators (from your connections), or delete
 * the project. Tags/collaborators persist in our project-meta store; delete hits
 * the real projects backend.
 */
export const StudioLibraryCard = ({
  project,
  meta,
  onDeleted,
}: StudioLibraryCardProps) => {
  const navigate = useNavigate();
  const token = useAuthToken();
  const { connections } = useConnectionUsers();
  const { put } = useProjectMetaMutations();

  const [managing, setManaging] = useState(false);
  const [draft, setDraft] = useState<ProjectMeta>(meta);
  const [busy, setBusy] = useState(false);

  const title = project.name || 'Untitled Project';

  // Resolve collaborator ids → display info (name + avatar) via connections.
  const usersById = useMemo(
    () => new Map(connections.map((c) => [c.id, c])),
    [connections],
  );

  const openProject = () =>
    navigate(
      `${StudioRoutes.editor.definition}?project=${encodeURIComponent(project.id)}`,
    );

  const openManage = () => {
    setDraft(meta);
    setManaging(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await put.mutateAsync({ id: project.id, meta: draft });
      setManaging(false);
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!token) return;
    if (!window.confirm(`Delete project “${title}”? This cannot be undone.`))
      return;
    setBusy(true);
    try {
      await studioProjectsApi.remove(token, project.id);
      // Best-effort meta cleanup; the project is already gone either way.
      void fetch(`/api/project-meta/${encodeURIComponent(project.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
      onDeleted();
    } catch (err) {
      showError(
        `Delete failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleInArray = (key: 'instruments' | 'collaborators', value: string) =>
    setDraft((d) => {
      const has = d[key].includes(value);
      return {
        ...d,
        [key]: has ? d[key].filter((v) => v !== value) : [...d[key], value],
      };
    });

  const collaboratorUsers = meta.collaborators
    .map((id) => usersById.get(id))
    .filter((u): u is NonNullable<typeof u> => !!u);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] transition-colors hover:border-white/20">
      {/* Summary row */}
      <div className="flex items-center gap-3 p-3 md:gap-4 md:p-4">
        <button
          type="button"
          onClick={openProject}
          aria-label={`Open ${title}`}
          className="group flex min-w-0 flex-1 items-center gap-3 text-left md:gap-4"
        >
          <div className="relative size-14 flex-shrink-0 overflow-hidden rounded-xl bg-black/30 md:size-16">
            <ProjectHexTile seed={`project:${project.id}`} />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-medium text-white group-hover:underline md:text-base">
              {title}
            </span>
            <span className="block truncate text-xs text-white/55 md:text-sm">
              {project.composerName || `${project.bpm ?? '—'} BPM`}
            </span>
            {/* Saved tags */}
            {(meta.genre || meta.status || meta.instruments.length > 0) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {meta.genre && (
                  <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] text-white/70">
                    {meta.genre}
                  </span>
                )}
                {meta.status && (
                  <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] text-white/70">
                    {meta.status}
                  </span>
                )}
                {meta.instruments.slice(0, 4).map((i) => (
                  <span
                    key={i}
                    className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/55"
                  >
                    {i}
                  </span>
                ))}
              </div>
            )}
          </div>
        </button>

        {/* Collaborator avatars */}
        {collaboratorUsers.length > 0 && (
          <div className="hidden items-center -space-x-2 sm:flex">
            {collaboratorUsers.slice(0, 4).map((u) => (
              <div
                key={u.id}
                title={u.nickname}
                className="size-7 overflow-hidden rounded-full ring-2 ring-[#101012]"
              >
                <HexAvatarSVG
                  config={avatarConfigOrDefault(u.avatarConfig, u.id)}
                  size={28}
                  className="h-full w-full"
                />
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => (managing ? setManaging(false) : openManage())}
          aria-label="Manage project"
          aria-expanded={managing}
          className={cn(
            'flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
            managing
              ? 'border-white/25 bg-white/[0.1] text-white'
              : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:text-white',
          )}
        >
          <Settings2 className="size-4" />
          <span className="hidden md:inline">Manage</span>
        </button>
      </div>

      {/* Manage panel */}
      {managing && (
        <div className="flex flex-col gap-4 border-t border-white/10 p-4 md:p-5">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-white/50">
              Genre
            </span>
            <div className="flex flex-wrap gap-2">
              {PROJECT_GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({ ...d, genre: d.genre === g ? '' : g }))
                  }
                  className={chipClass(draft.genre === g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-white/50">
              Status
            </span>
            <div className="flex flex-wrap gap-2">
              {PROJECT_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({ ...d, status: d.status === s ? '' : s }))
                  }
                  className={chipClass(draft.status === s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-white/50">
              Instruments
            </span>
            <div className="flex flex-wrap gap-2">
              {PROJECT_INSTRUMENTS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleInArray('instruments', i)}
                  className={chipClass(draft.instruments.includes(i))}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/50">
              <Users className="size-3.5" /> Collaborators
            </span>
            {connections.length === 0 ? (
              <p className="text-sm text-white/50">
                Connect with musicians on your profile to add them here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {connections.map((c) => {
                  const selected = draft.collaborators.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleInArray('collaborators', c.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors',
                        selected
                          ? 'border-white/25 bg-white/[0.12] text-white'
                          : 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white',
                      )}
                    >
                      <span className="size-6 overflow-hidden rounded-full">
                        <HexAvatarSVG
                          config={avatarConfigOrDefault(c.avatarConfig, c.id)}
                          size={24}
                          className="h-full w-full"
                        />
                      </span>
                      {c.nickname}
                      {selected && <Check className="size-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={del}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            >
              <Trash2 className="size-4" />
              Delete
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setManaging(false)}
                disabled={busy}
                className="rounded-full px-4 py-1.5 text-sm text-white/70 transition-colors hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
