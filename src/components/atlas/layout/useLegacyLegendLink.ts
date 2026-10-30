import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAtlasDispatch } from '@/components/atlas/state/atlasStore';

/**
 * A link from before the legend became a card (`?panel=legend`): open the
 * Legend card, shown, and drop the word from the address, as if the link
 * had never asked for a panel.
 */
export function useLegacyLegendLink() {
  const [params, setParams] = useSearchParams();
  const dispatch = useAtlasDispatch();
  const asked = params.get('panel') === 'legend';
  useEffect(() => {
    if (!asked) return;
    dispatch({
      type: 'SET_CARD_PREFS',
      payload: { hidden: false, legendOpen: true },
    });
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('panel');
        return next;
      },
      { replace: true },
    );
  }, [asked, dispatch, setParams]);
}
