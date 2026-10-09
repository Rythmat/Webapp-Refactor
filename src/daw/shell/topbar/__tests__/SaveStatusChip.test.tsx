// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  INITIAL_CLOUD_SAVE_STATE,
  useCloudSaveStore,
} from '@/daw/commands/cloudSaveStore';
import { saveProject } from '@/daw/commands/saveProject';
import {
  INITIAL_DRAFT_STATUS,
  INITIAL_PENDING_MEDIA_STATUS,
  useDraftStatusStore,
} from '@/daw/persistence/drafts/draftStatusStore';
import { useSaveStatusStore } from '@/daw/persistence/saveStatusStore';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';
import { useStore } from '@/daw/store';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { TYPE } from '@/daw/ui/tokens';
import { SaveChipAnnouncer, SaveStatusChip } from '../SaveStatusChip';
import { SAVE_CHIP_WIDTH_PX } from '../saveChipModel';

vi.mock('@/daw/commands/saveProject', () => ({
  saveProject: vi.fn(() =>
    Promise.resolve({
      status: 'failed',
      error: { kind: 'unknown', message: '' },
    }),
  ),
}));

const chip = () => screen.getByTestId('save-chip');
const liveRegion = () => screen.getByRole('status');

function lastSavedNow() {
  return {
    projectId: 'p1',
    fingerprint: 'h1:x',
    version: useSaveStatusStore.getState().documentVersion,
    complete: true,
    updatedAt: null,
    at: 1,
    generation: 0,
  };
}

beforeAll(installDomShims);

beforeEach(() => {
  useStore.setState({ projectId: 'p1' });
  useCloudSaveStore.setState({ ...INITIAL_CLOUD_SAVE_STATE });
  useDraftStatusStore.setState({
    ...INITIAL_DRAFT_STATUS,
    draftId: 'd1',
    media: { ...INITIAL_PENDING_MEDIA_STATUS },
  });
  useSessionStore.setState({ ...INITIAL_SESSION_STATE, phase: 'ready' });
  vi.mocked(saveProject).mockClear();
});

afterEach(cleanup);

