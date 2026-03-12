import { useMutation } from '@tanstack/react-query';

export const useLogin = () => {
  return useMutation({
    mutationFn: async () => {
      throw new Error(
        'Legacy password login is no longer supported. Use Auth0 login.',
      );
    },
  });
};
