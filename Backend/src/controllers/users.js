import { z } from 'zod';
import { currentUser } from '../middleware/auth.js';
import { USER_STATUSES, User, serializeUser } from '../models/User.js';
import { describeChanges } from '../services/audit.js';
import { MODULES, ROLES, defaultModules } from '../services/modules.js';
import * as usersService from '../services/users.js';
import { badRequest } from '../utils/errors.js';
import { buildListQuery } from '../utils/listQuery.js';
import { runList } from '../utils/paginate.js';
import { nameField, passwordField, titleField } from './auth.js';

const emailField = z.string({ error: 'Enter an email.' }).trim().toLowerCase().pipe(z.email({ error: 'Enter a valid email.' }));
const departmentField = z.string({ error: 'Department must be text.' }).trim().max(80, 'Department is too long (max 80).');
const roleField = z.enum(ROLES, { error: 'Role must be admin, manager or employee.' });
const statusField = z.enum(USER_STATUSES, { error: 'Status must be active or inactive.' });
const modulesField = z.array(z.string({ error: 'Each module must be a key.' }), { error: 'modules must be a list of module keys.' }).max(50);

export const createSchema = z
  .object({
    name: nameField,
    email: emailField,
    title: titleField.optional(),
    department: departmentField.optional(),
    role: roleField,
    status: statusField.optional(),
    modules: modulesField.optional(),
    password: passwordField.optional(),
  })
  .strict();

export const patchSchema = z
  .object({
    name: nameField.optional(),
    email: emailField.optional(),
    title: titleField.optional(),
    department: departmentField.optional(),
    role: roleField.optional(),
    status: statusField.optional(),
    modules: modulesField.optional(),
  })
  .strict();

export const resetPasswordSchema = z.object({ password: passwordField }).strict();

/** List contract for GET /api/users (utils/listQuery.js). @type {import('../utils/listQuery.js').ListSpec} */
export const USERS_LIST = {
  searchFields: ['name', 'email', 'title', 'department'],
  filterFields: { role: 'enum', status: 'enum', department: 'string' },
  enums: { role: ROLES, status: USER_STATUSES },
  dateFields: ['createdAt', 'updatedAt'],
  defaultDateField: 'createdAt',
  sortFields: ['name', 'email', 'title', 'department', 'role', 'status', 'createdAt', 'updatedAt'],
  defaultSort: 'name',
  fields: ['name', 'email', 'role', 'title', 'department', 'modules', 'status', 'createdAt', 'updatedAt'],
};

const CHANGE_FIELDS = ['name', 'email', 'title', 'department', 'role', 'status', 'modules'];
const snapshot = (u) => ({ name: u.name, email: u.email, title: u.title, department: u.department, role: u.role, status: u.status, modules: [...u.modules] });

/** GET /api/users/modules — the module registry for the permissions editor. @type {import('express').RequestHandler} */
export const modules = (_req, res) => {
  res.json({ modules: MODULES, roles: ROLES, defaults: Object.fromEntries(ROLES.map((r) => [r, defaultModules(r)])) });
};

/** GET /api/users/departments — distinct non-empty departments, A→Z. @type {import('express').RequestHandler} */
export const departments = async (_req, res) => {
  const list = await User.distinct('department');
  res.json({ departments: list.filter((d) => typeof d === 'string' && d.trim()).sort((a, b) => a.localeCompare(b)) });
};

/** GET /api/users @type {import('express').RequestHandler} */
export const list = async (req, res) => {
  res.json(await runList(User, buildListQuery(req.query, USERS_LIST), serializeUser));
};

/** POST /api/users @type {import('express').RequestHandler} */
export const create = async (req, res) => {
  const user = await usersService.createUser(req.body);
  res.locals.audit = { entity: user.name, entityId: user._id.toString(), details: `Created ${user.role} account ${user.email}` };
  res.status(201).json({ user: serializeUser(user) });
};

/** GET /api/users/:id @type {import('express').RequestHandler} */
export const get = async (req, res) => {
  res.json({ user: serializeUser(await usersService.findUserOr404(req.params.id)) });
};

/** PATCH /api/users/:id @type {import('express').RequestHandler} */
export const update = async (req, res) => {
  const me = currentUser(req);
  const user = await usersService.findUserOr404(req.params.id);
  const isSelf = user._id.equals(me._id);
  if (isSelf && req.body.status === 'inactive') throw badRequest('You cannot deactivate your own account.');
  if (isSelf && req.body.role !== undefined && req.body.role !== 'admin') throw badRequest('You cannot remove your own admin role.');
  const before = await usersService.updateUser(user, req.body);
  const details = describeChanges(before, snapshot(user), CHANGE_FIELDS);
  res.locals.audit = details ? { entity: user.name, entityId: user._id.toString(), details } : false;
  res.json({ user: serializeUser(user) });
};

/** DELETE /api/users/:id @type {import('express').RequestHandler} */
export const remove = async (req, res) => {
  const me = currentUser(req);
  const user = await usersService.findUserOr404(req.params.id);
  if (user._id.equals(me._id)) throw badRequest('You cannot delete your own account.');
  await user.deleteOne();
  res.locals.audit = { entity: user.name, entityId: user._id.toString(), details: `Deleted ${user.role} account ${user.email}` };
  res.json({ ok: true });
};

/** POST /api/users/:id/reset-password @type {import('express').RequestHandler} */
export const resetPassword = async (req, res) => {
  const user = await usersService.findUserOr404(req.params.id);
  user.passwordHash = await usersService.hashPassword(req.body.password);
  await user.save();
  res.locals.audit = { action: 'update', entity: user.name, entityId: user._id.toString(), details: 'Password reset by admin' };
  res.json({ ok: true });
};
