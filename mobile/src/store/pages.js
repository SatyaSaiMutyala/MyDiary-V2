// The v2 API's page shape (Backend/src/utils/paginate.js): the rows are `items`, and the
// counts sit beside them rather than under a `meta` key.

// Joins the pages of an RTK infinite query into one list, with the flags a
// screen needs: shimmer on first load, shimmer at the end while loading more.
export function pagesOf(query) {
  // The answer for exactly these arguments. Empty until it arrives, so
  // "nothing here" is never shown while the list is still being fetched.
  const current = query.currentData;
  const failed = !current && !!query.error;
  return {
    rows: (current?.pages ?? []).flatMap(p => p.items),
    total: current?.pages[0]?.total ?? 0,
    error: query.error,
    failed,
    firstLoad: !current && !failed,
    loadingMore: query.isFetchingNextPage,
    hasMore: !!query.hasNextPage,
    // The guard stops a second request while one is already on its way.
    loadMore: () => {
      if (current && query.hasNextPage && !query.isFetching) {
        query.fetchNextPage();
      }
    },
  };
}
