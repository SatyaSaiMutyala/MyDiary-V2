// Department Master helpers — the prototype's template builders, re-aimed at POST /api/departments.

export const rid = () => Date.now() + Math.random().toString(36).slice(2, 5);

/**
 * Debounces by key, so typing in an inline row input sends one PATCH when the person stops typing
 * instead of one per keystroke. Toggles and chips stay immediate.
 */
export function makeDebouncer(delay = 450) {
  const timers = new Map();
  return (key, fn) => {
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => { timers.delete(key); fn(); }, delay));
  };
}

// pickDepartmentTemplate (prototype 12824–12874) — the create body for the API, or null if cancelled.
// Tasks point at their position by index (`positions: [0]`), which is how the templates describe them;
// the API resolves those to the real position ids once it has created them.
export function buildDepartmentFromTemplate(DEPT_TEMPLATES) {
  const menu = DEPT_TEMPLATES.map((t, i) => (i + 1) + '. ' + t.emoji + ' ' + t.name).join('\n');
  const pick = window.prompt('Which department template?\n\n' + menu + '\n\nEnter a number, or blank to cancel.');
  if (!pick) return null;
  const idx = parseInt(pick.trim(), 10) - 1;
  if (idx < 0 || idx >= DEPT_TEMPLATES.length) return null;
  const tpl = DEPT_TEMPLATES[idx];
  const name = window.prompt('Department name:', tpl.id === 'dt-blank' ? '' : '');
  if (!name || !name.trim()) return null;
  const icon = window.prompt('Icon (one emoji):', tpl.emoji) || tpl.emoji;
  const description = window.prompt('Short description:', tpl.description.split('.')[0]) || '';

  const lane = (list) => (list || []).map((t, i) => ({
    order: i + 1,
    text: t.text,
    defaultTime: t.defaultTime || '',
    ...(t.position != null ? { positions: [t.position] } : {}),
  }));

  return {
    name: name.trim(),
    icon,
    description,
    positions: (tpl.preset.positions || []).map(p => ({ name: p.name, description: p.description || '' })),
    openingTasks: lane(tpl.preset.openingTasks),
    closingTasks: lane(tpl.preset.closingTasks),
  };
}

// openDepartmentEditor (prototype 12876–12885)
export function buildBlankDepartment() {
  const name = window.prompt('Department name (e.g. "Clinical Laboratory"):');
  if (!name || !name.trim()) return null;
  const icon = window.prompt('Icon (one emoji):', '🏢') || '🏢';
  const description = window.prompt('Short description:', '') || '';
  return { name: name.trim(), icon, description };
}
