export const quickHash = (obj: unknown): string => {
  try {
    const hashString = (str: string): string => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      return hash.toString(16).padStart(32, '0').slice(0, 32);
    };

    return hashString(JSON.stringify(obj));
  } catch (error) {
    return Math.random().toString(36).substring(2, 15);
  }
};
