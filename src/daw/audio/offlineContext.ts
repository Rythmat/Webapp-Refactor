/**
 * Whether `ctx` renders offline (a bounce's, renderProject). It starts
 * suspended and can't be resumed before it renders (resume() rejects), and
 * it renders faster than real time, so nothing on the page's clock keeps up.
 */
export function isOfflineContext(ctx: BaseAudioContext): boolean {
  return (
    typeof (ctx as Partial<OfflineAudioContext>).startRendering === 'function'
  );
}
