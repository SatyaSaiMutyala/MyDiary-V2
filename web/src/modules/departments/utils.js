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
//
// `dlg` is the page's useDialog() — a helper module cannot call the hook itself, so the page hands
// its dialogs in. Every question is awaited before the next one is asked.
export async function buildDepartmentFromTemplate(DEPT_TEMPLATES, dlg) {
  const menu = DEPT_TEMPLATES.map((t, i) => (i + 1) + '. ' + t.emoji + ' ' + t.name).join('\n');
  const pick = await dlg.prompt('Which department template?\n\n' + menu + '\n\nEnter a number, or blank to cancel.');
  if (!pick) return null;
  const idx = parseInt(pick.trim(), 10) - 1;
  if (idx < 0 || idx >= DEPT_TEMPLATES.length) return null;
  const tpl = DEPT_TEMPLATES[idx];
  const name = await dlg.prompt('Department name:', tpl.id === 'dt-blank' ? '' : '');
  if (!name || !name.trim()) return null;
  const icon = await dlg.prompt('Icon (one emoji):', tpl.emoji);
  if (icon === null) return null;
  const description = await dlg.prompt('Short description:', tpl.description.split('.')[0]);
  if (description === null) return null;

  const lane = (list) => (list || []).map((t, i) => ({
    order: i + 1,
    text: t.text,
    defaultTime: t.defaultTime || '',
    ...(t.position != null ? { positions: [t.position] } : {}),
  }));

  return {
    name: name.trim(),
    icon: icon.trim() || tpl.emoji,
    description,
    positions: (tpl.preset.positions || []).map(p => ({ name: p.name, description: p.description || '' })),
    openingTasks: lane(tpl.preset.openingTasks),
    closingTasks: lane(tpl.preset.closingTasks),
  };
}

// openDepartmentEditor (prototype 12876–12885)
export async function buildBlankDepartment(dlg) {
  const name = await dlg.prompt('Department name (e.g. "Clinical Laboratory"):');
  if (!name || !name.trim()) return null;
  const icon = await dlg.prompt('Icon (one emoji):', '🏢');
  if (icon === null) return null;
  const description = await dlg.prompt('Short description:', '');
  if (description === null) return null;
  return { name: name.trim(), icon: icon.trim() || '🏢', description };
}
