import { Reminder } from '../models/Reminder.js';
import { notify } from '../services/notifications.js';
import { sameName, short } from '../services/people.js';

/**
 * Sends the reminders whose minute has come.
 *
 * The v1 app ran this as a Laravel console command (`reminders:send`) once a minute from the
 * system scheduler. This server has no scheduler, so it runs on an interval inside the process —
 * which means reminders fire only while the API is up. That is the same bargain v1 made with its
 * cron, and it needs no extra infrastructure; if reminders ever have to survive the API being
 * down, this is the piece to move out to a real scheduler.
 *
 * Each reminder is claimed before it is sent — the status is flipped with a conditional update, so
 * two overlapping runs can never send the same one twice.
 */

const BATCH = 200;

/** @returns {Promise<number>} how many were sent */
export async function sendDueReminders() {
  const due = await Reminder.find({ status: 'scheduled', remindAt: { $lte: new Date() } })
    .sort({ remindAt: 1 })
    .limit(BATCH);

  let sent = 0;
  for (const r of due) {
    // Claim it first. If another run got there, this matches nothing and we move on.
    const claimed = await Reminder.updateOne(
      { _id: r._id, status: 'scheduled' },
      { $set: { status: 'sent', sentAt: new Date() } },
    );
    if (!claimed.modifiedCount) continue;

    const body = (r.note ?? '').trim() || `Set for ${r.time}`;
    // Someone reminding themselves sees "Reminder"; everyone else sees who set it.
    const self = r.recipients.filter((n) => sameName(n, r.creator));
    const others = r.recipients.filter((n) => !sameName(n, r.creator));

    if (self.length) {
      await notify({
        userNames: self,
        type: 'reminder',
        icon: '⏰',
        text: `<strong>Reminder: ${short(r.title, 80)}</strong> — ${short(body, 160)}`,
      });
    }
    if (others.length) {
      await notify({
        userNames: others,
        type: 'reminder',
        icon: '⏰',
        text: `<strong>${short(r.creator, 40)} reminds you: ${short(r.title, 80)}</strong> — ${short(body, 160)}`,
      });
    }
    sent += 1;
  }
  return sent;
}

/**
 * Starts the minute-by-minute run. Returns a stop function.
 * @param {{ everyMs?: number, log?: (msg: string) => void }} [opts]
 */
export function startReminderSender({ everyMs = 60_000, log } = {}) {
  let running = false;
  const tick = async () => {
    if (running) return; // a slow run must not overlap the next tick
    running = true;
    try {
      const sent = await sendDueReminders();
      if (sent && log) log(`reminders: sent ${sent}`);
    } catch (err) {
      if (log) log(`reminders: ${err?.message ?? err}`);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, everyMs);
  // Never hold the process open just for this.
  timer.unref?.();
  tick();
  return () => clearInterval(timer);
}
