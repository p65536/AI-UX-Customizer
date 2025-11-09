# AI UX Customizer Configuration Properties

## Overview

This document provides a table summarizing the purpose, example usage, allowed values, and notes for each property. 
Refer to this page if you get stuck during customization. 

**However, setting via the GUI is generally recommended. Please refer to this document for technical information.** 
**Please note that if you set unexpected values directly in JSON, the script will fall back to allowed values upon import.** 

[IMPORTANT] The property names used in this script's configuration are different from CSS property names. The corresponding CSS property names are listed in the remarks column, so please use the CSS property names when searching for specifications online. 

---

## JSON Structure

The following is a sample to illustrate the JSON structure. **Ready-to-use samples for copy-pasting or importing** are available in the [`samples`](../../samples/UX-Customizer) folder. 

```json
{
  "options": {
    "icon_size": 64,
    "chat_content_max_width": null,
    "respect_avatar_space": true
  },
  "features": {
    "collapsible_button": {
      "enabled": true
    },
    "sequential_nav_buttons": {
      "enabled": true
    },
    "scroll_to_top_button": {
      "enabled": true
    },
    "fixed_nav_console": {
      "enabled": true
    },
    "load_full_history_on_chat_load": {
      "enabled": true
    }
},
  "themeSets": [
    {
      "metadata": {
        "id": "gptux-theme-example-1",
        "name": "My Project Theme 1",
        "matchPatterns": [
          "/\\[theme1\\]/i",
          "/My Project/i"
        ]
      },
      "user": {
        "name": "You",
        "icon": "url, SVG, base64, ...",
        "standingImageUrl": "",
        "textColor": "#89c4f4",
        "font": "Meiryo, sans-serif",
        "bubbleBackgroundColor": "#232e3b",
        "bubblePadding": "10px 14px",
        "bubbleBorderRadius": "16px",
        "bubbleMaxWidth": "70%"
      },
      "assistant": {
        "name": "Assistant",
        "icon": "url, SVG, base64, ...",
        "standingImageUrl": "",
        "textColor": "#ffe4e1",
        "font": "Meiryo, sans-serif",
        "bubbleBackgroundColor": "#384251",
        "bubblePadding": "10px 14px",
        "bubbleBorderRadius": "16px",
        "bubbleMaxWidth": "90%"
      },
      "window": {
        "backgroundColor": "#151b22",
        "backgroundImageUrl": "url here",
        "backgroundSize": "cover",
        "backgroundPosition": "center center",
        "backgroundRepeat": "no-repeat"
      },
      "inputArea": {
        "backgroundColor": "#202531",
        "textColor": "#e3e3e3"
      }
    },
    {
      "metadata": {
        "id": "gptux-theme-example-2",
        "name": "(Theme name here)",
        "matchPatterns": [
          "(Regular expression here)"
        ]
      },
      "..." : "(You can add as many theme settings as you like)"
    }
  ],
  "defaultSet": {
    "user": {
      "name": "You",
      "icon": "",
      "standingImageUrl": null,
      "textColor": null,
      "font": null,
      "bubbleBackgroundColor": null,
      "bubblePadding": null,
      "bubbleBorderRadius": null,
      "bubbleMaxWidth": null
    },
    "assistant": {
      "name": "AI Service",
      "icon": "",
      "standingImageUrl": null,
      "textColor": null,
      "font": null,
      "bubbleBackgroundColor": null,
      "bubblePadding": null,
      "bubbleBorderRadius": null,
      "bubbleMaxWidth": null
    },
    "window": {
      "backgroundColor": null,
      "backgroundImageUrl": null,
      "backgroundSize": "cover",
      "backgroundPosition": "center center",
      "backgroundRepeat": "no-repeat"
    },
    "inputArea": {
      "backgroundColor": null,
      "textColor": null
    }
  }
}
```

-----

## Overall Structure

