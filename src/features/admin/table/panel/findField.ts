import { fieldSelector } from '../../content/recordEditors/shared';
import type { TableDef } from '../model/types';

/**
 * Finding a field in the row panel: the element that edits a body path (its
 * `data-field` anchor, which every editor's Field carries), or a column's
 * entry — for `?field=`, a refused save's problem, a new item's name.
 */

/** A path as a `data-field` names it: no indices (`credits[2].name` → `credits.name`). */
const bare = (path: string) => path.replace(/\[\d*\]/g, '');

/**
 * The element that edits a path: the most exact anchor first, then its
 * parents' (`born.date`, then `born`).
 */
export function findAnchor(
  root: HTMLElement,
  paths: readonly string[],
): HTMLElement | undefined {
  for (const path of paths) {
    const steps = bare(path).split('.');
    for (let n = steps.length; n > 0; n--) {
      const found = root.querySelector<HTMLElement>(
        fieldSelector(steps.slice(0, n).join('.')),
      );
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * What `?field=` names, in the panel: the editor's field for a column the
 * row edits (its `edit.path`, then the fields it edits with it), else the
 * column's own entry, else a body path as given.
 */
export function findField(
  root: HTMLElement,
  def: TableDef,
  field: string,
): HTMLElement | undefined {
  const column = def.columns.find((c) => c.id === field);
  const paths =
    column?.edit.by === 'row'
      ? [column.edit.path, ...(column.edit.also ?? [])]
      : [];
  return (
    findAnchor(root, paths) ??
    [...root.querySelectorAll<HTMLElement>('[data-field]')].find(
      (el) => el.dataset.field === field,
    ) ??
    findAnchor(root, [field])
  );
}

// `:disabled` rather than the attribute: a read-only editor disables its
// controls through their fieldset.
const CONTROLS =
  'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [role="button"][tabindex="0"]';

/** Scroll to a field, and put the cursor in it when it can be edited. */
export function showField(target: HTMLElement, focus: boolean) {
  target.scrollIntoView?.({ block: 'nearest' });
  if (focus) {
    target.querySelector<HTMLElement>(CONTROLS)?.focus({ preventScroll: true });
  }
}
