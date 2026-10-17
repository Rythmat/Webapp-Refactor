import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '@/components/utilities';
import type { NotationStaffSetting } from '@/daw/store/tracksSlice';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { Select } from '@/daw/ui/Select';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import {
  autoHint,
  autoLabel,
  isStaffSetting as isSetting,
  STAFF_LABEL,
  staffOptions,
  staffSummary,
  type PartStaffState,
} from './partStaff';

// ── A part's clef, chosen by hand ──────────────────────────────────────────
// Two ways to the same setting (partStaff.ts): a list per part in the
// Score's parts panel, and a menu on the part's name at the left of every
// system. Auto names what it writes — 'Auto (Grand staff)' — so going back
// to it is never a guess. A drum kit has nothing to choose: it says so.

interface PartStaffControlProps {
  /** The part's name, for the control's label. */
  name: string;
  state: PartStaffState;
  onChange: (setting: NotationStaffSetting) => void;
}

/** The parts panel's list for one part's clef. */
export function PartStaffSelect({
  name,
  state,
  onChange,
}: PartStaffControlProps) {
  if (state.kit) {
    return (
      <span
        title={autoHint(state)}
        className={cn(TYPE_CLASS.label, 'shrink-0 text-daw-text-3')}
      >
        {STAFF_LABEL.percussion}
      </span>
    );
  }
  return (
    // What Auto writes and why, or the staff set by hand, said in full.
    <div title={staffSummary(state)}>
      <Select
        label={`Clef for ${name}`}
        size="sm"
        value={state.setting}
        // The list says what the 8 does; the closed field, narrow in the
        // panel, names the clef ('Bass clef 8vb') and its tooltip says more.
        valueLabel={
          state.setting === 'auto'
            ? autoLabel(state)
            : STAFF_LABEL[state.setting]
        }
        options={staffOptions(state)}
        onValueChange={(value) => {
          if (isSetting(value) && value !== state.setting) onChange(value);
        }}
        className="w-full justify-between"
      />
    </div>
  );
}

interface PartNameMenuProps extends PartStaffControlProps {
  /** Where the part's name sits on the page, over which the menu opens. */
  style: CSSProperties;
}

/**
 * The part's name at the left of a system, made clickable: a menu of the
 * staves it can be written on. Drawn over the engraved name, invisible
 * until hovered.
 */
export function PartNameMenu({
  name,
  state,
  onChange,
  style,
}: PartNameMenuProps) {
  return (
    <Menu modal={false}>
      <MenuTrigger asChild>
        <button
          type="button"
          data-part-name={name}
          aria-label={`Clef for ${name}`}
          title={
            state.kit
              ? `${name} — ${autoHint(state)}.`
              : `${name} — ${staffSummary(state)}. Click to change the clef.`
          }
          // The staff underneath would take the press as a click on the page.
          onPointerDown={(event: ReactPointerEvent) => event.stopPropagation()}
          className={cn(
            'score-no-print absolute cursor-pointer rounded-[var(--daw-radius-sm)] hover:bg-daw-chip data-[state=open]:bg-daw-chip',
            TRANSITION,
            FOCUS_RING,
          )}
          style={style}
        />
      </MenuTrigger>
      <MenuContent side="right" align="start">
        <MenuLabel>{name} · Clef</MenuLabel>
        {state.kit ? (
          <MenuItem disabled>
            {STAFF_LABEL.percussion}: drum kits always use it
          </MenuItem>
        ) : (
          <MenuRadioGroup
            value={state.setting}
            onValueChange={(value) => {
              if (isSetting(value) && value !== state.setting) onChange(value);
            }}
          >
            {staffOptions(state).map((option) => (
              <MenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        )}
      </MenuContent>
    </Menu>
  );
}
