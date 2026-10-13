import * as Popover from '@radix-ui/react-popover';
import * as Switch from '@radix-ui/react-switch';
import { Layers } from 'lucide-react';
import { useId } from 'react';
import {
  ATLAS_FOCUS,
  ATLAS_ITEM_TITLE,
  ATLAS_MAP_CONTROL,
  ATLAS_NO_EXIT_ANIMATION,
  ATLAS_POPOVER,
  AtlasPillButton,
} from '@/components/atlas/components/UI/primitives';
import { useAtlasPortal } from '@/components/atlas/layout/portalRoot';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import type { GlobeLayers } from '@/components/atlas/types';
import { cn } from '@/lib/utils';

/** The Layers popover's switches, in the order the globe stacks them. */
export const LAYER_OPTIONS: {
  layer: keyof GlobeLayers;
  label: string;
  detail: string;
}[] = [
  {
    layer: 'countryColors',
    label: 'Country colours',
    detail: 'Each country in its continent’s colours; off, plain land.',
  },
  {
    layer: 'states',
    label: 'US & Canada states',
    detail: 'State and province lines, once you zoom in.',
  },
  {
    layer: 'cities',
    label: 'Music cities',
    detail: 'A column on each city with music history.',
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
          'relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-white/15 bg-white/[0.08] transition-colors data-[state=checked]:border-transparent data-[state=checked]:bg-atlas-accent disabled:cursor-not-allowed disabled:border-dashed disabled:opacity-40',
          ATLAS_FOCUS,
        )}
        disabled={disabled}
        id={id}
        onCheckedChange={onChange}
      >
        <Switch.Thumb className="block size-4 translate-x-1 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5" />
      </Switch.Root>
    </li>
  );
}

/**
 * The Layers control in the map-control cluster: a popover of switches that
 * show or hide what the globe draws. The choice is the viewer's, kept in
 * their browser (state/layersStorage.ts) and never in the URL, so a shared
 * link opens the same stop for everyone. Influence arcs keep their per-event
 * direction filter, the same one the event card's sections drive.
 */
export function LayersControl() {
  const open = useAtlasSelector((s) => s.layersOpen);
  const layers = useAtlasSelector((s) => s.layers);
  const directions = useAtlasSelector((s) => s.visibleArcDirections);
  const eventPinned = useAtlasSelector((s) => s.pinnedEvent !== null);
  const dispatch = useAtlasDispatch();
  const portal = useAtlasPortal();
  const titleId = useId();

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) =>
        dispatch({ type: 'SET_LAYERS_OPEN', payload: next })
      }
    >
      <Popover.Trigger asChild>
        <AtlasPillButton
          // The word hides on phones, so the name cannot rest on it.
          aria-label="Layers"
          className={ATLAS_MAP_CONTROL}
          title="Show or hide what the globe draws"
        >
          <Layers aria-hidden className="size-4" />
          <span aria-hidden className="hidden sm:inline">
            Layers
          </span>
        </AtlasPillButton>
      </Popover.Trigger>
      <Popover.Portal container={portal}>
        <Popover.Content
          align="end"
          aria-labelledby={titleId}
          className={cn(
            ATLAS_POPOVER,
            ATLAS_Z.popovers,
            ATLAS_NO_EXIT_ANIMATION,
            'w-[min(18rem,calc(100vw-1rem))] p-4 focus:outline-none',
          )}
          collisionPadding={8}
          sideOffset={8}
        >
          <h2 className={ATLAS_ITEM_TITLE} id={titleId}>
            Layers
          </h2>
          <ul className="mt-1 divide-y divide-atlas-panel-border">
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
