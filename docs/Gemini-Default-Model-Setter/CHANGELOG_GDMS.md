# Changelog

### **[IMPORTANT] Compatibility**
Due to updates to the internal monitoring and coordination mechanisms, strict version matching is required when using this script together with my other scripts:
- AI UX Customizer (AIUXC): v1.4.3+
- Quick Text Buttons (QTB): v3.3.3+
- Gemini Default Model Setter (GDMS): v1.2.3+

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
