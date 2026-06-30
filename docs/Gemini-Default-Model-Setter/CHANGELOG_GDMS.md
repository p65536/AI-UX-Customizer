# Changelog

### **[IMPORTANT] Compatibility**
Due to updates to the internal monitoring and coordination mechanisms, strict version matching is required when using this script together with my other scripts:
- AI UX Customizer (AIUXC): v1.4.3+
- Quick Text Buttons (QTB): v3.3.3+
- Gemini Default Model Setter (GDMS): v1.2.3+

## [1.4.1] - 2026-06-30
- **Core Changes**
  - [Icon] Embedded the script icon as an inline Data URI to guarantee asset rendering and eliminate external network dependencies.

## [1.4.0] - 2026-06-12
- **Added**
  - A new option to automatically re-apply your preferred thinking level when manually switching models.
  - A toggle checkbox in the settings modal and a companion shortcut entry in the extension menu.
  - A robust real-time DOM auditing defense mechanism that silently detects and overrides site-driven model resets (e.g., past chat loading or initial hydration).
  - High-precision interaction tracking utilizing the modern Temporal API (with a backward-compatible polyfill fallback).
- **Fixed & Improved**
  - Resolved an issue where an invalid or missing thinking level caused the selection menu to repeatedly open and close.
  - Prevented the script from misidentifying its own asynchronous rendering changes as unauthorized site overrides by implementing a synchronized timestamp update layer.
  - Improved selection tracking accuracy by explicitly isolating the target sub-menu via native ARIA attributes.
  - Eliminated configuration modal duplications and memory leaks by binding clean resource disposal directly to native dialog close events.
  - Guarded against rapid double-clicks on the save button to block concurrent duplicate menu command generation.
  - Stabilized the sequential layout display order of extension menu commands.
  - Updated the placeholder description to explicitly clarify that blank inputs defer to the site's default behavior.

## [1.3.0] - 2026-05-31
- **Core Changes**
  - [Observer] Transitioned from CSS animation triggers (`Sentinel`) to a debounced `MutationObserver`. This embodies the core design philosophy of waiting for DOM stabilization before scanning the state, improving the reliability of model adjustments during heavy initial page loads and reloads.
  - [Observer] Increased the maximum DOM stabilization timeout from 3 seconds to 10 seconds. This provides a resilient safety margin for low-spec devices or sluggish networks without adding any operational overhead, as the observer disconnects immediately once state configuration is settled.
  - [Internal] Optimized internal resource management and standardized lifecycle tokens to improve script stability.
  - [Internal] Removed the unused code.

## [1.2.6] - 2026-05-30
- **Core Changes**
  - [Sentinel] Fixed a potential memory leak by ensuring normalized selector cache is cleared when removing the last listener for a selector.

## [1.2.5] - 2026-05-30
- **Core Changes**
  - [EventBus] Enhanced event dispatch stability in debug mode when subscribers unsubscribe themselves dynamically.

## [1.2.4] - 2026-05-26
- **Core Changes**
  - [Menu] Automated the removal of stale extension menu commands to prevent options from lingering after updates.
  - [Menu] Streamlined component cleanup logic for reduced memory usage and enhanced extension reliability.

## [1.2.3] - 2026-05-26
- **Core Changes**
  - [Navigation] Upgraded the page navigation monitor to support co-existing scripts, preventing event interference on shared pages.
  - [Navigation] Improved stability and performance during rapid page transitions by ensuring obsolete background tasks are immediately cancelled.

## [1.2.2] - 2026-05-25
- **Core Changes**
  - [Sentinel] Enhanced internal handling to ensure continuous and reliable node detection even on websites with unique or complex page update processes.
  - [Sentinel] Optimized background event handling while the monitor is suspended, reducing the overall performance impact on the browser.

## [1.2.1] - 2026-05-24
- **Fixed & Optimized**
  - [AppController] Disabled URL hash tracking (`trackHash: false`) to prevent unnecessary model and thinking level enforcement cycles triggered by intra-page updates.
  - [AppController] Adapted to the updated `NavigationMonitor` API by leveraging the functional unsubscription token returned by `on()` for reliable lifecycle resource management.

## [1.2.0] - 2026-05-24
- **Core Changes**
  - Optimized the underlying model switching flow to ensure smoother selection updates.
  - Reduced unnecessary menu open/close cycles by pre-checking active settings (e.g., Thinking Level) directly from the interface.
  - [NavigationMonitor] Stabilized concurrent execution of multiple scripts under the same owner ID, eliminating missed page navigation triggers.
  - [NavigationMonitor] Added full support for single-page applications utilizing hash-based (`#`) routing pipelines.
  - [Sentinel] Enhanced multi-script safety to prevent layout and style conflicts when multiple instances run simultaneously on the same page.
  - [Sentinel] Implemented safe frame synchronization and polling limits to eliminate browser freeze risks during delayed loading.
  - [Sentinel] Introduced a lazy recovery mechanism to robustly handle initialization timeouts caused by external long tasks without disrupting multi-script environments.

## [1.1.0] - 2026-05-21
- **New Features**
  - **Thinking Level Control**: You can now set a default "Thinking Level" (e.g., Extended) in addition to the base model. Leave the setting blank if you do not want the script to modify or interfere with the current thinking level.
  - **Dedicated Menu**: Added a specific menu option to quickly access the Thinking Level settings.
- **Improvements**
  - **Default Model Update**: Changed the default target model from `Pro` to `Flash$`, using a regex anchor (`$`) to avoid matching `Flash-Lite`.
  - **Settings UI Enhancements**: 
    - Removed the script's internal active/suspend state toggle to eliminate redundancy, delegating script execution control entirely to the userscript manager.
    - The settings menu now automatically focuses and highlights the relevant text box when opened.
    - Simplified the layout and equalized button sizes for a cleaner look.
    - Removed the test string feature for a more streamlined experience.

## [1.0.1] - 2026-05-20
- **Bug Fixes**
  - Fixed an issue where configuring specific target model filters (such as `Flash$`) failed to match the correct model due to background changes in Gemini's menu structure.
- **Core Changes**
  - Enhanced the selector matching precision to strictly evaluate the exact model name, ignoring description subtitles and hidden whitespaces.

## [1.0.0] - 2026-05-14
- First public release
