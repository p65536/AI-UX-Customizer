# Changelog

## [1.0.0-b434] - 2026-01-28
- **Internal Improvements**
  - Optimized the internal CSS generation engine to eliminate redundant style definitions, reducing the overall script footprint and improving performance.

## [1.0.0-b433] - 2026-01-28
- **Bug Fixes**
  - Fixed a UI glitch where the jump input field and message counter could duplicate when using the `Alt+N` shortcut while the navigation console was focused.
  - Fixed a crash (`TypeError`) that occurred when closing the Jump List using keyboard shortcuts while typing in the filter box.

## [1.0.0-b432] - 2026-01-28
- **Refactoring**
  - **[CSS Architecture]** Implemented a **Component Root Scoping** strategy to improve style stability. This major refactor replaces the reliance on `!important` with specific Root IDs for UI components (Settings Panel, Modals, Fixed Nav, etc.), ensuring custom styles apply reliably without brute force.

## [1.0.0-b431] - 2026-01-28
- **Refactoring**
  - **[Core]** Major refactor of the styling architecture to centralize CSS generation. This change reduces code duplication and improves internal maintainability.
  - **[UI]** Standardized the design of common UI elements (such as buttons and input fields) across the Settings Panel and Theme Editor, ensuring a consistent appearance.
  - **[Internal]** Improved the robustness of style generation logic by explicitly handling component prefixes.
- **Bug Fixes**
  - **[UI]** Restored the ability to close the Color Picker popup by pressing the `Esc` key.

## [1.0.0-b430] - 2026-01-27
- **UI Improvements**
  - **[Settings]** Improved the vertical alignment of toggle buttons in the settings panel to ensure they are centered within their rows.
  - **[JSON Modal]** Tightened the layout by removing excess whitespace from the status area when no messages are displayed.

## [1.0.0-b429] - 2026-01-27
- **Bug Fixes**
  - Prevented keyboard shortcuts (e.g., `Alt+N`) from triggering unintended actions when the navigation console is hidden (such as on the "New Chat" page).
  - Fixed UI artifacts where input fields would persist or counters would disappear incorrectly when navigating between chats.

## [1.0.0-b428] - 2026-01-27
- **New Features**
  - **[Navigation] Keyboard Shortcuts:** You can now navigate through messages using keyboard shortcuts.
    - `Alt + ↑ / ↓`: Jump to Previous / Next message.
    - `Alt + Shift + ↑ / ↓`: Jump to First / Last message.
    - `Alt + J`: Open the Jump List.
    - `Alt + N`: Focus the Message Number input.
    - *Note:* This feature includes smart throttling to ensure smooth, visible transitions when keys are held down.
- **Refactoring**
  - **[Settings]** The internal configuration structure has been refactored. Features that depend on others (like "Auto collapse" depending on "Collapsible button") are now logically nested, improving stability and settings management.

## [1.0.0-b427] - 2026-01-26
- **UX Improvements**
  - Message numbers and navigation counters now appear immediately when the assistant starts streaming a response, rather than waiting for the generation to complete.

## [1.0.0-b426] - 2026-01-26
- **Core Improvements**
  - Replaced the legacy polling mechanism with a smart "Integrity Scan" that runs when the browser is idle. This improves performance and ensures UI elements (avatars, buttons) render reliably, even if you scroll or interact with the page immediately after loading.

## [1.0.0-b425] - 2026-01-26
- **Performance Improvements**
  - Optimized the responsiveness of side panels (Canvas, File Panel, etc.). Opening and closing panels is now more efficient, removing redundant processing loops.

## [1.0.0-b424] - 2026-01-26
- **Performance Improvements**
  - Improved performance when resizing the window or toggling the sidebar by migrating to `ResizeObserver`, eliminating unnecessary layout recalculations.

## [1.0.0-b423] - 2026-01-26
- **Performance Improvements**
  - The script now intelligently skips unnecessary checks during text streaming, ensuring a smoother experience and lower CPU usage during active chat generation.

## [1.0.0-b422] - 2026-01-26
- **Refactoring**
  - Refactored internal constants to remove unused definitions.
  - Standardized DOM data attribute access in the Navigation Console to improve maintainability.

## [1.0.0-b421] - 2026-01-26
- **Bug Fixes**
  - Fixed a synchronization issue in the **Theme Editor** where the live preview failed to update its fallback (default) settings when the configuration was reloaded.

## [1.0.0-b420] - 2026-01-26
- **Bug Fixes**
  - **[Settings]** Fixed an issue where the "Console Position" setting would remain interactive even when the "Navigation console" feature was disabled. It now correctly reflects the disabled state.

## [1.0.0-b419] - 2026-01-26
- **Code Cleanup**
  - Removed unused CSS variables.

## [1.0.0-b418] - 2026-01-26
- **Performance Improvements**
  - **[Gemini]** Optimized the internal lookup mechanism for the chat history container, reducing processing overhead during cache updates and layout calculations.

## [1.0.0-b417] - 2026-01-26
- **Fixes**
  - Fixed an issue in the Theme Editor where the scroll position and input focus were reset when clicking "Apply".
