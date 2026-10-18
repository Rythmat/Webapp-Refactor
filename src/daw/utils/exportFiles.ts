// ── Exported files' names and downloads (milestone 2.15) ───────────────────
//
// Every export names its file after the song (and the track, for one
// track's export), in the same lower-case, dash-joined form, so a student's
// downloads folder sorts a song's files together: 'my-song.wav',
// 'my-song-bass.mid', 'my-song-stems.zip'. Pure but for the download.

/** `text` as a file name's part: lower case, dashes, nothing else. */
export function fileSlug(text: string, fallback: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

/** The song's name as a file name's base ('mixdown' when it has none). */
export function songSlug(projectName: string | null | undefined): string {
  return fileSlug(projectName ?? '', 'mixdown');
}

/** Hands `blob` to the browser as a download named `filename`. */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on a later tick, so the download has started by then.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
