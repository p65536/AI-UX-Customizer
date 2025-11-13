# Changelog

> **About this changelog**
> This changelog applies to both **ChatGPT UX Customizer (GPTUX)** and **Gemini UX Customizer (GGGUX)**.
> Most changes are shared between the two scripts. If a change applies only to one, it will be explicitly marked with a `[GPTUX]` or `[GGGUX]` prefix.

## [1.7.2] - 2025-11-13
- **Bug Fixes**
  - Fixed an issue where URL hash changes (e.g., `#settings`) were incorrectly detected as a full page navigation.
  - **[GPTUX]** This resolves a bug where the layout scan would repeatedly trigger when opening, closing, or navigating within the native ChatGPT settings modal, and fixes the associated UI sluggishness.

## [1.7.1] - 2025-11-13
- **Bug Fixes**
  - Fixed an issue in the **JSON Modal** and **Theme Modal** where validation error messages would persist even after correcting the invalid data and resubmitting.

## [1.7.0] - 2025-11-10
- **New Features**
  - **[GPTUX]** Added a **Layout Scan** feature specifically for **Firefox** users to mitigate scroll position jumps caused by late-loading messages or images. This includes a new "Scan layout on chat load" toggle in the settings panel and a manual trigger button in the navigation console.
- **Fixes**
  - **[GPTUX]** Fixed an issue where the navigation console would not reposition correctly when the text input area was resized.
  - **[GGGUX]** Fixed a bug where the "Load full history" auto-scroll feature did not trigger correctly on chat load.
- **Refactoring**
  - Refactored the internal `Logger` to be class-based and added a new `badge()` method for greatly improved console log readability during debugging.
  - Other internal code refactorings.

## [1.6.1] - 2025-10-25
- **Improvements**
  - **Performance**: [GPTUX/GGGUX] Optimized the creation of frequently repeated UI elements (avatars, bubble navigation buttons, message numbers) by using `cloneNode` instead of creating them from scratch each time. This reduces rendering overhead, especially in long conversations.
- **Internal**
  - **Refactoring**: [GPTUX/GGGUX] Refactored the theme editor's live preview update logic for better performance and maintainability. Previews now update granularly only for the relevant section, and the underlying event handling code has been centralized.

## [1.6.0] - 2025-10-19
- **Features**
  - **General**: Added a guard to automatically disable the script on unintended pages (e.g., `/gpts` or `/library` on ChatGPT) to prevent unexpected issues.
  - **Navigation**: Added a "Bulk Collapse/Expand" button to the **right end** of the navigation console to collapse or expand all messages at once (moved from the right of the input area).
  - **Navigation**: [GGGUX] Added an "Auto-Scroll" button to the **left end** of the navigation console to load the entire chat history. This button is designed to allow you to manually auto-scroll specific chats while normally disabling the `Load full history on chat load` function.
  - **UX**: [GGGUX] The auto-scroll process can now be canceled by pressing the `ESC` key.
  - **Navigation**: [GPTUX] Added a function to detect image-only messages and assign message numbers.
  - **Navigation**: [GPTUX] As a fallback for the above feature, a manual "Rescan DOM" button has been added to the **left end** of the navigation console. Normally, there is no need to use it.
- **Improvements**
  - **Performance**:
    - To enhance UI responsiveness while the AI is generating long responses, most UI processing is now paused during streaming. As a result, elements like the navigation console counters and the message jump list will update only after the response is fully complete. This change significantly reduces lag and stuttering.
    - Dynamically optimize icon image qualities to improve loading performance in chats with a large number of messages.
    - Removed the JavaScript-based message height calculation, now handling it with CSS only to significantly reduce rendering overhead.
  - **Navigation**:
    - Improved scroll navigation to target individual messages, enabling precise movement to content like images within a turn.
    - Image-only messages are now displayed as `(Image)` in the jump list for better clarity.
  - **UI/UX**:
    - The tooltip for the "Bulk Collapse/Expand" button now dynamically updates to show the next action (e.g., "Collapse all").
    - Changed the default value display for sliders in the settings panel from "Default" to "Auto".
- **Fixes**
  - **UI**: [GPTUX] Fixed an issue where the "message collapse/expand button" was not displayed on Chromium-based browsers.
  - **Theming**: [GPTUX] Fixed an issue where the input area background color specified in a theme was not applied correctly.
  - **Layout**: [GPTUX] Fixed an issue where changing the chat width would incorrectly affect the input area width.
