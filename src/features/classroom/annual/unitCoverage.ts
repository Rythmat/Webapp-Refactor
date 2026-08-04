import { CANONICAL_ANNUAL_TEMPLATE } from './curriculumTemplate';

/**
 * Suggested lesson-day count for a Unit id, read from the canonical template's
 * day-stubs (matched by the `unit-<slug>-` id prefix). Drives the coverage
 * pill on Unit bars. Returns 0 for custom units with no template match.
 */
export const suggestedCountFor = (unitId: string): number => {
  const allStubs = [
    ...CANONICAL_ANNUAL_TEMPLATE.autumn.units,
    ...CANONICAL_ANNUAL_TEMPLATE.spring.units,
  ];
  const matched = allStubs.find((u) => unitId.startsWith(`unit-${u.slug}-`));
  return matched?.dayStubs.length ?? 0;
};
