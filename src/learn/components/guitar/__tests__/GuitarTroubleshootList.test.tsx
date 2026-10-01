// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuitarTroubleshootList } from '../GuitarTroubleshootList';

const items = () =>
  within(screen.getByRole('list', { name: 'Things to try' })).getAllByRole(
    'listitem',
  );
const press = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }));

afterEach(cleanup);

describe('GuitarTroubleshootList', () => {
  it('lists the fixes in order, each with how to do it', () => {
    render(<GuitarTroubleshootList />);
    const titles = [
      'Tune your guitar.',
      'Use headphones, or turn the speakers down.',
      'Turn effects off.',
      'Check the microphone permission.',
      'Check the device and input channel.',
      'Recalibrate.',
    ];
    expect(items()).toHaveLength(titles.length);
    items().forEach((li, i) => expect(li).toHaveTextContent(titles[i]));
    expect(screen.getByText(/clean amp sound/)).toBeInTheDocument();
    // Without callbacks there is nothing to press.
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens setup at the step that fixes each one', () => {
    const onOpenSetup = vi.fn();
    const onRecalibrate = vi.fn();
    render(
      <GuitarTroubleshootList
        onOpenSetup={onOpenSetup}
        onRecalibrate={onRecalibrate}
      />,
    );

    press('Open tuner');
    press('Test for echo');
    press('Check the mic');
    press('Choose input');
    expect(onOpenSetup.mock.calls).toEqual([
      ['tuner'],
      ['bleed'],
      ['mic'],
      ['level'],
    ]);
    press('Recalibrate');
    expect(onRecalibrate).toHaveBeenCalledTimes(1);
    // Effects are switched off on the guitar, not in the app.
    expect(within(items()[2]).queryByRole('button')).toBeNull();
  });

  it('recalibrates through setup when no handler is given', () => {
    const onOpenSetup = vi.fn();
    render(<GuitarTroubleshootList onOpenSetup={onOpenSetup} />);
    press('Recalibrate');
    expect(onOpenSetup).toHaveBeenCalledWith('quiet');
  });
});
