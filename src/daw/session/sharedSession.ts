import { getBridge } from '@/daw/collab/collabMiddleware';
import { useStore } from '@/daw/store';

/**
 * Whether the editor is in a shared session: one where replacing the project
 * (a template, kept work brought back) would replace it for everyone in the
 * room, or be replaced in turn by the room's project once a join completes.
 *
 * It is while a room is joined: the bridge to the room stays attached while
 * it connects and reconnects. A guest's room identity without a bridge is
 * one too: a join waiting for its host between retries, the prompt after the
 * host left, or a return to the editor before its boot rejoins the room. A
 * host's identity without a bridge is not: a host leaving the editor closes
 * the room for everyone and nothing rejoins it (the boot rejoins guests
 * only), so the project is the host's own again, and the editor shows no
 * Leave button to press.
 */
export function inSharedSession(): boolean {
  const { roomId, collabRole } = useStore.getState();
  return getBridge() !== null || (roomId !== null && collabRole !== 'owner');
}
