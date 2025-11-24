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
    "activeProfileName": "Default"
  },
  "developer": {
    "logger_level": "log"
  },
  "texts": {
    "Default": {
      "Greetings": [
        "Sincerely,",
        "Best regards,"
      ],
      "Prompts": [
        "Please proofread the following text:\n\n"
      ]
    },
    "Work": {
      "Email Replies": [
        "Understood. Thank you for your assistance."
      ]
    }
  }
}
```

---

## Overall Structure

| Item Name | Description |
| :--- | :--- |
| `options` | Common settings for script behavior. |
| `developer` | **Debug and development settings.** |
| `texts` | An object that stores the text data to be inserted. It can hold multiple profiles. |

---

## `"options"` Settings

| Property Name | Description | Example | Notes/Allowed Values |
| :--- | :--- | :--- | :--- |
| `insert_before_newline` | Whether to add a newline before inserting text | `false` | `true` / `false` |
| `insert_after_newline` | Whether to add a newline after inserting text | `false` | `true` / `false` |
| `insertion_position` | The position where the text is inserted | `"cursor"` | `"start"`: Beginning of the input field\<br\>`"cursor"`: Current cursor position\<br\>`"end"`: End of the input field |
| `activeProfileName` | The name of the currently active profile | `"Default"` | A string specifying a profile name that exists within the `texts` object. |

---

## `"developer"` Settings

| Property Name | Description | Example | Notes/Allowed Values |
| :--- | :--- | :--- | :--- |
| `logger_level` | Controls the verbosity of browser console logs. | `"log"` | `"error"` / `"warn"` / `"info"` / `"log"` / `"debug"` |

-----

## `"texts"` Settings

The `texts` object has a nested structure for managing multiple "profiles".

```
"texts": {
  "Profile Name": {
    "Category Name": [
      "Text 1",
      "Text 2"
    ]
  }
}
```

### 1. Profile

| Level | Description |
| :--- | :--- |
| Key of `texts` object | Specifies the **Profile Name** as a string (e.g., `"Default"`, `"Work"`). A profile is a group that contains a set of categories. |
| Value of `texts` object | An object whose keys are **Category Names** and whose values are **text arrays**. |

### 2. Category

| Level | Description |
| :--- | :--- |
| Key of Profile object | Specifies the **Category Name** as a string (e.g., `"Greetings"`, `"Prompts"`). A category is a group for classifying texts. |
| Value of Profile object | An **array of predefined text strings** to be inserted. |

### 3. Text

| Level | Description |
| :--- | :--- |
| Value of Category object | An **array of strings** that will actually be inserted. UI buttons are generated in the order of this array. |

---

## Tips

  * If you want to include a newline within a text in the JSON, insert `\n` at the desired location.
  * You can easily switch the current set of texts by changing the `activeProfileName` in the `options`.
