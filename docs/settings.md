# AI UX Customizer Settings Screen

## Settings Screen

### 1. Click the Settings button in the upper right corner to open the Settings Panel

![Settings button](./images/aiux_settings_button.webp)

### 2. Settings Panel Items

![Settings Panel](./images/aiux_settings_panel.webp)

| Item | Description |
| :--- | :--- |
| **Applied Theme** | The name of the theme currently applied to the chat. Click to edit this theme directly. |
| **Themes** | Opens the **Theme Editor** to create, edit, and delete themes. |
| **JSON** | Opens the screen to directly edit, import, and export all settings in JSON format. |
| **Icon size** | Changes the size of the user and assistant avatar icons displayed on the left and right sides of the screen. |
| **Chat content max width** | Adjusts the maximum display width for the entire conversation. Setting it to the far left will use the platform's default width. |
| **Prevent image/avatar overlap** | When ON, the display area will automatically adjust so that standing images do not overlap avatar icons. |
| **Collapsible button** | Adds a button to each message to collapse long messages. |
| **Scroll to top button** | Adds a button to each message to scroll to the top of that message. |
| **Sequential nav buttons** | Adds buttons to each message to jump to the next/previous message by the same speaker (user/assistant). |
| **Navigation console** | Displays an operation panel above the text input field for quick navigation between messages. |

### 3. Theme Settings Screen Items

![Theme Editor](./images/aiux_theme_settings.webp)

| Item | Description |
| :--- | :--- |
| **Theme Management** | |
| `Theme` (dropdown) | Select the theme you want to edit. `Default Settings` is the base setting for all themes. |
| `▲` / `▼` | Moves the theme's priority. Patterns of themes higher in the list are evaluated first. |
| `New` / `Copy` / `Delete` | Respectively, "Create new," "Duplicate," and "Delete" a theme. |
| **General Settings** | |
| `Name` | The name of this theme displayed in the theme list. |
| `Patterns` | The theme is automatically applied if the chat title matches this regular expression pattern. |
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