import { useStore } from '@/daw/store';
import { ConfirmModal } from '@/daw/components/common/ConfirmModal';
import { MAX_RECORDING_SECONDS } from '@/daw/audio/recordingLimit';

// ── RecordingLimitModal ─────────────────────────────────────────────────────
// Shown when an audio recording auto-stops at the per-track recording cap.

const LIMIT_MINUTES = Math.round(MAX_RECORDING_SECONDS / 60);

export function RecordingLimitModal() {
  const open = useStore((s) => s.recordingLimitModalOpen);
  const setOpen = useStore((s) => s.setRecordingLimitModalOpen);

  return (
    <ConfirmModal
      open={open}
      onOpenChange={setOpen}
      title="Maximum recording length reached"
      description={`Audio tracks are limited to ${LIMIT_MINUTES} minutes of recording. The first ${LIMIT_MINUTES} minutes were saved; recording has stopped.`}
      confirmLabel="OK"
    />
  );
}
