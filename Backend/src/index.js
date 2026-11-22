import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb } from './db.js';
import { ensureDefaultIntegrations } from './services/integrations.js';
import { ensureDefaultAdmin } from './services/users.js';

async function main() {
  const db = await connectDb();
  await ensureDefaultAdmin();
  await ensureDefaultIntegrations();

  const server = http.createServer(createApp());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, () => resolve(undefined));
  });
  console.log(`[http] ${config.appName} listening on http://localhost:${config.port} (${config.nodeEnv})`);

  let stopping = false;
  /** @param {string} signal */
  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`[http] ${signal} received, shutting down`);
    setTimeout(() => process.exit(1), 10_000).unref();
    try {
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
