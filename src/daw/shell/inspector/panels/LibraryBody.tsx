import { BrowserPart } from '@/daw/shell/lazyParts';

// ── The Library panel (B4a; the browser since milestone 2.14) ─────────────
//
// The side rail's Library is the browser over parts, grooves, drum kits,
// presets and templates (shell/inspector/browser/BrowserPanel.tsx). Its body
// is a chunk of its own, loaded when the panel first shows, so the parts,
// grooves and presets it lists don't load with the editor.

export function LibraryBody() {
  return <BrowserPart />;
}
