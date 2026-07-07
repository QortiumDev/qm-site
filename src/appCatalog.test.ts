import { describe, expect, it } from 'vitest';
import { formatResourceSize, groupCatalogApps, mergeCatalogResources } from './appCatalog';

describe('app catalog', () => {
  it('merges live QDN metadata into known Qortium app identities', () => {
    const apps = mergeCatalogResources([
      {
        created: 1000,
        identifier: 'Chat',
        metadata: {
          description: 'Live chat description',
          title: 'Chat Live',
        },
        name: 'Chat',
        service: 'APP',
        size: 603147,
        status: { status: 'READY' },
        updated: 2000,
      },
    ]);
    const chat = apps.find((app) => app.name === 'Chat');

    expect(chat).toMatchObject({
      resource: 'qdn://APP/Chat/Chat',
      source: 'live',
      status: 'READY',
      summary: 'Live chat description',
      title: 'Chat Live',
    });
  });

  it('groups owned, recommended, and additional current apps separately', () => {
    const sections = groupCatalogApps(mergeCatalogResources([
      {
        created: 1000,
        identifier: 'Apps',
        metadata: {
          description: 'Live apps description',
          title: 'Apps',
        },
        name: 'Apps',
        service: 'APP',
        status: { status: 'READY' },
      },
      {
        created: 1000,
        identifier: 'Quest',
        metadata: {
          description: 'Quest Social',
          title: 'Quest',
        },
        name: 'Quest',
        service: 'APP',
        status: { status: 'BUILDING' },
      },
      {
        created: 1000,
        identifier: 'discussion-boards',
        metadata: {
          description: 'Discussions, votes, polls, and surveys',
          title: 'Discussion Boards',
        },
        name: 'Discussion_Boards',
        service: 'APP',
        status: { status: 'BUILDING' },
      },
    ]));

    expect(sections.map((section) => section.title)).toEqual([
      'My Qortium Apps',
      'Recommended Apps',
      'Quest and Discussion Boards',
    ]);
    expect(sections.find((section) => section.id === 'my')?.apps.map((app) => app.name)).toContain('Chat');
    expect(sections.find((section) => section.id === 'recommended')?.apps.map((app) => app.name)).toContain('Apps');
    expect(sections.find((section) => section.id === 'community')?.apps.map((app) => app.resource).sort()).toEqual([
      'qdn://APP/Discussion_Boards/discussion-boards',
      'qdn://APP/Quest/Quest',
    ]);
  });

  it('formats resource sizes compactly', () => {
    expect(formatResourceSize(603147)).toBe('603 KB');
    expect(formatResourceSize(2_654_638)).toBe('2.7 MB');
  });
});
