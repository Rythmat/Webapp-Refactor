/**
 * SchoolCalendarDialog — teacher-facing editor for the classroom's non-school
 * days. Lists federal + break defaults with a Remove/Restore toggle per row
 * and provides a small form to add custom non-school days (e.g. "Teacher work
 * day"). Weekends are not listed — they're implicit.
 */
import { Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { resolveSchoolYear } from './calendarMath';
import {
  getDefaultNonSchoolDaysForYear,
  type NonSchoolDay,
  type SchoolCalendarExceptions,
} from './schoolCalendar';

interface SchoolCalendarDialogProps {
  exceptions: SchoolCalendarExceptions;
  onAdd: (date: string, label: string) => void;
  onRemove: (date: string) => void;
  onRestore: (date: string) => void;
  onClose: () => void;
}

const KIND_LABEL: Record<NonSchoolDay['kind'], string> = {
  weekend: 'Weekend',
  federal: 'Federal',
  break: 'Break',
  custom: 'Custom',
};

export const SchoolCalendarDialog = ({
  exceptions,
  onAdd,
  onRemove,
  onRestore,
  onClose,
}: SchoolCalendarDialogProps) => {
  const [newDate, setNewDate] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const schoolYear = useMemo(() => resolveSchoolYear(new Date()), []);

  const rows = useMemo(() => {
    // Build the display list: all non-weekend defaults for both years in the
    // school year, plus custom additions, ordered ascending by date. Weekends
    // are implicit — never shown.
    const defaults: NonSchoolDay[] = [];
    for (const y of [schoolYear.autumn, schoolYear.spring]) {
      for (const d of getDefaultNonSchoolDaysForYear(y)) {
        if (d.kind === 'weekend') continue;
        defaults.push(d);
      }
    }
    // De-duplicate by date (Winter break spans both years).
    const byDate = new Map<string, NonSchoolDay>();
    for (const d of defaults) byDate.set(d.date, d);
    for (const a of exceptions.additions) byDate.set(a.date, a);
    // Filter to the school-year window (Aug 1 autumn – Jul 31 spring — a wide
    // umbrella that still keeps out unrelated Independence Day of the *next*
    // year etc.).
    const windowStart = `${schoolYear.autumn}-08-01`;
    const windowEnd = `${schoolYear.spring}-07-31`;
    const inWindow = Array.from(byDate.values()).filter(
      (d) => d.date >= windowStart && d.date <= windowEnd,
    );
    inWindow.sort((a, b) => a.date.localeCompare(b.date));
    return inWindow;
  }, [exceptions, schoolYear]);

  const removedSet = useMemo(
    () => new Set(exceptions.removals),
    [exceptions.removals],
  );
  const additionsSet = useMemo(
    () => new Set(exceptions.additions.map((a) => a.date)),
    [exceptions.additions],
  );

  const handleAdd = () => {
    const trimmed = newLabel.trim();
    if (!newDate || !trimmed) return;
    onAdd(newDate, trimmed);
    setNewDate('');
    setNewLabel('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 rounded-2xl border border-white/10 bg-[#141416] p-6 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-medium">School calendar</h3>
            <p className="text-xs text-white/60">
              Federal holidays + typical K-12 breaks for the {schoolYear.autumn}
              –{schoolYear.spring} school year. Weekends are always non-school.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#141416] text-left text-xs uppercase tracking-wide text-white/40">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isRemoved = removedSet.has(r.date);
                const isCustom = additionsSet.has(r.date);
                return (
                  <tr
                    key={r.date}
                    className={`border-t border-white/[0.04] ${
                      isRemoved ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-3 py-2 tabular-nums text-white/80">
                      {r.date}
                    </td>
                    <td className="px-3 py-2 text-white/80">{r.label}</td>
                    <td className="px-3 py-2 text-xs text-white/50">
                      {KIND_LABEL[r.kind]}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isRemoved ? (
                        <button
                          type="button"
                          onClick={() => onRestore(r.date)}
                          className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/70 hover:border-white/25 hover:text-white"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRemove(r.date)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                            isCustom
                              ? 'border-red-400/30 text-red-200 hover:border-red-400/60'
                              : 'border-white/10 text-white/70 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          <Trash2 className="h-3 w-3" />
                          {isCustom ? 'Delete' : 'Remove'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <h4 className="text-xs uppercase tracking-wide text-white/50">
            Add a non-school day
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5 text-xs text-white/80 outline-none focus:border-white/30"
              aria-label="Date"
            />
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Teacher work day"
              className="flex-1 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5 text-xs text-white/80 outline-none focus:border-white/30"
              aria-label="Label"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newDate || !newLabel.trim()}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-white/85 disabled:opacity-40 disabled:hover:bg-white"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
