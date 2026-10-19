import { useCallback } from 'react';
import type { MusicLiteracyLesson } from '@/content/musicLiteracy/schemas';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import type { DrumGroove } from '@/curriculum/engine/drumGrooves/drumGroove';
import type { FeelProfile } from '@/curriculum/engine/parts/feel';
import type { InstrumentPart } from '@/curriculum/engine/parts/part';
import {
  contentRequest,
  type ContentListItem,
  type InstrumentContentKind,
  type MusicLiteracyContentKind,
  useDeleteContentItem,
  useSaveContentItem,
} from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { isContentEditor } from '../consoleRoles';
import {
  rememberLessonDeleted,
  rememberLessonSaved,
} from '../musicLiteracy/literacySession';
import { rememberPartDeleted, rememberPartSaved } from '../parts/partFiles';
import { CAN_WRITE_FILES } from './devFiles';
import { rememberDeleted, rememberSaved } from './grooveSession';

/**
 * Where the Drum Grooves designer, the Parts Library and the Music Literacy
 * editor save (docs/instrument-content-kinds.md,
 * docs/music-literacy-content-kind.md).
 *
 * Through the content system when it serves the kind — repo mode
 * (`VITE_CONTENT_REPO=1`) writes the same JSON files, and the API will once
 * it adds the kinds — so a save is a content save like any other: an
 * editor's lands as a proposal, an admin's is the item. Otherwise, on the
 * dev server, straight to the files (scripts/vite/devContentWriter.ts), the
 * way these pages always have; that path goes once the API serves the
 * kinds. A deployed console with neither can only export.
 */

/** The kinds saved here: the instrument kinds and Music Literacy. */
export type StoredKind = InstrumentContentKind | MusicLiteracyContentKind;

/** Each kind's body, as its editor holds it. */
interface BodyOf {
  drum_groove: DrumGroove;
  instrument_part: InstrumentPart;
  feel_profile: FeelProfile;
  music_literacy: MusicLiteracyLesson;
}

type AnyBody = BodyOf[StoredKind];

/** The dev writer's folder for each kind. */
const DEV_PATH: Record<StoredKind, string> = {
  drum_groove: '/__dev/drum-grooves',
  instrument_part: '/__dev/parts',
  feel_profile: '/__dev/feels',
  music_literacy: '/__dev/music-literacy',
};

async function devCall(url: string, init: RequestInit) {
  // Every write says it is JSON, a DELETE included: the writer refuses any
  // other write with a 415, as the repo content server does.
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? `${res.status} ${res.statusText}`);
}

/** Keep this session's lists current, ahead of the files' reload. */
function remember(kind: StoredKind, body: AnyBody | null, id: string) {
  if (kind === 'drum_groove') {
    if (body) rememberSaved(body as DrumGroove);
    else rememberDeleted(id);
  } else if (kind === 'instrument_part') {
    if (body) rememberPartSaved(body as InstrumentPart);
    else rememberPartDeleted(id);
  } else if (kind === 'music_literacy') {
    if (body) rememberLessonSaved(body as MusicLiteracyLesson);
    else rememberLessonDeleted(id);
  }
}

export function useInstrumentStore() {
  const { token, role } = useAuthContext();
  const caps = useCapabilities();
  const saveItem = useSaveContentItem();
  const deleteItem = useDeleteContentItem();
  const editor = isContentEditor(role);

  /** Whether the content system (repo mode or the API) holds this kind. */
  const served = useCallback((kind: StoredKind) => caps.isServed(kind), [caps]);

  /** Whether this console can save this kind at all. */
  const canSave = useCallback(
    (kind: StoredKind) => served(kind) || CAN_WRITE_FILES,
    [served],
  );

  const save = useCallback(
    async <K extends StoredKind>(kind: K, body: BodyOf[K]) => {
      const status = 'status' in body ? body.status : undefined;
      if (served(kind)) {
        await saveItem.mutateAsync({
          kind,
          slug: body.id,
          body,
          // An editor's save is a proposal; the server decides. A body with
          // a status of its own carries it into the item's.
          status: editor
            ? undefined
            : status === 'draft'
              ? 'draft'
              : 'published',
        });
      } else if (CAN_WRITE_FILES) {
        await devCall(`${DEV_PATH[kind]}/${body.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        throw new Error(
          'This console can’t save these yet: run the dev server (repo mode or not), or wait for the content API to add the kind. Export the JSON instead.',
        );
      }
      remember(kind, body, body.id);
    },
    [served, saveItem, editor],
  );

  const remove = useCallback(
    async (kind: StoredKind, id: string) => {
      if (served(kind)) {
        // The API deletes by its own item id: find it by the slug.
        const { items } = await contentRequest<{ items: ContentListItem[] }>(
          `/items?kind=${kind}&search=${encodeURIComponent(id)}`,
          token!,
        );
        const row = items.find((item) => item.slug === id);
        if (!row) throw new Error(`No ${kind} '${id}' in the content store.`);
        await deleteItem.mutateAsync(row.id);
      } else if (CAN_WRITE_FILES) {
        await devCall(`${DEV_PATH[kind]}/${id}`, { method: 'DELETE' });
      } else {
        throw new Error('This console can’t delete these yet.');
      }
      remember(kind, null, id);
    },
    [served, token, deleteItem],
  );

  return { save, remove, served, canSave };
}
