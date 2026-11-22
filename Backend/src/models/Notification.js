import { Schema, model } from 'mongoose';

/**
 * One in-app notification for one person (web/src/data/notifications.js shape). `text` is a plain HTML string
 * (`<strong>…</strong>`, `<em>…</em>`) exactly like the web's notify() produces. Compose it with the
 * html`` template (utils/html.js) so typed-in values are escaped; the web parses it rather than
 * injecting it (web/src/utils/richText.jsx).
 */
const notificationSchema = new Schema(
  {
    /** Recipient's name without a "(role)" suffix (people are name strings for now). */
    userName: { type: String, required: true },
    type: { type: String, default: 'action' },
    icon: { type: String, default: '🔔' },
    text: { type: String, required: true },
    unread: { type: Boolean, default: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);
notificationSchema.index({ userName: 1, createdAt: -1 });
notificationSchema.index({ userName: 1, unread: 1 });

export const Notification = model('Notification', notificationSchema);

/** @param {any} n a Notification document */
export function serializeNotification(n) {
  const createdAt = (n.createdAt ?? new Date()).toISOString();
  return {
    id: n._id.toString(),
    type: n.type ?? 'action',
    unread: !!n.unread,
    text: n.text,
    icon: n.icon ?? '🔔',
    /** The web shows a relative label here ("2 hours ago"); the API gives the ISO time to derive it from. */
    time: createdAt,
    createdAt,
    readAt: n.readAt ? n.readAt.toISOString() : null,
  };
}
