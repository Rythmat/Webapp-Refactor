# S11: Export menu and version history

**Goal:**

- Export becomes a menu like [s34]. Unlike Suno [s35], each choice shows students where their file goes.
- The project menu gains **Version history** [s36].

**Read first:**

- `shell/export/ExportDialog.tsx`;
- `audio/exportAudio.ts`, `renderProject.ts`;
- `midi/MidiFileIO.ts`, `MusicXmlExport.ts`;
- `persistence/*` (saved versions, drafts).

## Build

1. **Export menu:**

   - **Song**: the whole song;
   - **Selection**: the loop or selected range;
   - **Stems**: a multitrack zip;
   - **Notation**: MIDI or MusicXML.

   Each opens the existing dialog preset to that choice, so we keep its format, mastering and progress/cancel features. Exports keep the AI-generated credit metadata from S8.

2. **Version history:**
   - A panel or sheet listing saved versions (time, who, an auto/manual tag).
   - Preview a version read-only; restore it as a new version.
   - Uses the saves we already keep. No new storage unless the owner asks.

## Verify

- vitest: the export menu model, version-list model.
- Golden renders unchanged.
- Chrome: each export choice downloads the right file; restoring a version works and can be undone.
