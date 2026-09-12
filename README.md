# Bili Notes

[![CI](https://github.com/AK1116q/bili-notes/actions/workflows/ci.yml/badge.svg)](https://github.com/AK1116q/bili-notes/actions/workflows/ci.yml)

**Take timestamped notes while watching Bilibili videos.**

Bili Notes is a local-first browser extension for timestamped Bilibili video notes. It does not need platform API credentials, a cloud account, or runtime dependencies.

![Bili Notes demo in an offline fixture](docs/screenshot.png)

The screenshot uses an offline Bilibili-shaped test page, not the live Bilibili website.

## Features

- Opens a small notes panel on regular Bilibili video pages.
- Captures the current video time, page part, title, and note text.
- Lets you jump back to saved timestamps from the page panel.
- Stores notes separately by video ID and part number.
- Provides a notes library with search, edit, delete, Markdown export, JSON backup, and JSON restore.
- Protects in-progress edits from background refreshes.
- Prevents stale library pages from overwriting newer edits of the same note.
- Stores data only in the current browser profile through `chrome.storage.local`.

## Install

1. Download or clone this repository and keep the folder somewhere permanent.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the folder that contains `manifest.json`.
6. Refresh an open Bilibili video page and click **Video Notes / 视频笔记** in the lower-right corner.

Node.js is not required for installation. This version is not published in browser extension stores.

## Usage

- Press `Alt + Shift + N` to open the panel and focus the note box. Some systems may reserve this shortcut; the floating button still works.
- Opening the panel captures the current timestamp. Use the recapture button if you want to update the saved time before writing.
- Press `Ctrl + Enter` or `Command + Enter` inside the text area to save.
- Click a saved timestamp to seek the current video element.
- Click the extension toolbar icon to open the notes library.
- Export Markdown for the current search results, or back up all notes as JSON.

If you switch parts while a draft is open, the draft is preserved with its original captured timestamp. Recapture before saving if you want the note to point at the new part.

## Permissions and Privacy

The extension requests only the `storage` permission and injects content scripts only on `https://www.bilibili.com/video/*`. It reads the current time from the existing HTML video element. It does not use Bilibili cookies, login tokens, private APIs, or extra network requests.

Stored notes include video ID, part number, timestamp, title, note text, and created/updated times. Browser local storage is not encrypted secure storage. Uninstalling the extension removes local data, so export a JSON backup first if you want to keep your notes.

## Supported Pages and Limits

- Built for desktop Chrome and Edge Manifest V3.
- Supports regular `/video/BV...` and `/video/av...` pages.
- Does not support livestreams, `/bangumi/` pages, mobile apps, or cross-site iframe players.
- BV and av URLs are stored as different identifiers; the extension does not call APIs to merge aliases.
- Part numbers come from the `p` URL parameter.
- Timestamp links include `p` and `t`; whether Bilibili honors them depends on the current website behavior.
- Notes are rounded to whole seconds and limited to 10,000 characters each.
- Restore accepts backups up to 10 MB and 5,000 notes.
- Live Bilibili page variants can change, so selectors may need maintenance.

## Development

Requires Node.js 22 or newer. No install step is needed.

```bash
npm test
```

After editing the extension, reload it in the browser extensions page and refresh any open video pages.

Project structure:

- `core.js` validates notes, parses video URLs, formats timestamps, and exports Markdown.
- `background.js` serializes storage messages.
- `content.js` renders the isolated video-page panel.
- `library.*` renders the notes library.

The implementation follows Chrome extension concepts for [content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) and the [Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage).

See [validation notes](docs/VALIDATION.md) and [contributing notes](CONTRIBUTING.md).

## Roadmap

- Add tags and course-style organization.
- Add configurable shortcuts.
- Show conflict details in the notes library so two edited texts can be merged.
- Add adapters for more Bilibili page types.

## License

[MIT](LICENSE)
