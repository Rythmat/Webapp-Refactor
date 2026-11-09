import { create } from 'zustand';
import { libraryAudioBlob } from '@/daw/library/audioLibrary';

// ── Small helpers for the Library panel ────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** A day heading, as Suno groups its lists: 'Today', 'Yesterday', 'Oct 21, 2026'. */
export function dayLabel(t: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(t)) / DAY_MS);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return new Date(t).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Items grouped by day, in their order. */
export function groupByDay<T>(
  items: readonly T[],
  timeOf: (item: T) => number,
  now = Date.now(),
): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = dayLabel(timeOf(item), now);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

/** '3m ago', '1d, 3h ago', as Suno's Studio Projects say it. */
export function timeAgo(t: number, now = Date.now()): string {
  const mins = Math.max(0, Math.floor((now - t) / 60_000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  if (days < 30) return rest ? `${days}d, ${rest}h ago` : `${days}d ago`;
  return dayLabel(t, now);
}

/** '0:32', '3:05'. */
export function clock(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** A file extension for a download of `contentType`. */
export function extensionOf(contentType: string): string {
  if (/wav/i.test(contentType)) return 'wav';
  if (/webm|opus/i.test(contentType)) return 'webm';
  if (/mpeg|mp3/i.test(contentType)) return 'mp3';
  if (/mp4|m4a|aac/i.test(contentType)) return 'm4a';
  if (/flac/i.test(contentType)) return 'flac';
  if (/ogg/i.test(contentType)) return 'ogg';
  return 'audio';
}

// ── Preview: one item plays at a time ──────────────────────────────────────

interface PreviewState {
  playingId: string | null;
}

export const useLibraryPreview = create<PreviewState>()(() => ({
  playingId: null,
}));

let audio: HTMLAudioElement | null = null;
let url: string | null = null;

/** Stops the preview. */
export function stopPreview(): void {
  audio?.pause();
  if (url) URL.revokeObjectURL(url);
  audio = null;
  url = null;
  useLibraryPreview.setState({ playingId: null });
}

/** Plays an item's audio, or stops it when it is the one playing. */
export async function togglePreview(id: string): Promise<void> {
  const playing = useLibraryPreview.getState().playingId;
  stopPreview();
  if (playing === id) return;
  const blob = await libraryAudioBlob(id);
  if (!blob) return;
  url = URL.createObjectURL(blob);
  audio = new Audio(url);
  audio.addEventListener('ended', stopPreview, { once: true });
  useLibraryPreview.setState({ playingId: id });
  await audio.play().catch(stopPreview);
}
