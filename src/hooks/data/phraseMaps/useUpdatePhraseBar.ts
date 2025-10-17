import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';
import { PatchPhraseMapsByIdBarsByBarIdPayload } from '@/contexts/MusicAtlasContext/musicAtlas.generated';

export const useUpdatePhraseBar = (params: { mapId: string }) => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: PatchPhraseMapsByIdBarsByBarIdPayload & {
        id: string;
      },
    ) =>
      musicAtlas.phraseMaps.patchPhraseMapsByIdBarsByBarId(
        params.mapId,
        data.id,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phraseBars'] });
    },
  });
};

export type UpdatePhraseBarData = PatchPhraseMapsByIdBarsByBarIdPayload;