- **Core Changes**
  - Refactored `ThemePreviewController` to centralize style application logic, reducing code duplication and improving maintainability.

## [1.0.0-b416] - 2026-01-25
- **Refactoring**
  - Removed unused logic to streamline the codebase.

## [1.0.0-b415] - 2026-01-25
- **Bug Fixes**
  - Fixed memory leak issues where the Settings Panel would accumulate event listeners and subscriptions upon re-rendering.
  - Fixed an issue where the Color Picker failed to properly dispose of its popup and global listeners when the settings menu was closed or updated.

## [1.0.0-b414] - 2026-01-25
- **Core Improvements**
  - **[Internal]** Completely rebuilt the settings and modal UI engine (`UIBuilder`). This architectural change reduces script overhead, improves maintainability, and ensures a snappier interface when opening menus or editing themes.
- **User Interface**
  - **[Settings]** All buttons and inputs in the Theme and JSON editors are now disabled while saving or importing data. This prevents errors and data corruption caused by rapid clicking or concurrent actions.
  - **[Settings]** The JSON configuration modal no longer closes when clicking the background area. This prevents accidental loss of unsaved edits; it must now be closed explicitly via the "Cancel" button or Esc key.
- **Bug Fixes**
  - **[Theme Editor]** Fixed an issue where the live preview would stop updating correctly after switching themes or reloading the form.
  - **[Theme Editor]** Fixed validation logic so that error messages (e.g., for invalid colors or regex patterns) appear and clear correctly.

## [1.0.0-b413] - 2026-01-25
- **Fixes**
  - **[AutoScroll]** Fixed a bug where the layout scan (ChatGPT) or auto-scroll (Gemini) would incorrectly trigger when sending a new message in a short conversation. The system now correctly distinguishes between the initial page load and active user interaction.

## [1.0.0-b412] - 2026-01-24
- **Fixes & Improvements**
  - **[Core]** Improved stability when switching chats by immediately cancelling background tasks and pending operations.
  - **[UI]** Fixed visual bugs where interface elements (buttons, counters) could remain visible or duplicate after navigating to a new page.

## [1.0.0-b411] - 2026-01-24
- **Bug Fixes**
  - Fixed a critical race condition where receiving a new message during a full-page update (e.g., loading history or changing settings) could cancel pending tasks, resulting in missing timestamps or navigation buttons.
  - Resolved a potential issue where timestamps could be generated twice if multiple updates occurred simultaneously.
- **Core Improvements**
  - Refactored internal task scheduling to isolate real-time message processing from global UI refreshes, ensuring consistent display state during rapid interactions.

## [1.0.0-b410] - 2026-01-24
- **Bug Fixes**
  - **[ChatGPT]** Fixed an issue where the **"Scan layout on chat load"** feature (Firefox only) would sometimes fail to trigger on chats with long histories. The detection logic has been improved to ensure messages are loaded before deciding whether to run the scan.

## [1.0.0-b409] - 2026-01-24
- **Performance Improvements**
  - Significantly optimized the rendering logic for **Timestamps**, **Message Numbers**, and **Navigation Buttons**. Operations are now processed in asynchronous batches, preventing UI freezes particularly in long conversations.
  - Improved the efficiency of real-time timestamp updates to ensure smooth performance while messages are streaming.
- **Core Changes**
  - Enhanced resource management during page navigation to prevent memory leaks and ensure immediate cleanup of stale UI elements.
  - Hardened internal state consistency to prevent errors when switching between chats rapidly or canceling operations.

## [1.0.0-b408] - 2026-01-24
- **Core Improvements**
  - Centralized UI rendering logic (Avatars, Buttons, Timestamps) into a unified batch processor. This reduces layout thrashing and prevents individual rendering errors from stopping the entire UI update.
  - Improved memory handling by ensuring background tasks are strictly cancelled and cleaned up during rapid updates or navigation.
- **Bug Fixes**
  - Fixed a potential issue where avatar icons could be duplicated within the same conversation turn.

## [1.0.0-b407] - 2026-01-24
- **Performance Improvements**
  - Optimized the rendering logic for message bubble features (Collapsible buttons, Navigation buttons).
  - Reduced layout lag and improved general responsiveness in long conversations by implementing efficient batch processing for UI updates.

## [1.0.0-b406] - 2026-01-24
- **UI & Settings**
  - Consolidated the settings for message navigation buttons. The separate toggles for "Sequential nav buttons" and "Scroll to top button" have been unified into a single **Bubble nav buttons** option (enabled by default) to simplify the settings panel.
- **Core Changes**
  - Refactored the `BubbleUIManager` architecture to handle navigation buttons more efficiently. This internal change optimizes how buttons are defined and rendered, reducing redundant DOM operations and improving code maintainability.

## [1.0.0-b405] - 2026-01-24
- **Fixes**
  - Resolved internal inconsistencies in variable access within style templates to improve code stability.

## [1.0.0-b404] - 2026-01-23
- **Performance Improvements**
  - **[Core]** Applied rendering optimizations to **Message Numbers** and **Timestamps**. These features now update more efficiently by batching DOM reads and writes, further reducing stutter during rapid scrolling or loading large chats.
