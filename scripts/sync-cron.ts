// Script para Railway Cron: `npx tsx scripts/sync-cron.ts`
// Programar en Railway cada 3 minutos durante el torneo.
import { runSync } from '../lib/sync';

runSync()
  .then((r) => { console.log('[sync] OK', JSON.stringify(r)); process.exit(0); })
  .catch((e) => { console.error('[sync] ERROR', e); process.exit(1); });
