import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Reorder } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useStore } from '@/daw/store';
import { TrackHeader } from '../TrackControls/TrackHeader';
import { AddTrackMenu } from '../Mixer/AddTrackMenu';
import { Timeline, TRACK_HEIGHT, RULER_HEIGHT, CHORD_RULER_HEIGHT, TIME_RULER_HEIGHT } from './Timeline';

export function TimelineWithHeaders() {
  const tracks = useStore((s) => s.tracks);
  const reorderTrack = useStore((s) => s.reorderTrack);
  const [menuOpen, setMenuOpen] = useState(false);
  const headersRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const handleHeadersScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (headersRef.current && timelineRef.current) {
      timelineRef.current.scrollTop = headersRef.current.scrollTop;
    }
    requestAnimationFrame(() => { syncing.current = false; });
  }, []);

  const handleTimelineScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    if (headersRef.current && timelineRef.current) {
      headersRef.current.scrollTop = timelineRef.current.scrollTop;
    }
    requestAnimationFrame(() => { syncing.current = false; });
  }, []);

  // Reorder handler: Framer Motion gives us the reordered array of track values.
  // We find which track moved and to where, then call reorderTrack.
  const handleReorder = useCallback(
    (newOrder: string[]) => {
      // Find what changed
      for (let i = 0; i < newOrder.length; i++) {
        if (tracks[i]?.id !== newOrder[i]) {
          const trackId = newOrder[i];
          reorderTrack(trackId, i);
          break;
        }
      }
    },
    [tracks, reorderTrack],
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Track headers column */}
      <div
        ref={headersRef}
        onScroll={handleHeadersScroll}
        className="w-[200px] shrink-0 flex flex-col overflow-y-auto border-r glass-panel-sm"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          scrollbarWidth: 'none',
        }}
      >
        {/* Ruler spacer (sticky to match canvas ruler) */}
        <div
          style={{
            height: RULER_HEIGHT + CHORD_RULER_HEIGHT,
            minHeight: RULER_HEIGHT + CHORD_RULER_HEIGHT,
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: 'var(--color-surface)',
          }}
          className="shrink-0 border-b"
          aria-hidden
        />

        <Reorder.Group
          axis="y"
          values={tracks.map((t) => t.id)}
          onReorder={handleReorder}
          className="flex flex-col"
          style={{ listStyle: 'none', margin: 0, padding: 0 }}
        >
          {tracks.map((track, i) => (
            <Reorder.Item
              key={track.id}
              value={track.id}
              style={{ height: TRACK_HEIGHT, minHeight: TRACK_HEIGHT }}
              dragListener={true}
              className="cursor-grab active:cursor-grabbing"
            >
              <TrackHeader track={track} index={i} />
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {/* Add Track button */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-1.5 mx-3 mt-2 mb-2 px-2 py-1.5 rounded-md text-[10px] font-medium cursor-pointer"
          style={{
            color: 'var(--color-text-dim)',
            backgroundColor: 'transparent',
            border: '1px dashed rgba(255,255,255,0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          }}
        >
          <Plus size={12} strokeWidth={1.5} />
          Add Track
        </button>

        {/* Time ruler spacer (sticky to match canvas time ruler) */}
        <div
          style={{
            height: TIME_RULER_HEIGHT,
            minHeight: TIME_RULER_HEIGHT,
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            backgroundColor: 'var(--color-surface)',
          }}
          className="shrink-0 border-t"
          aria-hidden
        />

        {menuOpen && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMenuOpen(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <AddTrackMenu onClose={() => setMenuOpen(false)} />
            </div>
          </div>,
          document.body,
        )}
      </div>

      {/* Timeline canvas */}
      <div
        ref={timelineRef}
        onScroll={handleTimelineScroll}
        className="flex-1 overflow-auto"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <Timeline />
      </div>
    </div>
  );
}