- **Bug Fixes**
  - **[Core]** Fixed an issue where background rendering tasks for numbers and timestamps could persist briefly after navigating to a new page, potentially causing errors or wasted processing.

## [1.0.0-b403] - 2026-01-23
- **Performance Improvements**
  - **[Core]** Optimized the avatar injection process by strictly separating DOM reading (measurement) and writing (mutation) phases. This reduces layout thrashing, resulting in smoother scrolling and faster rendering, especially in long chats.
- **Bug Fixes**
  - **[Core]** Improved resource management during page navigation. Pending avatar rendering tasks are now immediately cancelled when switching chats to prevent errors on stale elements and potential memory leaks.

## [1.0.0-b402] - 2026-01-23
- **Performance Improvements**
  - [Jumplist] Optimized the logic for building the Jump List index. This reduces memory allocation and CPU overhead, leading to faster processing of long chat histories.

## [1.0.0-b401] - 2026-01-23
- **Performance Improvements**
  - **[ChatGPT]** Optimized styling logic for Project pages. Replaced expensive CSS selectors (`:has`) with efficient JavaScript class injection to reduce browser rendering overhead and improve responsiveness.

## [1.0.0-b400] - 2026-01-22
- **Bug Fixes**
  - Fixed a potential issue where the loading animation might persist under specific navigation scenarios (e.g., visiting pages without chat messages).
  - Resolved a rare edge case where the application theoretically could remain in a "loading" state if a theme failed to apply due to network errors.

## [1.0.0-b399] - 2026-01-22
- **Performance Improvements**
  - **[ChatGPT]** Optimized internal CSS selectors to reduce browser resource usage, resulting in smoother scrolling and faster response times, especially in long conversations.
  - Refactored the internal scrolling mechanism to ensure consistent and stable behavior across different platforms.

## [1.0.0-b398] - 2026-01-22
- **Performance Improvements**
  - **[ChatGPT]** Optimized internal CSS selectors by removing complex queries (`:has`). This significantly reduces browser load, resulting in smoother scrolling and better responsiveness during long chat sessions.
- **Bug Fixes**
  - Fixed a logic issue in stream detection where message completion signals could be misread. The script now strictly scopes checks to the active conversation turn, ensuring UI elements trigger reliably after a response finishes.

## [1.0.0-b397] - 2026-01-22
- **New Features**
  - Added a **visual loading indicator** to the settings button. The icon now spins and highlights (default: orange) to indicate background activity during page initialization, theme updates, and auto-scrolling.
- **Fixes**
  - Improved page type detection logic to correctly identify pages without active conversation history, ensuring proper script initialization.

## [1.0.0-b396] - 2026-01-21
- **UI Improvements**
  - **[Jumplist]** Enforced a strict layout constraint to display exactly 20 messages at a time, ensuring consistent appearance across different browsers and platforms.
- **Performance**
  - **[Jumplist]** Optimized the virtual scrolling buffer size to align with the new 20-item display limit, ensuring smooth rendering performance during immediate scrolling.

## [1.0.0-b395] - 2026-01-21
- **Performance**
  - **[Jumplist]** Improved the performance of the **Jump List**, especially in long conversations. Message text is now indexed in the background (idle time) to prevent the browser from freezing when opening the list.

## [1.0.0-b394] - 2026-01-21
- **Improvements**
  - **Persistent Image Cache**: Cached images (avatars, standing images, backgrounds) are now preserved when temporarily navigating to pages where the script is disabled (e.g., Library, GPTs). This improves performance and prevents flickering when returning to the chat.
  - **Network Retry Logic**: Fixed an issue where images that failed to load due to temporary network errors would not retry. Failures are now reset upon session initialization or navigation, allowing for recovery.

## [1.0.0-b393] - 2026-01-21
- **UI Changes**
  - Updated the **Settings** button icon to a "Palette" style to better reflect the script's focus on theming and visual customization.
- **Core Improvements**
  - **Memory Safety**: Completely refactored the internal resource manager (`BaseManager`) to prevent memory leaks. It now enforces a strict cleanup order for event listeners, observers, and timers across all features.
  - **Stability**: Enhanced application lifecycle reliability. The script now handles initialization sequences and page navigation cleanup more robustly, ensuring smooth transitions between chats without lingering background processes.
- **Performance Improvements**
  - Optimized the theming engine to use native CSS variables. This improves rendering performance when applying themes or resizing the window.
  - Optimized DOM observation (Sentinel) for both ChatGPT and Gemini to ignore already processed messages, significantly reducing processing overhead during chat updates.
  - Disabled the redundant "self-healing" monitor for avatars to decrease observer load.
  - Migrated internal state tracking for messages from data attributes to CSS classes. This reduces style calculation overhead and improves responsiveness in long conversations.
  - Optimized the DOM observation engine (`Sentinel`) by consolidating selector rules, reducing the number of injected CSS animation rules by 50%.
  - Optimized the message discovery process by restricting the search scope to the specific chat container (`main` or `#chat-history`). This prevents unnecessary scanning of the entire page (e.g., sidebars, settings), improving efficiency during cache rebuilds.
