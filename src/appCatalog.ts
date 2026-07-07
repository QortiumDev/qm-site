import { getNodeApiUrl } from './qdnRequest';
import type { QdnResource } from './types';

export type CatalogSectionId = 'my' | 'recommended';

export type CatalogAppSeed = {
  category: 'Core' | 'Home' | 'Explorer' | 'Social' | 'Operations' | 'Tools' | 'Games';
  identifier: string;
  name: string;
  publisher: string;
  repo?: string;
  section: CatalogSectionId;
  summary: string;
};

export type CatalogApp = CatalogAppSeed & {
  created?: number;
  iconUrls: string[];
  resource: string;
  size?: number;
  source: 'live' | 'seed';
  status: string;
  title: string;
  updated?: number;
};

export type CatalogAppSection = {
  apps: CatalogApp[];
  description: string;
  id: CatalogSectionId;
  title: string;
};

export const CATALOG_SECTION_DEFS: Omit<CatalogAppSection, 'apps'>[] = [
  {
    description: 'Apps published for the Qortium workspace and maintained as part of this Qortium app set.',
    id: 'my',
    title: 'My Qortium Apps',
  },
  {
    description: 'Apps from 7R15 and the wider community that pair well with the Qortium tools.',
    id: 'recommended',
    title: 'Recommended Apps',
  },
];

