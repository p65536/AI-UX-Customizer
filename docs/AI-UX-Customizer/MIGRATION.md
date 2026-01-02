# Migration Guide: Moving to AI-UX-Customizer (AIUXC)

This guide explains how to migrate your existing settings from **`ChatGPT-UX-Customizer` (GPTUX)** and **`Gemini-UX-Customizer` (GGGUX)** to the new unified script, **`AI-UX-Customizer` (AIUXC)**.

---

## ⚠️ Important Notice

- **Maintenance Policy:** Updates for **GPTUX** and **GGGUX** will cease **after the official release of AIUXC**. Until then, they are supported as stable versions. Future new features will only be developed for AIUXC.
- **Combining Settings:** While standard "Import" works for a single file, it overwrites existing data. To migrate settings from **both** GPTUX and GGGUX, you must use the **"Append"** feature to merge them safely without overwriting each other.

---

## Migration Steps

### Step 1: Export Your Current Settings
Before installing the new script, you must save your existing themes.

1.  Open ChatGPT (for GPTUX) or Gemini (for GGGUX).
2.  Open the settings panel (Gear icon ⚙️).
3.  Click the **"JSON..."** button.
4.  Click **"Export"** to download your configuration file (`.json`).
5.  *If you use both scripts, repeat this for both platforms and save both files.*

### Step 2: Disable Old Scripts
To prevent conflicts, disable the old scripts in your userscript manager.

1.  Open your userscript manager dashboard (e.g., Tampermonkey).
2.  Find **`ChatGPT-UX-Customizer`** and **`Gemini-UX-Customizer`**.
3.  **Disable** (toggle off) or **Remove** them.

### Step 3: Install AI-UX-Customizer
Install the new unified script.

- [Install from GitHub](../../README.md)

### Step 4: Migrate Themes (Use "Append" Mode)
This is the most critical step. You will add your old themes into the new script without breaking the new configuration structure.

1.  Open ChatGPT or Gemini with **AI-UX-Customizer** enabled.
2.  Click the gear icon ⚙️ to open the settings panel.
3.  Click the **"JSON..."** button to open the editor.
4.  **Hover over the "Import" button** and hold down the **`Ctrl` key**.
    * Notice that the button changes to an **"Append"** button.
5.  Click the **"Append"** button while holding `Ctrl`.
6.  Select the JSON file you exported in Step 1.
    * *The script will automatically convert and append your custom themes to the new system.*
7.  **(If you have files from both platforms)** Repeat substeps 4–6 for your second JSON file.

> **Note:** The "Append" function safely adds your custom themes (`themeSets`) as new entries but **excludes** the global default settings (`defaultSet`) to prevent conflicts with the new platform-specific defaults.

### Step 5: Reconfigure Default Settings
Since default settings (e.g., Base Chat Width, Default Icon Size) are now managed separately for each platform (ChatGPT/Gemini), they are not migrated automatically.

1.  Open the **Settings Panel**.
2.  Manually adjust the global options (e.g., `Chat content max width`, `Icon size`) to your liking for the current platform.
3.  Repeat for the other platform if necessary.

---

## Advanced: Manually Migrating Default Settings (Optional)

If you have a complex default configuration that you want to port over, you can do so by editing the JSON file.
**This method is recommended only if you are comfortable editing JSON files.**

1.  **Complete the "Append" steps** above to migrate your custom themes.
2.  **Export** your current settings from the new **AI-UX-Customizer**.
3.  Open the file exported in step 2 (New Config) and your old GPTUX/GGGUX file (Old Config) in a text editor.
4.  **Copy** the `defaultSet` object from the **Old Config**.
5.  **Paste** it into the corresponding platform section of the **New Config** (e.g., `platforms` -> `ChatGPT` -> `defaultSet`).
    * *This ensures you are pasting into the correct structure.*
6.  Save the edited New Config file.
7.  In AIUXC, click **"Import"** (Standard mode, not Append) and select your edited file to apply the changes.

---

[Back to Main README](../../README.md)