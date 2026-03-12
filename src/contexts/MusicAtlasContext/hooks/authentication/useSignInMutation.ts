import { useMutation } from '@tanstack/react-query';

export const useSignInMutation = () => {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Legacy API sign-in mutation is no longer supported.');
    },
  });
};
