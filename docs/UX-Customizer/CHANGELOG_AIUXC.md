# Changelog

> **About this changelog**  
> This changelog applies to both **ChatGPT UX Customizer (GPTUX)** and **Gemini UX Customizer (GGGUX)**.  
> Most changes are shared between the two scripts. If a change applies only to one, it will be explicitly marked with a `[GPTUX]` or `[GGGUX]` prefix.

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