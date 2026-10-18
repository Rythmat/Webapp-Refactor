// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/daw/shell/notice', () => ({ notice: vi.fn() }));

import { notice } from '@/daw/shell/notice';
import { HelpItems } from '@/daw/shell/topbar/HelpMenu';
import { useStore } from '@/daw/store';
import { Menu, MenuContent, MenuTrigger } from '@/daw/ui/Menu';
import { ReportProblemDialog } from '../ReportProblemDialog';
import { ReportProblemHost } from '../ReportProblemHost';
import {
  formatReport,
  REPORT_EMAIL,
  reportDetails,
  reportMailto,
  type ReportSource,
} from '../reportDetails';
import { useReportProblemStore } from '../useReportProblemStore';

// ── Report a problem (milestone 2.11) ──────────────────────────────────────
// The details (build, browser, view, tracks, window), the copied text, the
// mailto link only when there is an address, and the way in from '⋯'.
// Nothing is sent over the network.
//
// Run: npx vitest run src/daw/shell/help/__tests__/ReportProblemDialog.test.tsx

const SOURCE: ReportSource = {
  view: 'studio',
  trackCount: 3,
  userAgent: 'TestBrowser/1.0',
  width: 1366,
  height: 655,
  build: 'abc123',
};

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  vi.mocked(notice).mockClear();
  useReportProblemStore.setState({ isOpen: false });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('reportDetails', () => {
  it('describes the build, browser, view, tracks and window', () => {
    expect(reportDetails(SOURCE)).toEqual([
      { label: 'Build', value: 'abc123' },
      { label: 'Browser', value: 'TestBrowser/1.0' },
      { label: 'View', value: 'Mix' },
      { label: 'Tracks', value: '3' },
      { label: 'Window', value: '1366 × 655' },
    ]);
  });

  it('formats the report and its mailto link', () => {
    const report = formatReport('  The fader stuck  ', reportDetails(SOURCE));
    expect(report).toBe(
      [
        'What happened:',
        'The fader stuck',
        '',
        'Details:',
        'Build: abc123',
        'Browser: TestBrowser/1.0',
        'View: Mix',
        'Tracks: 3',
        'Window: 1366 × 655',
      ].join('\n'),
    );
    expect(formatReport('', [])).toContain('(nothing written)');
    const link = reportMailto('help@example.com', report);
    expect(link.startsWith('mailto:help@example.com?subject=')).toBe(true);
    expect(decodeURIComponent(link.split('body=')[1]!)).toBe(report);
  });
});

describe('ReportProblemDialog', () => {
  it('copies what happened with the details and says so', async () => {
    render(
      <ReportProblemDialog open onOpenChange={() => {}} source={SOURCE} />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Report a problem' });
    expect(screen.getByTestId('report-problem-details')).toHaveTextContent(
      'TestBrowser/1.0',
    );
    fireEvent.change(screen.getByLabelText('What happened?'), {
      target: { value: 'The fader stuck' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copy report' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]![0]).toBe(
      formatReport('The fader stuck', reportDetails(SOURCE)),
    );
    await waitFor(() =>
      expect(notice).toHaveBeenCalledWith({ title: 'Copied' }),
    );
    // No address in the app yet: no Email it.
    expect(REPORT_EMAIL).toBeNull();
    expect(dialog.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('says when the copy fails', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    render(
      <ReportProblemDialog open onOpenChange={() => {}} source={SOURCE} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy report' }));
    await waitFor(() =>
      expect(notice).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' }),
      ),
    );
  });

  it('offers Email it when there is an address', () => {
    render(
      <ReportProblemDialog
        open
        onOpenChange={() => {}}
        source={SOURCE}
        email="help@example.com"
      />,
    );
    fireEvent.change(screen.getByLabelText('What happened?'), {
      target: { value: 'Silence' },
    });
    const link = screen.getByRole('link', { name: 'Email it' });
    expect(link.getAttribute('href')).toBe(
      reportMailto(
        'help@example.com',
        formatReport('Silence', reportDetails(SOURCE)),
      ),
    );
  });
});

describe('the way in', () => {
  it('is in the help items, and the host shows the dialog', async () => {
    useStore.setState({ currentView: 'arrange' });
    render(
      <MemoryRouter>
        <Menu open>
          <MenuTrigger>More</MenuTrigger>
          <MenuContent>
            <HelpItems />
          </MenuContent>
        </Menu>
        <ReportProblemHost />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: /Report a problem…/ }),
    );
    expect(useReportProblemStore.getState().isOpen).toBe(true);
    const dialog = await screen.findByRole('dialog', {
      name: 'Report a problem',
    });
    expect(dialog).toHaveTextContent('Create');
    act(() => useReportProblemStore.getState().close());
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Report a problem' }),
      ).toBeNull(),
    );
  });
});
