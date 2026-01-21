# AI-UX-Customizer Settings Screen

## Settings Panel

The **Settings Panel** is the central hub for configuring global options and toggling features.  
Since **AI-UX-Customizer** is a unified script, this panel automatically adapts its layout and available options based on whether you are using **ChatGPT** or **Gemini**.

To customize visual themes (colors, backgrounds, standing images), use the **Theme Editor**, which is accessible via the "Edit Themes..." button within this panel.

### 1. Accessing the Settings

You can access the Settings Panel by clicking the **Settings button** (palette icon 🎨) located **inside the text input area**.

![Settings button](./images/settings_button.webp)

### 2. Settings Panel Items

| ChatGPT | Gemini |
| :--- | :--- |
| ChatGPT specific settings:<ul><li>Scan layout on chat load (Firefox only)</li><li>Show timestamp</li><li>Auto collapse user message</li></ul> | Gemini specific settings:<ul><li>Load full history on chat load</li></ul> |
| ![Settings Panel (ChatGPT)](./images/settings_panel_chatgpt.webp) | ![Settings Panel (Gemini)](./images/settings_panel_gemini.webp) |

| Item | Description |
| :--- | :--- |
| **Applied Theme** | The name of the theme currently applied to the chat. Click to edit this theme directly. |
| **Themes** | Opens the **Theme Editor** to create, edit, and delete themes. |
| **JSON** | Opens the screen to directly edit, import, and export all settings in JSON format. |
| **Icon size** | Changes the size of the user and assistant avatar icons displayed on the left and right sides of the screen. |
| **Chat content max width** | Adjusts the maximum display width for the entire conversation. Setting it to the far left will use the platform's default width. |
| **Prevent image/avatar overlap** | When ON, the display area will automatically adjust so that standing images do not overlap avatar icons. |
| **[ChatGPT only]**<br>**Scan layout on chat load** | **[ChatGPT only] (Firefox only)**<br>Automatically scans the chat layout when opening a chat.<br>When using Firefox, scrolling may feel rubbery due to delayed layout calculations. Enabling this option runs an automatic "layout scan" on chat load to pre-calculate element heights and reduce the issue.<br>It can also be triggered manually via the "Layout Scan" button (the left end button on navigation console). |
| **[Gemini only]**<br>**Load full history on chat load** | **[Gemini only]**<br>Automatically loads the entire chat history when opening a chat.<br>It can also be triggered manually via the "Load full chat history" button (the left end button on navigation console). |
| **[ChatGPT only]**<br>**Show timestamp** | **[ChatGPT only]**<br>Displays the creation time for each message.<br>(This feature is not available for Gemini as it is technically difficult to retrieve timestamps.) |
| **[ChatGPT only]**<br>**Auto collapse user message** | **[ChatGPT only]**<br>Automatically collapses user messages that exceed the height threshold upon loading.<br>Requires **Collapsible button** to be enabled. |
| **Collapsible button** | Adds a button to each message to collapse long messages. |
| **Sequential nav buttons** | Adds buttons to each message to jump to the next/previous message by the same speaker (user/assistant). |
| **Scroll to top button** | Adds a button to each message to scroll to the top of that message. |
| **Navigation console** | Displays an operation panel above the text input field for quick navigation between messages. |
| **Console Position** | Choose where to display the navigation console.<br>**Input Top**: Floating above the input area (Default).<br>**Header**: Embedded in the top toolbar. |

### 3. Theme Settings Screen Items

A GUI editor allows for intuitive customization of all visual elements, including colors, fonts, backgrounds, and standing images.

![Theme Editor](./images/theme_settings.webp)

| Item | Description |
| :--- | :--- |
| **Theme Management** | |
| `Theme` (dropdown) | Select the theme you want to edit. `Default Settings` is the base setting for all themes. |
| `Rename` | Changes the name of the selected theme. Clicking this enables inline editing. |
| `▲` / `▼` | Moves the theme's priority. Patterns of themes higher in the list are evaluated first. |
| `New` / `Copy` / `Delete` | Respectively, "Create new," "Duplicate," and "Delete" a theme. |
| **General Settings** | |
| `Title Patterns` | The theme is automatically applied if the chat **title** matches any of the regular expression patterns entered (one per line). |
| `URL Patterns` | The theme is automatically applied if the browser **URL** matches any of the regular expression patterns entered (one per line).<br>This takes priority over *Title Patterns* within the same theme.<br>See [Examples of URL Patterns](#examples-of-url-patterns) below. |
| **Assistant / User** | *(Assistant and User settings are common)* |
| `Name` | The speaker's name displayed on the chat screen. If left blank, the default name will be used. |
| `Icon` | Specifies the speaker's avatar icon using a URL, Data URI, or SVG string. |
| `Standing image` | Specifies the character's standing image displayed on the left and right sides of the screen, using a URL or Data URI. |
| `Bubble Settings` | **Message bubble style** |
| `Background color` | The background color of the bubble. |
| `Text color` | The text color inside the bubble. |
| `Font` | Specifies the font inside the bubble. |
| `Padding` | Adjusts the top/bottom and left/right inner padding of the bubble. |
| `Radius` | Adjusts the roundness of the bubble's corners. |
| `max Width` | Specifies the maximum width of the bubble as a percentage of the screen width. |
| **Background (Window Background)** | |
| `Background color` | The background color of the entire chat window. |
| `Background image` | The background image of the entire chat window. |
| `Size / Position / Repeat` | Sets the size, display position, and repeat option for the background image. |
| **Input area (Input Area)** | |
| `Background color` | The background color of the message input field. |
| `Text color` | The text color of the message input field. |
| **Footer Buttons** | |
| `Apply` / `Save` | Saves changes. `Apply` keeps the screen open, `Save` closes the screen. |

---

## Examples of URL Patterns

<ul>
  <li>
    <strong>Project (ChatGPT)</strong><br>
    URL: <code>https://chatgpt.com/g/g-p-<mark>abcdefghijklmnopqrstuvwxyz123456</mark>-something/project</code><br>
    Pattern: <code>/abcdefghijklmnopqrstuvwxyz123456/i</code><br>
    <small>Extract the 32-digit unique ID.</small>
  </li>
  <li>
    <strong>Custom GPT (ChatGPT)</strong><br>
    URL: <code>https://chatgpt.com/g/g-<mark>abcdefghijklmnopqrstuvwxyz123456</mark>-something</code><br>
    Pattern: <code>/abcdefghijklmnopqrstuvwxyz123456/i</code><br>
    <small>Extract the 32-digit unique ID.</small>
  </li>
  <li>
    <strong>Gem (Gemini)</strong><br>
    URL: <code>https://gemini.google.com/<mark>gem/abcdefghijkl</mark></code><br>
    Pattern: <code>/gem\/abcdefghijkl/i</code><br>
    <small>Include "gem/" and escape the forward slash (<code>\/</code>).</small>
  </li>
</ul>