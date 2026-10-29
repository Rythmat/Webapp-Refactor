import * as Switch from '@radix-ui/react-switch';
import { X } from 'lucide-react';
import { useId } from 'react';
import { CITY_MARK } from '@/components/atlas/components/Globe/engine';
import {
  ATLAS_FOCUS,
  ATLAS_TRANSITION,
  AtlasIconButton,
  AtlasPanel,
  AtlasPanelBody,
} from '@/components/atlas/components/UI/primitives';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import type { GlobeLayers } from '@/components/atlas/types';
import { cn } from '@/lib/utils';

/** The Layers panel's switches, in the order the globe stacks them. */
export const LAYER_OPTIONS: {
  layer: keyof GlobeLayers;
  label: string;
  detail: string;
}[] = [
  {
    layer: 'countryColors',
    label: 'Country colors',
    detail: 'Each country in its continent’s colors; off, plain land.',
  },
  {
    layer: 'states',
    label: 'US & Canada states',
    detail: 'State and province lines, once you zoom in.',
  },
  {
    layer: 'cities',
    label: 'Music cities',
    detail:
      CITY_MARK === 'name'
        ? 'Each city with music history, by its name.'
        : 'A column on each city with music history.',
  },
  {
    layer: 'artistPoints',
    label: 'Artist’s moments',
    detail: 'Points where the open artist’s events happened.',
  },
  {
    layer: 'arcs',
    label: 'Influence arcs',
    detail: 'Links from an event to what shaped it and what it shaped.',
  },
];

const ARC_DIRECTIONS = [
  { direction: 'upstream', label: 'Influenced by' },
  { direction: 'downstream', label: 'Influenced' },
] as const;

/**
 * A labelled switch. The thumb's side says on or off as well as its colour,
 * and a disabled switch's track turns dashed.
 */
function LayerSwitch({
  label,
  detail,
  checked,
  disabled,
  nested,
  onChange,
}: {
  label: string;
  detail?: string;
  checked: boolean;
  disabled?: boolean;
  nested?: boolean;
  onChange: (on: boolean) => void;
}) {
  const id = useId();
  return (
    <li className={cn('flex items-start gap-3 py-2', nested && 'py-1.5 pl-4')}>
      <div className="min-w-0 flex-1">
        <label
          className={cn(
            'block text-sm',
            nested ? 'text-atlas-text-2' : 'text-atlas-text',
            disabled && 'opacity-60',
          )}
          htmlFor={id}
        >
          {label}
        </label>
        {detail && (
          <p className="text-xs text-atlas-text-2" id={`${id}-detail`}>
            {detail}
          </p>
        )}
      </div>
      <Switch.Root
        aria-describedby={detail ? `${id}-detail` : undefined}
        checked={checked}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-white/10 bg-white/[0.08] data-[state=checked]:border-transparent data-[state=checked]:bg-white disabled:cursor-not-allowed disabled:border-dashed disabled:opacity-40',
          ATLAS_TRANSITION,
          ATLAS_FOCUS,
        )}
        disabled={disabled}
        id={id}
        onCheckedChange={onChange}
      >
        <Switch.Thumb className="block size-4 translate-x-1 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-atlas-page" />
      </Switch.Root>
    </li>
  );
}

/**
 * The Layers panel, in the Inspector (owner, 2026-10-29: the Globe in the
 * Studio's frame): switches that show or hide what the map draws. The choice
 * is the viewer's, kept in their browser (state/layersStorage.ts) and never
 * in the URL, so a shared link opens the same stop for everyone. Influence
 * arcs keep their per-event direction filter, the same one the event card's
 * sections drive.
 */
export default function LayersPanel({ onClose }: { onClose: () => void }) {
  const layers = useAtlasSelector((s) => s.layers);
  const directions = useAtlasSelector((s) => s.visibleArcDirections);
  const eventPinned = useAtlasSelector((s) => s.pinnedEvent !== null);
  const dispatch = useAtlasDispatch();

  return (
    <AtlasPanel
      actions={
        <AtlasIconButton aria-label="Close" size="sm" onClick={onClose}>
          <X aria-hidden className="size-4" />
        </AtlasIconButton>
      }
      subtitle="Show or hide what the map draws."
      title="Layers"
    >
      <AtlasPanelBody className="px-4 pb-4">
        <ul className="divide-y divide-atlas-panel-border">
          {LAYER_OPTIONS.map(({ layer, label, detail }) => (
            <LayerSwitch
              key={layer}
              checked={layers[layer]}
              detail={detail}
              label={label}
              onChange={(on) =>
                dispatch({ type: 'SET_LAYER', payload: { layer, on } })
              }
            />
          ))}
        </ul>
        <ul aria-label="Influence arc directions" className="pb-1">
          {ARC_DIRECTIONS.map(({ direction, label }) => (
            <LayerSwitch
              key={direction}
              checked={eventPinned && directions.has(direction)}
              disabled={!eventPinned || !layers.arcs}
              label={label}
              nested
              onChange={(on) => {
                if (on !== directions.has(direction)) {
                  dispatch({
                    type: 'TOGGLE_ARC_DIRECTION',
                    payload: direction,
                  });
                }
              }}
            />
          ))}
        </ul>
        {!eventPinned && (
          <p className="pl-4 text-xs text-atlas-text-2">
            Open an event to choose which of its arcs show.
          </p>
        )}
      </AtlasPanelBody>
    </AtlasPanel>
  );
}
