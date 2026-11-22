import { Schema, model } from 'mongoose';

/** @typedef {'create' | 'update' | 'delete' | 'auth' | 'export'} AuditAction */
export const AUDIT_ACTIONS = /** @type {const} */ (['create', 'update', 'delete', 'auth', 'export']);

/** One line of Settings → Activity Log (same fields as web/src/store/audit.js entries). */
const auditLogSchema = new Schema(
  {
    at: { type: Date, required: true, default: Date.now },
    user: {
      id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: '' },
    },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    /** Human module label, e.g. "Settings · Users", "Session". */
    module: { type: String, required: true, default: 'App' },
    /** What was touched, e.g. the user's name. */
    entity: { type: String, default: '' },
    entityId: { type: String, default: '' },
    details: { type: String, default: '' },
    ip: { type: String, default: '' },
  },
  { versionKey: false },
);
auditLogSchema.index({ at: -1, _id: -1 });
auditLogSchema.index({ action: 1, at: -1 });
auditLogSchema.index({ module: 1, at: -1 });
auditLogSchema.index({ 'user.id': 1, at: -1 });

export const AuditLog = model('AuditLog', auditLogSchema);

/** @param {any} e an AuditLog document */
export function serializeAudit(e) {
  return {
    id: e._id.toString(),
    at: e.at.toISOString(),
    user: { id: e.user?.id ? e.user.id.toString() : null, name: e.user?.name ?? '' },
    action: e.action,
    module: e.module,
    entity: e.entity ?? '',
    entityId: e.entityId ?? '',
    details: e.details ?? '',
    ip: e.ip ?? '',
  };
}