- **Internal**
  - **Architecture**: Major refactoring to improve performance and maintainability.
    - Introduced a new rendering pipeline that separates DOM reads and writes (`withLayoutCycle`) and batches UI updates into `requestAnimationFrame` to prevent layout thrashing.
    - Overhauled the observation logic for better efficiency and reliability.
    - Refactored the settings panel management to an object-driven architecture based on a declarative UI schema. This change simplifies the addition of new settings, improves maintainability, and ensures more robust synchronization between the UI and the configuration data.
  - **Config**: Removed the legacy configuration compression feature, standardizing on a human-readable JSON format for storage.

## [1.5.5] - 2025-09-26
- **Fixes**
  - **Message Navigation:**
    - [GPTUX] Due to yet another page structure change in **ChatGPT** (less than a day after the previous fix), message navigation required another adjustment.
      - Updated the scroll container selector once more to match the latest DOM structure.
- **Debugging**
  - Added debug logging to make it easier to detect early when the scroll container selector changes. 

## [1.5.4] - 2025-09-25
- **Fixes**
  - **Message Navigation:**
    - [GPTUX] Fixed broken message navigation caused by recent page structure changes in ChatGPT.
      - Updated the scroll container selector to the new DOM structure.
    - Adjusted the target element in `scrollToElement()` to ensure correct scrolling.

## [1.5.3] - 2025-09-13 (private)
- **Fix**
  - Fixed message number being displayed at the end of the preview tooltip.

## [1.5.2] - 2025-09-13 (private)
- **New Feature: Message Number Indicators**
  - Adds a sequential number indicator to the corner of each message bubble for easy identification.
  - Makes it simple to cross-reference messages with the counters in the Navigation Console and the Jump List.
  - The number's position is fixed to the outer corner of the bubble (top-left for assistant, top-right for user), ensuring it expands outwards and does not interfere with other UI elements as the number of digits increases.
  - Visibility is linked to the "Navigation Console" feature; numbers are only displayed when the console is enabled in the settings.

## [1.5.1] - 2025-09-13
- **Refactor: Jump List Performance Overhaul**
  - The Jump List feature has been re-implemented to use virtual scrolling. This ensures high performance and a smooth, responsive experience, even in chats with thousands of messages, while significantly reducing memory usage.
- **Fix**
  - The highlighted item in the jump list now correctly synchronizes when navigating messages with the main navigation console buttons.
  - [GGGUX] The Jump List now correctly extracts the main answer text, ignoring the "Show thought process" section, for both the list items and the preview tooltip.

## [1.5.0] - 2025-09-08
- **New Feature: Jump List Navigation**
  - Introduced a "Jump List" feature for instant navigation to any message in the chat.
  - Click on the "Assistant:", "Total:", or "User:" labels in the navigation console to open the message list.
  - Features a dynamic filter to search for messages by plain text or regular expressions (e.g., `/pattern/i`).
  - Hovering over or using arrow keys on a list item displays a full preview of the message content.
  - Full keyboard support for filtering and list navigation (Arrow keys, Enter, Esc, etc.).
- **Script Metadata**
  - Updated the `@description` to include the new navigation capabilities.

## [1.4.0] - 2025-09-05
- **[GPTUX] Refactoring**
  - Minor refactoring.
  - Version alignment with `GGGUX`.
- **[GGGUX] New feature: Auto-load full chat history**
  - Added a new feature that automatically loads the entire chat history when opening a chat, eliminating the need to manually scroll up multiple times.
  - Enabled by default; can be toggled in **Settings Panel → "Load full history on chat load"**.
  - Provides user feedback with a toast notification (including a *Cancel* button) during loading.
  - Uses Gemini’s native progress bar to robustly load all messages.
  - Activates only for chats with more than 20 messages, and scrolls back to the latest message once loading is complete for a seamless experience.
  - If the auto-load chat history feature terminates too early, edit the script directly and increase the following value to `3000`: Inside `class AutoScrollManager`, change `APPEAR_TIMEOUT_MS: 2000,`

## [1.3.8] - 2025-09-03
- **UI manager refactoring for stability & performance**
  - Fixed an issue where the **"Toggle All"** button could incorrectly appear on empty chats after navigation. The visibility state is now managed via the message cache for consistency.
  - Improved performance by refactoring **AvatarManager** and **StandingImageManager** to use the centralized `MessageCacheManager` instead of redundant DOM queries.
  - Enhanced code clarity by renaming `ObserverManager._processTurnSingle` to `observeTurnForCompletion` and updating JSDoc documentation.

## [1.3.7] - 2025-08-31
- **Performance Enhancements**
  - Made theme application asynchronous: non-image styles (colors, fonts) were applied instantly, while images are loaded in the background with a smooth transition.
  - Optimized avatar height calculation to run once per message injection instead of recalculating all messages on every update.
  - Implemented an in-memory cache with an LRU eviction policy and a 10MB size limit to prevent excessive memory usage.
