import { el, clear, setText } from '../mount';
import { createTopBar } from '../components/TopBar';
import { createModal } from '../components/Modal';
import { settingsService } from '@/services/SettingsService';
import { cacheService } from '@/services/CacheService';
import { progressTracker } from '@/services/ProgressTracker';
import { clearAllStores } from '@/persistence/db';
import { providerRegistry } from '@/providers/registry';
import { focusEngine } from '@/navigation/FocusEngine';
import { DEFAULT_SETTINGS } from '@/domain/models';
import { debugLog } from '@/utils/debugLog';
import { uiStore } from '@/state/stores/uiStore';

export class SettingsPage {
  readonly root: HTMLElement;
  private content: HTMLElement;
  /** When true, proxy URL input is shown and can open the virtual keyboard. */
  private editingProxy = false;
  private focusAfterRender: string | null = null;

  constructor() {
    this.root = el('section', 'page page--settings', { id: 'page-settings' });
    this.content = el('div', 'settings-page');
    this.root.appendChild(this.content);
  }

  async show(): Promise<void> {
    this.root.classList.add('is-active');
    this.editingProxy = false;
    this.focusAfterRender = null;
    focusEngine.setRoot(this.root);
    focusEngine.setScope('settings');
    this.render();
  }

  hide(): void {
    this.editingProxy = false;
    this.focusAfterRender = null;
    this.root.classList.remove('is-active');
  }

  private render(): void {
    clear(this.content);
    this.content.appendChild(createTopBar('settings'));
    const title = el('h1', 'page-title');
    setText(title, 'Impostazioni');
    this.content.appendChild(title);

    const settings = settingsService.get();
    const providers = providerRegistry.listEnabled();
    const current =
      providers.find((p) => p.id === settings.preferredProviderId) || providers[0];

    this.addToggleRow(
      'provider',
      'Provider preferito',
      current ? `${current.label} (${current.id})` : settings.preferredProviderId,
      () => {
        const ids = providers.map((p) => p.id);
        if (!ids.length) return;
        const idx = Math.max(0, ids.indexOf(settings.preferredProviderId));
        const next = ids[(idx + 1) % ids.length];
        void settingsService.update({ preferredProviderId: next }).then(() => {
          uiStore.markHomeDirty('full');
          this.render();
        });
      },
    );

    this.addToggleRow(
      'autoplay',
      'Autoplay episodio successivo',
      settings.autoplayNext ? 'On' : 'Off',
      () => {
        void settingsService
          .update({ autoplayNext: !settings.autoplayNext })
          .then(() => this.render());
      },
    );

    this.addToggleRow(
      'threshold',
      'Soglia completamento',
      `${Math.round(settings.completionThreshold * 100)}%`,
      () => {
        const steps = [0.8, 0.9, 0.95, 1];
        const idx = steps.indexOf(settings.completionThreshold);
        const next = steps[(idx + 1) % steps.length] ?? 0.9;
        void settingsService.update({ completionThreshold: next }).then(() => this.render());
      },
    );

    this.addToggleRow(
      'next-prompt-threshold',
      'Soglia banner prossimo episodio',
      `${Math.round(settings.nextEpisodePromptThreshold * 100)}%`,
      () => {
        const steps = [0.8, 0.9, 0.95, 1];
        const idx = steps.indexOf(settings.nextEpisodePromptThreshold);
        const next = steps[(idx + 1) % steps.length] ?? 0.95;
        void settingsService
          .update({ nextEpisodePromptThreshold: next })
          .then(() => this.render());
      },
    );

    this.addToggleRow(
      'history',
      'Cronologia',
      settings.historyEnabled ? 'On' : 'Off',
      () => {
        void settingsService
          .update({ historyEnabled: !settings.historyEnabled })
          .then(() => this.render());
      },
    );

    this.addToggleRow(
      'debug',
      'Debug streaming',
      settings.debugMode ? 'On — overlay player (Info)' : 'Off',
      () => {
        void settingsService.update({ debugMode: !settings.debugMode }).then(() => this.render());
      },
    );

    this.addToggleRow(
      'stream-proxy',
      'Proxy stream saturncdn',
      settings.streamProxyEnabled ? 'On' : 'Off',
      () => {
        void settingsService
          .update({ streamProxyEnabled: !settings.streamProxyEnabled })
          .then(() => this.render());
      },
    );

    this.addProxyRow(settings.streamProxyUrl || '', settings.streamProxyEnabled);

    const cacheStats = cacheService.stats();
    this.addActionRow(
      'cache',
      'Pulisci cache metadata',
      cacheStats.lastKey ? `Ultima: ${cacheStats.lastKey}` : 'Esegui',
      () => {
        void cacheService.clear().then(() => {
          uiStore.markHomeDirty('full');
          this.render();
        });
      },
    );

    this.addActionRow(
      'clear-continue',
      'Pulisci Continua a guardare',
      'Pulisci',
      () => {
        this.confirmClearContinue();
      },
    );

    this.addActionRow('reset', 'Reset dati app', 'Reset', () => {
      this.confirmReset();
    });

    if (settings.debugMode) {
      this.renderDebugPanel();
    }

    const preferred = this.focusAfterRender ?? 'settings-provider';
    this.focusAfterRender = null;
    focusEngine.focusDefault(preferred);
  }

