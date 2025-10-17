import { useMemo } from 'react';
import useLocalStorageState from 'use-local-storage-state';

const CURRENT_CLASSROOM_STORAGE_KEY = 'state:current_classroom_id';

// Hook to get the current classroom ID and classroom data
export const useCurrentClassroom = () => {
  const [currentClassroomId] = useLocalStorageState<string | null>(
    CURRENT_CLASSROOM_STORAGE_KEY,
    {
      defaultValue: null,
    },
  );

  const currentClassroom = useMemo(() => {
    return currentClassroomId ? { id: currentClassroomId } : null;
  }, [currentClassroomId]);

  return {
    currentClassroomId,
    currentClassroom,
  };
};
