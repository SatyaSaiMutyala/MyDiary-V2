import { useEffect, useState } from 'react';

// The value, once it has stopped changing for a moment. Used so a search box
// asks the server after the person pauses, not on every letter.
export function useDebounced(value, wait = 350) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), wait);
    return () => clearTimeout(timer);
  }, [value, wait]);
  return settled;
}
