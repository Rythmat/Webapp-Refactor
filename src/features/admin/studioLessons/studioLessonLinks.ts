import { MIRROR_BASE } from '../content/mirror/mirrorPaths';

/** A lesson running in the console's Studio, as last saved (drafts too). */
export const previewHref = (id: string) =>
  `${MIRROR_BASE}/studio?tutorial=${encodeURIComponent(id)}`;
