import React, { useMemo, useState } from 'react';

import { errorMessage } from '../store';
import { usePeoplePagedInfiniteQuery } from '../store/api/tasksApi';
import { useDebounced } from '../utils/useDebounced';

import { SearchDropdown } from './SearchDropdown';

// Pick an employee. The list is searched and paged by the server
// (GET /users?search=&page=), so it works with any number of people.
export function PersonPicker({
  value,
  onChange,
  label,
  placeholder = 'Select person',
  excludeMe = false,
  style,
}) {
  const [search, setSearch] = useState('');
  const term = useDebounced(search.trim());
  const query = usePeoplePagedInfiniteQuery({
    ...(term ? { search: term } : null),
    ...(excludeMe ? { exclude_me: 1 } : null),
  });

  // The answer for exactly this search; empty while it is being fetched.
  const current = query.currentData;
  const options = useMemo(
    () =>
      (current?.pages ?? [])
        .flatMap(p => p.data)
        .map(p => ({
          id: String(p.id),
          label: p.name,
          detail:
            [p.designation, p.deptName].filter(Boolean).join(' · ') || p.email,
        })),
    [current],
  );
  const failed = !current && !!query.error;

  return (
    <SearchDropdown
      label={label}
      placeholder={placeholder}
      searchPlaceholder="Search by name, email or role"
      emptyText={term ? `No one matches "${term}".` : 'No people to show.'}
      selected={value}
      onChange={onChange}
      options={options}
      search={search}
      onSearch={setSearch}
      // Also true while the typed text is waiting to be sent.
      loading={(!current && !failed) || term !== search.trim()}
      loadingMore={query.isFetchingNextPage}
      error={failed ? errorMessage(query.error) : undefined}
      onEndReached={() => {
        if (current && query.hasNextPage && !query.isFetching) {
          query.fetchNextPage();
        }
      }}
      style={style}
    />
  );
}