  private renderDebugPanel(): void {
    const heading = el('h2', 'rail__title');
    heading.style.marginTop = '48px';
    setText(heading, 'Debug log (rete / provider / cache)');
    this.content.appendChild(heading);

    const pre = el('pre', 'debug-log');
    pre.style.cssText =
      'background:var(--color-surface);padding:24px;border-radius:8px;max-height:360px;overflow:auto;font-size:16px;line-height:1.4;white-space:pre-wrap;color:var(--color-text-muted);';
    setText(pre, debugLog.formatLines(50) || '(vuoto — attiva azioni in app per popolare)');
    this.content.appendChild(pre);

    const actions = el('div');
    actions.style.cssText = 'display:flex;gap:16px;margin-top:16px;';

    const refresh = el('button', 'btn btn--ghost');
    setText(refresh, 'Aggiorna log');
    focusEngine.register(refresh, {
      id: 'settings-debug-refresh',
      row: 'settings-debug',
      onEnter: () => this.render(),
    });
    refresh.addEventListener('click', () => this.render());

    const clearBtn = el('button', 'btn btn--ghost');
    setText(clearBtn, 'Pulisci log');
    focusEngine.register(clearBtn, {
      id: 'settings-debug-clear',
      row: 'settings-debug',
      onEnter: () => {
        debugLog.clear();
        this.render();
      },
    });
    clearBtn.addEventListener('click', () => {
      debugLog.clear();
      this.render();
    });

    actions.appendChild(refresh);
    actions.appendChild(clearBtn);
    this.content.appendChild(actions);
  }

