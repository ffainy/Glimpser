# Glimpser

Glimpser is a Chrome and Firefox extension that opens links in a floating preview window without leaving the current page. Drag a link, release it, and keep reading.

## Features

- Open links in a floating iframe preview instead of a new tab.
- Two trigger modes:
  - **Release anywhere** — after a deliberate drag, release anywhere on the page. No drop hint is shown.
  - **Drop area** — a fullscreen drop hint appears while dragging; release anywhere to open a preview.
- Configurable preview size, cascade offset, corner style, and corner radius.
- Single or multiple preview windows (up to 10) with optional backdrop mode, "close others", and "close all" controls.
- Per-window toolbar for refresh, copy, open in current tab, and open in a new tab.
- Domain blacklist to disable previews on selected sites.
- Dark, light, and system themes with English and Simplified Chinese UI.
- Settings sync through the browser's storage sync.

## Requirements

- **Chrome** 90 or newer (Manifest V3).
- **Firefox** 113 or newer (`declarativeNetRequest` support).
- **Node.js** 20 or newer for development and packaging.

## Development

```bash
npm install
npm run build
```

The build merges `src/manifest.json` with the browser-specific overlay and writes:

- `dist/chrome/` and `dist/glimpser-<version>-chrome.zip`
- `dist/firefox/` and `dist/glimpser-<version>-firefox.zip`

### Load the extension locally

**Chrome**

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select `dist/chrome`.

**Firefox**

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on**.
3. Select `dist/firefox/manifest.json`.

Firefox only loads temporary add-ons unsigned. For a permanent install, the package must be signed by Mozilla.

## Usage

1. Drag a link on any page.
2. Depending on the trigger mode, release it anywhere; in Drop area mode the fullscreen drop hint confirms where to release.
3. Use the preview toolbar to refresh, copy the URL, open the page in the current tab, or open it in a new tab.
4. Close the preview with the close button, `Escape`, or by clicking the backdrop when backdrop mode is active.

If a site refuses to load in a frame, open it in a new tab from the preview toolbar.

## Settings

Open the extension popup and choose **Settings**, or open the options page from the browser's extension manager.

- **General** — language, theme (Light / Dark / System), and the global preview toggle.
- **Preview** — trigger mode, single/multiple preview windows, window defaults, corner style, and toolbar buttons.
- **Blacklist** — block previews for exact hostnames such as `example.com` or `www.example.com`.
- **About** — version and project metadata.

Language and theme changes preview immediately, but every setting is persisted only when you press **Save**. The bottom action bar shows whether the form has unsaved changes and keeps **Save** disabled while the form matches what is stored.

**Reset** restores the form defaults without writing anything until you press **Save**. The domain blacklist and the internal `debug` flag are preserved by Reset. Reset asks for confirmation because unsaved changes are discarded.

## Permissions and privacy

- `storage` — stores settings and syncs them through the browser account.
- `declarativeNetRequest` — removes `X-Frame-Options` and `Content-Security-Policy` response headers from sub-frame requests so that more pages can load inside the preview iframe.
- Host access (`*://*/*`) — required for the content script that provides drag-and-drop previews and for the sub-frame header rule.

Glimpser does not collect, transmit, or sell data. There is no analytics or remote service. Preview content is loaded directly by the browser from the site you choose.

## Project structure

```text
src/
  manifest.json            Base Manifest V3 manifest
  manifest.chrome.json     Chrome overlay
  manifest.firefox.json    Firefox overlay
  background.js            Header rules and debug flag
  content.js               Preview windows and drop targets
  i18n.js                  Runtime locale loader
  popup.html / popup.js    Toolbar popup
  settings.html / settings.js  Options page
  css/                     Shared and per-surface styles
  _locales/                English and Simplified Chinese messages
scripts/
  build.js                 Build and package both browsers
  changelog-lib.mjs        Changelog parsing helpers
  update-changelog.mjs     Release changelog generation
  sign-crx.cjs             Chrome CRX signing
tests/
  changelog-lib.test.mjs   Changelog helper tests
```

## Scripts

| Command | Description |
| --- | --- |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run build` | Build and package Chrome and Firefox. |
| `node scripts/update-changelog.mjs --mode unreleased` | Refresh the Unreleased changelog from commits. |
| `node scripts/update-changelog.mjs --mode release --tag vX.Y.Z` | Generate the version section and release notes. |

## Release artifacts

The release workflow runs on `v*.*.*` tags and publishes:

- `glimpser-<version>-firefox.zip` and `.xpi` (the XPI is the same unsigned package with a renamed extension).
- `glimpser-<version>-chrome.zip` and `.crx` (the CRX is self-signed with the repository secret).
- SHA-256 checksums for each artifact.

Store distribution requires separate signing by Mozilla and the Chrome Web Store.

## License

No license has been selected yet. Add a license before distributing the project publicly.