| Item Name | Description/Example |
| --- | --- |
| `options` | Common settings for script behavior and display.  |
| `features` | Settings to enable/disable UI improvement features.  |
| `themeSets` | An array of theme settings. You can create multiple themes.  |
| `defaultSet` | The default theme settings. Applied when no theme in `themeSets` matches.  |

-----

## `"options"` Settings

| Property Name | Description | Example | Notes/Allowed Values |
| --- | --- | --- | --- |
| `icon_size` | Icon size | `64` | Number. Default is `64`.<br>Values `64`, `96`, `128`, `160`, `192` are specified as allowed values for balanced display.  |
| `chat_content_max_width` | Max width of the chat content area. | `'70vw'` | A valid CSS `max-width` value as a string. However, this script is limited to `vw` units.<br>Blank or `null` for the AI service's default.  |
| `respect_avatar_space` | Whether to consider avatar icon space when displaying standing images.  | `true` | `true`: Standing images are adjusted so they don't overlap avatar icons.<br>`false`: Standing images may overlap avatar icons. Set to `false` if you want to maximize standing image display size.<br>Default is `true`.  |

-----

## `"features"` Settings

Configure ON/OFF and thresholds for convenient UI improvement features. 

| Property Name | Description | Example | Notes/Allowed Values |
| --- | --- | --- | --- |
| `collapsible_button` | Displays a button to collapse messages at the top of each message bubble.  | `{ "enabled": true }` | `true`/`false`<br>Displays on the top-left for assistant and top-right for user.<br>Note: For Gemini, user bubbles have a standard collapse button, so this script does not process user bubbles for Gemini.<br>When this feature is enabled, a button to toggle the collapse state of all messages is displayed to the right of the message input field.  |
| `sequential_nav_buttons` | Displays buttons next to each message bubble to jump to the next/previous message from the same author (user or assistant).  | `{ "enabled": true }` | `true`/`false`<br>Displays on the top-left for assistant and top-right for user.  |
| `scroll_to_top_button` | Displays a button to scroll to the top of a message (or turn) at the bottom of each message bubble.  | `{ "enabled": true }` | `true`/`false`<br>Displays on the bottom-left for assistant and bottom-right for user.  |
| `fixed_nav_console` | Displays an integrated navigation console at the top of the message input field.  | `{ "enabled": true }` | `true`/`false`<br>Displays a console bar consolidating navigation-related features for efficient message movement.  |
| `load_full_history_on_chat_load` | `GPTUX` (Firefox only)<br>Enables "layout scan and rescan DOM" on chat load.<br>`GGGUX`<br>Enables auto-load full chat history on chat load.  | `{ "enabled": true }` | `true`/`false`<br>`GPTUX`<br>Automatically scans the chat layout when opening a chat (Firefox only. See notes below.).<br>`GGGUX`<br>Automatically loads the entire chat history when opening a chat.  |

##### Notes about `load_full_history_on_chat_load` (ChatGPT / Firefox-only Option):
When using Firefox, you may experience a "rubber-banding" or scroll-bouncing effect while scrolling. This is likely caused by layout shifts, where the height of off-screen elements (suspected to be the avatar icons) is calculated late, causing the entire page to reflow.  
Setting this option to `true` will automatically run a "layout scan" (which simulates scrolling through the entire chat) when a conversation is loaded. This process forces the browser to calculate and finalize the height of all elements, mitigating this scrolling issue.  
If this option is set to `false`, you can still run this function manually at any time by pressing the "Layout Scan" button on the far left of the navigation console.  


-----

## `"themeSets"` Settings

You can define multiple themes as an array of objects in `themeSets`. 

### `"metadata"` (Theme Information)

At the beginning of each theme object, describe the theme's information in `metadata`. 

