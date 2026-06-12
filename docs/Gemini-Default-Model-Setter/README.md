# Gemini Default Model Setter (GDMS)

**For downloads and changelogs, please see the [main README](../../README.md)**

---

## Overview

`Gemini Default Model Setter` is a helper userscript designed to streamline the workflow for Google Gemini power users.  
It automatically forces Google Gemini to use your preferred specific model (e.g., "Flash" or "Pro") upon page load, URL change, or tab return.

Stop manually selecting your preferred model every time you start a new conversation. This script ensures you always start with your target model, while still preserving your freedom to manually switch to a different model (like "Flash" for quicker tasks) during the chat.

---

## Key Features

* **Automatic Selection**: Instantly selects your specified target model and its Thinking Level when starting a new chat or opening an existing history thread.
* **Regex Targeting**: Easily configure both your target model and its Thinking Level using case-insensitive Regular Expressions (e.g., `Pro` for model, `Extended` or `Deep Think` for thinking level) via an intuitive settings modal.
* **Multilingual Support**: Since the model names are captured via user-defined Regular Expressions, the script is inherently compatible with all Gemini interface languages without any extra setup.
* **Preserves Manual Control**: Sets the *initial* state but allows you to seamlessly switch models or thinking levels manually if you need a different setup mid-task.
* **Thinking Level Continuity**: When enabled, automatically re-applies your preferred Thinking Level even when you manually switch to a different model, saving you from repetitive adjustments.
* **Lightweight & Resource-Efficient**: Designed to minimize CPU and memory overhead. Instead of running heavy, continuous background loops, the script utilizes a transient DOM observer that activates only when necessary (such as initial load or SPA navigation) and immediately disconnects once the state is settled.
* **Auto-Check on Re-focus**: An optional fail-safe feature that re-verifies and sets your target configurations when returning to the Gemini tab (useful for background loads or idle sessions).

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

* **Initial Setup**: Click your userscript manager extension icon (e.g., Tampermonkey) while on the Gemini page. Click **"⚙️ Set Target Model Name"** or **"⚙️ Set Target Thinking Level"** to open the settings modal. Input your desired model pattern (e.g., `Pro`) and optionally configure the target thinking level (e.g., `Extended`). Leave the thinking level blank if you do not want the script to modify or interfere with the model's current thinking level setting.
* **Past Chat History**: When you click a past chat thread from the sidebar, the script will automatically switch it to your target model, allowing you to seamlessly continue past brainstorming with your highest-tier model.
* **About "Set Thinking Level on Model Switch"**:
  * **Default is OFF.**
  * When turned **ON**, if you manually switch to a different model via the Gemini UI, the script will automatically detect the change and attempt to apply your configured target Thinking Level to that new model as well.
* **About "Auto-Check on Re-focus"**:
  * **Default is OFF.**
  * When turned **ON**, the script checks the model and thinking level every time you switch back to the Gemini tab. This is great for idle tabs, but **note:** if you manually changed the model or customized the thinking level and then switched browser tabs, returning to Gemini will automatically reset them back to your target configurations. Keep this OFF if you frequently use manual switching alongside heavy tab-switching.

### Understanding "Set Thinking Level on Model Switch"

By default, this feature is **OFF**.  
When turned **ON**, the script detects when you manually switch to a different model and automatically updates its Thinking Level to match your preferred target setting.
- **Pros:** Eliminates the need to repeatedly click and adjust the Thinking Level every time you switch models mid-conversation.
- **Cons:** When you switch models, your target Thinking Level is initially auto-applied. Although you can still freely adjust the Thinking Level manually afterward, it requires an extra click if you prefer to use that model's default setting.
- **Recommendation:** Keep this ON if you have a strong preference for a specific Thinking Level across different models.

### Understanding "Auto-Check on Re-focus"

By default, this feature is **OFF**. 
When turned **ON**, the script checks the model every time you switch back to the Gemini tab. 
- **Pros:** Great for idle tabs or when Gemini loads in the background, ensuring it always defaults to your target model.
- **Cons:** If you manually switched to "Flash" mid-conversation and then switched browser tabs (e.g., to copy a link), returning to Gemini will automatically reset the model back to "Pro". 
- **Recommendation:** Keep this OFF if you frequently use manual switching alongside heavy tab-switching.

---

## Configuration Examples (Regex)

The script uses Regular Expressions (Regex) to find the model name or thinking level in the Gemini menus. It is case-insensitive. Just enter the pattern itself (do not enclose in `/ /`).

### Model Name Examples
* **Priority Behavior Note**: Gemini lists multiple Flash models (e.g., `3.1 Flash-Lite` and `3.5 Flash`). The script selects the first item that matches your pattern. Therefore, simply typing `Flash` will incorrectly target `3.1 Flash-Lite` because it appears first and contains the word "Flash".
* `Flash$` (Default): Uses the regex anchor (`$`) to ensure it matches exactly at the end of the name. This successfully targets `3.5 Flash` while safely bypassing `3.1 Flash-Lite`.
* `Pro`: Matches any model containing "Pro".
* `^3.1 Flash-Lite$`: Uses both start (`^`) and end (`$`) anchors to match exactly "3.1 Flash-Lite" and nothing else.

### Thinking Level Examples
* `Standard`: Matches any thinking level containing "Standard".
* `Extended`: Matches any thinking level containing "Extended".
* *(Blank)*: Leave the field completely empty if you want to use the site's default behavior without script interference.

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
