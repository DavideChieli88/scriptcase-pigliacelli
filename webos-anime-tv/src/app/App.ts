import type { AppContext } from './context';
import { bootstrap } from './bootstrap';
import { logger } from '../core/logging/Logger';

export class App {
  private ctx: AppContext | null = null;

  async start(root: HTMLElement): Promise<AppContext> {
    this.ctx = await bootstrap(root);
    await this.ctx.router.navigate('home', {}, true);
    logger.info('App ready');
    return this.ctx;
  }

  getContext(): AppContext | null {
    return this.ctx;
  }
}
