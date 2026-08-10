import { describe, expect, it } from 'vitest';
import { debugLog } from '@/utils/debugLog';

describe('debugLog', () => {
  it('stores ring buffer entries when enabled', () => {
    debugLog.clear();
    debugLog.setEnabled(true);
    debugLog.push('network', 'info', 'GET ok', { status: 200 });
    debugLog.push('parser', 'warn', 'selector miss');
    const lines = debugLog.formatLines();
    expect(lines).toContain('network/info');
    expect(lines).toContain('GET ok');
    expect(lines).toContain('parser/warn');
    debugLog.clear();
    expect(debugLog.list()).toHaveLength(0);
  });
});
