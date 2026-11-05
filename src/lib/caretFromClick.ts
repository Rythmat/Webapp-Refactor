/**
 * Where in an element's text a click landed, as a character offset — so a
 * click-to-edit field opens with its caret there, ready to change a word,
 * rather than with everything selected for the first key to wipe out.
 * Null when the browser can't say, or the click wasn't on the text.
 */

type CaretDocument = Document & {
  caretPositionFromPoint?: (
    x: number,
    y: number,
  ) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

export function caretFromClick(event: {
  clientX: number;
  clientY: number;
  currentTarget: Element;
}): number | null {
  const element = event.currentTarget;
  const doc = element.ownerDocument as CaretDocument;
  let node: Node | null = null;
  let offset = 0;
  if (doc.caretPositionFromPoint) {
    const at = doc.caretPositionFromPoint(event.clientX, event.clientY);
    if (at) [node, offset] = [at.offsetNode, at.offset];
  } else if (doc.caretRangeFromPoint) {
    const at = doc.caretRangeFromPoint(event.clientX, event.clientY);
    if (at) [node, offset] = [at.startContainer, at.startOffset];
  }
  if (!node || !element.contains(node)) return null;
  // The text before the node the click is in, then its place in that node.
  const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let before = 0;
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    if (text === node) return before + offset;
    before += text.textContent?.length ?? 0;
  }
  return null;
}

/**
 * Puts the caret of a just-opened field at `at` (clamped to its text), or
 * at the end when there is no click to go by.
 */
export function placeCaret(
  field: HTMLInputElement | HTMLTextAreaElement,
  at: number | null,
) {
  const end = field.value.length;
  const caret = at === null ? end : Math.max(0, Math.min(at, end));
  field.setSelectionRange(caret, caret);
}
