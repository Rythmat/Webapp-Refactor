import { useEffect } from 'react';
import {
  confirmRecordRequest,
  dismissRecordRequest,
  useRecordRequest,
} from '@/daw/commands/requestRecord';
import { ConfirmModal } from '@/daw/components/common/ConfirmModal';

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

  // ConfirmModal reports the close, which drops the request, before the
  // confirm, so Continue starts the take this render showed.
  const onConfirm = () => {
    if (request) confirmRecordRequest(request);
  };

  return (
    <ConfirmModal
      open={request !== null}
      onOpenChange={(next) => {
        if (!next) dismissRecordRequest();
      }}
      title="Overwrite existing recording?"
      description="This track already has a recording. Starting a new recording will overwrite any audio it rolls over in time."
      confirmLabel="Continue"
      cancelLabel="Cancel"
      destructive
      onConfirm={onConfirm}
    />
  );
}
