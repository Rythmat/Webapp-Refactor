import { Search, X } from 'lucide-react';
import type { FC } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export const SearchInput: FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search artist name or song title',
}) => {
  return (
    <div
      className="flex items-center"
      style={{
        flex: 1,
        minWidth: 200,
        height: 32,
        padding: '0 12px',
        gap: 8,
        borderRadius: 6,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Search
        width={14}
        height={14}
        style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none"
        style={{
          fontSize: 12,
          color: '#ffffff',
        }}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          aria-label="Clear search"
        >
          <X width={12} height={12} />
        </button>
      )}
    </div>
  );
};
