import type { TermDef } from './anatomyTypes';
import { reachOf, type CompiledModel } from './compileCore';
import { project, type V2 } from './iso';

/** Where a term's callout points, assembled, on the page. */
export function termAnchor(model: CompiledModel, term: TermDef): V2 {
  if (term.anchor)
    return project(term.anchor[0], term.anchor[1], term.anchor[2]);
  const box = reachOf(
    term.parts.map((id) => model.partById[id]),
    () => [0, 0, 0],
  );
  return [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2];
}
