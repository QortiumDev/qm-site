import { describe, expect, it } from 'vitest';
import { extractQdnJsonPayload, normalizePriorityItems, normalizeWorkLogEntries } from './workbenchResources';

describe('workbench resource parsing', () => {
  it('extracts JSON from a QDN fetch wrapper', () => {
    expect(extractQdnJsonPayload({ data: '{"items":[{"title":"Publish site"}]}' })).toEqual({
      items: [{ title: 'Publish site' }],
    });
  });

  it('normalizes priority payloads with conservative defaults', () => {
    expect(
      normalizePriorityItems({
        priorities: [
          {
            area: 'Site',
            title: 'Publish qdn website',
            status: 'now',
            score: '11',
            description: 'Move qm-site to QuickMythril WEBSITE identity.',
          },
        ],
      }),
    ).toEqual([
      {
        id: 'qdn-priority-1',
        area: 'Site',
        title: 'Publish qdn website',
        state: 'active',
        signal: 11,
        summary: 'Move qm-site to QuickMythril WEBSITE identity.',
      },
    ]);
  });

  it('normalizes work-log entries from array payloads', () => {
    expect(
      normalizeWorkLogEntries([
        {
          date: '2026-07-07T14:22:00Z',
          repo: 'qm-site',
          title: 'Added QDN JSON fallback',
          body: 'Priorities and work log can come from JSON resources.',
          tags: 'qdn,json',
        },
      ]),
    ).toEqual([
      {
        date: '2026-07-07',
        project: 'qm-site',
        title: 'Added QDN JSON fallback',
        summary: 'Priorities and work log can come from JSON resources.',
        tags: ['qdn', 'json'],
      },
    ]);
  });
});
