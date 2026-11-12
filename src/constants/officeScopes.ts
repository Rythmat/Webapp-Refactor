/**
 * The classroomId the Office's built-in lessons carry on this device (owner,
 * 2026-11-12): the Lessons tab's lessons belong to no class. It is the
 * Lessons page's own path segment, so a built-in lesson's editor and Present
 * (`/office/lessons/plan/:dayId`, `/office/lessons/present/:dayId`) sit under
 * the Lessons tab, and Present's Exit lands back on it. Not a classroom on the
 * server: role and classroom lookups answer for it without asking.
 */
export const OFFICE_LESSONS_SCOPE = 'lessons';
