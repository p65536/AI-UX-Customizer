# Gemini Default Model Setter (GDMS)

**For downloads and changelogs, please see the [main README](../../README.md)**

---

## Overview

`Gemini Default Model Setter` is a helper userscript designed to streamline the workflow for Google Gemini power users.  
It automatically forces Gemini to use your preferred specific model (e.g., "Pro" or "Advanced") upon page load, URL change, or when you return to the tab.

Stop manually selecting your preferred model every time you start a new conversation. This script is built on the philosophy of **"Setting the initial state while preserving manual control"**—ensuring you always start heavy tasks with your target model, but allowing you to seamlessly switch to a different model (like "Flash" for quicker tasks) during the chat without interference.

**Supported Services:**
 - **Google Gemini**

---

## Key Features

- **Automatic Selection**: Instantly selects your specified target model when starting a new chat or opening an existing history thread.
- **Regex Targeting**: Easily configure your target model using case-insensitive Regular Expressions (e.g., `Pro`, `Flash`, `Advanced`) via an intuitive settings modal.
- **Multilingual Support**: Since the model names are captured via user-defined Regular Expressions, the script is inherently compatible with all Gemini interface languages (English, Japanese, etc.) without any extra setup.
- **Preserves Manual Control**: Sets the *initial* state but allows you to seamlessly switch models manually if you need a different engine mid-task.
- **Auto-Check on Re-focus**: An optional fail-safe feature that re-verifies and sets the model when returning to the Gemini tab (useful for background loads or idle sessions).
- **Extension Menu Integration**: Toggle the script's active state, change the target pattern, and manage visibility settings directly from your userscript manager's menu (Tampermonkey / Violentmonkey).

---

## Screenshots

### 1. Extension Menu Integration
Manage all settings directly from your userscript manager's popup menu.

![Extension Menu](./images/menu.png)

### 2. Settings Modal
Use Regular Expressions to precisely target your desired model name.

![Settings Modal](./images/settings.png)

**Note:** Works seamlessly with **[AI UX Customizer](../AI-UX-Customizer/README.md)** to enhance the overall visual interface and navigation of your AI chats.

---

## How to Use

- **Initial Setup**: Click your userscript manager extension icon (e.g., Tampermonkey) while on the Gemini page. Click **"⚙️ Set Target Model Name"** to open the settings modal and input your desired model pattern.
- **Enable/Disable**: You can easily suspend the script by clicking the **"🟢 Enabled / 🔴 Disabled"** toggle in the extension menu.
- **Past Chat History**: When you click a past chat thread from the sidebar, the script will automatically switch it to your target model, allowing you to seamlessly continue past brainstorming with your highest-tier model.

### Understanding "Auto-Check on Re-focus"

By default, this feature is **OFF**. 
When turned **ON**, the script checks the model every time you switch back to the Gemini tab. 
- **Pros:** Great for idle tabs or when Gemini loads in the background, ensuring it always defaults to your target model.
- **Cons:** If you manually switched to "Flash" mid-conversation and then switched browser tabs (e.g., to copy a link), returning to Gemini will automatically reset the model back to "Pro". 
- **Recommendation:** Keep this OFF if you frequently use manual switching alongside heavy tab-switching.

---

## Configuration Examples (Regex)

The script uses Regular Expressions (Regex) to find the model name in the Gemini menu. It is case-insensitive. Just enter the pattern itself (do not enclose in `/ /`).

- `Pro` : Matches any model containing "Pro" (e.g., "Gemini Pro", "Gemini 1.5 Pro").
- `Advanced` : Matches any model containing "Advanced".
- `^Gemini Advanced$` : Matches exactly "Gemini Advanced" and nothing else.
- `Flash` : Automatically selects the Flash model.

---

## Recommended Usage

- **Start Strong, Finish Fast**:  
Configure the script to target `Pro`. When you open a new chat, you are ready for complex reasoning. If you later decide you just need a quick image generated or a simple translation, manually switch to `Flash`. The script will respect your manual choice until you start a new chat.
- **Resume Past Contexts**:  
Even if you started a quick chat in "Flash" yesterday, clicking that history today will automatically upgrade the session to "Pro", allowing you to dive deeper into that previous topic with a more capable model.

---

## Notes & Limitations

- **Site Updates:**
  - This script interacts with the website's UI elements (buttons and menus). If Gemini releases a major UI update or changes the internal class names/structure, the script **may temporarily break** and require an update to function correctly.
- **Browser Support:**
  - The script is primarily developed and tested on **Firefox** with **Tampermonkey**.
  - It is also confirmed to work on Chromium-based browsers, but testing on these platforms is less extensive.
- **Versioning:**
  - This repository only provides the latest version of the script. Past versions are not tracked via GitHub Releases or tags; please refer to the Git commit history if needed.

---

## Tested Environment

- This script is designed for **desktop browsers** and does not support mobile environments.
- This script is primarily developed and tested on **Firefox** with **Tampermonkey**.
- It is also confirmed to work on Chromium-based browsers, but testing on these platforms is less extensive.

-----

## License

MIT License

-----

## Author

- [p65536](https://github.com/p65536)
