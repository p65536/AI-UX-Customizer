# AI UX Customizer (A Suite of UI Enhancement Scripts)

![license](https://img.shields.io/badge/license-MIT-green)
![userscript](https://img.shields.io/badge/userscript-Tampermonkey-blueviolet)
![topic](https://img.shields.io/badge/topic-customization-ff69b4)
![topic](https://img.shields.io/badge/topic-ui_enhancement-9cf)

![platform](https://img.shields.io/badge/platform-ChatGPT-lightgrey)
![platform](https://img.shields.io/badge/platform-Gemini-lightgrey)

[日本語のREADMEはこちら。](./README_ja.md)

## About This Project

**`AI UX Customizer`** is a project that provides a suite of userscripts to enhance the user experience of various AI chat services.  
Each script is developed independently and can be installed separately.

---

## Recent Updates

### 2025/09/26
- Updated `ChatGPT UX Customizer`/`Gemini UX Customizer` (v1.5.4 -> v1.5.5)

### 2025/09/25
- Updated `ChatGPT UX Customizer`/`Gemini UX Customizer` (v1.5.1 -> v1.5.4)
- Updated `Quick Text Buttons` (v1.1.1 -> v1.2.0)

### 2025/09/13
- Updated `ChatGPT UX Customizer`/`Gemini UX Customizer` (v1.5.0 -> v1.5.1)

### 2025/09/08
- Updated `ChatGPT UX Customizer`/`Gemini UX Customizer` (v1.4.0 -> v1.5.0)

---

## Planned Updates

> An improvement is planned for themes that use avatar icons.  
> When a conversation contains several hundred messages, performance degradation occursCurrently, when a conversation contains several hundred messages, a noticeable performance degradation occurs, **especially when opening or closing the Canvas panel**.  
> The root cause has been identified and improvements confirmed in a local build.  
> Since additional refactoring is also underway, the release will take a little more time.  
> The update is expected to be published within October.  

---

## Scripts in This Project

### 1. ChatGPT UX Customizer / Gemini UX Customizer

A script that adds powerful theme and navigation features. For each chat, you can flexibly customize speaker names, icons, text colors, bubble styles, backgrounds, and standing images.

| Platform | GitHub | Greasy Fork | Version | Last Updated | Changelog |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ChatGPT** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/UX-Customizer/ChatGPT-UX-Customizer.user.js) | [![Greasy Fork](https://img.shields.io/badge/Install-green?style=flat-square&logo=greasyfork)](https://greasyfork.org/en/scripts/543703-chatgpt-ux-customizer) | 1.5.5 | 2025/09/26 | [View](./docs/UX-Customizer/CHANGELOG_AIUXC.md) |
| **Gemini** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/UX-Customizer/Gemini-UX-Customizer.user.js) | [![Greasy Fork](https://img.shields.io/badge/Install-green?style=flat-square&logo=greasyfork)](https://greasyfork.org/en/scripts/543704-gemini-ux-customizer) | 1.5.5 | 2025/09/26 | [View](./docs/UX-Customizer/CHANGELOG_AIUXC.md) |

**[View Detailed Features & Manual for UX Customizer](./docs/UX-Customizer/README.md)**

![UX Customizer Showcase Image](./docs/UX-Customizer/images/ux-customizer_showcase.webp)
![Advanced Navigation](./docs/UX-Customizer/images/navigation.webp)

---

### 2. Quick Text Buttons

A utility script that adds buttons to quickly insert predefined text or prompts. You can manage frequently used phrases by category and profile.

| Platform | GitHub | Greasy Fork | Version | Last Updated | Changelog |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ChatGPT** & **Gemini** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/Quick-Text-Buttons/Quick-Text-Buttons.user.js) | [![Greasy Fork](https://img.shields.io/badge/Install-green?style=flat-square&logo=greasyfork)](https://greasyfork.org/en/scripts/544699-quick-text-buttons) | 1.2.0 | 2025/09/25 | [View](./docs/Quick-Text-Buttons/CHANGELOG_QTBUX.md) |

**[View Detailed Features & Manual for Quick Text Buttons](./docs/Quick-Text-Buttons/README.md)**

![Quick Text Buttons Showcase Image](./docs/Quick-Text-Buttons/images/qtb_showcase.webp) 

---

## Installation

1.  Please install [Tampermonkey](https://www.tampermonkey.net/) or any userscript management tool in your browser.
2.  Click the "Download" or "Install" link for the script you wish to use. The Greasy Fork version is recommended if you want automatic updates.

## Updating

1.  As a precaution, **export your settings**.
2.  Open the script to be updated in the Tampermonkey dashboard and **replace the entire content** with the latest version, then save. (The Greasy Fork version updates automatically).

## License

MIT License

## Author

* [p65536](https://github.com/p65536)