export const QORTIUM_APP_SEEDS: CatalogAppSeed[] = [
  {
    category: 'Operations',
    identifier: 'Apps',
    name: 'Apps',
    publisher: '7R15',
    repo: 'https://github.com/QortiumDev/qortium-apps',
    section: 'recommended',
    summary: 'App explorer, favorites, and app-discovery dashboard.',
  },
  {
    category: 'Explorer',
    identifier: 'Chain',
    name: 'Chain',
    publisher: '7R15',
    repo: 'https://github.com/QortiumDev/qortium-chain-explorer',
    section: 'recommended',
    summary: 'Block, transaction, and payment explorer.',
  },
  {
    category: 'Social',
    identifier: 'Chat',
    name: 'Chat',
    publisher: 'Qortium',
    repo: 'https://github.com/QortiumDev/qortium-chat',
    section: 'my',
    summary: 'Public and private group messaging inside Qortium Home.',
  },
  {
    category: 'Social',
    identifier: 'Groups',
    name: 'Groups',
    publisher: '7R15',
    repo: 'https://github.com/QortiumDev/qortium-group-manager',
    section: 'recommended',
    summary: 'Group discovery, membership, and management.',
  },
  {
    category: 'Tools',
    identifier: 'Help',
    name: 'Help',
    publisher: 'Qortium',
    repo: 'https://github.com/QortiumDev/qortium-help',
    section: 'my',
    summary: 'Help, feedback, and support routing for Qortium apps.',
  },
  {
    category: 'Tools',
    identifier: 'Library',
    name: 'Library',
    publisher: '7R15',
    repo: 'https://github.com/QortiumDev/qortium-library',
    section: 'recommended',
    summary: 'QDN document reader and library.',
  },
  {
    category: 'Operations',
    identifier: 'Minting',
    name: 'Minting',
    publisher: 'Qortium',
    repo: 'https://github.com/QortiumDev/qortium-minting',
    section: 'my',
    summary: 'Minting status and account minting diagnostics.',
  },
  {
    category: 'Operations',
    identifier: 'Names',
    name: 'Names',
    publisher: '7R15',
    repo: 'https://github.com/QortiumDev/qortium-name-manager',
    section: 'recommended',
    summary: 'Name registration and marketplace.',
  },
  {
    category: 'Operations',
    identifier: 'Network',
    name: 'Network',
    publisher: 'Qortium',
    repo: 'https://github.com/QortiumDev/qortium-network',
    section: 'my',
    summary: 'Previewnet topology and peer-status viewer.',
  },
  {
    category: 'Core',
    identifier: 'Node',
    name: 'Node',
    publisher: 'Qortium',
    repo: 'https://github.com/QortiumDev/qortium-node',
    section: 'my',
    summary: 'Node operator diagnostics and settings surface.',
  },
  {
    category: 'Social',
    identifier: 'Profile',
    name: 'Profile',
    publisher: '7R15',
    repo: 'https://github.com/QortiumDev/qortium-profile-manager',
    section: 'recommended',
    summary: 'Account profile and social identity management.',
  },
  {
    category: 'Tools',
    identifier: 'Publish',
    name: 'Publish',
    publisher: '7R15',
    repo: 'https://github.com/QortiumDev/qortium-publish-manager',
    section: 'recommended',
    summary: 'QDN resource publishing, following, and blocking.',
  },
  {
    category: 'Explorer',
    identifier: 'Trust',
    name: 'Trust',
    publisher: 'Qortium',
    repo: 'https://github.com/QortiumDev/qortium-trust',
    section: 'my',
    summary: 'Trust-network browser and account rating explorer.',
  },
  {
    category: 'Tools',
    identifier: 'Wallet',
    name: 'Wallet',
    publisher: '7R15',
    repo: 'https://github.com/QortiumDev/qortium-wallet',
    section: 'recommended',
    summary: 'Multi-coin crypto wallet.',
  },
  {
    category: 'Games',
    identifier: 'Emulator',
    name: 'Emulator',
    publisher: 'Qortium',
    repo: 'https://github.com/QortiumDev/qortium-emulator',
    section: 'my',
    summary: 'Game metadata browser and emulator launcher.',
  },
  {
    category: 'Social',
    identifier: 'Quest',
    name: 'Quest',
    publisher: 'Quest',
    section: 'recommended',
    summary: 'Quest social app on QDN.',
  },
  {
    category: 'Social',
    identifier: 'discussion-boards',
    name: 'Discussion_Boards',
    publisher: 'Discussion Boards',
    section: 'recommended',
    summary: 'Discussion boards, votes, polls, surveys, and messaging.',
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function resourceKey(name: string | undefined, identifier: string | undefined) {
  return `${name ?? ''}/${identifier ?? ''}`.toLowerCase();
}

function getMetadata(resource: QdnResource) {
  return isRecord(resource.metadata) ? resource.metadata : {};
}

function getTitle(resource: QdnResource, seed: CatalogAppSeed) {
  const metadata = getMetadata(resource);

  return (
    getString(metadata.title) ||
    getString(resource.title) ||
    getString(resource.metadataTitle) ||
    seed.identifier
  );
}

function getDescription(resource: QdnResource, seed: CatalogAppSeed) {
  const metadata = getMetadata(resource);

  return getString(metadata.description) || getString(resource.description) || seed.summary;
}

export function formatResourceDate(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return 'No timestamp';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatResourceSize(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return 'Unknown size';
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} MB`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000).toLocaleString()} KB`;
  }

  return `${value.toLocaleString()} B`;
}

function getQdnBaseUrl() {
  const currentOrigin = typeof window === 'undefined' ? '' : window.location.origin;
  const currentPort = typeof window === 'undefined' ? '' : window.location.port;
  const isViteDevOrigin = currentPort === '5173' || currentPort === '5174' || currentPort === '5175';

  return isViteDevOrigin || !currentOrigin ? getNodeApiUrl() : currentOrigin;
}

export function getQdnRenderUrl(
  service: string,
  name: string,
  identifier: string | undefined,
  path = '',
) {
  const baseUrl = getQdnBaseUrl();
  const identifierSegment = identifier ? `/${encodeURIComponent(identifier)}` : '';
  const pathSegment = path ? `/${path.split('/').map(encodeURIComponent).join('/')}` : '';

  return `${baseUrl}/render/${encodeURIComponent(service)}/${encodeURIComponent(name)}${identifierSegment}${pathSegment}`;
}

export function getThumbnailAvatarUrl(name: string) {
  return `${getQdnBaseUrl()}/arbitrary/THUMBNAIL/${encodeURIComponent(name)}/avatar`;
}

export function getQdnAddress(service: string, name: string, identifier: string | undefined) {
  return `qdn://${service}/${name}${identifier ? `/${identifier}` : ''}`;
}

export function mergeCatalogResources(resources: QdnResource[]) {
  const resourcesByKey = new Map(
    resources
      .filter((resource) => resource.service === 'APP' && resource.name && resource.identifier)
      .map((resource) => [resourceKey(resource.name, resource.identifier), resource]),
  );

  return QORTIUM_APP_SEEDS.map((seed): CatalogApp => {
    const live = resourcesByKey.get(resourceKey(seed.name, seed.identifier));
    const title = live ? getTitle(live, seed) : seed.identifier;
    const description = live ? getDescription(live, seed) : seed.summary;
    const status = live ? getString((live.status as Record<string, unknown> | undefined)?.status) || getString(live.status) || 'listed' : 'seed';

    return {
      ...seed,
      created: live?.created,
      iconUrls: [
        getQdnRenderUrl('APP', seed.name, seed.identifier, 'favicon.ico'),
        getThumbnailAvatarUrl(seed.name),
      ],
      resource: getQdnAddress('APP', seed.name, seed.identifier),
      size: live?.size,
      source: live ? 'live' : 'seed',
      status,
      summary: description,
      title,
      updated: live?.updated,
    };
  }).sort((a, b) => {
    const aTime = a.updated ?? a.created ?? 0;
    const bTime = b.updated ?? b.created ?? 0;

    if (bTime !== aTime) return bTime - aTime;
    return a.title.localeCompare(b.title);
  });
}

export function groupCatalogApps(apps: CatalogApp[]): CatalogAppSection[] {
  return CATALOG_SECTION_DEFS.map((section) => ({
    ...section,
    apps: apps.filter((app) => app.section === section.id),
  })).filter((section) => section.apps.length > 0);
}
