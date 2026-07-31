/**
 * Query key for `GET /auth/me`, shared by `useMe` and `AuthContext`.
 *
 * Deliberately a leaf module with no imports. `AuthContext` needs this key, and
 * `useMe` lives alongside `useMusicAtlas`, so putting the key in `useMe.ts`
 * would make AuthContext → useMe → MusicAtlasContext → AuthContext a cycle.
 *
 * Scoped by token so an identity change cannot serve the previous user's
 * profile from cache. Prefix-matches `['me']`, so existing
 * `invalidateQueries({ queryKey: ['me'] })` calls still hit it.
 */
export const meQueryKey = (token: string | null) => ['me', token] as const;
