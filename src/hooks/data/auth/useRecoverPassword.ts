import { useMutation } from '@tanstack/react-query';

export const useRecoverPassword = () => {
  return useMutation({
    mutationFn: async (_data: { email: string }) => {
      throw new Error('Password recovery is handled by Auth0 Universal Login.');
    },
  });
};
