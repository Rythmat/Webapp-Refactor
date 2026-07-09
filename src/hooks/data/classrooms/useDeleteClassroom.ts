import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMusicAtlas } from '@/contexts/MusicAtlasContext';

/**
 * Delete a classroom. Ryan's generated client doesn't yet expose
 * `deleteClassroomsById`, so this hook calls the underlying axios instance
 * directly. When the endpoint lands in the OpenAPI, swap to
 * `musicAtlas.classrooms.deleteClassroomsById(id)` — the hook surface stays
 * identical.
 */
export const useDeleteClassroom = () => {
  const musicAtlas = useMusicAtlas();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await musicAtlas.http.instance.delete(`/classrooms/${id}`);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
};
