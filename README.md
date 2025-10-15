# YouTube Pinner (Chrome Extension)

Pin any YouTube video and see your pins at the top of the YouTube homepage. Pin directly from:
- Video pages (📌 button)
- The homepage (📌 button on each video card)
Manage pins from the homepage row (❌ unpin) or from the popup.

## Features
- 📌 Pin videos from video pages and the homepage
- ❌ Unpin straight from the homepage row
- Unlimited pins (no limit)
- Auto-updates on SPA navigation, scroll, and dynamic loads
- Clean, dark-theme friendly UI
- MV3 compatible

## How it works
- Content script injects a 📌 button on video pages and on homepage video cards (skips already-pinned videos).
- Pinned videos render in a “📌 Your Pinned Videos” row at the top of the YouTube homepage.
- Data is stored with `chrome.storage.sync` (can be switched to `storage.local` or IndexedDB if you want larger data).

## Install (Load Unpacked)
1. Go to `chrome://extensions/`
2. Enable “Developer mode”
3. Click “Load unpacked”
4. Select this project folder

Folder layout:
- `manifest.json` — MV3 manifest
- `content.js` — injects pin buttons, handles SPA/scroll
- `homepage.js` — renders the pinned row on the homepage
- `popup.html` / `popup.js` — quick management UI
- `styles.css` — styles for popup
- `background.js` — minimal service worker
- `CHANGELOG.md` — version history

## Usage
- On any video page: click “📌 Pin Video”
- On the homepage: hover any card and click the 📌 button
- Manage on the homepage row (❌ to unpin), or use the extension popup
- Pins update live without page reloads

## Permissions
- `storage` — save your pins
- `tabs`, `scripting` — inject buttons and UI
- `host_permissions: *://www.youtube.com/*` — run on YouTube pages

## Troubleshooting
- Button didn’t appear? YouTube loads dynamically; wait a second or scroll a bit.
- Still missing? Refresh the page once. If it persists, disable/enable the extension.
- If you pin from multiple devices, `chrome.storage.sync` may take a moment to sync.

## Switching Storage (optional)
- Staying with `chrome.storage.sync` = cross-device but space/write limits.
- For many pins or richer metadata, switch to `chrome.storage.local` or IndexedDB.

## Privacy
- No external servers. All data stays in your browser storage.

## License
MIT
