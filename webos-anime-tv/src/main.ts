import './styles/tokens.css';
import './styles/base.css';
import './styles/tv.css';
import { App } from './app/App';
import { logger } from './core/logging/Logger';

async function main(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) throw new Error('#app root missing');

  try {
    const app = new App();
    await app.start(root);
  } catch (err) {
    logger.error('Fatal bootstrap error', err);
    root.innerHTML = `<div class="page"><div class="error-banner">Avvio fallito: ${
      err instanceof Error ? err.message : String(err)
    }</div></div>`;
  }
}

void main();
