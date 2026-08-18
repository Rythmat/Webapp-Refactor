/**
 * ResetChecklistEditor — edits a Reflect-phase content slide's reset checklist
 * (a list of `LocalizedText` tick items). Add / edit (EN) / remove.
 */
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import type { LocalizedText } from '../../types';

interface ResetChecklistEditorProps {
  items: LocalizedText[];
  onChange: (items: LocalizedText[]) => void;
}

export const ResetChecklistEditor = ({
  items,
  onChange,
}: ResetChecklistEditorProps) => {
  const [draft, setDraft] = useState('');

  const patchItem = (index: number, en: string) =>
    onChange(items.map((it, i) => (i === index ? { ...it, en } : it)));

  const addItem = () => {
    if (!draft.trim()) return;
    onChange([...items, { en: draft.trim() }]);
    setDraft('');
  };

  return (
    <ul className="flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-3">
          <input
            type="checkbox"
            disabled
            className="size-5 accent-white opacity-60"
          />
          <input
            value={item.en}
            onChange={(e) => patchItem(i, e.target.value)}
            aria-label={`Checklist item ${i + 1}`}
            className="flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-white/85 outline-none hover:border-white/10 focus:border-white/25"
            style={{ fontSize: 'var(--slide-body-fz)' }}
          />
          <button
            type="button"
            aria-label="Remove item"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="text-white/40 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </li>
      ))}
      <li className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="Add a reset step…"
          className="flex-1 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-sm text-white/70 hover:border-white/25 hover:text-white disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </li>
    </ul>
  );
};
