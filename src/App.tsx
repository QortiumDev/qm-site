import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  formatResourceDate,
  formatResourceSize,
  getQdnRenderUrl,
  groupCatalogApps,
  mergeCatalogResources,
} from './appCatalog';
import type { CatalogApp } from './appCatalog';
import {
  applyDisplaySettings,
  getDisplaySettingsUpdateFromMessage,
  getInitialDisplaySettings,
} from './displaySettings';
import {
  SUPPORT_DONATIONS,
  getDefaultFeeAtomsPerByte,
  truncateDonationAddress,
  validateDonationAmount,
  validateDonationFeeAtomsPerByte,
} from './donation';
import type { DonationAddress } from './donation';
import { getBridgeState, qdnRequest } from './qdnRequest';
import type { BridgeState, NodeStatus, QdnResource } from './types';
import {
  PRIORITIES as FALLBACK_PRIORITIES,
  QDN_CONTRACTS,
  WORK_LOG as FALLBACK_WORK_LOG,
} from './workbenchData';
import type { PriorityItem, QdnContract, WorkLogEntry } from './workbenchData';
import {
  extractQdnJsonPayload,
  normalizePriorityItems,
  normalizeWorkLogEntries,
} from './workbenchResources';
import type { WorkbenchDataSource } from './workbenchResources';

const APP_TITLE = 'Qortium Workbench';
const SEARCH_SERVICES = ['APP', 'WEBSITE', 'JSON'] as const;

type TabId = 'overview' | 'apps' | 'priorities' | 'worklog' | 'metrics' | 'support';
type SearchService = (typeof SEARCH_SERVICES)[number];
type ResourceSourceState = {
  priorities: WorkbenchDataSource;
  workLog: WorkbenchDataSource;
};
type DonationSendState = {
  amount: string;
  balanceLabel: string;
  donation: DonationAddress;
  error: string;
  feeAtomsPerByte: string;
  isFetchingBalance: boolean;
  isSending: boolean;
};
type SendCoinResult = {
  txHash?: unknown;
  [key: string]: unknown;
};

export const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'apps', label: 'Apps' },
  { id: 'priorities', label: 'Priorities' },
  { id: 'worklog', label: 'Work Log' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'support', label: 'Support' },
];

export function formatNodeStatus(status: NodeStatus | null) {
  if (!status) return 'No node context';

  if (status.isSynchronizing) {
    return typeof status.syncPercent === 'number' ? `${status.syncPercent}% synced` : 'Synchronizing';
  }

  if (typeof status.syncPercent === 'number') return `${status.syncPercent}% synced`;
  if (typeof status.syncPhase === 'string' && status.syncPhase.trim()) return status.syncPhase;

  return 'Connected';
}

function formatCount(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : 'Unknown';
}

function getResourceKey(resource: QdnResource, index: number) {
  return `${resource.service ?? 'APP'}:${resource.name ?? 'unknown'}:${resource.identifier ?? index}`;
}

function getResourceTitle(resource: QdnResource) {
  return (
    resource.title ||
    resource.metadataTitle ||
    resource.identifier ||
    resource.name ||
    'Untitled resource'
  );
}

function resourceAddress(resource: QdnResource) {
  const service = resource.service ?? 'APP';
  const name = resource.name ?? 'unknown';
  return `qdn://${service}/${name}${resource.identifier ? `/${resource.identifier}` : ''}`;
}

