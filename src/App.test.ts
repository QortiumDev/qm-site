import { describe, expect, it } from 'vitest';
import { TABS, formatNodeStatus, getTabFromHash } from './App';

describe('tabs', () => {
  it('exports the personal site tabs', () => {
    expect(TABS).toEqual([
      { id: 'about', label: 'About' },
      { id: 'apps', label: 'Apps' },
      { id: 'todo', label: 'To-Do' },
      { id: 'worklog', label: 'Work Log' },
      { id: 'support', label: 'Support' },
    ]);
  });

  it('defaults empty and unknown hashes to apps', () => {
    expect(getTabFromHash('')).toBe('apps');
    expect(getTabFromHash('#unknown')).toBe('apps');
  });

  it('maps legacy hashes to current tabs', () => {
    expect(getTabFromHash('#overview')).toBe('about');
    expect(getTabFromHash('#priorities')).toBe('todo');
    expect(getTabFromHash('#metrics')).toBe('apps');
    expect(getTabFromHash('#donate')).toBe('support');
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