| Property Name | Description | Example | Notes/Allowed Values |
| --- | --- | --- | --- |
| `id` | Unique ID for the theme | `"gptux-theme-12345"` | An ID for internal management by the script. You usually don't need to edit this. It is automatically assigned when a new theme is created in the theme editor. Even if duplicate IDs exist in the JSON, duplicates will be automatically avoided upon import.  |
| `name` | Theme name | `"My Project Theme"` | The name displayed in the theme editor's dropdown. Use a descriptive name.  |
| `matchPatterns` | Theme application conditions  | `[ "/myproject/i", "/^Project\\\\d+/" ]` | An **array of regular expression strings**. The theme is applied if the window title matches these conditions.<br>**Backslashes (\\) must be escaped twice (\\\\) in the JSON.**<br><br>**Examples:**<br>- Contains `"myproject"` (case-insensitive with `/i`)<br>- Starts with `"Project"` followed by a number  |

-----

### User/Assistant Settings (`"user"` / `"assistant"`)

| Property Name | Description | Example | Notes/Allowed Values |
| --- | --- | --- | --- |
| `name` | Display name | `"You"`, `"AI Service"` | String  |
| `icon` | Icon image | `"https://.../icon.png"`<br>`"<svg>..."` | URL, SVG code, Base64, etc.<br>When editing JSON directly, `"` in SVG code must be escaped as `\"`.  |
| `standingImageUrl` | Standing image URL | `"https://.../sample.png"` | Corresponding CSS property: `background-image` format.<br>Can be a single URL or combined with `linear-gradient`, etc.  |
| `textColor` | Text color | `"#89c4f4"` | CSS color code (\# notation/rgb()/name, etc.)<br>Corresponding CSS property: `color`  |
| `font` | Font for the bubble | `"Meiryo, sans-serif"` | CSS font declaration  |
| `bubbleBackgroundColor` | Bubble background color | `"#222833"` | Corresponding CSS property: `background-color`  |
| `bubblePadding` | Bubble inner padding | `"10px 14px"` | Corresponding CSS property: `padding`  |
| `bubbleBorderRadius` | Bubble corner radius | `"16px"` | Corresponding CSS property: `border-radius`  |
| `bubbleMaxWidth` | Bubble max width | `"70%"` | Corresponding CSS property: `max-width`  |

-----

### Background Settings (`"window"`)

| Property Name | Description | Example | Notes/Allowed Values |
| --- | --- | --- | --- |
| `backgroundColor` | Chat window background color | `"#11131c"` | Corresponding CSS property: `background-color`  |
| `backgroundImageUrl` | Chat window background image | `"https://.../bg.png"` | Corresponding CSS property: `background-image` format.<br>Can be a single URL or combined with `linear-gradient`, etc.  |
| `backgroundSize` | Background image size | `"cover"`, `"contain"` | Corresponding CSS property: `background-size`  |
| `backgroundPosition` | Background image position | `"center center"` | Corresponding CSS property: `background-position`  |
| `backgroundRepeat` | Background image repeat setting | `"no-repeat"`, `"repeat"` | Corresponding CSS property: `background-repeat`  |

-----

### Chat Input Area Settings (`"inputArea"`)

| Property Name | Description | Example | Notes/Allowed Values |
| --- | --- | --- | --- |
| `backgroundColor` | Input area background color | `"#21212a"` | Corresponding CSS property: `background-color`  |
| `textColor` | Input area text color | `"#e3e3e3"` | Corresponding CSS property: `color`  |

-----

## `"defaultSet"` Settings

Sets the default theme. This is applied if no theme in `"themeSets"` matches. 
The settings are the same as those for each theme in `"themeSets"`, excluding `"metadata"`. 

-----

## Tips

  * You can make the chat bubble background transparent by specifying an alpha value in `rgb(R G B / A)` for the background color. 
  * If you don't want to change the default theme from the AI service's standard, set all properties in `defaultSet` to `null`. 
  * While you can use `base64` encoding for local images for icons and backgrounds, it is recommended to use online resources to avoid bloating the settings JSON and potential performance degradation. 
