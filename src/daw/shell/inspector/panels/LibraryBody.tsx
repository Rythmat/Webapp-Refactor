import { LibraryPart } from '@/daw/shell/lazyParts';

// ── The Library panel ──────────────────────────────────────────────────────
//
// The side rail's Library (owner, 2026-10-23: after Suno Studio's Library):
// the user's projects, stems and uploads (shell/inspector/library). Parts,
// grooves, drum kits, presets and templates left it; their browser
// (shell/inspector/browser) is no longer mounted here. Its body is a chunk
// of its own, loaded when the panel first shows.

export function LibraryBody() {
  return <LibraryPart />;
}
