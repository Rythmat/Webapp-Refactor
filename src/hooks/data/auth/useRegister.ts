import { useMutation } from '@tanstack/react-query';

export const useRegister = () => {
  return useMutation({
    mutationFn: async () => {
      throw new Error(
        'Legacy registration is no longer supported. Use Auth0 signup.',
      );
    },
  });
};