- **Bug Fixes**
  - **[Gemini]** Fixed a critical issue where the browser would freeze if **Auto-Scroll** (Load full history) was triggered while the **Canvas (Immersive Panel)** was active.
    - To prevent layout conflicts, the script now automatically closes the Canvas panel before starting the scroll process and displays a toast notification ("Canvas closed for auto-scroll") to keep you informed.
  - Fixed an issue where inconsistent variable naming could prevent certain theme text colors from being applied correctly.
  - Fixed an issue where **Message Timestamps** could potentially be lost when using the browser's Back/Forward buttons or navigating between chats.
  - Resolved a critical bug where UI customizations (avatars, buttons) would stop functioning if navigation occurred while auto-scrolling.
  - Improved the reliability of timestamp data collection to ensure early API requests are captured correctly during page load.
  - Prevented redundant "real-time" timestamp logging when loading existing chat history.
- **Refactor / Internal Improvements**
  - Refactored the internal theme application logic to ensure more reliable loading of styles and custom images, preventing potential race conditions.
  - Refactored the settings UI generation logic to be metadata-driven, reducing code duplication.
  - Refactored the settings button positioning logic (`ensureButtonPlacement`) to better align internal method names with their actual behavior.
  - Removed unused legacy code from the `UIManager` to improve project maintainability and reduce complexity.
  - Removed legacy attribute management logic to simplify the message processing pipeline and ensure code consistency.
  - Refactored the internal management of CSS variables to improve code stability and maintainability.
  - Hardened the internal event handling logic to ensure listeners are cleaned up reliably, preventing potential conflicts during page navigation.
  - Added robust safeguards to prevent errors during asynchronous UI updates and page transitions.
  - Added safeguards to the settings UI engine to prevent errors caused by duplicate rendering attempts.
  - Refactored internal icon definitions using a factory pattern to reduce code redundancy.
  - Refactored notification toasts to use browser-synchronized animations, ensuring smoother transitions and reliable cleanup of resources when closed.

## [1.0.0-b329] - 2026-01-17
- **New Features**
  - **[Navi Console]** Introduced a **Hybrid Positioning System** for the Navigation Console. You can now choose to embed the console directly into the site header or keep it floating above the input area.
  - **[Smart Positioning]** Implemented an auto-fallback mechanism for the "Header" position setting. The console will automatically move to the "Input Top" position if the screen is too narrow (under 960px) or if side panels (like Canvas or File Panel) are open. This prevents the navigation controls from overlapping with the site's native toolbar.
  - **[Settings]** Added a "Console Position" option to the settings panel to switch between **Header** integration and **Input Top** positioning.
- **Improvements**
  - **[Jump List]** The Jump List layout now automatically adapts to the console's position, expanding downwards when placed in the header to ensure content remains visible.
- **Core Changes**
  - **[UI]** Refactored the core `Select` component to support data-driven option handling and flexible layout configurations.
  - **[Config]** Implemented a robust **Auto-Repair Mechanism** for user settings. If configuration data (such as options or feature toggles) becomes corrupted or missing due to manual editing or errors, the script now automatically restores safe defaults to prevent crashes.
  - **[Config]** Enhanced validation logic for the **Navigation Console Position** setting to ensure it always falls back to a valid location ("Input Top") if an invalid value is detected.
- **Performance & Fixes**
  - Fixed a memory leak issue where the application became sluggish after importing settings or extensively using the Theme Editor.
  - Optimized memory usage by ensuring temporary configuration data is immediately released when closing the settings modal, eliminating the need to reload the page to restore performance.

## [1.0.0-b322] - 2026-01-17
- **UI Improvements**
  - Simplified the **Navigation Console** interface. The "Top" and "End" buttons are now always visible, removing the need to hold `Ctrl` for basic navigation.

## [1.0.0-b321] - 2026-01-16
- **Bug Fixes**
  - **[ChatGPT]** Fixed an issue where timestamps would fail to appear for the initial message when starting a new chat.
  - **[ChatGPT]** Resolved a bug where timestamps would disappear when navigating back to an existing chat via the sidebar.
  - **[ChatGPT]** Improved the stability of timestamp data caching to ensure consistent display during page transitions and browser history navigation.

## [1.0.0-b320] - 2026-01-16
- **Fixes & Improvements**
  - **[ChatGPT]** Hardened the **Message Timestamp** feature. The underlying API interception logic has been refactored to be more secure and reliable, resolving potential race conditions when loading chat history.

## [1.0.0-b319] - 2026-01-15
- **New Features**
  - Added a **Sticky Input Mode** to the navigation console. Right-clicking (desktop) or long-pressing (mobile) the message counter now cycles through `Normal`, `Ctrl`, and `Shift` modes.
    - *Note: This implementation provides a means to access modifier-based actions on mobile devices, but does not imply full mobile support.*

## [1.0.0-b318] - 2026-01-15
- **Bug Fixes**
  - **[Fixed Navigation]** Fixed a visual glitch introduced in b312 where the navigation console would briefly appear at incorrect coordinates during chat transitions or initial load. It now remains invisible until correctly positioned.
  - **[Fixed Navigation]** Improved positioning reliability to prevent the console from being misplaced when the chat input area is momentarily invisible or resizing.

