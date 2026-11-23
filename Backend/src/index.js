import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb } from './db.js';
import { startReminderSender } from './services/reminderSender.js';

// Startup connects to MongoDB and serves HTTP. It deliberately creates no records: no first admin, no
// starting integrations, no demo rows. The first administrator is made by hand with
// `node scripts/create-admin.js`; see Backend/README.md.
async function main() {
  const db = await connectDb();

  const server = http.createServer(createApp());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, () => resolve(undefined));
  });
  console.log(`[http] ${config.appName} listening on http://localhost:${config.port} (${config.nodeEnv})`);

  // Reminders fire from here, once a minute. The v1 app used the system scheduler for this; there
  // is none here, so a reminder only fires while the API is up. Set REMINDERS_SENDER=off to stop it
  // (for a second instance, say, so two servers do not both scan — the claim makes that safe, but
  // there is no point in both doing it).
  const stopReminders =
    process.env.REMINDERS_SENDER === 'off'
      ? () => {}
      : startReminderSender({ log: (m) => console.log(`[reminders] ${m}`) });

  let stopping = false;
  /** @param {string} signal */
  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`[http] ${signal} received, shutting down`);
    setTimeout(() => process.exit(1), 10_000).unref();
    try {
      stopReminders();
      server.closeAllConnections();
      await new Promise((r) => server.close(() => r(undefined)));
      await db.close();
    } catch (e) {
      console.error('[http] error during shutdown', e);
    }
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
