# Changelog

## [1.1.0] - 2025-08-31
- **Changed**
  - Default insertion position is now `cursor`.
- **Refactored**
  - Text Insertion logic corrected for reliable text pasting/insert.
  - Restored-text handling on ChatGPT supported (ProseMirror “revived” content edge case).
  - Empty-line detection hardened to avoid false positives/negatives in whitespace-heavy inputs.
  - Split PlatformAdapter responsibilities to clarify site-specific duties and reduce coupling.
  - Refactored watcher/observer structure to simplify startup and improve maintainability.
  - Text processing refactor & unification across ChatGPT and Gemini editors.
  - Debounce binding for instance methods using `.bind(this)`; ensures the correct `this` context.
  - Subscription lifecycle management improved to prevent leaks and dangling listeners.
  - Replaced the old app ID `cqtb` with APPID.

## [1.0.1] - 2025-08-15
- **Added**: Implemented dynamic UI adjustment to prevent interference when the Canvas feature is active.
  - **Buttons:** The script's buttons now automatically reposition to avoid overlapping with the Canvas (ChatGPT only).
- **Changed**: Updated script icon URL to link to an icon file in the repository instead of using base64 encoding.

## [1.0.0] - 2025-08-05
- First public release