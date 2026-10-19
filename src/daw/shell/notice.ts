import { toast } from 'sonner';

// ── A notice the student sees (milestone 2.14) ─────────────────────────────
//
// The app mounts Sonner's Toaster (AppContext) and nothing renders the
// older '@/hooks/use-toast' store, so a toast sent there is never shown.
// New editor code says things here; the old callers are the owner's to move
// (STATUS, 2.14).

export interface Notice {
  title: string;
  description?: string;
  /** Something didn't happen: shown as an error. */
  variant?: 'destructive';
}

export function notice({ title, description, variant }: Notice): void {
  if (variant === 'destructive') toast.error(title, { description });
  else toast(title, { description });
}
