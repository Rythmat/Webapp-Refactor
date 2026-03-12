import { useMutation } from '@tanstack/react-query';

export const useSignUpMutation = () => {
  return useMutation({
    mutationFn: async () => {
      throw new Error('Legacy API sign-up mutation is no longer supported.');
    },
  });
};
