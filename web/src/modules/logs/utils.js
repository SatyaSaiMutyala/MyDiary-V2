// Discussion-log helpers — 1:1 ports of the prototype's logic (lines 10700–11324)
import { TODAY, parseDate, formatDate, DAYS, MONTHS, todayStr } from '../../utils/dates';
import { EMPLOYEES } from '../../data/employees';

// Who can see my logs and who I have spoken with are both answered by the API now:
// GET /api/logs?mine=true scopes the list to the signed-in person (the prototype's myLogs), and
// GET /api/logs/people groups them person by person (the prototype's allPeopleIveSpokenWith).

// Sort newest first and group by date → [{ dateStr, items, relative, isToday, big }]
export function groupLogsByDay(logs) {
  const sorted = [...logs].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const grouped = {};
  sorted.forEach(l => { if (!grouped[l.date]) grouped[l.date] = []; grouped[l.date].push(l); });
  const today = todayStr();
  return Object.entries(grouped).map(([dateStr, items]) => {
    const dt = parseDate(dateStr);
    const diff = Math.round((TODAY - dt) / 86400000);
    const relative = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff <= 7 ? diff + ' days ago' : formatDate(dt);
    return { dateStr, items, relative, isToday: dateStr === today, big: `${DAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}` };
  });
}

// Fallback for the internal-person datalist. People come from GET /api/users (fields=name,title); that
// endpoint is admin-only, so for everyone else the modal falls back to this roster.
export const EMPLOYEE_OPTIONS = EMPLOYEES.flatMap(g => g.people.map(p => ({ name: p.name, role: p.role })));

// Fresh draft for the New Log modal (openLogModal(preset) in the prototype)
export function newLogDraft(preset) {
  return {
    id: preset?.id || null,
    channel: preset?.channel || 'phone',
    date: preset?.date || todayStr(),
    time: preset?.time || new Date().toTimeString().slice(0, 5),
    duration: preset?.duration || '',
    with: preset?.with ? preset.with.map(p => ({ ...p })) : [],
    topic: preset?.topic || '',
    summary: preset?.summary || '',
    decisions: preset?.decisions || '',
    tags: preset?.tags ? [...preset.tags] : [],
    followUps: preset?.followUps ? preset.followUps.map(f => ({ ...f })) : [],
    privacy: preset?.privacy || 'private',
  };
}

/**
 * The draft as POST / PATCH /api/logs wants it. Blank optional values are sent as '' (the API accepts an
 * empty time, duration, deadline and decisions text), and a follow-up with no text is dropped — the
 * prototype dropped those too.
 */
export function toLogBody(d) {
  return {
    date: d.date,
    time: d.time || '',
    duration: (d.duration || '').trim(),
    channel: d.channel,
    with: d.with.map(p => ({ name: p.name, type: p.type || 'internal', email: p.email || '' })),
    topic: d.topic.trim(),
    summary: d.summary.trim(),
    decisions: (d.decisions || '').trim(),
    tags: [...(d.tags || [])],
    followUps: (d.followUps || [])
      .filter(f => (f.text || '').trim())
      .map(f => ({ text: f.text.trim(), owner: (f.owner || '').trim(), ownerType: f.ownerType || 'internal', deadline: f.deadline || '', done: !!f.done })),
    privacy: d.privacy || 'private',
  };
}
