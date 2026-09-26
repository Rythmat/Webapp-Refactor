/**
 * ClassroomSettingsDialog — teacher/tenant config for the Classroom feature:
 * the Annual-Plan controls (calendar language, school calendar, seed/reset the
 * canonical curriculum), the four Atlas module URLs, IMPACT-values visibility,
 * localContext mode + tenant text, the default age preset, and plan
 * export/restore ("Download my plan"). Reachable from the Annual Plan header;
 * the plan-specific controls are threaded in as props and only render once a
 * plan has been seeded.
 */
import {
  CalendarClock,
  Download,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { useMe } from '@/hooks/data';
import type { StudentLanguage } from '../types';
import {
  exportTeacherBackup,
  parseTeacherBackup,
  restoreTeacherBackup,
} from './planBackup';
import {
  useTeacherConfig,
  type AtlasModule,
  type LocalContextMode,
} from './useTeacherConfig';

const exportPlan = async (userId: string | null) => {
  try {
    // Async on purpose: the annual plan and published days live in IndexedDB,
    // and a synchronous read before hydration silently returns an empty store.
    const backup = await exportTeacherBackup(userId);
    const count = Object.keys(backup.stores).length;
    if (count === 0) {
      toast.error('Nothing to back up yet.');
      return;
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atlas-classroom-plan.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      `Downloaded ${count} store${count === 1 ? '' : 's'}, including your Unit plan`,
    );
  } catch {
    toast.error('Could not build a backup');
  }
};

const restorePlan = async (userId: string | null, file: File) => {
  try {
    const backup = parseTeacherBackup(await file.text());
    const { restored, skipped } = await restoreTeacherBackup(userId, backup);
    if (restored.length === 0) {
      toast.error('That backup contained nothing this version can restore.');
      return;
    }
    toast.success(
      `Restored ${restored.length} store${restored.length === 1 ? '' : 's'}${
        skipped.length ? ` (${skipped.length} unknown skipped)` : ''
      } — reload to refresh`,
    );
  } catch (err) {
    toast.error(
      err instanceof Error ? err.message : 'Could not read that file',
    );
  }
};

const MODULES: AtlasModule[] = ['globe', 'learn', 'studio', 'arcade'];
const LOCAL_MODES: LocalContextMode[] = ['show', 'hide', 'replace'];

interface ClassroomSettingsDialogProps {
  /** Scopes per-section settings (age preset, language, IMPACT toggle). */
  classroomId: string;
  onClose: () => void;
  /** Whether an annual plan exists — gates the Annual-plan control section. */
  planSeeded: boolean;
  language: StudentLanguage;
  onLanguageChange: (v: StudentLanguage) => void;
  /** Open the school-calendar editor (holidays + breaks). */
  onOpenSchoolCalendar: () => void;
  /** Fill the canonical curriculum's lesson days into the units. */
  onUseCanonical: () => void;
  /** Reset the unit tree to the canonical template. */
  onReset: () => void;
}

export const ClassroomSettingsDialog = ({
  classroomId,
  onClose,
  planSeeded,
  language,
  onLanguageChange,
  onOpenSchoolCalendar,
  onUseCanonical,
  onReset,
}: ClassroomSettingsDialogProps) => {
  const { config, setConfig, setClassroomConfig } =
    useTeacherConfig(classroomId);
  const { data: me } = useMe();
  // Published days are a PER-USER store; backing up under the wrong scope
  // would produce a file that restores into a different bucket.
  const userId = me?.id ?? null;
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

        {/* Annual plan — controls moved out of the calendar header. Only the
            language toggle + curriculum actions that need a seeded plan. */}
        {planSeeded && (
          <section className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-wider text-white/40">
              Annual plan
            </span>
            <div className="flex items-center justify-between gap-2 text-sm text-white/70">
              Calendar language
              <LanguageToggle value={language} onChange={onLanguageChange} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenSchoolCalendar}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/25 hover:text-white"
                title="Edit school calendar (holidays + breaks)"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                School calendar
              </button>
              <button
                type="button"
                onClick={onUseCanonical}
                className="inline-flex items-center gap-2 rounded-full border border-[#7ecfcf]/40 bg-[#7ecfcf]/[0.08] px-3 py-1.5 text-xs font-medium text-[#7ecfcf] transition-colors hover:border-[#7ecfcf]/70"
                title="Fill the canonical curriculum's lesson days into your units (keeps your own lessons)"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Use canonical curriculum
              </button>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-red-400/40 hover:text-red-200"
                title="Reset to canonical template"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to template
              </button>
            </div>
          </section>
        )}

        {/* Module URLs */}
        <section className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-white/40">
            Atlas module links
          </span>
          {MODULES.map((m) => (
            <label key={m} className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 capitalize text-white/60">
                {m}
              </span>
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
            Age preset for this class
            <select
              value={config.agePresetDefault}
              onChange={(e) =>
                // PER SECTION, not tenant-wide: a teacher with a middle-school
                // and a college section wants different type scales, which is
                // exactly what AgePreset is for.
                setClassroomConfig({
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
              onClick={() => void exportPlan(userId)}
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
                if (f) void restorePlan(userId, f);
                e.target.value = '';
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

interface LanguageToggleProps {
  value: StudentLanguage;
  onChange: (v: StudentLanguage) => void;
}

const LanguageToggle = ({ value, onChange }: LanguageToggleProps) => {
  const options: { value: StudentLanguage; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'es', label: 'ES' },
    { value: 'both', label: 'EN / ES' },
  ];
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] p-0.5"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={opt.value === value}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            opt.value === value
              ? 'bg-white text-black'
              : 'text-white/60 hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
