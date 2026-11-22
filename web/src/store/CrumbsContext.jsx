import { createContext, useContext, useEffect, useState } from 'react';

// Pages publish their breadcrumb trail; the top bar renders it.
// items: [{ label, to? }] — the last item is rendered as the current page.
const CrumbsContext = createContext({ crumbs: [], setCrumbs: () => {} });

export function CrumbsProvider({ children }) {
  const [crumbs, setCrumbs] = useState([]);
  return <CrumbsContext.Provider value={{ crumbs, setCrumbs }}>{children}</CrumbsContext.Provider>;
}

export function useCrumbs(items) {
  const { setCrumbs } = useContext(CrumbsContext);
  const key = JSON.stringify(items);
  useEffect(() => { setCrumbs(items); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useCrumbsValue() { return useContext(CrumbsContext).crumbs; }
