# AI UX Customizer (A Suite of UI Enhancement Scripts)

![license](https://img.shields.io/badge/license-MIT-green)
![userscript](https://img.shields.io/badge/userscript-Tampermonkey-blueviolet)
![topic](https://img.shields.io/badge/topic-customization-ff69b4)
![topic](https://img.shields.io/badge/topic-ui_enhancement-9cf)

![platform](https://img.shields.io/badge/platform-ChatGPT-lightgrey)
![platform](https://img.shields.io/badge/platform-Gemini-lightgrey)

## About This Project

**`AI UX Customizer`** is a project that provides a suite of userscripts to enhance the user experience of various AI chat services.  
Each script is developed independently and can be installed separately.

---

## Recent Updates

### 2026-02-12
- Updated `AI UX Customizer` (b480 -> b483)

### 2026-02-11
- Updated `AI UX Customizer` (b477 -> b480)
- Updated `Quick Text Buttons` (3.1.0 -> 3.1.1)
- Updated `ChatGPT UX Customizer` (2.3.5 -> 2.4.1)
- Updated `Gemini UX Customizer` (2.4.0 -> 2.4.1)

### 2026-02-10
- Updated `Quick Text Buttons` (3.0.0 -> 3.1.0)

### 2026-02-08
- Updated `AI UX Customizer` (b475 -> b477)

### 2026-02-07
- Updated `AI UX Customizer` (b470 -> b475)

### 2026-02-06
- Updated `AI UX Customizer` (b468 -> b470)

### 2026-01-02
- 🧪 **Beta Release:** **AI UX Customizer (AIUXC)** has been released as a public beta!
  - This unified script combines ChatGPT and Gemini customization into one.
  - I actively invite you to try it out and share your feedback or bug reports on [GitHub Issues](https://github.com/p65536/AI-UX-Customizer/issues).
  - *Note: The existing standalone scripts (GPTUX/GGGUX) will remain supported until the official release of AIUXC.*

### 2025-12-22
- 📢 **Announcement:** Published the plan to unify `ChatGPT UX Customizer` and `Gemini UX Customizer` into a single script: **AI UX Customizer (AIUXC)**.

---

## Scripts in This Project

### 1. (Beta) AI UX Customizer

**The new unified script for both ChatGPT and Gemini.** It integrates powerful theme and navigation features into a single codebase, allowing you to share settings across platforms.

> **Status:** **Public Beta**  
> This script can be installed alongside the existing scripts.  
> 
> ⚠️ **Important:** To prevent conflicts, please **disable** `ChatGPT-UX-Customizer` and `Gemini-UX-Customizer` in your userscript manager (e.g., Tampermonkey) when using AIUXC.
> 
> **[How to Migrate from Old Scripts](./docs/AI-UX-Customizer/MIGRATION.md)**

| Platform | GitHub | Greasy Fork | Version | Last Updated | Changelog |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ChatGPT** & **Gemini** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/AI-UX-Customizer/AI-UX-Customizer.user.js) | (N/A in beta) | 1.0.0-b483 | 2026-02-12 | [View](./docs/AI-UX-Customizer/CHANGELOG_AIUXC.md) |

> **[IMPORTANT] Compatibility**: Due to updates in the DOM observation engine (Sentinel), if using this script with **Quick Text Buttons (QTB)**, strict version matching is required:
> -  AIUXC v1.0.0-b479+ with QTB v3.1.1+
> -  AIUXC v1.0.0-b478- with QTB v3.1.0-

**[View Detailed Features & Manual for AI UX Customizer](./docs/AI-UX-Customizer/README.md)**

---

### 2. ChatGPT UX Customizer / Gemini UX Customizer

The standalone versions for each platform. These are currently the recommended stable releases for general use.

> ⚠️ **End of Support Notice:**  
> Maintenance for these standalone versions will cease once **AI UX Customizer** is officially released.

A script that adds powerful theme and navigation features. For each chat, you can flexibly customize speaker names, icons, text colors, bubble styles, backgrounds, and standing images.

Click the gear icon ⚙️ in the input area to open the settings panel.

| Platform | GitHub | Greasy Fork | Version | Last Updated | Changelog |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ChatGPT** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/UX-Customizer/ChatGPT-UX-Customizer.user.js) | [![Greasy Fork](https://img.shields.io/badge/Install-green?style=flat-square&logo=greasyfork)](https://greasyfork.org/en/scripts/543703-chatgpt-ux-customizer) | 2.4.1 | 2026-02-11 | [View](./docs/UX-Customizer/CHANGELOG_AIUXC.md) |
| **Gemini** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/UX-Customizer/Gemini-UX-Customizer.user.js) | [![Greasy Fork](https://img.shields.io/badge/Install-green?style=flat-square&logo=greasyfork)](https://greasyfork.org/en/scripts/543704-gemini-ux-customizer) | 2.4.1 | 2026-02-11 | [View](./docs/UX-Customizer/CHANGELOG_AIUXC.md) |

> **[IMPORTANT] Compatibility**: Due to updates in the DOM observation engine (Sentinel), if using this script with **Quick Text Buttons (QTB)**, strict version matching is required:
> -  GPTUX/GGGUX v2.4.1+ with QTB v3.1.1+
> -  GPTUX/GGGUX v2.4.1- with QTB v3.1.0-

**[View Detailed Features & Manual for UX Customizer](./docs/UX-Customizer/README.md)**

![UX Customizer Showcase Image](./docs/UX-Customizer/images/ux-customizer_showcase.webp)
![Advanced Navigation](./docs/UX-Customizer/images/navigation.webp)

**Note:** The pencil icon in the input area belongs to [**Quick Text Buttons (QTB)**](https://github.com/p65536/AI-UX-Customizer/blob/main/docs/Quick-Text-Buttons/README.md), a separate userscript. It allows you to insert predefined text or prompts with a single click. Using QTB alongside UX Customizer provides a highly efficient chat experience.

---

### 3. Quick Text Buttons

Adds customizable text buttons to paste frequently used prompts into ChatGPT/Gemini inputs. Efficiently manage your snippets and templates by category and profile.

| Platform | GitHub | Greasy Fork | Version | Last Updated | Changelog |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ChatGPT** & **Gemini** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/Quick-Text-Buttons/Quick-Text-Buttons.user.js) | [![Greasy Fork](https://img.shields.io/badge/Install-green?style=flat-square&logo=greasyfork)](https://greasyfork.org/en/scripts/544699-quick-text-buttons) | 3.1.1 | 2026-02-11 | [View](./docs/Quick-Text-Buttons/CHANGELOG_QTBUX.md) |

> **[IMPORTANT] Compatibility**: Due to updates in the DOM observation engine (Sentinel), if using this script with **UX Customizer (AIUXC/GPTUX/GGGUX)**, strict version matching is required:
> -  QTB v3.1.1+ with AIUXC v1.0.0-b479+ / GPTUX v2.4.1+ / GGGUX v2.4.1+
> -  QTB v3.1.0- with AIUXC v1.0.0-b478- / GPTUX v2.4.0- / GGGUX v2.4.0-

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