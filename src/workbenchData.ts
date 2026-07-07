export type WorkbenchApp = {
  name: string;
  kind: 'Core' | 'Home' | 'QDN App' | 'Site';
  resource: string;
  status: 'live' | 'preview' | 'planned';
  summary: string;
  repo?: string;
};

export type PriorityItem = {
  id: string;
  area: string;
  title: string;
  state: 'active' | 'next' | 'later';
  signal: number;
  summary: string;
};

export type WorkLogEntry = {
  date: string;
  project: string;
  title: string;
  summary: string;
  tags: string[];
};

export type QdnContract = {
  service: 'APP' | 'WEBSITE' | 'JSON';
  name: string;
  identifier: string;
  title: string;
  description: string;
  resource: string;
};

export const QDN_CONTRACTS = {
  website: {
    service: 'WEBSITE',
    name: 'QuickMythril',
    identifier: 'qm-site',
    title: 'Qortium Workbench',
    description: 'QuickMythril Qortium workbench website for app status, priorities, and work log.',
    resource: 'qdn://WEBSITE/QuickMythril/qm-site',
  },
  priorities: {
    service: 'JSON',
    name: 'QuickMythril',
    identifier: 'qm-site-priorities',
    title: 'Qortium Workbench Priorities',
    description: 'Priority items consumed by qdn://WEBSITE/QuickMythril/qm-site.',
    resource: 'qdn://JSON/QuickMythril/qm-site-priorities',
  },
  workLog: {
    service: 'JSON',
    name: 'QuickMythril',
    identifier: 'qm-site-worklog',
    title: 'Qortium Workbench Work Log',
    description: 'Work-log entries consumed by qdn://WEBSITE/QuickMythril/qm-site.',
    resource: 'qdn://JSON/QuickMythril/qm-site-worklog',
  },
} satisfies Record<string, QdnContract>;

export const WORKBENCH_APPS: WorkbenchApp[] = [
  {
    name: 'Qortium Core',
    kind: 'Core',
    resource: 'GitHub release + Previewnet node',
    status: 'preview',
    summary: 'Network node software, Previewnet settings, QDN storage, trust, chat, and node operations.',
    repo: 'https://github.com/QortiumDev/qortium-core',
  },
  {
    name: 'Qortium Home',
    kind: 'Home',
    resource: 'GitHub release',
    status: 'preview',
    summary: 'Desktop and Android front door for Qortium accounts, QDN apps, node management, and bridge actions.',
    repo: 'https://github.com/QortiumDev/qortium-home',
  },
  {
    name: 'Qortium Chat',
    kind: 'QDN App',
    resource: 'qdn://APP/Chat/Chat',
    status: 'live',
    summary: 'Public and private group messaging that runs inside Qortium Home.',
    repo: 'https://github.com/QortiumDev/qortium-chat',
  },
  {
    name: 'Qortium Trust',
    kind: 'QDN App',
    resource: 'qdn://APP/Trust/Trust',
    status: 'live',
    summary: 'Trust-network browser and account rating surface for Previewnet reputation work.',
    repo: 'https://github.com/QortiumDev/qortium-trust',
  },
  {
    name: 'Qortium Site',
    kind: 'Site',
    resource: 'qdn://WEBSITE/Qortium/Qortium',
    status: 'live',
    summary: 'Public explanatory website for Qortium, qortium.app, and QDN mirrors.',
    repo: 'https://github.com/QortiumDev/qortium-site',
  },
  {
    name: 'Qortium Workbench',
    kind: 'Site',
    resource: QDN_CONTRACTS.website.resource,
    status: 'preview',
    summary: 'This dashboard: work tracking, app surface, priorities, metrics, and support signals.',
  },
];

export const PRIORITIES: PriorityItem[] = [
  {
    id: 'qm-001',
    area: 'Workbench',
    title: 'Publish a Qortium-native workbench',
    state: 'active',
    signal: 9,
    summary: 'Adapt the old Qortal workbench concept into a Qortium Home-friendly dashboard with static fallbacks.',
  },
  {
    id: 'qm-002',
    area: 'Roadmap',
    title: 'Replace placeholder priorities with on-chain voting',
    state: 'next',
    signal: 8,
    summary: 'Use Qortium poll or future governance primitives once the write surface is confirmed in Home.',
  },
  {
    id: 'qm-003',
    area: 'Metrics',
    title: 'Track Qortium app activity by identifier',
    state: 'next',
    signal: 7,
    summary: 'Port the useful metrics table idea after Qortium app identifiers and resource conventions stabilize.',
  },
  {
    id: 'qm-004',
    area: 'Support',
    title: 'Design Qortium support signals without legacy funding assumptions',
    state: 'later',
    signal: 5,
    summary: 'Replace Qortal donation and pledge flows with Qortium-appropriate contribution and funding signals.',
  },
];

export const WORK_LOG: WorkLogEntry[] = [
  {
    date: '2026-07-07',
    project: 'qm-site',
    title: 'Initial Qortium Workbench scaffold',
    summary: 'Created a QDN app shell for adapting the old workbench into a Qortium-native operational dashboard.',
    tags: ['qdn-app', 'workbench', 'preview'],
  },
  {
    date: '2026-07-07',
    project: 'qortium-site',
    title: 'Adaptation split chosen',
    summary: 'Kept qortium.app as the public explainer and separated interactive work tracking into this Home-oriented app.',
    tags: ['site', 'roadmap'],
  },
  {
    date: '2026-07-06',
    project: 'Qortium apps',
    title: 'Live app surface reviewed',
    summary: 'Core, Home, Chat, Trust, and Site are the first workbench app catalog entries.',
    tags: ['apps', 'catalog'],
  },
];

export const STATUS_ORDER: Record<WorkbenchApp['status'], number> = {
  live: 0,
  preview: 1,
  planned: 2,
};
