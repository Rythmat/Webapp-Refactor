import { useEffect, useState } from 'react';

export const useNow = ({ live }: { live: boolean }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (live) {
      const interval = setInterval(() => {
        setNow(new Date());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [live]);

  return now;
};
