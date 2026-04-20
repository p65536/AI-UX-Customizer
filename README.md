# AI UX Customizer (A Suite of UI Enhancement Scripts)

![license](https://img.shields.io/badge/license-MIT-green)
![userscript](https://img.shields.io/badge/userscript-Tampermonkey-blueviolet)
![topic](https://img.shields.io/badge/topic-customization-ff69b4)
![topic](https://img.shields.io/badge/topic-ui_enhancement-9cf)

![platform](https://img.shields.io/badge/platform-ChatGPT-lightgrey)
![platform](https://img.shields.io/badge/platform-Gemini-lightgrey)

## About This Project

**`AI UX Customizer`** is a project that provides a suite of userscripts to enhance the user experience of various AI chat services.
It integrates powerful theme and navigation features into a single codebase, allowing you to share settings across platforms.

> [!NOTE]
> **Project Status Update (2026-03-21)**
> * **AI UX Customizer (AIUXC)** is now the **Official Stable Release**.
> * The legacy standalone scripts (`ChatGPT-UX-Customizer` & `Gemini-UX-Customizer`) are now **Deprecated**.
> * Please migrate to AIUXC for future updates. [**Read the Migration Guide**](./docs/AI-UX-Customizer/MIGRATION.md)

> [!WARNING]
> **Known Issue: ChatGPT Navigation and Scrolling Issues**
> I have confirmed a critical issue currently affecting **ChatGPT**. Initially observed on Vivaldi (Chromium), it is now manifesting across multiple browsers.
> 
> **Observed Symptoms:**
> - The navigation console shows incorrect or fluctuating message counts depending on your scroll position.
> - Jump List and navigation buttons do not function as expected.
> - Erratic scrolling behavior (e.g., the page forcefully scrolls to the bottom when trying to scroll up).
> 
> **Suspected Cause:**
> This appears to be caused by a recent update to ChatGPT's web interface. It seems they have introduced virtual scrolling where off-screen messages are dynamically unmounted from the DOM. This breaks the script's current message caching mechanism, which expects all messages to remain in the DOM.
> 
> **Update (2026-04-21):**
> I have confirmed that **Firefox is now also affected** by this site update. The issue is no longer limited to Chromium-based browsers. I am continuing to investigate a fundamental fix for the caching system.

---

## Recent Updates

### 2026-04-21
- Update on Known Issue: Confirmed that Firefox is also affected by the ChatGPT navigation/scrolling bug.

### 2026-04-20
- Added a known issue notice regarding ChatGPT navigation and scrolling on Chromium-based browsers.

### 2026-04-17
- Updated `AI UX Customizer` (1.0.4 -> 1.0.5)

### 2026-04-16
- Updated `AI UX Customizer` (1.0.3 -> 1.0.4)

### 2026-04-15
- Updated `AI UX Customizer` (1.0.0 -> 1.0.3)

### 2026-03-21
- Updated `AI UX Customizer` (b565 -> 1.0.0 stable)

### 2026-03-20
- Updated `Quick Text Buttons` (3.1.2 -> 3.1.5)
- Updated `AI UX Customizer` (b559 -> b565)

---

## Scripts in This Project

### 1. AI UX Customizer (AIUXC)

A userscript that adds powerful **theming**, **UI customization**, and **advanced navigation** features to AI chat UIs.

> [!IMPORTANT]
> **Migration Notice for Old Script Users**  
> If you are currently using the standalone `ChatGPT UX Customizer (GPTUX)` or `Gemini UX Customizer (GGGUX)`, you must disable or delete them to prevent conflicts. Your current settings can be safely transferred to this new unified version.
> 
> **[Please read the Migration Guide before installing](./docs/AI-UX-Customizer/MIGRATION.md)**

| Platform | GitHub | Greasy Fork | Version | Last Updated | Changelog |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ChatGPT** & **Gemini** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/AI-UX-Customizer/AI-UX-Customizer.user.js) | [![Greasy Fork](https://img.shields.io/badge/Install-green?style=flat-square&logo=greasyfork)](https://greasyfork.org/en/scripts/570496-ai-ux-customizer) | 1.0.5 | 2026-04-17 | [View](./docs/AI-UX-Customizer/CHANGELOG_AIUXC.md) |

**[View Detailed Features & Manual for AI UX Customizer](./docs/AI-UX-Customizer/README.md)**

![AI UX Customizer Showcase Image](./docs/AI-UX-Customizer/images/ux-customizer_showcase.webp)
![Advanced Navigation](./docs/AI-UX-Customizer/images/navigation.webp)

**Note:** The pencil icon in the input area belongs to [**Quick Text Buttons (QTB)**](https://github.com/p65536/AI-UX-Customizer/blob/main/docs/Quick-Text-Buttons/README.md), a separate userscript. It allows you to insert predefined text or prompts with a single click. Using QTB alongside AIUXC provides a highly efficient chat experience.

---

### 2. Quick Text Buttons (QTB)

Adds customizable text buttons to paste frequently used prompts into ChatGPT/Gemini inputs. Efficiently manage your snippets and templates by category and profile.

| Platform | GitHub | Greasy Fork | Version | Last Updated | Changelog |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ChatGPT** & **Gemini** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/Quick-Text-Buttons/Quick-Text-Buttons.user.js) | [![Greasy Fork](https://img.shields.io/badge/Install-green?style=flat-square&logo=greasyfork)](https://greasyfork.org/en/scripts/544699-quick-text-buttons) | 3.1.5 | 2026-03-20 | [View](./docs/Quick-Text-Buttons/CHANGELOG_QTBUX.md) |

**[View Detailed Features & Manual for Quick Text Buttons](./docs/Quick-Text-Buttons/README.md)**

![Quick Text Buttons Showcase Image](./docs/Quick-Text-Buttons/images/qtb_open_textlist.webp) 

---

## Installation

1.  Please install [Tampermonkey](https://www.tampermonkey.net/) or any userscript management tool in your browser.
2.  Click the "Download" or "Install" link for the script you wish to use. The Greasy Fork version is recommended if you want automatic updates.

## Updating

1.  As a precaution, **export your settings**.
2.  Open the script to be updated in the Tampermonkey dashboard and **replace the entire content** with the latest version, then save. (The Greasy Fork version updates automatically).

## Tested Environment

- These scripts are designed for **desktop browsers** and does not support mobile environments.
- These scripts are primarily developed and tested on **Firefox** with **Tampermonkey**.
- It is also confirmed to work on Chromium-based browsers, but testing on these platforms is less extensive.

---

## License

MIT License

## Author

- [p65536](https://github.com/p65536)