## [1.0.0-b317] - 2026-01-15
- **UI Changes**
  - The role indicator and message counter now remain visible when holding the **Shift** key, ensuring context is always available.

## [1.0.0-b316] - 2026-01-15
- **Performance Improvements**
  - **[Nav Console]** Optimized rendering logic to minimize browser layout recalculations (Reflow) by updating DOM elements only when their values actually change.

## [1.0.0-b315] - 2026-01-15
- **Improvements & Fixes**
  - **[Nav Console]** Improved the robustness of modifier key handling to prevent the UI from getting stuck in "Ctrl" or "Shift" mode after switching windows or performing system shortcuts.
  - **[Jump List]** Resolved a usability conflict where using modifier keys in the search input (e.g., for capitalization or IME operations) would inadvertently trigger navigation commands and close the list.

## [1.0.0-b314] - 2026-01-15
- **UI Improvements**
  - **[Nav Console]** Standardized the layout spacing within the Fixed Navigation Console. All buttons and element groups now have consistent, uniform gaps for a cleaner visual appearance.
- **Bug Fixes**
  - Restore icon definition for `bulkExpand`

## [1.0.0-b313] - 2026-01-15
- **Code Maintenance**
  - Removed unused CSS definitions related to QTB's drag-and-drop functionality to clean up the codebase.

## [1.0.0-b312] - 2026-01-15
- **UI Enhancements (Nav Console)**
  - Replaced text labels with intuitive **icons** for the role switcher to improve visual clarity.
  - Added **color coding** to role indicators (Gray for Total, Blue for User, Red for Assistant) for quicker recognition.
  - The role indicator is now a proper button, improving accessibility and click responsiveness.
- **Performance**
  - Significantly optimized rendering logic to eliminate UI lag and forced reflows during mouse interactions.

## [1.0.0-b311] - 2026-01-15
- **UI/UX Improvements**
  - Added the ability to switch the active role filter (Total / Assistant / User) by right-clicking on the message counter numbers, providing an alternative to clicking the role label.
  - Updated the tooltip on the counter to explicitly mention the new right-click functionality.

## [1.0.0-b310] - 2026-01-15
- **UI/UX Improvements**
  - **[ChatGPT]** Hidden the native "scroll to bottom" button to reduce UI clutter and prevent redundancy with the Navigation Console.

## [1.0.0-b309] - 2026-01-15
- **New Features**
  - **Compact Navigation Console (Experimental)**
    - Right-click the Role label to cycle through roles (Total / Asst / User).
    - Holding modifier keys toggles between 3 operation modes:
      - **Normal:** Navigation buttons function as Prev / Next (Right-click to jump to Top / End).
      - **Ctrl:** Navigation buttons function as Top / End.
      - **Shift:** Reveals action buttons (Layout Scan [ChatGPT] / Auto Scroll [Gemini], and Bulk Collapse).
- **Improvements**
  - **Navigation Console:** Improved the message jump input logic for better usability.
    - Entering a number larger than the total message count now jumps to the last message, and numbers less than 1 jump to the first message.
    - Decimal inputs are now strictly ignored to prevent invalid navigation.

## [1.0.0-b303] - 2026-01-13
- **Refactor / Internal Improvements**
  - Optimized the configuration loading logic within `ConfigManager` to resolve internal warnings and improve code cleanliness.
  - Applied general code quality improvements and linting fixes (e.g., standardizing variable declarations) across the codebase.

## [1.0.0-b302] - 2026-01-12
- **Bug Fixes**
  - **[ChatGPT]** Restored the **Message Timestamp** functionality which stopped working in `b299` update due to lifecycle optimizations.
  - **[Core]** Improved the reliability of network data interception during page load and navigation to ensure no data is missed before the UI is fully initialized.

## [1.0.0-b301] - 2026-01-12
- **Core Improvements**
  - Refactored the **Auto-Scroll** feature (used for layout scanning on ChatGPT and history loading on Gemini) to share a unified base architecture. This improves code maintainability and ensures consistent behavior across platforms.
  - Optimized the initialization process for platform adapters by removing redundant lifecycle calls.

## [1.0.0-b300] - 2026-01-12
- **Core Improvements**
  - Unified the layout calculation logic for standing images across ChatGPT and Gemini. This internal optimization reduces the script's file size without changing any existing functionality.
  - Refactored the core logic for calculating standing image dimensions and positioning into a shared helper, improving maintainability.

## [1.0.0-b299] - 2026-01-12
- **Core Changes**
  - **[Architecture]** Completely overhauled the application lifecycle management. The script now handles page navigation and state transitions (between active chats and unsupported pages) much more reliably.
- **Bug Fixes & Optimizations**
  - **[Memory]** Fixed a potential memory leak where internal event listeners were not being properly removed when switching between chats.
  - **[Performance]** Improved navigation handling to immediately suspend script operations when visiting excluded URLs, preventing unnecessary background processing and timeout errors.

