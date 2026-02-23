import { useEffect } from 'react';
import { useProgressSummary } from './useProgressSummary';

export const useProgressBootstrap = () => {
  const summary = useProgressSummary(true);

  useEffect(() => {
    // Intentionally no-op; mounting the query hydrates local cache and fetches once.
    summary.data;
  }, [summary.data]);
};
