/**
 * Where the hover card goes: beside its anchor, to the right unless that
 * would cross out of the clear part of the map (the cards cover its right),
 * then to the left, never over what covers its left; centred on the anchor's height, kept inside.
 * All in viewport px.
 */
export function placeCard(
  anchor: { x: number; y: number },
  card: { width: number; height: number },
  clear: { left: number; top: number; right: number; bottom: number },
  gap = 14,
): { left: number; top: number } {
  const right = anchor.x + gap;
  const left =
    right + card.width <= clear.right
      ? right
      : Math.max(clear.left, anchor.x - gap - card.width);
  const top = Math.min(
    Math.max(clear.top, anchor.y - card.height / 2),
    Math.max(clear.top, clear.bottom - card.height),
  );
  return { left, top };
}
