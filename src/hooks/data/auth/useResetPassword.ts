import { useMutation } from '@tanstack/react-query';

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (_data: { token: string; password: string }) => {
      throw new Error('Password reset is handled by Auth0 Universal Login.');
    },
  });
};
