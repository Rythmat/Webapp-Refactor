// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGuitarTonePrefs,
  setGuitarTonePrefs,
} from '@/learn/audio/guitar/guitarTonePrefs';
import { GuitarToneMenu } from '../GuitarToneMenu';

const voice = vi.hoisted(() => ({
  load: vi.fn(async () => {}),
  strumGuitarChord: vi.fn(),
}));
vi.mock('@/learn/audio/guitar/guitarVoice', () => ({
  guitarLessonVoice: { load: voice.load },
  strumGuitarChord: voice.strumGuitarChord,
}));

function renderMenu(props: Partial<Parameters<typeof GuitarToneMenu>[0]> = {}) {
  const onMonitorChange = vi.fn();
  render(
    <GuitarToneMenu
      inputActive={false}
      monitor={false}
      onMonitorChange={onMonitorChange}
      {...props}
    />,
  );
  return { onMonitorChange };
}

function open() {
  fireEvent.keyDown(screen.getByRole('button', { name: /Guitar tone/ }), {
    key: 'Enter',
  });
  return screen.getByRole('menu');
}

beforeEach(() => {
  localStorage.clear();
  setGuitarTonePrefs({ tone: 'amp', ampModelId: 'nam-clean-twin' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('GuitarToneMenu', () => {
  it('shows the tone in use', () => {
    renderMenu();
    expect(
      screen.getByRole('button', { name: 'Guitar tone: Quartz' }),
    ).toHaveTextContent('Tone:Quartz');
  });

  it("lists the Studio's guitar amps by tone type, and an acoustic guitar", () => {
    renderMenu();
    const menu = open();
    const clean = within(menu).getByRole('group', { name: 'Clean amps' });
    expect(
      within(clean)
        .getAllByRole('menuitemradio')
        .map((item) => item.textContent),
    ).toEqual(['Quartz', 'Amber', 'Aquamarine', 'Celestite', 'Emerald']);
    const crunch = within(menu).getByRole('group', { name: 'Crunch amps' });
    expect(within(crunch).getByRole('menuitemradio', { name: 'Fire Opal' }));
    const hiGain = within(menu).getByRole('group', { name: 'Hi Gain amps' });
    expect(within(hiGain).getByRole('menuitemradio', { name: "Tiger's Eye" }));
    // No bass amps.
    expect(
      within(menu).queryByRole('menuitemradio', { name: 'Diamond' }),
    ).toBeNull();

    expect(
      within(menu).getByRole('menuitemradio', { name: 'Quartz' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      within(menu).getByRole('menuitemradio', { name: 'Acoustic (no amp)' }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('switches amp, then strums a C through it', async () => {
    let finishLoad!: () => void;
    voice.load.mockReturnValueOnce(
      new Promise<void>((resolve) => (finishLoad = resolve)),
    );
    renderMenu();
    open();
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitemradio', { name: 'Fire Opal' }));
    });
    expect(getGuitarTonePrefs()).toEqual({
      tone: 'amp',
      ampModelId: 'nam-vox-ac15',
    });
    expect(voice.load).toHaveBeenCalled();
    // Not before the new amp is in: a note sent while it loads is dropped.
    expect(voice.strumGuitarChord).not.toHaveBeenCalled();
    await act(async () => finishLoad());
    expect(voice.strumGuitarChord).toHaveBeenCalledWith(
      [48, 52, 55, 60, 64],
      expect.any(Number),
      expect.any(Number),
      undefined,
      [
        { string: 5, fret: 3 },
        { string: 4, fret: 2 },
        { string: 3, fret: 0 },
        { string: 2, fret: 1 },
        { string: 1, fret: 0 },
      ],
    );
    expect(
      screen.getByRole('button', { name: 'Guitar tone: Fire Opal' }),
    ).toBeInTheDocument();
  });

  it('tells the lesson before a preview sounds, so the mic ignores it', async () => {
    const onPreview = vi.fn(() => {
      expect(voice.strumGuitarChord).not.toHaveBeenCalled();
    });
    renderMenu({ onPreview });
    open();
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitemradio', { name: 'Fire Opal' }));
    });
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(voice.strumGuitarChord).toHaveBeenCalled();
  });

  it('switches to the acoustic guitar, keeping the amp for next time', async () => {
    renderMenu();
    open();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('menuitemradio', { name: 'Acoustic (no amp)' }),
      );
    });
    expect(getGuitarTonePrefs()).toEqual({
      tone: 'acoustic',
      ampModelId: 'nam-clean-twin',
    });
    expect(voice.strumGuitarChord).toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Guitar tone: Acoustic' }),
    ).toBeInTheDocument();
  });

  it('turns monitoring on only while audio input is on', () => {
    const { onMonitorChange } = renderMenu({ inputActive: false });
    open();
    const item = screen.getByRole('menuitemcheckbox', {
      name: 'Monitor my guitar through the amp',
    });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).toHaveAttribute('aria-checked', 'false');
    expect(item).toHaveAccessibleDescription(
      'Turn on audio input to hear yourself.',
    );
    fireEvent.click(item);
    expect(onMonitorChange).not.toHaveBeenCalled();
  });

  it('warns about headphones and reports the switch', () => {
    const { onMonitorChange } = renderMenu({ inputActive: true });
    open();
    const item = screen.getByRole('menuitemcheckbox', {
      name: 'Monitor my guitar through the amp',
    });
    expect(item).not.toHaveAttribute('aria-disabled');
    expect(item).toHaveAccessibleDescription(
      'Headphones only: speakers feed back into the mic.',
    );
    fireEvent.click(item);
    expect(onMonitorChange).toHaveBeenCalledWith(true);
    // The menu stays open to show it.
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows monitoring on', () => {
    renderMenu({ inputActive: true, monitor: true });
    open();
    expect(
      screen.getByRole('menuitemcheckbox', {
        name: 'Monitor my guitar through the amp',
      }),
    ).toHaveAttribute('aria-checked', 'true');
  });
});
