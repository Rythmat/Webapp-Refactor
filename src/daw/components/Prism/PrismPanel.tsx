import { useState, useCallback } from 'react';
import { Maximize2 } from 'lucide-react';
import { PopOutOverlay } from '@/daw/components/ChannelStrip/PopOutOverlay';
import { PrismStudio } from './PrismStudio';

// ── Component ────────────────────────────────────────────────────────────

export function PrismPanel() {
  const [popOut, setPopOut] = useState(false);
  const openPopOut = useCallback(() => setPopOut(true), []);
  const closePopOut = useCallback(() => setPopOut(false), []);

  return (
    <div className="h-full overflow-y-auto p-3 relative">
      <PrismStudio />

      {/* Pop-out button */}
      <button
        onClick={openPopOut}
        className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-md transition-colors cursor-pointer"
        style={{ color: 'var(--color-text-dim)', border: 'none', background: 'rgba(0,0,0,0.3)' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.3)')}
        title="Open in full screen"
      >
        <Maximize2 size={13} strokeWidth={1.8} />
      </button>

      {/* Full-screen overlay */}
      <PopOutOverlay isOpen={popOut} onClose={closePopOut} title="Prism">
        <div className="h-full overflow-y-auto p-6">
          <PrismStudio />
        </div>
      </PopOutOverlay>
    </div>
  );
}
