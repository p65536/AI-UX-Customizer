# Changelog

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
