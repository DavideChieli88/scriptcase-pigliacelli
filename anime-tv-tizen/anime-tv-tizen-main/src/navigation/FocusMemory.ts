/** Remembers last focused column per row/section for restore-on-back. */

export class FocusMemory {
  private readonly memory = new Map<string, string>();

  remember(scope: string, focusId: string): void {
    this.memory.set(scope, focusId);
  }

  recall(scope: string): string | undefined {
    return this.memory.get(scope);
  }

  clear(scope?: string): void {
    if (scope) this.memory.delete(scope);
    else this.memory.clear();
  }
}

export const focusMemory = new FocusMemory();
