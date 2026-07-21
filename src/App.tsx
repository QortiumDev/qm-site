import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  formatResourceDate,
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
  BGM_TRACK_LABEL,
  getBgmSourceUrl,
  getBgmVolume,
  readBgmPreference,
  shouldAttemptAutoplay,
  writeBgmPreference,
} from './backgroundMusic';
import { copyTextToClipboard } from './clipboard';
import {
  SUPPORT_DONATIONS,
  atomicToCoinString,
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

const APP_TITLE = 'Qortium Workbench';

type TabId = 'about' | 'apps' | 'todo' | 'worklog' | 'support';
type TabDefinition = {
  hidden?: boolean;
  id: TabId;
  label: string;
};
type DonationSendState = {
  amount: string;
  balanceAtoms: bigint | null;
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

export const TABS: TabDefinition[] = [
  { id: 'about', label: 'About' },
  { id: 'apps', label: 'Apps' },
  { hidden: true, id: 'todo', label: 'To-Do' },
  { hidden: true, id: 'worklog', label: 'Work Log' },
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

function getWalletBalanceAtoms(value: unknown): bigint | null {
  const direct = getResultString(value);

  if (/^\d+$/.test(direct)) return BigInt(direct);

  if (isRecord(value)) {
    for (const key of ['balance', 'confirmedBalance', 'total', 'available', 'walletBalance']) {
      const nested = getResultString(value[key]);

      if (/^\d+$/.test(nested)) return BigInt(nested);
    }
  }

  return null;
}

function formatWalletBalance(value: unknown, coin: string) {
  const atoms = getWalletBalanceAtoms(value);

  if (atoms !== null) return `${atomicToCoinString(atoms)} ${coin}`;

  return 'Unavailable';
}

function formatTransactionHash(result: SendCoinResult | string | null | undefined) {
  if (typeof result === 'string' && result.trim()) return result.trim();
  if (!isRecord(result)) return '';

  return getResultString(result.txHash) || getResultString(result.transactionHash) || getResultString(result.signature);
}

function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const storage = typeof window === 'undefined' ? null : window.localStorage;

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.volume = getBgmVolume();

    if (!shouldAttemptAutoplay(readBgmPreference(storage))) {
      return;
    }

    let disarm = () => {};

    // Home (Electron) permits autoplay, so this resolves and playback starts on load. A
    // browser rejects it instead, and we arm the first user gesture rather than retrying.
    audio.play().catch(() => {
      const startOnGesture = () => {
        disarm();
        audio.play().catch(() => {});
      };

      disarm = () => {
        window.removeEventListener('pointerdown', startOnGesture);
        window.removeEventListener('keydown', startOnGesture);
      };

      window.addEventListener('pointerdown', startOnGesture, { once: true });
      window.addEventListener('keydown', startOnGesture, { once: true });
    });

    return () => disarm();
  }, [storage]);

  const toggle = () => {
    const audio = audioRef.current;

    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(() => {});
      writeBgmPreference(storage, 'on');
    } else {
      audio.pause();
      writeBgmPreference(storage, 'off');
    }
  };

  return (
    <div className="bgm">
      <audio
        loop
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        preload="none"
        ref={audioRef}
        src={getBgmSourceUrl()}
      />
      <button
        aria-label={`${isPlaying ? 'Pause' : 'Play'} background music — ${BGM_TRACK_LABEL}`}
        aria-pressed={isPlaying}
        className={isPlaying ? 'bgm-button playing' : 'bgm-button'}
        onClick={toggle}
        title={BGM_TRACK_LABEL}
        type="button"
      >
        <span aria-hidden="true">{isPlaying ? '❚❚' : '►'}</span>
        <span className="bgm-label">Music</span>
      </button>
    </div>
  );
}

