# Quick-Text-Buttons

**For downloads and changelogs, please see the [main README](../../README.md)**

---

## Overview

`Quick-Text-Buttons` is a **Prompt Manager** script that adds customizable text buttons to paste frequently used prompts into ChatGPT and Gemini inputs.
You can efficiently manage and utilize your snippets and templates by organizing them into "Profiles" and "Categories."

Currently, it supports the following AI services:

 - **ChatGPT**
 - **Gemini**

---

## Key Features

* **Seamless Input Integration**: A non-intrusive button placed directly inside the chat input area.
* **Prompt Management**: Manage prompts and snippets by classifying them into "profiles" and "categories".
* **Enhanced Text Editor**: Supports Drag & Drop reordering for easy organization.
* **Keyboard Shortcuts**: Full keyboard navigation support (Alt+Q to toggle).
* **Sync**: Real-time settings synchronization across multiple tabs.
* **Profiles**: Switch between profiles (sets of categories) to use text sets tailored for different purposes (e.g., Coding, Writing).
* **Flexible Insertion**: Specify the insertion position of the text (cursor position / start / end).
* **Smart Handling**: Option to automatically insert a newline before or after the text.
* **Import/Export**: Settings export/import functionality (in JSON format).
* **Includes sample settings, making it easy to get started.**

---

## Screenshots

### 1. Text List

When you **Hover** (or **Click**, depending on settings) over the button:  
![Text Insertion Menu](./images/qtb_open_textlist.webp)

* **Perfect Match:** Works seamlessly with [**AI UX Customizer**](../AI-UX-Customizer/README.md) to enhance the visual interface and navigation.

### 2. Settings Panel

When you Right-click the button:  
![Settings Panel](./images/qtb_open_settings_panel.webp)

### 3. Text Editor Modal

![Text Editor Modal](./images/qtb_text_editor.webp)

### 4. Keyboard Shortcuts

![Keyboard Shortcuts](./images/qtb_shortcuts.webp)

---

## How to Use

### 1. Access & Navigation
The **Quick Text button** (pen icon) is located at the bottom-left of the chat input field.  
**Hover** (or **Click**, depending on settings) over the button to open the list.

![Text List Navigation](./images/qtb_textlist.webp)

* **Text**: Click an item to insert it directly into the input field.
* **Category**: Switch tabs to view different groups of texts.
* **Profile**: Switch profiles to load a completely different set of texts.

**Keyboard Shortcuts:**
* **Alt + Q**: Quickly toggle the text list.
* **Arrow keys**: Navigate through the list.
* **Enter/Space/Tab**: Insert the selected text.
* **Ctrl + Arrow keys**: Switch profiles.

### 2. Settings & Customization
* **Settings**: **Right-click** the button to open the **Settings Panel**, where you can edit texts, manage profiles, and change options.
* **Import/Export**: If needed, use the "JSON" button in the settings panel to export your current settings or import sample settings.

---

## Sample Settings

The easiest way to get started is to download a sample file from the [samples folder](../../samples/Quick-Text-Buttons) and modify its contents to your liking.  
Please import the sample JSON via the script's settings screen (JSON modal).

---

## Settings Details

- [Settings Screen](./settings.md)
- [Configuration Properties](./manual_json.md)

---

## License

MIT License

-----

## Author

  * [p65536](https://github.com/p65536)