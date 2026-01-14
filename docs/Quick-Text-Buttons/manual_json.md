# Quick-Text-Buttons Configuration Properties

## Overview

This document provides a table summarizing the purpose, example usage, allowed values, and notes for each property.
Refer to this page if you get stuck during customization.

**However, using the GUI (Text Editor Modal) for configuration is generally recommended. Please use this document as a technical reference.** **Note that if you set unexpected values by directly editing the JSON, the script will fall back to allowed values upon import.**

---

## JSON Structure

The following is a sample to illustrate the JSON structure. **Ready-to-use samples for copy-pasting or importing** are available in the [`samples`](../../samples/Quick-Text-Buttons) folder.

```json
{
  "options": {
    "insert_before_newline": false,
    "insert_after_newline": false,
    "insertion_position": "end",
    "trigger_mode": "hover",
    "enable_shortcut": true,
    "activeProfileName": "Default"
  },
  "developer": {
    "logger_level": "log"
  },
  "texts": [
    {
      "name": "Default",
      "categories": [
        {
          "name": "Greetings",
          "items": [
            "Sincerely,",
            "Best regards,"
          ]
        },
        {
          "name": "Prompts",
          "items": [
            "Please proofread the following text:\n\n"
          ]
        }
      ]
    },
    {
      "name": "Work",
      "categories": [
        {
          "name": "Email Replies",
          "items": [
            "Understood. Thank you for your assistance."
          ]
        }
      ]
    }
  ]
}

```

---

## Overall Structure

| Item Name | Description |
| --- | --- |
| `options` | Common settings for script behavior. |
| `developer` | **Debug and development settings.** |
| `texts` | An **array** that stores the text data to be inserted. It holds multiple profile objects. |

---

## `"options"` Settings

| Property Name | Description | Example | Notes/Allowed Values |
| --- | --- | --- | --- |
| `insert_before_newline` | Whether to add a newline before inserting text | `false` | `true` / `false` |
| `insert_after_newline` | Whether to add a newline after inserting text | `false` | `true` / `false` |
| `insertion_position` | The position where the text is inserted | `"cursor"` | `"start"`: Beginning of the input field<br>`"cursor"`: Current cursor position<br>`"end"`: End of the input field |
| `trigger_mode` | Determines how the text list is opened | `"hover"` | `"hover"`: Mouse over<br>`"click"`: Click |
| `enable_shortcut` | Whether to enable the keyboard shortcut (Alt+Q) | `true` | `true` / `false` |
| `activeProfileName` | The name of the currently active profile | `"Default"` | A string matching the `name` of a profile in the `texts` array. |

---

## `"developer"` Settings

| Property Name | Description | Example | Notes/Allowed Values |
| --- | --- | --- | --- |
| `logger_level` | Controls the verbosity of browser console logs. | `"log"` | `"error"` / `"warn"` / `"info"` / `"log"` / `"debug"` |

---

## `"texts"` Settings

The `texts` property is an **array of objects**. Each object represents a "Profile".

```json
"texts": [
  {
    "name": "Profile Name",
    "categories": [
      {
        "name": "Category Name",
        "items": [
          "Text 1",
          "Text 2"
        ]
      }
    ]
  }
]

```

### 1. Profile Object

| Property | Description |
| --- | --- |
| `name` | The name of the profile (e.g., `"Default"`, `"Work"`). |
| `categories` | An **array of objects**, where each object represents a category. |

### 2. Category Object

| Property | Description |
| --- | --- |
| `name` | The name of the category (e.g., `"Greetings"`, `"Prompts"`). |
| `items` | An **array of strings** containing the predefined texts. |

### 3. Text Item

| Value | Description |
| --- | --- |
| (String) | The actual text to be inserted. Elements in the `items` array are generated as buttons in the specified order. |

---

## Tips

* If you want to include a newline within a text in the JSON, insert `\n` at the desired location.
* You can switch the current set of texts by changing the `activeProfileName` in the `options`.
