import { useMutation } from '@tanstack/react-query';
import { getCurrentAppSessionId } from '@/auth/app-session-store';
import { Env } from '@/constants/env';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  CONTENT_MOCK,
  CONTENT_REPO,
  REPO_CONTENT_BASE,
} from '@/features/admin/content/mock/mockSwitch';
import { contentApiErrorFrom } from './useAdminContent';

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
      // DEV only: repo mode's server, as in useAdminContent's contentPath.
      // It keeps no uploads (a 404), and the caller falls back to a URL.
      const apiBase =
        import.meta.env.DEV && CONTENT_REPO
          ? (REPO_CONTENT_BASE ?? '')
          : (Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '');
      const appSessionId = getCurrentAppSessionId();

      const form = new FormData();
      form.append('file', file, file.name);

      const url = `${apiBase}/api/admin/content/asset`;
      const init: RequestInit = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          ...(appSessionId ? { 'X-App-Session': appSessionId } : {}),
          // No Content-Type — the browser sets the multipart boundary.
        },
        body: form,
      };

      // DEV only, guarded at the import as in useAdminContent's
      // fetchWithAuth: the offline mock answers with an object URL.
      const res =
        import.meta.env.DEV && CONTENT_MOCK
          ? await (
              await import('@/features/admin/content/mock/handleMockRequest')
            ).handleMockRequest(url, init)
          : await fetch(url, init);

      if (!res.ok)
        throw await contentApiErrorFrom(res, `Upload failed: ${res.status}`);

      return (await res.json()) as AssetUploadResult;
    },
  });
};
