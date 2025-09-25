# Changelog

## [1.2.0] - 2025-09-25
- **Performance & Stability**
  - Reworked the internal event handling system to be more efficient. This reduces the script's resource usage and improves responsiveness.
  - The configuration management system has been hardened to better handle and sanitize data, improving overall script reliability.
- **Internal Refactoring**
  - Major internal components, such as the `PlatformAdapter`, have been refactored for better modularity. This creates a more stable foundation for future updates and feature development.

## [1.1.2] - 2025-09-15 (private)
- **Internal Improvements**
  - The execution guard, which prevents the script from running multiple times on the same page, has been refactored into a dedicated class. This improves the script's startup robustness and code organization.

## [1.1.1] - 2025-09-05
- **Refactored**
  - Consolidated duplicated profile/category logic in `TextEditorModalComponent` into generic handler methods (`_handleItemNew`, `_handleItemCopy`, `_handleItemDelete`, `_handleItemMove`, `_handleRenameConfirm`).  
  - Reduced code duplication and complexity by applying the DRY principle, improving maintainability and future extensibility.

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