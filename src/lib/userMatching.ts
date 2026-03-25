import type {
  UserBioPreferences,
  DiscoverableUser,
  ConnectionMatch,
} from '@/types/userProfile';

// ── Complementary skill pairs ───────────────────────────────────────────

const INSTRUMENT_COMPLEMENTS: [string, string][] = [
  ['Piano', 'Guitar'],
  ['Vocals', 'Piano'],
  ['Vocals', 'Guitar'],
  ['Vocals', 'Drums'],
  ['Guitar', 'Bass'],
  ['Piano', 'Bass'],
  ['Synth', 'Bass'],
  ['Synth', 'Drums'],
  ['Drums', 'Bass'],
  ['Strings', 'Piano'],
  ['Percussion', 'Bass'],
];

const FOCUS_COMPLEMENTS: [string, string][] = [
  ['Producing', 'Songwriting'],
  ['Producing', 'Performing'],
  ['Songwriting', 'Performing'],
  ['Education', 'Performing'],
  ['Audio', 'Producing'],
];

function findComplements(
  pairs: [string, string][],
  yours: string[],
  theirs: string[],
): { label: string; yours: string; theirs: string }[] {
  const results: { label: string; yours: string; theirs: string }[] = [];
  const yoursSet = new Set(yours);
  const theirsSet = new Set(theirs);

  for (const [a, b] of pairs) {
    if (yoursSet.has(a) && theirsSet.has(b) && !yoursSet.has(b)) {
      results.push({ label: `${a} + ${b}`, yours: a, theirs: b });
    }
    if (yoursSet.has(b) && theirsSet.has(a) && !yoursSet.has(a)) {
      results.push({ label: `${b} + ${a}`, yours: b, theirs: a });
    }
  }
  return results;
}

// ── Main matching function ──────────────────────────────────────────────

export function computeMatch(
  currentUser: UserBioPreferences,
  other: DiscoverableUser,
): ConnectionMatch {
  const otherBio = other.bio;

  // Common genres
  const myGenres = new Set(currentUser.genres);
  const commonGenres = otherBio.genres.filter((g) => myGenres.has(g));

  // Complementary skills
  const instrumentComplements = findComplements(
    INSTRUMENT_COMPLEMENTS,
    currentUser.instruments,
    otherBio.instruments,
  );
  const focusComplements = findComplements(
    FOCUS_COMPLEMENTS,
    currentUser.focus,
    otherBio.focus,
  );
  const complementarySkills = [...instrumentComplements, ...focusComplements];

  // Shared focus
  const myFocus = new Set(currentUser.focus);
  const sharedFocusCount = otherBio.focus.filter((f) => myFocus.has(f)).length;

  // Score (0–100)
  const genreScore = Math.min(commonGenres.length * 30, 60);
  const complementScore = Math.min(complementarySkills.length * 25, 50);
  const focusScore = Math.min(sharedFocusCount * 15, 30);
  const diversityBonus =
    commonGenres.length > 0 && complementarySkills.length > 0 ? 10 : 0;
  const matchScore = Math.min(
    100,
    genreScore + complementScore + focusScore + diversityBonus,
  );

  return {
    user: other,
    commonGenres,
    complementarySkills,
    matchScore,
  };
}

/** Compute and sort matches for a list of discoverable users. */
export function rankMatches(
  currentUser: UserBioPreferences,
  users: DiscoverableUser[],
): ConnectionMatch[] {
  return users
    .map((u) => computeMatch(currentUser, u))
    .sort((a, b) => b.matchScore - a.matchScore);
}