  private addProxyRow(current: string, enabled: boolean): void {
    const defaultUrl = DEFAULT_SETTINGS.streamProxyUrl;
    const row = el('div', 'settings-row settings-row--proxy');
    row.style.flexDirection = 'column';
    row.style.alignItems = 'stretch';
    row.style.gap = '12px';

    const l = el('div', 'settings-row__label');
    setText(l, 'Indirizzo proxy (PC in LAN)');
    row.appendChild(l);

    const hint = el('div', 'settings-row__value');
    hint.style.fontSize = '18px';
    hint.style.opacity = '0.8';
    setText(
      hint,
      enabled
        ? current
          ? `Attivo: ${current}`
          : `Attivo ma vuoto — default: ${defaultUrl}`
        : 'Disattivato — la TV userà tizen.download / fetch diretto',
    );
    row.appendChild(hint);

    const actions = el('div', 'settings-proxy-actions');
    actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;';

    const exitEdit = (focusId = 'settings-stream-proxy-edit') => {
      this.editingProxy = false;
      this.focusAfterRender = focusId;
      this.render();
    };

    const save = (nextRaw: string, focusId = 'settings-stream-proxy-edit') => {
      const next = nextRaw.trim().replace(/\/$/, '');
      this.editingProxy = false;
      this.focusAfterRender = focusId;
      void settingsService.update({ streamProxyUrl: next }).then(() => this.render());
    };

    if (this.editingProxy) {
      const input = el('input', 'settings-proxy-input') as HTMLInputElement;
      input.type = 'text';
      input.value = current;
      input.placeholder = defaultUrl;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.style.cssText =
        'width:100%;padding:16px;font-size:22px;border-radius:8px;border:2px solid var(--color-border);background:var(--color-bg);color:var(--color-text);';

      focusEngine.register(input, {
        id: 'settings-stream-proxy-url',
        row: 'settings-proxy',
        onEnter: () => save(input.value),
      });
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          save(input.value);
        }
      });

      const saveBtn = el('button', 'btn btn--ghost');
      setText(saveBtn, 'Salva');
      focusEngine.register(saveBtn, {
        id: 'settings-stream-proxy-save',
        row: 'settings-proxy-actions',
        onEnter: () => save(input.value),
      });
      saveBtn.addEventListener('click', () => save(input.value));

      const cancelBtn = el('button', 'btn btn--ghost');
      setText(cancelBtn, 'Annulla');
      focusEngine.register(cancelBtn, {
        id: 'settings-stream-proxy-cancel',
        row: 'settings-proxy-actions',
        onEnter: () => exitEdit(),
      });
      cancelBtn.addEventListener('click', () => exitEdit());

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      row.appendChild(input);
      row.appendChild(actions);
      this.content.appendChild(row);
      return;
    }

    const editBtn = el('button', 'btn btn--ghost');
    setText(editBtn, 'Modifica');
    focusEngine.register(editBtn, {
      id: 'settings-stream-proxy-edit',
      row: 'settings-proxy-actions',
      onEnter: () => {
        this.editingProxy = true;
        this.focusAfterRender = 'settings-stream-proxy-url';
        this.render();
      },
    });
    editBtn.addEventListener('click', () => {
      this.editingProxy = true;
      this.focusAfterRender = 'settings-stream-proxy-url';
      this.render();
    });

    const clearBtn = el('button', 'btn btn--ghost');
    setText(clearBtn, 'Svuota');
    focusEngine.register(clearBtn, {
      id: 'settings-stream-proxy-clear',
      row: 'settings-proxy-actions',
      onEnter: () => save('', 'settings-stream-proxy-edit'),
    });
    clearBtn.addEventListener('click', () => save('', 'settings-stream-proxy-edit'));

    const resetBtn = el('button', 'btn btn--ghost');
    setText(resetBtn, 'Default');
    focusEngine.register(resetBtn, {
      id: 'settings-stream-proxy-default',
      row: 'settings-proxy-actions',
      onEnter: () => save(defaultUrl, 'settings-stream-proxy-edit'),
    });
    resetBtn.addEventListener('click', () => save(defaultUrl, 'settings-stream-proxy-edit'));

    actions.appendChild(editBtn);
    actions.appendChild(clearBtn);
    actions.appendChild(resetBtn);
    row.appendChild(actions);
    this.content.appendChild(row);
  }

  private addToggleRow(
    id: string,
    label: string,
    value: string,
    onEnter: () => void,
  ): void {
    const row = el('div', 'settings-row');
    const l = el('div', 'settings-row__label');
    setText(l, label);
    const v = el('div', 'settings-row__value');
    setText(v, value);
    row.appendChild(l);
    row.appendChild(v);
    // Unique focus row per setting so vertical nav follows DOM order
    // (shared "settings" row skipped proxy controls interleaved below).
    focusEngine.register(row, {
      id: `settings-${id}`,
      row: `settings-${id}`,
      onEnter,
    });
    row.addEventListener('click', onEnter);
    this.content.appendChild(row);
  }

  private addActionRow(
    id: string,
    label: string,
    actionLabel: string,
    onEnter: () => void,
  ): void {
    this.addToggleRow(id, label, actionLabel, onEnter);
  }

  private confirmClearContinue(): void {
    const modal = createModal({
      title: 'Pulisci Continua a guardare',
      text: 'Rimuoverà tutti i progressi di visione dalla lista Continua a guardare. Continuare?',
      confirmLabel: 'Pulisci',
      cancelLabel: 'Annulla',
      onConfirm: () => {
        void (async () => {
          await progressTracker.clearAll();
          uiStore.markHomeDirty('local');
          modal.remove();
          this.render();
        })();
      },
      onCancel: () => {
        modal.remove();
        focusEngine.focusDefault('settings-clear-continue');
      },
    });
    this.root.appendChild(modal);
    focusEngine.setRoot(modal);
    focusEngine.focusDefault('modal-confirm');
  }

  private confirmReset(): void {
    const modal = createModal({
      title: 'Reset dati',
      text: 'Cancellerà cronologia, progresso, watchlist, cache e impostazioni. Continuare?',
      confirmLabel: 'Conferma reset',
      cancelLabel: 'Annulla',
      onConfirm: () => {
        void (async () => {
          await clearAllStores();
          debugLog.clear();
          await settingsService.update({ ...DEFAULT_SETTINGS });
          uiStore.markHomeDirty('full');
          modal.remove();
          this.render();
        })();
      },
      onCancel: () => {
        modal.remove();
        focusEngine.focusDefault('settings-reset');
      },
    });
    this.root.appendChild(modal);
    focusEngine.setRoot(modal);
    focusEngine.focusDefault('modal-confirm');
  }
}