describe('SaveStatusChip', () => {
  it('is a fixed 150 px chip in 12 px regular type', () => {
    render(<SaveStatusChip />);
    expect(SAVE_CHIP_WIDTH_PX).toBe(150);
    expect(chip().style.width).toBe('150px');
    expect(chip().className).toContain('text-[length:var(--daw-font-label)]');
    expect(chip().className).toContain('font-normal');
    // No overflow clip: it would cut Retry's focus ring. The text spans
    // truncate instead.
    expect(chip().className).not.toContain('overflow-hidden');
    expect(TYPE.label.size).toBe(12);
    expect(TYPE.label.weight).toBe(400);
  });

  it('exposes its state and reason for the harness', () => {
    render(<SaveStatusChip />);
    expect(chip().dataset.state).toBe('local');
    expect(chip().dataset.reason).toBe('none');
    expect(chip()).toHaveTextContent('Saved on this device');
  });

  it('announces only Saved, Couldn’t save and Audio not saved yet', () => {
    render(<SaveStatusChip />);
    expect(liveRegion()).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion()).toHaveTextContent(/^$/);

    act(() => useDraftStatusStore.setState({ pendingSeq: 1 }));
    expect(chip().dataset.state).toBe('unsaved');
    expect(liveRegion()).toHaveTextContent(/^$/);

    act(() => useCloudSaveStore.setState({ phase: 'saving' }));
    expect(chip().dataset.state).toBe('saving');
    expect(liveRegion()).toHaveTextContent(/^$/);

    act(() => {
      useDraftStatusStore.setState({ committedSeq: 1 });
      useCloudSaveStore.setState({ phase: 'idle', lastSaved: lastSavedNow() });
    });
    expect(chip().dataset.state).toBe('saved');
    expect(liveRegion()).toHaveTextContent('Saved');

    act(() =>
      useCloudSaveStore.setState({
        phase: 'error',
        error: { kind: 'offline', message: 'You’re offline' },
      }),
    );
    expect(chip().dataset.state).toBe('error');
    expect(liveRegion()).toHaveTextContent("Couldn't save");

    act(() =>
      useCloudSaveStore.setState({
        phase: 'idle',
        error: null,
        lastSaved: null,
      }),
    );
    expect(chip().dataset.state).toBe('local');
    expect(liveRegion()).toHaveTextContent(/^$/);

    act(() =>
      useDraftStatusStore.setState({
        media: { ...INITIAL_PENDING_MEDIA_STATUS, missing: 1 },
      }),
    );
    expect(chip().dataset.state).toBe('audio-pending');
    expect(liveRegion()).toHaveTextContent('Audio not saved yet');
  });

  it('shows a focusable Retry in the error state that saves for a cloud error', () => {
    render(<SaveStatusChip />);
    expect(screen.queryByRole('button', { name: 'Retry save' })).toBeNull();
    act(() =>
      useCloudSaveStore.setState({
        phase: 'error',
        error: { kind: 'server', message: 'The server had a problem' },
      }),
    );
    expect(chip().dataset.reason).toBe('cloud');
    expect(chip()).toHaveTextContent("Couldn't save –Retry");
    const retry = screen.getByRole('button', { name: 'Retry save' });
    retry.focus();
    expect(document.activeElement).toBe(retry);
    fireEvent.click(retry);
    expect(saveProject).toHaveBeenCalledWith({ source: 'chip' });
  });

  it('routes Retry to the draft writer for a device error', () => {
    const retryDraft = vi.fn();
    render(<SaveStatusChip />);
    act(() =>
      useDraftStatusStore.setState({ error: 'quota', retry: retryDraft }),
    );
    expect(chip().dataset.state).toBe('error');
    expect(chip().dataset.reason).toBe('device');
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    expect(retryDraft).toHaveBeenCalledTimes(1);
    expect(saveProject).not.toHaveBeenCalled();
  });

  it('keeps Retry’s focus ring inside the chip and describes the failure', () => {
    render(<SaveStatusChip />);
    act(() =>
      useCloudSaveStore.setState({
        phase: 'error',
        error: { kind: 'server', message: 'The server had a problem' },
      }),
    );
    const retry = screen.getByRole('button', { name: 'Retry save' });
    expect(retry.className).toContain('focus-visible:outline-offset-0');
    expect(retry.className).not.toContain('focus-visible:outline-offset-2');
    const describedBy = retry.getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)).toHaveTextContent(
      'The server had a problem. Your work is saved on this device.',
    );
  });

  it('falls back to a cloud save for a device error with no writer retry', () => {
    render(<SaveStatusChip />);
    act(() => useDraftStatusStore.setState({ error: 'quota', retry: null }));
    expect(chip().dataset.reason).toBe('device');
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    expect(saveProject).toHaveBeenCalledWith({ source: 'chip' });
  });

  it('retries both when the cloud and the device both failed', () => {
    const retryDraft = vi.fn();
    render(<SaveStatusChip />);
    act(() => {
      useDraftStatusStore.setState({ error: 'quota', retry: retryDraft });
      useCloudSaveStore.setState({
        phase: 'error',
        error: { kind: 'offline', message: 'You’re offline' },
      });
    });
    expect(chip().dataset.reason).toBe('cloud');
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    expect(retryDraft).toHaveBeenCalledTimes(1);
    expect(saveProject).toHaveBeenCalledWith({ source: 'chip' });
  });

  it('disables Retry while a session opens', () => {
    render(<SaveStatusChip />);
    act(() =>
      useCloudSaveStore.setState({
        phase: 'error',
        error: { kind: 'server', message: 'The server had a problem' },
      }),
    );
    act(() => useSessionStore.setState({ phase: 'preparing' }));
    const retry = screen.getByRole('button', { name: 'Retry save' });
    expect(retry).toBeDisabled();
    fireEvent.click(retry);
    expect(saveProject).not.toHaveBeenCalled();
    act(() => useSessionStore.setState({ phase: 'ready' }));
    expect(screen.getByRole('button', { name: 'Retry save' })).toBeEnabled();
  });

  it('can leave its live region to a SaveChipAnnouncer elsewhere', () => {
    render(<SaveStatusChip announce={false} />);
    expect(screen.queryByRole('status')).toBeNull();
    cleanup();
    render(<SaveChipAnnouncer />);
    act(() =>
      useCloudSaveStore.setState({
        phase: 'error',
        error: { kind: 'offline', message: 'You’re offline' },
      }),
    );
    expect(liveRegion()).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion()).toHaveTextContent("Couldn't save");
  });

  it('does nothing when the chip itself is clicked', () => {
    render(<SaveStatusChip />);
    fireEvent.click(chip());
    act(() => useCloudSaveStore.setState({ phase: 'error' }));
    fireEvent.click(chip());
    expect(saveProject).not.toHaveBeenCalled();
    expect(chip().tagName).toBe('SPAN');
  });

  it('colours the icon amber only for error and audio-pending', () => {
    render(<SaveStatusChip />);
    const icon = () => chip().querySelector('svg')!;
    expect(icon().getAttribute('class')).not.toContain('text-daw-warning');
    act(() => useDraftStatusStore.setState({ error: 'unavailable' }));
    expect(icon().getAttribute('class')).toContain('text-daw-warning');
    act(() =>
      useDraftStatusStore.setState({
        error: null,
        media: { ...INITIAL_PENDING_MEDIA_STATUS, missing: 1 },
      }),
    );
    expect(icon().getAttribute('class')).toContain('text-daw-warning');
    act(() => useCloudSaveStore.setState({ phase: 'saving' }));
    expect(icon().getAttribute('class')).not.toContain('text-daw-warning');
  });
});
