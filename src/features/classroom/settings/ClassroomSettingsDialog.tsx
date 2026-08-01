/**
 * ClassroomSettingsDialog — teacher/tenant config for the Classroom feature:
 * the four Atlas module URLs, IMPACT-values visibility, localContext mode +
 * tenant text, the default age preset, and plan export/restore ("Download my
 * plan"). Reachable from the Annual Plan header.
 */
import { Download, Upload, X } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import {
  useTeacherConfig,
  type AtlasModule,
  type LocalContextMode,
} from './useTeacherConfig';

const EXPORT_KEYS = [
  'ma-teacher:plan:v1',
  'ma-teacher:annualPlan:v1',
  'ma-teacher:settings:v1',
  'ma-teacher:activities:personal:v1',
  'ma-teacher:clos:personal:v1',
  'ma-teacher:themes:personal:v1',
  'ma-teacher:seeds:personal:v1',
];

const exportPlan = () => {
  const stores: Record<string, unknown> = {};
  for (const key of EXPORT_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      try {
        stores[key] = JSON.parse(raw);
      } catch {
        // skip malformed
      }
    }
  }
  const payload = { version: 1, stores };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'atlas-classroom-plan.json';
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Plan downloaded');
};

const restorePlan = (file: File) => {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result)) as {
        stores?: Record<string, unknown>;
      };
      const stores = parsed.stores ?? {};
      let n = 0;
      for (const [key, value] of Object.entries(stores)) {
        if (!EXPORT_KEYS.includes(key)) continue;
        window.localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new Event(`${key}:changed`));
        n += 1;
      }
      toast.success(`Restored ${n} store${n === 1 ? '' : 's'} — reload to refresh`);
    } catch {
      toast.error('Could not read that file');
    }
  };
  reader.readAsText(file);
};

const MODULES: AtlasModule[] = ['globe', 'learn', 'studio', 'arcade'];
const LOCAL_MODES: LocalContextMode[] = ['show', 'hide', 'replace'];

interface ClassroomSettingsDialogProps {
  onClose: () => void;
}

export const ClassroomSettingsDialog = ({
  onClose,
}: ClassroomSettingsDialogProps) => {
  const { config, setConfig } = useTeacherConfig();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">
            Classroom settings
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Module URLs */}
        <section className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-white/40">
            Atlas module links
          </span>
          {MODULES.map((m) => (
            <label key={m} className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 capitalize text-white/60">{m}</span>
              <input
                value={config.moduleUrls[m]}
                onChange={(e) =>
                  setConfig({
                    moduleUrls: { ...config.moduleUrls, [m]: e.target.value },
                  })
                }
                placeholder={`/${m === 'globe' ? 'atlas/globe' : m}`}
                className="flex-1 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
              />
            </label>
          ))}
        </section>

        {/* Display toggles */}
        <section className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-wider text-white/40">
            Display
          </span>
          <label className="flex items-center justify-between gap-2 text-sm text-white/70">
            Show IMPACT values
            <input
              type="checkbox"
              checked={config.impactVisible}
              onChange={(e) => setConfig({ impactVisible: e.target.checked })}
              className="size-4 accent-white"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm text-white/70">
            Local context
            <select
              value={config.localContextMode}
              onChange={(e) =>
                setConfig({
                  localContextMode: e.target.value as LocalContextMode,
                })
              }
              className="rounded-md border border-white/10 bg-[#1a1a1c] px-2 py-1 text-xs text-white focus:border-white/25 focus:outline-none"
            >
              {LOCAL_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          {config.localContextMode === 'replace' && (
            <textarea
              value={config.tenantLocalContext}
              onChange={(e) =>
                setConfig({ tenantLocalContext: e.target.value })
              }
              placeholder="Your local scene to use instead of the Denver examples…"
              rows={2}
              className="w-full resize-y rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
            />
          )}
          <label className="flex items-center justify-between gap-2 text-sm text-white/70">
            Default age preset
            <select
              value={config.agePresetDefault}
              onChange={(e) =>
                setConfig({
                  agePresetDefault: e.target
                    .value as typeof config.agePresetDefault,
                })
              }
              className="rounded-md border border-white/10 bg-[#1a1a1c] px-2 py-1 text-xs text-white focus:border-white/25 focus:outline-none"
            >
              <option value="middle">Middle</option>
              <option value="high">High</option>
              <option value="college">College</option>
            </select>
          </label>
        </section>

        {/* Backup */}
        <section className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-white/40">
            Backup
          </span>
          <p className="text-xs text-white/40">
            Everything lives in this browser. Download a copy weekly.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportPlan}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
            >
              <Download className="h-4 w-4" />
              Download my plan
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
            >
              <Upload className="h-4 w-4" />
              Restore…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) restorePlan(f);
                e.target.value = '';
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
};
