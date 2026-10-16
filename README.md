# French Assistant: French–English Dictionary Side Panel

A small Chrome/Edge extension that shows English definitions for the current French word while you study on [French Assistant's vocabulary page](https://www.frdic.com/areas/recite/fr/). It uses the browser's side panel, so the study controls stay visible.

## Features

- Detects the current word on the study card or in the built-in dictionary column.
- Updates the English definitions as you move to another word.
- Shows definitions from the French entry on English Wiktionary, with part of speech and pronunciation when available.
- Follows an inflected form to its base entry when the form has no standalone definition.
- Includes an optional manual lookup field.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions/` in Chrome or `edge://extensions/` in Edge.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose this folder (the one containing `manifest.json`).
5. Open the French Assistant vocabulary study page and click the extension icon to open the side panel.

If the extension was already loaded, click **Reload** on its card in the extensions page after updating these files.

## How it works

On the `#/exam` route, the content script reads the visible study card. When that card is hidden, it reads the current word from the built-in dictionary column's iframe URL. The side panel requests the corresponding French entry from English Wiktionary and displays its English definitions.

The extension does not read or send the French Assistant login token. Dictionary requests send only the word being looked up to `en.wiktionary.org`. An internet connection is required. Some rare or inflected forms may have incomplete entries; use the **Entry** link in the panel to inspect the source page.

## Permissions and attribution

- Page access: `https://www.frdic.com/areas/recite/fr/*`, to detect the current study word.
- Network access: `https://en.wiktionary.org/*`, to retrieve dictionary entries.
- `sidePanel`: to show definitions beside the study page.

Dictionary content is provided by [English Wiktionary](https://en.wiktionary.org/) under [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/); additional terms may apply to individual entries.
