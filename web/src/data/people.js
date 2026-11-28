import { useMemo } from 'react';
import { useListPeopleQuery } from '../store/api/usersApi';

/**
 * The real staff list, for every screen that puts a person's name on something.
 *
 * It replaces `data/employees.js`, the roster the prototype shipped with. Those names were useful
 * while the screens were being drawn and wrong the moment the app had accounts: a visit's team, a
 * log's participants, a project's owner and a diary's invitees are all matched back to accounts by
 * name, so a name suggested from the sample roster belongs to nobody. The person is never shown the
 * thing they were put on and never notified about it, and nothing looks broken.
 *
 * Everyone signed in may read this (GET /api/users/directory returns names and where people sit,
 * nothing else), so it works for an employee filling in a visit report as well as for an admin.
 *
 * @returns {{ people: { id: string, name: string, role: string, department: string }[], names: string[], loading: boolean }}
 */
export function usePeopleOptions() {
  const { data, isLoading } = useListPeopleQuery();
  return useMemo(() => {
    const people = (data ?? []).map((u) => ({
      id: u.id,
      name: u.name,
      role: u.title || u.position || '',
      department: u.department || '',
    }));
    return { people, names: people.map((p) => p.name), loading: isLoading };
  }, [data, isLoading]);
}

/**
 * The same list grouped by department, for the pickers that show headings.
 * @param {{ name: string, role: string, department: string }[]} people
 */
export function groupByDepartment(people) {
  const by = new Map();
  for (const p of people) {
    const key = p.department || 'No department';
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(p);
  }
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([group, rows]) => ({ group, people: rows }));
}
