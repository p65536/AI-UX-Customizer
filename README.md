# AI UX Customizer (A Suite of UI Enhancement Scripts)

![license](https://img.shields.io/badge/license-MIT-green)
![userscript](https://img.shields.io/badge/userscript-Tampermonkey-blueviolet)
![topic](https://img.shields.io/badge/topic-customization-ff69b4)
![topic](https://img.shields.io/badge/topic-ui_enhancement-9cf)

![platform](https://img.shields.io/badge/platform-ChatGPT-lightgrey)
![platform](https://img.shields.io/badge/platform-Gemini-lightgrey)

英語を読みたくない日本人へ：  
必要なら翻訳サイトを使ってください。日本語のページを更新するのが面倒になったので英語だけにします。済まぬ。

## About This Project

**`AI UX Customizer`** is a project that provides a suite of userscripts to enhance the user experience of various AI chat services.  
Each script is developed independently and can be installed separately.

---

## Recent Updates

### 2025/12/16
- Updated `ChatGPT UX Customizer`/`Gemini UX Customizer` (v2.3.0 -> v2.3.1)

### 2025/12/11
- Updated `ChatGPT UX Customizer`/`Gemini UX Customizer` (v2.2.2 -> v2.3.0)

### 2025/12/07
- Updated `ChatGPT UX Customizer`/`Gemini UX Customizer` (v2.2.1 -> v2.2.2)

### 2025/12/06
- Updated `ChatGPT UX Customizer`/`Gemini UX Customizer` (v2.2.0 -> v2.2.1)

### 2025/12/05
- Updated `ChatGPT UX Customizer`/`Gemini UX Customizer` (v2.1.0 -> v2.2.0)

---

## Scripts in This Project

### 1. ChatGPT UX Customizer / Gemini UX Customizer

A script that adds powerful theme and navigation features. For each chat, you can flexibly customize speaker names, icons, text colors, bubble styles, backgrounds, and standing images.

Click the gear icon ⚙️ in the input area to open the settings panel.

| Platform | GitHub | Greasy Fork | Version | Last Updated | Changelog |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ChatGPT** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/UX-Customizer/ChatGPT-UX-Customizer.user.js) | [![Greasy Fork](https://img.shields.io/badge/Install-green?style=flat-square&logo=greasyfork)](https://greasyfork.org/en/scripts/543703-chatgpt-ux-customizer) | 2.3.1 | 2025/12/16 | [View](./docs/UX-Customizer/CHANGELOG_AIUXC.md) |
| **Gemini** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/UX-Customizer/Gemini-UX-Customizer.user.js) | [![Greasy Fork](https://img.shields.io/badge/Install-green?style=flat-square&logo=greasyfork)](https://greasyfork.org/en/scripts/543704-gemini-ux-customizer) | 2.3.1 | 2025/12/16 | [View](./docs/UX-Customizer/CHANGELOG_AIUXC.md) |

**[View Detailed Features & Manual for UX Customizer](./docs/UX-Customizer/README.md)**

![UX Customizer Showcase Image](./docs/UX-Customizer/images/ux-customizer_showcase.webp)
![Advanced Navigation](./docs/UX-Customizer/images/navigation.webp)

**Note:** The pencil icon in the input area belongs to [**Quick Text Buttons (QTB)**](https://github.com/p65536/AI-UX-Customizer/blob/main/docs/Quick-Text-Buttons/README.md), a separate userscript. It allows you to insert predefined text or prompts with a single click. Using QTB alongside UX Customizer provides a highly efficient chat experience.

---

### 2. Quick Text Buttons

A utility script that adds buttons to quickly insert predefined text or prompts. You can manage frequently used phrases by category and profile.

| Platform | GitHub | Greasy Fork | Version | Last Updated | Changelog |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ChatGPT** & **Gemini** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/Quick-Text-Buttons/Quick-Text-Buttons.user.js) | [![Greasy Fork](https://img.shields.io/badge/Install-green?style=flat-square&logo=greasyfork)](https://greasyfork.org/en/scripts/544699-quick-text-buttons) | 2.2.0 | 2025/12/03 | [View](./docs/Quick-Text-Buttons/CHANGELOG_QTBUX.md) |

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