import { useMutation } from '@tanstack/react-query';
import { useMusicAtlas } from '../useMusicAtlas';

export const useSignUpMutation = () => {
  const musicAtlas = useMusicAtlas();

  return useMutation({
    mutationFn: musicAtlas.auth.postAuthRegister,
  });
};
