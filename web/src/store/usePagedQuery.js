import { useEffect, useState } from 'react';
import { PAGE_SIZE } from '../modules/settings/components/listUi';

/**
 * One page of a list at a time, with the pages already seen kept below it.
 *
 * For lists that read top to bottom rather than sitting in a table — requests, notifications, a
 * feed. A table gets Prev/Next and shows one page at a time; these grow downwards instead, so
 * what has already been read stays on screen.
 *
 * It has to be page by page rather than one ever-larger request: the server returns at most 200
 * rows, so asking for more fails and leaves the screen showing what it already had, with nothing
 * to say that the rest exists.
 *
 * @param {Function} useQuery an RTK Query list hook, e.g. useListNotificationsQuery
 * @param {Function} useLazy its lazy twin, e.g. useLazyListNotificationsQuery
 * @param {object} args the query arguments, without `page` or `limit`
 * @param {{ limit?: number, skip?: boolean }} [opts]
 */
export function usePagedQuery(useQuery, useLazy, args, opts = {}) {
  const limit = opts.limit ?? PAGE_SIZE;
  const sig = JSON.stringify(args ?? {});

  const first = useQuery({ ...args, page: 1, limit }, { skip: opts.skip });
  const [fetchPage, { isFetching: loadingMore }] = useLazy();
  const [extra, setExtra] = useState([]);
  const [page, setPage] = useState(1);

  // A change of filter or search is a different list, so it starts again at the top.
  useEffect(() => { setExtra([]); setPage(1); }, [sig]);

  const held = first.data?.total ?? 0;
  const items = [...(first.data?.items ?? []), ...extra];
  const more = Math.max(0, held - items.length);

  const loadMore = async () => {
    const next = page + 1;
    try {
      const r = await fetchPage({ ...args, page: next, limit }).unwrap();
      setExtra((x) => [...x, ...(r.items ?? [])]);
      setPage(next);
    } catch {
      // The rows already on screen stay; pressing again tries once more.
    }
  };

  return {
    // The first page's whole envelope, for lists that carry more than rows — the reminders list
    // sends its box counts alongside them.
    data: first.data,
    items,
    total: held,
    more,
    nextBatch: Math.min(more, limit),
    loadMore,
    loadingMore,
    error: first.error,
    isLoading: first.isLoading,
    isFetching: first.isFetching || loadingMore,
    refetch: first.refetch,
  };
}
