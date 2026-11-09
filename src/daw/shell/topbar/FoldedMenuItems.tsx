import { Music2 } from 'lucide-react';
import { cn } from '@/components/utilities';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { METRES } from '@/daw/shell/song/SongParts';
import { useStore } from '@/daw/store';
import {
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from '@/daw/ui/Menu';
import { TYPE_CLASS } from '@/daw/ui/styles';

// ── What a narrow top bar folds into the Settings menu ─────────────────────
//
// The last fold steps (useToolbarOverflow: 'metre-in-menu', 'click-in-menu')
// take the time signature and the metronome's switch off the bar; the gear's
// menu (TopBar's MoreMenu) shows them here instead, so nothing is out of
// reach at any width.

const METRONOME_KEYS = shortcutKeys('transport.metronome');

/** The metronome's switch, as a menu row. */
export function ClickMenuItem() {
  const on = useStore((s) => s.metronomeEnabled);
  return (
    <MenuCheckboxItem
      checked={on}
      onCheckedChange={() => useStore.getState().toggleMetronome()}
      shortcut={METRONOME_KEYS.label}
      description="A click on every beat while you play or record"
      data-testid="click-menu-item"
    >
      Click
    </MenuCheckboxItem>
  );
}

/** The time signature, as a submenu of the common ones. */
export function TimeSignatureSub() {
  const numerator = useStore((s) => s.timeSignatureNumerator);
  const denominator = useStore((s) => s.timeSignatureDenominator);
  const current = `${numerator}/${denominator}`;
  const listed = METRES.some(([n, d]) => `${n}/${d}` === current);
  return (
    <MenuSub>
      <MenuSubTrigger icon={<Music2 />} data-testid="metre-menu">
        <span className="flex-1">Time signature</span>
        <span className={cn(TYPE_CLASS.label, 'ml-4 text-daw-text-3')}>
          {current}
        </span>
      </MenuSubTrigger>
      <MenuSubContent data-ds="v2" data-testid="metre-menu-content">
        <MenuRadioGroup
          label="Time signature"
          value={current}
          onValueChange={(value) => {
            const [n, d] = value.split('/').map(Number);
            useStore.getState().setTimeSignature(n, d);
          }}
        >
          {/* A custom one the song has, then the common ones. */}
          {listed ? null : (
            <MenuRadioItem value={current}>{current}</MenuRadioItem>
          )}
          {METRES.map(([n, d]) => (
            <MenuRadioItem key={`${n}/${d}`} value={`${n}/${d}`}>
              {n}/{d}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuSubContent>
    </MenuSub>
  );
}
