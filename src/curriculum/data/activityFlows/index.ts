/**
 * The lesson library's canonical import point.
 *
 * The data now lives in src/content/flowStore.ts and is hydrated at runtime from
 * the published CDN bundle, falling back to ./bundled.ts when no CDN is
 * configured. Consumers keep the specifier and the signatures they always used.
 *
 * This was the cleanest of the three content migrations: flows were already
 * code-split per genre behind async accessors, so there is no stable-identity
 * mutation trick here and no <ContentGate> — `getActivityFlow` awaits hydration
 * internally.
 *
 * See the header in flowStore.ts for the one rule that matters: never snapshot
 * the library at module scope.
 */
export {
  ensureFlowContent,
  getActivityFlow,
  getFlowsForGenre,
  loadAllFlows,
  loadPianoFundamentals,
} from '@/content/flowStore';
