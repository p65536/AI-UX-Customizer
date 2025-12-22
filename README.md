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

### 2025-12-22
- 📢 **Announcement:** Published the plan to unify `ChatGPT UX Customizer` and `Gemini UX Customizer` into a single script: **AI UX Customizer (AIUXC)**.

### 2025-12-18
- Updated `ChatGPT UX Customizer` (v2.3.4 -> v2.3.5)

### 2025-12-17
- Updated `ChatGPT UX Customizer` (v2.3.3 -> v2.3.4)
- Updated `ChatGPT UX Customizer` (v2.3.2 -> v2.3.3)
- Updated `ChatGPT UX Customizer` (v2.3.1 -> v2.3.2)

---

# [Date TBD] Plan to Unify ChatGPT & Gemini UX Customizers

> ⚠️ **Notice:** I am planning to merge GPTUX and GGGUX into a single new script, **"AI UX Customizer (AIUXC)"**.
>
> Once the unified version is released, updates for the standalone scripts will cease. I kindly ask all users to migrate to the new script at that time.

If you have any questions or concerns regarding this transition plan, please let me know in the comments/issues.

<details>
<summary><strong>Click to read details (Benefits, Compatibility, and Migration)</strong></summary>

### 🚀 Benefits of Unification
* **Shared Theme Settings:** Configure once, use everywhere! You can finally share theme configurations across platforms without repetitive export/import cycles.
* **Faster Updates:** Bug fixes and new features will be delivered to both platforms simultaneously via a single codebase.
* **Site-Specific Options:** While themes are shared, functional settings (e.g., Chat Content Max Width) remain independently configurable for each site.

### 🔄 Migration Compatibility
The new script is designed to be backward compatible:
* **Merge Support:** You can import configuration files from **both** GPTUX and GGGUX. The script allows you to merge them, preserving themes from both platforms (except default theme).
* **Theme Conversion:** Your current themes will be imported as distinct themes within the new system.
* *Note: General panel settings (sliders, toggles) will need to be re-configured manually.*

### 📝 Planned Migration Steps
Detailed instructions will be provided upon release. Due to structural changes in the settings file, please follow these steps:

1.  **Export** your current settings from GPTUX and GGGUX.
2.  **Disable** the old scripts.
3.  **Install** the new **AI UX Customizer**.
4.  **Migrate Themes (Use "Merge"):**
    * Open the JSON settings modal in the new script.
    * **Hold the `Ctrl` key** to change the "Import" button to **"Merge"**.
    * Click **"Merge"** and select your exported JSON file from GPTUX.
    * **Repeat this process** for your GGGUX file to combine themes from both platforms.
5.  **Reconfigure Defaults:**
    * The Default Theme (`defaultSet`) is now saved separately for each platform. Please re-configure your default styles (e.g., chat width, base colors) manually in the settings panel.
    * *(Advanced Users Only)* You can manually copy the values from your old `defaultSet` and paste them into the corresponding platform's `defaultSet` section using a text editor.

</details>

---

## Scripts in This Project

### 1. ChatGPT UX Customizer / Gemini UX Customizer

A script that adds powerful theme and navigation features. For each chat, you can flexibly customize speaker names, icons, text colors, bubble styles, backgrounds, and standing images.

Click the gear icon ⚙️ in the input area to open the settings panel.

| Platform | GitHub | Greasy Fork | Version | Last Updated | Changelog |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ChatGPT** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/UX-Customizer/ChatGPT-UX-Customizer.user.js) | [![Greasy Fork](https://img.shields.io/badge/Install-green?style=flat-square&logo=greasyfork)](https://greasyfork.org/en/scripts/543703-chatgpt-ux-customizer) | 2.3.5 | 2025-12-18 | [View](./docs/UX-Customizer/CHANGELOG_AIUXC.md) |
| **Gemini** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/UX-Customizer/Gemini-UX-Customizer.user.js) | [![Greasy Fork](https://img.shields.io/badge/Install-green?style=flat-square&logo=greasyfork)](https://greasyfork.org/en/scripts/543704-gemini-ux-customizer) | 2.3.1 | 2025-12-16 | [View](./docs/UX-Customizer/CHANGELOG_AIUXC.md) |

**[View Detailed Features & Manual for UX Customizer](./docs/UX-Customizer/README.md)**

![UX Customizer Showcase Image](./docs/UX-Customizer/images/ux-customizer_showcase.webp)
![Advanced Navigation](./docs/UX-Customizer/images/navigation.webp)

**Note:** The pencil icon in the input area belongs to [**Quick Text Buttons (QTB)**](https://github.com/p65536/AI-UX-Customizer/blob/main/docs/Quick-Text-Buttons/README.md), a separate userscript. It allows you to insert predefined text or prompts with a single click. Using QTB alongside UX Customizer provides a highly efficient chat experience.

---

### 2. Quick Text Buttons

A utility script that adds buttons to quickly insert predefined text or prompts. You can manage frequently used phrases by category and profile.

| Platform | GitHub | Greasy Fork | Version | Last Updated | Changelog |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ChatGPT** & **Gemini** | [![Download](https://img.shields.io/badge/Download-blue?style=flat-square&logo=download)](https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/Quick-Text-Buttons/Quick-Text-Buttons.user.js) | [![Greasy Fork](https://img.shields.io/badge/Install-green?style=flat-square&logo=greasyfork)](https://greasyfork.org/en/scripts/544699-quick-text-buttons) | 2.2.0 | 2025-12-03 | [View](./docs/Quick-Text-Buttons/CHANGELOG_QTBUX.md) |

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