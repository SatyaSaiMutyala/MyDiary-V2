import { Router } from 'express';
import * as departments from '../controllers/departments.js';
import { requireAuth, requireModule } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

/**
 * /api/departments — Department Master (the organisational backbone), plus the two reads that hang off it:
 * the org-wide person → department map and the daily shift ticks behind My Activity and the Dashboard.
 *
 * Everything needs a signed-in user. Configuring a department needs the `departments` module; the three
 * reads the other two screens live on (`GET /`, `GET /:id`, `GET /assignments`, `GET /activity`) are also
 * open to people who only have `activity` or `dashboard`, and `GET /activity` only ever shows somebody
 * else's ticks to a person who has `dashboard` or `departments` (see controllers/departments.js).
 */
export const departmentsRouter = Router();
departmentsRouter.use(requireAuth);

const read = requireModule('departments', 'activity', 'dashboard');
const write = requireModule('departments');
const mine = requireModule('activity', 'departments', 'dashboard');

// Fixed paths first, so they are not read as /:id.
departmentsRouter.get('/assignments', read, departments.listAssignments);
departmentsRouter.get('/activity', mine, departments.getActivity);
departmentsRouter.put('/activity', mine, validateBody(departments.tickSchema), departments.putActivityTick);

departmentsRouter.get('/', read, departments.list);
departmentsRouter.post('/', write, validateBody(departments.createSchema), departments.create);
departmentsRouter.get('/:id', read, departments.get);
departmentsRouter.patch('/:id', write, validateBody(departments.patchSchema), departments.update);
departmentsRouter.delete('/:id', write, departments.remove);

// Positions
departmentsRouter.post('/:id/positions', write, validateBody(departments.positionSchema), departments.addPosition);
departmentsRouter.patch('/:id/positions/:positionId', write, validateBody(departments.positionPatchSchema), departments.updatePosition);
departmentsRouter.delete('/:id/positions/:positionId', write, departments.removePosition);

// The four task lanes: kind = opening | closing | weekly | monthly
departmentsRouter.post('/:id/tasks/:kind', write, validateBody(departments.taskSchema), departments.addTask);
departmentsRouter.patch('/:id/tasks/:kind/:taskId', write, validateBody(departments.taskPatchSchema), departments.updateTask);
departmentsRouter.delete('/:id/tasks/:kind/:taskId', write, departments.removeTask);

// Review cadence: the settings, then the weekly / monthly agenda templates
departmentsRouter.put('/:id/cadence', write, validateBody(departments.cadenceSchema), departments.putCadence);
departmentsRouter.post('/:id/cadence/:tab/sections', write, validateBody(departments.sectionSchema), departments.addSection);
departmentsRouter.patch('/:id/cadence/:tab/sections/:sectionId', write, validateBody(departments.sectionPatchSchema), departments.updateSection);
departmentsRouter.delete('/:id/cadence/:tab/sections/:sectionId', write, departments.removeSection);
departmentsRouter.post('/:id/cadence/:tab/sections/:sectionId/points', write, validateBody(departments.pointSchema), departments.addPoint);
departmentsRouter.patch('/:id/cadence/:tab/sections/:sectionId/points/:pointId', write, validateBody(departments.pointPatchSchema), departments.updatePoint);
departmentsRouter.delete('/:id/cadence/:tab/sections/:sectionId/points/:pointId', write, departments.removePoint);

// Who works in this department
departmentsRouter.put('/:id/assignments', write, validateBody(departments.assignmentsSchema), departments.putAssignments);
