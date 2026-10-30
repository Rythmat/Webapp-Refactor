import type { ReactNode } from 'react';
import { SpectrumBar } from '@/components/art/light/SpectrumLight';
import { ATLAS_LINK } from '@/components/atlas/components/UI/primitives';
import type { NetworkState } from '@/components/atlas/network/useNetwork';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';

/** The card's small parts. */

export const NOTE = 'text-[0.8125rem] text-atlas-text-2';

/** A line that lets all of time back in, when only some years show. */
export function AllYearsLink() {
  const dispatch = useAtlasDispatch();
  const filtered = useAtlasSelector((s) => s.timeWindow !== null);
  if (!filtered) return null;
  return (
    <button
      className={ATLAS_LINK}
      type="button"
      onClick={() => dispatch({ type: 'SET_WINDOW', payload: null })}
    >
      Show all years
    </button>
  );
}

/**
 * The links' own states while they load: a spectrum bar, or a way to try
 * again; once there, `children`.
 */
export function LinksReady({
  network,
  children,
}: {
  network: NetworkState;
  children: ReactNode;
}) {
  if (network.status === 'error') {
    return (
      <p className={NOTE}>
        The links didn’t load.{' '}
        <button className={ATLAS_LINK} type="button" onClick={network.retry}>
          Try again
        </button>
      </p>
    );
  }
  if (network.status === 'loading') {
    return <SpectrumBar className="my-2 w-full" label="Loading the links" />;
  }
  return <>{children}</>;
}
