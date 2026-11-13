# French Assistant: French–English Dictionary Side Panel

A small Chrome/Edge extension that shows English definitions for the current French word while you study on [French Assistant's vocabulary page](https://www.frdic.com/areas/recite/fr/). It uses the browser's side panel, so the study controls stay visible.

## Features

- Detects the current word on both older and newer study cards or in the built-in dictionary column.
- Updates the English definitions as you move to another word.
- Shows definitions from the French entry on English Wiktionary, with part of speech and pronunciation when available.
- Plays each English definition aloud with the browser's English speech voice.
- Follows an inflected form to its base entry when the form has no standalone definition.
- Includes an optional manual lookup field.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions/` in Chrome or `edge://extensions/` in Edge.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose this folder (the one containing `manifest.json`).
5. Open the French Assistant vocabulary study page and click the extension icon to open the side panel.

If the extension was already loaded, click **Reload** on its card in the extensions page after updating these files.
Then refresh any French Assistant study tab that was already open so the new content script can attach to it.

## How it works

On French Assistant's vocabulary study page, the content script reads the visible study card, a headline-sized word, or the built-in dictionary column's iframe URL. The side panel requests the corresponding French entry from English Wiktionary and displays its English definitions. The speaker beside each definition uses the browser's speech synthesis; the available voice depends on the browser and operating system.

The extension does not read or send the French Assistant login token. Dictionary requests send only the word being looked up to `en.wiktionary.org`. An internet connection is required. Some rare or inflected forms may have incomplete entries; use the **Entry** link in the panel to inspect the source page.

The panel reads the regular Wiktionary entry page first and falls back to its REST endpoint. If both requests fail, it shows the error and a **Retry** button.

## Permissions and attribution

- Page access: `https://www.frdic.com/areas/recite/*`, to detect the current study word.
- Network access: `https://en.wiktionary.org/*`, to retrieve dictionary entries.
- `sidePanel`: to show definitions beside the study page.

Dictionary content is provided by [English Wiktionary](https://en.wiktionary.org/) under [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/); additional terms may apply to individual entries.
