import useLocalStorageState from 'use-local-storage-state';

const CURRENT_CLASSROOM_STORAGE_KEY = 'state:current_classroom_id';

// Hook to set the current classroom ID
export const useSetCurrentClassroom = () => {
  const [, setCurrentClassroomId] = useLocalStorageState<string | null>(
    CURRENT_CLASSROOM_STORAGE_KEY,
    {
      defaultValue: null,
    },
  );

  return setCurrentClassroomId;
};