- **Stability & Bug Fixes**
  - Re-architected the core event handling model to be fully event-driven using a `Sentinel`, resolving race conditions during SPA navigation.
  - Removed the old DOM-scanning method (`scanForExistingTurns`) and its related logic in favor of the new event-driven approach.
  - Hardened UI injection logic by validating target elements before processing.
  - **Theme Modal**: Fixed a bug where the reserved name **"Default Settings"** could be used for custom themes.
- **Code Quality & Refactoring**
  - Standardized all debounced instance method calls to use `.bind(this)` to prevent `this` context errors.
  - Added a `destroy` method to all manager classes that use the EventBus, and prevented memory leaks by managing and releasing subscriptions as an array.
  - Moved the main Observer creation process at app startup from `PlatformAdapter` to `ObserverManager`. `PlatformAdapter` now focuses on providing platform-specific processing, and `ObserverManager` clarifies its role as the central orchestrator.
  - Removed dead code related to the previous sidebar observer.
  - Improved the robustness of navigation button container creation to prevent duplication.
  - **Theme Manager**: Decomposed the monolithic `applyThemeStyles` into `_ensureStylesheets`, `_applyNonImageVariables`, and `_applyImageVariables`. This clarified synchronous vs. asynchronous processing and improved maintainability. Also cached the dynamic stylesheet DOM reference to avoid redundant lookups.
  - **Theme Modal Component**: Introduced `_saveConfigAndHandleFeedback` to consolidate repetitive `try/catch` logic for saving configuration and showing feedback, reducing duplication across multiple handlers.
  - **Bubble UI Refactoring**: Merged `CollapsibleBubbleManager`, `SequentialNavManager`, and `ScrollToTopManager` into a single, unified `BubbleUIManager`.　Also Moved all platform-specific bubble logic into the `PlatformAdapter`. This simplifies the main controller, reduces code duplication, and improves maintainability.

## [1.3.6] - 2025-08-26
- **New Features**
  - **Auto-select Latest Message**: The navigation console now automatically selects the most recent message when a chat is opened.
- **Bug Fixes**
  - [GGGUX] **Infinite Scroll Handling**: Fixed an issue where the navigation console index became misaligned after older messages were loaded via infinite scroll.
- **Improvements & Refactoring**
  - **Observer Overhaul**: Reduced DOM observation scope to the minimum necessary, with observers now pausing during page transitions and resuming afterward. Added dedicated observers for Canvas and file panel.
  - **Event Handling Optimization**: Input field changes are now skipped early, and already-processed turns are not re-processed, reducing redundant operations.
- **For Developers**
  - **Feature (Logger Extension)**: Added a `debug` log level and support for `time()` / `timeEnd()` for simple performance measurement.
  - **Feature (PerfMonitor)**: Introduced a lightweight monitor that aggregates and logs function call frequency, useful for diagnosing issues such as excessive observer firing.
  - **Feature**: Added a `developer` section to the JSON configuration, allowing log level customization.
  - **Improvement**: Extended functionality of the debug utility `toggleBorders`.

## [1.3.5] - 2025-08-25 (private)
- Internal development version

## [1.3.4] - 2025-08-23 (private)
- **Refactoring**
  - **Observer Initialization**: Centralized all observer startup logic into the `PlatformAdapter` class to improve code structure and maintainability. This change also removed a redundant resize event listener and other obsolete code.
- **Fixes**
  - **Stability**: Resolved a potential memory leak in the streaming message observer and fixed a race condition in the avatar injection logic, improving long-term stability.
  - [GPTUX] **Stability**: Enhanced the robustness of the title and sidebar observers to ensure more reliable change detection.

## [1.3.3] - 2025-08-22
- **Refactoring**
  - **Style Management**: Restructured `STYLE_DEFINITIONS` by UI section and introduced `ALL_STYLE_DEFINITIONS` for unified processing, improving readability and maintainability.
  - **Constants**: Replaced magic numbers for delays and retry counts with constant objects, enhancing clarity.
  - **Settings Panel**: Reordered feature toggles to match the UI layout for a more intuitive configuration.
- **Feature Improvements**
  - **Performance**: Overhauled DOM Observation: Introduced a hybrid system using CSS animation sentinels for high-frequency events and a lightweight, debounced `MutationObserver` for low-frequency updates, eliminating streaming UI lag.
  - **Performance**: Avatar Handling Optimization: Replaced constant DOM polling with `animationstart`-based reinjection, ensuring avatars remain visible with minimal performance cost.
