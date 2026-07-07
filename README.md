# Qortium Workbench

Qortium Workbench is QuickMythril's personal QDN website: an About page, the
Qortium app catalog, a to-do/priorities board, a work log, and a support page
with donation addresses. It is modeled on the original gf089-site (Q-Workbench)
from Qortal, with the technical runtime machinery kept out of sight.

It is intentionally separate from `qortium-site`: the public site remains the
clean explanatory website for `qortium.app`, while this app is the operational
workspace meant to run well inside Qortium Home and still show useful static
fallbacks in a plain browser.

## QDN Identity

- Service: `WEBSITE`
- Name: `QuickMythril`
- Identifier: `qm-site`
- Title: `Qortium Workbench`
- Resource: `qdn://WEBSITE/QuickMythril/qm-site`

## QDN Data Resources

The site can read live JSON resources and falls back to seeded local data when
they are not published yet.

- Priorities: `qdn://JSON/QuickMythril/qm-site-priorities`
- Work log: `qdn://JSON/QuickMythril/qm-site-worklog`

The Apps page also reads the current `APP` resources from the connected node,
merges them with the known Qortium app identities, and loads each app icon from
that app's `favicon.ico` when available.

## Support Donations

The Support page shows donation addresses and Home-mediated send buttons for:

- BTC: `1NxmYAMYbXUmZixWLnFg2Pq4k2hoKkPg5V`
- LTC: `LP5aH6vqJq13nbRKXyfVDrsPLdtw7saHki`
- DOGE: `DNX9uBhZiHDrYm1M9DaEiVkDK2sfDJBo2B`
- DGB: `DHNkBzyydv1UNUSS3KwKEdQKrFP1eZt9Go`
- RVN: `RFNfhkMQNYWQyPoZ2N67TcSfv4ArXQ8yEF`
- DASH: `Xk3LSCDp4EXAVkLtdYGKd63Zmjn6zT7M7a`
- NMC: `NJGFddaYPmRzotQ8NNFc1v8xfozFseEZuY`
- FIRO: `aNoM4oDed75jQJ2sL8wVqSKSSj7M7QJtmr`

Addresses can be copied in any browser. The send buttons call Qortium Home's
`SEND_COIN` bridge action and require an unlocked Home account with a local or
trusted writable node. The old standalone Donate page and QORT address remain
removed for now.

## Qortium Home Display Settings

The UI honors QDN display parameters from Qortium Home, including `qdnTheme`,
`qdnAccent`, and `qdnTextSize`. It also accepts the older unprefixed `theme`,
`accent`, and `textSize` query parameters, plus matching message events from the
host window.

## Development

```sh
npm install
npm run dev
npm run build
npm test
```

The site uses `window.qdnRequest` inside Qortium Home. In a normal browser it uses
a read-only local Core fallback at `http://127.0.0.1:24891` unless
`VITE_QORTIUM_NODE_API_URL` is set.

## Publish

```sh
npm run build
npm run qdn:publish
```

Publish defaults can be overridden with the `QORTIUM_QM_SITE_` environment
prefix, for example `QORTIUM_QM_SITE_QDN_SERVICE`,
`QORTIUM_QM_SITE_QDN_NAME`, or `QORTIUM_QM_SITE_NODE_API_URL`.

To publish with an encrypted wallet backup instead of the local preview account,
provide the backup path and send the password on stdin:

```sh
QORTIUM_QM_SITE_WALLET_BACKUP_PATH=/path/to/wallet-backup.json \
QORTIUM_QM_SITE_WALLET_PASSWORD_STDIN=1 \
npm run qdn:publish
```
