# Changelog

## [1.2.1] - 2025-08-15
- **Added**: Implemented dynamic UI adjustment to prevent interference when the Canvas feature is active.
  - **Standing Image:** Now hidden when the Canvas is open.
  - **Settings Button:** Automatically repositions to avoid overlapping with the Canvas.

## [1.2.0] - 2025-08-05
- **New Features**: Added a feature to automatically synchronize settings when the script is used across multiple tabs.
- **Improvement**: Enhanced the theme preview feature. Unset items now inherit values from the user-defined default theme (`defaultSet`), making the preview more accurate and WYSIWYG.
- **Improvement**: Improved the UI for changing theme names, allowing for inline editing.
- Switched from using emojis to SVGs for various icons.
- Improved the initialization logic to enhance stability.
- Fixed a bug related to CSS where some settings were not being applied as intended.
- **Internal Code Improvements**: Other improvements to internal processing.

## [1.1.1] - 2025-07-27
- **Stability Improvement:** Fixed a stability issue in Firefox environments where the UI (e.g., settings button) would sometimes fail to display or function correctly on initial page load.
  - **Cause:** Likely due to a race condition caused by conflicts with the site's UI rendering process.
  - **Solution:** Revised the initialization logic to ensure the script starts only after the site's UI is fully interactive.

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