import { setAudioBuffer, getAudioBuffer } from '@/daw/audio/AudioBufferStore';
import { samplerBufferKey } from '@/daw/instruments/samplerChops';
import {
  decodeCloudProject,
  decodeStoredSession,
  type CloudProjectDetail,
  type DecodedSession,
} from '@/daw/persistence/SessionSerializer';
import {
  getDecodeContext,
  loadAudioForTracks,
} from '@/lib/studio-assets/load-audio';
import { getDraftStore } from '@/lib/studio-projects/drafts/draftStore';
import type { DraftMeta } from '@/lib/studio-projects/drafts/types';
import { studioProjectsApi } from '@/lib/studio-projects/projectsClient';
import { sessionDisplayName } from '@/lib/studio-projects/sessionName';
import { cloudVersion, type LibrarySource } from '../libraryTypes';

// ── A project, read for the Library without opening it ─────────────────────
// The editor's own decoders (decodeCloudProject, decodeStoredSession), which
// leave the store, the Oracle patch cache and the session alone, so a play
// in the Library never touches what the Studio has open. Its audio is linked
// and fetched into the page's asset store, by clip id, as an open would.

export type PreviewProject = DecodedSession['project'];

export interface LoadedPreview {
  project: PreviewProject;
  synthStates: Map<string, DecodedSession['synthPatches'][number][1]>;
  name: string;
  /** The version read: what a render of it is cached under. */
  version: string;
}

/** Just the version, cheaply, where it can be had without the project
 *  (a draft's meta). Null: the project must be read to know it. */
export async function draftVersion(draftId: string): Promise<string | null> {
  const meta = await getDraftStore().getMeta(draftId);
  return meta ? `t${meta.updatedAt}` : null;
}

/** A draft's audio that never went up: its bytes are in the draft store. */
async function restoreDraftAudio(meta: DraftMeta): Promise<void> {
  const store = getDraftStore();
  for (const ref of meta.media ?? []) {
    const keys = [
      ...ref.clipIds,
      ...ref.samplerSampleIds.map(samplerBufferKey),
    ].filter((key) => !getAudioBuffer(key));
    if (keys.length === 0) continue;
    try {
      const record = await store.getMedia(meta.userKey, ref.mediaId);
      if (!record) continue;
      const bytes = await record.blob.arrayBuffer();
      const buffer = await getDecodeContext().decodeAudioData(bytes);
      for (const key of keys) setAudioBuffer(key, buffer);
    } catch (err) {
      // Heard without that take, rather than not at all.
      console.warn('[library] A recording could not be restored', err);
    }
  }
}

function fromDecoded(
  decoded: DecodedSession,
  name: string,
  version: string,
): LoadedPreview {
  return {
    project: decoded.project,
    synthStates: new Map(decoded.synthPatches),
    name,
    version,
  };
}

/** Read the session, without its audio. Throws when it can't be read. */
async function readPreviewProject(
  source: LibrarySource,
  token: string | null,
  signal?: AbortSignal,
): Promise<LoadedPreview & { draft: DraftMeta | null }> {
  if (source.kind === 'cloud') {
    if (!token) throw new Error('Sign in to play your saved projects.');
    const detail = await studioProjectsApi.get(token, source.projectId, {
      signal,
    });
    const decoded = decodeCloudProject(detail as unknown as CloudProjectDetail);
    return {
      ...fromDecoded(
        decoded,
        sessionDisplayName(detail.name),
        cloudVersion(detail),
      ),
      draft: null,
    };
  }

  const store = getDraftStore();
  const [meta, body] = await Promise.all([
    store.getMeta(source.draftId),
    store.readBody(source.draftId),
  ]);
  if (!meta || !body)
    throw new Error('That project is no longer on this device.');
  const decoded = decodeStoredSession(body.text);
  if (!decoded) throw new Error('This version of Music Atlas can’t read it.');
  return {
    ...fromDecoded(
      decoded,
      sessionDisplayName(meta.name),
      `t${meta.updatedAt}`,
    ),
    draft: meta,
  };
}

/** Read the project and its audio, ready to render. Throws when it can't
 *  be read. */
export async function loadPreviewProject(
  source: LibrarySource,
  token: string | null,
  signal?: AbortSignal,
): Promise<LoadedPreview> {
  const { draft, ...loaded } = await readPreviewProject(source, token, signal);
  if (draft) await restoreDraftAudio(draft);
  await loadAudioForTracks(loaded.project.tracks, token);
  return loaded;
}
