import cron from 'node-cron';
import { checkNow, normalizeFrequency } from './services.js';

export function startScheduler(prisma) {
  // Run every 5 minutes and pick items due based on their frequency and lastCheckedAt
  cron.schedule('*/5 * * * *', async () => {
    const now = new Date();
    const items = await prisma.item.findMany();
    for (const item of items) {
      const dueMs = freqToMs(item.frequency);
      const last = item.lastCheckedAt ? new Date(item.lastCheckedAt).getTime() : 0;
      if (Date.now() - last >= dueMs) {
        try { await checkNow(prisma, item.id); } catch (_) {}
      }
    }
  });
}

function freqToMs(f) {
  switch (f) {
    case 'MIN_15': return 15 * 60 * 1000;
    case 'HOUR_1': return 60 * 60 * 1000;
    default: return 30 * 60 * 1000; // MIN_30
  }
}