function AppIcon({ app }: { app: CatalogApp }) {
  const [iconIndex, setIconIndex] = useState(0);
  const label = app.title || app.identifier;
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || app.identifier.slice(0, 2).toUpperCase();

  useEffect(() => {
    setIconIndex(0);
  }, [app.identifier, app.name, app.iconUrls]);

  const iconUrl = app.iconUrls[iconIndex];

  if (!iconUrl) {
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
      onError={() => setIconIndex((current) => current + 1)}
      src={iconUrl}
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

export function getTabFromHash(hash: string): TabId {
  const raw = hash.replace(/^#/, '');

  if (raw === 'overview') return 'about';
  if (raw === 'priorities') return 'todo';
  if (raw === 'metrics') return 'apps';
  if (raw === 'donate') return 'support';

  return TABS.some((item) => item.id === raw) ? (raw as TabId) : 'apps';
}

function useHashTab() {
  const [tab, setTab] = useState<TabId>(() => {
    return typeof window === 'undefined' ? 'apps' : getTabFromHash(window.location.hash);
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
  const [, setNodeStatus] = useState<NodeStatus | null>(null);
  const [catalogApps, setCatalogApps] = useState<CatalogApp[]>(() => mergeCatalogResources([]));
  const [priorities, setPriorities] = useState<PriorityItem[]>(FALLBACK_PRIORITIES);
  const [workLog, setWorkLog] = useState<WorkLogEntry[]>(FALLBACK_WORK_LOG);
  const [donationSend, setDonationSend] = useState<DonationSendState | null>(null);
  const [notice, setNotice] = useState('');

  const catalogSections = useMemo(() => groupCatalogApps(catalogApps), [catalogApps]);
  const canSendCoins = Boolean(bridgeState?.isHomeBridge && hasAction(bridgeState, 'SEND_COIN'));
  const canFetchWalletBalance = Boolean(bridgeState?.isHomeBridge && hasAction(bridgeState, 'GET_WALLET_BALANCE'));

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
      return;
    }

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
    } catch {
      setPriorities(FALLBACK_PRIORITIES);
      setWorkLog(FALLBACK_WORK_LOG);
    }
  }

  async function refreshRuntime() {
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
      setNotice(error instanceof Error ? error.message : String(error));
    }
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
    const didCopy = await copyTextToClipboard(value);

    if (didCopy) {
      setNotice(`Copied ${copiedLabel}.`);
      return;
    }

    setNotice(value);
  }

  async function copyDonationAddress(coin: string, address: string) {
    await copyText(address, `${coin} address`);
  }

  async function refreshDonationBalance(donation: DonationAddress) {
    if (!canFetchWalletBalance) {
      setDonationSend((current) =>
        current?.donation.coin === donation.coin
          ? { ...current, balanceAtoms: null, balanceLabel: 'Unavailable', isFetchingBalance: false }
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
          ? {
              ...current,
              balanceAtoms: getWalletBalanceAtoms(balance),
              balanceLabel: formatWalletBalance(balance, donation.coin),
              isFetchingBalance: false,
            }
          : current,
      );
    } catch {
      setDonationSend((current) =>
        current?.donation.coin === donation.coin
          ? { ...current, balanceAtoms: null, balanceLabel: 'Unavailable', isFetchingBalance: false }
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
      balanceAtoms: null,
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

    const amountValidation = validateDonationAmount(donationSend.amount, donationSend.balanceAtoms);

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
    if (!notice) return undefined;

    const timeoutId = window.setTimeout(() => {
      setNotice('');
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

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
          {TABS.filter((tab) => !tab.hidden).map((tab) => (
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
            <h1>{TABS.find((tab) => tab.id === activeTab)?.label ?? APP_TITLE}</h1>
          </div>
          <BackgroundMusic />
        </header>

        {activeTab === 'about' ? (
          <section className="panel about-card">
            <h2>About me</h2>
            <p>
              I'm QuickMythril, a builder on Qortium — a community-run internet platform where sharing posts and
              media, messaging, publishing sites and apps, and storing files all happen on one network that no company
              controls. I used to build on Qortal; Qortium continues that work with different goals and tradeoffs, and
              everything I make now ships here first.
            </p>
            <h3>What drives my work</h3>
            <ul>
              <li>No one above the network. There is no company that can ban or censor you; you decide locally what you see.</li>
              <li>Your keys, your names, your content. Accounts and published data stay yours — portable, and deletable when you choose.</li>
              <li>Reachable by everyone. Nodes work behind blocking routers and can route through I2P to keep your IP private.</li>
              <li>Community direction. Account reputation shapes minting and voting, and open community voting is being built.</li>
            </ul>
            <h3>Why Qortium</h3>
            <p>
              Qortium is live today on Previewnet — a preview network for testing and shaping the protocol before a
              permanent mainnet. It will be reset along the way, which makes now the best time to take part: run a
              node, try the apps, and help decide what the platform becomes. There is no coin required by default,
              names can be chosen and changed at any time, and one name can carry many apps.
            </p>
            <h3>Collaboration</h3>
            <p>
              Feedback, testing, and contributions are welcome. The Apps page lists current work, and the To-Do page
              is where priorities get steered.
            </p>
            <ul className="bio">
              <li>
                <span className="label">Primary name</span>
                <code>QuickMythril</code>
              </li>
              <li>
                <span className="label">Primary address</span>
                <code>QT4zHex8JEULmBhYmKd5UhpiNA46T5wUko</code>
              </li>
              <li>
                <span className="label">This site</span>
                <code>qdn://WEBSITE/QuickMythril/qm-site</code>
              </li>
              <li>
                <span className="label">Project site</span>
                <code>qortium.app</code>
              </li>
            </ul>
            <p className="muted-note">This site runs inside Qortium Home; all live features use the Home bridge.</p>
          </section>
        ) : null}

        {activeTab === 'apps' ? (
          <section className="panel">
            <div className="section-heading">
              <h2>Apps</h2>
            </div>
            <div className="catalog-section-list">
              {catalogSections.map((section) => (
                <details className="apps-group" key={section.id} open>
                  <summary>
                    {section.title} <span>({section.apps.length})</span>
                  </summary>
                  <div className="catalog-section">
                    <div className="catalog-grid">
                      {section.apps.map((app) => (
                        <article className="catalog-card" key={`${app.name}/${app.identifier}`}>
                          <div className="catalog-card-head">
                            <AppIcon app={app} />
                            <div className="catalog-card-title">
                              <h3>{app.title}</h3>
                              <small>{formatResourceDate(app.updated ?? app.created)}</small>
                            </div>
                          </div>
                          <p>{app.summary}</p>
                          <div className="catalog-actions">
                            <button type="button" onClick={() => openCatalogApp(app)}>
                              Open App
                            </button>
                            {app.repo ? (
                              <a
                                href={app.repo}
                                onClick={(event) => {
                                  event.preventDefault();
                                  void copyText(app.repo ?? '', 'GitHub link');
                                }}
                              >
                                GitHub
                              </a>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === 'todo' ? (
          <section className="panel">
            <div className="section-heading">
              <h2>To-Do & Priorities</h2>
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
              <h2>Work Log</h2>
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

        {activeTab === 'support' ? (
          <section className="stack">
            <section className="panel">
              <div className="section-heading">
                <h2>Support</h2>
              </div>
              <p>
                The best ways to support this work: run Qortium Home, try the apps, and report what breaks. If you
                want to help fund development, any of the addresses below is appreciated.
              </p>
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
                Amount ({donationSend.donation.coin})
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
              <details className="advanced-toggle">
                <summary>Advanced</summary>
                <label>
                  Fee rate (atomic units per byte)
                  <input
                    aria-label={`Fee rate in atomic units per byte for ${donationSend.donation.coin}`}
                    inputMode="numeric"
                    min="0"
                    onChange={(event) => updateDonationSendField('feeAtomsPerByte', event.target.value)}
                    step="1"
                    type="number"
                    value={donationSend.feeAtomsPerByte}
                  />
                  <small className="muted-note">
                    Default: {getDefaultFeeAtomsPerByte(donationSend.donation.coin)} for {donationSend.donation.coin}.
                  </small>
                </label>
              </details>
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
      {notice ? (
        <div className="notice notice-toast" role="status">
          {notice}
        </div>
      ) : null}
    </main>
  );
}
