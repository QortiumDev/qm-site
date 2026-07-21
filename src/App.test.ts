import { describe, expect, it } from 'vitest';
import { TABS, formatNodeStatus, getTabFromHash, getTabFromLocation } from './App';

describe('tabs', () => {
  it('exports the personal site tabs', () => {
    expect(TABS).toEqual([
      { id: 'about', label: 'About' },
      { id: 'apps', label: 'Apps' },
      { id: 'developers', label: 'Developers' },
      { hidden: true, id: 'todo', label: 'To-Do' },
      { hidden: true, id: 'worklog', label: 'Work Log' },
      { id: 'support', label: 'Support' },
    ]);
  });

  it('shows only the public navigation tabs in the menu', () => {
    expect(TABS.filter((tab) => !tab.hidden).map((tab) => tab.id)).toEqual(['about', 'apps', 'developers', 'support']);
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
    expect(getTabFromHash('#todo')).toBe('todo');
    expect(getTabFromHash('#worklog')).toBe('worklog');
  });

  it('recognizes developer query routes without consuming Home display settings', () => {
    expect(getTabFromLocation('?view=developers&uiStyle=fun&accent=purple', '#apps')).toBe('developers');
    expect(getTabFromLocation('?view=developer', '#apps')).toBe('developers');
    expect(getTabFromLocation('?view=reference', '#apps')).toBe('developers');
    expect(getTabFromLocation('?view=unknown&uiStyle=fun', '#support')).toBe('support');
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