## [1.0.0-b298] - 2026-01-12
- **Fixes**
  - Hardened the internal `CustomModal` logic to strictly verify the dialog state before display, preventing crashes during rapid or concurrent interactions.

## [1.0.0-b297] - 2026-01-12
- **New Features**
  - **Storage Quota Safeguards:** Implemented a comprehensive safety mechanism to prevent data corruption when local storage is full.
  - **Visual Warnings:** Added clear warning banners in the Settings Panel, Theme Editor, and JSON Editor to alert users when the configuration size limit is reached.
  - **Action Blocking:** Operations that increase data size (like "New Theme" or "Copy") are now automatically disabled when storage is full to prevent save errors.
- **Improvements**
  - **JSON Editor:** The "Save" button is now properly disabled if the input content exceeds the storage limit.
  - **Error Handling:** Improved save operations to provide immediate feedback if a storage error occurs, rather than failing silently.
  - **Sync Logic:** Warning states now automatically clear when a valid, smaller configuration is loaded from another tab.

## [1.0.0-b296] - 2026-01-10
- **Core Changes**
  - Robust initialization process.

## [1.0.0-b295] - 2026-01-10
- **Core Changes**
  - Refactored the internal listener registration system to improve code stability and maintainability across supported platforms.

## [1.0.0-b294] - 2026-01-10
- **Core Changes**
  - **Initialization Logic**: Refactored the internal startup sequence (`BaseManager`, `UIManager`) to fully support and await asynchronous operations. This change hardens the application against race conditions, ensuring the UI and settings are perfectly synchronized before being interactive.

## [1.0.0-b293] - 2026-01-10
- **User Interface**
  - **[General]** Fixed an issue where the "Settings updated in another tab" warning was hidden in the JSON settings modal. It now displays correctly above the action buttons.

## [1.0.0-b292] - 2026-01-08
- **Bug Fixes**
  - **[Theme Editor]** Fixed a runtime error that occurred when clearing the "Title Patterns" or "URL Patterns" fields.
  - **[Core]** Improved the reliability of form inputs by adding safeguards against invalid numeric values (NaN) and optimizing event listener handling.

## [1.0.0-b291] - 2026-01-08
- **Core Changes**
  - **[Stability]** Improved the handling of numeric inputs (number fields and sliders) to ensure that invalid or incomplete values are safely treated as null, preventing state corruption.

## [1.0.0-b290] - 2026-01-08
- **Core Changes**
  - **[Internal]** Optimized the event binding mechanism in the form engine to eliminate redundant listeners and improve runtime efficiency.
  - **[Stability]** Enhanced the robustness of input element detection and value setting to prevent potential errors with specific input types (e.g., file inputs).

## [1.0.0-b289] - 2026-01-08
- **[Stability]** Fixed a potential issue where internal data errors were silently ignored during processing. The system now strictly validates data integrity to prevent unexpected behavior or settings corruption.

## [1.0.0-b288] - 2026-01-08
- **[Internal]** Updated `ReactiveStore` documentation to accurately reflect its event notification logic. This change clarifies how state updates are propagated internally and has no impact on user-facing features.

## [1.0.0-b287] - 2026-01-06
- **Fixes**
  - **Theme Editor**: When creating a new theme, it now initializes as a "blank slate" that dynamically inherits from global default settings, rather than creating a static copy of the current configuration.
- **Core Changes**
  - Modernized the internal ID generation logic within the form engine (`slice` instead of `substr`) to align with modern web standards and improve consistency across the codebase.

## [1.0.0-b285] - 2026-01-02

> Note: This is the first public beta release, consolidating all changes from internal builds v1.0.0-b1 through v1.0.0-b284.

- **Major Changes**
  - **Unified Script**: Merged `ChatGPT-UX-Customizer` and `Gemini-UX-Customizer` into a single script (**AI-UX-Customizer**). It now automatically detects and adapts to the active platform.
  - **Storage Overhaul**: Completely restructured how settings are saved. This resolves browser storage quota limits and improves synchronization performance between tabs.
- **New Features & UX**
  - **JSON Import**: Added a "Append" mode. You can now hold `Ctrl` while clicking the **Import** button to append new settings with your existing configuration instead of overwriting them.
  - **Theme Editor**:
    - Unified separate padding sliders into a single control for simpler adjustment.
    - Added index numbers to the theme selection list to help track order when moving items.
  - **Color Picker**: Added support for closing the popup using the `ESC` key.
- **Core Improvements**
  - **Performance**: Extensive internal refactoring (Reactive UI, centralized styling, virtual scrolling) to improve responsiveness and reduce memory usage.
  - **Performance**: Improved the responsiveness of **Jump List** operations on Chromium-based browsers.
  - **Stability**: Fixed resource leaks and improved reliability when navigating between pages.
  - **Architecture**: Transitioned the Settings Panel and Modals to a reactive, schema-driven UI architecture.
  - **Refactoring**: Extensive internal restructuring and modernization of the codebase to enhance maintainability and stability.

---

> The following is the changelog for GPTUX/GGGUX prior to integration.

## [2.3.5] - 2025-12-18
- **Fixes**
  - **[GPTUX]** Added the `/apps` page to the exclusion list to prevent the script from running on Apps pages.

