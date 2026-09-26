/**
 * Registers every transcribed study, then exposes them as a film.
 *
 * Each study module self-registers with `scene(id, …)` as an import side effect, so this barrel's
 * import list IS the registry — adding a study is one line here and one new file, and no module
 * has to be edited by two people at once.
 */
import './silhouette.ts';
import './stroke.ts';
import './ramp.ts';
import './form.ts';
import './texture.ts';
import './depth.ts';
import './kettle.ts';
import './wave.ts';
import './telescope.ts';

export { studiesFilm, STUDIES, registered } from './film.ts';
export * from './frame.ts';
