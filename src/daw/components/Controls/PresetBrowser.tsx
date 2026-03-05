/* eslint-disable tailwindcss/classnames-order */
/* eslint-disable tailwindcss/enforces-shorthand */
import { useState, useMemo } from 'react';
import { Search, Play } from 'lucide-react';
import {
  PRESET_CATEGORIES,
  getPresetsByCategory,
  searchPresets,
  type Preset,
} from '@/daw/data/instrumentPresets';

// ── PresetBrowser ───────────────────────────────────────────────────────

interface PresetBrowserProps {
  onSelect: (preset: Preset) => void;
  onClose: () => void;
}

export function PresetBrowser({ onSelect, onClose }: PresetBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Keyboards');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPresets = useMemo(() => {
    if (searchQuery.trim()) {
      return searchPresets(searchQuery);
    }
    return getPresetsByCategory(selectedCategory);
  }, [selectedCategory, searchQuery]);

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 shrink-0 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          Browse Instruments
        </span>
        <div
          className="flex items-center gap-2 flex-1 max-w-[280px] rounded-lg px-3 py-1.5"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Search size={12} style={{ color: 'var(--color-text-dim)' }} />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-xs"
            style={{ color: 'var(--color-text)' }}
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="text-[10px] px-2 py-1 rounded cursor-pointer"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-text-dim)',
            border: '1px solid var(--color-border)',
          }}
        >
          Close
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Category sidebar */}
        <div
          className="w-[160px] shrink-0 overflow-y-auto py-2 border-r"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {PRESET_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSearchQuery('');
              }}
              className="block w-full text-left px-4 py-1.5 text-xs cursor-pointer transition-colors"
              style={{
                backgroundColor:
                  selectedCategory === cat && !searchQuery
                    ? 'var(--color-surface-2)'
                    : 'transparent',
                color:
                  selectedCategory === cat && !searchQuery
                    ? 'var(--color-text)'
                    : 'var(--color-text-dim)',
                fontWeight:
                  selectedCategory === cat && !searchQuery ? 600 : 400,
                border: 'none',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Preset list */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Category heading */}
          <div className="px-4 pb-2">
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              {searchQuery ? 'Search Results' : selectedCategory}
            </span>
          </div>

          {filteredPresets.length === 0 ? (
            <div
              className="px-4 py-8 text-xs text-center"
              style={{ color: 'var(--color-text-dim)' }}
            >
              No presets found
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onSelect(preset)}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group"
                  style={{ background: 'none', border: 'none' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      'var(--color-surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      'transparent';
                  }}
                >
                  {/* Play preview button */}
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'var(--color-surface-3)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <Play
                      size={12}
                      style={{ color: 'var(--color-text-dim)' }}
                    />
                  </div>
                  <span
                    className="text-sm"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
