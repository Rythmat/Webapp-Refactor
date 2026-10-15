/**
 * Write a year into an element as fixed-width digit cells, straight to the
 * DOM: the river's bookends and cursor change every frame of a gesture, and
 * Glacial Indifference's digits are proportional (FixedDigits explains), so
 * plain text would shuffle sideways as the years roll.
 */
export function writeYear(
  el: HTMLElement | null,
  year: number,
  { fixed = true } = {},
): void {
  if (!el) return;
  const text = String(Math.round(year));
  if (el.dataset.year === text) return;
  el.dataset.year = text;
  // Display sizes read better in Glacial's own spacing, and an end-anchored
  // number only grows away from its anchor.
  if (!fixed) {
    el.textContent = text;
    return;
  }
  const cells = el.children;
  // Reuse the cells when the number of characters has not changed.
  if (cells.length !== text.length) {
    el.replaceChildren(
      ...Array.from(text, () => {
        const cell = document.createElement('span');
        cell.className = 'atlas-river-digit';
        return cell;
      }),
    );
  }
  Array.from(text).forEach((ch, i) => {
    const cell = el.children[i] as HTMLElement;
    if (cell.textContent !== ch) cell.textContent = ch;
  });
}
