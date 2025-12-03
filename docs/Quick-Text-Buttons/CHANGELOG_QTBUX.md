# Changelog

## [2.2.0] - 2025-12-03
- **New Features**
  - Added a **Trigger Mode** option to the settings panel. Users can now choose between "Hover" (default) or "Click" to open the text list.
  - Added support for **Right-clicking** the insert button to quickly open the settings panel, regardless of the selected trigger mode.
- **Improvements**
  - The insert button's tooltip now dynamically updates to indicate the current interaction mode.
- **Fixes**
  - Fixed a race condition where global event listeners could persist if the text list was toggled rapidly.
  - Fixed an issue where the text list or settings panel would remain visible after navigating to a different chat URL.
  - Fixed various resource leaks to prevent memory issues and improve long-term stability.
- **Miscellaneous**
  - Updated the script icon.

## [2.1.0] - 2025-12-02
- **UI Improvements**
  - **[Modal Standardization]**
    - Buttons now follow a consistent order (Cancel, Apply, Save) across all menus.
    - The "Save" button is now visually highlighted as the primary action.
    - Enforced uniform button widths for a cleaner look.
  - **[JSON Settings]** Improved button layout for better usability. File operations (Export, Import) are now separated from dialog actions (Cancel, Save) to prevent accidental clicks.
- **Core Improvements**
  - Enhanced internal security and stability, including better compatibility with strict browser security environments (CSP).

## [2.0.0] - 2025-11-28
- **UI & UX Improvements**
  - **ChatGPT**: Improved layout integration by switching to native positioning, ensuring the button blends perfectly with the interface.
  - **Gemini**: Refreshed the button design to fully align with Material Design 3 styles.
  - **Text Editor**: Improved list navigation; deleting an item now selects the next item instead of the previous one for a smoother workflow.
- **Core Changes**
  - **Engine Upgrade**: Re-introduced the `Sentinel` engine with significant enhancements, replacing MutationObserver to deliver faster, conflict-free, and more reliable button placement.
  - Increased the maximum configuration storage limit from 4.8MB to 10MB.
  - Added automatic retry logic to ensure the button appears correctly even if the target element is temporarily detached.
  - Optimized configuration handling to automatically discard obsolete settings.

## [1.4.0] - 2025-11-24
- **UI Improvements**
  - **Unified Interface**: Merged the Settings and Insert buttons into a single, streamlined control.
  - **Relocation**: Moved the button to the bottom-left of the input area for better accessibility and reduced visual clutter.
  - **New Interaction**: Simply hover over the button to reveal the Quick Text list, or click it to open the Settings panel.
- **Core Improvements**
  - **Monitoring Engine**: Replaced the legacy CSS-based `Sentinel` with a `MutationObserver` engine to avoid conflicts with GPTUX/GGGUX.
  - **Persistence**: Added a "Keep-Alive" mechanism that instantly detects if the chat input is redrawn by the website (e.g., during page navigation) and restores the buttons immediately.
  - **Data Integrity**: Enhanced data validation to automatically detect and repair corrupted text profiles instead of causing errors.
- **Internal Refactoring**
  - **Optimization**: Replaced legacy object cloning with a more efficient `deepClone` utility and standardized event handling.
  - **Configuration**: Refactored internal configuration logic (`ConfigProcessor`) to improve separation of concerns and consistency.

## [1.3.0] - 2025-11-16
- **New Features & UI Improvements**
  - **[ChatGPT]** Improved button positioning logic. The buttons will now detect and avoid colliding with other UI elements (like native buttons or other UserScripts).
- **Fixes**
  - Fixed a major bug where the script would fail to re-initialize or position buttons correctly when using SPA navigation (e.g., switching chats or navigating from /gpts to a chat) without a full page reload.
- **Core Changes & Refactoring**
  - Rebuilt the Settings Panel using a new declarative UI schema. This internal refactor improves maintainability and makes future options easier to add.
  - Modernized core utilities (Logger, EventBus, Sentinel) for better performance, debugging, and stability.
  - Improved config merging to correctly preserve nested user settings (like `options` and `developer` settings) instead of being overwritten by defaults.
  - Introduced new internal utilities (`withLayoutCycle`, `runWhenIdle`) to optimize layout performance and task scheduling.

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