## [2.3.4] - 2025-12-17
- **Fixes**
  - **[GPTUX]** Fixed an issue where the page header would scroll away with the chat content. It now correctly stays fixed at the top of the screen.
  - **[GPTUX]** Removed residual border lines and shadows around the header area to ensure a seamless look when using custom background images.

## [2.3.3] - 2025-12-17
- **Fixes**
  - **[GPTUX]** Added the `/images` page to the exclusion list to prevent the script from running on image generation pages.

## [2.3.2] - 2025-12-17
- **Fixes**
  - **[GPTUX]** Fixed an issue where standing images were not displayed on Project pages.

## [2.3.1] - 2025-12-16
- **Fixes**
  - **[GPTUX]** Updated core layout selectors to adapt to recent changes in ChatGPT's website structure, ensuring proper scrolling and theme application.
  - Fixed a visual regression where custom background images were scrolling with the chat content. Backgrounds are now correctly fixed in place.

## [2.3.0] - 2025-12-11
- **Performance & Stability**
  - **[GGGUX]** Optimized message monitoring logic to target the static chat history container. This prevents the creation of redundant observers during long conversations, improving overall performance.
  - Refined the internal observation strategy to apply platform-specific settings (deep vs. shallow monitoring). This ensures reliable message detection on Gemini while maintaining efficiency on ChatGPT.
- **Fixes**
  - Fixed an issue where changing the "Icon size" in settings resulted in low-quality, blurry images. The script now correctly regenerates the optimized images whenever the size is modified.
  - **[GPTUX]** Fixed an issue where the "Chat content max width" setting and standing images were not working due to recent ChatGPT UI changes. Updated selectors to target the new DOM structure.

## [2.2.2] - 2025-12-07
- **Style Updates**
  - **[GGGUX]** Added support for custom background images on the Gem Manager page by making the container transparent.
- **Fixes**
  -  Fixed a potential crash that could occur when closing the jump list immediately after hovering over an item.
- **Core Changes**
  - Refactored internal UI components and centralized shared styles to improve consistency and maintainability.
  - Optimized the initialization process and code structure.

## [2.2.1] - 2025-12-06
- **New Features**
  - Added a real-time **Configuration Size Indicator** to the JSON settings modal. It monitors config size against recommended (5MB) and hard (10MB) limits, using text colors (yellow/red) to warn of potential storage issues.
  - Added visual feedback (loading cursor, status messages) and robust error handling during file reading.
- **Fixes**
  - Fixed an issue where the text editor would not auto-focus or reset scroll position when opening the JSON settings modal.
- **Style Updates**
  - [GPTUX] Added support for custom background images on ChatGPT Project pages by making the header transparent.
  - [GPTUX] Removed default borders and shadows from the chat header to ensure a seamless appearance when using custom background images.

## [2.2.0] - 2025-12-05
- **New Features**
  - **URL Pattern Matching:** You can now apply themes based on the URL path in addition to the page title. URL matches take priority for faster switching.
    - Example (ChatGPT Project): `/123456abcdef789012ghijklmnopq345/i`
    - Example (Gemini Gem): `/gem\/abc123456789/i`
  - Added a **"URL Patterns"** field to the Theme Editor.
  - **[GPTUX] Auto-collapse User Messages:** Added an option to automatically collapse long user queries upon loading. This saves screen space and requires the "Collapsible button" feature to be enabled.
- **UI/UX Improvements**
  - **Responsive Settings UI:** The Settings Panel and Theme Editor now automatically adapt their size and layout for smaller screens.
    - The Theme Editor switches to a single-column layout on narrower windows to prevent overlap.
    - Added scroll support to the Settings Panel for better accessibility on small displays.
- **Core Changes**
  - Introduced `NavigationMonitor` for faster and more reliable detection of page navigation and URL changes.
  - Refactored the internal event system to prevent conflicts and ensure smoother operation.
- **Fixes**
  - Fixed an issue where clicking the settings button while typing could accidentally submit the chat message.
  - Fixed the Color Picker popup remaining floating/detached when scrolling the settings panel. It now auto-closes on scroll.
  - Improved resource cleanup to prevent potential memory leaks from lingering timers or listeners.
  - **[GGGUX]** Fixed an issue where **Standing Images** failed to reappear when switching between Gems.
  - **[GPTUX]** Improved theme logic to prevent the default theme from briefly flashing during page transitions.
  - **[GPTUX]** Fixed an issue where the top toolbar obscured the custom background on project pages, due to recent changes in ChatGPT specifications. It is now transparent, ensuring consistent background visibility.

## [2.1.0] - 2025-12-02
- **UX Improvements**
  - Enabled real-time layout updates during message streaming. These updates were previously suppressed to optimize performance, but the restriction has been lifted to ensure the UI remains visually consistent during user interactions.
- **UI Improvements**
  - **[Modal Standardization]**
    - Buttons now follow a consistent order (Cancel, Apply, Save) across all menus.
    - The "Save" button is now visually highlighted as the primary action.
    - Enforced uniform button widths for a cleaner look.
  - **[JSON Settings]** Improved button layout for better usability. File operations (Export, Import) are now separated from dialog actions (Cancel, Save) to prevent accidental clicks.
