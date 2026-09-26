/**
 * Canvas surface of the engine. Importing this pulls in DOM canvas code, so keep it out of any
 * Node-only path — `src/index.ts` deliberately does not re-export it.
 */
export * from './coverage.ts';
export * from './marks.ts';
export * from './paint.ts';
export * from './paper.ts';
export * from './scene.ts';
export * from './screens.ts';
export * from './shapes.ts';
export * from './surface.ts';
