import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import type { SchemaStep } from '../model/types';
import { waitingFor } from './editability';

/**
 * `waitingFor` on this server: the schema step a field still waits for, or
 * undefined once the server's body level for its kind takes it. Apart from
 * `editability.ts` so the rule itself stays pure (the capabilities hook
 * brings React and the query client).
 */
export function useWaitingFor(
  since: SchemaStep | undefined,
): SchemaStep | undefined {
  const caps = useCapabilities();
  return waitingFor(since, caps.schemaVersionOf);
}
