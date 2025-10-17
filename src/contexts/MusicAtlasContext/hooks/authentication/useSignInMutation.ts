import { useMutation } from '@tanstack/react-query';
import { useMusicAtlas } from '../useMusicAtlas';

export const useSignInMutation = () => {
  const musicAtlas = useMusicAtlas();

  return useMutation({
    mutationFn: musicAtlas.auth.postAuthLogin,
  });
};
