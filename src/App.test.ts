import { describe, expect, it } from 'vitest';
import { TABS, formatNodeStatus, formatResourceStatus } from './App';

describe('tabs', () => {
  it('keeps contributions under Support instead of a standalone donate page', () => {
    expect(TABS).toContainEqual({ id: 'support', label: 'Support' });
    expect(TABS.some((tab) => String(tab.id) === 'donate')).toBe(false);
  });
});

describe('formatNodeStatus', () => {
  it('shows a clear fallback without node context', () => {
    expect(formatNodeStatus(null)).toBe('No node context');
  });

  it('prioritizes synchronizing state when present', () => {
    expect(formatNodeStatus({ isSynchronizing: true, syncPercent: 47 })).toBe('47% synced');
  });

  it('uses connected state when sync metadata is sparse', () => {
    expect(formatNodeStatus({ height: 123 })).toBe('Connected');
  });
});

describe('formatResourceStatus', () => {
  it('accepts object-shaped QDN status responses', () => {
    expect(
      formatResourceStatus({
        name: 'QuickMythril',
        service: 'WEBSITE',
        status: {
          description: 'Ready',
          id: 'READY',
          status: 'READY',
          title: 'Ready',
        },
      }),
    ).toBe('READY');
  });
});
