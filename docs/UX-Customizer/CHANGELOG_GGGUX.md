# Changelog

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
  - **Refactor**: The visibility check logic was refactored to read its state directly from CSS properties instead of a stale JavaScript object for feature parity with the ChatGPT version.

## [1.2.1] - 2025-08-15
- **Added**: Implemented dynamic UI adjustment to prevent interference when the Canvas feature is active.
  - **Standing Image:** Now hidden when the Canvas is open.

## [1.2.0] - 2025-08-05
- **New Features**: Added a feature to automatically synchronize settings when the script is used across multiple tabs.
- **Improvement**: Enhanced the theme preview feature. Unset items now inherit values from the user-defined default theme (`defaultSet`), making the preview more accurate and WYSIWYG.
- **Improvement**: Improved the UI for changing theme names, allowing for inline editing.
- Switched from using emojis to SVGs for various icons.
- Improved the initialization logic to enhance stability.
- Fixed a bug related to CSS where some settings were not being applied as intended.
- **Internal Code Improvements**: Other improvements to internal processing.

## [1.1.1] - 2025-07-27
- **Stability Improvement:** Proactively applied the stability enhancements from `ChatGPT UX Customizer` v1.1.1 to this script.

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