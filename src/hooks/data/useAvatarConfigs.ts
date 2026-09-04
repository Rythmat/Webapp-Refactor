import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { useMe } from '@/hooks/data';
import { meQueryKey } from '@/hooks/data/auth/meQueryKey';
import { type AvatarConfig, isAvatarConfig } from '@/lib/avatarHexGrid';

/**
 * The current user's avatar config, from the canonical store: the `avatar_config`
 * column on `user`, read via `GET /auth/me` and written via
 * `PUT /auth/me/avatar-config`.
 *
 * This replaces the old serverless `api/avatar-config/*` (Upstash Redis) store,
 * which keyed records by the Auth0 `sub` while every id the frontend held was
 * the `User.id` UUID — so its batch endpoint could never resolve another user.
 * Other users' avatars now come from the same list that names them: the students
 * API returns `avatarConfig` per user (see `useStudents`).
 */

/**
 * The generated client types `avatarConfig` as `null` — an artifact of the API
 * describing the column as `t.Nullable(t.Unknown())`, which swagger-typescript-api
 * narrows to `null`. The value is really an opaque JSON blob, so read it through
 * `unknown` and validate at runtime. Tightening the API response schema would
 * remove the cast, but it would also start rejecting any stored blob that no
 * longer matches — not worth it against live data.
 */
export function readAvatarConfig(value: unknown): AvatarConfig | null {
  return isAvatarConfig(value) ? value : null;
}

/** The current user's saved avatar config (from the shared `/auth/me` query). */
export function useSelfAvatarConfig(): { data: AvatarConfig | null } {
  const { data: me } = useMe();
  return { data: readAvatarConfig(me?.avatarConfig as unknown) };
}

/**
 * Persist the current user's avatar config. Patches the shared `/auth/me` cache
 * on success so every consumer re-renders without an extra round trip.
 */
export function useSaveAvatarConfig() {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();
  const token = useAuthToken();

  return useMutation({
    mutationFn: (config: AvatarConfig) =>
      musicAtlas.auth.putAuthMeAvatarConfig(config),
    onSuccess: (_data, config) => {
      queryClient.setQueryData(meQueryKey(token), (prev: unknown) =>
        prev && typeof prev === 'object'
          ? { ...prev, avatarConfig: config }
          : prev,
      );
    },
  });
}
