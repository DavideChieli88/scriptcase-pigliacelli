/** Lightweight module store — flags shared across pages without a heavy SM. */

/** Why home needs updating when shown again. */
export type HomeDirtyMode =
  /** No pending update — keep mounted DOM. */
  | false
  /** Refresh Continua / Ultimi / hero only (provider rails stay). */
  | 'local'
  /** Full reload including provider feed (skeleton). */
  | 'full';

export interface AppUiState {
  homeDirty: HomeDirtyMode;
  lastFocusHomeId: string | null;
}

const state: AppUiState = {
  homeDirty: false,
  lastFocusHomeId: null,
};

export const uiStore = {
  get(): AppUiState {
    return state;
  },
  /** Mark home for update. `full` always wins over `local`. */
  markHomeDirty(mode: Exclude<HomeDirtyMode, false> = 'local'): void {
    if (state.homeDirty === 'full') return;
    state.homeDirty = mode;
  },
  clearHomeDirty(): void {
    state.homeDirty = false;
  },
  setLastFocusHome(id: string | null): void {
    state.lastFocusHomeId = id;
  },
};
