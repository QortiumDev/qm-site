import { describe, expect, it } from 'vitest';
import {
  formatResourceSize,
  getFeaturedCatalogApp,
  getThumbnailAvatarUrl,
  groupCatalogApps,
  mergeCatalogResources,
} from './appCatalog';

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
      iconUrls: [
        'http://127.0.0.1:24891/render/APP/Chat/Chat/favicon.ico',
        'http://127.0.0.1:24891/arbitrary/THUMBNAIL/Chat/avatar',
      ],
      resource: 'qdn://APP/Chat/Chat',
      source: 'live',
      status: 'READY',
      summary: 'Live chat description',
      title: 'Chat Live',
    });
  });

  it('groups QuickMythril, 7R15, and iffi resources with their verified identities', () => {
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
        identifier: 'Chess',
        metadata: {
          description: 'Play chess over Qortium chat',
          title: 'Chess',
        },
        name: 'Chess',
        service: 'APP',
        status: { status: 'READY' },
      },
      {
        created: 1000,
        identifier: 'Donation',
        name: '7R15M3G157U5',
        service: 'APP',
        status: { status: 'READY' },
      },
      {
        created: 1000,
        identifier: 'iffivabameeswebsite',
        metadata: {
          title: 'iffi vaba mees personal web',
        },
        name: 'iffi_vaba_mees',
        service: 'WEBSITE',
        status: { status: 'READY' },
      },
    ]));

    expect(sections.map((section) => section.title)).toEqual([
      'QuickMythril & Qortium Apps',
      '7R15 Apps',
      'iffi Apps & Sites',
    ]);
    const quickmythrilApps = sections.find((section) => section.id === 'quickmythril')?.apps.map((app) => app.name);

    expect(quickmythrilApps).toContain('Chat');
    expect(quickmythrilApps).toContain('Chess');
    expect(quickmythrilApps).not.toContain('Quest');
    expect(quickmythrilApps).not.toContain('Discussion_Boards');
    expect(sections.find((section) => section.id === '7r15')?.apps.map((app) => app.resource)).toContain(
      'qdn://APP/aQuarium/aQuarium',
    );
    expect(sections.find((section) => section.id === 'iffi')?.apps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        resource: 'qdn://WEBSITE/iffi_vaba_mees/iffivabameeswebsite',
        service: 'WEBSITE',
        source: 'live',
        title: 'iffi vaba mees personal web',
      }),
    ]));
  });

  it('features 7R15’s Donation app as the catalog headline', () => {
    const apps = mergeCatalogResources([]);

    expect(apps[0]?.resource).toBe('qdn://APP/7R15M3G157U5/Donation');
    expect(getFeaturedCatalogApp(apps)?.identifier).toBe('Donation');
  });

  it('builds thumbnail avatar URLs from the same node base as render URLs', () => {
    expect(getThumbnailAvatarUrl('Discussion_Boards')).toBe(
      'http://127.0.0.1:24891/arbitrary/THUMBNAIL/Discussion_Boards/avatar',
    );
  });

  it('formats resource sizes compactly', () => {
    expect(formatResourceSize(603147)).toBe('603 KB');
    expect(formatResourceSize(2_654_638)).toBe('2.7 MB');
  });
});
