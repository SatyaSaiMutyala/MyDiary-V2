import { Schema, model } from 'mongoose';
import { PRIORITIES, PROJECT_CATEGORIES } from './Project.js';

/**
 * One kit of the Project Templates Library (web/src/data/projects.js PROJ_TEMPLATES shape). Everything in a
 * template is relative: milestones, tasks and risks carry day offsets and milestone positions, so starting a
 * project from a template turns them into real dates and real milestone ids.
 */

const tplMilestoneSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    /** Days after the project start date. */
    dayOffset: { type: Number, default: 0, min: 0 },
    acceptanceCriteria: { type: [String], default: [] },
  },
  { _id: false },
);

const tplTaskSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    dayOffset: { type: Number, default: 0, min: 0 },
    /** Position in `milestones` this task belongs to, or null for project-level work. */
    milestoneIdx: { type: Number, default: null },
  },
  { _id: false },
);

/** A template KPI only knows what "good" looks like ('≥ 95%'), not a number to count up to. */
const tplKpiSchema = new Schema({ name: { type: String, required: true, trim: true }, target: { type: String, default: '', trim: true } }, { _id: false });

const tplRiskSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    impact: { type: String, enum: PRIORITIES, default: 'medium' },
    mitigation: { type: String, default: '', trim: true },
    milestoneIdx: { type: Number, default: null },
  },
  { _id: false },
);

const projectTemplateSchema = new Schema(
  {
    /** The prototype's stable slug ('tpl-nabl', 'tpl-blank') — the library is seeded and looked up by it. */
    key: { type: String, required: true, trim: true, unique: true },
    emoji: { type: String, default: '📋', trim: true },
    category: { type: String, enum: PROJECT_CATEGORIES, default: 'operations' },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    suggestedDurationDays: { type: Number, default: 60, min: 1 },
    /** "Used 7×" on the card; bumped when a project is started from this template. */
    usedCount: { type: Number, default: 0, min: 0 },
    teamRoles: { type: [String], default: [] },
    milestones: { type: [tplMilestoneSchema], default: [] },
    tasks: { type: [tplTaskSchema], default: [] },
    kpis: { type: [tplKpiSchema], default: [] },
    risks: { type: [tplRiskSchema], default: [] },
    /** Library order, so the modal lists them exactly as the prototype did. */
    order: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false },
);
projectTemplateSchema.index({ order: 1 });
projectTemplateSchema.index({ category: 1 });

export const ProjectTemplate = model('ProjectTemplate', projectTemplateSchema);

/** @param {any} t a ProjectTemplate document */
export function serializeProjectTemplate(t) {
  return {
    id: t._id.toString(),
    key: t.key,
    emoji: t.emoji ?? '📋',
    category: t.category,
    name: t.name,
    description: t.description ?? '',
    suggestedDurationDays: t.suggestedDurationDays ?? 60,
    usedCount: t.usedCount ?? 0,
    teamRoles: [...(t.teamRoles ?? [])],
    milestones: (t.milestones ?? []).map((m) => ({ name: m.name, dayOffset: m.dayOffset ?? 0, acceptanceCriteria: [...(m.acceptanceCriteria ?? [])] })),
    tasks: (t.tasks ?? []).map((k) => ({ name: k.name, dayOffset: k.dayOffset ?? 0, milestoneIdx: k.milestoneIdx ?? null })),
    kpis: (t.kpis ?? []).map((k) => ({ name: k.name, target: k.target ?? '' })),
    risks: (t.risks ?? []).map((r) => ({ name: r.name, impact: r.impact, mitigation: r.mitigation ?? '', milestoneIdx: r.milestoneIdx ?? null })),
    order: t.order ?? 0,
    createdAt: (t.createdAt ?? new Date()).toISOString(),
    updatedAt: (t.updatedAt ?? t.createdAt ?? new Date()).toISOString(),
  };
}
