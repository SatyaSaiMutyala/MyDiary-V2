// All project mutations — the prototype's action functions (15306–15413, 15636–15666) against the API.
// Every prompt/confirm/alert text is kept; each edit is one request to the matching sub-resource endpoint,
// and a refused request shows the server's own message word for word.
//
// The dialogs are MyDiary's own (components/Dialogs), never the browser's — so every one of these is
// async, and each answer is awaited before the next question is asked.
import { useAppStore } from '../../store/AppStore';
import { errorMessage } from '../../store/api/baseApi';
import { useDialog } from '../../components/Dialogs';
import {
  useAddCriterionMutation, useAddExternalMutation, useAddKpiMutation, useAddMemberMutation, useAddMilestoneMutation,
  useAddProjectCommentMutation, useAddProjectRiskMutation, useAddProjectTaskMutation, useDuplicateProjectMutation,
  useRemoveProjectMutation, useUpdateCriterionMutation, useUpdateMilestoneMutation, useUpdateProjectRiskMutation,
  useUpdateProjectTaskMutation,
} from '../../store/api/projectsApi';
import { TODAY } from '../../utils/dates';
import { sortedMilestones } from './utils';

/**
 * @param {object} [project] the project the panes are showing — the prompts read their menus off it.
 * Portfolio actions (`duplicateProject`, `deleteProject`) take the project object instead.
 */
