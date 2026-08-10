import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/focus.css';
import '@/styles/pages.css';

import { bootstrap } from '@/app/bootstrap';
import { App } from '@/app/App';
import { logger } from '@/utils/logger';

async function main(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('#app root missing');

  try {
    await bootstrap();
    const app = new App(host);
    app.start();
  } catch (err) {
    logger.error('Main', 'Fatal bootstrap error', err);
    host.textContent = 'Errore di avvio. Ricarica l’applicazione.';
  }
}

void main();
