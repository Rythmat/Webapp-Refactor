// ── Page layout ────────────────────────────────────────────────────────────
// A score is written onto a page of a fixed size, the way it will be printed,
// rather than onto whatever window happens to be open. Systems lay out into
// the page's content width, so a four-bar system is always four bars of the
// same size; the whole page is then scaled to fit the space on screen, which
// resizes staves, notes and symbols together.
//
// Everything here is in CSS pixels at 96 per inch, the size the browser prints
// at, so the same numbers describe the screen and the paper.

export const PX_PER_INCH = 96;
export const inches = (n: number) => Math.round(n * PX_PER_INCH);

export interface PageSpec {
  /** Paper width, edge to edge. */
  width: number;
  /** Paper height, edge to edge. */
  height: number;
  /** Blank border on all four sides. */
  margin: number;
}

/** Matches `@page { size: letter; margin: 0.75in }` in the print stylesheet. */
export const LETTER_PORTRAIT: PageSpec = {
  width: inches(8.5),
  height: inches(11),
  margin: inches(0.75),
};

export const A4_PORTRAIT: PageSpec = {
  width: inches(8.27),
  height: inches(11.69),
  margin: inches(0.75),
};

/** The width systems are laid out into: the paper less its two margins. */
export const contentWidth = (page: PageSpec): number =>
  page.width - page.margin * 2;

/** The height available for systems on one page. */
export const contentHeight = (page: PageSpec): number =>
  page.height - page.margin * 2;

/**
 * How much to shrink or stretch the page so it fits the space on screen.
 *
 * Fitting the width is what makes the page readable: the whole width is
 * always visible and it scrolls downward, as a document does. The result is
 * clamped so a narrow window does not shrink the notation to nothing and a
 * very wide one does not blow it up past its natural size.
 */
export function pageScale(
  available: number,
  page: PageSpec,
  { min = 0.4, max = 1.4 }: { min?: number; max?: number } = {},
): number {
  if (!Number.isFinite(available) || available <= 0) return 1;
  return Math.min(max, Math.max(min, available / page.width));
}

export interface PlacedSystem {
  /** Which page it falls on, counting from zero. */
  page: number;
  /** Top of the system within the whole scroll, in page pixels. */
  y: number;
}

/**
 * Lay systems down the pages. A system is never split across a page boundary;
 * when one will not fit in what is left, it starts the next page.
 */
export function paginate(
  systemCount: number,
  systemHeight: number,
  page: PageSpec,
  gap = inches(0.25),
  /** Systems that must open a page, however much room is left on this one. */
  forcedStarts: ReadonlySet<number> = new Set(),
  /** Room kept at the top of page 1, under its margin — the title block. */
  firstPageInset = 0,
): { systems: PlacedSystem[]; pageCount: number; totalHeight: number } {
  const available = contentHeight(page);
  const perPageOn = (pageIndex: number) =>
    Math.max(
      1,
      Math.floor(
        (available - (pageIndex === 0 ? firstPageInset : 0)) /
          Math.max(1, systemHeight),
      ),
    );
  const systems: PlacedSystem[] = [];
  let pageIndex = 0;
  let withinPage = 0;
  for (let i = 0; i < systemCount; i++) {
    // A page break starts a page; so does filling the one we are on.
    if (i > 0 && (forcedStarts.has(i) || withinPage >= perPageOn(pageIndex))) {
      pageIndex += 1;
      withinPage = 0;
    }
    systems.push({
      page: pageIndex,
      y:
        pageIndex * (page.height + gap) +
        page.margin +
        (pageIndex === 0 ? firstPageInset : 0) +
        withinPage * systemHeight,
    });
    withinPage += 1;
  }
  const pageCount = Math.max(1, pageIndex + 1);
  return {
    systems,
    pageCount,
    totalHeight: pageCount * page.height + (pageCount - 1) * gap,
  };
}

/** Top of each page in the scroll, for drawing the paper behind the music. */
export function pageTops(
  pageCount: number,
  page: PageSpec,
  gap = inches(0.25),
): number[] {
  return Array.from({ length: pageCount }, (_, i) => i * (page.height + gap));
}

/**
 * How far the notation must shrink for the widest system to fit the page.
 *
 * With a fixed bar count a system takes whatever width its contents demand —
 * a bar of sixteenths needs far more room than a bar of rests — so some
 * systems ask for more than the page has. Stretching cannot help there, and
 * squeezing the bars would collide the noteheads; the notation itself has to
 * get smaller. Returns 1 when everything already fits, and never goes below
 * `min`, past which the music stops being readable.
 */
export function fitScale(
  widestNeed: number,
  available: number,
  min = 0.45,
): number {
  if (!(widestNeed > 0) || !(available > 0)) return 1;
  return Math.min(1, Math.max(min, available / widestNeed));
}

/**
 * The width a system needs when every bar in it is drawn the same size.
 *
 * Uniform bars all take the width of the busiest one, so a system of four
 * bars where one is full of sixteenths needs four of those widths — not the
 * sum of what each bar would have taken alone. That is a good deal more
 * room, and it is the number the notation has to shrink to satisfy.
 */
export function uniformSystemNeed(
  barMinWidths: readonly number[],
  header = 0,
): number {
  if (barMinWidths.length === 0) return header;
  return header + Math.max(...barMinWidths) * barMinWidths.length;
}
