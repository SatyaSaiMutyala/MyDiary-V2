import { Router } from 'express';
import * as projects from '../controllers/projects.js';
import { requireAuth, requireModule } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { ensureProjectsSeeded } from '../services/projects.js';

/**
 * /api/projects — My Projects: the portfolio, one project with everything that hangs off it (milestones and
 * their acceptance criteria, tasks, risks, KPIs, the team) and the project template library.
 */
export const projectsRouter = Router();
projectsRouter.use(requireAuth, requireModule('projects'));

/**
 * The portfolio is never empty on a fresh database: the 9 sample projects and 12 templates are inserted on
 * the first request that reaches this router (idempotent — see services/projects.js `ensureProjectSeed`).
 * @type {import('express').RequestHandler}
 */
const seedPortfolio = async (_req, _res, next) => {
  await ensureProjectsSeeded();
  next();
};
projectsRouter.use(seedPortfolio);

// The template library first, so "templates" is never read as a project id.
projectsRouter.get('/templates', projects.listTemplates);
projectsRouter.get('/templates/:id', projects.getTemplate);
projectsRouter.post('/templates/:id/use', validateBody(projects.templateUseSchema), projects.useTemplate);

projectsRouter.get('/', projects.list);
projectsRouter.post('/', validateBody(projects.createSchema), projects.create);
projectsRouter.get('/:id', projects.get);
projectsRouter.patch('/:id', validateBody(projects.patchSchema), projects.update);
projectsRouter.delete('/:id', projects.remove);
projectsRouter.post('/:id/duplicate', projects.duplicate);
projectsRouter.post('/:id/comments', validateBody(projects.commentSchema), projects.addComment);

// Milestones and their acceptance criteria (criteria are addressed by position)
projectsRouter.post('/:id/milestones', validateBody(projects.milestoneSchema), projects.addMilestone);
projectsRouter.patch('/:id/milestones/:milestoneId', validateBody(projects.milestonePatchSchema), projects.updateMilestone);
projectsRouter.delete('/:id/milestones/:milestoneId', projects.removeMilestone);
projectsRouter.post('/:id/milestones/:milestoneId/criteria', validateBody(projects.criterionSchema), projects.addCriterion);
projectsRouter.patch('/:id/milestones/:milestoneId/criteria/:index', validateBody(projects.criterionPatchSchema), projects.updateCriterion);
projectsRouter.delete('/:id/milestones/:milestoneId/criteria/:index', projects.removeCriterion);

// Tasks
projectsRouter.post('/:id/tasks', validateBody(projects.taskSchema), projects.addTask);
projectsRouter.patch('/:id/tasks/:taskId', validateBody(projects.taskPatchSchema), projects.updateTask);
projectsRouter.delete('/:id/tasks/:taskId', projects.removeTask);

// Risks
projectsRouter.post('/:id/risks', validateBody(projects.riskSchema), projects.addRisk);
projectsRouter.patch('/:id/risks/:riskId', validateBody(projects.riskPatchSchema), projects.updateRisk);
projectsRouter.delete('/:id/risks/:riskId', projects.removeRisk);

// KPIs
projectsRouter.post('/:id/kpis', validateBody(projects.kpiSchema), projects.addKpi);
projectsRouter.patch('/:id/kpis/:kpiId', validateBody(projects.kpiPatchSchema), projects.updateKpi);
projectsRouter.delete('/:id/kpis/:kpiId', projects.removeKpi);

// The team: TDPL people and external collaborators
projectsRouter.post('/:id/team', validateBody(projects.memberSchema), projects.addMember);
projectsRouter.patch('/:id/team/:memberId', validateBody(projects.memberPatchSchema), projects.updateMember);
projectsRouter.delete('/:id/team/:memberId', projects.removeMember);
projectsRouter.post('/:id/external', validateBody(projects.externalSchema), projects.addExternal);
projectsRouter.patch('/:id/external/:memberId', validateBody(projects.externalPatchSchema), projects.updateExternal);
projectsRouter.delete('/:id/external/:memberId', projects.removeExternal);
