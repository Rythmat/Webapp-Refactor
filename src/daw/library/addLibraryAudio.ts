import { notice } from '@/daw/shell/notice';
import { addAudioTrack } from '@/daw/shell/tracklist/uploadTrack';
import { getDecodeContext } from '@/lib/studio-assets/load-audio';
import { getLibraryAudio } from './audioLibrary';

/**
 * Puts a Library stem or upload in the song: a new Audio Track with it as
 * one clip at `startTick` (bar 1 from the row's Add; the bar under the
 * pointer from a drop), in one undo step. Resolves to the track's id, ''
 * when it could not be added (having said why).
 */
export async function addLibraryAudio(
  itemId: string,
  startTick = 0,
): Promise<string> {
  const item = await getLibraryAudio(itemId);
  if (!item) {
    notice({
      title: 'That item isn’t in your Library any more',
      variant: 'destructive',
    });
    return '';
  }
  const bytes = await item.blob.arrayBuffer();
  let buffer: AudioBuffer;
  try {
    // decodeAudioData detaches its input: keep the bytes for the draft.
    buffer = await getDecodeContext().decodeAudioData(bytes.slice(0));
  } catch (err) {
    console.warn('[library] audio could not be decoded', err);
    notice({
      title: 'That audio couldn’t be read',
      description: item.name,
      variant: 'destructive',
    });
    return '';
  }
  return addAudioTrack({
    name: item.name,
    bytes,
    contentType: item.contentType,
    buffer,
    startTick,
    undoLabel: 'Add from Library',
  });
}