- **Core Improvements**
  - Enhanced internal security and stability, including better compatibility with strict browser security environments (CSP).

## [2.0.0] - 2025-11-28
- **New Features**
  - **Interactive Jump List Preview**: The message preview tooltip in the Navigation Console is now interactive. You can select and copy text directly from the preview without the popup closing unexpectedly.
    - **Tip:** To quickly select all text within the preview, simply **triple-click** the text.
  - **[GPTUX]** Added support for **Research Panel** and **Activity Panel**. Standing images are now automatically hidden when these panels are open to prevent visual clutter.
  - **Relocation**: Moved the settings button to the input area for better accessibility and reduced visual clutter.
  - **Config Storage Increase**: The maximum configuration size has been increased from 4.8MB to 10MB, providing more space for themes and embedded images.
    - *Note:* As stated in the README, please remember that embedding large local images is intended primarily for temporary layout verification.
- **Bug Fixes & Improvements**
  - **[GPTUX] Avatar Logic**: Refactored avatar injection to be turn-based, improving stability and fixing layout issues with dynamic content like "Thinking" processes.
  - **[GPTUX] Navigation Fix**: Fixed unexpected scrolling jumps when using navigation buttons on image-only messages.
  - **[GPTUX] Layout Fix**: Fixed an issue where custom avatars overlapped with **Deep Research** result containers; avatars are now hidden on these reports.
  - **[GPTUX] Timestamp Positioning**: Improved the positioning and stability of message timestamps.
  - **[GGGUX] Auto Scroll**: Fixed an issue where the **Auto Scroll** feature failed to trigger on certain chats by introducing a grace period for the initial check.
  - **Theme Editor**:
    - Copied themes are now inserted immediately below the selected theme.
    - Deleting a theme now intelligently selects the adjacent theme instead of selecting the 'Default Settings'.
  - **UI Stability**:
    - Fixed an issue where theme styles could persist on excluded pages.
    - Prevented duplicate insertion of navigation buttons (collapsible, sequential nav, etc.).
    - Settings save errors (e.g., storage full) are now handled gracefully without unhandled console warnings.
  - **Responsiveness**: Significantly improved the responsiveness of floating UI elements (Settings button, Navigation console, Standing images) during window resizing and panel transitions using frame-synced updates.
  - **Smooth Transitions**: Implemented smooth visual tracking for panel transitions (Sidebar, Canvas, File panels), eliminating visual jumps.
  - **History Navigation**: Improved compatibility with other browser extensions by implementing a safer method for restoring history navigation handlers (`pushState`/`replaceState`).
- **Performance & Internal**
  - **Refactored Sentinel Library**: The class now enforces a mandatory `prefix` (utilizing `OWNERID`) during initialization. This ensures distinct CSS animation names, allowing multiple scripts to run simultaneously on the same page without interfering with each other's DOM detection logic.
    - **Performance**: Switched internal implementation to use the `CSSStyleSheet` API (`insertRule`/`deleteRule`) instead of text manipulation, resulting in cleaner and faster style injection.
  - **Optimized Message Lookup**: Implemented O(1) lookup in `MessageCacheManager` using a `Map`-based cache, improving performance in long chats.
  - **Efficient Rendering**: Implemented DOM element caching for the Navigation Console to reduce overhead during updates.
  - **Modernized Core**: Updated utility functions to use modern browser APIs (`structuredClone`, `crypto.randomUUID`) and standardized internal logic.
  - **Safer Scrolling**: Refactored scrolling to use standard CSS `scroll-margin-top`, eliminating DOM hacks.
  - **Robust Lifecycle**: Hardened event listener management and improved the shutdown process for cleaner unloading and better stability on excluded pages.
  - **Refactored Initialization**: Centralized initialization logic in `ThemeAutomator` and simplified the script entry point.
  - **Style Tweaks**: Increased avatar icon margin for better visual spacing.

## [1.8.0] - 2025-11-16
- **New Features**
  - **[GPTUX]** Added a new **Message Timestamp** feature to display the creation time for each message (enabled by default). This feature intercepts API requests to load historical timestamps and records new ones in real-time.
  - **[GPTUX]** A "Show timestamp" toggle has been added to the settings panel to control this feature.
- **Core Changes**
  - Changed the script execution timing (`@run-at`) from `document-idle` to `document-start`. This is a foundational change required for API interception for Timestamps.
  - Hardened core lifecycle logic (`Sentinel`, `ObserverManager`) to ensure robust operation when running at `document-start`, particularly improving how page navigation completion is detected.
  - Improved observer performance and isolation by refactoring panel/toolbar observers (like the one for the settings button) to use their own dedicated `Sentinel` instances. This allows for cleaner setup and teardown.
  - Updated the main `Sentinel` prefix to `OWNERID + APPID` to ensure no conflicts between other scripts.
- **Fixes & Improvements**
  - **[GPTUX]** Implemented dynamic repositioning for the settings button. It will now automatically move to the left to avoid overlapping with the ChatGPT header toolbar (e.g., when the 'Share' button appears).

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