/*! @license MIT — derived from github.com/sevenevesai/riso-windowseat, © 2026 sevenevesai */

/**
 * @riso/engine — a procedural risograph film engine.
 *
 * Browser-safe surface only. The Node tooling under tools/ is never re-exported from here.
 * Import subpaths (`@riso/engine/canvas`, `/film`) to keep unused parts out of a bundle.
 */
export * from './core/index.ts';
export * from './film/index.ts';