export default function useProjectActions(project) {
  const { state } = useAppStore();
  const dlg = useDialog();
  const me = state.viewer.name;

  const [addMilestone] = useAddMilestoneMutation();
  const [updateMilestone] = useUpdateMilestoneMutation();
  const [addCriterion] = useAddCriterionMutation();
  const [updateCriterion] = useUpdateCriterionMutation();
  const [addTask] = useAddProjectTaskMutation();
  const [updateTask] = useUpdateProjectTaskMutation();
  const [addRisk] = useAddProjectRiskMutation();
  const [updateRisk] = useUpdateProjectRiskMutation();
  const [addKpi] = useAddKpiMutation();
  const [addMember] = useAddMemberMutation();
  const [addExternal] = useAddExternalMutation();
  const [addComment] = useAddProjectCommentMutation();
  const [duplicate] = useDuplicateProjectMutation();
  const [remove] = useRemoveProjectMutation();

  /** Runs a mutation and shows the server's message as-is if it refuses. */
  const run = async (mutation, arg) => {
    try {
      await mutation(arg).unwrap();
      return true;
    } catch (err) {
      await dlg.alert(errorMessage(err));
      return false;
    }
  };

  const milestoneOf = (mid) => (project?.milestones || []).find((m) => m.id === mid);
  const riskOf = (rid) => (project?.risks || []).find((r) => r.id === rid);

  /** The prototype's "pick a milestone by number" prompt. Returns undefined when cancelled. */
  const pickMilestone = async (promptText, preset) => {
    const sorted = sortedMilestones(project || {});
    if (!sorted.length) return null;
    const menu = sorted.map((m, i) => `${i + 1}. ${m.name}`).join('\n');
    const ans = await dlg.prompt(`${promptText}\n\n${menu}\n0. None (project-wide)`, preset ?? '');
    if (ans === null) return undefined;
    if (ans.trim() === '' || ans.trim() === '0') return null;
    const idx = Number.parseInt(ans.trim(), 10) - 1;
    return idx >= 0 && idx < sorted.length ? sorted[idx].id : null;
  };

  return {
    toggleMilestone(pid, mid) {
      const m = milestoneOf(mid);
      if (!m) return;
      return run(updateMilestone, { id: pid, milestoneId: mid, status: m.status === 'done' ? 'todo' : 'done' });
    },
    updateMilestoneStatus(pid, mid, s) {
      return run(updateMilestone, { id: pid, milestoneId: mid, status: s });
    },
    async addMilestone(pid) {
      const name = await dlg.prompt('Milestone name:');
      if (!name) return;
      const due = await dlg.prompt('Due date (YYYY-MM-DD):', new Date(TODAY.getTime() + 30 * 86400000).toISOString().slice(0, 10));
      if (!due) return;
      const owner = (await dlg.prompt('Owner:', me)) || me;
      return run(addMilestone, { id: pid, name, dueDate: due, owner });
    },
    updateTaskStatus(pid, tid, s) {
      return run(updateTask, { id: pid, taskId: tid, status: s });
    },
    async addProjectTask(pid, presetMilestoneId) {
      const title = await dlg.prompt('Task title:');
      if (!title) return;
      const assignee = (await dlg.prompt('Assignee:', me)) || me;
      const due = await dlg.prompt('Due date (YYYY-MM-DD):', new Date(TODAY.getTime() + 14 * 86400000).toISOString().slice(0, 10));
      const priority = ((await dlg.prompt('Priority (low / medium / high / critical):', 'medium')) || 'medium').toLowerCase();

      let milestoneId = presetMilestoneId !== undefined ? presetMilestoneId : null;
      if (presetMilestoneId === undefined && (project?.milestones || []).length > 0) {
        const picked = await pickMilestone('Link to milestone? (enter number, or blank for none)');
        if (picked === undefined) return;
        milestoneId = picked;
      }
      return run(addTask, { id: pid, title, assignee, dueDate: due || '', priority, milestoneId });
    },
    toggleRisk(pid, rid) {
      const r = riskOf(rid);
      if (!r) return;
      return run(updateRisk, { id: pid, riskId: rid, status: r.status === 'mitigated' ? 'open' : 'mitigated' });
    },
    async addProjectRisk(pid) {
      const title = await dlg.prompt('Risk title (what could go wrong?):');
      if (!title) return;
      const severity = ((await dlg.prompt('Severity (low / medium / high / critical):', 'medium')) || 'medium').toLowerCase();
      const mitigation = (await dlg.prompt('Mitigation plan:', '')) || '';
      const owner = (await dlg.prompt('Risk owner:', me)) || me;

      let milestoneId = null;
      if ((project?.milestones || []).length > 0) {
        const picked = await pickMilestone('Link this risk to a milestone? (enter number, or blank for none)');
        if (picked === undefined) return;
        milestoneId = picked;
      }
      return run(addRisk, { id: pid, title, severity, mitigation, owner, milestoneId });
    },
    async linkRiskToMilestone(pid, rid) {
      const r = riskOf(rid);
      if (!r) return;
      if ((project?.milestones || []).length === 0) {
        await dlg.alert('No milestones to link to. Add a milestone first.');
        return;
      }
      const sorted = sortedMilestones(project);
      const preset = r.milestoneId ? String(sorted.findIndex((m) => m.id === r.milestoneId) + 1) : '';
      const picked = await pickMilestone('Link to which milestone?', preset);
      if (picked === undefined) return;
      return run(updateRisk, { id: pid, riskId: rid, milestoneId: picked });
    },
    toggleAcceptanceCriterion(pid, mid, idx) {
      const m = milestoneOf(mid);
      const c = m && (m.acceptanceCriteria || [])[idx];
      if (!c) return;
      // The API closes the milestone itself once the last criterion is ticked.
      return run(updateCriterion, { id: pid, milestoneId: mid, index: idx, done: !c.done });
    },
    async addAcceptanceCriterion(pid, mid) {
      const txt = await dlg.prompt('Acceptance criterion (e.g. "All SOPs HOD-signed"):');
      if (!txt || !txt.trim()) return;
      return run(addCriterion, { id: pid, milestoneId: mid, text: txt.trim() });
    },
    async addProjComment(pid, txt) {
      const t = (txt || '').trim();
      if (!t) return false;
      return run(addComment, { id: pid, text: t });
    },
    /** KPIs pane — the prototype only promised this dialog; it now writes through the KPI endpoint. */
    async addKpi(pid) {
      const name = await dlg.prompt('KPI name (e.g. SOPs reviewed):');
      if (!name || !name.trim()) return;
      const current = Number.parseFloat((await dlg.prompt('Current value:', '0')) || '0');
      const target = Number.parseFloat((await dlg.prompt('Target value:', '100')) || '100');
      const unit = (await dlg.prompt('Unit (%, days, blank for none):', '')) || '';
      if (Number.isNaN(current) || Number.isNaN(target)) {
        await dlg.alert('Current and target must be numbers.');
        return;
      }
      return run(addKpi, { id: pid, name: name.trim(), current, target, unit });
    },
    /** Team pane — same idea for the two "+ Invite" links. */
    async inviteMember(pid) {
      const name = await dlg.prompt('TDPL member name:');
      if (!name || !name.trim()) return;
      const role = (await dlg.prompt('Role on this project (e.g. Project Lead, Analyst):', '')) || '';
      return run(addMember, { id: pid, name: name.trim(), role });
    },
    async inviteExternal(pid) {
      const name = await dlg.prompt('External collaborator name:');
      if (!name || !name.trim()) return;
      const email = (await dlg.prompt('Email:', '')) || '';
      const role = (await dlg.prompt('Role / organisation:', '')) || '';
      return run(addExternal, { id: pid, name: name.trim(), email, role });
    },
    async duplicateProject(p) {
      if (!p) return false;
      if (!(await dlg.confirm('Duplicate "' + p.name + '" as a new project?'))) return false;
      const ok = await run(duplicate, p.id);
      if (ok) await dlg.alert('✓ Project duplicated.');
      return ok;
    },
    async deleteProject(p) {
      if (!p) return false;
      if (!(await dlg.confirm('Delete project "' + p.name + '"? This cannot be undone.'))) return false;
      return run(remove, p.id);
    },
  };
}
