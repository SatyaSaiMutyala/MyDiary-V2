// All project mutations — a 1:1 port of the prototype's action functions (15306–15413, 15636–15666).
// Prompts/confirms/alerts keep the exact texts. Each mutation runs on a deep clone via mutate('projects').
import { useAppStore } from '../../store/AppStore';
import { TODAY } from '../../utils/dates';
import { milestoneAcceptanceProgress, sortedMilestones } from './utils';

export default function useProjectActions() {
  const { state, mutate } = useAppStore();
  const me = state.viewer.name;
  const find = (pid) => state.projects.find(x => x.id === pid);

  // Runs fn(p) on the cloned project inside the store
  const edit = (pid, fn) => mutate('projects', ps => { const p = ps.find(x => x.id === pid); if (p) fn(p); });

  return {
    toggleMilestone(pid, mid) {
      edit(pid, p => {
        const m = p.milestones.find(x => x.id === mid); if (!m) return;
        m.status = m.status === 'done' ? 'todo' : 'done';
        p.activity.unshift({ user: me, action: (m.status === 'done' ? 'completed' : 'reopened') + ' milestone "' + m.name + '"', at: 'Just now' });
      });
    },
    updateMilestoneStatus(pid, mid, s) {
      edit(pid, p => {
        const m = p.milestones.find(x => x.id === mid); if (!m) return;
        m.status = s;
        p.activity.unshift({ user: me, action: 'set milestone "' + m.name + '" → ' + s, at: 'Just now' });
      });
    },
    addMilestone(pid) {
      const p = find(pid); if (!p) return;
      const name = window.prompt('Milestone name:'); if (!name) return;
      const due = window.prompt('Due date (YYYY-MM-DD):', new Date(TODAY.getTime() + 30 * 86400000).toISOString().slice(0, 10));
      if (!due) return;
      const owner = window.prompt('Owner:', me) || me;
      edit(pid, q => {
        q.milestones.push({ id: 'm' + Date.now(), name, dueDate: due, status: 'todo', owner, description: '', acceptanceCriteria: [] });
        q.activity.unshift({ user: me, action: 'added milestone "' + name + '"', at: 'Just now' });
      });
    },
    updateTaskStatus(pid, tid, s) {
      edit(pid, p => {
        const t = p.tasks.find(x => x.id === tid); if (!t) return;
        t.status = s;
        p.activity.unshift({ user: me, action: 'moved task "' + t.title + '" → ' + s, at: 'Just now' });
      });
    },
    addProjectTask(pid, presetMilestoneId) {
      const p = find(pid); if (!p) return;
      const title = window.prompt('Task title:'); if (!title) return;
      const assignee = window.prompt('Assignee:', me) || me;
      const due = window.prompt('Due date (YYYY-MM-DD):', new Date(TODAY.getTime() + 14 * 86400000).toISOString().slice(0, 10));
      const priority = (window.prompt('Priority (low / medium / high / critical):', 'medium') || 'medium').toLowerCase();

      let milestoneId = presetMilestoneId !== undefined ? presetMilestoneId : null;
      if (presetMilestoneId === undefined && (p.milestones || []).length > 0) {
        const sorted = sortedMilestones(p);
        const menu = sorted.map((m, i) => (i + 1) + '. ' + m.name).join('\n');
        const pick = window.prompt('Link to milestone? (enter number, or blank for none)\n\n' + menu + '\n0. None (project-level task)');
        if (pick && pick.trim() !== '' && pick.trim() !== '0') {
          const idx = parseInt(pick.trim(), 10) - 1;
          if (idx >= 0 && idx < sorted.length) milestoneId = sorted[idx].id;
        }
      }
      edit(pid, q => {
        if (!q.tasks) q.tasks = [];
        q.tasks.push({ id: 't' + Date.now(), title, assignee, status: 'todo', dueDate: due, priority, milestoneId });
        q.activity.unshift({ user: me, action: 'added task "' + title + '"' + (milestoneId ? ' → milestone' : ''), at: 'Just now' });
      });
    },
    toggleRisk(pid, rid) {
      edit(pid, p => {
        const r = p.risks.find(x => x.id === rid); if (!r) return;
        r.status = r.status === 'mitigated' ? 'open' : 'mitigated';
        p.activity.unshift({ user: me, action: (r.status === 'mitigated' ? 'mitigated' : 're-opened') + ' risk "' + r.title + '"', at: 'Just now' });
      });
    },
    addProjectRisk(pid) {
      const p = find(pid); if (!p) return;
      const title = window.prompt('Risk title (what could go wrong?):'); if (!title) return;
      const severity = (window.prompt('Severity (low / medium / high / critical):', 'medium') || 'medium').toLowerCase();
      const mitigation = window.prompt('Mitigation plan:', '') || '';
      const owner = window.prompt('Risk owner:', me) || me;

      let milestoneId = null;
      if ((p.milestones || []).length > 0) {
        const sorted = sortedMilestones(p);
        const menu = sorted.map((m, i) => (i + 1) + '. ' + m.name).join('\n');
        const pick = window.prompt('Link this risk to a milestone? (enter number, or blank for none)\n\n' + menu + '\n0. None (project-wide risk)');
        if (pick && pick.trim() !== '' && pick.trim() !== '0') {
          const idx = parseInt(pick.trim(), 10) - 1;
          if (idx >= 0 && idx < sorted.length) milestoneId = sorted[idx].id;
        }
      }
      edit(pid, q => {
        if (!q.risks) q.risks = [];
        q.risks.push({ id: 'r' + Date.now(), title, severity, mitigation, owner, status: 'open', milestoneId });
        q.activity.unshift({ user: me, action: 'added risk "' + title + '"' + (milestoneId ? ' → milestone' : ''), at: 'Just now' });
      });
    },
    linkRiskToMilestone(pid, rid) {
      const p = find(pid); if (!p) return;
      const r = p.risks.find(x => x.id === rid); if (!r) return;
      if ((p.milestones || []).length === 0) { window.alert('No milestones to link to. Add a milestone first.'); return; }
      const sorted = sortedMilestones(p);
      const menu = sorted.map((m, i) => (i + 1) + '. ' + m.name).join('\n');
      const ans = window.prompt('Link to which milestone?\n\n' + menu + '\n0. None (make it project-wide)', r.milestoneId ? String(sorted.findIndex(m => m.id === r.milestoneId) + 1) : '');
      if (ans === null) return;
      if (ans.trim() === '' || ans.trim() === '0') { edit(pid, q => { const rr = q.risks.find(x => x.id === rid); if (rr) rr.milestoneId = null; }); return; }
      const idx = parseInt(ans.trim(), 10) - 1;
      if (idx >= 0 && idx < sorted.length) edit(pid, q => { const rr = q.risks.find(x => x.id === rid); if (rr) rr.milestoneId = sorted[idx].id; });
    },
    toggleAcceptanceCriterion(pid, mid, idx) {
      edit(pid, p => {
        const m = p.milestones.find(x => x.id === mid); if (!m) return;
        if (!m.acceptanceCriteria || !m.acceptanceCriteria[idx]) return;
        m.acceptanceCriteria[idx].done = !m.acceptanceCriteria[idx].done;
        const ap = milestoneAcceptanceProgress(m);
        if (ap.total > 0 && ap.pct === 100 && m.status !== 'done') {
          m.status = 'done';
          p.activity.unshift({ user: me, action: 'auto-closed milestone "' + m.name + '" (all acceptance criteria met)', at: 'Just now' });
        }
      });
    },
    addAcceptanceCriterion(pid, mid) {
      const txt = window.prompt('Acceptance criterion (e.g. "All SOPs HOD-signed"):');
      if (!txt || !txt.trim()) return;
      edit(pid, p => {
        const m = p.milestones.find(x => x.id === mid); if (!m) return;
        if (!m.acceptanceCriteria) m.acceptanceCriteria = [];
        m.acceptanceCriteria.push({ text: txt.trim(), done: false });
      });
    },
    addProjComment(pid, txt) {
      const t = (txt || '').trim(); if (!t) return false;
      edit(pid, p => { p.activity.unshift({ user: me, action: 'commented: "' + t + '"', at: 'Just now' }); });
      return true;
    },
    duplicateProject(pid) {
      const p = find(pid); if (!p) return;
      if (!window.confirm('Duplicate "' + p.name + '" as a new project?')) return;
      mutate('projects', ps => {
        const src = ps.find(x => x.id === pid); if (!src) return;
        const copy = JSON.parse(JSON.stringify(src));
        copy.id = 'proj' + Date.now();
        copy.code = src.code + '-COPY';
        copy.name = src.name + ' (Copy)';
        copy.status = 'planning';
        copy.progress = 0;
        copy.milestones.forEach(m => { m.status = 'todo'; });
        copy.tasks.forEach(t => { t.status = 'todo'; });
        copy.activity = [{ user: me, action: 'duplicated from ' + src.code, at: 'Just now' }];
        ps.unshift(copy);
      });
      window.alert('✓ Project duplicated.');
    },
    deleteProject(pid) {
      const p = find(pid); if (!p) return false;
      if (!window.confirm('Delete project "' + p.name + '"? This cannot be undone.')) return false;
      mutate('projects', ps => ps.filter(x => x.id !== pid));
      return true;
    },
  };
}
