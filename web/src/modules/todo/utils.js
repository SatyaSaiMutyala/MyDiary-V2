// collectTodoItems — unifies tasks from visits and standalone into one shape
// { id, desc, owner, ownerType, deadline, priority, status, source, sourceId, sourceTitle, creator, raw, parent }
// Meeting action items are NOT here any more: they come from GET /api/action-items (see actionToTodo).
export function collectTodoItems(state) {
  const items = [];
  // Visits → actionItems
  (state.visits || []).forEach(v => {
    (v.actionItems || []).forEach((a, i) => {
      // Synth an id and stable status (visits don't currently track per-item status)
      const synthId = 'vai-' + v.id + '-' + i;
      items.push({
        id: synthId, desc: a.text, owner: a.owner, ownerType: 'internal',
        deadline: a.deadline, priority: a.priority || 'medium', status: a.status || 'open',
        source: 'visits', sourceId: v.id, sourceTitle: v.title, creator: v.owner,
        raw: a, parent: v,
      });
    });
  });
  // Standalone
  (state.standaloneTasks || []).forEach(t => {
    items.push({
      id: t.id, desc: t.desc, owner: t.owner, ownerType: t.ownerType || 'internal',
      deadline: t.deadline, priority: t.priority || 'medium', status: t.status || 'open',
      source: 'standalone', sourceId: t.id, sourceTitle: 'Ad-hoc task', creator: t.creator,
      raw: t, parent: null,
    });
  });
  return items;
}

/**
 * One action item from GET /api/action-items in the same shape. `creator` is who created the item on the
 * meeting (the API's `createdBy.name`), which is what the "Delegated by" line shows.
 */
export function actionToTodo(a) {
  // A task allocated from this screen has no meeting behind it, so it belongs under Standalone
  // rather than From Meetings — otherwise the source filters count it in the wrong place and the
  // card tries to link back to a meeting that was never there.
  const standalone = a.source === 'standalone' || !a.meetingId;
  return {
    id: a.id, desc: a.desc, owner: a.owner, ownerType: a.ownerType || 'internal',
    deadline: a.deadline, priority: a.priority || 'medium', status: a.status || 'open',
    source: standalone ? 'standalone' : 'meetings',
    sourceId: standalone ? a.id : a.meetingId,
    sourceTitle: standalone ? 'Ad-hoc task' : a.meetingTitle,
    creator: a.createdBy?.name || '',
    // Tells the screen this one is on the server, so it is changed through the API rather than in
    // the browser's own copy — the visits and demo rows beside it are not.
    fromApi: true,
    meetingId: a.meetingId ?? null,
    raw: a, parent: null,
  };
}

/** "N. Sharma (CFO)" and "N. Sharma" are the same person (the API compares names the same way). */
export const samePerson = (a, b) => String(a ?? '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
  === String(b ?? '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
