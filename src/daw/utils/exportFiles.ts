// ── Exported files' names and downloads (milestone 2.15) ───────────────────
//
// Every export names its file after the song (and the track, for one
// track's export), in the same lower-case, dash-joined form, so a student's
// downloads folder sorts a song's files together: 'my-song.wav',
// 'my-song-bass.mid', 'my-song-stems.zip'. Pure but for the download.

/**
 * `text` as a file name's part: lower case, with each run of anything but
 * letters, digits and combining marks (spaces, punctuation, the characters
 * file systems reject) made one dash. Letters of any script stay, so
 * 'キーボード' stays 'キーボード' and 'Café' becomes 'café'; an ASCII name
 * slugs as it always has ('Rock & Roll!' → 'rock-roll'). NFKC folds
 * full-width and other compatibility forms first ('ＡＢＣ' → 'abc').
 */
export function fileSlug(text: string, fallback: string): string {
  const slug = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
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