export function formatResourceStatus(resource: QdnResource) {
  const status = (resource as Record<string, unknown>).status;

  if (typeof status === 'string' && status.trim()) {
    return status.trim();
  }

  if (status && typeof status === 'object' && !Array.isArray(status)) {
    const record = status as Record<string, unknown>;

    for (const key of ['status', 'description', 'title', 'id']) {
      const value = record[key];

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }

  return 'listed';
}

function sourceLabel(source: WorkbenchDataSource) {
  return source === 'qdn' ? 'QDN JSON' : 'Static fallback';
}

function stateLabel(state: PriorityItem['state']) {
  if (state === 'active') return 'Active';
  if (state === 'next') return 'Next';
  return 'Later';
}

function hasAction(bridgeState: BridgeState | null, action: string) {
  return Boolean(bridgeState?.actions.some((item) => item.toUpperCase() === action.toUpperCase()));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getResultString(value: unknown) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function formatWalletBalance(value: unknown, coin: string) {
  const direct = getResultString(value);

  if (direct) return `${direct} ${coin}`;

  if (isRecord(value)) {
    for (const key of ['balance', 'confirmedBalance', 'total', 'available', 'walletBalance']) {
      const nested = getResultString(value[key]);

      if (nested) return `${nested} ${coin}`;
    }
  }

  return 'Unavailable';
}

function formatTransactionHash(result: SendCoinResult | string | null | undefined) {
  if (typeof result === 'string' && result.trim()) return result.trim();
  if (!isRecord(result)) return '';

  return getResultString(result.txHash) || getResultString(result.transactionHash) || getResultString(result.signature);
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === 'ready') return 'ready';
  if (normalized === 'building') return 'building';
  if (normalized === 'seed') return 'seed';
  return 'neutral';
}

function AppIcon({ app }: { app: CatalogApp }) {
  const [hasFailed, setHasFailed] = useState(false);
  const label = app.title || app.identifier;
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || app.identifier.slice(0, 2).toUpperCase();

  useEffect(() => {
    setHasFailed(false);
  }, [app.iconUrl]);

  if (hasFailed) {
    return (
      <div className="app-icon app-icon-fallback" aria-hidden="true">
        {initials}
      </div>
    );
  }

  return (
    <img
      alt=""
      className="app-icon"
      loading="lazy"
      onError={() => setHasFailed(true)}
      src={app.iconUrl}
    />
  );
}

async function fetchWorkbenchCollection<T>(
  contract: QdnContract,
  normalize: (payload: unknown) => T[],
) {
  const response = await qdnRequest<unknown>({
    action: 'FETCH_QDN_RESOURCE',
    identifier: contract.identifier,
    maxBytes: 200_000,
    name: contract.name,
    service: contract.service,
  });
  const items = normalize(extractQdnJsonPayload(response));

  if (!items.length) {
    throw new Error(`${contract.resource} did not contain usable entries.`);
  }

  return items;
}

function getTabFromHash(hash: string): TabId {
  const raw = hash.replace(/^#/, '');

  if (raw === 'donate') return 'support';

  return TABS.some((item) => item.id === raw) ? (raw as TabId) : 'overview';
}

function useHashTab() {
  const [tab, setTab] = useState<TabId>(() => {
    return typeof window === 'undefined' ? 'overview' : getTabFromHash(window.location.hash);
  });

  useEffect(() => {
    const onHashChange = () => {
      setTab(getTabFromHash(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const activate = (next: TabId) => {
    setTab(next);
    if (typeof window !== 'undefined' && window.location.hash !== `#${next}`) {
      window.location.hash = next;
    }
  };

  return [tab, activate] as const;
}

export function App() {
  const [activeTab, setActiveTab] = useHashTab();
  const [displaySettings, setDisplaySettings] = useState(getInitialDisplaySettings);
  const [bridgeState, setBridgeState] = useState<BridgeState | null>(null);
  const [nodeStatus, setNodeStatus] = useState<NodeStatus | null>(null);
  const [resources, setResources] = useState<QdnResource[]>([]);
  const [query, setQuery] = useState('Qortium');
  const [searchService, setSearchService] = useState<SearchService>('APP');
  const [catalogApps, setCatalogApps] = useState<CatalogApp[]>(() => mergeCatalogResources([]));
  const [priorities, setPriorities] = useState<PriorityItem[]>(FALLBACK_PRIORITIES);
  const [workLog, setWorkLog] = useState<WorkLogEntry[]>(FALLBACK_WORK_LOG);
  const [resourceSources, setResourceSources] = useState<ResourceSourceState>({
    priorities: 'fallback',
    workLog: 'fallback',
  });
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [isRefreshingResources, setIsRefreshingResources] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [donationSend, setDonationSend] = useState<DonationSendState | null>(null);
  const [notice, setNotice] = useState('');

  const catalogSections = useMemo(() => groupCatalogApps(catalogApps), [catalogApps]);
  const liveCount = catalogApps.filter((app) => app.source === 'live' && app.status === 'READY').length;
  const myAppCount = catalogApps.filter((app) => app.section === 'my').length;
  const recommendedAppCount = catalogApps.filter((app) => app.section === 'recommended').length;
  const extraAppCount = catalogApps.filter((app) => app.section === 'community').length;
  const nodeLabel = useMemo(() => formatNodeStatus(nodeStatus), [nodeStatus]);
  const canSearchQdn = hasAction(bridgeState, 'SEARCH_QDN_RESOURCES');
  const canSendCoins = Boolean(bridgeState?.isHomeBridge && hasAction(bridgeState, 'SEND_COIN'));
  const canFetchWalletBalance = Boolean(bridgeState?.isHomeBridge && hasAction(bridgeState, 'GET_WALLET_BALANCE'));
  const hasQdnData =
    resourceSources.priorities === 'qdn' || resourceSources.workLog === 'qdn';

  useEffect(() => {
    applyDisplaySettings(displaySettings);
  }, [displaySettings]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      setDisplaySettings((current) => getDisplaySettingsUpdateFromMessage(event.data, current) ?? current);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  async function refreshAppCatalog(state: BridgeState) {
    if (!hasAction(state, 'LIST_QDN_RESOURCES')) {
      setCatalogApps(mergeCatalogResources([]));
      return;
    }

    try {
      const result = await qdnRequest<unknown>({
        action: 'LIST_QDN_RESOURCES',
        includeMetadata: true,
        includeStatus: true,
        limit: 200,
        mode: 'ALL',
        service: 'APP',
      });

      setCatalogApps(mergeCatalogResources(Array.isArray(result) ? (result as QdnResource[]) : []));
    } catch {
      setCatalogApps(mergeCatalogResources([]));
    }
  }

  async function refreshWorkbenchResources(state: BridgeState) {
    if (!hasAction(state, 'FETCH_QDN_RESOURCE')) {
      setPriorities(FALLBACK_PRIORITIES);
      setWorkLog(FALLBACK_WORK_LOG);
      setResourceSources({ priorities: 'fallback', workLog: 'fallback' });
      return;
    }

    setIsRefreshingResources(true);

    try {
      const [priorityResult, workLogResult] = await Promise.allSettled([
        fetchWorkbenchCollection(QDN_CONTRACTS.priorities, normalizePriorityItems),
        fetchWorkbenchCollection(QDN_CONTRACTS.workLog, normalizeWorkLogEntries),
      ]);

      if (priorityResult.status === 'fulfilled') {
        setPriorities(priorityResult.value);
      } else {
        setPriorities(FALLBACK_PRIORITIES);
      }

      if (workLogResult.status === 'fulfilled') {
        setWorkLog(workLogResult.value);
      } else {
        setWorkLog(FALLBACK_WORK_LOG);
      }

      setResourceSources({
        priorities: priorityResult.status === 'fulfilled' ? 'qdn' : 'fallback',
        workLog: workLogResult.status === 'fulfilled' ? 'qdn' : 'fallback',
      });
    } finally {
      setIsRefreshingResources(false);
    }
  }

  async function refreshRuntime() {
    setIsRefreshing(true);
    setNotice('');

    try {
      const [state, status] = await Promise.all([
        getBridgeState(),
        qdnRequest<NodeStatus>({ action: 'GET_NODE_STATUS' }),
      ]);

      setBridgeState(state);
      setNodeStatus(status);
      await Promise.all([refreshWorkbenchResources(state), refreshAppCatalog(state)]);
    } catch (error) {
      setBridgeState({
        actions: [],
        isHomeBridge: false,
        ui: 'BROWSER_DEV',
      });
      setNodeStatus(null);
      setCatalogApps(mergeCatalogResources([]));
      setPriorities(FALLBACK_PRIORITIES);
      setWorkLog(FALLBACK_WORK_LOG);
      setResourceSources({ priorities: 'fallback', workLog: 'fallback' });
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function searchResources(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsSearching(true);
    setNotice('');

    try {
      const result = await qdnRequest<unknown>({
        action: 'SEARCH_QDN_RESOURCES',
        includeMetadata: true,
        includeStatus: true,
        limit: 16,
        mode: 'ALL',
        query,
        service: searchService,
      });

      setResources(Array.isArray(result) ? (result as QdnResource[]) : []);
    } catch (error) {
      setResources([]);
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSearching(false);
    }
  }

  function selectSearchService(service: SearchService) {
    setSearchService(service);
    setResources([]);
  }

  async function openCatalogApp(app: CatalogApp) {
    if (hasAction(bridgeState, 'OPEN_NEW_TAB')) {
      await qdnRequest({
        action: 'OPEN_NEW_TAB',
        address: app.resource,
      });
      return;
    }

    window.open(getQdnRenderUrl('APP', app.name, app.identifier), '_blank', 'noopener,noreferrer');
  }

  async function copyText(value: string, copiedLabel: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`Copied ${copiedLabel}.`);
    } catch {
      setNotice(value);
    }
  }

  async function copyCatalogAddress(app: CatalogApp) {
    await copyText(app.resource, app.resource);
  }

  async function copyDonationAddress(coin: string, address: string) {
    await copyText(address, `${coin} address`);
  }

  async function refreshDonationBalance(donation: DonationAddress) {
    if (!canFetchWalletBalance) {
      setDonationSend((current) =>
        current?.donation.coin === donation.coin
          ? { ...current, balanceLabel: 'Unavailable', isFetchingBalance: false }
          : current,
      );
      return;
    }

    try {
      const balance = await qdnRequest<unknown>({
        action: 'GET_WALLET_BALANCE',
        coin: donation.coin,
      });

      setDonationSend((current) =>
        current?.donation.coin === donation.coin
          ? { ...current, balanceLabel: formatWalletBalance(balance, donation.coin), isFetchingBalance: false }
          : current,
      );
    } catch {
      setDonationSend((current) =>
        current?.donation.coin === donation.coin
          ? { ...current, balanceLabel: 'Unavailable', isFetchingBalance: false }
          : current,
      );
    }
  }

  function openDonationSend(donation: DonationAddress) {
    if (!canSendCoins) {
      setNotice(`Open this site in Qortium Home with a local or trusted node to send ${donation.coin}.`);
      return;
    }

    setNotice('');
    setDonationSend({
      amount: '',
      balanceLabel: 'Fetching...',
      donation,
      error: '',
      feeAtomsPerByte: String(getDefaultFeeAtomsPerByte(donation.coin)),
      isFetchingBalance: true,
      isSending: false,
    });
    void refreshDonationBalance(donation);
  }

  function closeDonationSend() {
    setDonationSend(null);
  }

  function updateDonationSendField(field: 'amount' | 'feeAtomsPerByte', value: string) {
    setDonationSend((current) => (current ? { ...current, [field]: value, error: '' } : current));
  }

  async function submitDonationSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!donationSend) return;

    const amountValidation = validateDonationAmount(donationSend.amount);

    if (!amountValidation.ok) {
      setDonationSend((current) => (current ? { ...current, error: amountValidation.error } : current));
      return;
    }

    const feeValidation = validateDonationFeeAtomsPerByte(donationSend.feeAtomsPerByte);

    if (!feeValidation.ok) {
      setDonationSend((current) => (current ? { ...current, error: feeValidation.error } : current));
      return;
    }

    setDonationSend((current) => (current ? { ...current, error: '', isSending: true } : current));

    try {
      const result = await qdnRequest<SendCoinResult | string>({
        action: 'SEND_COIN',
        amount: amountValidation.amount,
        coin: donationSend.donation.coin,
        destinationAddress: donationSend.donation.address,
        ...(feeValidation.feePerByte ? { feePerByte: feeValidation.feePerByte } : {}),
      });
      const transactionHash = formatTransactionHash(result);

      closeDonationSend();
      setNotice(
        transactionHash
          ? `Submitted ${amountValidation.amount} ${donationSend.donation.coin}. Tx hash: ${transactionHash}`
          : `Submitted ${amountValidation.amount} ${donationSend.donation.coin}.`,
      );
    } catch (error) {
      setDonationSend((current) =>
        current
          ? {
              ...current,
              error: error instanceof Error ? error.message : String(error),
              isSending: false,
            }
          : current,
      );
    }
  }

  useEffect(() => {
    refreshRuntime();
  }, []);

  useEffect(() => {
    if (bridgeState && canSearchQdn) {
      searchResources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeState?.ui]);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Workbench sections">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">Q</div>
          <div>
            <p className="eyebrow">Qortium</p>
            <strong>{APP_TITLE}</strong>
          </div>
        </div>
        <nav className="tab-list">
          {TABS.map((tab) => (
            <button
              className={activeTab === tab.id ? 'tab-button active' : 'tab-button'}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Preview workspace</p>
            <h1>{TABS.find((tab) => tab.id === activeTab)?.label ?? APP_TITLE}</h1>
          </div>
          <button className="refresh-button" type="button" onClick={refreshRuntime}>
            Refresh
          </button>
        </header>

        <section className="status-grid" aria-label="Runtime summary">
          <article className="stat-card">
            <span>Runtime</span>
            <strong>{bridgeState?.ui ?? 'Detecting'}</strong>
            <small>{bridgeState?.isHomeBridge ? 'Home bridge' : 'Browser fallback'}</small>
          </article>
          <article className="stat-card">
            <span>Node</span>
            <strong>{nodeLabel}</strong>
            <small>Height {formatCount(nodeStatus?.height)}</small>
          </article>
          <article className="stat-card">
            <span>Catalog</span>
            <strong>{liveCount}/{catalogApps.length} ready</strong>
            <small>{myAppCount} my apps, {recommendedAppCount} recommended, {extraAppCount} extra</small>
          </article>
          <article className="stat-card">
            <span>Workbench data</span>
            <strong>{hasQdnData ? 'QDN backed' : 'Seeded'}</strong>
            <small>{isRefreshingResources ? 'Refreshing resources' : `${priorities.length} priorities, ${workLog.length} log entries`}</small>
          </article>
        </section>

        {notice ? <div className="notice">{notice}</div> : null}
        {isRefreshing ? <div className="notice subtle">Refreshing runtime context...</div> : null}

        {activeTab === 'overview' ? (
          <section className="panel hero-panel">
            <div>
              <p className="eyebrow">From Qortal Workbench to Qortium Workbench</p>
              <h2>One place to see the work, steer priorities, and open the apps.</h2>
              <p>
                This is the Qortium-native adaptation of the old workbench idea. It now targets
                {` ${QDN_CONTRACTS.website.resource} `}and can read priorities and work-log entries
                from QDN JSON resources while keeping useful local fallbacks.
              </p>
            </div>
            <div className="hero-actions">
              <button type="button" onClick={() => setActiveTab('apps')}>View apps</button>
              <button className="secondary" type="button" onClick={() => setActiveTab('priorities')}>
                View priorities
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === 'apps' ? (
          <section className="stack">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Qortium app catalog</h2>
                  <p>Current APP resources grouped by ownership and recommendation status.</p>
                </div>
              </div>
              <div className="catalog-section-list">
                {catalogSections.map((section) => {
                  const ready = section.apps.filter((app) => app.source === 'live' && app.status === 'READY').length;

                  return (
                    <section className="catalog-section" key={section.id}>
                      <div className="catalog-section-heading">
                        <div>
                          <h3>{section.title}</h3>
                          <p>{section.description}</p>
                        </div>
                        <span className="section-count">{ready}/{section.apps.length} ready</span>
                      </div>
                      <div className="catalog-grid">
                        {section.apps.map((app) => (
                          <article className="catalog-card" key={`${app.name}/${app.identifier}`}>
                            <div className="catalog-card-head">
                              <AppIcon app={app} />
                              <div className="catalog-card-title">
                                <span className="chip">{app.category}</span>
                                <h3>{app.title}</h3>
                                <span>{app.resource}</span>
                              </div>
                              <span className={`status-pill ${statusClass(app.status)}`}>{app.status}</span>
                            </div>
                            <p>{app.summary}</p>
                            <dl className="catalog-meta">
                              <div>
                                <dt>Updated</dt>
                                <dd>{formatResourceDate(app.updated ?? app.created)}</dd>
                              </div>
                              <div>
                                <dt>Size</dt>
                                <dd>{formatResourceSize(app.size)}</dd>
                              </div>
                              <div>
                                <dt>Source</dt>
                                <dd>{app.source === 'live' ? 'QDN' : 'Seed'}</dd>
                              </div>
                            </dl>
                            <div className="catalog-actions">
                              <button type="button" onClick={() => openCatalogApp(app)}>
                                Open app
                              </button>
                              <button className="secondary" type="button" onClick={() => copyCatalogAddress(app)}>
                                Copy QDN
                              </button>
                              {app.repo ? (
                                <a href={app.repo} target="_blank" rel="noreferrer">
                                  Repository
                                </a>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Node resource search</h2>
                  <p>Read-only lookup through Qortium Home or a local Previewnet node.</p>
                </div>
                <div className="segmented-control" role="group" aria-label="QDN service">
                  {SEARCH_SERVICES.map((service) => (
                    <button
                      className={searchService === service ? 'active' : ''}
                      key={service}
                      onClick={() => selectSearchService(service)}
                      type="button"
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>
              <form className="search-row" onSubmit={searchResources}>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Qortium"
                  aria-label={`Search QDN ${searchService} resources`}
                />
                <button type="submit" disabled={isSearching || !canSearchQdn}>
                  {isSearching ? 'Searching' : 'Search'}
                </button>
              </form>
              <div className="resource-list">
                {resources.map((resource, index) => (
                  <article className="resource-item" key={getResourceKey(resource, index)}>
                    <div>
                      <strong>{getResourceTitle(resource)}</strong>
                      <span>{resourceAddress(resource)}</span>
                    </div>
                    <span className="status-pill neutral">{formatResourceStatus(resource)}</span>
                  </article>
                ))}
                {!resources.length ? <div className="empty-state">No live {searchService} resources loaded.</div> : null}
              </div>
            </section>
          </section>
        ) : null}

        {activeTab === 'priorities' ? (
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Priorities</h2>
                <p>Source: {sourceLabel(resourceSources.priorities)}</p>
                <small className="source-note">{QDN_CONTRACTS.priorities.resource}</small>
              </div>
            </div>
            <div className="priority-list">
              {priorities.map((item) => (
                <article className="priority-item" key={item.id}>
                  <div>
                    <span className="chip">{item.area}</span>
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                  </div>
                  <div className="priority-score">
                    <strong>{item.signal}</strong>
                    <span>{stateLabel(item.state)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === 'worklog' ? (
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Work Log</h2>
                <p>Source: {sourceLabel(resourceSources.workLog)}</p>
                <small className="source-note">{QDN_CONTRACTS.workLog.resource}</small>
              </div>
            </div>
            <div className="timeline">
              {workLog.map((entry) => (
                <article className="timeline-item" key={`${entry.date}-${entry.title}`}>
                  <time>{entry.date}</time>
                  <div>
                    <span className="chip">{entry.project}</span>
                    <h3>{entry.title}</h3>
                    <p>{entry.summary}</p>
                    <div className="tag-row">
                      {entry.tags.map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === 'metrics' ? (
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Metrics</h2>
                <p>First-pass operational counters before resource-specific activity metrics are ported.</p>
              </div>
            </div>
            <div className="metric-grid">
              <article>
                <span>Bridge actions</span>
                <strong>{bridgeState?.actions.length ?? 0}</strong>
              </article>
              <article>
                <span>Node connections</span>
                <strong>{formatCount(nodeStatus?.numberOfConnections)}</strong>
              </article>
              <article>
                <span>Priority items</span>
                <strong>{priorities.length}</strong>
              </article>
              <article>
                <span>Work log entries</span>
                <strong>{workLog.length}</strong>
              </article>
              <article>
                <span>Catalog apps</span>
                <strong>{catalogApps.length}</strong>
              </article>
            </div>
          </section>
        ) : null}

        {activeTab === 'support' ? (
          <section className="stack">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Support</h2>
                  <p>Contribution signals and funding addresses for ongoing Qortium work.</p>
                </div>
              </div>
              <div className="support-grid">
                <article>
                  <h3>Test Previewnet builds</h3>
                  <p>Run Home, open the QDN apps, and report broken flows with the exact screen and node mode.</p>
                </article>
                <article>
                  <h3>Review priorities</h3>
                  <p>Use this app as the staging area for poll-backed prioritization once writes are enabled.</p>
                </article>
                <article>
                  <h3>Improve the catalog</h3>
                  <p>Add app descriptions, live QDN identifiers, screenshots, and release status as they stabilize.</p>
                </article>
                <article>
                  <h3>Publish data resources</h3>
                  <p>Keep priorities in {QDN_CONTRACTS.priorities.resource} and work-log entries in {QDN_CONTRACTS.workLog.resource}.</p>
                </article>
              </div>
            </section>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Donation Addresses</h2>
                  <p>Copy one of these addresses to support QuickMythril's Qortium app and Previewnet work.</p>
                </div>
              </div>
              <div className="donation-grid">
                {SUPPORT_DONATIONS.map((donation) => (
                  <article className="donation-card" key={donation.coin}>
                    <div className="donation-card-head">
                      <div className="coin-heading">
                        <span className={`coin-badge coin-${donation.coin.toLowerCase()}`} aria-hidden="true">
                          {donation.coin.slice(0, 1)}
                        </span>
                        <div>
                          <h3>{donation.coin}</h3>
                          <p>{donation.label}</p>
                        </div>
                      </div>
                      <code title={donation.address}>{truncateDonationAddress(donation.address)}</code>
                    </div>
                    <div className="donation-actions">
                      <button
                        className="secondary"
                        type="button"
                        onClick={() => copyDonationAddress(donation.coin, donation.address)}
                      >
                        Copy address
                      </button>
                      <button type="button" onClick={() => openDonationSend(donation)}>
                        Send {donation.coin}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        ) : null}
      </section>
      {donationSend ? (
        <div className="modal-overlay" role="presentation" onMouseDown={closeDonationSend}>
          <section
            aria-labelledby="send-donation-title"
            className="send-modal"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="send-modal-heading">
              <div>
                <p className="eyebrow">{donationSend.donation.label}</p>
                <h2 id="send-donation-title">Send {donationSend.donation.coin}</h2>
              </div>
              <button className="secondary icon-button" type="button" onClick={closeDonationSend} aria-label="Close">
                X
              </button>
            </div>
            <div className="balance-pill">
              Balance: {donationSend.isFetchingBalance ? 'Fetching...' : donationSend.balanceLabel}
            </div>
            <form className="send-form" onSubmit={submitDonationSend}>
              <label>
                Amount
                <input
                  aria-label={`Amount in ${donationSend.donation.coin}`}
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => updateDonationSendField('amount', event.target.value)}
                  placeholder="0.0"
                  step="any"
                  type="number"
                  value={donationSend.amount}
                />
              </label>
              <label>
                Fee rate
                <input
                  aria-label={`Fee rate in atomic units per byte for ${donationSend.donation.coin}`}
                  inputMode="numeric"
                  min="0"
                  onChange={(event) => updateDonationSendField('feeAtomsPerByte', event.target.value)}
                  step="1"
                  type="number"
                  value={donationSend.feeAtomsPerByte}
                />
              </label>
              <code title={donationSend.donation.address}>{donationSend.donation.address}</code>
              {donationSend.error ? <div className="form-error">{donationSend.error}</div> : null}
              <div className="modal-actions">
                <button className="secondary" type="button" onClick={closeDonationSend}>
                  Cancel
                </button>
                <button type="submit" disabled={donationSend.isSending}>
                  {donationSend.isSending ? 'Confirming' : 'Confirm'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
