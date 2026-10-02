/**
 * How the console's graph compares names.
 *
 * Two people typing the same name rarely type it the same way: one writes
 * "Beyoncé", another "beyonce", a third leaves a space at the end. Find,
 * the graph's search box and its colour groups all compare text through the
 * two helpers here, so a name that matches in one of them matches in all of
 * them.
 *
 * The module is pure: no React, no DOM, no content store.
 */

/**
 * Text as it is compared: accents dropped ("é" becomes "e"), lower case,
 * no space at either end. Spaces and punctuation inside are kept, so a
 * search for "rolling stones" still finds the words in that order.
 */
export const normalizeText = (s: string): string =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Text as a lookup key: normalised, "&" read as "and", and everything but
 * letters and digits removed. "Hip Hop", "hip-hop" and "hiphop" share the
 * key `hiphop`, and a slug and its display name usually do too ("art-rock"
 * and "Art Rock"), which is what lets a query name a genre, a place or a
 * kind either way.
 */
export const textKey = (s: string): string =>
  normalizeText(s)
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
