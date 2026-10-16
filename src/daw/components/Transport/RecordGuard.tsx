import { useEffect } from 'react';
import {
  confirmRecordRequest,
  dismissRecordRequest,
  useRecordRequest,
} from '@/daw/commands/requestRecord';
import { ConfirmDialog } from '@/daw/ui/ConfirmDialog';

// ── RecordGuard ─────────────────────────────────────────────────────────────
// The overwrite confirm behind requestRecord(). DawApp mounts it once at the
// editor root, outside any one view, so the Record button and the R key get
// the same question in every view, the practice screen included.

export function RecordGuard() {
  const request = useRecordRequest();

  // A question still open when the student left the editor (browser Back
  // works under the dialog), or asked while no guard was mounted, must not
  // pop up in the next editor, nor start its take there.
  useEffect(() => {
    dismissRecordRequest();
    return dismissRecordRequest;
  }, []);

  // Continue settles the request itself (it may ask again, for a track armed
  // meanwhile), so only Cancel, Escape and the like drop it here.
  return (
    <ConfirmDialog
      open={request !== null}
      onOpenChange={() => {}}
      title="Overwrite existing recording?"
      description="This track already has a recording. Starting a new recording will overwrite any audio it rolls over in time."
      confirmLabel="Continue"
      danger
      onConfirm={() => {
        if (request) confirmRecordRequest(request);
      }}
      onCancel={dismissRecordRequest}
    />
  );
}
