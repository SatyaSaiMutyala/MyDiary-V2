import { useEffect, useState } from 'react';

/** The value, but only after it has stopped changing for `ms` (search boxes → API calls). */
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
