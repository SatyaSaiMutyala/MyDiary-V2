// Department Master helpers — 1:1 ports of the prototype's deptTaskList / template builders.

export function deptTaskList(d, kind) {
  if (kind === 'opening') return d.openingTasks;
  if (kind === 'closing') return d.closingTasks;
  if (kind === 'weekly') { if (!d.weeklyTasks) d.weeklyTasks = []; return d.weeklyTasks; }
  if (kind === 'monthly') { if (!d.monthlyTasks) d.monthlyTasks = []; return d.monthlyTasks; }
  return [];
}

export const rid = () => Date.now() + Math.random().toString(36).slice(2, 5);

export const emptyReviewCadence = () => ({
  weekly: { daysOfWeek: [], time: '', duration: 45 },
  monthly: { dayOfMonth: '', time: '', duration: 60 },
  owner: '', primarySystems: [],
  weeklyAgenda: [], monthlyAgenda: [],
});

// pickDepartmentTemplate (prototype 12824–12874) — returns the new department or null if cancelled
export function buildDepartmentFromTemplate(DEPT_TEMPLATES, departmentsCount) {
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
  const id = 'd' + Date.now();
  const code = 'TDPL-NEW-' + String(departmentsCount + 1).padStart(3, '0');

  // Build positions with real ids
  const positions = (tpl.preset.positions || []).map((p, i) => ({
    id: 'p' + Date.now() + '-' + i,
    name: p.name,
    description: p.description || '',
  }));
  const resolvePos = (pi) => (pi != null && positions[pi]) ? [positions[pi].id] : [];

  const openingTasks = (tpl.preset.openingTasks || []).map((t, i) => ({
    id: 't' + Date.now() + '-o-' + i,
    order: i + 1,
    text: t.text,
    defaultTime: t.defaultTime || '',
    positionIds: resolvePos(t.position),
  }));
  const closingTasks = (tpl.preset.closingTasks || []).map((t, i) => ({
    id: 't' + Date.now() + '-c-' + i,
    order: i + 1,
    text: t.text,
    defaultTime: t.defaultTime || '',
    positionIds: resolvePos(t.position),
  }));

  return {
    id, code, name: name.trim(), icon, description,
    positions, openingTasks, closingTasks, weeklyTasks: [], monthlyTasks: [],
    reviewCadence: emptyReviewCadence(),
  };
}

// openDepartmentEditor (prototype 12876–12885)
export function buildBlankDepartment(departmentsCount) {
  const name = window.prompt('Department name (e.g. "Clinical Laboratory"):');
  if (!name || !name.trim()) return null;
  const icon = window.prompt('Icon (one emoji):', '🏢') || '🏢';
  const description = window.prompt('Short description:', '') || '';
  const id = 'd' + Date.now();
  const code = 'TDPL-NEW-' + String(departmentsCount + 1).padStart(3, '0');
  return { id, code, name: name.trim(), icon, description, positions: [], openingTasks: [], closingTasks: [], weeklyTasks: [], monthlyTasks: [] };
}
