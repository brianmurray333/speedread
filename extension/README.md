# SpeedRead Chrome Extension

Speed read any text on the web using RSVP (Rapid Serial Visual Presentation) with Optimal Recognition Point (ORP) highlighting.

## Features

- **Speed read any selected text** - Highlight text on any webpage and instantly speed read it
- **Keyboard shortcut** - Press `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac) to start
- **Context menu** - Right-click on selected text and choose "SpeedRead Selection"
- **Adjustable WPM** - Control reading speed from 50 to 1000 words per minute
- **Dark/Light themes** - Toggle between themes for comfortable reading
- **Progress tracking** - See your progress and time remaining
- **Keyboard controls** - Full keyboard navigation while reading

## Installation (Developer Mode)

Since this extension is not on the Chrome Web Store, you'll need to install it in developer mode:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right corner)
3. Click **Load unpacked**
4. Select the `extension` folder from this repository
5. The SpeedRead extension should now appear in your extensions list

## Usage

### Starting the Reader

1. **Select text** on any webpage
2. Either:
   - Press `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac)
   - Right-click and select "SpeedRead Selection"
   - Click the SpeedRead extension icon

### Keyboard Controls (While Reading)

| Key | Action |
|-----|--------|
| `Space` or `Enter` | Play/Pause |
| `←` | Previous word |
| `→` | Next word |
| `↑` | Increase speed (+50 WPM) |
| `↓` | Decrease speed (-50 WPM) |
| `R` | Restart from beginning |
| `Esc` | Exit reader |

### Mouse Controls

- **Click the progress bar** to seek to any position
- **Move the mouse** to show/hide controls while reading

## How It Works

SpeedRead uses RSVP (Rapid Serial Visual Presentation) to display one word at a time at your chosen speed. Each word is positioned so that its **Optimal Recognition Point (ORP)** - the letter your eye naturally focuses on - is always in the center of the screen.

The ORP is highlighted in orange, making it easy for your eye to lock onto and reducing the need for eye movement. This technique can significantly increase reading speed while maintaining comprehension.

## Preferences

Your preferences (WPM and theme) are automatically saved and synced across your Chrome browsers.

## Regenerating Icons

If you need to regenerate the extension icons:

```bash
cd extension
npm install sharp
node generate-icons.js
```

## Sharing Content

Click the share button (to the left of the close button) to publish your selected content to the SpeedRead library:

1. Click the share button
2. Enter a title for the content
3. Click "Publish & Copy Link"
4. The shareable link is copied to your clipboard

The share link opens the SpeedRead web app where anyone can speed read the content.

## Configuration

To connect to your SpeedRead API, update the `SPEEDREAD_API_URL` in `speedreader.js`:

```javascript
const SPEEDREAD_API_URL = 'https://your-speedread-app.vercel.app';
```

For local development, use `http://localhost:3000`.

## Permissions

This extension requires:

- **activeTab** - To read selected text from the current tab
- **contextMenus** - To add the right-click menu option
- **storage** - To save your WPM and theme preferences
- **scripting** - To inject the reader into pages
