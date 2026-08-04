import { useMutation } from '@tanstack/react-query';
import { getCurrentAppSessionId } from '@/auth/app-session-store';
import { Env } from '@/constants/env';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';

/**
 * Uploads an image to the admin content backend and returns a served URL to
 * store in `Song.artistImageRef` — the same shape as the existing
 * `/artists/...` paths (a URL used directly as an <img src>), not inline base64.
 *
 * The endpoint (`POST /api/admin/content/asset`, multipart) lives in the remote
 * api-refactor backend alongside `/api/admin/content/*`; until it ships this
 * mutation rejects and the caller falls back to a pasted URL.
 */
export interface AssetUploadResult {
  url: string;
}

export const useAdminAssetUpload = () => {
  const { token } = useAuthContext();

  return useMutation<AssetUploadResult, Error, File>({
    mutationFn: async (file) => {
      const apiBase =
        Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';
      const appSessionId = getCurrentAppSessionId();

      const form = new FormData();
      form.append('file', file, file.name);

      const res = await fetch(`${apiBase}/api/admin/content/asset`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          ...(appSessionId ? { 'X-App-Session': appSessionId } : {}),
          // No Content-Type — the browser sets the multipart boundary.
        },
        body: form,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Upload failed: ${res.status}`);
      }

      return (await res.json()) as AssetUploadResult;
    },
  });
};
