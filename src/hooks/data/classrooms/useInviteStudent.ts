import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useInviteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      classroomId,
      emails,
      message,
    }: {
      classroomId: string;
      emails: string[];
      message?: string;
    }) => {
      // This is a placeholder - we need to implement this API endpoint
      // When the actual API is implemented, we'll update this to use it
      return Promise.resolve({
        success: true,
        classroomId,
        invitedEmails: emails,
        message,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['classroom', variables.classroomId, 'students'],
      });
    },
  });
};