- **Bug Fixes**
  - [GGGUX] Fixed an issue where the file panel was obscured by the standing image. Added an observer to dynamically adjust the z-index when the panel is displayed.

## [1.3.2] - 2025-08-20
- **Feature Improvements**
  - **Performance**: Optimized processing during Assistant response streaming, significantly reducing CPU load. (Minimal patch for performance improvements targeted for 1.3.0).

## [1.3.1] - 2025-08-20
- **Fixed**: Fixed a regression introduced in v1.3.0 where toggles in the settings panel would not apply immediately. The root cause was a performance-oriented refactor of the `ObserverManager`; this logic has been reverted to the stable v1.2.1 implementation.
- **Improved**: The following improvements from v1.3.0 have been retained:
  - **Performance**: Optimized the rendering of standing images (`StandingImageManager`) by separating expensive layout calculations from minor UI updates. Layout calculations are now limited to events that directly affect the layout.
  - **Performance**: Removed a performance-intensive sorting process from the message cache (`MessageCacheManager`) that could cause forced browser reflows, eliminating a performance bottleneck.

## [1.3.0] - 2025-08-18
- **Improved**
  - **Performance**: Fundamentally refactored the DOM monitoring logic (`ObserverManager`) to eliminate high CPU usage during AI response streaming. The new system uses targeted, per-element observers instead of a high-frequency polling check, which also resolves avatar display issues more efficiently.
  - **Performance**: Optimized standing image (`StandingImageManager`) rendering by decoupling expensive layout calculations from minor UI updates, triggering them only on actual layout-changing events.
  - **Performance**: Removed a performance bottleneck in the message cache (`MessageCacheManager`) by eliminating a sort operation that forced unnecessary and expensive browser reflows.
- **Changed**
  - **Architecture**: Refactored the base logic for all bubble UI features (`Collapsible`, `ScrollToTop`, `SequentialNav`). The system is now consistently message-centric (`processElement`), removing the legacy turn-based processing (`processTurn`) for improved code clarity and maintainability.
  - [GGGUX] **Refactor**: The visibility check logic was refactored to read its state directly from CSS properties instead of a stale JavaScript object for feature parity with the ChatGPT version.

## [1.2.1] - 2025-08-15
- **Added**: Implemented dynamic UI adjustment to prevent interference when the Canvas feature is active.
  - **Standing Image:** Now hidden when the Canvas is open.
  - [GPTUX] **Settings Button:** Automatically repositions to avoid overlapping with the Canvas.

## [1.2.0] - 2025-08-05
- **New Features**: Added a feature to automatically synchronize settings when the script is used across multiple tabs.
- **Improvement**: Enhanced the theme preview feature. Unset items now inherit values from the user-defined default theme (`defaultSet`), making the preview more accurate and WYSIWYG.
- **Improvement**: Improved the UI for changing theme names, allowing for inline editing.
- Switched from using emojis to SVGs for various icons.
- Improved the initialization logic to enhance stability.
- Fixed a bug related to CSS where some settings were not being applied as intended.
- **Internal Code Improvements**: Other improvements to internal processing.

## [1.1.1] - 2025-07-27
- [GPTUX] **Stability Improvement:** Fixed a stability issue in Firefox environments where the UI (e.g., settings button) would sometimes fail to display or function correctly on initial page load.
  - **Cause:** Likely due to a race condition caused by conflicts with the site's UI rendering process.
  - **Solution:** Revised the initialization logic to ensure the script starts only after the site's UI is fully interactive.
- [GGGUX] **Stability Improvement:** Proactively applied the stability enhancements from `GPTUX v1.1.1` to `GGGUX`.

## [1.1.0] - 2025-07-26
- Changed the order of items on the theme settings screen. The order is now `background color` -> `text color` (background color is now listed first in all blocks).
- Adjusted the "Collapse/Expand All" toggle to ensure the currently highlighted message remains in view.
- **Implemented and optimized message caching**: Introduced a message caching mechanism to improve the efficiency of retrieving and managing message elements. This enhances overall script performance and makes features such as message collapsing, scrolling, and sequential navigation smoother.
- **Improved navigation functionality**: Refined the logic for calculating navigation buttons to enable more accurate jumping between messages.
- **Code Standardization and Improved Maintainability**: Platform-specific logic has been consolidated into the `PlatformAdapter` class.
- Changed the `@connect` definition from `p65536.github.io` to `raw.githubusercontent.com` (also changed the sample image URL in `project_theme_sample.json`).
- **Internal code improvements**: Various changes to enhance code readability and robustness.

## [1.0.0] - 2025-07-21
- First public release