// ==UserScript==
// @name         AI-UX-Customizer
// @namespace    https://github.com/p65536
// @version      1.0.0-b420
// @license      MIT
// @description  Fully customize the chat UI of ChatGPT and Gemini. Automatically applies themes based on chat names to control everything from avatar icons and standing images to bubble styles and backgrounds. Adds powerful navigation features like a message jump list with search.
// @icon         https://raw.githubusercontent.com/p65536/p65536/main/images/icons/aiuxc.svg
// @author       p65536
// @match        https://chatgpt.com/*
// @match        https://gemini.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @connect      *
// @run-at       document-start
// @noframes
// @updateURL    https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/AI-UX-Customizer/AI-UX-Customizer.user.js
// @downloadURL  https://raw.githubusercontent.com/p65536/AI-UX-Customizer/main/scripts/AI-UX-Customizer/AI-UX-Customizer.user.js
// ==/UserScript==

(() => {
    'use strict';

    // --- Common Script Definitions ---
    const OWNERID = 'p65536';
    const APPID = 'aiuxc';
    const APPNAME = 'AI UX Customizer';
    const LOG_PREFIX = `[${APPID.toUpperCase()}]`;

    // =================================================================================
    // SECTION: Global Constants & Base Configuration
    // Description: Defines event names, validation rules, and the base configuration.
    // =================================================================================

    // --- Basic Platform Definitions ---
    const PLATFORM_DEFS = {
        CHATGPT: {
            NAME: 'ChatGPT',
            HOST: 'chatgpt.com',
        },
        GEMINI: {
            NAME: 'Gemini',
            HOST: 'gemini.google.com',
        },
    };

    /**
     * @constant CSS_VARS
     * @description Centralized definition of all CSS variables used in the application.
     * Keys are derived dynamically using APPID to prevent collisions.
     */
    const CSS_VARS = {
        // Actor: User
        USER_NAME: `--${APPID}-user-name`,
        USER_NAME_DISPLAY: `--${APPID}-user-name-display`,
        USER_ICON: `--${APPID}-user-icon`,
        USER_ICON_DISPLAY: `--${APPID}-user-icon-display`,
        USER_STANDING_IMAGE: `--${APPID}-user-standing-image`,
        USER_TEXT_COLOR: `--${APPID}-user-text-color`,
        USER_FONT: `--${APPID}-user-font`,
        USER_BUBBLE_BG: `--${APPID}-user-bubble-bg`,
        USER_BUBBLE_PADDING: `--${APPID}-user-bubble-padding`,
        USER_BUBBLE_RADIUS: `--${APPID}-user-bubble-radius`,
        USER_BUBBLE_MAXWIDTH: `--${APPID}-user-bubble-maxwidth`,

        // Actor: Assistant
        ASSISTANT_NAME: `--${APPID}-assistant-name`,
        ASSISTANT_NAME_DISPLAY: `--${APPID}-assistant-name-display`,
        ASSISTANT_ICON: `--${APPID}-assistant-icon`,
        ASSISTANT_ICON_DISPLAY: `--${APPID}-assistant-icon-display`,
        ASSISTANT_STANDING_IMAGE: `--${APPID}-assistant-standing-image`,
        ASSISTANT_TEXT_COLOR: `--${APPID}-assistant-text-color`,
        ASSISTANT_FONT: `--${APPID}-assistant-font`,
        ASSISTANT_BUBBLE_BG: `--${APPID}-assistant-bubble-bg`,
        ASSISTANT_BUBBLE_PADDING: `--${APPID}-assistant-bubble-padding`,
        ASSISTANT_BUBBLE_RADIUS: `--${APPID}-assistant-bubble-radius`,
        ASSISTANT_BUBBLE_MAXWIDTH: `--${APPID}-assistant-bubble-maxwidth`,

        // Window & Input
        WINDOW_BG_COLOR: `--${APPID}-window-bg-color`,
        WINDOW_BG_IMAGE: `--${APPID}-window-bg-image`,
        WINDOW_BG_SIZE: `--${APPID}-window-bg-size`,
        WINDOW_BG_POS: `--${APPID}-window-bg-pos`,
        WINDOW_BG_REPEAT: `--${APPID}-window-bg-repeat`,
        INPUT_BG: `--${APPID}-input-bg`,
        INPUT_FIELD_BG: `--${APPID}-input-field-bg`,
        INPUT_COLOR: `--${APPID}-input-color`,

        // Layout & Global Styles
        CHAT_CONTENT_MAX_WIDTH: `--${APPID}-chat-content-max-width`,
        MESSAGE_MARGIN_TOP: `--${APPID}-message-margin-top`,
        ICON_SIZE: `--${APPID}-icon-size`,
        ICON_MARGIN: `--${APPID}-icon-margin`,

        // Standing Image Layout
        STANDING_IMG_USER_WIDTH: `--${APPID}-standing-image-user-width`,
        STANDING_IMG_ASST_WIDTH: `--${APPID}-standing-image-assistant-width`,
        STANDING_IMG_ASST_LEFT: `--${APPID}-standing-image-assistant-left`,
        STANDING_IMG_USER_MASK: `--${APPID}-standing-image-user-mask`,
        STANDING_IMG_ASST_MASK: `--${APPID}-standing-image-assistant-mask`,
        RIGHT_SIDEBAR_WIDTH: `--${APPID}-right-sidebar-width`,
    };

    /**
     * @constant SHARED_CONSTANTS
     * @description Common configuration constants shared across platforms.
     * Platform-specific overrides are applied in their respective definition functions.
     */
    const SHARED_CONSTANTS = {
        // Storage Configuration & Limits
        STORAGE_SETTINGS: {
            ROOT_KEY: `${APPID}-manifest`,
            THEME_PREFIX: `${APPID}-theme-`,
            CONFIG_SIZE_RECOMMENDED_LIMIT_BYTES: 5 * 1024 * 1024, // 5MB
            CONFIG_SIZE_LIMIT_BYTES: 10 * 1024 * 1024, // 10MB
            CACHE_SIZE_LIMIT_BYTES: 10 * 1024 * 1024, // 10MB
        },
        // Processing & Performance Settings
        PROCESSING: {
            BATCH_SIZE: 50,
        },
        RETRY: {
            SCROLL_OFFSET_FOR_NAV: 40,
            AVATAR_INJECTION_LIMIT: 5,
            POLLING_SCAN_LIMIT: 7,
        },
        IMAGE_PROCESSING: {
            QUALITY: 0.85,
            MAX_WIDTH_BG: 1920,
            MAX_HEIGHT_STANDING: 1080,
        },
        TIMING: {
            DEBOUNCE_DELAYS: {
                VISIBILITY_CHECK: 250,
                CACHE_UPDATE: 250,
                LAYOUT_RECALCULATION: 150,
                NAVIGATION_UPDATE: 100,
                UI_REPOSITION: 100,
                THEME_UPDATE: 150,
                SETTINGS_SAVE: 300,
                THEME_PREVIEW: 50,
                AVATAR_INJECTION: 25,
                JUMP_LIST_PREVIEW_HOVER: 50,
                JUMP_LIST_PREVIEW_KEY_NAV: 150,
                JUMP_LIST_PREVIEW_RESET: 200,
                FILTER_INPUT_DEBOUNCE: 150,
                SIZE_CALCULATION: 300,
            },
            TIMEOUTS: {
                POST_NAVIGATION_DOM_SETTLE: 200,
                SCROLL_OFFSET_CLEANUP: 1500,
                PANEL_TRANSITION_DURATION: 350,
                ZERO_MESSAGE_GRACE_PERIOD: 2000,
                WAIT_FOR_MAIN_CONTENT: 10000,
                BLOB_URL_REVOKE_DELAY: 10000, // The time to wait before revoking a Blob URL after export, allowing the download to start.
            },
            ANIMATIONS: {
                TOAST_ENTER_DELAY: 10,
                TOAST_LEAVE_DURATION: 300,
                LAYOUT_STABILIZATION_MS: 500,
            },
            POLLING: {
                MESSAGE_DISCOVERY_MS: 750, // Interval for scanning the DOM to discover messages that weren't caught by observers
                STREAM_COMPLETION_CHECK_MS: 2000, // Interval for checking if a streaming response has completed (fallback mechanism)
                IDLE_INDEXING_MS: 1000, // Interval for background text indexing task
            },
            PERF_MONITOR_THROTTLE: 1000,
        },
        UI_SPECS: {
            STANDING_IMAGE_MASK_THRESHOLD_PX: 32,
            PREVIEW_BUBBLE_MAX_WIDTH: {
                USER: '50%',
                ASSISTANT: '90%',
            },
            MODAL_MARGIN: 8,
            PANEL_MARGIN: 8,
            ANCHOR_OFFSET: 4,
            THEME_MODAL_HEADER_PADDING: '12px',
            THEME_MODAL_FOOTER_PADDING: '16px',
            // Avatar Specifications
            AVATAR: {
                DEFAULT_SIZE: 64,
                SIZE_OPTIONS: [64, 96, 128, 160, 192],
                MARGIN: 20,
            },
            // Collapsible Button Specifications
            COLLAPSIBLE: {
                HEIGHT_THRESHOLD: 128,
            },
        },
        OBSERVED_ELEMENT_TYPES: {
            BODY: 'body',
            INPUT_AREA: 'inputArea',
            SIDE_PANEL: 'sidePanel',
        },
        SLIDER_CONFIGS: {
            CHAT_WIDTH: {
                MIN: 29,
                MAX: 80,
                NULL_THRESHOLD: 30,
                DEFAULT: null,
            },
            BUBBLE_MAX_WIDTH: {
                MIN: 29,
                MAX: 100,
                NULL_THRESHOLD: 30,
            },
        },
        Z_INDICES: {
            // Some settings are configured on the SECTION: Platform Constants
            SETTINGS_BUTTON: 10000,
            SETTINGS_PANEL: 11000,
            JUMP_LIST_PREVIEW: 12000,
            THEME_MODAL: 13000,
            COLOR_PICKER: 14000,
            JSON_MODAL: 15000,
            TOAST: 20000,
        },
        INTERNAL_ROLES: {
            USER: 'user',
            ASSISTANT: 'assistant',
        },
        THEME_IDS: {
            DEFAULT: 'defaultSet',
        },
        NAV_ROLES: {
            USER: 'user',
            ASSISTANT: 'asst',
            TOTAL: 'total',
        },
        UI_STATES: {
            EXPANDED: 'expanded',
            COLLAPSED: 'collapsed',
        },
        INPUT_MODES: {
            NORMAL: 'normal',
            SHIFT: 'shift',
        },
        CONSOLE_POSITIONS: {
            INPUT_TOP: 'input_top',
            HEADER: 'header',
        },
        CLASSES: {
            PROCESSED: `${APPID}-processed`,
            COMPLETE_FIRED: `${APPID}-complete`,
        },
        DATA_KEYS: {
            AVATAR_INJECT_ATTEMPTS: `${APPID}AvatarInjectAttempts`,
            AVATAR_INJECT_FAILED: `${APPID}AvatarInjectFailed`,
            UNIQUE_ID: `${APPID}UniqueId`,
            NAV_CMD: 'nav',
            NAV_ROLE: 'role',
            ORIGINAL_TITLE: 'originalTitle',
            CONFIG_KEY: 'configKey',
            STATE: 'state',
            FILTERED_INDEX: 'filteredIndex',
            MESSAGE_INDEX: 'messageIndex',
            PREVIEW_FOR: 'previewFor',
            FORM_ERROR_FOR: 'formErrorFor',
            TARGET_CONFIG_KEY: 'targetConfigKey',
        },
        STORE_KEYS: {
            SYSTEM_ROOT: '_system',
            SYSTEM_WARNING: 'warning',
            SYSTEM_ERRORS: 'errors',
            SYSTEM_SIZE_EXCEEDED: 'isSizeExceeded',
            WARNING_PATH: '_system.warning',
            WARNING_MSG_PATH: '_system.warning.message',
            WARNING_SHOW_PATH: '_system.warning.show',
            ERRORS_PATH: '_system.errors',
            SIZE_EXCEEDED_PATH: '_system.isSizeExceeded',
        },
        RESOURCE_KEYS: {
            // UI Components
            SETTINGS_BUTTON: 'settingsButton',
            SETTINGS_PANEL: 'settingsPanel',
            JSON_MODAL: 'jsonModal',
            THEME_MODAL: 'themeModal',

            // Sub-controllers
            WIDGET_CONTROLLER: 'widgetController',
            MODAL_COORDINATOR: 'modalCoordinator',

            // Managers
            THEME_MANAGER: 'themeManager',
            MESSAGE_CACHE_MANAGER: 'messageCacheManager',
            SYNC_MANAGER: 'syncManager',
            OBSERVER_MANAGER: 'observerManager',
            UI_MANAGER: 'uiManager',
            AVATAR_MANAGER: 'avatarManager',
            STANDING_IMAGE_MANAGER: 'standingImageManager',
            BUBBLE_UI_MANAGER: 'bubbleUIManager',
            MESSAGE_LIFECYCLE_MANAGER: 'messageLifecycleManager',
            TOAST_MANAGER: 'toastManager',
            TIMESTAMP_MANAGER: 'timestampManager',
            FIXED_NAV_MANAGER: 'fixedNavManager',
            MESSAGE_NUMBER_MANAGER: 'messageNumberManager',
            AUTO_SCROLL_MANAGER: 'autoScrollManager',

            // Observer Resources
            MAIN_OBSERVER: 'mainObserver',
            LAYOUT_RESIZE_OBSERVER: 'layoutResizeObserver',
            POLLING_SCAN: 'pollingScan',

            // Task Resources
            BATCH_TASK: 'batchTask',
            BATCH_TASK_SINGLE: 'batchTaskSingle',
            BATCH_TASK_TURN: 'batchTaskTurn',
            STREAM_CHECK: 'streamCheck',
            ZERO_MSG_TIMER: 'zeroMsgTimer',
            REMOVAL_TASK: 'removalTask',
            BUTTON_STATE_TASK: 'buttonStateTask',

            // Lifecycle Resources
            NAVIGATION_MONITOR: 'navigationMonitor',
            APP_CONTROLLER: 'appController',
            ANCHOR_LISTENER: 'anchorListener',

            // Dynamic UI Resources
            JUMP_LIST: 'jumpList',
        },
    };

    /** @type {AppConfig} */
    const DEFAULT_THEME_CONFIG = {
        // Platform-agnostic settings
        developer: {
            logger_level: 'log', // 'error', 'warn', 'info', 'log', 'debug'
        },
        // Platform specific settings
        platforms: {
            ChatGPT: {
                options: {
                    icon_size: 64,
                    chat_content_max_width: null,
                    respect_avatar_space: true,
                },
                features: {
                    collapsible_button: { enabled: true },
                    auto_collapse_user_message: { enabled: false },
                    bubble_nav_buttons: { enabled: true },
                    fixed_nav_console: { enabled: true, position: SHARED_CONSTANTS.CONSOLE_POSITIONS.INPUT_TOP },
                    load_full_history_on_chat_load: { enabled: true },
                    timestamp: { enabled: true },
                },
                defaultSet: {
                    assistant: {
                        name: 'Assistant',
                        icon: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#e3e3e3"><g><rect fill="none" height="24" width="24"/></g><g><g><path d="M19.94,9.06C19.5,5.73,16.57,3,13,3C9.47,3,6.57,5.61,6.08,9l-1.93,3.48C3.74,13.14,4.22,14,5,14h1l0,2c0,1.1,0.9,2,2,2h1 v3h7l0-4.68C18.62,15.07,20.35,12.24,19.94,9.06z M14.89,14.63L14,15.05V19h-3v-3H8v-4H6.7l1.33-2.33C8.21,7.06,10.35,5,13,5 c2.76,0,5,2.24,5,5C18,12.09,16.71,13.88,14.89,14.63z"/><path d="M12.5,12.54c-0.41,0-0.74,0.31-0.74,0.73c0,0.41,0.33,0.74,0.74,0.74c0.42,0,0.73-0.33,0.73-0.74 C13.23,12.85,12.92,12.54,12.5,12.54z"/><path d="M12.5,7c-1.03,0-1.74,0.67-2,1.45l0.96,0.4c0.13-0.39,0.43-0.86,1.05-0.86c0.95,0,1.13,0.89,0.8,1.36 c-0.32,0.45-0.86,0.75-1.14,1.26c-0.23,0.4-0.18,0.87-0.18,1.16h1.06c0-0.55,0.04-0.65,0.13-0.82c0.23-0.42,0.65-0.62,1.09-1.27 c0.4-0.59,0.25-1.38-0.01-1.8C13.95,7.39,13.36,7,12.5,7z"/></g></g></svg>',
                        textColor: null,
                        font: null,
                        bubbleBackgroundColor: null,
                        bubblePadding: '8px',
                        bubbleBorderRadius: '10px',
                        bubbleMaxWidth: null,
                        standingImageUrl: null,
                    },
                    user: {
                        name: 'You',
                        icon: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#e3e3e3"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
                        textColor: null,
                        font: null,
                        bubbleBackgroundColor: null,
                        bubblePadding: '8px',
                        bubbleBorderRadius: '10px',
                        bubbleMaxWidth: null,
                        standingImageUrl: null,
                    },
                    window: {
                        backgroundColor: null,
                        backgroundImageUrl: null,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center center',
                        backgroundRepeat: 'no-repeat',
                    },
                    inputArea: {
                        backgroundColor: null,
                        textColor: null,
                    },
                },
            },
            Gemini: {
                options: {
                    icon_size: 64,
                    chat_content_max_width: null,
                    respect_avatar_space: true,
                },
                features: {
                    collapsible_button: { enabled: true },
                    auto_collapse_user_message: { enabled: false },
                    bubble_nav_buttons: { enabled: true },
                    fixed_nav_console: { enabled: true, position: SHARED_CONSTANTS.CONSOLE_POSITIONS.INPUT_TOP },
                    load_full_history_on_chat_load: { enabled: true },
                    timestamp: { enabled: true },
                },
                defaultSet: {
                    assistant: {
                        name: 'Assistant',
                        icon: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#e3e3e3"><g><rect fill="none" height="24" width="24"/></g><g><g><path d="M19.94,9.06C19.5,5.73,16.57,3,13,3C9.47,3,6.57,5.61,6.08,9l-1.93,3.48C3.74,13.14,4.22,14,5,14h1l0,2c0,1.1,0.9,2,2,2h1 v3h7l0-4.68C18.62,15.07,20.35,12.24,19.94,9.06z M14.89,14.63L14,15.05V19h-3v-3H8v-4H6.7l1.33-2.33C8.21,7.06,10.35,5,13,5 c2.76,0,5,2.24,5,5C18,12.09,16.71,13.88,14.89,14.63z"/><path d="M12.5,12.54c-0.41,0-0.74,0.31-0.74,0.73c0,0.41,0.33,0.74,0.74,0.74c0.42,0,0.73-0.33,0.73-0.74 C13.23,12.85,12.92,12.54,12.5,12.54z"/><path d="M12.5,7c-1.03,0-1.74,0.67-2,1.45l0.96,0.4c0.13-0.39,0.43-0.86,1.05-0.86c0.95,0,1.13,0.89,0.8,1.36 c-0.32,0.45-0.86,0.75-1.14,1.26c-0.23,0.4-0.18,0.87-0.18,1.16h1.06c0-0.55,0.04-0.65,0.13-0.82c0.23-0.42,0.65-0.62,1.09-1.27 c0.4-0.59,0.25-1.38-0.01-1.8C13.95,7.39,13.36,7,12.5,7z"/></g></g></svg>',
                        textColor: null,
                        font: null,
                        bubbleBackgroundColor: null,
                        bubblePadding: '8px',
                        bubbleBorderRadius: '10px',
                        bubbleMaxWidth: null,
                        standingImageUrl: null,
                    },
                    user: {
                        name: 'You',
                        icon: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#e3e3e3"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
                        textColor: null,
                        font: null,
                        bubbleBackgroundColor: null,
                        bubblePadding: '8px',
                        bubbleBorderRadius: '10px',
                        bubbleMaxWidth: null,
                        standingImageUrl: null,
                    },
                    window: {
                        backgroundColor: null,
                        backgroundImageUrl: null,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center center',
                        backgroundRepeat: 'no-repeat',
                    },
                    inputArea: {
                        backgroundColor: null,
                        textColor: null,
                    },
                },
            },
        },
        themeSets: [
            {
                metadata: {
                    id: `${APPID}-theme-example-1`,
                    name: 'Theme Example',
                    matchPatterns: ['/Sample/i'],
                    urlPatterns: [],
                },
                assistant: {
                    name: null,
                    icon: null,
                    textColor: null,
                    font: null,
                    bubbleBackgroundColor: null,
                    bubblePadding: null,
                    bubbleBorderRadius: null,
                    bubbleMaxWidth: null,
                    standingImageUrl: null,
                },
                user: {
                    name: null,
                    icon: null,
                    textColor: null,
                    font: null,
                    bubbleBackgroundColor: null,
                    bubblePadding: null,
                    bubbleBorderRadius: null,
                    bubbleMaxWidth: null,
                    standingImageUrl: null,
                },
                window: {
                    backgroundColor: null,
                    backgroundImageUrl: null,
                    backgroundSize: null,
                    backgroundPosition: null,
                    backgroundRepeat: null,
                },
                inputArea: {
                    backgroundColor: null,
                    textColor: null,
                },
            },
        ],
    };

    const EVENTS = {
        // Theme & Style
        /**
         * @description Fired when the chat title changes, signaling a potential theme change.
         * @event TITLE_CHANGED
         * @property {null} detail - No payload.
         */
        TITLE_CHANGED: `${APPID}:titleChanged`,
        /**
         * @description Requests a re-evaluation and application of the current theme.
         * @event THEME_UPDATE
         * @property {null} detail - No payload.
         */
        THEME_UPDATE: `${APPID}:themeUpdate`,
        /**
         * @description Fired after all theme styles, including asynchronous images, have been fully applied.
         * @event THEME_APPLIED
         * @property {object} detail - Contains the theme and config objects.
         * @property {ThemeSet} detail.theme - The theme set that was applied.
         * @property {AppConfig} detail.config - The full application configuration.
         */
        THEME_APPLIED: `${APPID}:themeApplied`,
        /**
         * @description Fired when a width-related slider in the settings panel is changed, to preview the new width.
         * @event WIDTH_PREVIEW
         * @property {string | null} detail - The new width value (e.g., '60vw') or null for default.
         */
        WIDTH_PREVIEW: `${APPID}:widthPreview`,

        // UI & Layout
        /**
         * @description Fired by ThemeManager after it has applied a new chat content width.
         * @event CHAT_CONTENT_WIDTH_UPDATED
         * @property {null} detail - No payload.
         */
        CHAT_CONTENT_WIDTH_UPDATED: `${APPID}:chatContentWidthUpdated`,
        /**
         * @description Fired when the main window is resized.
         * @event WINDOW_RESIZED
         * @property {null} detail - No payload.
         */
        WINDOW_RESIZED: `${APPID}:windowResized`,
        /**
         * @description Fired when the sidebar's layout (width or visibility) changes.
         * @event SIDEBAR_LAYOUT_CHANGED
         * @property {null} detail - No payload.
         */
        SIDEBAR_LAYOUT_CHANGED: `${APPID}:sidebarLayoutChanged`,
        /**
         * @description Requests a re-check of visibility-dependent UI elements (e.g., standing images when a panel appears).
         * @event VISIBILITY_RECHECK
         * @property {null} detail - No payload.
         */
        VISIBILITY_RECHECK: `${APPID}:visibilityRecheck`,
        /**
         * @description Requests a check to ensure UI elements are correctly placed within their target containers.
         * @event UI_REPOSITION
         * @property {null} detail - No payload.
         */
        UI_REPOSITION: `${APPID}:uiReposition`,
        /**
         * @description Fired when the chat input area is resized.
         * @event INPUT_AREA_RESIZED
         * @property {null} detail - No payload.
         */
        INPUT_AREA_RESIZED: `${APPID}:inputAreaResized`,

        // Navigation & Cache
        /**
         * @description Fired when a page navigation is about to start.
         * @event NAVIGATION_START
         * @property {null} detail - No payload.
         */
        NAVIGATION_START: `${APPID}:navigationStart`,
        /**
         * @description Fired after a page navigation has completed and the UI is stable.
         * @event NAVIGATION_END
         * @property {null} detail - No payload.
         */
        NAVIGATION_END: `${APPID}:navigationEnd`,
        /**
         * @description Fired when a page navigation (URL change) is detected. Used to reset manager states.
         * @event NAVIGATION
         * @property {null} detail - No payload.
         */
        NAVIGATION: `${APPID}:navigation`,
        /**
         * @description Fired to request an update of the message cache, typically after a DOM mutation.
         * @event CACHE_UPDATE_REQUEST
         * @property {null} detail - No payload.
         */
        CACHE_UPDATE_REQUEST: `${APPID}:cacheUpdateRequest`,
        /**
         * @description Fired after the MessageCacheManager has finished rebuilding its cache.
         * @event CACHE_UPDATED
         * @property {null} detail - No payload.
         */
        CACHE_UPDATED: `${APPID}:cacheUpdated`,
        /**
         * @description Requests that a specific message element be highlighted by the navigation system.
         * @event NAV_HIGHLIGHT_MESSAGE
         * @property {HTMLElement} detail - The message element to highlight.
         */
        NAV_HIGHLIGHT_MESSAGE: `${APPID}:nav:highlightMessage`,

        // Message Lifecycle
        /**
         * @description Fired by Sentinel when a new message bubble's core content is added to the DOM.
         * @event RAW_MESSAGE_ADDED
         * @property {HTMLElement} detail - The raw bubble element that was added.
         */
        RAW_MESSAGE_ADDED: `${APPID}:rawMessageAdded`,
        /**
         * @description Fired to request the injection of an avatar into a specific message element.
         * @event AVATAR_INJECT
         * @property {HTMLElement} detail - The message element (e.g., `user-query`) to inject the avatar into.
         */
        AVATAR_INJECT: `${APPID}:avatarInject`,
        /**
         * @description Fired when a message container has been identified and is ready for further processing, such as the injection of UI addons (e.g., navigation buttons).
         * @event MESSAGE_COMPLETE
         * @property {HTMLElement} detail - The completed message element.
         */
        MESSAGE_COMPLETE: `${APPID}:messageComplete`,
        /**
         * @description Fired when an entire conversation turn (user query and assistant response) is complete, including streaming.
         * @event TURN_COMPLETE
         * @property {HTMLElement} detail - The completed turn container element.
         */
        TURN_COMPLETE: `${APPID}:turnComplete`,
        /**
         * @description Fired when an assistant response starts streaming.
         * @event STREAMING_START
         */
        STREAMING_START: `${APPID}:streamingStart`,
        /**
         * @description Fired when an assistant response finishes streaming.
         * @event STREAMING_END
         */
        STREAMING_END: `${APPID}:streamingEnd`,
        /**
         * @description Fired after streaming ends to trigger deferred layout updates.
         * @event DEFERRED_LAYOUT_UPDATE
         */
        DEFERRED_LAYOUT_UPDATE: `${APPID}:deferredLayoutUpdate`,
        /**
         * @description (ChatGPT-only) Fired when historical timestamps are loaded from the API.
         * @event TIMESTAMPS_LOADED
         * @property {object} detail - Contains the chat ID and timestamps map.
         * @property {string} detail.chatId - The ID of the chat.
         * @property {Map<string, Date>} detail.timestamps - The map of historical timestamps.
         */
        TIMESTAMPS_LOADED: `${APPID}:timestampsLoaded`,
        /**
         * @description Fired when a new timestamp for a realtime message is recorded.
         * @event TIMESTAMP_ADDED
         * @property {object} detail - Contains the message ID.
         * @property {string} detail.messageId - The ID of the message.
         * @property {Date} detail.timestamp - The timestamp (Date object) of when the message was processed.
         */
        TIMESTAMP_ADDED: `${APPID}:timestampAdded`,

        // System & Config
        /**
         * @description Fired when a remote configuration change is detected from another tab/window.
         * @event REMOTE_CONFIG_CHANGED
         * @property {object} detail - Contains the new configuration string.
         * @property {string} detail.newValue - The raw string of the new configuration.
         */
        REMOTE_CONFIG_CHANGED: `${APPID}:remoteConfigChanged`,
        /**
         * @description Requests the temporary suspension of all major DOM observers (MutationObserver, Sentinel).
         * @event SUSPEND_OBSERVERS
         * @property {null} detail - No payload.
         */
        SUSPEND_OBSERVERS: `${APPID}:suspendObservers`,
        /**
         * @description Requests the resumption of suspended observers and a forced refresh of the UI.
         * @event RESUME_OBSERVERS_AND_REFRESH
         * @property {null} detail - No payload.
         */
        RESUME_OBSERVERS_AND_REFRESH: `${APPID}:resumeObserversAndRefresh`,
        /**
         * @description Fired when the configuration size exceeds the storage limit.
         * @event CONFIG_SIZE_EXCEEDED
         * @property {object} detail - Contains the error message.
         * @property {string} detail.message - The warning message to display.
         */
        CONFIG_SIZE_EXCEEDED: `${APPID}:configSizeExceeded`,
        /**
         * @description Fired to update the display state of a configuration-related warning.
         * @event CONFIG_WARNING_UPDATE
         * @property {object} detail - The warning state.
         * @property {boolean} detail.show - Whether to show the warning.
         * @property {string} detail.message - The message to display.
         */
        CONFIG_WARNING_UPDATE: `${APPID}:configWarningUpdate`,
        /**
         * @description Fired when the configuration is successfully saved.
         * @event CONFIG_SAVE_SUCCESS
         * @property {null} detail - No payload.
         */
        CONFIG_SAVE_SUCCESS: `${APPID}:configSaveSuccess`,
        /**
         * @description Fired when the configuration has been updated, signaling UI components to refresh.
         * @event CONFIG_UPDATED
         * @property {AppConfig} detail - The new, complete configuration object.
         */
        CONFIG_UPDATED: `${APPID}:configUpdated`,

        /**
         * @description (ChatGPT-only) Fired by the polling scanner when it detects new messages.
         * @event POLLING_MESSAGES_FOUND
         * @property {null} detail - No payload.
         */
        POLLING_MESSAGES_FOUND: `${APPID}:pollingMessagesFound`,
        /**
         * @description (Gemini-only) Requests the start of the auto-scroll process to load full chat history.
         * @event AUTO_SCROLL_REQUEST
         * @property {null} detail - No payload.
         */
        AUTO_SCROLL_REQUEST: `${APPID}:autoScrollRequest`,
        /**
         * @description (Gemini-only) Requests the cancellation of an in-progress auto-scroll.
         * @event AUTO_SCROLL_CANCEL_REQUEST
         * @property {null} detail - No payload.
         */
        AUTO_SCROLL_CANCEL_REQUEST: `${APPID}:autoScrollCancelRequest`,
        /**
         * @description (Gemini-only) Fired when the auto-scroll process has actively started (i.e., progress bar detected).
         * @event AUTO_SCROLL_START
         * @property {null} detail - No payload.
         */
        AUTO_SCROLL_START: `${APPID}:autoScrollStart`,
        /**
         * @description (Gemini-only) Fired when the auto-scroll process has completed or been cancelled.
         * @event AUTO_SCROLL_COMPLETE
         * @property {null} detail - No payload.
         */
        AUTO_SCROLL_COMPLETE: `${APPID}:autoScrollComplete`,
    };

    // ---- Validation Schema ----
    /**
     * @constant THEME_VALIDATION_SCHEMA
     * @description Centralized validation rules for theme properties.
     * Used by ConfigProcessor to validate and sanitize user inputs.
     */
    const THEME_VALIDATION_SCHEMA = {
        // --- Numeric Fields ---
        'assistant.bubblePadding': { type: 'numeric', unit: 'px', min: -1, max: 50, nullable: true },
        'user.bubblePadding': { type: 'numeric', unit: 'px', min: -1, max: 50, nullable: true },
        'assistant.bubbleBorderRadius': { type: 'numeric', unit: 'px', min: -1, max: 50, nullable: true },
        'user.bubbleBorderRadius': { type: 'numeric', unit: 'px', min: -1, max: 50, nullable: true },
        'assistant.bubbleMaxWidth': { type: 'numeric', unit: '%', min: 29, max: 100, nullable: true },
        'user.bubbleMaxWidth': { type: 'numeric', unit: '%', min: 29, max: 100, nullable: true },

        // --- Color Fields ---
        'assistant.bubbleBackgroundColor': { type: 'color', label: 'Bubble bg color:' },
        'user.bubbleBackgroundColor': { type: 'color', label: 'Bubble bg color:' },
        'assistant.textColor': { type: 'color', label: 'Text color:' },
        'user.textColor': { type: 'color', label: 'Text color:' },
        'window.backgroundColor': { type: 'color', label: 'Window bg color:' },
        'inputArea.backgroundColor': { type: 'color', label: 'Input bg color:' },
        'inputArea.textColor': { type: 'color', label: 'Input text color:' },

        // --- Image Fields (Icon) ---
        'assistant.icon': { type: 'image', imageType: 'icon', label: 'Icon:' },
        'user.icon': { type: 'image', imageType: 'icon', label: 'Icon:' },

        // --- Image Fields (Standing Image) ---
        'assistant.standingImageUrl': { type: 'image', imageType: 'image', label: 'Standing image:' },
        'user.standingImageUrl': { type: 'image', imageType: 'image', label: 'Standing image:' },
        'window.backgroundImageUrl': { type: 'image', imageType: 'image', label: 'Background image:' },

        // --- Pattern Fields ---
        'metadata.matchPatterns': { type: 'regexArray', label: 'Title Patterns' },
        'metadata.urlPatterns': { type: 'regexArray', label: 'URL Patterns' },
    };

    /**
     * @constant StyleTemplates
     * @description Shared CSS generation logic to reduce code duplication between platforms.
     */
    const StyleTemplates = {
        /**
         * Generates the CSS for Bubble UI features (Collapsible & Navigation).
         * @param {Record<string, string>} cls - The class map.
         * @param {Record<string, string>} palette - The platform-specific UI palette.
         * @param {object} constants - The platform-specific constants.
         * @param {object} options - Platform-specific overrides.
         * @param {string} [options.collapsibleParentSelector] - Selector for the collapsible parent.
         * @param {string} [options.collapsibleBtnExtraCss] - Extra CSS for the toggle button position.
         * @param {string} [options.collapsibleCollapsedContentExtraCss] - Extra CSS for the content area (collapsed state).
         * @returns {string} The generated CSS.
         */
        getBubbleUiCss(cls, palette, constants, options = {}) {
            const { collapsibleParentSelector, collapsibleCollapsedContentExtraCss, collapsibleBtnExtraCss } = options;

            return `
                /* --- Collapsible Button --- */
                ${collapsibleParentSelector} {
                    position: relative;
                }
                /* Create a transparent hover area above the button */
                ${collapsibleParentSelector}::before {
                    content: '';
                    position: absolute;
                    top: -24px;
                    height: 24px;
                    inset-inline: 0;
                }
                /* Add a transparent border in the normal state to prevent width changes on collapse */
                .${cls.collapsibleContent} {
                    border: 1px solid transparent;
                    box-sizing: border-box;
                    overflow: hidden;
                    max-height: 999999px;
                }
                .${cls.collapsibleBtn} {
                    position: absolute;
                    top: -24px;
                    width: 24px;
                    height: 24px;
                    padding: 4px;
                    border-radius: 5px;
                    box-sizing: border-box;
                    cursor: pointer;
                    visibility: hidden;
                    opacity: 0;
                    transition: visibility 0s linear 0.1s, opacity 0.1s ease-in-out;
                    background-color: ${palette.btn_bg};
                    color: ${palette.text_secondary};
                    background: ${palette.btn_bg};
                    border: 0;
                    }
                .${cls.collapsibleBtn}.${cls.hidden} {
                    display: none;
                }

                /* Platform specific collapsible button positioning */
                ${collapsibleBtnExtraCss}
                
                ${collapsibleParentSelector}:hover .${cls.collapsibleBtn} {
                    visibility: visible;
                    opacity: 1;
                    transition-delay: 0s;
                }
                
                .${cls.collapsibleBtn}:hover {
                    background-color: ${palette.btn_hover_bg};
                    color: ${palette.text_primary};
                }
                .${cls.collapsibleBtn} svg {
                    width: 100%;
                    height: 100%;
                    transition: transform 0.2s ease-in-out;
                }
                
                .${cls.collapsibleParent}.${cls.collapsed} .${cls.collapsibleContent} {
                    max-height: ${constants.UI_SPECS.COLLAPSIBLE.HEIGHT_THRESHOLD}px;
                    border: 1px dashed ${palette.text_secondary};
                    box-sizing: border-box;
                    ${collapsibleCollapsedContentExtraCss}
                }
                .${cls.collapsibleParent}.${cls.collapsed} .${cls.collapsibleBtn} svg {
                    transform: rotate(-180deg);
                }

                /* --- Bubble Navigation --- */
                .${cls.navContainer} {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 24px;
                    z-index: ${constants.Z_INDICES.BUBBLE_NAVIGATION};
                }
                .${cls.navButtons} {
                    position: relative;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    visibility: hidden;
                    opacity: 0;
                    transition: visibility 0s linear 0.1s, opacity 0.1s ease-in-out;
                    pointer-events: auto;
                    gap: 4px;
                }
                .${cls.navParent}:hover .${cls.navButtons},
                .${cls.navContainer}:hover .${cls.navButtons} {
                    visibility: visible;
                    opacity: 1;
                    transition-delay: 0s;
                }
                
                /* Nav container positioning */
                ${constants.SELECTORS.ASSISTANT_MESSAGE} .${cls.navContainer} {
                    left: -25px;
                }
                ${constants.SELECTORS.USER_MESSAGE} .${cls.navContainer} {
                    right: -25px;
                }

                .${cls.navGroupTop}, .${cls.navGroupBottom} {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    width: 100%;
                }
                .${cls.navGroupBottom} {
                    margin-top: auto;
                }
                .${cls.navGroupTop}.${cls.hidden}, .${cls.navGroupBottom}.${cls.hidden} {
                    display: none !important;
                }
                .${cls.navBtn} {
                    width: 20px;
                    height: 20px;
                    padding: 2px;
                    border-radius: 5px;
                    box-sizing: border-box;
                    cursor: pointer;
                    background: ${palette.btn_bg};
                    color: ${palette.text_secondary};
                    border: 1px solid ${palette.border};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s ease-in-out;
                    margin: 0 auto;
                }
                .${cls.navBtn}:hover {
                    background-color: ${palette.btn_hover_bg};
                    color: ${palette.text_primary};
                }
                .${cls.navBtn}:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
                .${cls.navBtn} svg {
                    width: 100%;
                    height: 100%;
                }
            `;
        },

        /**
         * Generates the CSS for Avatars.
         * @param {object} selectors - The platform-specific selectors.
         * @param {string} extraCss - Platform-specific CSS overrides.
         * @returns {string} The generated CSS.
         */
        getAvatarCss(selectors, extraCss) {
            return `
                /* Common Avatar CSS */
                ${selectors.AVATAR_USER},
                ${selectors.AVATAR_ASSISTANT} {
                    position: relative !important;
                    overflow: visible !important;
                    min-height: calc(var(${CSS_VARS.ICON_SIZE}) + 3em);
                }

                ${selectors.SIDE_AVATAR_CONTAINER} {
                    position: absolute;
                    top: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: var(${CSS_VARS.ICON_SIZE});
                    pointer-events: none;
                    white-space: normal;
                    word-break: break-word;
                }

                ${selectors.SIDE_AVATAR_ICON} {
                    width: var(${CSS_VARS.ICON_SIZE});
                    height: var(${CSS_VARS.ICON_SIZE});
                    border-radius: 50%;
                    display: block;
                    box-shadow: 0 0 6px rgb(0 0 0 / 0.2);
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    transition: background-image 0.3s ease-in-out;
                }

                ${selectors.SIDE_AVATAR_NAME} {
                    font-size: 0.75rem;
                    text-align: center;
                    margin-top: 4px;
                    width: 100%;
                    background-color: rgb(0 0 0 / 0.2);
                    padding: 2px 6px;
                    border-radius: 4px;
                    box-sizing: border-box;
                }

                /* User avatar (Right) */
                ${selectors.AVATAR_USER} ${selectors.SIDE_AVATAR_CONTAINER} {
                    left: 100%;
                    margin-left: var(${CSS_VARS.ICON_MARGIN});
                }
                /* Assistant avatar (Left) */
                ${selectors.AVATAR_ASSISTANT} ${selectors.SIDE_AVATAR_CONTAINER} {
                    right: 100%;
                    margin-right: var(${CSS_VARS.ICON_MARGIN});
                }

                /* Theme Variables Mapping */
                ${selectors.AVATAR_USER} ${selectors.SIDE_AVATAR_ICON} {
                    background-image: var(${CSS_VARS.USER_ICON});
                    display: var(${CSS_VARS.USER_ICON_DISPLAY}, none);
                }
                ${selectors.AVATAR_USER} ${selectors.SIDE_AVATAR_NAME} {
                    color: var(${CSS_VARS.USER_TEXT_COLOR});
                    display: var(${CSS_VARS.USER_NAME_DISPLAY}, none);
                }
                ${selectors.AVATAR_USER} ${selectors.SIDE_AVATAR_NAME}::after {
                    content: var(${CSS_VARS.USER_NAME});
                }

                ${selectors.AVATAR_ASSISTANT} ${selectors.SIDE_AVATAR_ICON} {
                    background-image: var(${CSS_VARS.ASSISTANT_ICON});
                    display: var(${CSS_VARS.ASSISTANT_ICON_DISPLAY}, none);
                }
                ${selectors.AVATAR_ASSISTANT} ${selectors.SIDE_AVATAR_NAME} {
                    color: var(${CSS_VARS.ASSISTANT_TEXT_COLOR});
                    display: var(${CSS_VARS.ASSISTANT_NAME_DISPLAY}, none);
                }
                ${selectors.AVATAR_ASSISTANT} ${selectors.SIDE_AVATAR_NAME}::after {
                    content: var(${CSS_VARS.ASSISTANT_NAME});
                }

                /* Platform Specific Overrides */
                ${extraCss}
            `;
        },
    };

    // =================================================================================
    // SECTION: Base Platform Adapters
    // Description: Base classes for platform adapters defining the interface and default behaviors.
    // =================================================================================

    /**
     * @class BaseGeneralAdapter
     * @description Provides general utility methods for platform interaction.
     */
    class BaseGeneralAdapter {
        /**
         * Checks if the Canvas feature (or equivalent immersive mode) is currently active.
         * @returns {boolean} True if active, default is false.
         */
        isCanvasModeActive() {
            return false;
        }

        /**
         * Checks if the current page URL indicates a page where the script should be disabled.
         * @returns {boolean} True if the page should be excluded, default is false.
         */
        isExcludedPage() {
            return false;
        }

        /**
         * Checks if the File Panel (or context sidebar) is currently active.
         * @returns {boolean} True if active, default is false.
         */
        isFilePanelActive() {
            return false;
        }

        /**
         * Checks if the current page is a "New Chat" page (empty state).
         * @returns {boolean} True if it is a new chat page.
         * @throws {Error} Must be implemented by subclasses.
         */
        isNewChatPage() {
            throw new Error('isNewChatPage must be implemented by the platform adapter.');
        }

        /**
         * Checks if the current page is an active chat page with history.
         * @returns {boolean} True if it is a chat page.
         * @throws {Error} Must be implemented by subclasses.
         */
        isChatPage() {
            throw new Error('isChatPage must be implemented by the platform adapter.');
        }

        /**
         * Gets the root element that contains all chat messages to limit the search scope.
         * @returns {HTMLElement} The root element.
         * @throws {Error} Must be implemented by subclasses.
         */
        getMessagesRoot() {
            throw new Error('getMessagesRoot must be implemented by the platform adapter.');
        }

        /**
         * Gets the unique message ID from an element.
         * @param {Element | null} element The element.
         * @returns {string | null} The message ID.
         * @throws {Error} Must be implemented by subclasses.
         */
        getMessageId(element) {
            throw new Error('getMessageId must be implemented by the platform adapter.');
        }

        /**
         * Gets the platform-specific role identifier from a message element.
         * @param {Element} element The message element.
         * @returns {string | null} The role identifier (e.g., 'user', 'assistant').
         * @throws {Error} Must be implemented by subclasses.
         */
        getMessageRole(element) {
            throw new Error('getMessageRole must be implemented by the platform adapter.');
        }

        /**
         * Gets the current chat title from the DOM.
         * @returns {string | null} The chat title, or null if not found.
         * @throws {Error} Must be implemented by subclasses.
         */
        getChatTitle() {
            throw new Error('getChatTitle must be implemented by the platform adapter.');
        }

        /**
         * Gets the display text for a message element to be used in the Jump List.
         * @param {HTMLElement} element The message element.
         * @returns {string} The text content.
         * @throws {Error} Must be implemented by subclasses.
         */
        getJumpListDisplayText(element) {
            throw new Error('getJumpListDisplayText must be implemented by the platform adapter.');
        }

        /**
         * Finds the root message container element for a given content element (e.g. text node or image).
         * @param {Element} element The content element.
         * @returns {HTMLElement | null} The parent message container.
         * @throws {Error} Must be implemented by subclasses.
         */
        findMessageElement(element) {
            throw new Error('findMessageElement must be implemented by the platform adapter.');
        }

        /**
         * Filters out ghost or invalid message containers before they are added to the cache.
         * @param {Element} element The message element to check.
         * @returns {boolean} True to keep the message, false to ignore it. Default is true.
         */
        filterMessage(element) {
            return true;
        }

        /**
         * Ensures that a content element (like an image) is wrapped in a proper message container.
         * Used for platforms where images might be direct children of the turn container.
         * @param {HTMLElement} element The content element.
         * @returns {HTMLElement | null} The message container. Default returns null (no action).
         */
        ensureMessageContainerForImage(element) {
            return null;
        }

        /**
         * Sets up Sentinel listeners to detect new message content.
         * @param {(element: HTMLElement) => void} callback The callback to execute when content is found.
         * @throws {Error} Must be implemented by subclasses.
         */
        initializeSentinel(callback) {
            throw new Error('initializeSentinel must be implemented by the platform adapter.');
        }

        /**
         * Performs an initial scan of the DOM for messages that might have been missed by observers.
         * @param {MessageLifecycleManager} lifecycleManager The lifecycle manager instance.
         * @returns {number} The number of new items found. Default is 0.
         */
        performInitialScan(lifecycleManager) {
            return 0;
        }

        /**
         * Lifecycle hook called when a page navigation event completes.
         * @param {MessageLifecycleManager} lifecycleManager The lifecycle manager instance.
         */
        onNavigationEnd(lifecycleManager) {
            // No-op by default
        }

        /**
         * Scrolls to a target element using platform-specific logic.
         * @param {HTMLElement} element The target element.
         * @param {object} options Scrolling options.
         * @param {number} [options.offset] A pixel offset to apply above the target element.
         * @param {boolean} [options.smooth] Whether to use smooth scrolling.
         * @throws {Error} Must be implemented by subclasses.
         */
        scrollTo(element, options) {
            throw new Error('scrollTo must be implemented by the platform adapter.');
        }
    }

    /**
     * @class BaseStyleManagerAdapter
     * @description Generates platform-specific CSS.
     */
    class BaseStyleManagerAdapter {
        /**
         * Returns the static CSS that does not depend on themes.
         * @param {Record<string, string>} cls Map of logical class names to actual class names.
         * @returns {string} The CSS string.
         * @throws {Error} Must be implemented by subclasses.
         */
        getStaticCss(cls) {
            throw new Error('getStaticCss must be implemented by the platform adapter.');
        }

        /**
         * Returns the CSS for bubble UI elements (buttons, etc.).
         * @param {Record<string, string>} cls Map of logical class names to actual class names.
         * @returns {string} The CSS string.
         * @throws {Error} Must be implemented by subclasses.
         */
        getBubbleCss(cls) {
            throw new Error('getBubbleCss must be implemented by the platform adapter.');
        }
    }

    /**
     * @class BaseThemeManagerAdapter
     * @description Handles platform-specific theme application logic.
     */
    class BaseThemeManagerAdapter {
        /**
         * Determines if the initial theme application should be deferred (e.g. waiting for title load).
         * @param {ThemeManager} manager The theme manager instance.
         * @returns {boolean} True to defer, default is false.
         */
        shouldDeferInitialTheme(manager) {
            return false;
        }

        /**
         * Selects the theme to update based on state changes.
         * @param {ThemeManager} manager The theme manager instance.
         * @param {AppConfig} config The current configuration.
         * @param {boolean} urlChanged Whether the URL has changed.
         * @param {boolean} titleChanged Whether the title has changed.
         * @returns {ThemeSet | null} The theme to apply, or null to defer.
         */
        selectThemeForUpdate(manager, config, urlChanged, titleChanged) {
            if (urlChanged) {
                manager.cachedThemeSet = null;
            }
            return manager.getThemeSet();
        }

        /**
         * Returns platform-specific CSS overrides for theme styles.
         * @returns {Record<string, string>} Map of actor ('user', 'assistant') to CSS string.
         */
        getStyleOverrides() {
            return {};
        }
    }

    /**
     * @class BaseBubbleUIAdapter
     * @description Manages UI elements injected into message bubbles.
     */
    class BaseBubbleUIAdapter {
        /**
         * Gets the element to which navigation buttons should be attached.
         * @param {HTMLElement} messageElement The message element.
         * @returns {HTMLElement | null} The positioning parent.
         * @throws {Error} Must be implemented by subclasses.
         */
        getNavPositioningParent(messageElement) {
            throw new Error('getNavPositioningParent must be implemented by the platform adapter.');
        }

        /**
         * Gets information required to render the collapsible button.
         * @param {HTMLElement} messageElement The message element.
         * @returns {{msgWrapper: HTMLElement, bubbleElement: HTMLElement, positioningParent: HTMLElement} | null} Info object or null.
         * @throws {Error} Must be implemented by subclasses.
         */
        getCollapsibleInfo(messageElement) {
            throw new Error('getCollapsibleInfo must be implemented by the platform adapter.');
        }

        /**
         * Gets information required to render bubble navigation buttons (Side Nav).
         * @param {HTMLElement} messageElement The message element.
         * @returns {object | null} Truthy object to enable, null to disable. Default is empty object.
         */
        getBubbleNavButtonsInfo(messageElement) {
            return {};
        }
    }

    /**
     * @class BaseToastAdapter
     * @description Provides messages for toast notifications.
     */
    class BaseToastAdapter {
        /**
         * Gets the message to display during auto-scroll.
         * @returns {string} The message.
         * @throws {Error} Must be implemented by subclasses.
         */
        getAutoScrollMessage() {
            throw new Error('getAutoScrollMessage must be implemented by the platform adapter.');
        }
    }

    /**
     * @class BaseAppControllerAdapter
     * @description Hooks for initializing platform-specific managers.
     */
    class BaseAppControllerAdapter {
        /**
         * Initializes platform-specific managers (e.g. AutoScrollManager).
         * @param {AppController} controller The main controller instance.
         */
        initializePlatformManagers(controller) {
            // No-op by default
        }

        /**
         * Applies UI updates specific to the platform after config change.
         * @param {AppController} controller The main controller instance.
         * @param {AppConfig} newConfig The new configuration.
         */
        applyPlatformSpecificUiUpdates(controller, newConfig) {
            // No-op by default
        }
    }

    /**
     * @class BaseAvatarAdapter
     * @description Handles avatar injection and styling.
     */
    class BaseAvatarAdapter {
        /**
         * Returns CSS for avatars.
         * @returns {string} The CSS string.
         * @throws {Error} Must be implemented by subclasses.
         */
        getCss() {
            throw new Error('getCss must be implemented by the platform adapter.');
        }

        /**
         * Measures the target message element to determine if and where an avatar should be injected.
         * Performs READ operations only.
         * @param {HTMLElement} msgElem The message element to process.
         * @returns {AvatarMeasurement | null} The measurement result or null if processing should stop.
         * @throws {Error} Must be implemented by subclasses.
         */
        measureAvatarTarget(msgElem) {
            throw new Error('measureAvatarTarget must be implemented by the platform adapter.');
        }

        /**
         * Injects the avatar container into the DOM based on the measurement context.
         * Performs WRITE operations only.
         * @param {AvatarMeasurement} measurement The measurement result returned by measureAvatarTarget.
         * @param {HTMLElement | null} avatarContainer The avatar container to inject (null if shouldInject is false).
         * @param {string} processedClass The class to mark as processed.
         * @throws {Error} Must be implemented by subclasses.
         */
        injectAvatar(measurement, avatarContainer, processedClass) {
            throw new Error('injectAvatar must be implemented by the platform adapter.');
        }
    }

    /**
     * @class BaseStandingImageAdapter
     * @description Manages standing image layout and visibility.
     */
    class BaseStandingImageAdapter {
        /**
         * Recalculates the position and size of standing images.
         * @param {StandingImageManager} instance The manager instance.
         * @returns {Promise<void>}
         * @throws {Error} Must be implemented by subclasses.
         */
        async recalculateLayout(instance) {
            throw new Error('recalculateLayout must be implemented by the platform adapter.');
        }

        /**
         * Updates the visibility of standing images.
         * @param {StandingImageManager} instance The manager instance.
         * @throws {Error} Must be implemented by subclasses.
         */
        updateVisibility(instance) {
            throw new Error('updateVisibility must be implemented by the platform adapter.');
        }

        /**
         * Sets up platform-specific event listeners.
         * @param {StandingImageManager} instance The manager instance.
         */
        setupEventListeners(instance) {
            // No-op by default
        }
    }

    /**
     * @class BaseObserverAdapter
     * @description Manages DOM observers.
     */
    class BaseObserverAdapter {
        /**
         * Returns functions to start platform-specific observers.
         * @returns {Array<(dependencies: any) => () => void>} Array of starter functions.
         * @throws {Error} Must be implemented by subclasses.
         */
        getPlatformObserverStarters() {
            throw new Error('getPlatformObserverStarters must be implemented by the platform adapter.');
        }

        /**
         * Checks if a conversation turn is complete.
         * @param {HTMLElement} turnNode The turn element.
         * @returns {boolean} True if complete.
         * @throws {Error} Must be implemented by subclasses.
         */
        isTurnComplete(turnNode) {
            throw new Error('isTurnComplete must be implemented by the platform adapter.');
        }
    }

    /**
     * @class BaseSettingsPanelAdapter
     * @description Configures the settings panel.
     */
    class BaseSettingsPanelAdapter {
        /**
         * Returns platform-specific feature toggles for the settings panel.
         * @returns {Array<{type: string, configKey: string, label: string, title?: string, disabledIf?: (data: any) => boolean, dependencies?: string[]}>} Array of toggle definitions.
         */
        getPlatformSpecificFeatureToggles() {
            return [];
        }
    }

    /**
     * @class BaseFixedNavAdapter
     * @description Adapters for the Fixed Navigation Console.
     */
    class BaseFixedNavAdapter {
        /**
         * Checks if the header position is available based on the current window state.
         * @param {number} [navConsoleWidth] Optional width of the console for strict checking.
         * @returns {boolean} True if header positioning is allowed.
         */
        isHeaderPositionAvailable(navConsoleWidth) {
            return true;
        }

        /**
         * Gets the container element in the header/toolbar where the nav console should be embedded.
         * @returns {HTMLElement | null} The container element, or null if not found.
         */
        getNavAnchorContainer() {
            return null;
        }

        /**
         * Handles logic for infinite scroll state updates.
         * @param {FixedNavigationManager} manager The manager instance.
         * @param {HTMLElement | null} highlightedMessage The currently highlighted message.
         * @param {number} previousTotalMessages Previous count of messages.
         */
        handleInfiniteScroll(manager, highlightedMessage, previousTotalMessages) {
            // No-op by default
        }

        /**
         * Applies additional highlighting to the message or turn.
         * @param {HTMLElement} messageElement The message element.
         * @param {StyleHandle} styleHandle The style handle.
         */
        applyAdditionalHighlight(messageElement, styleHandle) {
            // No-op by default
        }

        /**
         * Returns platform-specific buttons for the nav console.
         * @param {FixedNavigationManager} manager The manager instance.
         * @param {StyleHandle} styleHandle The style handle.
         * @returns {Element[]} Array of button elements.
         */
        getPlatformSpecificButtons(manager, styleHandle) {
            return [];
        }

        /**
         * Updates the state of platform-specific buttons.
         * @param {HTMLButtonElement} btn The button element.
         * @param {boolean} isAutoScrolling Whether auto-scroll is active.
         * @param {any} autoScrollManager The auto-scroll manager instance.
         */
        updatePlatformSpecificButtonState(btn, isAutoScrolling, autoScrollManager) {
            // No-op by default
        }
    }

    /**
     * @class BaseTimestampAdapter
     * @description Manages timestamp fetching and processing.
     */
    class BaseTimestampAdapter {
        constructor() {
            /** @type {Map<string, Date>} */
            this.cache = new Map();
            this.MAX_CACHE_SIZE = 10000;
        }

        /**
         * Initializes timestamp interception logic.
         */
        init() {
            // No-op by default
        }

        /**
         * Cleans up timestamp interception logic.
         * Does NOT clear the data cache to allow persistence across navigation.
         */
        cleanup() {
            // No-op by default
        }

        /**
         * Checks if the platform has timestamp logic implemented.
         * @returns {boolean} True if supported, default is false.
         */
        hasTimestampLogic() {
            return false;
        }

        /**
         * Adds a timestamp to the persistent cache with LRU logic.
         * @param {string} id
         * @param {Date} date
         */
        addTimestamp(id, date) {
            if (this.cache.size >= this.MAX_CACHE_SIZE) {
                const oldestKey = this.cache.keys().next().value;
                this.cache.delete(oldestKey);
            }
            this.cache.set(id, date);
        }

        /**
         * Retrieves a timestamp from the persistent cache.
         * @param {string} id
         * @returns {Date | undefined}
         */
        getTimestamp(id) {
            return this.cache.get(id);
        }
    }

    /**
     * @class BaseUIManagerAdapter
     * @description Manages general UI positioning.
     */
    class BaseUIManagerAdapter {
        /**
         * Ensures the settings button is correctly placed in the DOM.
         * @param {CustomSettingsButton} settingsButton The button component.
         * @throws {Error} Must be implemented by subclasses.
         */
        ensureButtonPlacement(settingsButton) {
            throw new Error('ensureButtonPlacement must be implemented by the platform adapter.');
        }
    }

    // =================================================================================
    // SECTION: Platform Configuration & Constants Loader
    // =================================================================================

    /**
     * Identify the current platform based on the hostname.
     * The implementation uses function hoisting and is defined at the bottom of the file.
     * @returns {string | null}
     */
    const PLATFORM = identifyPlatform();

    if (!PLATFORM) {
        console.warn(`${APPID} Unsupported platform. Script execution stopped.`);
        return;
    }

    // Load platform-specific definitions using factory functions.
    // These functions are defined at the bottom of the file to keep the entry point clean.
    let defs = null;
    switch (PLATFORM) {
        case PLATFORM_DEFS.CHATGPT.NAME:
            defs = defineChatGPTValues();
            break;
        case PLATFORM_DEFS.GEMINI.NAME:
            defs = defineGeminiValues();
            break;
    }

    if (!defs) {
        console.error(`${APPID} Failed to load definitions for platform: ${PLATFORM}`);
        return;
    }

    // Expand definitions into the current scope.
    // This allows subsequent common code to use these constants without modification.
    const { CONSTANTS, SITE_STYLES, PlatformAdapters } = defs;

    // =================================================================================
    // SECTION: Logging Utility
    // Description: Centralized logging interface for consistent log output across modules.
    //              Handles log level control, message formatting, and console API wrapping.
    // =================================================================================

    class Logger {
        /** @property {object} levels - Defines the numerical hierarchy of log levels. */
        static levels = {
            error: 0,
            warn: 1,
            info: 2,
            log: 3,
            debug: 4,
        };
        /** @property {string} level - The current active log level. */
        static level = 'log'; // Default level

        /**
         * Defines the available badge styles.
         * @property {object} styles
         */
        static styles = {
            BASE: 'color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
            RED: 'background: #dc3545;',
            YELLOW: 'background: #ffc107; color: black;',
            GREEN: 'background: #28a745;',
            BLUE: 'background: #007bff;',
            GRAY: 'background: #6c757d;',
            ORANGE: 'background: #fd7e14;',
            PINK: 'background: #e83e8c;',
            PURPLE: 'background: #6f42c1;',
            CYAN: 'background: #17a2b8; color: black;',
            TEAL: 'background: #20c997; color: black;',
        };

        /**
         * Maps log levels to default badge styles.
         * @private
         */
        static _defaultStyles = {
            error: this.styles.RED,
            warn: this.styles.YELLOW,
            info: this.styles.BLUE,
            log: this.styles.GREEN,
            debug: this.styles.GRAY,
        };

        /**
         * Sets the current log level.
         * @param {string} level The new log level. Must be one of 'error', 'warn', 'info', 'log', 'debug'.
         */
        static setLevel(level) {
            if (Object.prototype.hasOwnProperty.call(this.levels, level)) {
                this.level = level;
            } else {
                // Use default style (empty string) for the badge
                this._out('warn', 'INVALID LEVEL', '', `Invalid log level "${level}". Valid levels are: ${Object.keys(this.levels).join(', ')}. Level not changed.`);
            }
        }

        /**
         * Internal method to output logs if the level permits.
         * @private
         * @param {string} level - The log level ('error', 'warn', 'info', 'log', 'debug').
         * @param {string} badgeText - The text inside the badge. If empty, no badge is shown.
         * @param {string} badgeStyle - The background-color style (from Logger.styles). If empty, uses default.
         * @param {...any} args - The messages to log.
         */
        static _out(level, badgeText, badgeStyle, ...args) {
            if (this.levels[this.level] >= this.levels[level]) {
                const consoleMethod = console[level] || console.log;

                if (badgeText !== '') {
                    // Badge mode: Use %c formatting
                    let style = badgeStyle;
                    if (style === '') {
                        style = this._defaultStyles[level] || this.styles.GRAY;
                    }
                    const combinedStyle = `${this.styles.BASE} ${style}`;

                    consoleMethod(
                        `%c${LOG_PREFIX}%c %c${badgeText}%c`,
                        'font-weight: bold;', // Style for the prefix
                        'color: inherit;', // Reset for space
                        combinedStyle, // Style for the badge
                        'color: inherit;', // Reset for the rest of the message
                        ...args
                    );
                } else {
                    // No badge mode: Direct output for better object inspection
                    consoleMethod(LOG_PREFIX, ...args);
                }
            }
        }

        /**
         * Internal method to start a log group if the level permits (debug or higher).
         * @private
         * @param {'group'|'groupCollapsed'} method - The console method to use.
         * @param {string} badgeText
         * @param {string} badgeStyle
         * @param {...any} args
         */
        static _groupOut(method, badgeText, badgeStyle, ...args) {
            if (this.levels[this.level] >= this.levels.debug) {
                const consoleMethod = console[method];

                if (badgeText !== '') {
                    let style = badgeStyle;
                    if (style === '') {
                        style = this.styles.GRAY;
                    }
                    const combinedStyle = `${this.styles.BASE} ${style}`;

                    consoleMethod(`%c${LOG_PREFIX}%c %c${badgeText}%c`, 'font-weight: bold;', 'color: inherit;', combinedStyle, 'color: inherit;', ...args);
                } else {
                    consoleMethod(LOG_PREFIX, ...args);
                }
            }
        }

        /**
         * @param {string} badgeText
         * @param {string} badgeStyle
         * @param {...any} args
         */
        static error(badgeText, badgeStyle, ...args) {
            this._out('error', badgeText, badgeStyle, ...args);
        }

        /**
         * @param {string} badgeText
         * @param {string} badgeStyle
         * @param {...any} args
         */
        static warn(badgeText, badgeStyle, ...args) {
            this._out('warn', badgeText, badgeStyle, ...args);
        }

        /**
         * @param {string} badgeText
         * @param {string} badgeStyle
         * @param {...any} args
         */
        static info(badgeText, badgeStyle, ...args) {
            this._out('info', badgeText, badgeStyle, ...args);
        }

        /**
         * @param {string} badgeText
         * @param {string} badgeStyle
         * @param {...any} args
         */
        static log(badgeText, badgeStyle, ...args) {
            this._out('log', badgeText, badgeStyle, ...args);
        }

        /**
         * Logs messages for debugging. Only active in 'debug' level.
         * @param {string} badgeText
         * @param {string} badgeStyle
         * @param {...any} args
         */
        static debug(badgeText, badgeStyle, ...args) {
            this._out('debug', badgeText, badgeStyle, ...args);
        }

        /**
         * Starts a timer for performance measurement. Only active in 'debug' level.
         * @param {string} label The label for the timer.
         */
        static time(label) {
            if (this.levels[this.level] >= this.levels.debug) {
                console.time(`${LOG_PREFIX} ${label}`);
            }
        }

        /**
         * Ends a timer and logs the elapsed time. Only active in 'debug' level.
         * @param {string} label The label for the timer, must match the one used in time().
         */
        static timeEnd(label) {
            if (this.levels[this.level] >= this.levels.debug) {
                console.timeEnd(`${LOG_PREFIX} ${label}`);
            }
        }

        /**
         * Starts a log group. Only active in 'debug' level.
         * @param {string} badgeText
         * @param {string} badgeStyle
         * @param {...any} args The title for the log group.
         */
        static group(badgeText, badgeStyle, ...args) {
            this._groupOut('group', badgeText, badgeStyle, ...args);
        }

        /**
         * Starts a collapsed log group. Only active in 'debug' level.
         * @param {string} badgeText
         * @param {string} badgeStyle
         * @param {...any} args The title for the log group.
         */
        static groupCollapsed(badgeText, badgeStyle, ...args) {
            this._groupOut('groupCollapsed', badgeText, badgeStyle, ...args);
        }

        /**
         * Closes the current log group. Only active in 'debug' level.
         * @returns {void}
         */
        static groupEnd() {
            if (this.levels[this.level] >= this.levels.debug) {
                console.groupEnd();
            }
        }
    }

    // Alias for ease of use
    const LOG_STYLES = Logger.styles;

    /**
     * @description A lightweight performance monitor to track event frequency.
     * Only active when Logger.level is set to 'debug'.
     */
    const PerfMonitor = {
        _events: {},
        /**
         * Logs the frequency of an event, throttled by a specified delay.
         * @param {string} key A unique key for the event to track.
         * @param {number} delay The time window in milliseconds to aggregate calls.
         */
        throttleLog(key, delay) {
            if (Logger.levels[Logger.level] < Logger.levels.debug) {
                return;
            }

            const now = Date.now();
            if (!this._events[key]) {
                this._events[key] = { count: 1, startTime: now };
                return;
            }

            this._events[key].count++;

            if (now - this._events[key].startTime >= delay) {
                const callsPerSecond = (this._events[key].count / ((now - this._events[key].startTime) / 1000)).toFixed(2);
                // Use Logger.debug to ensure the output is prefixed and controlled.
                Logger.debug('PerfMonitor', LOG_STYLES.GRAY, `${key}: ${this._events[key].count} calls in ${now - this._events[key].startTime}ms (${callsPerSecond} calls/sec)`);
                delete this._events[key];
            }
        },
        /**
         * Resets all performance counters.
         */
        reset() {
            this._events = {};
        },
    };

    // =================================================================================
    // SECTION: Execution Guard
    // Description: Prevents the script from being executed multiple times per page.
    // =================================================================================

    class ExecutionGuard {
        // A shared key for all scripts from the same author to avoid polluting the window object.
        static #GUARD_KEY = `__${OWNERID}_guard__`;
        // A specific key for this particular script.
        static #APP_KEY = `${APPID}_executed`;

        /**
         * Checks if the script has already been executed on the page.
         * @returns {boolean} True if the script has run, otherwise false.
         */
        static hasExecuted() {
            return window[this.#GUARD_KEY]?.[this.#APP_KEY] || false;
        }

        /**
         * Sets the flag indicating the script has now been executed.
         */
        static setExecuted() {
            window[this.#GUARD_KEY] = window[this.#GUARD_KEY] || {};
            window[this.#GUARD_KEY][this.#APP_KEY] = true;
        }
    }

    // =================================================================================
    // SECTION: Declarative Style Mapper
    // Description: Single source of truth for all theme-driven style definitions.
    // This section contains the mapping definitions between configuration properties
    // and CSS variables.
    // The ThemeManager processes these definitions to update CSS variables at runtime.
    // =================================================================================

    /**
     * @param {string} actor - 'user' or 'assistant'
     * @returns {object[]} An array of style definition objects for the given actor.
     */
    function createActorStyleDefinitions(actor) {
        const actorUpper = actor.toUpperCase();
        return [
            {
                configKey: `${actor}.name`,
                fallbackKey: `platforms.${PLATFORM}.defaultSet.${actor}.name`,
                cssVar: CSS_VARS[`${actorUpper}_NAME`],
                transformer: (value) => (value ? `'${value.replace(/'/g, "\\'")}'` : null),
            },
            // Display control variable for Avatar Name
            {
                configKey: `${actor}.name`,
                fallbackKey: `platforms.${PLATFORM}.defaultSet.${actor}.name`,
                cssVar: CSS_VARS[`${actorUpper}_NAME_DISPLAY`],
                transformer: (value) => (value ? 'block' : 'none'),
            },
            {
                configKey: `${actor}.icon`,
                fallbackKey: `platforms.${PLATFORM}.defaultSet.${actor}.icon`,
                cssVar: CSS_VARS[`${actorUpper}_ICON`],
            },
            // Display control variable for Avatar Icon
            {
                configKey: `${actor}.icon`,
                fallbackKey: `platforms.${PLATFORM}.defaultSet.${actor}.icon`,
                cssVar: CSS_VARS[`${actorUpper}_ICON_DISPLAY`],
                transformer: (value) => (value ? 'block' : 'none'),
            },
            {
                configKey: `${actor}.standingImageUrl`,
                fallbackKey: `platforms.${PLATFORM}.defaultSet.${actor}.standingImageUrl`,
                cssVar: CSS_VARS[`${actorUpper}_STANDING_IMAGE`],
            },
            {
                configKey: `${actor}.textColor`,
                fallbackKey: `platforms.${PLATFORM}.defaultSet.${actor}.textColor`,
                cssVar: CSS_VARS[`${actorUpper}_TEXT_COLOR`],
            },
            {
                configKey: `${actor}.font`,
                fallbackKey: `platforms.${PLATFORM}.defaultSet.${actor}.font`,
                cssVar: CSS_VARS[`${actorUpper}_FONT`],
            },
            {
                configKey: `${actor}.bubbleBackgroundColor`,
                fallbackKey: `platforms.${PLATFORM}.defaultSet.${actor}.bubbleBackgroundColor`,
                cssVar: CSS_VARS[`${actorUpper}_BUBBLE_BG`],
            },
            {
                configKey: `${actor}.bubblePadding`,
                fallbackKey: `platforms.${PLATFORM}.defaultSet.${actor}.bubblePadding`,
                cssVar: CSS_VARS[`${actorUpper}_BUBBLE_PADDING`],
            },
            {
                configKey: `${actor}.bubbleBorderRadius`,
                fallbackKey: `platforms.${PLATFORM}.defaultSet.${actor}.bubbleBorderRadius`,
                cssVar: CSS_VARS[`${actorUpper}_BUBBLE_RADIUS`],
            },
            {
                configKey: `${actor}.bubbleMaxWidth`,
                fallbackKey: `platforms.${PLATFORM}.defaultSet.${actor}.bubbleMaxWidth`,
                cssVar: CSS_VARS[`${actorUpper}_BUBBLE_MAXWIDTH`],
            },
        ];
    }

    const STYLE_DEFINITIONS = {
        user: createActorStyleDefinitions(CONSTANTS.INTERNAL_ROLES.USER),
        assistant: createActorStyleDefinitions(CONSTANTS.INTERNAL_ROLES.ASSISTANT),
        window: [
            {
                configKey: 'window.backgroundColor',
                fallbackKey: `platforms.${PLATFORM}.defaultSet.window.backgroundColor`,
                cssVar: CSS_VARS.WINDOW_BG_COLOR,
            },
            {
                configKey: 'window.backgroundImageUrl',
                fallbackKey: `platforms.${PLATFORM}.defaultSet.window.backgroundImageUrl`,
                cssVar: CSS_VARS.WINDOW_BG_IMAGE,
                transformer: (value) => (value ? value : 'none'),
            },
            {
                configKey: 'window.backgroundSize',
                fallbackKey: `platforms.${PLATFORM}.defaultSet.window.backgroundSize`,
                cssVar: CSS_VARS.WINDOW_BG_SIZE,
            },
            {
                configKey: 'window.backgroundPosition',
                fallbackKey: `platforms.${PLATFORM}.defaultSet.window.backgroundPosition`,
                cssVar: CSS_VARS.WINDOW_BG_POS,
            },
            {
                configKey: 'window.backgroundRepeat',
                fallbackKey: `platforms.${PLATFORM}.defaultSet.window.backgroundRepeat`,
                cssVar: CSS_VARS.WINDOW_BG_REPEAT,
            },
        ],
        inputArea: [
            {
                configKey: 'inputArea.backgroundColor',
                fallbackKey: `platforms.${PLATFORM}.defaultSet.inputArea.backgroundColor`,
                cssVar: CSS_VARS.INPUT_BG,
            },
            {
                configKey: 'inputArea.backgroundColor',
                fallbackKey: `platforms.${PLATFORM}.defaultSet.inputArea.backgroundColor`,
                cssVar: CSS_VARS.INPUT_FIELD_BG,
                // If background color is set, make the inner field transparent to show it.
                // Otherwise leave null to keep default styles.
                transformer: (value) => (value ? 'transparent' : null),
            },
            {
                configKey: 'inputArea.textColor',
                fallbackKey: `platforms.${PLATFORM}.defaultSet.inputArea.textColor`,
                cssVar: CSS_VARS.INPUT_COLOR,
            },
        ],
    };

    // Flatten the structured definitions into a single array for easier iteration.
    const ALL_STYLE_DEFINITIONS = Object.values(STYLE_DEFINITIONS).flat();

    // =================================================================================
    // SECTION: Event-Driven Architecture (Pub/Sub)
    // Description: A event bus for decoupled communication between classes.
    // =================================================================================

    const EventBus = {
        events: {},
        uiWorkQueue: [],
        isUiWorkScheduled: false,
        _logAggregation: {},
        // prettier-ignore
        _aggregatedEvents: new Set([
            EVENTS.RAW_MESSAGE_ADDED,
            EVENTS.AVATAR_INJECT,
            EVENTS.MESSAGE_COMPLETE,
            EVENTS.TURN_COMPLETE,
            EVENTS.SIDEBAR_LAYOUT_CHANGED,
            EVENTS.VISIBILITY_RECHECK,
            EVENTS.UI_REPOSITION,
            EVENTS.INPUT_AREA_RESIZED,
            EVENTS.TIMESTAMP_ADDED,
            EVENTS.CHAT_CONTENT_WIDTH_UPDATED,
            EVENTS.NAVIGATION,
            EVENTS.NAVIGATION_START,
        ]),
        _aggregationDelay: 500, // ms

        /**
         * Subscribes a listener to an event using a unique key.
         * If a subscription with the same event and key already exists, it will be overwritten.
         * @param {string} event The event name.
         * @param {Function} listener The callback function.
         * @param {string} key A unique key for this subscription (e.g., 'ClassName.methodName').
         */
        subscribe(event, listener, key) {
            if (!key) {
                Logger.error('', '', 'EventBus.subscribe requires a unique key.');
                return;
            }
            if (!this.events[event]) {
                this.events[event] = new Map();
            }
            this.events[event].set(key, listener);
        },
        /**
         * Subscribes a listener that will be automatically unsubscribed after one execution.
         * @param {string} event The event name.
         * @param {Function} listener The callback function.
         * @param {string} key A unique key for this subscription.
         */
        once(event, listener, key) {
            if (!key) {
                Logger.error('', '', 'EventBus.once requires a unique key.');
                return;
            }
            const onceListener = (...args) => {
                this.unsubscribe(event, key);
                listener(...args);
            };
            this.subscribe(event, onceListener, key);
        },
        /**
         * Unsubscribes a listener from an event using its unique key.
         * @param {string} event The event name.
         * @param {string} key The unique key used during subscription.
         */
        unsubscribe(event, key) {
            if (!this.events[event] || !key) {
                return;
            }
            this.events[event].delete(key);
            if (this.events[event].size === 0) {
                delete this.events[event];
            }
        },
        /**
         * Publishes an event, calling all subscribed listeners with the provided data.
         * @param {string} event The event name.
         * @param {...any} args The data to pass to the listeners.
         */
        publish(event, ...args) {
            if (!this.events[event]) {
                return;
            }

            if (Logger.levels[Logger.level] >= Logger.levels.debug) {
                // --- Aggregation logic START ---
                if (this._aggregatedEvents.has(event)) {
                    if (!this._logAggregation[event]) {
                        this._logAggregation[event] = { timer: null, count: 0 };
                    }
                    const aggregation = this._logAggregation[event];
                    aggregation.count++;

                    clearTimeout(aggregation.timer);
                    aggregation.timer = setTimeout(() => {
                        const finalCount = this._logAggregation[event]?.count || 0;
                        if (finalCount > 0) {
                            Logger.debug('EventBus', LOG_STYLES.PURPLE, `Event Published: ${event} (x${finalCount})`);
                        }
                        delete this._logAggregation[event];
                    }, this._aggregationDelay);

                    // Execute subscribers for the aggregated event, but without the verbose individual logs.
                    [...this.events[event].values()].forEach((listener) => {
                        try {
                            listener(...args);
                        } catch (e) {
                            Logger.error('', '', `EventBus error in listener for event "${event}":`, e);
                        }
                    });
                    return; // End execution here for aggregated events in debug mode.
                }
                // --- Aggregation logic END ---

                // In debug mode, provide detailed logging for NON-aggregated events.
                const subscriberKeys = [...this.events[event].keys()];

                Logger.groupCollapsed('EventBus', LOG_STYLES.PURPLE, `Event Published: ${event}`);

                if (args.length > 0) {
                    console.log('  - Payload:', ...args);
                } else {
                    console.log('  - Payload: (No data)');
                }

                // Displaying subscribers helps in understanding the event's impact.
                if (subscriberKeys.length > 0) {
                    console.log('  - Subscribers:\n' + subscriberKeys.map((key) => `    > ${key}`).join('\n'));
                } else {
                    console.log('  - Subscribers: (None)');
                }

                // Iterate with keys for better logging
                this.events[event].forEach((listener, key) => {
                    try {
                        // Log which specific subscriber is being executed
                        Logger.debug('', LOG_STYLES.PURPLE, `-> Executing: ${key}`);
                        listener(...args);
                    } catch (e) {
                        // Enhance error logging with the specific subscriber key
                        Logger.error('LISTENER ERROR', LOG_STYLES.RED, `Listener "${key}" failed for event "${event}":`, e);
                    }
                });

                Logger.groupEnd();
            } else {
                // Iterate over a copy of the values in case a listener unsubscribes itself.
                [...this.events[event].values()].forEach((listener) => {
                    try {
                        listener(...args);
                    } catch (e) {
                        Logger.error('LISTENER ERROR', LOG_STYLES.RED, `Listener failed for event "${event}":`, e);
                    }
                });
            }
        },

        /**
         * Queues a function to be executed on the next animation frame.
         * Batches multiple UI updates into a single repaint cycle.
         * @param {Function} workFunction The function to execute.
         */
        queueUIWork(workFunction) {
            this.uiWorkQueue.push(workFunction);
            if (!this.isUiWorkScheduled) {
                this.isUiWorkScheduled = true;
                requestAnimationFrame(this._processUIWorkQueue.bind(this));
            }
        },

        /**
         * @private
         * Processes all functions in the UI work queue.
         */
        _processUIWorkQueue() {
            // Prevent modifications to the queue while processing.
            const queueToProcess = [...this.uiWorkQueue];
            this.uiWorkQueue.length = 0;

            for (const work of queueToProcess) {
                try {
                    work();
                } catch (e) {
                    Logger.error('UI QUEUE ERROR', LOG_STYLES.RED, 'Error in queued UI work:', e);
                }
            }
            this.isUiWorkScheduled = false;
        },
    };

    /**
     * Creates a unique, consistent event subscription key for EventBus.
     * @param {object} context The `this` context of the subscribing class instance.
     * @param {string} eventName The full event name from the EVENTS constant.
     * @returns {string} A key in the format 'ClassName.purpose'.
     */
    function createEventKey(context, eventName) {
        // Extract a meaningful 'purpose' from the event name
        const parts = eventName.split(':');
        const purpose = parts.length > 1 ? parts.slice(1).join('_') : parts[0];

        let contextName = 'UnknownContext';
        if (context && context.constructor && context.constructor.name) {
            contextName = context.constructor.name;
        }
        return `${contextName}.${purpose}`;
    }

    // =================================================================================
    // SECTION: Base Manager
    // Description: Provides common lifecycle and event subscription management.
    // =================================================================================

    /**
     * @typedef {() => void} DisposableFn
     * @typedef {{ dispose: () => void }} DisposableObj
     * @typedef {{ disconnect: () => void }} DisconnectableObj
     * @typedef {{ abort: () => void }} AbortableObj
     * @typedef {{ destroy: () => void }} DestructibleObj
     * @typedef {DisposableFn | DisposableObj | DisconnectableObj | AbortableObj | DestructibleObj} Disposable
     */

    /**
     * @class BaseManager
     * @description Provides common lifecycle and event subscription management capabilities.
     * Implements the Template Method pattern for init/destroy cycles.
     * Manages all resources in a unified Set to ensure strict LIFO disposal and prevent memory leaks.
     */
    class BaseManager {
        constructor() {
            /**
             * @type {Set<Disposable>}
             * Unified storage for all resources. Set preserves insertion order.
             */
            this._disposables = new Set();

            /**
             * @type {Map<string, () => void>}
             * Map to store dispose functions for keyed resources, allowing replacement by key.
             */
            this._keyedDisposables = new Map();

            this.isInitialized = false;
            this.isDestroyed = false;
            /** @type {Promise<void>|null} */
            this._initPromise = null;
            /** @type {AbortController} */
            this._abortController = new AbortController();
        }

        /**
         * Gets the AbortSignal associated with this manager's lifecycle.
         * Aborted when the manager is destroyed.
         * @returns {AbortSignal}
         */
        get signal() {
            return this._abortController.signal;
        }

        /**
         * Registers a resource to be disposed of when the manager is destroyed.
         * @param {Disposable} disposable A function or object with dispose/disconnect/abort/destroy method.
         * @returns {() => void} A function to dispose of the resource early.
         */
        addDisposable(disposable) {
            return this._registerDisposable(disposable);
        }

        /**
         * Initializes the manager.
         * Prevents double initialization and supports async hooks.
         * @param {...any} args Arguments to pass to the hook method.
         * @returns {Promise<void>}
         */
        async init(...args) {
            if (this.isInitialized) return;

            if (this._initPromise) {
                await this._initPromise;
                return;
            }

            this.isDestroyed = false;
            if (this._abortController.signal.aborted) {
                this._abortController = new AbortController();
            }

            this._initPromise = (async () => {
                try {
                    await this._onInit(...args);
                    if (!this.isDestroyed) {
                        this.isInitialized = true;
                    }
                } catch (e) {
                    this.destroy();
                    throw e;
                }
            })();

            try {
                await this._initPromise;
            } finally {
                this._initPromise = null;
            }
        }

        /**
         * Destroys the manager and cleans up resources.
         * Idempotent: safe to call multiple times.
         */
        destroy() {
            if (this.isDestroyed) return;
            this.isDestroyed = true;
            this.isInitialized = false;

            this._abortController.abort();

            // 1. Hook for subclass specific cleanup (protected by try-catch)
            try {
                this._onDestroy();
            } catch (e) {
                Logger.error('BaseManager', '', 'Error in _onDestroy:', e);
            }

            // 2. Dispose all resources in LIFO order
            // Convert Set to Array and reverse to ensure correct dependency teardown order.
            const disposables = Array.from(this._disposables).reverse();
            this._disposables.clear(); // Clear immediately to prevent double disposal
            this._keyedDisposables.clear(); // Clear keyed map

            for (const resource of disposables) {
                this._disposeResource(resource);
            }
        }

        /**
         * Registers a platform-specific listener.
         * @param {string} event
         * @param {Function} callback
         * @returns {() => void} A function to unsubscribe.
         */
        registerPlatformListener(event, callback) {
            return this._subscribe(event, callback);
        }

        /**
         * Registers a one-time platform-specific listener.
         * @param {string} event
         * @param {Function} callback
         * @returns {() => void} A function to unsubscribe (if not already fired).
         */
        registerPlatformListenerOnce(event, callback) {
            return this._subscribeOnce(event, callback);
        }

        /**
         * Manages a dynamic resource by key.
         * Replaces any existing resource registered with the same key.
         * If null is passed as the resource, the existing resource (if any) is disposed and the key is removed; no new resource is registered.
         * @param {string} key Unique identifier.
         * @param {Disposable | null} resource The new resource. Pass null to remove existing without replacing.
         * @returns {() => void} A function to dispose of the resource early.
         */
        manageResource(key, resource) {
            // 1. Dispose of existing resource with the same key, if any
            if (this._keyedDisposables.has(key)) {
                const oldDispose = this._keyedDisposables.get(key);
                if (oldDispose) oldDispose();
                // Ensure it's removed (oldDispose should handle it via wrapper, but for safety)
                this._keyedDisposables.delete(key);
            }

            // 2. Register new resource
            if (resource) {
                // Register with the main set to handle LIFO disposal on destroy
                const actualDispose = this._registerDisposable(resource);

                // Create a wrapper that removes the entry from the map when disposed
                const wrappedDispose = () => {
                    if (this._keyedDisposables.get(key) === wrappedDispose) {
                        this._keyedDisposables.delete(key);
                    }
                    actualDispose();
                };

                this._keyedDisposables.set(key, wrappedDispose);
                return wrappedDispose;
            }
            return () => {};
        }

        /**
         * Manages a dynamic resource created by a factory function.
         * @template {Disposable} T
         * @param {string} key Unique identifier for the resource.
         * @param {() => T} factory A function that returns the resource.
         * @returns {T | null} The created resource, or null if destroyed.
         * @throws {Error} Propagates any error thrown by the factory function.
         */
        manageFactory(key, factory) {
            if (!this.isDestroyed) {
                // 1. Dispose of existing resource with the same key
                if (this._keyedDisposables.has(key)) {
                    const oldDispose = this._keyedDisposables.get(key);
                    if (oldDispose) oldDispose();
                    this._keyedDisposables.delete(key);
                }

                const resource = factory();
                if (resource) {
                    const actualDispose = this._registerDisposable(resource);

                    const wrappedDispose = () => {
                        if (this._keyedDisposables.get(key) === wrappedDispose) {
                            this._keyedDisposables.delete(key);
                        }
                        actualDispose();
                    };

                    this._keyedDisposables.set(key, wrappedDispose);
                    return resource;
                }
            }
            return null;
        }

        /**
         * Hook method for initialization logic.
         * @protected
         * @param {...any} args
         */
        _onInit(...args) {
            // To be implemented by subclasses
        }

        /**
         * Hook method for cleanup logic.
         * @protected
         */
        _onDestroy() {
            // To be implemented by subclasses
        }

        /**
         * Helper to subscribe to EventBus.
         * @protected
         * @param {string} event
         * @param {Function} listener
         * @returns {() => void} A function to unsubscribe.
         */
        _subscribe(event, listener) {
            if (this.isDestroyed) return () => {};

            // Wrap listener to guard against execution after destruction
            const guardedListener = (...args) => {
                if (this.isDestroyed) return;
                listener(...args);
            };

            const baseKey = createEventKey(this, event);
            const listenerName = listener.name || 'anonymous';
            const uniqueSuffix = Math.random().toString(36).substring(2, 7);
            const key = `${baseKey}_${listenerName}_${uniqueSuffix}`;

            EventBus.subscribe(event, guardedListener, key);

            // Create a cleanup task
            const cleanup = () => EventBus.unsubscribe(event, key);
            return this._registerDisposable(cleanup);
        }

        /**
         * Helper to subscribe to EventBus once.
         * @protected
         * @param {string} event
         * @param {Function} listener
         * @returns {() => void} A function to unsubscribe.
         */
        _subscribeOnce(event, listener) {
            if (this.isDestroyed) return () => {};

            // Wrap listener to guard against execution after destruction
            const guardedListener = (...args) => {
                if (this.isDestroyed) return;
                listener(...args);
            };

            const baseKey = createEventKey(this, event);
            const listenerName = listener.name || 'anonymous';
            const uniqueSuffix = Math.random().toString(36).substring(2, 7);
            const key = `${baseKey}_${listenerName}_${uniqueSuffix}`;

            // Define cleanup first to establish dependency chain
            const cleanup = () => EventBus.unsubscribe(event, key);

            // Register disposable immediately to allow using 'const' and avoid TDZ
            const disposeFn = this._registerDisposable(cleanup);

            // Self-cleaning listener wrapper
            const wrappedListener = (...args) => {
                // Execute dispose to remove from manager and avoid memory leaks
                disposeFn();
                guardedListener(...args);
            };

            EventBus.once(event, wrappedListener, key);

            return disposeFn;
        }

        /**
         * Internal helper to register a resource into the Set and return a safe dispose function.
         * @private
         * @param {Disposable} resource
         * @returns {() => void} A function that disposes the resource and removes it from the manager.
         */
        _registerDisposable(resource) {
            if (!resource) return () => {};

            // If already destroyed, dispose immediately and return no-op
            if (this.isDestroyed) {
                this._disposeResource(resource);
                return () => {};
            }

            this._disposables.add(resource);

            let disposed = false;
            // Return an idempotent dispose function
            return () => {
                if (disposed) return;
                disposed = true;
                if (this._disposables.has(resource)) {
                    this._disposables.delete(resource);
                    this._disposeResource(resource);
                }
            };
        }

        /**
         * Helper to safely dispose a resource of various types.
         * Execution priority:
         * 1. Function call
         * 2. AbortController.abort()
         * 3. Observer.disconnect() (Mutation/Resize/Intersection)
         * 4. object.dispose()
         * 5. object.disconnect()
         * 6. object.abort()
         * 7. object.destroy()
         * @private
         * @param {Disposable} disposable
         */
        _disposeResource(disposable) {
            try {
                if (typeof disposable === 'function') {
                    disposable();
                } else if (disposable instanceof AbortController) {
                    disposable.abort();
                } else if (disposable instanceof MutationObserver || disposable instanceof ResizeObserver || (typeof IntersectionObserver !== 'undefined' && disposable instanceof IntersectionObserver)) {
                    disposable.disconnect();
                } else if (this._isDisposableObj(disposable)) {
                    disposable.dispose();
                } else if (this._isDisconnectableObj(disposable)) {
                    disposable.disconnect();
                } else if (this._isAbortableObj(disposable)) {
                    disposable.abort();
                } else if (this._isDestructibleObj(disposable)) {
                    disposable.destroy();
                }
            } catch (e) {
                Logger.warn('BaseManager', '', 'Error disposing resource type:', e);
            }
        }

        // --- Type Guards ---

        /**
         * @param {unknown} obj
         * @returns {obj is DestructibleObj}
         */
        _isDestructibleObj(obj) {
            return typeof obj === 'object' && obj !== null && 'destroy' in obj && typeof (/** @type {{ destroy: unknown }} */ (obj).destroy) === 'function';
        }

        /**
         * @param {unknown} obj
         * @returns {obj is DisposableObj}
         */
        _isDisposableObj(obj) {
            return typeof obj === 'object' && obj !== null && 'dispose' in obj && typeof (/** @type {any} */ (obj).dispose) === 'function';
        }

        /**
         * @param {unknown} obj
         * @returns {obj is DisconnectableObj}
         */
        _isDisconnectableObj(obj) {
            return typeof obj === 'object' && obj !== null && 'disconnect' in obj && typeof (/** @type {any} */ (obj).disconnect) === 'function';
        }

        /**
         * @param {unknown} obj
         * @returns {obj is AbortableObj}
         */
        _isAbortableObj(obj) {
            return typeof obj === 'object' && obj !== null && 'abort' in obj && typeof (/** @type {any} */ (obj).abort) === 'function';
        }
    }

    /**
     * @description Helper object to calculate and apply common standing image layout logic.
     */
    const StandingImageLayout = {
        /**
         * @param {StandingImageManager} instance
         * @param {object} params
         * @param {number} params.assistantAvailableWidth - Width available for assistant image before gap.
         * @param {number} params.userAvailableWidth - Width available for user image before gap.
         * @param {number} params.assistantImgHeight
         * @param {number} params.userImgHeight
         * @param {number} params.windowHeight
         */
        apply(instance, params) {
            const { assistantAvailableWidth, userAvailableWidth, assistantImgHeight, userImgHeight, windowHeight } = params;
            const v = instance.style.vars;
            const rootStyle = document.documentElement.style;

            // Config values can be read here as they don't cause reflow.
            const config = instance.configManager.get();
            const iconSize = instance.configManager.getIconSize();
            const respectAvatarSpace = config.platforms[PLATFORM].options.respect_avatar_space;

            // Resolve current icon/name settings based on the active theme
            const themeSet = instance.themeManager.getThemeSet();
            const defaultSet = config.platforms[PLATFORM].defaultSet;

            // Helper to resolve property (Theme > Default)
            const resolveProp = (actor, prop) => {
                const val = themeSet?.[actor]?.[prop];
                return val !== undefined ? val : defaultSet?.[actor]?.[prop];
            };

            // Determine if avatar space should be reserved for each actor
            const hasUserAvatar = !!resolveProp('user', 'icon') || !!resolveProp('user', 'name');
            const hasAssistantAvatar = !!resolveProp('assistant', 'icon') || !!resolveProp('assistant', 'name');

            const userAvatarGap = respectAvatarSpace && hasUserAvatar ? iconSize + CONSTANTS.UI_SPECS.AVATAR.MARGIN * 2 : 0;
            const assistantAvatarGap = respectAvatarSpace && hasAssistantAvatar ? iconSize + CONSTANTS.UI_SPECS.AVATAR.MARGIN * 2 : 0;

            const assistantWidth = Math.max(0, assistantAvailableWidth - assistantAvatarGap);
            const userWidth = Math.max(0, userAvailableWidth - userAvatarGap);

            rootStyle.setProperty(v.assistantWidth, `${assistantWidth}px`);
            rootStyle.setProperty(v.userWidth, `${userWidth}px`);

            // Masking
            const maskThreshold = CONSTANTS.UI_SPECS.STANDING_IMAGE_MASK_THRESHOLD_PX;
            const maskValue = `linear-gradient(to bottom, transparent 0px, rgb(0 0 0 / 1) 60px, rgb(0 0 0 / 1) 100%)`;

            if (assistantImgHeight >= windowHeight - maskThreshold) {
                rootStyle.setProperty(v.assistantMask, maskValue);
            } else {
                rootStyle.setProperty(v.assistantMask, 'none');
            }

            if (userImgHeight >= windowHeight - maskThreshold) {
                rootStyle.setProperty(v.userMask, maskValue);
            } else {
                rootStyle.setProperty(v.userMask, 'none');
            }
        },
    };

    // =================================================================================
    // SECTION: Style System & Definitions
    // Description: Centralizes all CSS generation logic, class name definitions, and DOM injection mechanics.
    // =================================================================================

    /**
     * @class StyleDefinitions
     * @description Manages pure style definitions, class names, and static CSS templates.
     */
    class StyleDefinitions {
        static ICONS = (() => {
            const COMMON_PROPS = {
                xmlns: 'http://www.w3.org/2000/svg',
                height: '24px',
                viewBox: '0 -960 960 960',
                width: '24px',
                fill: 'currentColor',
            };

            /**
             * Helper to generate a standardized SVG icon definition.
             * @param {string} d - The path data string (d attribute).
             * @param {object} [options] - Optional settings object.
             * @param {object} [options.props] - Attributes for the <svg> element (e.g., className). Merged with COMMON_PROPS.
             * @param {object} [options.pathProps] - Attributes for the inner <path> element (e.g., transform).
             */
            const def = (d, options = {}) => ({
                tag: 'svg',
                props: { ...COMMON_PROPS, ...options.props },
                children: [{ tag: 'path', props: { d, ...options.pathProps } }],
            });

            // prettier-ignore
            return {
                folder: def('M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z'),
                arrowUp: def('M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z'),
                arrowDown: def('M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z'),
                scrollToTop: def('M440-160v-480L280-480l-56-56 256-256 256 256-56 56-160-160v480h-80Zm-200-640v-80h400v80H240Z'),
                scrollToFirst: def('m280-280 200-200 200 200-56 56-144-144-144 144-56-56Zm-40-360v-80h480v80H240Z'),
                scrollToLast: def('M240-200v-80h480v80H240Zm240-160L280-560l56-56 144 144 144-144 56 56-200 200Z'),
                bulkCollapse: def('M440-440v240h-80v-160H200v-80h240Zm160-320v160h160v80H520v-240h80Z', { props: { className: 'icon-collapse' } }),
                bulkExpand: def('M200-200v-240h80v160h160v80H200Zm480-320v-160H520v-80h240v240h-80Z', { props: { className: 'icon-expand' } }),
                list: def('M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z'),
                chatLeft: def('M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z'),
                chatRight: def('M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z', { pathProps: { transform: 'translate(960, 0) scale(-1, 1)' } }),
                settings: def('M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 32.5-156t88-127Q256-817 330-848.5T488-880q80 0 151 27.5t124.5 76q53.5 48.5 85 115T880-518q0 115-70 176.5T640-280h-74q-9 0-12.5 5t-3.5 11q0 12 15 34.5t15 51.5q0 50-27.5 74T480-80Zm0-400Zm-220 40q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120-160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm200 0q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120 160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17ZM480-160q9 0 14.5-5t5.5-13q0-14-15-33t-15-57q0-42 29-67t71-25h70q66 0 113-38.5T800-518q0-121-92.5-201.5T488-800q-136 0-232 93t-96 227q0 133 93.5 226.5T480-160Z'),
            };
        })();

        static COMMON_CLASSES = (() => {
            const prefix = `${APPID}-common`;
            return {
                // Modal Buttons
                modalButton: `${prefix}-btn`,
                primaryBtn: `${prefix}-btn-primary`,
                pushRightBtn: `${prefix}-btn-push-right`,

                // Sliders
                sliderSubgroupControl: `${prefix}-slider-control`,
                sliderDisplay: `${prefix}-slider-display`,
                sliderDefault: 'is-default',
                sliderContainer: `${prefix}-slider-container`,
                compoundSliderContainer: `${prefix}-compound-slider-container`,
                sliderSubgroup: `${prefix}-slider-subgroup`,

                // Toggle Switch
                toggleSwitch: `${prefix}-toggle`,
                toggleSlider: `${prefix}-toggle-slider`,

                // Form Fields
                formField: `${prefix}-form-field`,
                inputWrapper: `${prefix}-input-wrapper`,
                formErrorMsg: `${prefix}-error-msg`,
                compoundFormFieldContainer: `${prefix}-compound-form-container`,
                localFileBtn: `${prefix}-local-file-btn`,
                invalidInput: 'is-invalid',

                // Form Labels & Status
                labelRow: `${prefix}-label-row`,
                statusText: `${prefix}-status-text`,

                // Color Picker Related
                colorFieldWrapper: `${prefix}-color-wrapper`,
                colorSwatch: `${prefix}-color-swatch`,
                colorSwatchChecker: `${prefix}-color-checker`,
                colorSwatchValue: `${prefix}-color-value`,
                colorPickerPopup: `${prefix}-color-popup`,

                // Previews
                previewContainer: `${prefix}-preview-container`,
                previewBubbleWrapper: `${prefix}-preview-bubble-wrapper`,
                previewBubble: `${prefix}-preview-bubble`,
                previewInputArea: `${prefix}-preview-input`,
                previewBackground: `${prefix}-preview-bg`,
                userPreview: `${prefix}-user-preview`,

                // Submenu / Panels (Shared Layouts)
                submenuRow: `${prefix}-row`,
                submenuFieldset: `${prefix}-fieldset`,
                submenuSeparator: `${prefix}-separator`,
                featureGroup: `${prefix}-feature-group`,

                // Notifications & Banners
                warningBanner: `${prefix}-warning-banner`,
                conflictText: `${prefix}-conflict-text`,
                conflictReloadBtnId: `${prefix}-conflict-reload-btn`,
            };
        })();

        static MODAL_CLASSES = (() => {
            const prefix = `${APPID}-modal`;
            return {
                dialog: `${prefix}-dialog`,
                box: `${prefix}-box`,
                header: `${prefix}-header`,
                content: `${prefix}-content`,
                footer: `${prefix}-footer`,
                footerMessage: `${prefix}-footer-message`,
                buttonGroup: `${prefix}-button-group`,
            };
        })();

        static getCommon() {
            const key = 'common';
            // prettier-ignore
            const cssGenerator = (cls) => {
                return [
                    StyleDefinitions._getModalButtonCss(cls),
                    StyleDefinitions._getSliderCss(cls),
                    StyleDefinitions._getToggleSwitchCss(cls),
                    StyleDefinitions._getFormFieldCss(cls),
                    StyleDefinitions._getLocalFileButtonCss(cls),
                    StyleDefinitions._getColorPickerFieldCss(cls),
                    StyleDefinitions._getPreviewCss(cls),
                    StyleDefinitions._getSubmenuCss(cls),
                    StyleDefinitions._getNotificationCss(cls),
                ].join('\n');
            };

            return { key, classes: StyleDefinitions.COMMON_CLASSES, vars: {}, generator: cssGenerator };
        }

        static getStaticBase() {
            const key = 'static-base';
            const prefix = `${APPID}-${key}`;

            const classes = {
                maxWidthActive: `${prefix}-max-width-active`,
            };

            const vars = {
                chatContentMaxWidth: CSS_VARS.CHAT_CONTENT_MAX_WIDTH,
                messageMarginTop: CSS_VARS.MESSAGE_MARGIN_TOP,
            };

            const cssGenerator = (cls) => PlatformAdapters.StyleManager.getStaticCss(cls);

            return { key, classes, vars, generator: cssGenerator };
        }

        static getDynamicRules() {
            const key = 'dynamic-rules';
            // Generator accepts activeVars set to filter outputs
            const cssGenerator = (cls, activeVars) => StyleDefinitions._getThemeBaseCss(cls, activeVars);
            return { key, classes: {}, vars: {}, generator: cssGenerator };
        }

        static getModal() {
            const key = 'modal';
            // prettier-ignore
            const cssGenerator = (cls) => {
                return [
                    StyleDefinitions._getModalDialogCss(cls),
                    StyleDefinitions._getModalLayoutCss(cls),
                ].join('\n');
            };

            return { key, classes: StyleDefinitions.MODAL_CLASSES, vars: {}, generator: cssGenerator };
        }

        static getSettingsButton() {
            const key = 'settings-button';
            const prefix = `${APPID}-${key}`;

            const classes = {
                buttonId: `${prefix}-btn`,
            };

            const cssGenerator = (cls) => {
                const zIndex = SITE_STYLES.Z_INDICES.SETTINGS_BUTTON;
                const palette = SITE_STYLES.PALETTE;
                const animationName = `${prefix}-spin`;

                return `
                @keyframes ${animationName} {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                #${cls.buttonId} {
                    z-index: ${zIndex};
                    background: transparent;
                    border: none;
                    border-radius: 50%;
                    border-color: transparent;
                    position: static;
                    margin: 0 2px 0 0;
                    width: ${palette.settings_btn_width};
                    height: ${palette.settings_btn_height};
                    align-self: center;
                    color: ${palette.settings_btn_color};
                    /* Fixed base styles */
                    font-size: 16px;
                    cursor: pointer;
                    box-shadow: var(--drop-shadow-xs, 0 1px 1px #0000000d);
                    transition: background 0.12s, border-color 0.12s, box-shadow 0.12s, color 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                    pointer-events: auto !important;
                }
                #${cls.buttonId}:hover {
                    background: ${palette.settings_btn_hover_bg};
                    border-color: transparent;
                }
                #${cls.buttonId}.is-loading {
                    color: ${palette.loading_spinner};
                }
                #${cls.buttonId}.is-loading svg {
                    animation: ${animationName} 1.5s linear infinite;
                }
            `;
            };

            return { key, classes, vars: {}, generator: cssGenerator };
        }

        static getSettingsPanel() {
            const key = 'settings-panel';
            const prefix = `${APPID}-${key}`;

            const classes = {
                panel: `${prefix}-container`,
                appliedThemeName: `${prefix}-theme-name`,

                // Layout Helpers
                topRow: `${prefix}-top-row`,

                // Feature Group Overrides
                featureGroup: `${prefix}-feature-group`,
            };

            // prettier-ignore
            const cssGenerator = (cls) => {
                return [
                    StyleDefinitions._getSettingsPanelContainerCss(cls),
                    StyleDefinitions._getSettingsPanelContentCss(cls),
                ].join('\n');
            };

            return { key, classes, vars: {}, generator: cssGenerator };
        }

        static getJsonModal() {
            const key = 'json-modal';
            const prefix = `${APPID}-${key}`;
            const modalId = StyleDefinitions.MODAL_CLASSES.dialog;

            const classes = {
                dialogId: modalId,
                // Layout & Components
                jsonEditor: `${prefix}-editor`,
                statusContainer: `${prefix}-status-container`,

                // Button IDs - Managed by StyleManager
                exportBtn: `${prefix}-export-btn`,
                importBtn: `${prefix}-import-btn`,
                cancelBtn: `${prefix}-cancel-btn`,
                saveBtn: `${prefix}-save-btn`,
            };

            const cssGenerator = (cls) => {
                const modal = StyleDefinitions.MODAL_CLASSES;
                const common = StyleDefinitions.COMMON_CLASSES;
                const palette = SITE_STYLES.PALETTE;
                return `
                /* Hide footer message area to allow buttons to take full width, unless conflict text is present */
                #${modalId} .${modal.footerMessage}:not(.${common.conflictText}) {
                    display: none !important;
                }

                /* Explicitly show and style the conflict message when present */
                #${modalId} .${modal.footerMessage}.${common.conflictText} {
                    display: flex !important;
                    width: 100%;
                }
                
                /* Allow the button group to expand and fill the footer */
                #${modalId} .${modal.buttonGroup} {
                    flex-grow: 1;
                    width: 100%;
                }

                /* Allow wrapping in footer to prevent overflow when warning message is displayed */
                #${modalId} .${modal.footer} {
                    flex-wrap: wrap;
                }

                /* Editor Style */
                .${cls.jsonEditor} {
                    width: 100%;
                    height: 200px;
                    box-sizing: border-box;
                    font-family: monospace, Consolas, "Courier New";
                    font-size: 13px;
                    line-height: 1.4;
                    white-space: pre-wrap; /* Enable wrapping */
                    overflow-y: auto;
                    overflow-x: hidden;
                    margin-bottom: 0;
                    border: 1px solid ${palette.border};
                    background: ${palette.input_bg};
                    color: ${palette.text_primary};
                    border-radius: 4px;
                    resize: none !important;
                    padding: 8px;
                }
                .${cls.jsonEditor}:focus {
                    outline: 1px solid ${palette.accent_text};
                }

                /* Status container specific style */
                .${cls.statusContainer} {
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-top: 6px;
                    font-size: 0.85em;
                }
                
                /* Mapped from UI Schema className */
                .${prefix}-form-field {
                    width: 100%;
                }
                .status-msg-display {
                    flex: 1;
                    margin-right: 8px;
                    min-height: 1.2em;
                    /* Color is handled dynamically */
                }
                .size-info-display {
                    white-space: nowrap;
                    text-align: right;
                    /* Color is handled dynamically */
                }
            `;
            };

            return { key, classes, vars: {}, generator: cssGenerator };
        }

        static getThemeModal() {
            const key = 'theme-modal';
            const prefix = `${APPID}-${key}`;

            const classes = {
                dialogId: `${prefix}-dialog`,
                // Layout Containers
                headerControls: `${prefix}-header-controls`,
                headerRow: `${prefix}-header-row`,
                renameArea: `${prefix}-rename-area`,
                actionArea: `${prefix}-action-area`,

                // Content Areas
                content: `${prefix}-content`,
                generalSettings: `${prefix}-general-settings`,
                scrollableArea: `${prefix}-scrollable-area`,
                grid: `${prefix}-grid`,

                // Components
                separator: `${prefix}-separator`,
                moveBtn: `${prefix}-move-btn`,

                // Delete Confirm Group
                deleteConfirmGroup: `${prefix}-delete-confirm-group`,
                deleteConfirmLabel: `${prefix}-delete-confirm-label`,
                deleteConfirmBtnYes: `${prefix}-delete-confirm-btn-yes`,

                // Input wrappers
                renameInput: `${prefix}-rename-input`,
                themeSelect: `${prefix}-select`,

                // Action Buttons IDs
                renameBtn: `${prefix}-rename-btn`,
                upBtn: `${prefix}-up-btn`,
                downBtn: `${prefix}-down-btn`,
                newBtn: `${prefix}-new-btn`,
                copyBtn: `${prefix}-copy-btn`,
                deleteBtn: `${prefix}-delete-btn`,
                renameOkBtn: `${prefix}-rename-ok-btn`,
                renameCancelBtn: `${prefix}-rename-cancel-btn`,
                deleteConfirmBtn: `${prefix}-delete-confirm-btn`,
                deleteCancelBtn: `${prefix}-delete-cancel-btn`,

                // Modal Footer Buttons IDs
                saveBtn: `${prefix}-save-btn`,
                applyBtn: `${prefix}-apply-btn`,
                cancelBtn: `${prefix}-cancel-btn`,

                // Container IDs
                mainActionsId: `${prefix}-actions-main`,
                renameActionsId: `${prefix}-actions-rename`,
            };

            // prettier-ignore
            const cssGenerator = (cls) => {
                return [
                    StyleDefinitions._getThemeModalContentLayoutCss(cls),
                    StyleDefinitions._getThemeModalControlsCss(cls),
                    StyleDefinitions._getThemeModalResponsiveCss(cls),
                ].join('\n');
            };

            return { key, classes, vars: {}, generator: cssGenerator };
        }

        static getColorPicker() {
            const key = 'color-picker';
            const prefix = `${APPID}-${key}`;

            const classes = {
                picker: `${prefix}-container`,
                svPlane: `${prefix}-sv-plane`,
                svThumb: `${prefix}-sv-thumb`,
                sliderGroup: `${prefix}-slider-group`,
                sliderTrack: `${prefix}-slider-track`,
                hueTrack: `${prefix}-hue-track`,
                alphaCheckerboard: `${prefix}-alpha-checkerboard`,
                gradientWhite: `${prefix}-gradient-white`,
                gradientBlack: `${prefix}-gradient-black`,
                // Helper class for the popup wrapper to handle positioning context
                colorPickerPopup: `${prefix}-popup`,
            };

            // prettier-ignore
            const cssGenerator = (cls) => {
                return [
                    StyleDefinitions._getColorPickerPopupCss(cls),
                    StyleDefinitions._getColorPickerControlsCss(cls),
                ].join('\n');
            };

            return { key, classes, vars: {}, generator: cssGenerator };
        }

        static getToast() {
            const key = 'toast';
            const prefix = `${APPID}-${key}`;

            const classes = {
                container: `${prefix}-container`,
                visible: 'is-visible',
                cancelBtn: `${prefix}-cancel-btn`,
            };

            const cssGenerator = (cls) => {
                const zIndex = SITE_STYLES.Z_INDICES.TOAST;
                return `
                    .${cls.container} {
                        position: fixed;
                        top: 30%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        z-index: ${zIndex};
                        background-color: rgb(255 165 0 / 0.9);
                        color: #ffffff;
                        padding: 15px 25px;
                        border-radius: 12px;
                        border: 1px solid #ffa000;
                        box-shadow: 0 6px 20px rgb(0 0 0 / 0.2);
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        font-size: 1.1em;
                        font-weight: bold;
                        opacity: 0;
                        transition: opacity 0.4s ease, transform 0.4s ease;
                        pointer-events: none;
                        white-space: nowrap;
                    }
                    .${cls.container}.${cls.visible} {
                        opacity: 1;
                        transform: translate(-50%, 0);
                        pointer-events: auto;
                    }
                    .${cls.cancelBtn} {
                        background: rgb(255 255 255 / 0.2);
                        color: #ffffff;
                        border: none;
                        padding: 8px 15px;
                        margin-left: 10px;
                        cursor: pointer;
                        font-weight: bold;
                        border-radius: 6px;
                        transition: background-color 0.2s ease;
                    }
                    .${cls.cancelBtn}:hover {
                        background-color: rgb(255 255 255 / 0.3);
                    }
                `;
            };

            return { key, classes, vars: {}, generator: cssGenerator };
        }

        static getFixedNav() {
            const key = 'fixed-nav';
            const prefix = `${APPID}-${key}`;

            // 1. Define the class map (Source of Truth)
            const classes = {
                // IDs
                consoleId: `${prefix}-console`,
                bulkCollapseBtnId: `${prefix}-bulk-collapse-btn`,
                autoscrollBtnId: `${prefix}-autoscroll-btn`,

                // Classes
                console: `${prefix}-console`,
                unpositioned: `${prefix}-unpositioned`,
                hidden: `${prefix}-hidden`,
                group: `${prefix}-group`,
                separator: `${prefix}-separator`,
                counter: `${prefix}-counter`,
                counterCurrent: `${prefix}-counter-current`,
                counterTotal: `${prefix}-counter-total`,
                btn: `${prefix}-btn`,
                btnAccent: `${prefix}-btn-accent`,
                btnDanger: `${prefix}-btn-danger`,
                roleBtn: `${prefix}-role-btn`,
                jumpInput: `${prefix}-jump-input`,
                highlightMessage: `${prefix}-highlight-message`,
                highlightTurn: `${prefix}-highlight-turn`,

                // Role Colors
                roleTotal: `${prefix}-role-total`,
                roleUser: `${prefix}-role-user`,
                roleAssistant: `${prefix}-role-assistant`,

                // Helpers
                isHidden: 'is-hidden',
            };

            // 2. CSS Generator using the class map
            // prettier-ignore
            const cssGenerator = (cls) => {
                return [
                    StyleDefinitions._getFixedNavContainerCss(cls),
                    StyleDefinitions._getFixedNavContentCss(cls),
                    StyleDefinitions._getFixedNavHighlightCss(cls),
                ].join('\n');
            };

            return { key, classes, vars: {}, generator: cssGenerator };
        }

        static getJumpList() {
            const key = 'jump-list';
            const prefix = `${APPID}-${key}`;

            const classes = {
                // IDs
                containerId: `${prefix}-container`,
                listId: `${prefix}-list`,
                previewId: `${prefix}-preview`,

                // Classes
                scrollbox: `${prefix}-scrollbox`,
                filterContainer: `${prefix}-filter-container`,
                filter: `${prefix}-filter`,
                filterRegexValid: 'is-regex-valid',
                modeLabel: `${prefix}-mode-label`,
                modeString: 'is-string',
                modeRegex: 'is-regex',
                modeInvalid: 'is-regex-invalid',
                current: 'is-current',
                focused: 'is-focused',
                userItem: 'user-item',
                asstItem: 'assistant-item',
                visible: 'is-visible',
                expandDown: 'expand-down',
            };

            // prettier-ignore
            const cssGenerator = (cls) => {
                return [
                    StyleDefinitions._getJumpListContainerCss(cls),
                    StyleDefinitions._getJumpListListCss(cls),
                    StyleDefinitions._getJumpListPreviewCss(cls),
                ].join('\n');
            };

            return { key, classes, vars: {}, generator: cssGenerator };
        }

        static getTimestamp() {
            const key = 'timestamp';
            const prefix = `${APPID}-${key}`;
            const classes = {
                container: `${prefix}-container`,
                assistant: `${prefix}-assistant`,
                user: `${prefix}-user`,
                text: `${prefix}-text`,
                hidden: `${prefix}-hidden`,
            };

            const cssGenerator = (cls) => `
                .${cls.container} {
                    font-size: 10px;
                    line-height: 1.2;
                    padding: 0;
                    margin: 0;                    
                    color: rgb(255 255 255 / 0.7);
                    border-radius: 4px;
                    white-space: pre;
                    display: flex;
                    position: absolute;
                    top: -20px; /* Align vertically with the 24px collapse button */
                }
                .${cls.container}.${cls.assistant} {
                    left: 30px; /* (button left 4px + width 24px + margin 2px) */
                }
                .${cls.container}.${cls.user} {
                    right: 30px; /* (button right 4px + width 24px + margin 2px) */
                }
                .${cls.text} {
                    background-color: rgb(0 0 0 / 0.4);
                    padding: 0px 4px;
                    border-radius: 4px;
                    pointer-events: none;
                }
                .${cls.hidden} {
                    display: none !important;
                }
            `;
            return { key, classes, vars: {}, generator: cssGenerator };
        }

        static getMessageNumber() {
            const key = 'message-number';
            const prefix = `${APPID}-${key}`;
            const classes = {
                parent: `${prefix}-parent`,
                number: `${prefix}-text`,
                assistant: `${prefix}-assistant`,
                user: `${prefix}-user`,
                hidden: `${prefix}-hidden`,
            };

            const cssGenerator = (cls) => `
                .${cls.parent} {
                    position: relative !important;
                }
                .${cls.number} {
                    position: absolute;
                    font-size: 0.6rem;
                    font-weight: bold;
                    color: rgb(255 255 255 / 0.7);
                    background-color: rgb(0 0 0 / 0.4);
                    padding: 0px 4px;
                    border-radius: 4px;
                    line-height: 1.5;
                    pointer-events: none;
                    z-index: 1;
                    white-space: nowrap;
                }
                .${cls.number}.${cls.assistant} {
                    top: -16px;
                    right: 100%;
                    margin-right: 0px;
                }
                .${cls.number}.${cls.user} {
                    top: -16px;
                    left: 100%;
                    margin-left: 0px;
                }
                .${cls.hidden} {
                    display: none !important;
                }
            `;
            return { key, classes, vars: {}, generator: cssGenerator };
        }

        static getStandingImage() {
            const key = 'standing-image';
            const prefix = `${APPID}-${key}`;

            const classes = {
                userImageId: `${prefix}-user`,
                assistantImageId: `${prefix}-assistant`,
            };

            const vars = {
                userImage: CSS_VARS.USER_STANDING_IMAGE,
                assistantImage: CSS_VARS.ASSISTANT_STANDING_IMAGE,
                userWidth: CSS_VARS.STANDING_IMG_USER_WIDTH,
                assistantWidth: CSS_VARS.STANDING_IMG_ASST_WIDTH,
                assistantLeft: CSS_VARS.STANDING_IMG_ASST_LEFT,
                userMask: CSS_VARS.STANDING_IMG_USER_MASK,
                assistantMask: CSS_VARS.STANDING_IMG_ASST_MASK,
                // Specific for ChatGPT layout calculation
                rightSidebarWidth: CSS_VARS.RIGHT_SIDEBAR_WIDTH,
            };

            const cssGenerator = (cls) => {
                const zIndex = SITE_STYLES.Z_INDICES.STANDING_IMAGE;
                return `
                #${cls.userImageId},
                #${cls.assistantImageId} {
                    position: fixed;
                    bottom: 0;
                    height: 100vh;
                    max-height: 100vh;
                    pointer-events: none;
                    z-index: ${zIndex};
                    margin: 0;
                    padding: 0;
                    opacity: 0;
                    transition: opacity 0.3s, background-image 0.3s ease-in-out;
                    background-repeat: no-repeat;
                    background-position: bottom center;
                    background-size: contain;
                }
                #${cls.assistantImageId} {
                    background-image: var(${vars.assistantImage}, none);
                    left: var(${vars.assistantLeft}, 0px);
                    width: var(${vars.assistantWidth}, 0px);
                    max-width: var(${vars.assistantWidth}, 0px);
                    mask-image: var(${vars.assistantMask}, none);
                    -webkit-mask-image: var(${vars.assistantMask}, none);
                }
                #${cls.userImageId} {
                    background-image: var(${vars.userImage}, none);
                    right: 0;
                    width: var(${vars.userWidth}, 0px);
                    max-width: var(${vars.userWidth}, 0px);
                    mask-image: var(${vars.userMask}, none);
                    -webkit-mask-image: var(${vars.userMask}, none);
                }
            `;
            };

            return { key, classes, vars, generator: cssGenerator };
        }

        static getBubbleUI() {
            const key = 'bubble-ui';
            const prefix = `${APPID}-${key}`;

            const classes = {
                // Collapsible
                collapsibleParent: `${prefix}-collapsible`,
                collapsibleContent: `${prefix}-content`,
                collapsibleBtn: `${prefix}-toggle-btn`,

                // Navigation
                navContainer: `${prefix}-nav-container`,
                navButtons: `${prefix}-nav-buttons`,
                navGroupTop: `${prefix}-nav-group-top`,
                navGroupBottom: `${prefix}-nav-group-bottom`,
                navBtn: `${prefix}-nav-btn`,
                navPrev: `${prefix}-nav-prev`,
                navNext: `${prefix}-nav-next`,
                navTop: `${prefix}-nav-top`,

                // States
                hidden: `${prefix}-hidden`,
                collapsed: `${prefix}-collapsed`,
                navParent: `${prefix}-nav-parent`,
                imageOnlyAnchor: `${prefix}-image-only-anchor`,
            };

            const cssGenerator = (cls) => PlatformAdapters.StyleManager.getBubbleCss(cls);

            return { key, classes, vars: {}, generator: cssGenerator };
        }

        static getAvatar() {
            const key = 'avatar';
            const prefix = `${APPID}-${key}`;

            // Define CSS variable names centrally
            const vars = {
                iconSize: CSS_VARS.ICON_SIZE,
                iconMargin: CSS_VARS.ICON_MARGIN,
            };

            const classes = {
                processed: `${prefix}-processed`,
            };

            const cssGenerator = () => PlatformAdapters.Avatar.getCss();

            return { key, classes, vars, generator: cssGenerator };
        }

        static _getModalButtonCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                /* --- Common Modal Buttons --- */
                .${cls.modalButton} {
                    background: ${palette.btn_bg};
                    border: 1px solid ${palette.btn_border};
                    border-radius: var(--radius-md, 5px);
                    color: ${palette.btn_text};
                    cursor: pointer;
                    font-size: 13px;
                    padding: 5px 16px;
                    transition: background 0.12s;
                    min-width: 80px;
                }
                .${cls.modalButton}:hover {
                    background: ${palette.btn_hover_bg} !important;
                    border-color: ${palette.btn_border};
                }
                .${cls.modalButton}:disabled {
                    background: ${palette.btn_bg} !important;
                    cursor: not-allowed;
                    opacity: 0.5;
                }
                /* --- Utility Buttons --- */
                .${cls.primaryBtn} {
                    background-color: #1a73e8 !important;
                    color: #ffffff !important;
                    border: 1px solid transparent !important;
                }
                .${cls.primaryBtn}:hover {
                    background-color: #1557b0 !important;
                }
                .${cls.pushRightBtn} {
                    margin-left: auto !important;
                }
            `;
        }

        static _getSliderCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                /* --- Common Sliders --- */
                .${cls.sliderSubgroupControl} {
                    align-items: center;
                    display: flex;
                    gap: 6px;
                }
                .${cls.sliderSubgroupControl} input[type=range] {
                    flex-grow: 1;
                    min-width: 0;
                }
                .${cls.sliderDisplay} {
                    color: ${palette.slider_display_text};
                    font-family: monospace;
                    min-width: 7ch;
                    text-align: right;
                }
                .${cls.sliderSubgroupControl}.${cls.sliderDefault} .${cls.sliderDisplay} {
                    color: ${palette.label_text};
                }
                .${cls.sliderContainer} {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 4px;
                    margin-top: 8px;
                }
                .${cls.sliderContainer} input[type="range"] {
                    flex-grow: 1;
                    margin: 0;
                }
                .${cls.sliderContainer} label {
                    margin-inline-end: 0;
                    flex-shrink: 1;
                    color: ${palette.text_secondary};
                }
                .${cls.compoundSliderContainer} {
                    display: flex;
                    gap: 16px;
                    margin-top: 4px;
                }
                .${cls.sliderSubgroup} {
                    flex: 1;
                    min-width: 0;
                }
                .${cls.sliderSubgroup} > label {
                    color: ${palette.text_secondary};
                    display: block;
                    font-size: 0.9em;
                    margin-bottom: 4px;
                }
            `;
        }

        static _getToggleSwitchCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                /* --- Toggle Switch --- */
                .${cls.toggleSwitch} {
                    position: relative;
                    display: inline-block;
                    width: 40px;
                    height: 22px;
                    flex-shrink: 0;
                }
                .${cls.toggleSwitch} input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .${cls.toggleSlider} {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: ${palette.toggle_bg_off};
                    transition: .3s;
                    border-radius: 22px;
                }
                .${cls.toggleSlider}:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 3px;
                    bottom: 3px;
                    background-color: ${palette.toggle_knob};
                    transition: .3s;
                    border-radius: 50%;
                }
                .${cls.toggleSwitch} input:checked + .${cls.toggleSlider} {
                    background-color: ${palette.toggle_bg_on};
                }
                .${cls.toggleSwitch} input:checked + .${cls.toggleSlider}:before {
                    transform: translateX(18px);
                }
            `;
        }

        static _getFormFieldCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                /* --- Form Fields & Layout --- */
                .${cls.formField} {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .${cls.formField} > label {
                    color: ${palette.text_secondary};
                    font-size: 0.9em;
                }
                .${cls.labelRow} {
                    display: flex;
                    align-items: baseline;
                    gap: 8px;
                }
                .${cls.labelRow} > label {
                    color: ${palette.text_secondary};
                    font-size: 0.9em;
                    margin: 0;
                }
                .${cls.statusText} {
                    font-size: 0.8em;
                    font-weight: 500;
                    /* No auto margin to keep it next to the label */
                }
                .${cls.inputWrapper} {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .${cls.inputWrapper} input {
                    flex-grow: 1;
                }
                .${cls.formErrorMsg} {
                    color: ${palette.error_text};
                    font-size: 0.8em;
                    margin-top: 2px;
                    white-space: pre-wrap;
                }
                .${cls.compoundFormFieldContainer} {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                
                /* Common Inputs */
                .${cls.formField} input[type="text"], 
                .${cls.formField} textarea, 
                .${cls.formField} select,
                .${cls.submenuRow} select {
                    background: ${palette.input_bg};
                    border: 1px solid ${palette.border};
                    border-radius: 4px;
                    box-sizing: border-box;
                    color: ${palette.text_primary};
                    padding: 6px 8px;
                    width: 100%;
                }
                /* Submenu Row Select Specific Sizing */
                .${cls.submenuRow} select {
                    width: auto;
                    min-width: 120px;
                    max-width: 50%;
                }

                .${cls.formField} input[type="text"].${cls.invalidInput}, 
                .${cls.formField} textarea.${cls.invalidInput} {
                    border-color: ${palette.error_text} !important;
                    outline: 1px solid ${palette.error_text};
                }
                .${cls.formField} textarea {
                    resize: vertical;
                }
            `;
        }

        static _getLocalFileButtonCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                /* --- Local File Button --- */
                .${cls.localFileBtn} {
                    flex-shrink: 0;
                    padding: 4px 6px;
                    height: 32px;
                    line-height: 1;
                    font-size: 16px;
                    background: ${palette.btn_bg};
                    border: 1px solid ${palette.btn_border};
                    border-radius: 4px;
                    cursor: pointer;
                    color: ${palette.btn_text};
                }
                .${cls.localFileBtn}:hover {
                    background: ${palette.btn_hover_bg};
                }
            `;
        }

        static _getColorPickerFieldCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                /* --- Color Picker Fields --- */
                .${cls.colorFieldWrapper} {
                    display: flex;
                    gap: 8px;
                }
                .${cls.colorFieldWrapper} input[type="text"] {
                    flex-grow: 1;
                }
                .${cls.colorSwatch} {
                    background-color: transparent;
                    border: 1px solid ${palette.border};
                    border-radius: 4px;
                    cursor: pointer;
                    flex-shrink: 0;
                    height: 32px;
                    padding: 2px;
                    position: relative;
                    width: 32px;
                }
                .${cls.colorSwatchChecker}, .${cls.colorSwatchValue} {
                    border-radius: 2px;
                    height: auto;
                    inset: 2px;
                    position: absolute;
                    width: auto;
                }
                .${cls.colorSwatchChecker} {
                    background-image: repeating-conic-gradient(#808080 0% 25%, #c0c0c0 0% 50%);
                    background-size: 12px 12px;
                }
                .${cls.colorSwatchValue} {
                    transition: background-color: 0.1s;
                }
            `;
        }

        static _getPreviewCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                /* --- Preview Components --- */
                .${cls.previewContainer} {
                    margin-top: 0;
                }
                .${cls.previewContainer} > label {
                    color: ${palette.text_secondary};
                    display: block;
                    font-size: 0.9em;
                    margin-bottom: 4px;
                }
                .${cls.previewBubbleWrapper} {
                    background-image: repeating-conic-gradient(#cccccc 0% 25%, #a9a9a9 0% 50%);
                    background-size: 20px 20px;
                    border-radius: 4px;
                    box-sizing: border-box;
                    min-height: 80px;
                    overflow: hidden;
                    padding: 16px;
                    text-align: left;
                    width: 100%;
                }
                .${cls.previewBubbleWrapper}.${cls.userPreview} {
                    text-align: right;
                }
                .${cls.previewBubble} {
                    box-sizing: border-box;
                    display: inline-block;
                    text-align: left;
                    transition: all 0.1s linear;
                    word-break: break-all;
                }
                .${cls.previewInputArea} {
                    display: block;
                    width: 75%;
                    margin: 0 auto;
                    padding: 8px;
                    border-radius: 6px;
                    background: ${palette.input_bg};
                    color: ${palette.text_primary};
                    border: 1px solid ${palette.border};
                    transition: all 0.1s linear;
                }
                .${cls.previewBackground} {
                    width: 100%;
                    height: 100%;
                    border-radius: 4px;
                    transition: all 0.1s linear;
                    border: 1px solid ${palette.border};
                }
                .${cls.compoundFormFieldContainer} .${cls.formField} > .${cls.previewBubbleWrapper} {
                    flex-grow: 1;
                }
            `;
        }

        static _getSubmenuCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                /* --- Submenu / Panels --- */
                .${cls.submenuRow} {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-top: 8px;
                }
                .${cls.submenuRow} label {
                    flex-shrink: 0;
                    margin: 0;
                    padding: 0;
                    line-height: 1.5;
                }
                .${cls.submenuFieldset} {
                    border: 1px solid ${palette.border};
                    border-radius: 4px;
                    padding: 8px 12px 12px;
                    margin: 0 0 12px 0;
                    min-width: 0;
                }
                .${cls.submenuFieldset} legend {
                    padding: 0 4px;
                    font-weight: 500;
                    color: ${palette.text_secondary};
                }
                .${cls.submenuSeparator} {
                    border-top: 1px solid ${palette.border_light};
                    margin: 12px 0;
                }
                .${cls.featureGroup} {
                    padding: 8px 0;
                }
                .${cls.featureGroup}:not(:first-child) {
                    border-top: 1px solid ${palette.border_light};
                }
                .${cls.featureGroup} .${cls.submenuRow}:first-child {
                    margin-top: 0;
                }
            `;
        }

        static _getNotificationCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                /* --- Warnings & Notifications --- */
                .${cls.warningBanner} {
                    background-color: var(--bg-danger, #ffdddd);
                    color: var(--text-on-danger, #a00);
                    padding: 8px 12px;
                    font-size: 0.85em;
                    text-align: center;
                    border-radius: 4px;
                    margin: 0 0 12px 0;
                    border: 1px solid var(--border-danger-heavy, #c00);
                    white-space: pre-wrap;
                }
                .${cls.conflictText} {
                    color: ${palette.error_text} !important;
                }
            `;
        }

        static _getModalDialogCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                dialog.${cls.dialog} {
                    padding: 0;
                    border: none;
                    background: transparent;
                    max-width: 100vw;
                    max-height: 100vh;
                    overflow: visible;
                }
                dialog.${cls.dialog}::backdrop {
                    background: rgb(0 0 0 / 0.5);
                    pointer-events: auto;
                }
                .${cls.box} {
                    display: flex;
                    flex-direction: column;
                    background: ${palette.bg};
                    color: ${palette.text_primary};
                    border: 1px solid ${palette.border};
                    border-radius: 8px;
                    box-shadow: 0 4px 16px rgb(0 0 0 / 0.2);
                    max-height: 90vh; /* Limit height to viewport */
                    width: 100%;
                }
            `;
        }

        static _getModalLayoutCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                .${cls.header}, .${cls.footer} {
                    flex-shrink: 0;
                    padding: 12px 16px;
                }
                .${cls.header} {
                    font-size: 1.1em;
                    font-weight: 600;
                    border-bottom: 1px solid ${palette.border};
                }
                .${cls.content} {
                    flex-grow: 1;
                    padding: 0;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                }
                .${cls.footer} {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    border-top: 1px solid ${palette.border};
                }
                .${cls.footerMessage} {
                    flex-grow: 1;
                    font-size: 0.9em;
                }
                .${cls.buttonGroup} {
                    display: flex;
                    gap: 8px;
                }
            `;
        }

        static _getSettingsPanelContainerCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            const zIndex = SITE_STYLES.Z_INDICES.SETTINGS_PANEL;
            return `
                #${cls.panel} {
                    position: fixed;
                    width: min(340px, 95vw);
                    max-height: 85vh;
                    overflow-y: auto;
                    overscroll-behavior: contain;
                    background: ${palette.bg};
                    color: ${palette.text_primary};
                    border-radius: 0.5rem;
                    box-shadow: 0 4px 20px 0 rgb(0 0 0 / 15%);
                    padding: 12px;
                    z-index: ${zIndex};
                    border: 1px solid ${palette.border_medium};
                    font-size: 0.9em;
                }
            `;
        }

        static _getSettingsPanelContentCss(cls) {
            const common = StyleDefinitions.COMMON_CLASSES;
            const palette = SITE_STYLES.PALETTE;
            return `
                #${cls.appliedThemeName} {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .${cls.topRow} {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 12px;
                }
                /* Target the common fieldset within the top row */
                .${cls.topRow} .${common.submenuFieldset} {
                    flex: 1 1 0px;
                    margin-bottom: 0;
                }
                
                /* Target common slider display within the panel */
                .${common.sliderSubgroupControl}.is-default .${common.sliderDisplay} {
                    color: ${palette.text_secondary};
                }

                /* Feature Group Styling */
                .${cls.featureGroup} {
                    padding: 6px 0;
                }
                .${cls.featureGroup}:not(:first-child) {
                    border-top: 1px solid ${palette.border_light};
                }
                /* Target common submenu row within feature group */
                .${cls.featureGroup}.${common.submenuRow} {
                    margin-top: 0;
                }
            `;
        }

        static _getThemeModalContentLayoutCss(cls) {
            const common = StyleDefinitions.COMMON_CLASSES;
            const palette = SITE_STYLES.PALETTE;
            return `
                /* Make the content area expand to fill the modal */
                .${cls.content} {
                  display: flex;
                  flex-direction: column;
                  gap: 16px;
                  height: 100%;
                  min-height: 0;
                  overflow: hidden;
                }

                /* Header Controls Layout */
                .${cls.headerControls} {
                  display: flex;
                  flex-direction: column;
                  gap: 12px;
                  flex-shrink: 0;
                }
                .${cls.headerRow} {
                  display: grid;
                  grid-template-columns: auto 1fr auto;
                  gap: 8px;
                  align-items: center;
                  padding-left: 1.2rem;
                }
                .${cls.headerRow} > label {
                  grid-column: 1;
                  text-align: left;
                  color: ${palette.text_secondary};
                  font-size: 0.9em;
                  white-space: nowrap;
                }
                .${cls.headerRow} > .${cls.renameArea} {
                  grid-column: 2;
                  min-width: 180px;
                }
                .${cls.headerRow} > .${cls.actionArea} {
                  grid-column: 3;
                  display: grid;
                  align-items: center;
                }
                .${cls.actionArea} > * {
                    grid-area: 1 / 1;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                /* Content Areas */
                .${cls.generalSettings} {
                  display: grid;
                  gap: 16px;
                  grid-template-columns: 1fr;
                  transition: opacity 0.2s;
                  flex-shrink: 0;
                }
                .${cls.scrollableArea} {
                  flex-grow: 1;
                  overflow-y: auto;
                  overflow-x: hidden; /* Prevent horizontal scroll */
                  padding: 16px;
                  transition: opacity 0.2s;
                  min-height: 0; /* Enable scrolling */
                }
                .${cls.scrollableArea}:focus {
                  outline: none;
                }
                .${cls.grid} {
                  display: grid;
                  gap: 16px;
                  grid-template-columns: 1fr 1fr;
                }
                @media (max-width: 800px) {
                    .${cls.grid} {
                        grid-template-columns: 1fr !important;
                    }
                }

                /* Separator */
                .${cls.separator} {
                  border: none;
                  border-top: 1px solid ${palette.border};
                  margin: 0;
                  flex-shrink: 0;
                }
                /* Reset separator margins inside fieldset to rely on gap */
                fieldset > .${cls.separator} {
                  margin: 0;
                }

                /* Spacing Overrides for Theme Editor Forms (Scoped to Theme Modal) */
                .${cls.content} .${common.submenuFieldset} {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                /* Reset individual margins to rely on the parent gap */
                .${cls.content} .${common.sliderContainer},
                .${cls.content} .${common.submenuRow},
                .${cls.content} .${common.compoundSliderContainer} {
                    margin-top: 0;
                }
            `;
        }

        static _getThemeModalControlsCss(cls) {
            const common = StyleDefinitions.COMMON_CLASSES;
            const palette = SITE_STYLES.PALETTE;
            return `
                /* Header Inputs Styling */
                #${cls.themeSelect}, #${cls.renameInput} {
                    background: ${palette.input_bg};
                    border: 1px solid ${palette.border};
                    border-radius: 4px;
                    box-sizing: border-box;
                    color: ${palette.text_primary};
                    padding: 6px 8px;
                    width: 100%;
                }

                /* Disabled State */
                .${cls.generalSettings}.is-disabled,
                .${cls.scrollableArea}.is-disabled {
                  pointer-events: none;
                  opacity: 0.5;
                }

                /* Move Buttons (Arrows) */
                .${common.modalButton}.${cls.moveBtn} {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  line-height: 1;
                  min-width: 24px;
                  padding: 4px;
                  height: 24px;
                  width: 24px;
                }

                /* Delete Confirm Group */
                .${cls.deleteConfirmGroup} {
                    display: none;
                }
                .${cls.deleteConfirmGroup}:not([hidden]) {
                  align-items: center;
                  display: flex;
                  gap: 8px;
                }
                .${cls.deleteConfirmLabel} {
                  color: ${palette.danger_text};
                  font-style: italic;
                  margin-right: auto;
                }
                .${cls.deleteConfirmBtnYes} {
                  background-color: ${palette.delete_confirm_btn_bg} !important;
                  color: ${palette.delete_confirm_btn_text} !important;
                }
                .${cls.deleteConfirmBtnYes}:hover {
                  background-color: ${palette.delete_confirm_btn_hover_bg} !important;
                  color: ${palette.delete_confirm_btn_hover_text} !important;
                }
            `;
        }

        static _getThemeModalResponsiveCss(cls) {
            return `
                /* Mobile Responsive Styles */
                @media (max-width: 600px) {
                    .${cls.headerRow} {
                        grid-template-columns: 1fr;
                        gap: 12px;
                        padding-left: 0;
                    }
                    .${cls.headerRow} > label {
                        grid-column: 1;
                        text-align: left;
                    }
                    .${cls.headerRow} > .${cls.renameArea} {
                        grid-column: 1;
                        min-width: 0;
                    }
                    .${cls.headerRow} > .${cls.actionArea} {
                        grid-column: 1;
                    }
                    /* Allow button groups to wrap */
                    .${cls.actionArea} > * {
                        flex-wrap: wrap;
                    }
                }
            `;
        }

        static _getColorPickerPopupCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            const zIndex = SITE_STYLES.Z_INDICES.COLOR_PICKER;
            return `
                /* Popup Wrapper Style */
                .${cls.colorPickerPopup} {
                    background-color: ${palette.bg};
                    border: 1px solid ${palette.border};
                    border-radius: 4px;
                    box-shadow: 0 4px 12px rgb(0 0 0 / 0.2);
                    padding: 16px;
                    position: fixed; /* Fixed positioning to handle scroll/overflow issues */
                    width: 280px;
                    z-index: ${zIndex};
                }
            `;
        }

        static _getColorPickerControlsCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                .${cls.picker} { display: flex;  flex-direction: column; gap: 16px; }
                .${cls.svPlane} { position: relative;  width: 100%; aspect-ratio: 1 / 1; cursor: crosshair; touch-action: none; border-radius: 4px; overflow: hidden; flex-shrink: 0; }
                .${cls.svPlane}:focus { outline: 2px solid ${palette.accent_text};  }
                .${cls.svPlane} .${cls.gradientWhite}, .${cls.svPlane} .${cls.gradientBlack} { position: absolute;  inset: 0; pointer-events: none; }
                .${cls.svPlane} .${cls.gradientWhite} { background: linear-gradient(to right, white, transparent);  }
                .${cls.svPlane} .${cls.gradientBlack} { background: linear-gradient(to top, black, transparent);  }
                .${cls.svThumb} { position: absolute;  width: 20px; height: 20px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 2px 1px rgb(0 0 0 / 0.5);  box-sizing: border-box; transform: translate(-50%, -50%); pointer-events: none; }
                .${cls.sliderGroup} { position: relative;  cursor: pointer; height: 20px; flex-shrink: 0; }
                .${cls.sliderGroup} .${cls.sliderTrack}, .${cls.sliderGroup} .${cls.alphaCheckerboard} { position: absolute;  top: 50%; transform: translateY(-50%); width: 100%; height: 12px; border-radius: 6px; pointer-events: none;  }
                .${cls.sliderGroup} .${cls.alphaCheckerboard} { background-image: repeating-conic-gradient(#808080 0% 25%, #c0c0c0 0% 50%);  background-size: 12px 12px; }
                .${cls.sliderGroup} .${cls.hueTrack} { background: linear-gradient( to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%) );  }
                .${cls.sliderGroup} input[type="range"] { -webkit-appearance: none;  appearance: none; position: relative; width: 100%; height: 100%; margin: 0; padding: 0; background-color: transparent; cursor: pointer;  }
                .${cls.sliderGroup} input[type="range"]:focus { outline: none;  }
                .${cls.sliderGroup} input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none;  appearance: none; width: 20px; height: 20px; border: 2px solid white; border-radius: 50%; background-color: #fff;  box-shadow: 0 0 2px 1px rgb(0 0 0 / 0.5);  }
                .${cls.sliderGroup} input[type="range"]::-moz-range-thumb { width: 20px;  height: 20px; border: 2px solid white; border-radius: 50%; background-color: #fff; box-shadow: 0 0 2px 1px rgb(0 0 0 / 0.5);  }
                .${cls.sliderGroup} input[type="range"]:focus::-webkit-slider-thumb { outline: 2px solid ${palette.accent_text};  outline-offset: 1px; }
                .${cls.sliderGroup} input[type="range"]:focus::-moz-range-thumb { outline: 2px solid ${palette.accent_text};  outline-offset: 1px; }
            `;
        }

        static _getFixedNavContainerCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            const zIndex = SITE_STYLES.Z_INDICES.NAV_CONSOLE;
            return `
                    #${cls.consoleId} .${cls.isHidden} {
                        display: none !important;
                    }
                    #${cls.consoleId}.${cls.unpositioned} {
                        visibility: hidden;
                        opacity: 0;
                    }
                    #${cls.consoleId} {
                        position: fixed;
                        z-index: ${zIndex};
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        background-color: ${palette.fixed_nav_bg};
                        padding: 4px 8px;
                        border-radius: 8px;
                        border: 1px solid ${palette.fixed_nav_border};
                        box-shadow: 0 2px 10px rgb(0 0 0 / 0.05);
                        font-size: 0.8rem;
                        opacity: 1;
                        transform-origin: bottom;
                    }
                    /* Embedded Mode (Header Integration) */
                    #${cls.consoleId}.is-embedded {
                        position: static !important;
                        background-color: transparent !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 8px !important;
                        height: 100%;
                        z-index: auto;
                    }
                    #${cls.consoleId}.${cls.hidden} {
                        display: none !important;
                    }
            `;
        }

        static _getFixedNavContentCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                    #${cls.consoleId} .${cls.group} {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    #${cls.consoleId} .${cls.separator} {
                        width: 1px;
                        height: 20px;
                        background-color: ${palette.fixed_nav_separator_bg};
                    }
                    #${cls.consoleId} .${cls.roleBtn} {
                        color: ${palette.fixed_nav_label_text};
                        font-weight: 500;
                        cursor: pointer;
                        user-select: none;
                        background: transparent;
                        border: none;
                        padding: 2px;
                        border-radius: 4px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: background-color 0.1s;
                        width: 24px;
                        height: 24px;
                    }
                    #${cls.consoleId} .${cls.roleBtn}:hover {
                        background-color: ${palette.btn_hover_bg};
                    }
                    #${cls.consoleId} .${cls.roleBtn} svg {
                        width: 20px;
                        height: 20px;
                        fill: currentColor;
                    }
                    
                    /* Role Colors */
                    #${cls.consoleId} .${cls.roleTotal} {
                        color: ${palette.text_secondary} !important;
                    }
                    #${cls.consoleId} .${cls.roleUser} {
                        color: ${palette.accent_text} !important;
                    }
                    #${cls.consoleId} .${cls.roleAssistant} {
                        color: ${palette.fixed_nav_assistant_text} !important;
                    }

                    #${cls.consoleId} .${cls.counter},
                    #${cls.consoleId} .${cls.jumpInput} {
                        box-sizing: border-box;
                        width: 85px;
                        height: 24px;
                        margin: 0;
                        background-color: ${palette.fixed_nav_counter_bg};
                        color: ${palette.fixed_nav_counter_text};
                        padding: 1px 4px;
                        border: 1px solid transparent;
                        border-color: ${palette.fixed_nav_counter_border};
                        border-radius: 4px;
                        text-align: center;
                        vertical-align: middle;
                        font-family: monospace;
                        font: inherit;
                        user-select: none;
                    }
                    #${cls.consoleId} .${cls.btn} {
                        background-color: ${palette.btn_bg};
                        color: ${palette.btn_text};
                        border: 1px solid ${palette.btn_border};
                        border-radius: 5px;
                        width: 24px;
                        height: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        padding: 0;
                        transition: background-color 0.1s, color 0.1s;
                    }
                    #${cls.consoleId} .${cls.btn}:hover {
                        background-color: ${palette.btn_hover_bg};
                    }
                    #${cls.consoleId} .${cls.btn} svg {
                        width: 20px;
                        height: 20px;
                        fill: currentColor;
                    }
                    #${cls.bulkCollapseBtnId} svg {
                        width: 100%;
                        height: 100%;
                    }
                    #${cls.bulkCollapseBtnId}[data-state="expanded"] .icon-expand { display: none; }
                    #${cls.bulkCollapseBtnId}[data-state="expanded"] .icon-collapse { display: block; }
                    #${cls.bulkCollapseBtnId}[data-state="collapsed"] .icon-expand { display: block; }
                    #${cls.bulkCollapseBtnId}[data-state="collapsed"] .icon-collapse { display: none; }
                    
                    #${cls.consoleId} .${cls.btn}.${cls.btnAccent} {
                        color: ${palette.fixed_nav_btn_accent_text};
                    }
                    #${cls.consoleId} .${cls.btn}.${cls.btnDanger} {
                        color: ${palette.fixed_nav_btn_danger_text};
                    }
                    #${cls.autoscrollBtnId}:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
            `;
        }

        static _getFixedNavHighlightCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            const highlightRule = `
                .${cls.highlightMessage} ${CONSTANTS.SELECTORS.RAW_USER_BUBBLE}, 
                .${cls.highlightMessage} ${CONSTANTS.SELECTORS.RAW_ASSISTANT_BUBBLE}, 
                .${cls.highlightMessage} ${CONSTANTS.SELECTORS.RAW_USER_IMAGE_BUBBLE}, 
                .${cls.highlightTurn} ${CONSTANTS.SELECTORS.RAW_ASSISTANT_IMAGE_BUBBLE}
            `;
            return `
                    ${highlightRule} {
                        outline: 2px solid ${palette.fixed_nav_highlight_outline} !important;
                        outline-offset: -2px;
                        border-radius: ${palette.fixed_nav_highlight_radius} !important;
                        box-shadow: 0 0 8px ${palette.fixed_nav_highlight_outline} !important;
                    }
            `;
        }

        static _getJumpListContainerCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            const zIndex = SITE_STYLES.Z_INDICES.NAV_CONSOLE + 1;

            const firefoxScrollbarFix = /firefox/i.test(navigator.userAgent)
                ? `
                .${cls.scrollbox} {
                    padding-right: 12px;
                }`
                : '';

            return `
                    #${cls.containerId} {
                        position: fixed;
                        z-index: ${zIndex};
                        background: ${palette.jump_list_bg};
                        border: 1px solid ${palette.jump_list_border};
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
                        padding: 4px;
                        opacity: 0;
                        transform-origin: bottom;
                        transform: translateY(10px);
                        transition: opacity 0.15s ease, transform 0.15s ease;
                        visibility: hidden;
                        display: flex;
                        flex-direction: column;
                    }
                    #${cls.containerId}.${cls.expandDown} {
                        transform-origin: top;
                        transform: translateY(-10px);
                    }
                    #${cls.containerId}:focus, #${cls.listId}:focus, .${cls.scrollbox}:focus {
                        outline: none;
                    }
                    /* Ensure 'visible' overrides the transform to 0 */
                    #${cls.containerId}.${cls.visible} {
                        opacity: 1;
                        transform: translateY(0);
                        visibility: visible;
                    }
                    .${cls.scrollbox} {
                        flex: 1 1 auto;
                        position: relative;
                    }
                    ${firefoxScrollbarFix}
            `;
        }

        static _getJumpListListCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                    #${cls.listId} {
                        list-style: none;
                        margin: 0;
                        padding: 0;
                    }
                    .${cls.filterContainer} {
                        position: relative;
                        display: flex;
                        align-items: center;
                        border-top: 1px solid ${palette.jump_list_border};
                        margin: 4px 0 0 0;
                        flex-shrink: 0;
                    }
                    .${cls.filter} {
                        border: none;
                        background-color: transparent;
                        color: inherit;
                        padding: 8px 60px 8px 8px;
                        outline: none;
                        font-size: 0.85rem;
                        border-radius: 0 0 4px 4px;
                        width: 100%;
                        box-sizing: border-box;
                    }
                    .${cls.filter}.${cls.filterRegexValid} {
                        border-color: ${palette.jump_list_current_outline};
                    }
                    .${cls.modeLabel} {
                        position: absolute;
                        right: 8px;
                        padding: 1px 6px;
                        border-radius: 4px;
                        font-size: 0.75rem;
                        font-weight: bold;
                        pointer-events: none;
                        transition: background-color 0.2s, color 0.2s;
                        line-height: 1.5;
                    }
                    .${cls.modeLabel}.${cls.modeString} {
                        background-color: transparent;
                        color: ${palette.label_text};
                    }
                    .${cls.modeLabel}.${cls.modeRegex} {
                        background-color: #28a745;
                        color: #ffffff;
                    }
                    .${cls.modeLabel}.${cls.modeInvalid} {
                        background-color: #dc3545;
                        color: #ffffff;
                    }
                    #${cls.listId} li {
                        padding: 6px 10px;
                        cursor: pointer;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        border-radius: 4px;
                        font-size: 0.85rem;
                    }
                    #${cls.listId} li:hover, #${cls.listId} li.${cls.focused} {
                        outline: 1px solid ${palette.jump_list_hover_outline};
                        outline-offset: -1px;
                    }
                    #${cls.listId} li.${cls.current} {
                        outline: 2px solid ${palette.jump_list_current_outline};
                        outline-offset: -2px;
                    }
                    #${cls.listId} li.${cls.current}:hover, #${cls.listId} li.${cls.current}.${cls.focused} {
                        outline-width: 2px;
                        outline-offset: -2px;
                    }
                    #${cls.listId} li.${cls.userItem} {
                        background-color: var(${CSS_VARS.USER_BUBBLE_BG}, transparent);
                        color: var(${CSS_VARS.USER_TEXT_COLOR}, inherit);
                    }
                    #${cls.listId} li.${cls.asstItem} {
                        background-color: var(${CSS_VARS.ASSISTANT_BUBBLE_BG}, transparent);
                        color: var(${CSS_VARS.ASSISTANT_TEXT_COLOR}, inherit);
                    }
            `;
        }

        static _getJumpListPreviewCss(cls) {
            const palette = SITE_STYLES.PALETTE;
            return `
                    #${cls.previewId} {
                        position: fixed;
                        z-index: ${CONSTANTS.Z_INDICES.JUMP_LIST_PREVIEW};
                        background: ${palette.jump_list_bg};
                        border: 1px solid ${palette.jump_list_border};
                        border-radius: 8px;
                        box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
                        padding: 8px 12px;
                        max-width: 400px;
                        max-height: 300px;
                        overflow-y: auto;
                        font-size: 0.85rem;
                        opacity: 0;
                        transition: opacity 0.15s ease-in-out;
                        white-space: pre-wrap;
                        word-break: break-word;
                        visibility: hidden;
                        user-select: text;
                        cursor: auto;
                        contain: layout;
                    }
                    #${cls.previewId} strong {
                        color: ${palette.jump_list_current_outline};
                        font-weight: bold;
                        background-color: transparent;
                    }
                    #${cls.previewId}.${cls.visible} {
                        opacity: 1;
                        visibility: visible;
                    }
            `;
        }

        static _getThemeBaseCss(cls, activeVars) {
            const important = SITE_STYLES.CSS_IMPORTANT_FLAG || '';
            const overrides = PlatformAdapters.ThemeManager.getStyleOverrides();

            // Helper to generate CSS property only if the variable is active
            const prop = (propName, varName) => {
                if (activeVars && !activeVars.has(varName)) return '';
                return `${propName}: var(${varName})${important};`;
            };

            // Generate assistant text color selectors for all child elements.
            const assistantTextSelectors = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul li', 'ol li', 'ul li::marker', 'ol li::marker', 'strong', 'em', 'blockquote', 'table', 'th', 'td']
                .map((tag) => `${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.ASSISTANT_TEXT_CONTENT} ${tag}`)
                .join(',\n');

            // Generate CSS with conditional properties
            return `
                /* --- Window Background --- */
                ${CONSTANTS.SELECTORS.MAIN_APP_CONTAINER} {
                    ${prop('background-color', CSS_VARS.WINDOW_BG_COLOR)}
                    ${prop('background-image', CSS_VARS.WINDOW_BG_IMAGE)}
                    ${prop('background-size', CSS_VARS.WINDOW_BG_SIZE)}
                    ${prop('background-position', CSS_VARS.WINDOW_BG_POS)}
                    ${prop('background-repeat', CSS_VARS.WINDOW_BG_REPEAT)}
                    ${activeVars && activeVars.has(CSS_VARS.WINDOW_BG_IMAGE) ? `background-attachment: fixed${important};` : ''}
                }

                /* --- Input Area --- */
                ${CONSTANTS.SELECTORS.INPUT_AREA_BG_TARGET} {
                    ${prop('background-color', CSS_VARS.INPUT_BG)}
                }
                ${CONSTANTS.SELECTORS.INPUT_TEXT_FIELD_TARGET} {
                    /* Variable --input-field-bg is set to 'transparent' via transformer when bg color is active */
                    ${prop('background-color', CSS_VARS.INPUT_FIELD_BG)} 
                    ${prop('color', CSS_VARS.INPUT_COLOR)}
                }

                /* --- Assistant Bubble & Text --- */
                ${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.RAW_ASSISTANT_BUBBLE} {
                    ${prop('background-color', CSS_VARS.ASSISTANT_BUBBLE_BG)}
                    ${prop('padding', CSS_VARS.ASSISTANT_BUBBLE_PADDING)}
                    ${prop('border-radius', CSS_VARS.ASSISTANT_BUBBLE_RADIUS)}
                    ${prop('max-width', CSS_VARS.ASSISTANT_BUBBLE_MAXWIDTH)}
                    ${overrides.assistant || ''}
                }
                ${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.ASSISTANT_TEXT_CONTENT} {
                    ${prop('color', CSS_VARS.ASSISTANT_TEXT_COLOR)}
                    ${prop('font-family', CSS_VARS.ASSISTANT_FONT)}
                }
                /* Assistant Child Elements Text Color */
                ${assistantTextSelectors} {
                    ${prop('color', CSS_VARS.ASSISTANT_TEXT_COLOR)}
                }

                /* --- User Bubble & Text --- */
                ${CONSTANTS.SELECTORS.USER_MESSAGE} ${CONSTANTS.SELECTORS.RAW_USER_BUBBLE} {
                    ${prop('background-color', CSS_VARS.USER_BUBBLE_BG)}
                    ${prop('padding', CSS_VARS.USER_BUBBLE_PADDING)}
                    ${prop('border-radius', CSS_VARS.USER_BUBBLE_RADIUS)}
                    ${prop('max-width', CSS_VARS.USER_BUBBLE_MAXWIDTH)}
                    ${overrides.user || ''}
                }
                ${CONSTANTS.SELECTORS.USER_MESSAGE} ${CONSTANTS.SELECTORS.USER_TEXT_CONTENT} {
                    ${prop('color', CSS_VARS.USER_TEXT_COLOR)}
                    ${prop('font-family', CSS_VARS.USER_FONT)}
                }
            `;
        }
    }

    /**
     * @class StyleManager
     * @description Centralizes the creation, injection, and management of CSS style elements.
     * Implements an idempotent injection strategy: it checks for an existing `<style>` element by ID
     * and reuses it if found, updating only the text content. If not found, a new element is created.
     * This approach prevents duplicate styles and supports efficient dynamic updates.
     */
    class StyleManager {
        static _handles = new Map();

        /**
         * Removes a style element by its ID.
         * @param {string} id The ID of the style element to remove.
         */
        static _removeById(id) {
            document.getElementById(id)?.remove();
        }

        /**
         * Generates IDs and Prefixes, constructs CSS using the provided generator, and injects the style.
         * @param {object} def Definition object from StyleDefinitions.
         * @returns {StyleHandle} The style handle.
         */
        static _render(def) {
            const id = `${APPID}-style-${def.key}`;
            const prefix = `${APPID}-${def.key}`;
            const cssContent = def.generator(def.classes);

            this._inject(id, cssContent);

            return { id, prefix, classes: def.classes, vars: def.vars };
        }

        /**
         * @param {string} id The ID of the style element.
         * @param {string} cssContent The CSS content to inject.
         */
        static _inject(id, cssContent) {
            let style = document.getElementById(id);
            if (!style) {
                const newStyle = h('style', { id });
                if (newStyle instanceof HTMLElement) {
                    style = newStyle;
                    // Safely append to head or root element to support early execution (@run-at document-start)
                    const target = document.head || document.documentElement;
                    if (target) {
                        target.appendChild(style);
                    }
                }
            }
            if (style) {
                style.textContent = cssContent;
            }
        }

        /**
         * Requests a style handle for the given definition provider.
         * Implements the Singleton pattern: creates only if not exists, otherwise reuses.
         * @param {() => StyleDefinition} defProvider Function that returns the style definition.
         * @returns {StyleHandle} The style handle.
         */
        static request(defProvider) {
            if (!this._handles.has(defProvider)) {
                const def = defProvider();
                const handle = this._render(def);
                this._handles.set(defProvider, handle);
            }
            return this._handles.get(defProvider);
        }

        /**
         * Explicitly removes a style.
         * This should only be used for temporary styles that must be cleaned up (e.g. debug tools).
         * @param {() => StyleDefinition} defProvider Function that returns the style definition.
         */
        static remove(defProvider) {
            if (this._handles.has(defProvider)) {
                const handle = this._handles.get(defProvider);
                this._removeById(handle.id);
                this._handles.delete(defProvider);
            }
        }
    }

    // =================================================================================
    // SECTION: Data Conversion Utilities
    // Description: Handles image optimization.
    // =================================================================================

    class DataConverter {
        /**
         * Converts an image file to an optimized Data URL.
         * @param {File} file The image file object.
         * @param {{ maxWidth?: number, maxHeight?: number, quality: number }} options
         * @returns {Promise<string>} A promise that resolves with the optimized Data URL.
         */
        imageToOptimizedDataUrl(file, options) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        // Check if we can skip re-compression
                        const isWebP = file.type === 'image/webp';
                        const needsResize = (options.maxWidth && img.width > options.maxWidth) || (options.maxHeight && img.height > options.maxHeight);

                        if (isWebP && !needsResize) {
                            // It's an appropriately sized WebP, so just use the original Data URL.
                            if (event.target && typeof event.target.result === 'string') {
                                resolve(event.target.result);
                            } else {
                                reject(new Error('Failed to read file as a data URL.'));
                            }
                            return;
                        }

                        // Otherwise, proceed with canvas-based resizing and re-compression.
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        if (!ctx) {
                            reject(new Error('Failed to get 2D context from canvas.'));
                            return;
                        }

                        let { width, height } = img;
                        if (needsResize) {
                            const ratio = width / height;
                            if (options.maxWidth && width > options.maxWidth) {
                                width = options.maxWidth;
                                height = width / ratio;
                            }
                            if (options.maxHeight && height > options.maxHeight) {
                                height = options.maxHeight;
                                width = height * ratio;
                            }
                        }

                        canvas.width = Math.round(width);
                        canvas.height = Math.round(height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                        resolve(canvas.toDataURL('image/webp', options.quality || CONSTANTS.IMAGE_PROCESSING.QUALITY));
                    };
                    img.onerror = (err) => reject(new Error('Failed to load image.'));
                    if (event.target && typeof event.target.result === 'string') {
                        img.src = event.target.result;
                    } else {
                        reject(new Error('Failed to read file as a data URL.'));
                    }
                };
                reader.onerror = (err) => reject(new Error('Failed to read file.'));
                reader.readAsDataURL(file);
            });
        }
    }

    // =================================================================================
    // SECTION: Utility Functions
    // Description: General helper functions used across the script.
    // =================================================================================

    /**
     * Schedules a function to run when the browser is idle.
     * Returns a cancel function to abort the scheduled task.
     * In environments without `requestIdleCallback`, this runs asynchronously immediately (1ms delay) to prevent blocking,
     * effectively ignoring the `timeout` constraint by satisfying it instantly.
     * @param {(deadline: IdleDeadline) => void} callback The function to execute.
     * @param {number} timeout The maximum time to wait for idle before forcing execution.
     * @returns {() => void} A function to cancel the scheduled task.
     */
    function runWhenIdle(callback, timeout) {
        if ('requestIdleCallback' in window) {
            const id = window.requestIdleCallback(callback, { timeout });
            return () => window.cancelIdleCallback(id);
        } else {
            // Fallback: Execute almost immediately (1ms) to avoid blocking.
            // This satisfies the "run by timeout" contract trivially since 1ms < timeout.
            const id = setTimeout(() => {
                // Provide a minimal IdleDeadline-like object.
                // timeRemaining() returns 50ms to simulate a fresh frame.
                callback({
                    didTimeout: false,
                    timeRemaining: () => 50,
                });
            }, 1);

            return () => clearTimeout(id);
        }
    }

    /**
     * @param {Function} func
     * @param {number} delay
     * @param {boolean} useIdle
     * @returns {((...args: any[]) => void) & { cancel: () => void }}
     */
    function debounce(func, delay, useIdle) {
        let timerId = null;
        let cancelIdle = null;

        const cancel = () => {
            if (timerId !== null) {
                clearTimeout(timerId);
                timerId = null;
            }
            if (cancelIdle) {
                cancelIdle();
                cancelIdle = null;
            }
        };

        const debounced = function (...args) {
            cancel();
            timerId = setTimeout(() => {
                timerId = null; // Timer finished
                if (useIdle) {
                    // Calculate idle timeout based on delay: clamp(delay * 4, 200, 2000)
                    // This ensures short delays don't wait too long, while long delays are capped.
                    const idleTimeout = Math.min(Math.max(delay * 4, 200), 2000);

                    // Schedule idle callback and store the cancel function
                    // Explicitly receive 'deadline' to match runWhenIdle signature
                    cancelIdle = runWhenIdle((deadline) => {
                        cancelIdle = null; // Idle callback finished
                        func.apply(this, args);
                    }, idleTimeout);
                } else {
                    func.apply(this, args);
                }
            }, delay);
        };

        debounced.cancel = cancel;
        return debounced;
    }

    /**
     * Helper function to check if an item is a non-array object.
     * @param {unknown} item The item to check.
     * @returns {item is Record<string, any>}
     */
    function isObject(item) {
        return !!(item && typeof item === 'object' && !Array.isArray(item));
    }

    /**
     * Creates a deep copy of a JSON-serializable object.
     * @template T
     * @param {T} obj The object to clone.
     * @returns {T} The deep copy of the object.
     */
    function deepClone(obj) {
        try {
            return structuredClone(obj);
        } catch (e) {
            Logger.error('CLONE FAILED', '', 'deepClone failed. Data contains non-clonable items.', e);
            throw e;
        }
    }

    /**
     * Recursively resolves the configuration by overlaying source properties onto the target object.
     * The target object is mutated. This handles recursive updates for nested objects but overwrites arrays/primitives.
     *
     * [MERGE BEHAVIOR]
     * Keys present in 'source' but missing in 'target' are ignored.
     * The 'target' object acts as a schema; it must contain all valid keys.
     *
     * @param {object} target The target object (e.g., a deep copy of default config).
     * @param {object} source The source object (e.g., user config).
     * @returns {object} The mutated target object.
     */
    function resolveConfig(target, source) {
        for (const key in source) {
            // Security: Prevent prototype pollution
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                continue;
            }

            if (Object.prototype.hasOwnProperty.call(source, key)) {
                // Strict check: Ignore keys that do not exist in the target (default config).
                if (!Object.prototype.hasOwnProperty.call(target, key)) {
                    continue;
                }

                const sourceVal = source[key];
                const targetVal = target[key];

                if (isObject(sourceVal) && isObject(targetVal)) {
                    // If both are objects, recurse
                    resolveConfig(targetVal, sourceVal);
                } else if (typeof sourceVal !== 'undefined') {
                    // Otherwise, overwrite or set the value from the source
                    target[key] = sourceVal;
                }
            }
        }
        return target;
    }

    /**
     * Removes system-internal properties (prefixed with _system) from the config object before saving.
     * @param {object} data The config object to sanitize.
     * @returns {object} A deep copy of the config object without system properties.
     */
    function sanitizeConfigForSave(data) {
        if (!data || typeof data !== 'object') return data;
        const clean = deepClone(data);
        delete clean[CONSTANTS.STORE_KEYS.SYSTEM_ROOT];
        return clean;
    }

    /**
     * Checks if the current page is the "New Chat" page.
     * This is determined by checking if the URL path matches the platform-specific pattern.
     * @returns {boolean} True if it is the new chat page, otherwise false.
     */
    function isNewChatPage() {
        return PlatformAdapters.General.isNewChatPage();
    }

    /**
     * Checks if the current browser is Firefox.
     * @returns {boolean} True if the browser is Firefox, otherwise false.
     */
    function isFirefox() {
        return navigator.userAgent.includes('Firefox');
    }

    /**
     * @typedef {Node|string|number|boolean|null|undefined} HChild
     */
    /**
     * Creates a DOM element using a hyperscript-style syntax.
     * @param {string} tag - Tag name with optional ID/class (e.g., "div#app.container", "my-element").
     * @param {object | HChild | HChild[]} [propsOrChildren] - Attributes object or children.
     * @param {HChild | HChild[]} [children] - Children (if props are specified).
     * @returns {HTMLElement | SVGElement} The created DOM element.
     */
    function h(tag, propsOrChildren, children) {
        const SVG_NS = 'http://www.w3.org/2000/svg';
        const match = tag.match(/^([a-z0-9-]+)(#[\w-]+)?((\.[\w-]+)*)$/i);
        if (!match) throw new Error(`Invalid tag syntax: ${tag}`);

        const [, tagName, id, classList] = match;
        const isSVG = ['svg', 'circle', 'rect', 'path', 'g', 'line', 'text', 'use', 'defs', 'clipPath'].includes(tagName);
        const el = isSVG ? document.createElementNS(SVG_NS, tagName) : document.createElement(tagName);

        if (id) el.id = id.slice(1);
        if (classList) {
            const classes = classList.replace(/\./g, ' ').trim();
            if (classes) {
                el.classList.add(...classes.split(/\s+/));
            }
        }

        let props = {};
        let childrenArray;
        if (propsOrChildren && Object.prototype.toString.call(propsOrChildren) === '[object Object]') {
            props = propsOrChildren;
            childrenArray = children;
        } else {
            childrenArray = propsOrChildren;
        }

        // --- Start of Attribute/Property Handling ---
        const directProperties = new Set(['value', 'checked', 'selected', 'readOnly', 'disabled', 'multiple', 'textContent']);
        const urlAttributes = new Set(['href', 'src', 'action', 'formaction']);
        const safeProtocols = new Set(['https:', 'http:', 'mailto:', 'tel:', 'blob:', 'data:']);

        for (const [key, value] of Object.entries(props)) {
            // 0. Handle `ref` callback (highest priority after props parsing).
            if (key === 'ref' && typeof value === 'function') {
                value(el);
            }
            // 1. Security check for URL attributes.
            else if (urlAttributes.has(key)) {
                const url = String(value);
                try {
                    const parsedUrl = new URL(url); // Throws if not an absolute URL.
                    if (safeProtocols.has(parsedUrl.protocol)) {
                        el.setAttribute(key, url);
                    } else {
                        el.setAttribute(key, '#');
                        Logger.warn('UNSAFE URL', LOG_STYLES.YELLOW, `Blocked potentially unsafe protocol "${parsedUrl.protocol}" in attribute "${key}":`, url);
                    }
                } catch {
                    el.setAttribute(key, '#');
                    Logger.warn('INVALID URL', LOG_STYLES.YELLOW, `Blocked invalid or relative URL in attribute "${key}":`, url);
                }
            }
            // 2. Direct property assignments.
            else if (directProperties.has(key)) {
                el[key] = value;
            }
            // 3. Other specialized handlers.
            else if (key === 'style' && typeof value === 'object') {
                Object.assign(el.style, value);
            } else if (key === 'dataset' && typeof value === 'object') {
                for (const [dataKey, dataVal] of Object.entries(value)) {
                    el.dataset[dataKey] = dataVal;
                }
            } else if (key.startsWith('on')) {
                if (typeof value === 'function') {
                    el.addEventListener(key.slice(2).toLowerCase(), value);
                }
            } else if (key === 'className') {
                const classes = String(value).trim();
                if (classes) {
                    el.classList.add(...classes.split(/\s+/));
                }
            } else if (key.startsWith('aria-')) {
                el.setAttribute(key, String(value));
            }
            // 4. Default attribute handling.
            else if (value !== false && value !== null && typeof value !== 'undefined') {
                el.setAttribute(key, value === true ? '' : String(value));
            }
        }
        // --- End of Attribute/Property Handling ---

        const fragment = document.createDocumentFragment();
        /**
         * Appends a child node or text to the document fragment.
         * @param {HChild} child - The child to append.
         */
        function append(child) {
            if (child === null || child === false || typeof child === 'undefined') return;
            if (typeof child === 'string' || typeof child === 'number') {
                fragment.appendChild(document.createTextNode(String(child)));
            } else if (Array.isArray(child)) {
                child.forEach(append);
            } else if (child instanceof Node) {
                fragment.appendChild(child);
            } else {
                throw new Error('Unsupported child type');
            }
        }
        append(childrenArray);

        el.appendChild(fragment);

        if (el instanceof HTMLElement || el instanceof SVGElement) {
            return el;
        }
        throw new Error('Created element is not a valid HTMLElement or SVGElement');
    }

    /**
     * Recursively builds a DOM element from a definition object using the h() function.
     * @param {object} def The definition object for the element.
     * @returns {HTMLElement | SVGElement | null} The created DOM element.
     */
    function createIconFromDef(def) {
        if (!def) return null;
        const children = def.children ? def.children.map((child) => createIconFromDef(child)) : [];
        return h(def.tag, def.props, children);
    }

    /**
     * Waits for a specific HTMLElement to appear in the DOM using a high-performance, Sentinel-based approach.
     * It specifically checks for `instanceof HTMLElement` and will not resolve for other element types (e.g., SVGElement), even if they match the selector.
     * @param {string} selector The CSS selector for the element.
     * @param {object} options
     * @param {number} options.timeout The maximum time to wait in milliseconds.
     * @param {Document | HTMLElement} options.context The element to search within.
     * @param {Sentinel} sentinelInstance The Sentinel instance to use.
     * @returns {Promise<HTMLElement | null>} A promise that resolves with the HTMLElement or null if timed out.
     */
    function waitForElement(selector, options, sentinelInstance) {
        // First, check if the element already exists.
        const context = options.context;
        const existingEl = context.querySelector(selector);
        if (existingEl instanceof HTMLElement) {
            return Promise.resolve(existingEl);
        }

        // If not, use Sentinel wrapped in a Promise.
        return new Promise((resolve) => {
            let timer = null;
            let sentinelCallback = null;

            const cleanup = () => {
                if (timer) clearTimeout(timer);
                if (sentinelCallback) sentinelInstance.off(selector, sentinelCallback);
            };

            timer = setTimeout(() => {
                cleanup();
                Logger.warn('WAIT TIMEOUT', LOG_STYLES.YELLOW, `Timed out after ${options.timeout}ms waiting for element "${selector}"`);
                resolve(null);
            }, options.timeout);

            sentinelCallback = (element) => {
                // Ensure the found element is an HTMLElement and is within the specified context.
                if (element instanceof HTMLElement && context.contains(element)) {
                    cleanup();
                    resolve(element);
                }
            };

            sentinelInstance.on(selector, sentinelCallback);
        });
    }

    /**
     * Generates a unique ID string with a given prefix.
     * Uses crypto.randomUUID() if available, otherwise falls back to timestamp + random.
     * @param {string} prefix - The prefix for the ID.
     * @returns {string}
     */
    function generateUniqueId(prefix) {
        let uuid;
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            uuid = crypto.randomUUID();
        } else {
            uuid = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
        }
        return `${APPID}-${prefix}-${uuid}`;
    }

    /**
     * Proposes a unique name by appending a suffix if the base name already exists in a given set.
     * It checks for "Copy", "Copy 2", "Copy 3", etc., in a case-insensitive manner.
     * @param {string} baseName The initial name to check.
     * @param {Set<string> | Array<string>} existingNames A Set or Array containing existing names.
     * @returns {string} A unique name.
     */
    function proposeUniqueName(baseName, existingNames) {
        const existingNamesLower = new Set(Array.from(existingNames).map((name) => name.toLowerCase()));

        if (!existingNamesLower.has(baseName.trim().toLowerCase())) {
            return baseName;
        }

        let proposedName = `${baseName} Copy`;
        if (!existingNamesLower.has(proposedName.trim().toLowerCase())) {
            return proposedName;
        }

        let counter = 2;
        while (true) {
            proposedName = `${baseName} Copy ${counter}`;
            if (!existingNamesLower.has(proposedName.trim().toLowerCase())) {
                return proposedName;
            }
            counter++;
        }
    }

    /**
     * Converts an SVG string to a data URL, sanitizing it by removing script tags.
     * @param {string | null} svg The SVG string.
     * @returns {string | null} The data URL or null if input is invalid.
     */
    function svgToDataUrl(svg) {
        if (!svg || typeof svg !== 'string') return null;
        // Basic sanitization: remove <script> tags.
        const sanitizedSvg = svg.replace(/<script.+?<\/script>/gs, '');
        // Gemini's CSP blocks single quotes in data URLs, so they must be encoded.
        const encodedSvg = encodeURIComponent(sanitizedSvg).replace(/'/g, '%27').replace(/"/g, '%22');
        return `data:image/svg+xml,${encodedSvg}`;
    }

    /**
     * Validates an image-related string based on its type (URL, Data URI, or SVG).
     * @param {string | null} value The string to validate.
     * @param {'icon' | 'image'} fieldType The type of field ('icon' allows SVGs, 'image' does not).
     * @returns {{isValid: boolean, message: string}} An object with validation result and an error message.
     */
    function validateImageString(value, fieldType) {
        // This check safely handles null, undefined, empty, and whitespace-only strings.
        if (!value || String(value).trim() === '') {
            return { isValid: true, message: '' };
        }

        const val = String(value).trim();

        // Rule: Should not be enclosed in quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            return { isValid: false, message: 'Input should not be enclosed in quotes.' };
        }

        // Case 1: Known CSS functions (url(), linear-gradient(), etc.)
        if (/^(url|linear-gradient|radial-gradient|conic-gradient)\(/i.test(val)) {
            return { isValid: true, message: '' };
        }

        // Case 2: SVG String (for 'icon' type only)
        if (fieldType === 'icon' && val.startsWith('<svg')) {
            if (!/<\/svg>$/i.test(val)) {
                return { isValid: false, message: 'Must end with </svg>.' };
            }
            if ((val.match(/</g) || []).length !== (val.match(/>/g) || []).length) {
                return { isValid: false, message: 'Has mismatched brackets; check for unclosed tags.' };
            }
            return { isValid: true, message: '' };
        }

        // Case 3: Data URI
        if (val.startsWith('data:image')) {
            // A basic prefix check is sufficient.
            return { isValid: true, message: '' };
        }

        // Case 4: Standard URL
        if (val.startsWith('http')) {
            try {
                // The URL constructor is a reliable way to check for basic structural validity.
                new URL(val);
                return { isValid: true, message: '' };
            } catch {
                return { isValid: false, message: 'The URL format is invalid.' };
            }
        }

        // If none of the recognized patterns match
        const allowed = fieldType === 'icon' ? 'a URL (http...), Data URI (data:image...), an SVG string, or a CSS function (url(), linear-gradient())' : 'a URL, a Data URI, or a CSS function';
        return { isValid: false, message: `Invalid format. Must be ${allowed}.` };
    }

    /**
     * Validates a color string using the browser's internal parser via the Option element style.
     * @param {string | null} str - The color string to validate.
     * @returns {boolean} True if the string is a valid CSS color.
     */
    function validateColorString(str) {
        if (!str || typeof str !== 'string' || str.trim() === '') return false;
        const s = new Option().style;
        s.color = str;
        return s.color !== '';
    }

    /**
     * Escapes special characters in a string for use in a regular expression.
     * @param {string} string The string to escape.
     * @returns {string} The escaped string.
     */
    function escapeRegExp(string) {
        // $& means the whole matched string
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Parses a regex string in the format "/pattern/flags".
     * @param {string} input The string to parse.
     * @returns {RegExp} The constructed RegExp object.
     * @throws {Error} If the format is invalid or the regex is invalid.
     */
    function parseRegexPattern(input) {
        if (typeof input !== 'string' || !/^\/.*\/[gimsuy]*$/.test(input)) {
            throw new Error(`Invalid format. Must be /pattern/flags string: ${input}`);
        }
        const lastSlash = input.lastIndexOf('/');
        const pattern = input.slice(1, lastSlash);
        const flags = input.slice(lastSlash + 1);
        try {
            return new RegExp(pattern, flags);
        } catch (e) {
            throw new Error(`Invalid RegExp: "${input}". ${e.message}`);
        }
    }

    /**
     * Gets the current width of the sidebar.
     * @returns {number}
     */
    function getSidebarWidth() {
        const sidebar = document.querySelector(CONSTANTS.SELECTORS.SIDEBAR_WIDTH_TARGET);
        if (sidebar instanceof HTMLElement && sidebar.offsetParent !== null) {
            const styleWidth = sidebar.style.width;
            if (styleWidth && styleWidth.endsWith('px')) {
                return parseInt(styleWidth, 10);
            }
            if (sidebar.offsetWidth) {
                return sidebar.offsetWidth;
            }
        }
        return 0;
    }

    /**
     * @description Scrolls to a target element, with an optional pixel offset.
     * Delegates the actual scrolling logic to the platform-specific adapter.
     * @param {HTMLElement} element The target element to scroll to.
     * @param {object} options - Scrolling options.
     * @param {number} [options.offset] - A pixel offset to apply above the target element.
     * @param {boolean} [options.smooth] - Whether to use smooth scrolling.
     */
    function scrollToElement(element, options) {
        if (!element) return;
        PlatformAdapters.General.scrollTo(element, options);
    }

    /**
     * Sets a nested property on an object using a dot-notation path.
     * @param {object} obj The object to modify.
     * @param {string} path The dot-separated path to the property.
     * @param {any} value The value to set.
     * @returns {boolean} True if successful, false if the path was invalid or blocked.
     */
    function setPropertyByPath(obj, path, value) {
        if (!obj || typeof obj !== 'object') {
            Logger.warn('', '', `setPropertyByPath: Target object is invalid (type: ${typeof obj}).`);
            return false;
        }
        if (!path) return false;
        const keys = path.split('.');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];

            if (!key) {
                Logger.warn('', '', `setPropertyByPath: Invalid empty key in path "${path}".`);
                return false;
            }

            // Security: Prevent prototype pollution
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                Logger.warn('', '', `setPropertyByPath: Blocked forbidden key "${key}" in path "${path}".`);
                return false;
            }

            // If the property exists, validate that it is an object (and not null) to allow nesting.
            if (current[key] !== undefined && current[key] !== null) {
                if (typeof current[key] !== 'object') {
                    Logger.warn('', '', `setPropertyByPath: Cannot set property "${keys[i + 1]}" on non-object value at "${keys.slice(0, i + 1).join('.')}" in path "${path}".`);
                    return false;
                }
            } else {
                // Only create a new object if the property is null or undefined.
                // This prevents overwriting existing values (like arrays) with empty objects.
                current[key] = {};
            }

            current = current[key];
        }

        const lastKey = keys[keys.length - 1];

        if (!lastKey) {
            Logger.warn('', '', `setPropertyByPath: Invalid empty key at end of path "${path}".`);
            return false;
        }

        // Security: Prevent prototype pollution on the last key
        if (lastKey === '__proto__' || lastKey === 'constructor' || lastKey === 'prototype') {
            Logger.warn('', '', `setPropertyByPath: Blocked forbidden key "${lastKey}" in path "${path}".`);
            return false;
        }

        current[lastKey] = value;
        return true;
    }

    /**
     * @description Synchronizes a cache Map against the current list of messages from MessageCacheManager.
     * It removes entries from the map if their key (a message element) is no longer in the live message list.
     * @param {Map<HTMLElement, any>} cacheMap The cache Map to synchronize. The keys are expected to be message HTMLElements.
     * @param {MessageCacheManager} messageCacheManager The instance of the message cache manager.
     */
    function syncCacheWithMessages(cacheMap, messageCacheManager) {
        const currentMessages = new Set(messageCacheManager.getTotalMessages());
        for (const messageElement of cacheMap.keys()) {
            if (!currentMessages.has(messageElement)) {
                cacheMap.delete(messageElement);
            }
        }
    }

    /**
     * @description A utility to prevent layout thrashing by separating DOM reads (measure)
     * from DOM writes (mutate). The mutate function is executed in the next animation frame.
     * @param {{
     * measure: () => T,
     * mutate: (data: T) => void
     * }} param0 - An object containing the measure and mutate functions.
     * @returns {Promise<void>} A promise that resolves after the mutate function has completed.
     * @template T
     */
    function withLayoutCycle({ measure, mutate }) {
        return new Promise((resolve, reject) => {
            let measuredData;

            // Phase 1: Synchronously read all required layout properties from the DOM.
            try {
                measuredData = measure();
            } catch (e) {
                Logger.error('LAYOUT ERROR', LOG_STYLES.RED, 'Error during measure phase:', e);
                reject(e);
                return;
            }

            // Phase 2: Schedule the DOM mutations to run in the next animation frame.
            requestAnimationFrame(() => {
                try {
                    mutate(measuredData);
                    resolve();
                } catch (e) {
                    Logger.error('LAYOUT ERROR', LOG_STYLES.RED, 'Error during mutate phase:', e);
                    reject(e);
                }
            });
        });
    }

    /**
     * Executes a batch processing task on an array of items, separating Read (Measure) and Write (Mutate) operations.
     * Uses requestAnimationFrame to prevent blocking the main thread.
     *
     * @template T, R
     * @param {T[]} items - The array of items to process.
     * @param {number} batchSize - The number of items to process per frame.
     * @param {(item: T, index: number) => R | null | undefined} measureFn - Function to read from the DOM. Returns data for mutation, or null/undefined to skip.
     * @param {(data: R) => void} mutateFn - Function to write to the DOM.
     * @param {() => void} [onFinish] - Callback executed ONLY when all batches are successfully processed.
     * @param {() => void} [onAbort] - Callback executed ONLY when processing is cancelled before completion.
     * @returns {() => void} A cancel function to abort the processing.
     */
    function runBatchUpdate(items, batchSize, measureFn, mutateFn, onFinish, onAbort) {
        if (!items || items.length === 0) {
            if (onFinish) onFinish();
            return () => {};
        }

        let index = 0;
        let rafId = null;
        let isCancelled = false;
        let isFinished = false;

        const processNextBatch = () => {
            if (isCancelled) return;

            const endIndex = Math.min(index + batchSize, items.length);
            const batchMeasurements = [];

            // Phase 1: Measure (READ)
            for (let i = index; i < endIndex; i++) {
                const item = items[i];
                try {
                    const measurement = measureFn(item, i);
                    // Strict check to allow 0, false, or empty string as valid measurements
                    if (measurement !== null && measurement !== undefined) {
                        batchMeasurements.push(measurement);
                    }
                } catch (e) {
                    Logger.warn('BatchUpdate', '', 'Error during measure phase:', e);
                }
            }

            // Phase 2: Mutate (WRITE)
            for (const data of batchMeasurements) {
                try {
                    mutateFn(data);
                } catch (e) {
                    Logger.warn('BatchUpdate', '', 'Error during mutate phase:', e);
                }
            }

            index = endIndex;
            if (index < items.length) {
                rafId = requestAnimationFrame(processNextBatch);
            } else {
                isFinished = true;
                if (onFinish) onFinish();
            }
        };

        rafId = requestAnimationFrame(processNextBatch);

        return () => {
            // If already finished, do nothing (cleanup already handled by onFinish)
            if (isFinished) return;

            isCancelled = true;
            if (rafId) cancelAnimationFrame(rafId);

            // Execute abort callback only if interrupted
            if (onAbort) onAbort();
        };
    }

    /**
     * @description Ensures the settings button is correctly placed.
     * @param {object} settingsButton The settings button component instance.
     * @param {string} anchorSelector The CSS selector for the anchor element.
     * @param {() => boolean} isExcludedPageFn A function that returns true if the current page should be excluded.
     */
    function ensureSettingsButtonPlacement(settingsButton, anchorSelector, isExcludedPageFn) {
        if (!settingsButton?.element) return;

        withLayoutCycle({
            measure: () => {
                // Read phase
                const anchor = document.querySelector(anchorSelector);
                if (!(anchor instanceof HTMLElement)) return { anchor: null };

                // Ghost Detection Logic
                const existingBtn = document.getElementById(settingsButton.element.id);
                const isGhost = existingBtn && existingBtn !== settingsButton.element;

                // Check if button is already inside (only if it's the correct instance)
                const isInside = !isGhost && anchor.contains(settingsButton.element);

                return {
                    anchor,
                    isGhost,
                    existingBtn,
                    shouldInject: !isInside,
                };
            },
            mutate: (measured) => {
                // Write phase

                // Guard: Check if the component was destroyed pending the animation frame
                if (!settingsButton.element) return;

                // Guard: Check for excluded page immediately to prevent zombie UI.
                if (isExcludedPageFn()) {
                    if (settingsButton.element.isConnected) {
                        settingsButton.element.remove();
                        Logger.debug('UI GUARD', LOG_STYLES.CYAN, 'Excluded page detected during UI update. Button removed.');
                    }
                    return;
                }

                if (!measured || !measured.anchor) {
                    // Hide if anchor is gone
                    settingsButton.element.style.display = 'none';
                    return;
                }

                const { anchor, isGhost, existingBtn, shouldInject } = measured;

                // Safety Check: Ensure the anchor is still part of the document
                if (!anchor.isConnected) {
                    return;
                }

                // 1. Ghost Buster
                if (isGhost && existingBtn) {
                    Logger.warn('GHOST BUSTER', LOG_STYLES.YELLOW, 'Detected non-functional ghost button. Removing...');
                    existingBtn.remove();
                }

                // 2. Injection
                if (shouldInject || isGhost) {
                    anchor.prepend(settingsButton.element);
                    Logger.debug('UI INJECTION', LOG_STYLES.CYAN, 'Settings button injected into anchor.');
                }

                settingsButton.element.style.display = '';
            },
        });
    }

    /**
     * @class DomState
     * @description A static utility to encapsulate DOM data attribute operations.
     * Ensures consistency between dataset properties (camelCase) and HTML attributes (kebab-case).
     */
    class DomState {
        /**
         * @param {HTMLElement} element
         * @param {string} key
         * @returns {string | undefined}
         */
        static get(element, key) {
            return element.dataset[key];
        }

        /**
         * @param {HTMLElement} element
         * @param {string} key
         * @param {number} [defaultValue=0]
         * @returns {number}
         */
        static getInt(element, key, defaultValue = 0) {
            const val = parseInt(element.dataset[key], 10);
            return isNaN(val) ? defaultValue : val;
        }

        /**
         * @param {HTMLElement} element
         * @param {string} key
         * @param {string|number|boolean} value
         */
        static set(element, key, value) {
            element.dataset[key] = String(value);
        }

        /**
         * Sets a data attribute to "true".
         * @param {HTMLElement} element
         * @param {string} key
         */
        static mark(element, key) {
            element.dataset[key] = 'true';
        }

        /**
         * Checks if a data attribute exists (using Object.prototype.hasOwnProperty for safety).
         * @param {HTMLElement} element
         * @param {string} key
         * @returns {boolean}
         */
        static has(element, key) {
            return Object.prototype.hasOwnProperty.call(element.dataset, key);
        }

        /**
         * Removes a data attribute.
         * @param {HTMLElement} element
         * @param {string} key
         */
        static remove(element, key) {
            delete element.dataset[key];
        }

        /**
         * Converts a camelCase dataset key to its corresponding kebab-case HTML attribute name.
         * Example: "aiuxcUniqueId" -> "data-aiuxc-unique-id"
         * @param {string} key
         * @returns {string}
         */
        static toAttributeName(key) {
            return 'data-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
        }

        /**
         * Generates a CSS attribute selector for a given key and optional value.
         * @param {string} key - The dataset key (camelCase).
         * @param {string} [value] - The specific value to match.
         * @returns {string} The CSS selector (e.g., `[data-aiuxc-id="123"]`).
         */
        static getSelector(key, value) {
            const attr = this.toAttributeName(key);
            if (value === undefined) {
                return `[${attr}]`;
            }
            return `[${attr}="${value}"]`;
        }
    }

    // =================================================================================
    // SECTION: Configuration Management (GM Storage)
    // Description: Handles persistent storage, validation, and sanitization of application settings.
    // =================================================================================

    /**
     * @description A centralized utility for validating and sanitizing configuration objects.
     * Uses THEME_VALIDATION_SCHEMA to drive validation logic generically.
     */
    const ConfigProcessor = {
        /**
         * Validates a single theme object and returns user-facing errors. Does not mutate the object.
         * @param {object} themeData The theme data to validate.
         * @param {boolean} isDefaultSet Whether the theme being validated is the defaultSet.
         * @returns {{isValid: boolean, errors: Array<{field: string, message: string}>}} Validation result.
         */
        validate(themeData, isDefaultSet) {
            /** @type {Array<{field: string, message: string}>} */
            const errors = [];

            // Iterate over the schema to validate fields present in the themeData
            for (const [configKey, rule] of Object.entries(THEME_VALIDATION_SCHEMA)) {
                // Skip metadata pattern validation for defaultSet
                if (isDefaultSet && rule.type === 'regexArray') continue;

                const value = getPropertyByPath(themeData, configKey);

                // Skip validation if value is undefined (not present in this update)
                // Note: null is a valid value for some fields (reset to default), so we check against undefined.
                if (value === undefined) continue;

                if (rule.type === 'image') {
                    const result = validateImageString(value, rule.imageType);
                    if (!result.isValid) {
                        errors.push({ field: configKey, message: `${rule.label} ${result.message}` });
                    }
                } else if (rule.type === 'regexArray') {
                    if (Array.isArray(value)) {
                        for (const p of value) {
                            try {
                                parseRegexPattern(p);
                            } catch (e) {
                                errors.push({ field: configKey, message: e.message });
                                break; // Stop after first invalid regex
                            }
                        }
                    }
                } else if (rule.type === 'color') {
                    // Allow null/empty for optional colors, but if set, must be valid
                    if (value && !validateColorString(value)) {
                        errors.push({ field: configKey, message: `${rule.label} Invalid color format.` });
                    }
                }
            }

            return { isValid: errors.length === 0, errors };
        },

        /**
         * Normalizes theme data by cleaning up array fields.
         * Specifically removes empty strings from regex pattern arrays.
         * @param {object} themeData The theme data to normalize.
         * @returns {object} The normalized theme data.
         */
        normalize(themeData) {
            const normalized = deepClone(themeData);
            const schema = THEME_VALIDATION_SCHEMA;

            for (const key in schema) {
                if (Object.prototype.hasOwnProperty.call(schema, key)) {
                    const rule = schema[key];
                    if (rule.type === 'regexArray') {
                        const value = getPropertyByPath(normalized, key);
                        if (Array.isArray(value)) {
                            // Remove empty strings or strings with only whitespace
                            const cleanValue = value.filter((v) => v && v.trim() !== '');
                            setPropertyByPath(normalized, key, cleanValue);
                        }
                    }
                }
            }
            return normalized;
        },

        /**
         * Processes and sanitizes an entire configuration object, applying defaults for invalid values.
         * Mutates the passed config object.
         * @param {AppConfig} config The full configuration object to process.
         * @returns {AppConfig} The sanitized configuration object.
         */
        process(config) {
            // 1. Sanitize Platform Specific Options & Collect defaultSets
            const platformDefaultSets = [];
            if (config.platforms) {
                // Use Object.entries to access the platform key (e.g., "ChatGPT") for default lookup
                Object.entries(config.platforms).forEach(([platformName, platformConfig]) => {
                    // Define critical sections to check and auto-repair.
                    // We check not just for existence, but also that they are valid objects.
                    const criticalSections = ['options', 'features', 'defaultSet'];

                    criticalSections.forEach((section) => {
                        // If section is missing, null, or not an object (e.g. string/number corrupted)
                        if (!isObject(platformConfig[section])) {
                            // Attempt to restore from the source code default constant
                            const defaultSection = DEFAULT_THEME_CONFIG.platforms[platformName]?.[section];
                            if (defaultSection) {
                                // Restoration successful: Deep clone to avoid reference issues
                                platformConfig[section] = deepClone(defaultSection);
                                Logger.warn('Config', '', `Restored corrupted section "${section}" for ${platformName} from defaults.`);
                            }
                        }
                    });

                    // Collect defaultSet AFTER potential restoration
                    if (platformConfig.defaultSet) {
                        platformDefaultSets.push(platformConfig.defaultSet);
                    }

                    // Validate Features
                    if (platformConfig.features) {
                        // Ensure fixed_nav_console feature object is valid before checking position
                        if (!isObject(platformConfig.features.fixed_nav_console)) {
                            const defaultFeature = DEFAULT_THEME_CONFIG.platforms[platformName]?.features?.fixed_nav_console;
                            if (defaultFeature) {
                                platformConfig.features.fixed_nav_console = deepClone(defaultFeature);
                            }
                        }

                        const consoleFeature = platformConfig.features.fixed_nav_console;
                        // Check position enum if feature exists (it should now, unless default is also missing)
                        if (consoleFeature) {
                            const validPositions = Object.values(CONSTANTS.CONSOLE_POSITIONS);
                            if (!validPositions.includes(consoleFeature.position)) {
                                consoleFeature.position = CONSTANTS.CONSOLE_POSITIONS.INPUT_TOP;
                            }
                        }
                    }

                    // Sanitize icon_size
                    if (!CONSTANTS.UI_SPECS.AVATAR.SIZE_OPTIONS.includes(platformConfig.options.icon_size)) {
                        platformConfig.options.icon_size = CONSTANTS.UI_SPECS.AVATAR.DEFAULT_SIZE;
                    }

                    // Sanitize chat_content_max_width
                    const width = platformConfig.options.chat_content_max_width;
                    const widthConfig = CONSTANTS.SLIDER_CONFIGS.CHAT_WIDTH;
                    const defaultValue = widthConfig.DEFAULT;
                    let sanitized = false;
                    if (width === null) {
                        sanitized = true;
                    } else if (typeof width === 'string' && width.endsWith('vw')) {
                        const numVal = parseInt(width, 10);
                        if (!isNaN(numVal) && numVal >= widthConfig.NULL_THRESHOLD && numVal <= widthConfig.MAX) {
                            sanitized = true;
                        }
                    }
                    if (!sanitized) {
                        platformConfig.options.chat_content_max_width = defaultValue;
                    }
                });
            }

            // 2. Sanitize all theme sets and the platform default sets using the Schema
            const allThemes = [...(config.themeSets || []), ...platformDefaultSets];
            for (const theme of allThemes) {
                if (!theme) continue;

                // Iterate over schema to sanitize known properties
                for (const [configKey, rule] of Object.entries(THEME_VALIDATION_SCHEMA)) {
                    if (rule.type === 'numeric') {
                        const value = getPropertyByPath(theme, configKey);
                        // Fallback logic for sanitization relies on the hardcoded DEFAULT_THEME_CONFIG structure.
                        // We use the current platform's default set as the source of truth for "factory defaults".
                        const factoryDefaultValue = getPropertyByPath(DEFAULT_THEME_CONFIG.platforms[PLATFORM].defaultSet, configKey);
                        const sanitizedValue = this._sanitizeNumericProperty(value, rule, factoryDefaultValue);

                        // Apply sanitized value back to the object
                        setPropertyByPath(theme, configKey, sanitizedValue);
                    } else if (rule.type === 'image') {
                        const value = getPropertyByPath(theme, configKey);
                        const result = validateImageString(value, rule.imageType);
                        // If invalid format, throw error to prevent saving (Storage integrity)
                        // Note: User typing in modal is handled by validate(), this is for load-time/import checks.
                        if (!result.isValid) {
                            // Reset to null if invalid to prevent app crash, but log warning
                            Logger.warn('Config', '', `Invalid image in config [${configKey}]: ${result.message}. Resetting to null.`);
                            setPropertyByPath(theme, configKey, null);
                        }
                    } else if (rule.type === 'regexArray') {
                        const value = getPropertyByPath(theme, configKey);
                        if (Array.isArray(value)) {
                            // Filter out invalid regexes
                            const validPatterns = value.filter((p) => {
                                try {
                                    parseRegexPattern(p);
                                    return true;
                                } catch (e) {
                                    Logger.warn('Config', '', `Invalid pattern in config [${configKey}]: ${e.message}. Removing.`);
                                    return false;
                                }
                            });
                            setPropertyByPath(theme, configKey, validPatterns);
                        }
                    } else if (rule.type === 'color') {
                        const value = getPropertyByPath(theme, configKey);
                        if (value && !validateColorString(value)) {
                            Logger.warn('Config', '', `Invalid color in config [${configKey}]: "${value}". Resetting to null.`);
                            setPropertyByPath(theme, configKey, null);
                        }
                    }
                }
            }

            return config;
        },

        /**
         * @private
         * Validates and sanitizes a numeric property based on the provided rule.
         * @param {string | number | null} value The value to sanitize.
         * @param {object} rule The validation rule from THEME_VALIDATION_SCHEMA.
         * @param {string | null} defaultValue The fallback value.
         * @returns {string | null} The sanitized value.
         */
        _sanitizeNumericProperty(value, rule, defaultValue) {
            if (rule.nullable && value === null) {
                return null;
            }

            // If unit is defined, value must be a string ending with that unit
            if (rule.unit) {
                // Strict check: Value must be strictly numeric followed by unit (e.g. "8px").
                const regex = new RegExp(`^-?\\d+(?:\\.\\d+)?${escapeRegExp(rule.unit)}$`);

                if (typeof value !== 'string' || !regex.test(value)) {
                    return defaultValue === null ? null : String(defaultValue);
                }
                const numVal = parseInt(value, 10);
                if (isNaN(numVal) || numVal < rule.min || numVal > rule.max) {
                    return defaultValue === null ? null : String(defaultValue);
                }
                return String(value);
            }

            // Raw numeric check (if no unit specified in future)
            if (typeof value === 'number') {
                if (value < rule.min || value > rule.max) {
                    return defaultValue === null ? null : String(defaultValue);
                }
                return String(value);
            }
            return defaultValue === null ? null : String(defaultValue);
        },
    };

    /**
     * @class ConfigManager
     * @description Manages the application configuration, including loading, saving, validation, and sanitization.
     * Handles interaction with the underlying storage mechanism (GM_getValue/GM_setValue) and ensures configuration integrity.
     */
    class ConfigManager {
        /**
         * @param {DataConverter} dataConverter - Service for converting data formats (e.g., images).
         */
        constructor(dataConverter) {
            this.ROOT_KEY = CONSTANTS.STORAGE_SETTINGS.ROOT_KEY;
            this.THEME_PREFIX = CONSTANTS.STORAGE_SETTINGS.THEME_PREFIX;
            this.DEFAULT_CONFIG = DEFAULT_THEME_CONFIG;
            /** @type {AppConfig|null} */
            this.config = null;
            this.dataConverter = dataConverter;

            // Cache for dirty checking
            this._manifestCache = null; // Raw string from storage (includes updatedAt)
            this._lastSavedManifestContent = null; // Stringified content without updatedAt
            /** @type {Map<string, string>} */
            this._themeCache = new Map();
            /** @type {string[]} */
            this.loadErrors = [];
        }

        /**
         * Loads the configuration from storage and merges it with defaults.
         * Applies validation and sanitization immediately after loading.
         * @param {boolean} updateState - Whether to update the internal state (this.config). Set to false for sync detection.
         * @returns {Promise<AppConfig>} The fully loaded and resolved configuration object.
         */
        async load(updateState) {
            // 1. Load Manifest
            const manifestRaw = await GM_getValue(this.ROOT_KEY);
            let loadedConfig = null;

            if (updateState) {
                this.loadErrors = [];
                // Clear cache to prevent memory leaks from deleted themes when reloading
                this._themeCache.clear();
            }

            if (manifestRaw) {
                try {
                    /** @type {StorageManifest} */
                    const manifest = JSON.parse(manifestRaw);

                    // Validate manifest structure
                    if (!manifest || !Array.isArray(manifest.themeIndex)) {
                        throw new Error('Invalid manifest structure: themeIndex is missing or invalid.');
                    }

                    if (updateState) {
                        this._manifestCache = manifestRaw;
                        // Cache content without updatedAt for save comparison
                        const content = { ...manifest };
                        delete content.updatedAt;
                        this._lastSavedManifestContent = JSON.stringify(content);
                    }

                    // 2. Load Themes in parallel (Resilient loading)
                    const themePromises = manifest.themeIndex.map(async (id) => {
                        try {
                            const themeKey = id;
                            const themeRaw = await GM_getValue(themeKey);
                            if (themeRaw) {
                                if (updateState) {
                                    this._themeCache.set(id, themeRaw);
                                }
                                return JSON.parse(themeRaw);
                            }
                            return null;
                        } catch (e) {
                            // Skip corrupted theme files instead of failing the entire load
                            Logger.warn('Config', '', `Failed to load theme ${id}:`, e);
                            if (updateState) {
                                this.loadErrors.push(`Theme ${id}: ${e.message}`);
                            }
                            return null;
                        }
                    });

                    const themes = (await Promise.all(themePromises)).filter((t) => t !== null);

                    // 3. Reconstruct AppConfig
                    loadedConfig = {
                        ...manifest.config,
                        themeSets: themes,
                    };
                } catch (e) {
                    Logger.error('LOAD FAILED', LOG_STYLES.RED, 'Failed to parse configuration. Resetting to default settings.', e);
                    if (updateState) {
                        this.loadErrors.push(`Manifest Error: ${e.message}`);
                    }
                    loadedConfig = null;
                }
            }

            const completeConfig = deepClone(this.DEFAULT_CONFIG);
            const resolvedConfig = resolveConfig(completeConfig, loadedConfig || {});
            ConfigProcessor.process(resolvedConfig);

            if (updateState) {
                this.config = resolvedConfig;
            }

            return resolvedConfig;
        }

        /**
         * Saves the configuration object to storage.
         * Splits data into Manifest and individual Theme keys.
         * Performs dirty checking to minimize writes.
         * Enforces save order: Themes -> Manifest (Commit) -> GC (Cleanup).
         * optimized to avoid deep cloning large theme data and includes optimistic locking for GC.
         * @param {AppConfig} obj - The configuration object to save.
         * @returns {Promise<void>} Resolves when save is successful.
         */
        async save(obj) {
            // 1. Sanitization & Normalization
            // Do NOT deepClone the entire object to avoid performance hit with large images.
            const { themeSets, ...configWithoutThemes } = obj;
            const validThemes = [];
            const uniqueIds = new Set();

            // Validate and Deduplicate Themes
            for (const theme of themeSets) {
                let currentTheme = theme;
                let isModified = false;

                // Ensure metadata exists
                if (!currentTheme.metadata) {
                    currentTheme = { ...currentTheme, metadata: { id: '', name: 'Unnamed Theme', matchPatterns: [], urlPatterns: [] } };
                    isModified = true;
                }

                let id = currentTheme.metadata.id;
                // If ID is missing or duplicate, generate a new one
                if (!id || typeof id !== 'string' || uniqueIds.has(id)) {
                    const newId = generateUniqueId('theme');
                    Logger.warn('Config', '', `Fixed invalid or duplicate theme ID. New ID: ${newId}`);

                    if (!isModified) {
                        // Shallow clone specific theme to modify ID safely
                        currentTheme = { ...currentTheme, metadata: { ...currentTheme.metadata } };
                    }
                    currentTheme.metadata.id = newId;
                    id = newId;
                }

                uniqueIds.add(id);
                validThemes.push(currentTheme);
            }

            // Create a safe config structure (shallow copy)
            const safeConfig = {
                ...configWithoutThemes,
                themeSets: validThemes,
            };

            let hasThemeChange = false;

            // 2. Save Themes (Pre-commit)
            // Wrapped in try-catch to handle QuotaExceededError and prevent partial writes from corrupting the manifest trigger.
            try {
                for (const theme of validThemes) {
                    const id = theme.metadata.id;
                    const themeString = JSON.stringify(theme);

                    if (themeString !== this._themeCache.get(id)) {
                        await GM_setValue(id, themeString);
                        this._themeCache.set(id, themeString);
                        hasThemeChange = true;
                    }
                }
            } catch (e) {
                Logger.error('Config', '', 'Failed to save themes. Storage quota might be exceeded.', e);
                // Propagate error to UI to notify user, do NOT proceed to save manifest.
                throw e;
            }

            // 3. Save Manifest (Commit)
            const tempManifest = {
                schemaVersion: 1,
                config: configWithoutThemes,
                themeIndex: validThemes.map((t) => t.metadata.id),
            };
            const tempManifestString = JSON.stringify(tempManifest);
            const hasManifestChange = tempManifestString !== this._lastSavedManifestContent;

            const commitTimestamp = Date.now();

            // Explicitly update timestamp and write manifest if there are ANY changes (theme content OR manifest structure).
            // This ensures that even if only a color inside a theme changed (without changing ID list), the updated manifest
            // will signal the SyncManager in other tabs to reload.
            if (hasThemeChange || hasManifestChange) {
                /** @type {StorageManifest} */
                const finalManifest = {
                    ...tempManifest,
                    updatedAt: commitTimestamp,
                };
                const finalManifestString = JSON.stringify(finalManifest);

                try {
                    await GM_setValue(this.ROOT_KEY, finalManifestString);
                    this._manifestCache = finalManifestString;
                    // Update the cache check only after successful commit.
                    // This ensures that if saving fails, the cache remains stale so the next attempt detects a change.
                    this._lastSavedManifestContent = tempManifestString;
                } catch (e) {
                    Logger.error('Config', '', 'Failed to save manifest.', e);
                    throw e;
                }
            }

            // 4. Garbage Collection (Safe GC)
            // Removes orphaned theme files that are no longer in the manifest.
            // Includes optimistic locking to prevent deleting files created by other tabs during our save process.
            try {
                // Re-fetch manifest to check if another tab has updated it since our save
                const currentManifestRaw = await GM_getValue(this.ROOT_KEY);
                let isSafeToGC = false;

                if (currentManifestRaw) {
                    const currentManifest = JSON.parse(currentManifestRaw);
                    // If the updatedAt matches what we just wrote (or if we didn't write, what we read last), it's safe.
                    // If timestamp differs, another tab wrote something, so we abort GC to be safe.
                    if (hasThemeChange || hasManifestChange) {
                        isSafeToGC = currentManifest.updatedAt === commitTimestamp;
                    } else {
                        // If we didn't save, we check against our cached manifest
                        const cachedManifest = this._manifestCache ? JSON.parse(this._manifestCache) : null;
                        isSafeToGC = cachedManifest && currentManifest.updatedAt === cachedManifest.updatedAt;
                    }
                }

                if (isSafeToGC) {
                    const allKeys = await GM_listValues();
                    const validThemeKeys = new Set(validThemes.map((t) => t.metadata.id));

                    for (const key of allKeys) {
                        if (key.startsWith(this.THEME_PREFIX) && !validThemeKeys.has(key)) {
                            await GM_deleteValue(key);
                            this._themeCache.delete(key);
                            Logger.log('Config', LOG_STYLES.TEAL, `GC: Deleted orphaned theme: ${key}`);
                        }
                    }
                } else {
                    Logger.log('Config', LOG_STYLES.TEAL, 'GC: Skipped garbage collection due to potential concurrent modification by another tab.');
                }
            } catch (e) {
                Logger.warn('Config', '', 'GC: Failed to perform garbage collection.', e);
            }

            // 5. Update Internal State
            this.config = safeConfig;
            EventBus.publish(EVENTS.CONFIG_SAVE_SUCCESS);
        }

        /**
         * Retrieves the current configuration object synchronously.
         * @returns {AppConfig|null} The current configuration object, or null if not yet loaded.
         */
        get() {
            return this.config;
        }

        /**
         * Helper to retrieve the current icon size setting.
         * @returns {number} The icon size in pixels.
         */
        getIconSize() {
            return this.config?.platforms?.[PLATFORM]?.options?.icon_size || CONSTANTS.UI_SPECS.AVATAR.DEFAULT_SIZE;
        }

        /**
         * Calculates the JSON string size of the configuration object.
         * Applies sanitization to match the data that will actually be saved.
         * @param {AppConfig} config
         * @returns {number} Size in bytes.
         */
        getConfigSize(config) {
            const cleanConfig = sanitizeConfigForSave(config);
            const json = JSON.stringify(cleanConfig);
            return new Blob([json]).size;
        }

        /**
         * Checks if the given size exceeds the storage limit.
         * @param {number} size
         * @returns {boolean}
         */
        isSizeExceeded(size) {
            return size > CONSTANTS.STORAGE_SETTINGS.CONFIG_SIZE_LIMIT_BYTES;
        }
    }

    // =================================================================================
    // SECTION: Sync Manager
    // Description: Synchronizes configuration changes across open tabs/windows in real-time.
    // =================================================================================

    class SyncManager extends BaseManager {
        constructor() {
            super();
            this.listenerId = null;
            this.lastProcessedTime = 0;
            this.debouncedProcess = null;
        }

        _onInit() {
            // Initialize the debounced processor with a delay to throttle rapid updates
            this.debouncedProcess = debounce(this._processRemoteChange.bind(this), 300, false);
            this.addDisposable(this.debouncedProcess.cancel);

            // Monitor the Root Key (Manifest) for changes.
            // Any change to the root key (including updatedAt) signals a config update.
            const listenerId = GM_addValueChangeListener(CONSTANTS.STORAGE_SETTINGS.ROOT_KEY, (name, oldValue, newValue, remote) => {
                // Only process changes originating from other tabs/windows
                if (remote) {
                    this.debouncedProcess(newValue);
                }
            });
            this.listenerId = listenerId;

            // Register cleanup: remove listener and reset state
            this.addDisposable(() => {
                GM_removeValueChangeListener(listenerId);
                this.listenerId = null;
                this.debouncedProcess = null;
            });
        }

        _onDestroy() {
            // Cleanup handled by disposables.
        }

        /**
         * Processes the remote change string after debounce.
         * Parses JSON and checks timestamps to avoid redundant updates.
         * @private
         * @param {string} newValue - The raw JSON string from storage.
         */
        _processRemoteChange(newValue) {
            if (!newValue) return;

            let shouldUpdate = false;
            let newTimestamp = 0;

            try {
                const manifest = JSON.parse(newValue);

                // Validate structure and check timestamp
                if (manifest && typeof manifest.updatedAt === 'number') {
                    newTimestamp = manifest.updatedAt;
                    // Only proceed if this update is newer than the last one we processed
                    if (newTimestamp > this.lastProcessedTime) {
                        shouldUpdate = true;
                    } else {
                        Logger.debug('SyncManager', LOG_STYLES.TEAL, `Skipped stale event. (Current: ${newTimestamp}, Last: ${this.lastProcessedTime})`);
                    }
                } else {
                    // Fallback for legacy data or corruption: force update to be safe
                    shouldUpdate = true;
                    newTimestamp = Date.now();
                }
            } catch (e) {
                Logger.warn('SyncManager', '', 'Failed to parse remote config. Forcing update.', e);
                shouldUpdate = true;
                newTimestamp = Date.now();
            }

            if (shouldUpdate) {
                this.lastProcessedTime = newTimestamp;
                Logger.log('SyncManager', LOG_STYLES.TEAL, 'Remote config change detected. Publishing event.');
                EventBus.publish(EVENTS.REMOTE_CONFIG_CHANGED);
            }
        }
    }

    // =================================================================================
    // SECTION: Navigation Monitor
    // Description: Centralizes URL change detection via history API hooks and popstate events.
    // =================================================================================

    class NavigationMonitor {
        constructor() {
            this.originalHistoryMethods = { pushState: null, replaceState: null };
            this._historyWrappers = {};
            this.isInitialized = false;
            this.lastPath = null;
            this._handlePopState = this._handlePopState.bind(this);

            // Debounce the navigation event to allow the DOM to settle and prevent duplicate events
            this.debouncedNavigation = debounce(
                () => {
                    EventBus.publish(EVENTS.NAVIGATION);
                },
                CONSTANTS.TIMING.TIMEOUTS.POST_NAVIGATION_DOM_SETTLE,
                true
            );
        }

        init() {
            if (this.isInitialized) return;
            this.isInitialized = true;
            // Capture initial path
            this.lastPath = location.pathname + location.search;
            this._hookHistory();
            window.addEventListener('popstate', this._handlePopState);
        }

        destroy() {
            if (!this.isInitialized) return;
            this._restoreHistory();
            window.removeEventListener('popstate', this._handlePopState);
            this.debouncedNavigation.cancel();
            this.isInitialized = false;
        }

        _hookHistory() {
            // Capture the instance for use in the wrapper
            const instance = this;

            for (const m of ['pushState', 'replaceState']) {
                const orig = history[m];
                this.originalHistoryMethods[m] = orig;

                const wrapper = function (...args) {
                    const result = orig.apply(this, args);
                    instance._onUrlChange();
                    return result;
                };

                this._historyWrappers[m] = wrapper;
                history[m] = wrapper;
            }
        }

        _restoreHistory() {
            for (const m of ['pushState', 'replaceState']) {
                if (this.originalHistoryMethods[m]) {
                    if (history[m] === this._historyWrappers[m]) {
                        history[m] = this.originalHistoryMethods[m];
                    } else {
                        Logger.warn('HISTORY HOOK', LOG_STYLES.YELLOW, `history.${m} has been wrapped by another script. Skipping restoration to prevent breaking the chain.`);
                    }
                    this.originalHistoryMethods[m] = null;
                }
            }
            this._historyWrappers = {};
        }

        _handlePopState() {
            this._onUrlChange();
        }

        _onUrlChange() {
            const currentPath = location.pathname + location.search;

            // Prevent re-triggers if the path hasn't actually changed
            if (currentPath === this.lastPath) {
                return;
            }
            this.lastPath = currentPath;

            EventBus.publish(EVENTS.NAVIGATION_START);
            this.debouncedNavigation();
        }
    }

    // =================================================================================
    // SECTION: Image Data Management
    // Description: Handles fetching external images and converting them to data URLs to bypass CSP.
    // =================================================================================

    class ImageDataManager {
        constructor(dataConverter) {
            this.dataConverter = dataConverter;
            /** @type {Map<string, {data: string, size: number}>} */
            this.cache = new Map();
            /** @type {Set<string>} */
            this.failedUrls = new Set();
            this.currentCacheSize = 0;
        }

        /**
         * Ensures there is enough space in the cache for a new item.
         * If not, it evicts the least recently used items until there is space.
         * @private
         * @param {number} newItemSize - The size of the new item to be added.
         */
        _makeSpaceForNewItem(newItemSize) {
            if (newItemSize > CONSTANTS.STORAGE_SETTINGS.CACHE_SIZE_LIMIT_BYTES) {
                Logger.warn('CACHE LIMIT', LOG_STYLES.YELLOW, `Item size (${newItemSize}) exceeds cache limit (${CONSTANTS.STORAGE_SETTINGS.CACHE_SIZE_LIMIT_BYTES}). Cannot be cached.`);
                return;
            }
            while (this.currentCacheSize + newItemSize > CONSTANTS.STORAGE_SETTINGS.CACHE_SIZE_LIMIT_BYTES && this.cache.size > 0) {
                // Evict the least recently used item (first item in map iterator)
                const oldestKey = this.cache.keys().next().value;
                const oldestItem = this.cache.get(oldestKey);
                if (oldestItem) {
                    this.currentCacheSize -= oldestItem.size;
                    this.cache.delete(oldestKey);
                    Logger.log('CACHE', '', `Evicted ${oldestKey} from cache to free up space.`);
                }
            }
        }

        /**
         * Clears the record of failed URLs, allowing retry on next fetch attempt.
         */
        clearFailedUrls() {
            this.failedUrls.clear();
        }

        /**
         * Gets an image as a data URL. Returns a cached version immediately if available.
         * Can fetch and resize the image based on the provided options.
         * @param {string} url The URL of the image to fetch.
         * @param {object} resizeOptions Optional resizing parameters.
         * @param {number} [resizeOptions.width] The target max width for resizing.
         * @param {number} [resizeOptions.height] The target max height for resizing.
         * @param {AbortSignal} [resizeOptions.signal] Signal to abort the request.
         * @returns {Promise<string|null>} A promise that resolves with the data URL or null on failure.
         */
        async getImageAsDataUrl(url, resizeOptions) {
            if (!url || typeof url !== 'string' || !url.startsWith('http')) {
                return url; // Return data URIs or other values directly
            }

            const width = resizeOptions?.width;
            const height = resizeOptions?.height;
            const signal = resizeOptions?.signal;

            const cacheKey = width ? `${url}|w=${width},h=${height}` : url;

            if (this.failedUrls.has(cacheKey)) {
                return null;
            }

            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                // Move to the end of the map to mark as recently used
                this.cache.delete(cacheKey);
                this.cache.set(cacheKey, cached);
                return cached.data;
            }

            return new Promise((resolve) => {
                let abortHandler = null;

                // Helper to clean up the abort listener to prevent memory leaks
                const cleanupListener = () => {
                    if (signal && abortHandler) {
                        signal.removeEventListener('abort', abortHandler);
                        abortHandler = null;
                    }
                };

                // If already aborted, resolve immediately
                if (signal?.aborted) {
                    resolve(null);
                    return;
                }

                const request = GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'blob',
                    onload: async (response) => {
                        // Guard: If aborted during the request but before onload fired, stop processing.
                        if (signal?.aborted) {
                            cleanupListener();
                            resolve(null);
                            return;
                        }

                        if (response.status >= 200 && response.status < 300) {
                            try {
                                const dataUrl = await this.dataConverter.imageToOptimizedDataUrl(response.response, {
                                    maxWidth: width,
                                    maxHeight: height,
                                    quality: 0.85,
                                });
                                // Check abort again after heavy processing (image conversion)
                                if (signal?.aborted) {
                                    cleanupListener();
                                    resolve(null);
                                    return;
                                }

                                const size = new Blob([dataUrl]).size;

                                this._makeSpaceForNewItem(size);
                                this.cache.set(cacheKey, { data: dataUrl, size });
                                this.currentCacheSize += size;
                                resolve(dataUrl);
                            } catch (e) {
                                // Guard: If the error was caused or accompanied by an abort, do not mark as failed.
                                if (signal?.aborted) {
                                    cleanupListener();
                                    resolve(null);
                                    return;
                                }
                                Logger.error('CONVERSION FAILED', LOG_STYLES.RED, `Data conversion error for URL: ${url}`, e);
                                this.failedUrls.add(cacheKey);
                                resolve(null);
                            }
                        } else {
                            Logger.error('FETCH FAILED', LOG_STYLES.RED, `HTTP Error: ${response.status}, URL: ${url}`);
                            this.failedUrls.add(cacheKey);
                            resolve(null);
                        }
                        cleanupListener();
                    },
                    onerror: (error) => {
                        if (signal?.aborted) {
                            cleanupListener();
                            resolve(null);
                            return;
                        }
                        Logger.error('FETCH FAILED', LOG_STYLES.RED, `GM_xmlhttpRequest error for URL: ${url}`, error);
                        this.failedUrls.add(cacheKey);
                        cleanupListener();
                        resolve(null);
                    },
                    ontimeout: () => {
                        if (signal?.aborted) {
                            cleanupListener();
                            resolve(null);
                            return;
                        }
                        Logger.error('FETCH FAILED', LOG_STYLES.RED, `GM_xmlhttpRequest timeout for URL: ${url}`);
                        this.failedUrls.add(cacheKey);
                        cleanupListener();
                        resolve(null);
                    },
                    onabort: () => {
                        // Handle system-initiated aborts where signal.aborted might not be true yet or relevant
                        cleanupListener();
                        resolve(null);
                    },
                });

                // Attach abort listener if signal is provided
                if (signal) {
                    abortHandler = () => {
                        request.abort();
                        cleanupListener();
                        resolve(null); // Resolve with null to safely release the await in caller
                    };
                    signal.addEventListener('abort', abortHandler);
                }
            });
        }
    }

    // =================================================================================
    // SECTION: Message Cache Management
    // Description: Centralized manager for caching and sorting message elements from the DOM.
    // =================================================================================

    class MessageCacheManager extends BaseManager {
        /**
         * @param {object} streamingState - Shared state object for streaming status.
         */
        constructor(streamingState) {
            super();
            this.userMessages = [];
            this.assistantMessages = [];
            this.totalMessages = [];
            this.elementMap = new Map();
            this.streamingState = streamingState;
            this.debouncedRebuildCache = debounce(this._rebuildCache.bind(this), CONSTANTS.TIMING.DEBOUNCE_DELAYS.CACHE_UPDATE, true);
        }

        _onInit() {
            this._subscribe(EVENTS.CACHE_UPDATE_REQUEST, () => this.debouncedRebuildCache());
            this._subscribe(EVENTS.NAVIGATION, () => {
                this.clear();
                // Force reset streaming state on navigation to prevent deadlocks
                this.streamingState.isActive = false;
            });
            // Streaming state is managed via shared object, so we don't need to listen to START to update a flag.
            // We only need to listen to END to trigger a cache rebuild.
            this._subscribe(EVENTS.STREAMING_END, () => {
                this.debouncedRebuildCache();
            });
            this._rebuildCache();

            this.addDisposable(this.debouncedRebuildCache.cancel);
        }

        _onDestroy() {
            this.userMessages = [];
            this.assistantMessages = [];
            this.totalMessages = [];
            this.elementMap.clear();
        }

        _rebuildCache() {
            if (this.streamingState.isActive) return;

            Logger.info('CACHE', LOG_STYLES.TEAL, 'Rebuilding cache...');

            // Guard clause: If no conversation turns are on the page (e.g., on the homepage), clear the cache and exit.
            // Even if the cache is already empty, we must call clear() (which triggers notify())
            // to ensure ObserverManager receives the "0 messages" signal for navigation completion detection.
            if (!document.querySelector(CONSTANTS.SELECTORS.CONVERSATION_UNIT)) {
                this.clear();
                return;
            }

            // Limit search scope to the messages root container
            const rootContainer = PlatformAdapters.General.getMessagesRoot();

            // Filter explicitly for HTMLElements to satisfy TypeScript and allow dataset access later
            this.userMessages = Array.from(rootContainer.querySelectorAll(CONSTANTS.SELECTORS.USER_MESSAGE)).filter((el) => el instanceof HTMLElement);
            const rawAssistantMessages = Array.from(rootContainer.querySelectorAll(CONSTANTS.SELECTORS.ASSISTANT_MESSAGE)).filter((el) => el instanceof HTMLElement);
            // Filter out empty, non-functional message containers that might appear in image-only turns.
            this.assistantMessages = rawAssistantMessages.filter((msg) => PlatformAdapters.General.filterMessage(msg));

            // Construct totalMessages using a linear merge sort approach (O(N)).
            // Since querySelectorAll returns elements in document order, userMessages and assistantMessages are already sorted.
            const total = [];
            let u = 0,
                a = 0;
            const uLen = this.userMessages.length;
            const aLen = this.assistantMessages.length;

            while (u < uLen && a < aLen) {
                const uMsg = this.userMessages[u];
                const aMsg = this.assistantMessages[a];
                // Check position: Node.DOCUMENT_POSITION_FOLLOWING (4) means aMsg follows uMsg (uMsg comes first).
                if (uMsg.compareDocumentPosition(aMsg) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    total.push(uMsg);
                    u++;
                } else {
                    total.push(aMsg);
                    a++;
                }
            }
            // Append any remaining elements
            while (u < uLen) total.push(this.userMessages[u++]);
            while (a < aLen) total.push(this.assistantMessages[a++]);

            this.totalMessages = total;

            // Rebuild the lookup map for O(1) access.
            // This must be done after the arrays are fully filtered and sorted to ensure consistency.
            this.elementMap.clear();

            // Use for loops for better performance in hot paths
            for (let i = 0; i < this.userMessages.length; i++) {
                this.elementMap.set(this.userMessages[i], { role: CONSTANTS.INTERNAL_ROLES.USER, index: i, totalIndex: -1 });
            }
            for (let i = 0; i < this.assistantMessages.length; i++) {
                this.elementMap.set(this.assistantMessages[i], { role: CONSTANTS.INTERNAL_ROLES.ASSISTANT, index: i, totalIndex: -1 });
            }

            // Populate totalIndex using the sorted totalMessages array
            for (let i = 0; i < this.totalMessages.length; i++) {
                const entry = this.elementMap.get(this.totalMessages[i]);
                if (entry) {
                    entry.totalIndex = i;
                }
            }

            this.notify();
        }

        /**
         * Publishes the :cacheUpdated event with the current cache state.
         * Useful for notifying newly initialized components.
         */
        notify() {
            EventBus.publish(EVENTS.CACHE_UPDATED);
        }

        /**
         * Finds the role and index of a given message element within the cached arrays.
         * @param {HTMLElement} messageElement The element to find.
         * @returns {{role: 'user'|'assistant', index: number, totalIndex: number} | null} An object with the role and index, or null if not found.
         */
        findMessageIndex(messageElement) {
            return this.elementMap.get(messageElement) || null;
        }

        /**
         * Retrieves a message element at a specific index for a given role.
         * @param {'user'|'assistant'} role The role of the message to retrieve.
         * @param {number} index The index of the message in its role-specific array.
         * @returns {HTMLElement | null} The element at the specified index, or null if out of bounds.
         */
        getMessageAtIndex(role, index) {
            const targetArray = role === 'user' ? this.userMessages : this.assistantMessages;
            if (index >= 0 && index < targetArray.length) {
                return targetArray[index];
            }
            return null;
        }

        clear() {
            this.userMessages = [];
            this.assistantMessages = [];
            this.totalMessages = [];
            this.elementMap.clear();
            this.notify();
        }

        /**
         * Gets the cached user message elements.
         * @returns {HTMLElement[]} An array of user message elements.
         */
        getUserMessages() {
            return this.userMessages;
        }

        /**
         * Gets the cached assistant message elements.
         * @returns {HTMLElement[]} An array of assistant message elements.
         */
        getAssistantMessages() {
            return this.assistantMessages;
        }

        /**
         * Gets all cached message elements (user and assistant combined).
         * @returns {HTMLElement[]} An array of all message elements.
         */
        getTotalMessages() {
            return this.totalMessages;
        }
    }

    // =================================================================================
    // SECTION: Theme and Style Management
    // Description: Applies theme configuration changes to the DOM via CSS variables.
    // =================================================================================

    /**
     * A helper function to safely retrieve a nested property from an object using a dot-notation string.
     * @param {object} obj The object to query.
     * @param {string} path The dot-separated path to the property.
     * @returns {any} The value of the property, or undefined if not found.
     */
    function getPropertyByPath(obj, path) {
        if (!obj || typeof path !== 'string') {
            return undefined;
        }
        return path.split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj);
    }

    class ThemeManager extends BaseManager {
        /**
         * @param {ConfigManager} configManager
         * @param {ImageDataManager} imageDataManager
         */
        constructor(configManager, imageDataManager) {
            super();
            this.configManager = configManager;
            this.imageDataManager = imageDataManager;
            this.themeStyleElem = null;
            this.dynamicRulesStyleElem = null;
            this.staticStyleHandle = null;
            this.dynamicStyleHandle = null;
            this.lastURL = null;
            this.lastTitle = null;
            this.lastAppliedThemeSet = null;
            this.cachedTitle = null;
            /** @type {ThemeSet | null} */
            this.cachedThemeSet = null;
            /** @type {Array<{pattern: RegExp, set: ThemeSet, type: 'url'|'title'}>} */
            this.patternCache = [];
            this.debouncedUpdateTheme = debounce(this.updateTheme.bind(this), CONSTANTS.TIMING.DEBOUNCE_DELAYS.THEME_UPDATE, true);
            this.isDestroyed = false;
            this.currentRequestId = 0;
            /** @type {Map<string, string|null>} */
            this.lastAppliedImageValues = new Map();
            this.lastAppliedIconSize = 0;
            this.themeAbortController = null; // Controller to manage cancellation of pending image fetches

            // State for layout preview and throttling
            this.cachedPreviewWidth = undefined; // undefined: no preview, null: preview default, string: preview value
            this.isLayoutUpdateScheduled = false;
        }

        _onInit() {
            this.isLayoutUpdateScheduled = false;
            this._subscribe(EVENTS.NAVIGATION, () => this._onNavigation());
            this._subscribe(EVENTS.TITLE_CHANGED, () => this.debouncedUpdateTheme(false));
            this._subscribe(EVENTS.THEME_UPDATE, () => this.debouncedUpdateTheme(false));
            this._subscribe(EVENTS.DEFERRED_LAYOUT_UPDATE, () => this.scheduleLayoutUpdate());

            // Handle layout changes with throttling
            this._subscribe(EVENTS.WINDOW_RESIZED, () => this.scheduleLayoutUpdate());
            this._subscribe(EVENTS.SIDEBAR_LAYOUT_CHANGED, () => this.scheduleLayoutUpdate());

            // Update cache and schedule layout update on width preview
            this._subscribe(EVENTS.WIDTH_PREVIEW, (width) => {
                this.cachedPreviewWidth = width;
                this.scheduleLayoutUpdate();
            });

            // Rebuild cache on config update to keep references fresh
            this._subscribe(EVENTS.CONFIG_UPDATED, (newConfig) => {
                this._rebuildPatternCache(newConfig);
                // Clear theme cache to force re-evaluation with new patterns
                this.cachedThemeSet = null;
                // Clear preview cache on save
                this.cachedPreviewWidth = undefined;
                this.debouncedUpdateTheme(false);
            });

            // Initialize styles and hold references
            this.staticStyleHandle = StyleManager.request(StyleDefinitions.getStaticBase);
            this.themeStyleElem = document.getElementById(this.staticStyleHandle.id);

            this.dynamicStyleHandle = StyleManager.request(StyleDefinitions.getDynamicRules);
            this.dynamicRulesStyleElem = document.getElementById(this.dynamicStyleHandle.id);

            // Register cleanup resources
            this.addDisposable(this.debouncedUpdateTheme.cancel);
            this.addDisposable(() => this.themeAbortController?.abort());
            this.addDisposable(() => this._cleanupCssVariables());

            // Build initial cache
            this._rebuildPatternCache(this.configManager.get());
        }

        _onDestroy() {
            // Cleanup handled by disposables.
            // Do NOT nullify style handles here, as they are required for cleanupCssVariables.

            // Clear caches to release memory
            this.patternCache = [];
            this.lastAppliedImageValues.clear();
            this.cachedThemeSet = null;
            this.cachedTitle = null;

            // Clear DOM references (optional, but good for GC)
            this.themeStyleElem = null;
            this.dynamicRulesStyleElem = null;
        }

        /**
         * @private
         * Rebuilds the regex pattern cache from the provided configuration.
         * Sanitizes flags (removes 'g' and 'y') to ensure stateless matching.
         * @param {AppConfig} config
         */
        _rebuildPatternCache(config) {
            this.patternCache = [];
            if (!config || !config.themeSets) return;

            const compile = (patterns, type, set) => {
                if (!Array.isArray(patterns)) return;
                for (const patternStr of patterns) {
                    // Manual parsing to sanitize flags
                    const match = typeof patternStr === 'string' ? patternStr.match(/^\/(.*)\/([gimsuy]*)$/) : null;
                    if (!match) continue;

                    const source = match[1];
                    let flags = match[2];

                    // Sanitize flags: remove 'g' and 'y' to prevent stateful issues (lastIndex)
                    // We only support stateless checks here.
                    flags = flags.replace(/[gy]/g, '');

                    try {
                        const regex = new RegExp(source, flags);
                        this.patternCache.push({ pattern: regex, set, type });
                    } catch (e) {
                        Logger.warn('CACHE', '', `Invalid ${type} pattern "${patternStr}" in theme "${set.metadata?.name}": ${e.message}`);
                        // Continue to next pattern
                    }
                }
            };

            // Order matters: Process themes in order.
            // Inside each theme, check URL patterns first, then Title patterns.
            for (const set of config.themeSets) {
                compile(set.metadata?.urlPatterns, 'url', set);
                compile(set.metadata?.matchPatterns, 'title', set);
            }
        }

        /**
         * @private
         * Removes all CSS variables defined in ALL_STYLE_DEFINITIONS from the root element.
         * This ensures a clean state when the manager is destroyed.
         */
        _cleanupCssVariables() {
            const rootStyle = document.documentElement.style;
            for (const definition of ALL_STYLE_DEFINITIONS) {
                if (definition.cssVar) {
                    rootStyle.removeProperty(definition.cssVar);
                }
            }
            if (this.staticStyleHandle && this.staticStyleHandle.vars) {
                Object.values(this.staticStyleHandle.vars).forEach((cssVar) => {
                    rootStyle.removeProperty(cssVar);
                });
            }
        }

        _onNavigation() {
            if (!PlatformAdapters.ThemeManager.shouldDeferInitialTheme(this)) {
                this.updateTheme(false);
            }
        }

        /**
         * Gets the title of the currently active chat from the page.
         * @returns {string | null}
         */
        getChatTitleAndCache() {
            const currentTitle = PlatformAdapters.General.getChatTitle();
            if (currentTitle !== this.cachedTitle) {
                this.cachedTitle = currentTitle;
                this.cachedThemeSet = null;
            }
            return this.cachedTitle;
        }

        /** @returns {ThemeSet} */
        getThemeSet() {
            if (this.cachedThemeSet) {
                return this.cachedThemeSet;
            }

            const titleName = this.cachedTitle;
            let urlPath = window.location.pathname;

            // Decode URL path to match user expectations
            try {
                urlPath = decodeURI(urlPath);
            } catch {
                // Keep original if decoding fails
            }

            // Iterate through the pre-compiled cache
            // The cache already preserves the priority order (Theme order -> URL -> Title)
            const hit = this.patternCache.find((entry) => {
                if (entry.type === 'title' && titleName) {
                    return entry.pattern.test(titleName);
                }
                if (entry.type === 'url') {
                    return entry.pattern.test(urlPath);
                }
                return false;
            });

            if (hit) {
                this.cachedThemeSet = hit.set;
                return hit.set;
            }

            // Fallback to default if no title or no match
            const config = this.configManager.get();
            const defaultSet = config.platforms[PLATFORM].defaultSet;
            const defaultMetadata = { id: CONSTANTS.THEME_IDS.DEFAULT, name: 'Default Settings', matchPatterns: [], urlPatterns: [] };
            this.cachedThemeSet = { ...defaultSet, metadata: defaultMetadata };
            return this.cachedThemeSet;
        }

        /**
         * Main theme update handler.
         * @param {boolean} force - If true, forces the theme to be reapplied even if no changes are detected.
         */
        updateTheme(force) {
            Logger.debug('THEME CHECK', LOG_STYLES.CYAN, 'Update triggered.');
            const currentLiveURL = location.href;
            const currentTitle = this.getChatTitleAndCache();
            const urlChanged = currentLiveURL !== this.lastURL;
            if (urlChanged) this.lastURL = currentLiveURL;
            const titleChanged = currentTitle !== this.lastTitle;
            if (titleChanged) this.lastTitle = currentTitle;

            const config = this.configManager.get();
            const currentThemeSet = PlatformAdapters.ThemeManager.selectThemeForUpdate(this, config, urlChanged, titleChanged);

            // If the adapter returns null, it signals that the theme update should be deferred.
            // This is used to wait for a final page title after navigating from an excluded page.
            if (currentThemeSet === null) {
                Logger.debug('THEME CHECK', LOG_STYLES.CYAN, 'Theme update deferred by platform adapter.');
                return;
            }

            // Deep comparison to detect changes from the settings panel
            const contentChanged = JSON.stringify(currentThemeSet) !== JSON.stringify(this.lastAppliedThemeSet);

            const themeShouldUpdate = force || urlChanged || titleChanged || contentChanged;
            if (themeShouldUpdate) {
                this.applyThemeStyles(currentThemeSet, config);
                this.applyChatContentMaxWidth();
            } else {
                // Even if no update is needed, publish the event to signal completion.
                // This is critical for clearing loading states (e.g. settings button animation)
                // that were triggered by the update request.
                EventBus.publish(EVENTS.THEME_APPLIED, { theme: currentThemeSet, config: config });
            }
        }

        /**
         * Applies all theme-related styles to the document using CSS variables.
         * @param {ThemeSet} currentThemeSet The active theme configuration.
         * @param {AppConfig} fullConfig The entire configuration object, including defaultSet.
         */
        async applyThemeStyles(currentThemeSet, fullConfig) {
            if (this.isDestroyed) return;

            // Abort previous pending requests (if any) to prevent resource waste and race conditions.
            if (this.themeAbortController) {
                this.themeAbortController.abort();
            }
            this.themeAbortController = new AbortController();
            const signal = this.themeAbortController.signal;

            const myRequestId = ++this.currentRequestId;
            Logger.time('ThemeManager.applyThemeStyles');
            this.lastAppliedThemeSet = currentThemeSet;

            const rootStyle = document.documentElement.style;
            const imageProcessingPromises = [];

            // Track active variables to generate optimized CSS
            const activeVars = new Set();

            // Capture current icon size to detect changes that affect icon rendering
            const currentIconSize = this.configManager.getIconSize();
            const iconSizeChanged = this.lastAppliedIconSize !== currentIconSize;
            this.lastAppliedIconSize = currentIconSize;

            for (const definition of ALL_STYLE_DEFINITIONS) {
                if (!definition.cssVar) continue;

                const value = getPropertyByPath(currentThemeSet, definition.configKey) ?? getPropertyByPath(fullConfig, definition.fallbackKey);
                const isImage = definition.configKey.endsWith('icon') || definition.configKey.includes('ImageUrl');

                if (isImage) {
                    const val = value ? String(value).trim() : null;
                    const lastVal = this.lastAppliedImageValues.get(definition.cssVar);
                    const isIcon = definition.configKey.endsWith('icon');

                    // Optimization: Skip if the value hasn't changed.
                    // Exception: If it's an icon and the global icon size setting has changed, we must re-process it.
                    if (val === lastVal && (!isIcon || !iconSizeChanged)) {
                        if (val) activeVars.add(definition.cssVar); // Keep existing as active
                        continue;
                    }

                    // Invalidation: Immediately remove the current value from cache.
                    this.lastAppliedImageValues.delete(definition.cssVar);

                    // Stage 1 (Sync): Immediately set to 'none' to prevent flicker of default images.
                    rootStyle.setProperty(definition.cssVar, 'none');
                    // Mark as active so the CSS rule includes the property (with 'none' value initially)
                    activeVars.add(definition.cssVar);

                    if (value) {
                        // Stage 2 (Async): Start processing the image in the background.
                        const processImage = async () => {
                            let finalCssValue = val;

                            if (val.startsWith('<svg')) {
                                finalCssValue = `url("${svgToDataUrl(val)}")`;
                            } else if (val.startsWith('http')) {
                                const resizeOptions = { signal }; // Inject signal
                                if (isIcon) {
                                    resizeOptions.width = currentIconSize;
                                    resizeOptions.height = currentIconSize;
                                }
                                const dataUrl = await this.imageDataManager.getImageAsDataUrl(val, resizeOptions);
                                finalCssValue = dataUrl ? `url("${dataUrl}")` : 'none';
                            } else if (val.startsWith('data:image')) {
                                finalCssValue = `url("${val}")`;
                            }

                            // Guard: If a new theme request has started (signal aborted) or app is destroyed, discard this result.
                            if (this.isDestroyed || this.currentRequestId !== myRequestId || signal.aborted) return;

                            // When ready, update the CSS variable to show the themed image.
                            if (finalCssValue !== 'none') {
                                rootStyle.setProperty(definition.cssVar, finalCssValue);
                                // Update the cache only after successful application
                                this.lastAppliedImageValues.set(definition.cssVar, val);
                            }
                        };
                        imageProcessingPromises.push(processImage());
                    } else {
                        // If value is null, we already set 'none' above. Just update the cache to reflect the 'none' state.
                        this.lastAppliedImageValues.set(definition.cssVar, val);
                    }
                } else {
                    // This is a non-image style, apply it synchronously.
                    if (value !== null && value !== undefined) {
                        // Apply the transformer function if it exists (e.g., for actor names).
                        const finalValue = typeof definition.transformer === 'function' ? definition.transformer(value, fullConfig) : value;
                        // Only set if transformer didn't return null
                        if (finalValue !== null) {
                            rootStyle.setProperty(definition.cssVar, finalValue);
                            activeVars.add(definition.cssVar);
                        } else {
                            rootStyle.removeProperty(definition.cssVar);
                        }
                    } else {
                        rootStyle.removeProperty(definition.cssVar);
                    }
                }
            }

            // Update the dynamic style sheet with only the active properties
            if (this.dynamicRulesStyleElem) {
                // StyleDefinitions.getDynamicRules().generator accepts activeVars
                const newCss = StyleDefinitions.getDynamicRules().generator(null, activeVars);
                if (this.dynamicRulesStyleElem.textContent !== newCss) {
                    this.dynamicRulesStyleElem.textContent = newCss;
                }
            }

            // Await all image processing and ensure event is fired even if errors occur
            try {
                await Promise.all(imageProcessingPromises);
            } catch (e) {
                Logger.error('ThemeManager', '', 'Error applying theme images:', e);
            } finally {
                // Guard event publication
                if (!this.isDestroyed && this.currentRequestId === myRequestId && !signal.aborted) {
                    EventBus.publish(EVENTS.THEME_APPLIED, { theme: currentThemeSet, config: fullConfig });
                }
                Logger.timeEnd('ThemeManager.applyThemeStyles');
            }
        }

        /**
         * Schedules a layout recalculation on the next UI work queue cycle.
         * Prevents performance degradation from frequent events like resize.
         */
        scheduleLayoutUpdate() {
            if (this.isLayoutUpdateScheduled) return;
            this.isLayoutUpdateScheduled = true;
            EventBus.queueUIWork(() => {
                if (this.isDestroyed) return;
                this.applyChatContentMaxWidth();
                this.isLayoutUpdateScheduled = false;
            });
        }

        /**
         * Calculates and applies the dynamic max-width for the chat content area.
         * Uses internal state (cachedPreviewWidth or config) to determine the target width.
         */
        applyChatContentMaxWidth() {
            if (this.isDestroyed) return;

            const rootStyle = document.documentElement.style;
            const config = this.configManager.get();
            if (!config) return;

            // Prioritize cached preview width if it exists (including null for default)
            // If undefined, fall back to stored configuration
            const userMaxWidth = this.cachedPreviewWidth !== undefined ? this.cachedPreviewWidth : config.platforms[PLATFORM].options.chat_content_max_width;

            const activeClass = this.staticStyleHandle.classes.maxWidthActive;
            const maxWidthVar = this.staticStyleHandle.vars.chatContentMaxWidth;

            withLayoutCycle({
                measure: () => {
                    // --- Read Phase ---
                    // Read layout properties needed for the 'else' block.
                    return {
                        sidebarWidth: getSidebarWidth(),
                        windowWidth: window.innerWidth,
                    };
                },
                mutate: (measured) => {
                    // --- Write Phase ---
                    if (this.isDestroyed) return;

                    if (!userMaxWidth) {
                        document.body.classList.remove(activeClass);
                        rootStyle.removeProperty(maxWidthVar);
                    } else {
                        document.body.classList.add(activeClass);

                        const themeSet = this.getThemeSet();
                        const iconSize = config.platforms[PLATFORM].options.icon_size;
                        const defaultSet = config.platforms[PLATFORM].defaultSet;

                        // Check if standing images are active in the current theme or default.
                        const hasStandingImage =
                            getPropertyByPath(themeSet, 'user.standingImageUrl') ||
                            getPropertyByPath(themeSet, 'assistant.standingImageUrl') ||
                            getPropertyByPath(defaultSet, 'user.standingImageUrl') ||
                            getPropertyByPath(defaultSet, 'assistant.standingImageUrl');
                        let requiredMarginPerSide = iconSize + CONSTANTS.UI_SPECS.AVATAR.MARGIN * 2;
                        if (hasStandingImage) {
                            const minStandingImageWidth = iconSize * 2;
                            requiredMarginPerSide = Math.max(requiredMarginPerSide, minStandingImageWidth);
                        }

                        const { sidebarWidth, windowWidth } = measured;
                        const totalRequiredMargin = sidebarWidth + requiredMarginPerSide * 2;
                        const maxAllowedWidth = windowWidth - totalRequiredMargin;
                        // Use CSS min() to ensure the user's value does not exceed the calculated available space.
                        const finalMaxWidth = `min(${userMaxWidth}, ${maxAllowedWidth}px)`;
                        rootStyle.setProperty(maxWidthVar, finalMaxWidth);
                    }
                },
            });

            // Notify other managers that the chat content width may have changed.
            EventBus.publish(EVENTS.CHAT_CONTENT_WIDTH_UPDATED);
        }
    }

    // =================================================================================
    // SECTION: DOM Observers and Event Listeners
    // Description: Centralizes DOM monitoring (Mutation/Resize) to react to layout changes and content updates.
    // =================================================================================

    /**
     * @class PageObserverScope
     * @description A container for managing the lifecycle of page-specific resources.
     * Handles LIFO disposal of registered disposables (functions, observers, objects).
     */
    class PageObserverScope {
        constructor() {
            this.disposables = [];
        }

        /**
         * Registers a disposable resource.
         * @param {Disposable} disposable
         */
        add(disposable) {
            if (disposable) this.disposables.push(disposable);
        }

        /**
         * Disposes all registered resources in LIFO order.
         */
        dispose() {
            // LIFO order for safety (reverse iteration)
            for (let i = this.disposables.length - 1; i >= 0; i--) {
                const d = this.disposables[i];
                try {
                    if (typeof d === 'function') {
                        d();
                    } else if (d && typeof d.dispose === 'function') {
                        d.dispose();
                    } else if (d && typeof d.disconnect === 'function') {
                        d.disconnect();
                    } else if (d && typeof d.abort === 'function') {
                        d.abort();
                    }
                } catch (e) {
                    Logger.warn('Observer', '', 'Error disposing page resource:', e);
                }
            }
            this.disposables = [];
        }
    }

    class ObserverManager extends BaseManager {
        /**
         * @param {MessageCacheManager} messageCacheManager
         * @param {object} streamingState - Shared state object for streaming status.
         */
        constructor(messageCacheManager, streamingState) {
            super();
            // Initialize observers to null; they will be created in _onInit via manageFactory
            this.mainObserver = null;
            this.mainObserverContainer = null;
            this.layoutResizeObserver = null;
            this.observedElements = new Map();
            this.processedTurnNodes = new Set();
            this.sentinelTurnListeners = new Map();
            this.debouncedCacheUpdate = debounce(this._publishCacheUpdate.bind(this), CONSTANTS.TIMING.DEBOUNCE_DELAYS.CACHE_UPDATE, true);
            this.pageScopeCleaner = null;
            this.streamingState = streamingState;

            // The debounced visibility check
            this.debouncedVisibilityCheck = debounce(() => EventBus.queueUIWork(this.publishVisibilityRecheck.bind(this)), CONSTANTS.TIMING.DEBOUNCE_DELAYS.VISIBILITY_CHECK, true);

            // Add reference to MessageCacheManager
            this.messageCacheManager = messageCacheManager;
            // Bound listener for navigation-related cache updates
            this.boundHandleCacheUpdateForNavigation = this._handleCacheUpdateForNavigation.bind(this);
            // Bound listener for Sentinel main observer setup
            this.boundSetupMainObserver = this._setupMainObserver.bind(this);
        }

        /**
         * Initializes the manager by subscribing to system-wide events.
         * This method's functionality was previously part of start().
         */
        _onInit() {
            // Create observers using manageFactory
            // This ensures they are automatically disconnected when the manager is destroyed.
            this.mainObserver = this.manageFactory(CONSTANTS.RESOURCE_KEYS.MAIN_OBSERVER, () => {
                return new MutationObserver((mutations) => this._handleMainMutations(mutations));
            });

            this.layoutResizeObserver = this.manageFactory(CONSTANTS.RESOURCE_KEYS.LAYOUT_RESIZE_OBSERVER, () => {
                return new ResizeObserver(this._handleResize.bind(this));
            });

            this._subscribe(EVENTS.SUSPEND_OBSERVERS, () => this.stopMainObserver());
            this._subscribe(EVENTS.RESUME_OBSERVERS_AND_REFRESH, () => {
                if (this.mainObserverContainer) {
                    this.startMainObserver(this.mainObserverContainer);
                    // Manually trigger a full refresh.
                    this.debouncedCacheUpdate.bind(this)();
                }
            });

            // Start the observers immediately upon initialization
            // Use Sentinel to detect the main container.
            sentinel.on(CONSTANTS.SELECTORS.MESSAGE_CONTAINER_PARENT, this.boundSetupMainObserver);
            this.addDisposable(() => sentinel.off(CONSTANTS.SELECTORS.MESSAGE_CONTAINER_PARENT, this.boundSetupMainObserver));

            // Immediate check in case the element already exists.
            const existingContainer = document.querySelector(CONSTANTS.SELECTORS.MESSAGE_CONTAINER_PARENT);
            if (existingContainer instanceof HTMLElement) {
                this.boundSetupMainObserver(existingContainer);
            }

            // Centralized ResizeObserver for layout changes
            this.observeElement(document.body, CONSTANTS.OBSERVED_ELEMENT_TYPES.BODY);

            // Subscribe to navigation events to handle page changes
            this._subscribe(EVENTS.NAVIGATION, () => this._onNavigation());

            // Subscribe to RAW_MESSAGE_ADDED to trigger cache updates when new messages appear.
            this._subscribe(EVENTS.RAW_MESSAGE_ADDED, () => this.debouncedCacheUpdate());

            // Update debounced visibility check with destroy guards
            this.debouncedVisibilityCheck = debounce(
                () => {
                    if (this.isDestroyed) return;
                    EventBus.queueUIWork(() => {
                        if (this.isDestroyed) return;
                        this.publishVisibilityRecheck();
                    });
                },
                CONSTANTS.TIMING.DEBOUNCE_DELAYS.VISIBILITY_CHECK,
                true
            );

            // Perform initial setup.
            // This ensures all managers recognize the initial load as a navigation event.
            EventBus.publish(EVENTS.NAVIGATION);
        }

        _onDestroy() {
            this.debouncedCacheUpdate.cancel();
            this.debouncedVisibilityCheck.cancel();

            // Clean up any lingering turn completion listeners.
            for (const [selector, callback] of this.sentinelTurnListeners.values()) {
                sentinel.off(selector, callback);
            }
            this.sentinelTurnListeners.clear();

            // mainObserver and layoutResizeObserver are automatically disconnected by BaseManager

            // Page-specific observers are automatically disposed by BaseManager via PageObserverScope

            // Clear element caches to allow GC
            this.observedElements.clear();
            this.processedTurnNodes.clear();
            this.mainObserverContainer = null;
        }

        /**
         * @private
         * @description Callback for Sentinel to set up the main observer when the container is detected.
         * @param {HTMLElement} container The detected container element.
         */
        _setupMainObserver(container) {
            // Prevent duplicate setup for the same container reference
            if (!container || this.mainObserverContainer === container) return;

            Logger.debug('Observer', LOG_STYLES.CYAN, 'Main app container detected. Starting observers.');
            this.mainObserverContainer = container;
            this.startMainObserver(container);
        }

        /**
         * @description Starts a generic observer for the input area to detect resizing and DOM reconstruction.
         * @param {object} config - Configuration object.
         * @param {string} config.triggerSelector - The selector for the element that triggers the observation (usually the anchor).
         * @param {string} config.resizeTargetSelector - The selector for the element to observe for resizing.
         * @returns {() => void} A cleanup function.
         */
        startGenericInputAreaObserver(config) {
            const { triggerSelector, resizeTargetSelector } = config;
            let observedInputArea = null;

            const setupObserver = (inputArea) => {
                if (inputArea === observedInputArea) return;

                // Cleanup previous observers
                if (observedInputArea) {
                    this.unobserveElement(observedInputArea);
                }

                observedInputArea = inputArea;

                // Resize Observer (via ObserverManager)
                // If the inputArea itself matches the target, use it. Otherwise find the target within.
                const resizeTarget = inputArea.matches(resizeTargetSelector) ? inputArea : inputArea.querySelector(resizeTargetSelector);

                if (resizeTarget instanceof HTMLElement) {
                    this.observeElement(resizeTarget, CONSTANTS.OBSERVED_ELEMENT_TYPES.INPUT_AREA);
                }

                // Trigger initial placement
                EventBus.publish(EVENTS.UI_REPOSITION);
            };

            // Use Sentinel to detect when the trigger is added
            sentinel.on(triggerSelector, setupObserver);

            // Initial check
            const initialInputArea = document.querySelector(triggerSelector);
            if (initialInputArea instanceof HTMLElement) {
                setupObserver(initialInputArea);
            }

            return () => {
                sentinel.off(triggerSelector, setupObserver);
                if (observedInputArea) this.unobserveElement(observedInputArea);
            };
        }

        /**
         * @description A generic observer for side panels that handles appearance, disappearance, resizing, and immediate state callbacks.
         * @param {object} config - Configuration object.
         * @param {string} config.triggerSelector - The selector for the element that triggers the panel's existence check.
         * @param {string} config.observerType - The type identifier for ObserverManager (e.g., CONSTANTS.OBSERVED_ELEMENT_TYPES.SIDE_PANEL).
         * @param {function(HTMLElement): HTMLElement|null} config.targetResolver - A function to resolve the actual panel element from the trigger element.
         * @param {function(): void} [config.immediateCallback] - An optional callback executed immediately and repeatedly during the animation loop.
         * @returns {() => void} A cleanup function.
         */
        startGenericPanelObserver(config) {
            const { triggerSelector, observerType, targetResolver, immediateCallback } = config;

            let isPanelVisible = false;
            let isStateUpdating = false; // Lock to prevent race conditions
            let disappearanceObserver = null;
            let observedPanel = null;
            let animationLoopId = null;
            const ANIMATION_DURATION = CONSTANTS.TIMING.ANIMATIONS.LAYOUT_STABILIZATION_MS;

            // Function to run the layout update loop
            const startUpdateLoop = () => {
                if (animationLoopId) cancelAnimationFrame(animationLoopId);

                const startTime = Date.now();

                const loop = () => {
                    // Run the callback (e.g., VISIBILITY_RECHECK or SIDEBAR_LAYOUT_CHANGED)
                    if (immediateCallback) immediateCallback();
                    // Also trigger UI repositioning for smooth movement
                    EventBus.publish(EVENTS.UI_REPOSITION);

                    if (Date.now() - startTime < ANIMATION_DURATION) {
                        animationLoopId = requestAnimationFrame(loop);
                    } else {
                        animationLoopId = null;
                    }
                };

                loop();
            };

            // This is the single source of truth for updating the UI based on panel visibility.
            const updatePanelState = () => {
                if (isStateUpdating) return; // Prevent concurrent executions
                isStateUpdating = true;

                try {
                    const trigger = document.querySelector(triggerSelector);
                    let isNowVisible = false;
                    let panel = null;

                    if (trigger instanceof HTMLElement) {
                        panel = targetResolver(trigger);
                        // Check if the panel exists and is visible in the DOM (offsetParent is non-null).
                        if (panel instanceof HTMLElement && panel.offsetParent !== null) {
                            isNowVisible = true;
                        }
                    }

                    // Do nothing if the state hasn't changed.
                    if (isNowVisible === isPanelVisible) {
                        // If visible, ensure we are still observing the same element (defensive)
                        if (isNowVisible && panel && panel !== observedPanel) {
                            // If the element reference changed but logic says it's still visible, switch observation
                            if (observedPanel) this.unobserveElement(observedPanel);
                            observedPanel = panel;
                            this.observeElement(observedPanel, observerType);
                        }
                        return;
                    }

                    isPanelVisible = isNowVisible;

                    if (isNowVisible && panel) {
                        // --- Panel just appeared ---
                        Logger.debug('PANEL STATE', LOG_STYLES.CYAN, 'Panel appeared:', triggerSelector);

                        startUpdateLoop();

                        observedPanel = panel;
                        this.observeElement(observedPanel, observerType);

                        // Setup a lightweight observer to detect when the panel is removed from DOM.
                        // We observe the parent because the panel itself might be removed.
                        if (panel.parentElement) {
                            disappearanceObserver?.disconnect();
                            disappearanceObserver = new MutationObserver(() => {
                                // Re-check state if the parent container's children change.
                                updatePanelState();
                            });
                            disappearanceObserver.observe(panel.parentElement, { childList: true, subtree: false });
                        }
                    } else {
                        // --- Panel just disappeared ---
                        Logger.debug('PANEL STATE', LOG_STYLES.CYAN, 'Panel disappeared:', triggerSelector);

                        startUpdateLoop();

                        disappearanceObserver?.disconnect();
                        disappearanceObserver = null;
                        if (observedPanel) {
                            this.unobserveElement(observedPanel);
                            observedPanel = null;
                        }
                    }
                } finally {
                    isStateUpdating = false; // Release the lock
                }
            };

            // Use Sentinel to efficiently detect when the trigger might have been added.
            sentinel.on(triggerSelector, updatePanelState);

            // Perform an initial check in case the panel is already present on load.
            updatePanelState();

            // Return the cleanup function.
            return () => {
                sentinel.off(triggerSelector, updatePanelState);
                disappearanceObserver?.disconnect();
                if (observedPanel) {
                    this.unobserveElement(observedPanel);
                }
                if (animationLoopId) cancelAnimationFrame(animationLoopId);
            };
        }

        /**
         * @private
         * @description Handles the logic required when a navigation occurs or the app initializes.
         * Resets observers and sets up page-specific listeners synchronously to avoid race conditions.
         */
        _onNavigation() {
            try {
                // Reset streaming state on navigation to prevent locks
                this.streamingState.isActive = false;
                this.stopStreamCheck();
                this.processedTurnNodes.clear();

                // Clean up all resources from the previous page using the scope cleaner.
                // This disposes the previous PageObserverScope and removes it from BaseManager.
                if (this.pageScopeCleaner) {
                    this.pageScopeCleaner();
                    this.pageScopeCleaner = null;
                }

                this.manageResource(CONSTANTS.RESOURCE_KEYS.ZERO_MSG_TIMER, null); // Stop any pending 0-message timers

                // Create a new scope for the current page
                const scope = new PageObserverScope();
                // Register the scope with BaseManager (auto-cleanup on destroy) and keep the cleaner
                this.pageScopeCleaner = this.addDisposable(scope);

                this.stopMainObserver();

                // Only restart the main observer if the container is still connected to the DOM.
                // This prevents holding onto "zombie" containers during SPA transitions (especially on ChatGPT).
                if (this.mainObserverContainer && this.mainObserverContainer.isConnected) {
                    this.startMainObserver(this.mainObserverContainer);
                } else {
                    // If disconnected, clear the reference. Sentinel will re-detect the new container when it appears.
                    this.mainObserverContainer = null;
                }

                // Clean up any lingering turn completion listeners from the previous page.
                for (const [selector, callback] of this.sentinelTurnListeners.values()) {
                    sentinel.off(selector, callback);
                }
                this.sentinelTurnListeners.clear();

                // Subscribe to CACHE_UPDATED to manage the NAVIGATION_END lifecycle.
                const cacheEventKey = createEventKey(this, EVENTS.CACHE_UPDATED);
                EventBus.subscribe(EVENTS.CACHE_UPDATED, this.boundHandleCacheUpdateForNavigation, cacheEventKey);
                // Add unsubscribe to the page scope
                scope.add(() => EventBus.unsubscribe(EVENTS.CACHE_UPDATED, cacheEventKey));

                // Trigger an initial cache update immediately. This will start the navigation end detection.
                this.debouncedCacheUpdate();

                // --- Start all page-specific observers from here ---
                const observerStarters = PlatformAdapters.Observer.getPlatformObserverStarters();
                for (const startObserver of observerStarters) {
                    // Synchronously start observer and get cleanup function
                    const cleanup = startObserver({
                        observeElement: this.observeElement.bind(this),
                        unobserveElement: this.unobserveElement.bind(this),
                        startGenericPanelObserver: this.startGenericPanelObserver.bind(this),
                        startGenericInputAreaObserver: this.startGenericInputAreaObserver.bind(this),
                    });
                    if (typeof cleanup === 'function') {
                        scope.add(cleanup);
                    }
                }
            } catch (e) {
                Logger.error('NAV_HANDLER_ERROR', LOG_STYLES.RED, 'Error during navigation handling:', e);
            }
        }

        /**
         * @private
         * Stops the polling interval for streaming completion.
         */
        stopStreamCheck() {
            this.manageResource(CONSTANTS.RESOURCE_KEYS.STREAM_CHECK, null);
        }

        /**
         * @description Evaluates a newly completed message element to determine if a streaming session has started.
         * Implements self-healing logic to reset stuck streaming flags if a new turn begins unexpectedly.
         * @param {HTMLElement} messageElement The message element that was just processed.
         */
        handleMessageComplete(messageElement) {
            const role = PlatformAdapters.General.getMessageRole(messageElement);
            // Only assistant messages trigger streaming state
            if (role !== CONSTANTS.SELECTORS.FIXED_NAV_ROLE_ASSISTANT) return;

            const turnNode = messageElement.closest(CONSTANTS.SELECTORS.CONVERSATION_UNIT);
            if (!(turnNode instanceof HTMLElement)) return;

            // If the turn is NOT complete, it means streaming is in progress.
            if (!PlatformAdapters.Observer.isTurnComplete(turnNode)) {
                // Self-healing: If flag is already true, it means the previous stream didn't close properly.
                if (this.streamingState.isActive) {
                    Logger.warn('Observer', '', 'New streaming started while flag was stuck. Resetting.');
                    this.streamingState.isActive = false;
                    this.stopStreamCheck(); // Ensure old poll is stopped
                }

                this.streamingState.isActive = true;
                EventBus.publish(EVENTS.STREAMING_START);

                // Start backup polling to detect completion in case Sentinel fails
                this.stopStreamCheck(); // Safety clear
                const id = setInterval(() => {
                    const completionElement = turnNode.querySelector(CONSTANTS.SELECTORS.TURN_COMPLETE_SELECTOR);
                    if (completionElement) {
                        Logger.debug('STREAM_POLL', LOG_STYLES.GRAY, 'Completion detected via polling. Cleaning up.');
                        // Logic similar to the sentinel callback
                        this.streamingState.isActive = false;
                        this.stopStreamCheck();
                        EventBus.publish(EVENTS.STREAMING_END);
                        EventBus.publish(EVENTS.DEFERRED_LAYOUT_UPDATE);
                        this.debouncedCacheUpdate();
                    }
                }, CONSTANTS.TIMING.POLLING.STREAM_COMPLETION_CHECK_MS);

                this.manageResource(CONSTANTS.RESOURCE_KEYS.STREAM_CHECK, () => clearInterval(id));
            }
        }

        /**
         * @private
         * @description A stateful handler for CACHE_UPDATED events, specifically to manage the NAVIGATION_END lifecycle.
         * It distinguishes between "history loading" (0 messages) and "history loaded" (N messages) or "new chat page" (0 messages confirmed after a grace period).
         */
        _handleCacheUpdateForNavigation() {
            // Stop any pending 0-message confirmation timer.
            this.manageResource(CONSTANTS.RESOURCE_KEYS.ZERO_MSG_TIMER, null);

            if (this.messageCacheManager && this.messageCacheManager.getTotalMessages().length > 0) {
                // --- Case A: Messages Found ---
                // This is the "history loaded" state. Navigation is complete.
                Logger.debug('CACHE', LOG_STYLES.TEAL, 'Cache update has messages. Firing NAVIGATION_END.');
                EventBus.publish(EVENTS.NAVIGATION_END);
                // Unsubscribe self, as navigation is complete.
                EventBus.unsubscribe(EVENTS.CACHE_UPDATED, createEventKey(this, EVENTS.CACHE_UPDATED));
            } else {
                // --- Case B: 0 Messages Found ---
                // This could be a "true 0-message page" OR "history is still loading".
                // Start a timer to give messages time to load.
                Logger.debug('CACHE', LOG_STYLES.TEAL, `Cache update has 0 messages. Starting ${CONSTANTS.TIMING.TIMEOUTS.ZERO_MESSAGE_GRACE_PERIOD}ms grace period...`);

                const id = setTimeout(() => {
                    // If the timer finishes *without* being canceled by another cache update,
                    // we are definitively on a 0-message page. Navigation is complete.
                    Logger.debug('CACHE', LOG_STYLES.TEAL, 'Grace period ended. Assuming 0-message page. Firing NAVIGATION_END.');
                    EventBus.publish(EVENTS.NAVIGATION_END);
                    // Unsubscribe self, as navigation is complete.
                    EventBus.unsubscribe(EVENTS.CACHE_UPDATED, createEventKey(this, EVENTS.CACHE_UPDATED));
                }, CONSTANTS.TIMING.TIMEOUTS.ZERO_MESSAGE_GRACE_PERIOD);

                this.manageResource(CONSTANTS.RESOURCE_KEYS.ZERO_MSG_TIMER, () => clearTimeout(id));
            }
        }

        _handleResize(entries) {
            for (const entry of entries) {
                const type = this.observedElements.get(entry.target);
                switch (type) {
                    case CONSTANTS.OBSERVED_ELEMENT_TYPES.BODY:
                        EventBus.publish(EVENTS.WINDOW_RESIZED);
                        break;
                    case CONSTANTS.OBSERVED_ELEMENT_TYPES.INPUT_AREA:
                        EventBus.publish(EVENTS.INPUT_AREA_RESIZED);
                        break;
                    case CONSTANTS.OBSERVED_ELEMENT_TYPES.SIDE_PANEL:
                        EventBus.publish(EVENTS.UI_REPOSITION);
                        break;
                }
            }
        }

        observeElement(element, type) {
            if (!element || this.observedElements.has(element)) return;
            this.observedElements.set(element, type);
            this.layoutResizeObserver.observe(element);
        }

        unobserveElement(element) {
            if (!element || !this.observedElements.has(element)) return;
            this.layoutResizeObserver.unobserve(element);
            this.observedElements.delete(element);
        }

        /**
         * Starts the main MutationObserver to watch for DOM changes.
         * @param {HTMLElement} container The main container element to observe.
         */
        startMainObserver(container) {
            // Guard: Ensure the container is valid and actually connected to the DOM.
            // This prevents starting observers on stale elements or null references.
            if (!container || !container.isConnected) {
                Logger.debug('Observer', '', 'startMainObserver skipped: Container is invalid or disconnected.');
                return;
            }

            if (this.mainObserver) {
                this.mainObserver.observe(container, CONSTANTS.OBSERVER_OPTIONS);
            }
        }

        /**
         * Stops the main MutationObserver.
         */
        stopMainObserver() {
            if (this.mainObserver) {
                this.mainObserver.disconnect();
            }
        }

        /**
         * @private
         * @description Callback for the main MutationObserver, now specialized to handle only message deletions.
         * Message additions are handled exclusively by the Sentinel class for performance.
         * If a deletion of a message node is detected, it triggers a debounced update of the message cache
         * to keep the application state consistent.
         * @param {MutationRecord[]} mutations An array of MutationRecord objects provided by the observer.
         */
        _handleMainMutations(mutations) {
            // Check only for removed nodes that are message containers.
            // Additions are handled exclusively by Sentinel for better performance.
            const hasDeletion = mutations.some((mutation) => Array.from(mutation.removedNodes).some((node) => node instanceof Element && node.matches(CONSTANTS.SELECTORS.MESSAGE_ROOT_NODE)));

            if (hasDeletion) {
                Logger.debug('MUTATION', LOG_STYLES.CYAN, 'Message deletion detected.');

                // Sweep for detached turn nodes that are still being observed.
                // This prevents memory leaks when chat history is cleared or during navigation.
                for (const [turnNode, [selector, callback]] of this.sentinelTurnListeners) {
                    if (!turnNode.isConnected) {
                        sentinel.off(selector, callback);
                        this.sentinelTurnListeners.delete(turnNode);
                        Logger.debug('Observer', LOG_STYLES.CYAN, 'Cleaned up observer for detached turn node.');
                    }
                }

                // A deletion occurred, so a full cache rebuild is necessary.
                this.debouncedCacheUpdate();
            }
        }

        /**
         * @description Processes a turn node, handling both completed and streaming turns.
         * If the turn is already complete, it triggers final updates (e.g., for navigation).
         * If the turn is streaming, it attaches a dedicated MutationObserver to watch for its completion.
         * @param {HTMLElement} turnNode The turn container element to process or observe.
         */
        observeTurnForCompletion(turnNode) {
            // If this turn contains a user message, it signifies the start of a new interaction.
            if (turnNode.querySelector(CONSTANTS.SELECTORS.USER_MESSAGE)) {
                PerfMonitor.reset();
            }

            PerfMonitor.throttleLog('observeTurnForCompletion', CONSTANTS.TIMING.PERF_MONITOR_THROTTLE);
            // Do not re-process turns that have already been handled or are currently being observed.
            if (this.processedTurnNodes.has(turnNode) || this.sentinelTurnListeners.has(turnNode)) return;
            if (turnNode.nodeType !== Node.ELEMENT_NODE) return;

            if (this._isTurnComplete(turnNode)) {
                EventBus.publish(EVENTS.TURN_COMPLETE, turnNode);
                this.debouncedCacheUpdate(); // Update cache for completed turns to immediately reflect the message count in the navigation console.
                this.processedTurnNodes.add(turnNode);

                // Handle logic if we were tracking a stream that finished instantly or externally
                if (this.streamingState.isActive) {
                    this.streamingState.isActive = false;
                    this.stopStreamCheck();
                    EventBus.publish(EVENTS.STREAMING_END);
                    EventBus.publish(EVENTS.DEFERRED_LAYOUT_UPDATE);
                }
            } else {
                // This branch handles streaming turns using the efficient Sentinel observer.
                const sentinelCallback = (completionElement) => {
                    // Ensure the completion element belongs to the turn we are observing.
                    const completedTurnNode = completionElement.closest(CONSTANTS.SELECTORS.CONVERSATION_UNIT);
                    if (completedTurnNode !== turnNode) return;

                    // Self-remove the listener to prevent memory leaks and redundant calls.
                    sentinel.off(CONSTANTS.SELECTORS.TURN_COMPLETE_SELECTOR, sentinelCallback);
                    this.sentinelTurnListeners.delete(turnNode);

                    EventBus.publish(EVENTS.TURN_COMPLETE, turnNode);

                    // End streaming state if active
                    if (this.streamingState.isActive) {
                        this.streamingState.isActive = false;
                        this.stopStreamCheck();
                        EventBus.publish(EVENTS.STREAMING_END);
                        EventBus.publish(EVENTS.DEFERRED_LAYOUT_UPDATE);
                    }

                    // Manually trigger a cache update now that streaming is complete.
                    this.debouncedCacheUpdate();
                    this.processedTurnNodes.add(turnNode);
                };

                // Store the listener so it can be cleaned up on navigation.
                this.sentinelTurnListeners.set(turnNode, [CONSTANTS.SELECTORS.TURN_COMPLETE_SELECTOR, sentinelCallback]);
                sentinel.on(CONSTANTS.SELECTORS.TURN_COMPLETE_SELECTOR, sentinelCallback);
            }
        }

        publishVisibilityRecheck() {
            EventBus.publish(EVENTS.VISIBILITY_RECHECK);
        }

        /**
         * Checks if a conversation turn is complete by delegating to the platform-specific adapter.
         * @param {HTMLElement} turnNode The turn container element.
         * @returns {boolean} True if the turn is considered complete.
         * @private
         */
        _isTurnComplete(turnNode) {
            return PlatformAdapters.Observer.isTurnComplete(turnNode);
        }

        /** @private */
        _publishCacheUpdate() {
            EventBus.publish(EVENTS.CACHE_UPDATE_REQUEST);
        }
    }

    class AvatarManager extends BaseManager {
        /**
         * @param {ConfigManager} configManager
         * @param messageCacheManager
         */
        constructor(configManager, messageCacheManager) {
            super();
            this.configManager = configManager;
            this.messageCacheManager = messageCacheManager;
            this.style = null; // Handle for styles

            // A queue to hold incoming avatar injection requests.
            this._injectionQueue = [];
            // A debounced function to process the queue in a single batch.
            this._debouncedProcessQueue = debounce(this._processInjectionQueue.bind(this), CONSTANTS.TIMING.DEBOUNCE_DELAYS.AVATAR_INJECTION, true);

            // Create an avatar template once to be cloned later for performance.
            this.avatarTemplate = h(`div${CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER}`, [h(`span${CONSTANTS.SELECTORS.SIDE_AVATAR_ICON}`), h(`div${CONSTANTS.SELECTORS.SIDE_AVATAR_NAME}`)]);
        }

        /**
         * Initializes the manager by injecting styles and subscribing to events.
         */
        _onInit() {
            this.injectAvatarStyle();
            // Instead of processing immediately, queue the element for batch processing.
            this._subscribe(EVENTS.AVATAR_INJECT, (elem) => this.queueForInjection(elem));

            // Clear queue and cancel pending tasks on navigation start to prevent memory leaks and unnecessary processing.
            this._subscribe(EVENTS.NAVIGATION_START, () => {
                this._injectionQueue = [];
                this._debouncedProcessQueue.cancel();
                this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, null);
            });

            // Ensure state is clean on navigation settlement.
            this._subscribe(EVENTS.NAVIGATION, () => {
                this._injectionQueue = [];
            });

            this.addDisposable(this._debouncedProcessQueue.cancel);
        }

        _onDestroy() {
            // Cleanup handled by disposables.
            // Do NOT set this.style to null here, as it may be used by pending disposables.
            this._injectionQueue = [];
            this.avatarTemplate = null;

            // Remove all avatar containers from the DOM
            document.querySelectorAll(CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER).forEach((el) => el.remove());
        }

        /**
         * Adds a message element to the injection queue and triggers the debounced processor.
         * @param {HTMLElement} msgElem The message element to process.
         */
        queueForInjection(msgElem) {
            const MAX_ATTEMPTS = CONSTANTS.RETRY.AVATAR_INJECTION_LIMIT;

            const attempts = DomState.getInt(msgElem, CONSTANTS.DATA_KEYS.AVATAR_INJECT_ATTEMPTS, 0);

            if (attempts >= MAX_ATTEMPTS) {
                // Log the failure only once to avoid spamming the console.
                if (!DomState.has(msgElem, CONSTANTS.DATA_KEYS.AVATAR_INJECT_FAILED)) {
                    Logger.warn('AVATAR RETRY FAILED', LOG_STYLES.YELLOW, `Avatar injection failed after ${MAX_ATTEMPTS} attempts. Halting retries for this element:`, msgElem);
                    DomState.mark(msgElem, CONSTANTS.DATA_KEYS.AVATAR_INJECT_FAILED);
                }
                return; // Stop trying
            }

            DomState.set(msgElem, CONSTANTS.DATA_KEYS.AVATAR_INJECT_ATTEMPTS, attempts + 1);

            if (!this._injectionQueue.includes(msgElem)) {
                this._injectionQueue.push(msgElem);
            }
            this._debouncedProcessQueue();
        }

        /**
         * Processes all queued avatar injection requests in a batch to optimize performance.
         * Separates READ (measure) and WRITE (mutate) phases to prevent layout thrashing.
         * @private
         */
        _processInjectionQueue() {
            // Cancel any existing batch task immediately
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, null);

            if (this._injectionQueue.length === 0) {
                return;
            }
            Logger.debug('AVATAR QUEUE', LOG_STYLES.CYAN, `Processing ${this._injectionQueue.length} items.`);

            const messagesToProcess = [...this._injectionQueue];
            this._injectionQueue = [];

            const processedClass = this.style.classes.processed;
            const reservedKeys = new Set(); // For scope duplication check

            const cancelFn = runBatchUpdate(
                messagesToProcess,
                CONSTANTS.PROCESSING.BATCH_SIZE,
                // Measure
                (msgElem) => {
                    if (!msgElem.isConnected) return null;

                    const role = PlatformAdapters.General.getMessageRole(msgElem);
                    if (!role) return null;

                    const measurement = PlatformAdapters.Avatar.measureAvatarTarget(msgElem);
                    if (measurement) {
                        // Check exclusion key to prevent duplicates in this entire process
                        if (measurement.exclusionKey) {
                            if (reservedKeys.has(measurement.exclusionKey)) return null;
                            reservedKeys.add(measurement.exclusionKey);
                        }
                        return measurement;
                    }
                    return null;
                },
                // Mutate
                (measurement) => {
                    // Safety check: Ensure targets are still connected
                    if (measurement.targetElement && !measurement.targetElement.isConnected) return;
                    if (measurement.processedTarget && !measurement.processedTarget.isConnected) return;

                    // Create container (only if injection is needed)
                    let container = null;
                    if (measurement.shouldInject) {
                        const node = this.avatarTemplate.cloneNode(true);
                        // Verify type using instanceof instead of casting
                        if (node instanceof HTMLElement) {
                            container = node;
                        } else {
                            // If cloning failed to produce an HTMLElement, skip injection for this item
                            return;
                        }
                    }

                    PlatformAdapters.Avatar.injectAvatar(measurement, container, processedClass);

                    // Cleanup flags using the strongly typed originalElement property
                    DomState.remove(measurement.originalElement, CONSTANTS.DATA_KEYS.AVATAR_INJECT_ATTEMPTS);
                    DomState.remove(measurement.originalElement, CONSTANTS.DATA_KEYS.AVATAR_INJECT_FAILED);
                },
                // On Finish
                () => {
                    this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, null);
                }
            );

            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, cancelFn);
        }

        /**
         * Injects the CSS for avatar styling using StyleManager.
         */
        injectAvatarStyle() {
            if (this.style) return;
            this.style = StyleManager.request(StyleDefinitions.getAvatar);
            this.updateIconSizeCss();
        }

        /**
         * Reads the icon size from config and applies it as a CSS variable via StyleManager's handle.
         */
        updateIconSizeCss() {
            if (!this.style) return;
            const iconSize = this.configManager.getIconSize();
            const vars = this.style.vars;

            document.documentElement.style.setProperty(vars.iconSize, `${iconSize}px`);
            document.documentElement.style.setProperty(vars.iconMargin, `${CONSTANTS.UI_SPECS.AVATAR.MARGIN}px`);
        }
    }

    class StandingImageManager extends BaseManager {
        /**
         * @param {ConfigManager} configManager
         * @param messageCacheManager
         * @param {ThemeManager} themeManager
         */
        constructor(configManager, messageCacheManager, themeManager) {
            super();
            this.configManager = configManager;
            this.messageCacheManager = messageCacheManager;
            this.themeManager = themeManager;
            this.isUpdateScheduled = false;
            this.scheduleUpdate = this.scheduleUpdate.bind(this);
            this.anchorSelectors = [];
            this.style = null; // Handle for styles and class names
        }

        /**
         * Initializes the manager by injecting styles and subscribing to events.
         */
        _onInit() {
            this.isUpdateScheduled = false;
            this.injectStyles(); // Inject styles first to generate IDs
            this.createContainers(); // Create containers using generated IDs

            // Register cleanup for the created DOM elements
            this.addDisposable(() => {
                if (this.style) {
                    const cls = this.style.classes;
                    document.getElementById(cls.userImageId)?.remove();
                    document.getElementById(cls.assistantImageId)?.remove();
                }
            });

            this._subscribe(EVENTS.WINDOW_RESIZED, this.scheduleUpdate);
            this._subscribe(EVENTS.SIDEBAR_LAYOUT_CHANGED, this.scheduleUpdate);
            this._subscribe(EVENTS.THEME_APPLIED, this.scheduleUpdate);
            this._subscribe(EVENTS.VISIBILITY_RECHECK, this.scheduleUpdate);
            this._subscribe(EVENTS.UI_REPOSITION, this.scheduleUpdate);
            this._subscribe(EVENTS.CHAT_CONTENT_WIDTH_UPDATED, this.scheduleUpdate);
            this._subscribe(EVENTS.DEFERRED_LAYOUT_UPDATE, this.scheduleUpdate);

            // Anchor Detection using Sentinel
            // Automatically detect when the layout anchor element appears or is re-inserted into the DOM.
            // This is critical for SPA transitions (like switching Gems in Gemini) where the container is replaced.
            this.anchorSelectors = CONSTANTS.SELECTORS.STANDING_IMAGE_ANCHOR.split(',').map((s) => s.trim());
            this.anchorSelectors.forEach((selector) => {
                sentinel.on(selector, this.scheduleUpdate);
                this.addDisposable(() => sentinel.off(selector, this.scheduleUpdate));
            });

            PlatformAdapters.StandingImage.setupEventListeners(this);
        }

        _onDestroy() {
            // Cleanup handled by disposables.
            // Do NOT set this.style to null here, as it is required for container removal.
        }

        scheduleUpdate() {
            if (this.isDestroyed) return;
            if (this.isUpdateScheduled) return;
            this.isUpdateScheduled = true;
            EventBus.queueUIWork(async () => {
                if (this.isDestroyed) return;
                this.updateVisibility();
                await this.recalculateStandingImagesLayout();
                this.isUpdateScheduled = false;
            });
        }

        injectStyles() {
            if (this.style) return;
            this.style = StyleManager.request(StyleDefinitions.getStandingImage);
        }

        createContainers() {
            if (!this.style) return;
            const cls = this.style.classes;
            if (document.getElementById(cls.assistantImageId)) return;

            const userImg = h('div', { id: cls.userImageId });
            const asstImg = h('div', { id: cls.assistantImageId });

            document.body.appendChild(userImg);
            document.body.appendChild(asstImg);
        }

        updateVisibility() {
            PlatformAdapters.StandingImage.updateVisibility(this);
        }

        /**
         * Recalculates the layout for the standing images.
         * @returns {Promise<void>}
         */
        async recalculateStandingImagesLayout() {
            return PlatformAdapters.StandingImage.recalculateLayout(this);
        }
    }

    // =================================================================================
    // SECTION: Bubble Feature Management
    // Description: Orchestrates the injection of interactive features (buttons, navigation) into message bubbles.
    // =================================================================================

    /**
     * @constant BubbleFeatureDefs
     * @description Definitions for bubble UI features, extracted from BubbleUIManager.
     * Contains render logic and update behaviors for Collapsible, Navigation, etc.
     */
    const BubbleFeatureDefs = {
        COLLAPSIBLE: {
            name: 'collapsible',
            isEnabled: (config) => config.platforms[PLATFORM].features.collapsible_button.enabled,
            getInfo: (msgElem) => PlatformAdapters.BubbleUI.getCollapsibleInfo(msgElem),
            render: (info, msgElem, manager) => {
                const button = manager.featureTemplates.collapsibleButton.cloneNode(true);
                if (!(button instanceof HTMLElement)) return null;
                const cls = manager.styleHandle.classes;
                button.onclick = (e) => {
                    e.stopPropagation();
                    info.msgWrapper.classList.toggle(cls.collapsed);
                };
                return button;
            },
            update: (element, info, isEnabled, messageElement, manager) => {
                const cls = manager.styleHandle.classes;
                if (isEnabled && info) {
                    element.classList.remove(cls.hidden);
                    // Apply class to both wrappers to support different platform CSS strategies
                    info.msgWrapper.classList.add(cls.collapsibleParent);
                    info.positioningParent.classList.add(cls.collapsibleParent);
                    info.bubbleElement.classList.add(cls.collapsibleContent);

                    // --- Auto Collapse Logic ---
                    const uniqueId = DomState.get(messageElement, CONSTANTS.DATA_KEYS.UNIQUE_ID);
                    if (uniqueId && !manager.autoCollapseProcessedIds.has(uniqueId)) {
                        const config = manager.configManager.get();
                        if (config.platforms[PLATFORM].features.auto_collapse_user_message.enabled) {
                            const role = PlatformAdapters.General.getMessageRole(messageElement);
                            if (role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_USER) {
                                const height = info.bubbleElement.offsetHeight;
                                if (height > CONSTANTS.UI_SPECS.COLLAPSIBLE.HEIGHT_THRESHOLD) {
                                    info.msgWrapper.classList.add(cls.collapsed);
                                }
                            }
                        }
                        manager.autoCollapseProcessedIds.add(uniqueId);
                    }
                } else {
                    element.classList.add(cls.hidden);
                    if (info) {
                        info.msgWrapper.classList.remove(cls.collapsibleParent, cls.collapsed);
                        info.positioningParent.classList.remove(cls.collapsibleParent);
                        info.bubbleElement.classList.remove(cls.collapsibleContent);
                    }
                }
            },
        },
        BUBBLE_NAV_TOP: {
            name: 'bubbleNavTop',
            group: 'bubbleNavButtons',
            position: 'top',
            isEnabled: (config) => config.platforms[PLATFORM].features.bubble_nav_buttons.enabled,
            getInfo: (msgElem) => PlatformAdapters.BubbleUI.getBubbleNavButtonsInfo(msgElem),
            render: (info, msgElem, manager) => {
                const createClickHandler = (direction) => (e) => {
                    e.stopPropagation();
                    const roleInfo = manager.messageCacheManager.findMessageIndex(msgElem);
                    if (!roleInfo) return;
                    const newIndex = roleInfo.index + direction;
                    const targetMsg = manager.messageCacheManager.getMessageAtIndex(roleInfo.role, newIndex);
                    if (targetMsg) {
                        scrollToElement(targetMsg, { offset: CONSTANTS.RETRY.SCROLL_OFFSET_FOR_NAV });
                        EventBus.publish(EVENTS.NAV_HIGHLIGHT_MESSAGE, targetMsg);
                    }
                };
                const prevBtn = manager.featureTemplates.navPrevButton.cloneNode(true);
                const nextBtn = manager.featureTemplates.navNextButton.cloneNode(true);
                if (!(prevBtn instanceof HTMLElement) || !(nextBtn instanceof HTMLElement)) return null;

                prevBtn.onclick = createClickHandler(-1);
                nextBtn.onclick = createClickHandler(1);
                const cls = manager.styleHandle.classes;
                return h(`div.${cls.navGroupTop}`, [prevBtn, nextBtn]);
            },
            update: (element, info, isEnabled, messageElement, manager) => {
                const cls = manager.styleHandle.classes;
                element.classList.toggle(cls.hidden, !isEnabled);
            },
        },
        BUBBLE_NAV_BOTTOM: {
            name: 'bubbleNavBottom',
            group: 'bubbleNavButtons',
            position: 'bottom',
            isEnabled: (config) => config.platforms[PLATFORM].features.bubble_nav_buttons.enabled,
            getInfo: (msgElem) => PlatformAdapters.BubbleUI.getBubbleNavButtonsInfo(msgElem),
            render: (info, msgElem, manager) => {
                const topBtn = manager.featureTemplates.navTopButton.cloneNode(true);
                if (!(topBtn instanceof HTMLElement)) return null;

                topBtn.onclick = (e) => {
                    e.stopPropagation();
                    scrollToElement(msgElem, { offset: CONSTANTS.RETRY.SCROLL_OFFSET_FOR_NAV });
                };
                const cls = manager.styleHandle.classes;
                return h(`div.${cls.navGroupBottom}`, [topBtn]);
            },
            update: (element, info, isEnabled, messageElement, manager) => {
                const cls = manager.styleHandle.classes;
                element.classList.toggle(cls.hidden, !isEnabled);
            },
        },
    };

    /**
     * Manages the lifecycle of UI elements injected into chat bubbles, such as collapsible and navigation buttons.
     * It uses a feature-driven architecture, where each UI addition is a self-contained "feature" object.
     * This class acts as an engine that processes these features for each message element.
     */
    class BubbleUIManager extends BaseManager {
        /**
         * @param {ConfigManager} configManager
         * @param {MessageCacheManager} messageCacheManager
         */
        constructor(configManager, messageCacheManager) {
            super();
            this.configManager = configManager;
            this.messageCacheManager = messageCacheManager;
            this.navContainers = new Map();
            this.featureElementsCache = new Map();
            this.autoCollapseProcessedIds = new Set();
            this.styleHandle = null;
            this.featureTemplates = {}; // Initialized in init

            /**
             * @private
             * @type {Array<object>}
             */
            this._features = [BubbleFeatureDefs.COLLAPSIBLE, BubbleFeatureDefs.BUBBLE_NAV_TOP, BubbleFeatureDefs.BUBBLE_NAV_BOTTOM].map((def) => ({
                ...def,
                // Wrap update method to inject 'this' (manager) as the last argument
                // This allows the external definition to access manager state (styles, config, etc.)
                update: (element, info, isEnabled, messageElement) => def.update(element, info, isEnabled, messageElement, this),
            }));
        }

        /**
         * Initializes the manager by injecting styles and subscribing to events.
         */
        _onInit() {
            this.injectStyle();
            this._createTemplates();
            this._subscribe(EVENTS.TURN_COMPLETE, (turnNode) => this.processTurn(turnNode));

            // Clean up DOM and cancel tasks immediately on navigation start
            this._subscribe(EVENTS.NAVIGATION_START, () => this._handleNavigationStart());
            // Reset state on navigation complete
            this._subscribe(EVENTS.NAVIGATION, () => this._onNavigation());

            this._subscribe(EVENTS.CACHE_UPDATED, () => this.updateAll());
        }

        /**
         * Removes injected UI elements from the DOM and clears caches.
         */
        _onDestroy() {
            // Remove DOM elements to prevent artifacts
            this.navContainers.forEach((container) => container.remove());
            this.navContainers.clear();

            this.featureElementsCache.forEach((element) => element.remove());
            this.featureElementsCache.clear();

            this.autoCollapseProcessedIds.clear();
            // Do NOT set this.styleHandle to null here.

            this.featureTemplates = {};
        }

        /**
         * Forces a re-processing of all visible messages, typically after a config change.
         */
        updateAll() {
            this._syncCaches();
            const allMessages = this.messageCacheManager.getTotalMessages();
            this._processUpdateQueue(allMessages, CONSTANTS.RESOURCE_KEYS.BATCH_TASK, () => {
                this._updateNavButtonStates();
            });
        }

        /**
         * Processes a conversation turn after it has completed rendering.
         * @param {HTMLElement} turnNode The turn container element.
         */
        processTurn(turnNode) {
            const allMessageElements = Array.from(turnNode.querySelectorAll(CONSTANTS.SELECTORS.BUBBLE_FEATURE_MESSAGE_CONTAINERS)).filter((el) => el instanceof HTMLElement);
            this._processUpdateQueue(allMessageElements, CONSTANTS.RESOURCE_KEYS.BATCH_TASK_TURN);
        }

        /**
         * Processes a list of messages in batches, separating Read (Measure) and Write (Mutate) operations.
         * @private
         * @param {HTMLElement[]} messages - List of messages to process.
         * @param {string} resourceKey - The resource key to manage this batch task (allows concurrency for different contexts).
         * @param {() => void} [onComplete] - Callback when all batches are done.
         */
        _processUpdateQueue(messages, resourceKey, onComplete) {
            // Cancel any existing batch task for this specific key
            this.manageResource(resourceKey, null);

            const cancelFn = runBatchUpdate(
                messages,
                CONSTANTS.PROCESSING.BATCH_SIZE,
                // Measure
                (msg) => {
                    if (msg.isConnected) {
                        return this._measureElement(msg);
                    }
                    return null;
                },
                // Mutate
                (m) => {
                    if (m.messageElement.isConnected) {
                        this._mutateElement(m);
                    }
                },
                // On Finish
                () => {
                    this.manageResource(resourceKey, null);
                    if (onComplete) onComplete();
                }
            );

            this.manageResource(resourceKey, cancelFn);
        }

        /**
         * Gathers information required for UI injection without modifying the DOM.
         * @private
         * @param {HTMLElement} messageElement
         */
        _measureElement(messageElement) {
            const config = this.configManager.get();
            if (!config) return null;

            // 1. Unique ID Check
            let uniqueId = DomState.get(messageElement, CONSTANTS.DATA_KEYS.UNIQUE_ID);
            let needsIdSet = false;
            if (!uniqueId) {
                uniqueId = generateUniqueId('msg');
                needsIdSet = true;
            }

            // 2. Feature Info Gathering
            const featureTasks = this._features.map((feature) => {
                const isEnabled = feature.isEnabled(config);
                // getInfo is assumed to be a READ operation
                const info = isEnabled ? feature.getInfo(messageElement) : null;
                return {
                    feature,
                    cacheKey: `${feature.name}-${uniqueId}`,
                    isEnabled,
                    info,
                };
            });

            // 3. Navigation Anchor Check
            const needsNavContainer = featureTasks.some((t) => t.isEnabled && t.info && t.feature.group === 'bubbleNavButtons');
            let navPositioningParent = null;
            if (needsNavContainer) {
                navPositioningParent = PlatformAdapters.BubbleUI.getNavPositioningParent(messageElement);
            }

            return {
                messageElement,
                uniqueId,
                needsIdSet,
                featureTasks,
                navPositioningParent,
            };
        }

        /**
         * Applies DOM changes based on measurement data.
         * @private
         * @param {object} measurement
         */
        _mutateElement(measurement) {
            const { messageElement, uniqueId, needsIdSet, featureTasks, navPositioningParent } = measurement;
            const cls = this.styleHandle.classes;

            // 1. Set ID if needed
            if (needsIdSet) {
                DomState.set(messageElement, CONSTANTS.DATA_KEYS.UNIQUE_ID, uniqueId);
            }

            // 2. Cleanup Anchor Class (Self-correction)
            if (messageElement.classList.contains(cls.imageOnlyAnchor)) {
                messageElement.classList.remove(cls.imageOnlyAnchor);
            }

            // 3. Prepare Nav Container
            let bubbleNavContainer = null;
            if (navPositioningParent) {
                if (this.navContainers.has(messageElement)) {
                    bubbleNavContainer = this.navContainers.get(messageElement);
                } else {
                    // Check DOM in case it exists but wasn't cached (e.g., after reload)
                    let container = messageElement.querySelector(`.${cls.navContainer}`);
                    if (!container) {
                        // Create and Append
                        navPositioningParent.style.position = 'relative';
                        navPositioningParent.classList.add(cls.navParent);

                        container = h(`div.${cls.navContainer}`, [h(`div.${cls.navButtons}`)]);
                        if (container instanceof HTMLElement) {
                            navPositioningParent.appendChild(container);
                            this.navContainers.set(messageElement, container);
                        }
                    } else {
                        this.navContainers.set(messageElement, container);
                    }
                    bubbleNavContainer = container;
                }
            }

            // 4. Apply Features
            for (const task of featureTasks) {
                const { feature, cacheKey, isEnabled, info } = task;

                if (isEnabled && info) {
                    let featureElement = this.featureElementsCache.get(cacheKey);
                    if (!featureElement) {
                        // Render (Create DOM)
                        featureElement = feature.render(info, messageElement, this);
                        if (featureElement) {
                            this.featureElementsCache.set(cacheKey, featureElement);

                            let targetContainer = null;
                            let cleanupSelector = null;

                            if (feature.group === 'bubbleNavButtons') {
                                if (bubbleNavContainer) {
                                    targetContainer = bubbleNavContainer.querySelector(`.${cls.navButtons}`);
                                    if (featureElement.classList.contains(cls.navGroupTop)) {
                                        cleanupSelector = `.${cls.navGroupTop}`;
                                    } else {
                                        cleanupSelector = `.${cls.navGroupBottom}`;
                                    }
                                }
                            } else {
                                targetContainer = info.positioningParent;
                                if (featureElement.classList.length > 0) {
                                    cleanupSelector = `.${featureElement.classList[0]}`;
                                }
                            }

                            if (targetContainer && cleanupSelector) {
                                const existing = targetContainer.querySelector(cleanupSelector);
                                if (existing) existing.remove();

                                if (feature.position === 'top') {
                                    targetContainer.prepend(featureElement);
                                } else {
                                    targetContainer.appendChild(featureElement);
                                }
                            }
                        }
                    }
                    if (featureElement) {
                        feature.update(featureElement, info, true, messageElement);
                    }
                } else {
                    const featureElement = this.featureElementsCache.get(cacheKey);
                    if (featureElement) {
                        feature.update(featureElement, info, false, messageElement);
                    }
                }
            }
        }

        /**
         * Cleans up resources and DOM elements when navigation starts.
         * @private
         */
        _handleNavigationStart() {
            // Cancel pending batch processing to prevent memory leaks or errors
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, null);
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK_TURN, null);
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BUTTON_STATE_TASK, null);

            // Explicitly remove injected elements from DOM to prevent ghost UI
            this.navContainers.forEach((container) => container.remove());
            this.navContainers.clear();

            this.featureElementsCache.forEach((element) => element.remove());
            this.featureElementsCache.clear();

            this.autoCollapseProcessedIds.clear();
        }

        /**
         * Resets caches on page navigation.
         * @private
         */
        _onNavigation() {
            // Cancel pending batch processing as a fail-safe (in case NAVIGATION_START was missed)
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, null);
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK_TURN, null);
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BUTTON_STATE_TASK, null);

            // Ensure caches are cleared if not already done
            this.navContainers.clear();
            this.featureElementsCache.clear();
            this.autoCollapseProcessedIds.clear();
        }

        /**
         * Removes stale entries from caches.
         * @private
         */
        _syncCaches() {
            syncCacheWithMessages(this.navContainers, this.messageCacheManager);
            for (const [key, element] of this.featureElementsCache.entries()) {
                if (!element.isConnected) {
                    this.featureElementsCache.delete(key);
                }
            }
        }

        /**
         * Injects the feature's specific CSS into the document head using StyleManager.
         */
        injectStyle() {
            this.styleHandle = StyleManager.request(StyleDefinitions.getBubbleUI);
        }

        /**
         * Creates templates for UI features using the injected styles.
         * @private
         */
        _createTemplates() {
            const cls = this.styleHandle.classes;
            const prevClass = `${cls.navBtn} ${cls.navPrev}`;
            const nextClass = `${cls.navBtn} ${cls.navNext}`;
            const topClass = `${cls.navBtn} ${cls.navTop}`;

            this.featureTemplates = {
                collapsibleButton: h(`button.${cls.collapsibleBtn}`, { type: 'button', title: 'Toggle message' }, [this._createIcon('collapse')]),
                navPrevButton: h('button', { className: prevClass, type: 'button', title: 'Scroll to previous message', dataset: { [CONSTANTS.DATA_KEYS.ORIGINAL_TITLE]: 'Scroll to previous message' } }, [this._createIcon('prev')]),
                navNextButton: h('button', { className: nextClass, type: 'button', title: 'Scroll to next message', dataset: { [CONSTANTS.DATA_KEYS.ORIGINAL_TITLE]: 'Scroll to next message' } }, [this._createIcon('next')]),
                navTopButton: h('button', { className: topClass, type: 'button', title: 'Scroll to top of this message' }, [this._createIcon('top')]),
            };
        }

        /**
         * Creates an SVG icon element from a predefined map.
         * @private
         */
        _createIcon(type) {
            const iconMap = {
                collapse: 'arrowUp',
                prev: 'arrowUp',
                next: 'arrowDown',
                top: 'scrollToTop',
            };
            const iconKey = iconMap[type];
            if (!iconKey) {
                return null;
            }
            const element = createIconFromDef(StyleDefinitions.ICONS[iconKey]);
            if (element instanceof SVGElement) {
                return element;
            }
            return null;
        }

        /**
         * Updates the enabled/disabled state of sequential navigation buttons.
         * @private
         */
        _updateNavButtonStates() {
            this._syncCaches();
            // Cancel any pending button state updates
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BUTTON_STATE_TASK, null);

            const disabledHint = '(No message to scroll to)';
            const cls = this.styleHandle.classes;

            const allMessages = [...this.messageCacheManager.getUserMessages(), ...this.messageCacheManager.getAssistantMessages()];

            const cancelFn = runBatchUpdate(
                allMessages,
                CONSTANTS.PROCESSING.BATCH_SIZE,
                (message) => {
                    if (!message.isConnected) return null;
                    const container = this.navContainers.get(message);
                    if (!container || !container.isConnected) return null;

                    // Calculate state based on cache role index logic
                    // We need to know if this is the first or last message of its role.
                    const roleInfo = this.messageCacheManager.findMessageIndex(message);
                    if (!roleInfo) return null;

                    const roleMessages = roleInfo.role === CONSTANTS.INTERNAL_ROLES.USER ? this.messageCacheManager.getUserMessages() : this.messageCacheManager.getAssistantMessages();

                    const isFirst = roleInfo.index === 0;
                    const isLast = roleInfo.index === roleMessages.length - 1;

                    return { container, isFirst, isLast };
                },
                ({ container, isFirst, isLast }) => {
                    const prevBtn = container.querySelector(`.${cls.navPrev}`);
                    if (prevBtn) {
                        prevBtn.disabled = isFirst;
                        const originalTitle = DomState.get(prevBtn, CONSTANTS.DATA_KEYS.ORIGINAL_TITLE);
                        prevBtn.title = isFirst ? `${originalTitle} ${disabledHint}` : originalTitle;
                    }
                    const nextBtn = container.querySelector(`.${cls.navNext}`);
                    if (nextBtn) {
                        nextBtn.disabled = isLast;
                        const originalTitle = DomState.get(nextBtn, CONSTANTS.DATA_KEYS.ORIGINAL_TITLE);
                        nextBtn.title = isLast ? `${originalTitle} ${disabledHint}` : originalTitle;
                    }
                },
                () => this.manageResource(CONSTANTS.RESOURCE_KEYS.BUTTON_STATE_TASK, null)
            );

            this.manageResource(CONSTANTS.RESOURCE_KEYS.BUTTON_STATE_TASK, cancelFn);
        }
    }

    // =================================================================================
    // SECTION: Fixed Navigation Console
    // Description: Manages the fixed navigation UI docked to the input area.
    // =================================================================================

    class FixedNavigationManager extends BaseManager {
        /**
         * @param {object} dependencies
         * @param {MessageCacheManager} dependencies.messageCacheManager
         * @param {ConfigManager} dependencies.configManager
         * @param {any} dependencies.autoScrollManager
         * @param {MessageLifecycleManager} dependencies.messageLifecycleManager
         * @param {object} options
         */
        constructor({ messageCacheManager, configManager, autoScrollManager, messageLifecycleManager }, options) {
            super();
            this.messageCacheManager = messageCacheManager;
            this.configManager = configManager;
            this.autoScrollManager = autoScrollManager; // May be null
            this.messageLifecycleManager = messageLifecycleManager;
            this.options = options; // Keep reference for re-initialization

            // Handle to the styles and classes
            this.styleHandle = null;

            // Centralized state management
            this.state = {
                currentIndices: {
                    [CONSTANTS.NAV_ROLES.USER]: -1,
                    [CONSTANTS.NAV_ROLES.ASSISTANT]: -1,
                    [CONSTANTS.NAV_ROLES.TOTAL]: -1,
                },
                highlightedMessage: null,
                isInitialSelectionDone: !!options.isReEnabling,
                jumpListComponent: null,
                lastFilterValue: '',
                previousTotalMessages: messageCacheManager.getTotalMessages().length,
                isAutoScrolling: false,
                activeRole: CONSTANTS.NAV_ROLES.TOTAL,
                inputMode: CONSTANTS.INPUT_MODES.NORMAL, // 'normal', 'shift'
                stickyMode: null, // null | 'shift'
                interactionActive: false, // true if hovered or focused
            };

            // Cache for UI elements to avoid repeated querySelector calls
            this.uiCache = null;

            this.isRepositionScheduled = false;
            this.scheduleReposition = this.scheduleReposition.bind(this);

            this.handleBodyClick = this.handleBodyClick.bind(this);
            this._handleKeyDown = this._handleKeyDown.bind(this);
            this._handleDocumentKeyChange = this._handleDocumentKeyChange.bind(this);
            this._handleInteractionStateChange = this._handleInteractionStateChange.bind(this);
            this._handleRoleContextMenu = this._handleRoleContextMenu.bind(this);
            this._handleModeContextMenu = this._handleModeContextMenu.bind(this);
            this._handleWindowBlur = this._handleWindowBlur.bind(this);
        }

        /**
         * Initializes the fixed navigation console.
         * @returns {Promise<void>}
         */
        async _onInit() {
            // Re-initialize state if it was destroyed (null)
            if (!this.state) {
                this.state = {
                    currentIndices: {
                        [CONSTANTS.NAV_ROLES.USER]: -1,
                        [CONSTANTS.NAV_ROLES.ASSISTANT]: -1,
                        [CONSTANTS.NAV_ROLES.TOTAL]: -1,
                    },
                    highlightedMessage: null,
                    isInitialSelectionDone: !!this.options.isReEnabling,
                    jumpListComponent: null,
                    lastFilterValue: '',
                    previousTotalMessages: this.messageCacheManager.getTotalMessages().length,
                    isAutoScrolling: false,
                    activeRole: CONSTANTS.NAV_ROLES.TOTAL,
                    inputMode: CONSTANTS.INPUT_MODES.NORMAL,
                    stickyMode: null,
                    interactionActive: false,
                };
            }

            // --- Performance Optimization: Search Cache ---
            /** @type {Map<HTMLElement, {displayText: string, lowerText: string, roleClass: string}>} */
            this.searchCache = new Map();
            /** @type {HTMLElement[]} */
            this.indexingQueue = [];
            this.indexingTask = null;

            this.styleHandle = this.injectStyle();
            // Pre-inject JumpList styles to avoid overhead on toggle
            this.jumpListStyleHandle = StyleManager.request(StyleDefinitions.getJumpList);
            this.createContainers();

            this._subscribe(EVENTS.CACHE_UPDATED, this._handleCacheUpdate.bind(this));
            // Reset state immediately on navigation start to hide UI and cleanup components
            this._subscribe(EVENTS.NAVIGATION_START, this.resetState.bind(this));
            this._subscribe(EVENTS.NAVIGATION, this.resetState.bind(this));
            this._subscribe(EVENTS.POLLING_MESSAGES_FOUND, this._handlePollingMessagesFound.bind(this));
            this._subscribe(EVENTS.NAV_HIGHLIGHT_MESSAGE, this.setHighlightAndIndices.bind(this));
            this._subscribe(EVENTS.WINDOW_RESIZED, this.scheduleReposition);
            this._subscribe(EVENTS.SIDEBAR_LAYOUT_CHANGED, this.scheduleReposition);
            this._subscribe(EVENTS.INPUT_AREA_RESIZED, this.scheduleReposition);
            this._subscribe(EVENTS.UI_REPOSITION, this.scheduleReposition);
            this._subscribe(EVENTS.DEFERRED_LAYOUT_UPDATE, this.scheduleReposition);

            // Subscribe to auto-scroll events if the manager exists.
            if (this.autoScrollManager) {
                this._subscribe(EVENTS.AUTO_SCROLL_START, () => {
                    this.state.isAutoScrolling = true;
                    this.updateUI(); // Re-render the UI to reflect the state change.
                    this.hideJumpList();
                });
                this._subscribe(EVENTS.AUTO_SCROLL_COMPLETE, () => {
                    this.state.isAutoScrolling = false;
                    this.updateUI(); // Re-render the UI to reflect the state change.
                    this.selectLastMessage();
                });
            }

            // After the main UI is ready, trigger an initial UI update.
            this._handleCacheUpdate();
        }

        /**
         * Destroys the component and cleans up all related DOM elements and listeners.
         * @returns {void}
         */
        _onDestroy() {
            this.isRepositionScheduled = false;

            // Perform cleanup that requires state before clearing it
            if (this.state) {
                // jumpListComponent is managed by BaseManager and will be destroyed automatically.

                if (this.state.highlightedMessage && this.styleHandle) {
                    this.state.highlightedMessage.classList.remove(this.styleHandle.classes.highlightMessage);
                }
            }

            this.navConsole?.remove();

            // UI cleanup is handled by disposables registered in _onInit and createContainers
            this.uiCache = null;
            this.navConsole = null;
            this.state = null;
            this.styleHandle = null;
            this.jumpListStyleHandle = null;
        }

        updateUI() {
            this._renderUI();
        }

        hideJumpList() {
            this._hideJumpList();
        }

        /**
         * Selects the last message in the chat and updates the navigation console.
         */
        selectLastMessage() {
            const totalMessages = this.messageCacheManager.getTotalMessages();
            if (totalMessages.length > 0) {
                const lastMessage = totalMessages[totalMessages.length - 1];
                this.navigateToMessage(lastMessage);
            }
        }

        navigateToMessage(element) {
            if (!element) return;
            // Manual navigation overrides the initial auto-scroll logic.
            this.state.isInitialSelectionDone = true;
            this.setHighlightAndIndices(element);
            this._scrollToMessage(element);
        }

        resetState() {
            // Guard against execution after destruction
            if (this.isDestroyed || !this.state) return;

            // Hide immediately to prevent flickering of old state
            if (this.navConsole) {
                this.navConsole.classList.add(this.styleHandle.classes.hidden);
                // Mark as unpositioned to ensure it stays transparent until the next layout calculation finishes
                this.navConsole.classList.add(this.styleHandle.classes.unpositioned);
            }

            if (this.state.highlightedMessage) {
                this.state.highlightedMessage.classList.remove(this.styleHandle.classes.highlightMessage);
            }

            // Ensure the jump list component is properly destroyed via manager
            this.manageResource(CONSTANTS.RESOURCE_KEYS.JUMP_LIST, null);

            // Clear performance caches to release memory
            if (this.searchCache) this.searchCache.clear();
            this.indexingQueue = [];
            // Pending idle tasks are cleared implicitly as they check the queue length

            this.state = {
                currentIndices: {
                    [CONSTANTS.NAV_ROLES.USER]: -1,
                    [CONSTANTS.NAV_ROLES.ASSISTANT]: -1,
                    [CONSTANTS.NAV_ROLES.TOTAL]: -1,
                },
                highlightedMessage: null,
                isInitialSelectionDone: false,
                jumpListComponent: null,
                lastFilterValue: '',
                previousTotalMessages: 0,
                isAutoScrolling: false,
                activeRole: CONSTANTS.NAV_ROLES.TOTAL,
                inputMode: CONSTANTS.INPUT_MODES.NORMAL,
                stickyMode: null,
                interactionActive: false,
            };

            // Reset filter text
            this.lastFilterValue = '';

            // Reset the bulk collapse button to its default state
            const collapseBtn = this.uiCache?.buttons?.fold;
            if (collapseBtn instanceof HTMLElement) {
                DomState.set(collapseBtn, CONSTANTS.DATA_KEYS.STATE, CONSTANTS.UI_STATES.EXPANDED);
            }

            // Do not call _renderUI() here.
            // Visibility and correct values will be restored when CACHE_UPDATED fires on the new page.
        }

        /**
         * Synchronizes the search cache with the current message list.
         * Removes stale entries and schedules indexing for new messages.
         * @private
         */
        _syncSearchCache() {
            const totalMessages = this.messageCacheManager.getTotalMessages();
            const currentSet = new Set(totalMessages);

            // 1. Cleanup: Remove messages that are no longer in the DOM
            for (const msg of this.searchCache.keys()) {
                if (!currentSet.has(msg)) {
                    this.searchCache.delete(msg);
                }
            }

            // 2. Queueing: Find messages not yet cached
            this.indexingQueue = [];
            for (const msg of totalMessages) {
                if (!this.searchCache.has(msg)) {
                    this.indexingQueue.push(msg);
                }
            }

            // 3. Schedule Idle Indexing
            if (this.indexingQueue.length > 0) {
                this._runIdleIndexing();
            }
        }

        /**
         * Processes the indexing queue during browser idle periods.
         * @private
         */
        _runIdleIndexing() {
            if (this.indexingQueue.length === 0) return;

            // Use runWhenIdle utility
            runWhenIdle((deadline) => {
                const cls = this.jumpListStyleHandle.classes;

                while (this.indexingQueue.length > 0 && deadline.timeRemaining() > 1) {
                    const msg = this.indexingQueue.shift();
                    // Double check if still valid and not cached
                    if (msg && msg.isConnected && !this.searchCache.has(msg)) {
                        const role = PlatformAdapters.General.getMessageRole(msg);
                        const roleClass = role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_USER ? cls.userItem : role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_ASSISTANT ? cls.asstItem : null;

                        const rawText = PlatformAdapters.General.getJumpListDisplayText(msg);
                        const displayText = (rawText || '').replace(/\s+/g, ' ').trim();

                        this.searchCache.set(msg, {
                            displayText: displayText,
                            lowerText: displayText.toLowerCase(),
                            roleClass: roleClass,
                        });
                    }
                }

                // If items remain, schedule next batch
                if (this.indexingQueue.length > 0) {
                    this._runIdleIndexing();
                }
            }, CONSTANTS.TIMING.POLLING.IDLE_INDEXING_MS);
        }

        /**
         * Highlights a target message and updates the navigation counters to reflect its position.
         * @param {HTMLElement} targetMsg The message element to highlight and use as the reference for indices.
         * @returns {void}
         */
        setHighlightAndIndices(targetMsg) {
            if (!targetMsg) return;

            // Retrieve cached info for O(1) access
            const cachedInfo = this.messageCacheManager.findMessageIndex(targetMsg);
            if (!cachedInfo) return;

            const totalMessages = this.messageCacheManager.getTotalMessages();
            const userMessages = this.messageCacheManager.getUserMessages();
            const asstMessages = this.messageCacheManager.getAssistantMessages();

            let currentTotalIndex = cachedInfo.totalIndex;
            let currentRoleIndex = cachedInfo.index;

            // Verify if the cached index actually points to the target message.
            if (totalMessages[currentTotalIndex] !== targetMsg) {
                // If mismatch (e.g. due to cache lag), fall back to O(N) indexOf for ALL indices to ensure consistency.
                // We cannot trust ANY part of the cachedInfo if the totalIndex verification fails.
                currentTotalIndex = totalMessages.indexOf(targetMsg);
                if (cachedInfo.role === CONSTANTS.INTERNAL_ROLES.USER) {
                    currentRoleIndex = userMessages.indexOf(targetMsg);
                } else {
                    currentRoleIndex = asstMessages.indexOf(targetMsg);
                }
            }

            const newIndices = {
                [CONSTANTS.NAV_ROLES.TOTAL]: currentTotalIndex,
                [CONSTANTS.NAV_ROLES.USER]: -1,
                [CONSTANTS.NAV_ROLES.ASSISTANT]: -1,
            };

            // Determine indices based on the message role
            if (cachedInfo.role === CONSTANTS.INTERNAL_ROLES.USER) {
                newIndices[CONSTANTS.NAV_ROLES.USER] = currentRoleIndex;
                newIndices[CONSTANTS.NAV_ROLES.ASSISTANT] = this.findNearestIndex(targetMsg, CONSTANTS.INTERNAL_ROLES.ASSISTANT);
            } else {
                newIndices[CONSTANTS.NAV_ROLES.ASSISTANT] = currentRoleIndex;
                newIndices[CONSTANTS.NAV_ROLES.USER] = this.findNearestIndex(targetMsg, CONSTANTS.INTERNAL_ROLES.USER);
            }

            this.state.highlightedMessage = targetMsg;
            this.state.currentIndices = newIndices;

            this._renderUI();
        }

        /**
         * @private
         * @description Finds the index of the nearest preceding message of a specific role using cached data.
         * This avoids O(N) Set creation and array searches.
         * @param {HTMLElement} currentMsg The reference message element.
         * @param {string} targetRole The role to search for ('user' or 'assistant').
         * @returns {number} The index of the nearest message in the target role's array, or -1 if not found.
         */
        findNearestIndex(currentMsg, targetRole) {
            const currentInfo = this.messageCacheManager.findMessageIndex(currentMsg);
            if (!currentInfo) return -1;

            const totalMessages = this.messageCacheManager.getTotalMessages();
            let startIndex = currentInfo.totalIndex;

            // Verify if the cached index is valid. If mismatch, fallback to O(N) search for safety.
            if (totalMessages[startIndex] !== currentMsg) {
                startIndex = totalMessages.indexOf(currentMsg);
            }

            if (startIndex === -1) return -1;

            // Iterate backwards from the current message's position in the master list.
            for (let i = startIndex; i >= 0; i--) {
                const candidateMsg = totalMessages[i];
                const candidateInfo = this.messageCacheManager.findMessageIndex(candidateMsg);

                // Check if the candidate matches the target role.
                if (candidateInfo && candidateInfo.role === targetRole) {
                    // Found the nearest message. Return its cached role-specific index directly.
                    // Note: If totalIndex verification passed (or was corrected), we assume candidateInfo is consistent enough for this lookup.
                    return candidateInfo.index;
                }
            }

            return -1; // Fallback if no preceding message is found
        }

        _handleCacheUpdate() {
            // Note: MessageCacheManager suppresses cache updates during streaming,
            // so we don't need to explicitly check for streaming state here.

            // Sync search cache immediately on update
            this._syncSearchCache();

            // If the jump list is open, a cache update means its data is stale.
            // Close it to prevent inconsistent state and user confusion.
            if (this.state.jumpListComponent) {
                this._hideJumpList();
                return; // Exit early to prevent further UI changes while the user was interacting.
            }

            const totalMessages = this.messageCacheManager.getTotalMessages();
            const newTotal = totalMessages.length;
            const oldTotal = this.state.previousTotalMessages;

            // Check if new messages were added (e.g., from layout scan) and if we were at the end.
            if (newTotal > oldTotal && this.state.currentIndices.total === oldTotal - 1 && !this.state.isAutoScrolling) {
                // We were at the old last message, and new messages appeared.
                // Re-select the new last message. This will update indices and call _renderUI().
                this.selectLastMessage();
                // Update previousTotalMessages here to prevent logic blocks below from running incorrectly
                this.state.previousTotalMessages = newTotal;
                // Exit, as selectLastMessage() already handled the UI update.
                return;
            }

            // Validate the currently highlighted message.
            if (this.state.highlightedMessage && !totalMessages.includes(this.state.highlightedMessage)) {
                Logger.log('NAVIGATION', '', 'Highlighted message was removed from the DOM. Reselecting...');
                // The highlighted message was deleted. Find the best candidate to re-highlight.
                const lastKnownIndex = this.state.currentIndices.total;
                // Try to select the message at the same index, or the new last message if the index is now out of bounds.
                const newIndex = Math.min(lastKnownIndex, totalMessages.length - 1);

                if (newIndex >= 0) {
                    this.setHighlightAndIndices(totalMessages[newIndex]);
                } else {
                    // Cache is empty, reset state.
                    this.resetState();
                }
            }

            // Select the last message on initial load, but only if auto-scroll is not in progress.
            if (!this.state.isAutoScrolling && !this.state.isInitialSelectionDone && totalMessages.length > 0) {
                this.selectLastMessage();
                this.state.isInitialSelectionDone = true;
            } else if (!this.state.highlightedMessage && totalMessages.length > 0) {
                // If initial selection is already done (e.g. re-enabling via settings),
                // default to the last message instead of the first, but do not scroll.
                if (this.state.isInitialSelectionDone) {
                    this.setHighlightAndIndices(totalMessages[totalMessages.length - 1]);
                } else {
                    this.setHighlightAndIndices(totalMessages[0]);
                }
            }

            PlatformAdapters.FixedNav.handleInfiniteScroll(this, this.state.highlightedMessage, this.state.previousTotalMessages);
            this.state.previousTotalMessages = totalMessages.length;

            this._renderUI();
        }

        _handlePollingMessagesFound() {
            this.selectLastMessage();
        }

        createContainers() {
            const cls = this.styleHandle.classes;
            // Check if element exists using new ID from StyleManager
            if (document.getElementById(cls.consoleId)) return;
            const navConsole = h(`div#${cls.consoleId}.${cls.unpositioned}`);
            if (!(navConsole instanceof HTMLElement)) return;
            this.navConsole = navConsole;
            document.body.appendChild(this.navConsole);

            // Register cleanup for the container immediately after creation
            this.addDisposable(() => {
                this.navConsole?.remove();
                this.navConsole = null;
            });

            this.renderInitialUI();
            this.attachEventListeners();
        }

        injectStyle() {
            if (this.styleHandle) return this.styleHandle;
            return StyleManager.request(StyleDefinitions.getFixedNav);
        }

        renderInitialUI() {
            if (!this.navConsole) return;
            const cls = this.styleHandle.classes;

            // Buttons configuration
            const btnBaseClass = cls.btn;

            // Left Slot Buttons
            const btnPrev = h(
                `button.${btnBaseClass}.${cls.btnAccent}`,
                {
                    title: 'Previous message',
                },
                [createIconFromDef(StyleDefinitions.ICONS.arrowUp)]
            );
            const btnFirst = h(`button.${btnBaseClass}.${cls.btnDanger}`, { title: 'First message', style: { display: 'none' } }, [createIconFromDef(StyleDefinitions.ICONS.scrollToFirst)]);

            // Platform specific buttons (Scan) - Shift mode for Left Slot
            const platformButtons = PlatformAdapters.FixedNav.getPlatformSpecificButtons(this, this.styleHandle);
            platformButtons.forEach((btn) => {
                if (btn instanceof HTMLElement) {
                    btn.style.display = 'none';
                }
            });

            // Right Slot Buttons
            const btnNext = h(
                `button.${btnBaseClass}.${cls.btnAccent}`,
                {
                    title: 'Next message',
                },
                [createIconFromDef(StyleDefinitions.ICONS.arrowDown)]
            );
            const btnLast = h(`button.${btnBaseClass}.${cls.btnDanger}`, { title: 'Last message', style: { display: 'none' } }, [createIconFromDef(StyleDefinitions.ICONS.scrollToLast)]);

            const btnFold = h(
                `button#${cls.bulkCollapseBtnId}.${btnBaseClass}`,
                {
                    style: { display: 'none' },
                    dataset: { [CONSTANTS.DATA_KEYS.STATE]: CONSTANTS.UI_STATES.EXPANDED },
                },
                [createIconFromDef(StyleDefinitions.ICONS.bulkCollapse), createIconFromDef(StyleDefinitions.ICONS.bulkExpand)]
            );

            // Center Info
            // Role Button: Icon-based button for switching roles
            const roleBtn = h(
                `button.${cls.roleBtn}`,
                {
                    title: 'Click: Open Jump List\nRight-Click: Switch Role',
                    oncontextmenu: this._handleRoleContextMenu,
                },
                [] // Icon will be set in _renderUI
            );

            const counter = h(
                `span.${cls.counter}`,
                {
                    title: 'Click to enter message number to jump\n[Right-Click] Cycle modes (Normal/Shift)',
                    oncontextmenu: this._handleModeContextMenu,
                },
                [h(`span.${cls.counterCurrent}`, '--'), ' / ', h(`span.${cls.counterTotal}`, '--')]
            );

            // Layout Construction
            const leftSlot = h(`div.${cls.group}`, [btnFirst, ...platformButtons, btnPrev]);
            const centerSlot = h(`div.${cls.group}`, [roleBtn, counter]);
            const rightSlot = h(`div.${cls.group}`, [btnNext, btnLast, btnFold]);

            this.navConsole.textContent = '';
            this.navConsole.appendChild(leftSlot);
            this.navConsole.appendChild(centerSlot);
            this.navConsole.appendChild(rightSlot);

            // Cache UI references
            this.uiCache = {
                buttons: {
                    prev: btnPrev,
                    first: btnFirst,
                    platformButtons: platformButtons,
                    next: btnNext,
                    last: btnLast,
                    fold: btnFold,
                    role: roleBtn,
                },
                info: {
                    counter: counter,
                    current: counter.querySelector(`.${cls.counterCurrent}`),
                    total: counter.querySelector(`.${cls.counterTotal}`),
                },
            };
        }

        attachEventListeners() {
            document.body.addEventListener('click', this.handleBodyClick, true);
            this.addDisposable(() => document.body.removeEventListener('click', this.handleBodyClick, true));

            document.addEventListener('keydown', this._handleKeyDown, true);
            this.addDisposable(() => document.removeEventListener('keydown', this._handleKeyDown, true));

            document.addEventListener('keydown', this._handleDocumentKeyChange, true);
            this.addDisposable(() => document.removeEventListener('keydown', this._handleDocumentKeyChange, true));

            document.addEventListener('keyup', this._handleDocumentKeyChange, true);
            this.addDisposable(() => document.removeEventListener('keyup', this._handleDocumentKeyChange, true));

            window.addEventListener('blur', this._handleWindowBlur);
            this.addDisposable(() => window.removeEventListener('blur', this._handleWindowBlur));

            if (this.navConsole) {
                this.navConsole.addEventListener('mouseenter', this._handleInteractionStateChange);
                this.navConsole.addEventListener('mouseleave', this._handleInteractionStateChange);
                this.navConsole.addEventListener('focusin', this._handleInteractionStateChange);
                this.navConsole.addEventListener('focusout', this._handleInteractionStateChange);

                this.addDisposable(() => {
                    if (this.navConsole) {
                        this.navConsole.removeEventListener('mouseenter', this._handleInteractionStateChange);
                        this.navConsole.removeEventListener('mouseleave', this._handleInteractionStateChange);
                        this.navConsole.removeEventListener('focusin', this._handleInteractionStateChange);
                        this.navConsole.removeEventListener('focusout', this._handleInteractionStateChange);
                    }
                });
            }
        }

        scheduleReposition() {
            if (this.isRepositionScheduled) return;
            this.isRepositionScheduled = true;
            EventBus.queueUIWork(() => {
                if (this.isDestroyed) return;
                this.repositionContainers();
                this.isRepositionScheduled = false;
            });
        }

        /**
         * Repositions the navigation console.
         * Handles fixed positioning (near input) and embedded positioning (in header).
         * @returns {void}
         */
        repositionContainers() {
            if (!this.navConsole) return;

            const config = this.configManager.get();
            // Default to 'input_top' if not specified
            const positionSetting = config?.platforms?.[PLATFORM]?.features?.fixed_nav_console?.position || CONSTANTS.CONSOLE_POSITIONS.INPUT_TOP;

            // Resolve anchor container for header mode
            let headerContainer = null;
            if (positionSetting === CONSTANTS.CONSOLE_POSITIONS.HEADER) {
                headerContainer = PlatformAdapters.FixedNav.getNavAnchorContainer();
            }

            // Use withLayoutCycle to prevent layout thrashing
            withLayoutCycle({
                measure: () => {
                    // --- Read Phase ---
                    // 1. Determine Target Mode
                    let targetMode = positionSetting;

                    // Fallback: Check availability and container existence
                    if (targetMode === CONSTANTS.CONSOLE_POSITIONS.HEADER) {
                        const adapter = PlatformAdapters.FixedNav;
                        const isAvailable = adapter.isHeaderPositionAvailable();

                        if (!headerContainer || !isAvailable) {
                            targetMode = CONSTANTS.CONSOLE_POSITIONS.INPUT_TOP;
                        }
                    }

                    // 2. Prepare Data
                    const result = {
                        mode: targetMode,
                        isAlreadyEmbedded: targetMode === CONSTANTS.CONSOLE_POSITIONS.HEADER ? this.navConsole.parentElement === headerContainer : false,
                        isAlreadyBodyChild: targetMode !== CONSTANTS.CONSOLE_POSITIONS.HEADER ? this.navConsole.parentElement === document.body : false,
                        headerContainer,
                        style: {},
                    };

                    // 3. Measure ONLY if needed
                    if (targetMode === CONSTANTS.CONSOLE_POSITIONS.INPUT_TOP) {
                        const inputForm = document.querySelector(CONSTANTS.SELECTORS.FIXED_NAV_INPUT_AREA_TARGET);
                        // Fallback: If input form not found, we can't position properly.
                        if (!inputForm) return null;

                        const formRect = inputForm.getBoundingClientRect();
                        const consoleRect = this.navConsole.getBoundingClientRect();
                        const consoleWidth = consoleRect.width;
                        const windowHeight = window.innerHeight;

                        const margin = CONSTANTS.UI_SPECS.PANEL_MARGIN;
                        const bottomPosition = windowHeight - formRect.top + margin;
                        const formCenter = formRect.left + formRect.width / 2;

                        result.style.left = `${formCenter - consoleWidth / 2}px`;
                        result.style.bottom = `${bottomPosition}px`;
                    }

                    return result;
                },
                mutate: (measured) => {
                    // --- Write Phase ---
                    if (this.isDestroyed) return;
                    if (!measured) return;

                    if (measured.mode === CONSTANTS.CONSOLE_POSITIONS.HEADER) {
                        // Apply Embedded Mode
                        if (!measured.isAlreadyEmbedded && measured.headerContainer) {
                            measured.headerContainer.appendChild(this.navConsole);
                        }
                        this.navConsole.classList.add('is-embedded');

                        // Reset fixed positioning styles
                        this.navConsole.style.left = '';
                        this.navConsole.style.right = '';
                        this.navConsole.style.bottom = '';
                        this.navConsole.style.position = '';
                    } else {
                        // Apply Fixed Mode
                        if (!measured.isAlreadyBodyChild) {
                            document.body.appendChild(this.navConsole);
                        }
                        this.navConsole.classList.remove('is-embedded');

                        this.navConsole.style.position = 'fixed';
                        this.navConsole.style.left = measured.style.left;
                        this.navConsole.style.right = ''; // Ensure right is cleared
                        this.navConsole.style.bottom = measured.style.bottom;
                    }

                    // Reveal the console
                    this.navConsole.classList.remove(this.styleHandle.classes.unpositioned);
                },
            });
        }

        _renderUI() {
            if (!this.navConsole || !this.uiCache) return;
            const cls = this.styleHandle.classes;
            const { currentIndices, highlightedMessage, activeRole, inputMode, stickyMode } = this.state;

            // Determine effective mode: Sticky mode overrides keyboard input mode if set
            const effectiveMode = stickyMode || inputMode;

            // Determine visibility
            const totalMessages = this.messageCacheManager.getTotalMessages();
            const isNewChat = isNewChatPage();
            const hasCachedMessages = totalMessages.length > 0;
            const hasDomMessages = !!document.querySelector(CONSTANTS.SELECTORS.MESSAGE_ROOT_NODE);

            // Capture previous hidden state to trigger repositioning on appearance
            const wasHidden = this.navConsole.classList.contains(cls.hidden);

            // Hide if it's explicitly a new chat page.
            // If not a new chat page, only hide if there are NO messages in cache AND no message elements in the DOM.
            // This prevents the console from disappearing during cache rebuilds or temporary state inconsistencies.
            if (isNewChat || (!hasCachedMessages && !hasDomMessages)) {
                this.navConsole.classList.add(cls.hidden);
                // Mark as unpositioned to ensure it stays transparent until the next layout calculation finishes
                this.navConsole.classList.add(cls.unpositioned);
            } else {
                this.navConsole.classList.remove(cls.hidden);

                // If previously hidden or currently unpositioned, ensure it's marked as unpositioned (transparent)
                // and schedule a reposition. It will become visible only after repositionContainers completes.
                if (wasHidden || this.navConsole.classList.contains(cls.unpositioned)) {
                    this.navConsole.classList.add(cls.unpositioned);
                    this.scheduleReposition();
                }
            }

            // Update Counters & Label
            const roleMap = {
                [CONSTANTS.NAV_ROLES.TOTAL]: { displayName: 'Total', icon: 'list', colorClass: cls.roleTotal, messages: totalMessages, index: currentIndices[CONSTANTS.NAV_ROLES.TOTAL] },
                [CONSTANTS.NAV_ROLES.ASSISTANT]: { displayName: 'Assistant', icon: 'chatLeft', colorClass: cls.roleAssistant, messages: this.messageCacheManager.getAssistantMessages(), index: currentIndices[CONSTANTS.NAV_ROLES.ASSISTANT] },
                [CONSTANTS.NAV_ROLES.USER]: { displayName: 'User', icon: 'chatRight', colorClass: cls.roleUser, messages: this.messageCacheManager.getUserMessages(), index: currentIndices[CONSTANTS.NAV_ROLES.USER] },
            };

            const currentData = roleMap[activeRole];

            // Update Icon
            const roleBtn = this.uiCache.buttons.role;
            if (roleBtn instanceof HTMLElement) {
                // Only update DOM if icon type changed
                const currentIconType = roleBtn.dataset.iconType;
                if (currentIconType !== currentData.icon) {
                    roleBtn.textContent = '';
                    const iconDef = StyleDefinitions.ICONS[currentData.icon];
                    if (iconDef) {
                        roleBtn.appendChild(createIconFromDef(iconDef));
                    }
                    roleBtn.dataset.iconType = currentData.icon;
                }

                // Update Colors
                // Check class list before modifying to avoid style recalc
                if (!roleBtn.classList.contains(currentData.colorClass)) {
                    roleBtn.classList.remove(cls.roleTotal, cls.roleUser, cls.roleAssistant);
                    this.uiCache.info.counter.classList.remove(cls.roleTotal, cls.roleUser, cls.roleAssistant);

                    roleBtn.classList.add(currentData.colorClass);
                    this.uiCache.info.counter.classList.add(currentData.colorClass);
                }

                // Update Tooltip
                const newTitle = `Current Role: ${currentData.displayName}\n\nClick: Open Jump List\nRight-Click: Switch Role`;
                if (roleBtn.title !== newTitle) {
                    roleBtn.title = newTitle;
                }
            }

            const currentText = String(currentData.index > -1 ? currentData.index + 1 : '--');
            if (this.uiCache.info.current.textContent !== currentText) {
                this.uiCache.info.current.textContent = currentText;
            }

            const totalText = String(currentData.messages.length ? currentData.messages.length : '--');
            if (this.uiCache.info.total.textContent !== totalText) {
                this.uiCache.info.total.textContent = totalText;
            }

            // Access elements from cache and Update Highlight
            document.querySelectorAll(`.${cls.highlightMessage}, .${cls.highlightTurn}`).forEach((el) => {
                el.classList.remove(cls.highlightMessage);
                el.classList.remove(cls.highlightTurn);
            });
            if (highlightedMessage) {
                highlightedMessage.classList.add(cls.highlightMessage);
                PlatformAdapters.FixedNav.applyAdditionalHighlight(highlightedMessage, this.styleHandle);
            }

            if (this.state.jumpListComponent) {
                this.state.jumpListComponent.updateHighlightedMessage(highlightedMessage);
            }

            // Update Button Visibility based on Input Mode (Using Effective Mode)
            const btns = this.uiCache.buttons;
            const isShift = effectiveMode === CONSTANTS.INPUT_MODES.SHIFT;
            const isNormal = !isShift;

            // Helper to toggle display style without triggering reflow if unchanged
            const toggleDisplay = (el, show) => {
                if (!el) return;
                const newVal = show ? '' : 'none';
                if (el.style.display !== newVal) el.style.display = newVal;
            };

            // Prev/Next are always visible
            toggleDisplay(btns.prev, true);
            toggleDisplay(btns.next, true);

            // First/Last visible in Normal mode
            toggleDisplay(btns.first, isNormal);
            toggleDisplay(btns.last, isNormal);

            // Platform Buttons (Scan) visible in Shift mode (Replaces First)
            const platformButtons = btns.platformButtons || [];
            platformButtons.forEach((btn) => {
                if (btn instanceof HTMLElement) {
                    toggleDisplay(btn, isShift);
                    // Update state if visible and manager exists
                    if (this.autoScrollManager && isShift && btn instanceof HTMLButtonElement) {
                        PlatformAdapters.FixedNav.updatePlatformSpecificButtonState(btn, this.state.isAutoScrolling, this.autoScrollManager);
                    }
                }
            });

            // Fold button visible in Shift mode (Replaces Last)
            toggleDisplay(btns.fold, isShift);

            // Update Tooltips and State
            const roleName = activeRole === CONSTANTS.NAV_ROLES.TOTAL ? 'message' : activeRole === CONSTANTS.NAV_ROLES.ASSISTANT ? 'assistant message' : 'user message';

            // Determine Shift action text dynamically
            let shiftActionText = '';
            if (PLATFORM === PLATFORM_DEFS.GEMINI.NAME) {
                shiftActionText = '\n[Shift] Load history';
            } else if (PLATFORM === PLATFORM_DEFS.CHATGPT.NAME) {
                if (isFirefox()) {
                    shiftActionText = '\n[Shift] Scan layout';
                } else {
                    shiftActionText = '';
                }
            }

            const updateTooltip = (el, text) => {
                if (el instanceof HTMLElement && el.title !== text) {
                    el.title = text;
                }
            };

            updateTooltip(btns.first, `First ${roleName}${shiftActionText}`);
            updateTooltip(btns.prev, `Previous ${roleName}`);
            updateTooltip(btns.next, `Next ${roleName}`);
            updateTooltip(btns.last, `Last ${roleName}\n[Shift] Fold`);

            // Update bulk collapse button visibility and state
            this._updateBulkCollapseButtonTooltip(btns.fold);
        }

        _updateBulkCollapseButtonTooltip(button) {
            if (!button) return;
            const currentState = DomState.get(button, CONSTANTS.DATA_KEYS.STATE);
            // Set the tooltip to describe the action that WILL be taken on click.
            const tooltipText = currentState === CONSTANTS.UI_STATES.EXPANDED ? 'Collapse all messages' : 'Expand all messages';

            // Only update DOM if changed
            if (button.title !== tooltipText) {
                button.title = tooltipText;
            }
        }

        /**
         * Navigates to a message based on role and direction.
         * @private
         * @param {string} role The role to navigate within ('user', 'asst', 'total').
         * @param {string} direction The direction to navigate ('prev', 'next', 'first', 'last').
         */
        _navigateTo(role, direction) {
            const { [CONSTANTS.NAV_ROLES.USER]: currentUserIndex, [CONSTANTS.NAV_ROLES.ASSISTANT]: currentAsstIndex, [CONSTANTS.NAV_ROLES.TOTAL]: currentTotalIndex } = this.state.currentIndices;

            const roleMap = {
                [CONSTANTS.NAV_ROLES.USER]: { messages: this.messageCacheManager.getUserMessages(), currentIndex: currentUserIndex },
                [CONSTANTS.NAV_ROLES.ASSISTANT]: { messages: this.messageCacheManager.getAssistantMessages(), currentIndex: currentAsstIndex },
                [CONSTANTS.NAV_ROLES.TOTAL]: { messages: this.messageCacheManager.getTotalMessages(), currentIndex: currentTotalIndex },
            };

            const { messages, currentIndex } = roleMap[role];
            if (!messages || messages.length === 0) return;

            let nextIndex = -1;
            switch (direction) {
                case 'first':
                    nextIndex = 0;
                    break;
                case 'last':
                    nextIndex = messages.length - 1;
                    break;
                case 'prev': {
                    const prevIndex = currentIndex > -1 ? currentIndex : 0;
                    nextIndex = Math.max(0, prevIndex - 1);
                    break;
                }
                case 'next': {
                    const nextIndexBase = currentIndex === -1 ? 0 : currentIndex + 1;
                    nextIndex = Math.min(messages.length - 1, nextIndexBase);
                    break;
                }
            }

            if (nextIndex !== -1 && messages[nextIndex]) {
                this.navigateToMessage(messages[nextIndex]);
            }
        }

        _scrollToMessage(element) {
            if (!element) return;
            const targetToScroll = element;
            scrollToElement(targetToScroll, { offset: CONSTANTS.RETRY.SCROLL_OFFSET_FOR_NAV });
        }

        _toggleAllMessages() {
            const button = this.navConsole.querySelector(`#${this.styleHandle.classes.bulkCollapseBtnId}`);
            if (!(button instanceof HTMLElement)) return;

            // Retrieve the dynamic class names
            const bubbleCls = StyleDefinitions.getBubbleUI().classes;
            if (!bubbleCls) return;

            const currentState = DomState.get(button, CONSTANTS.DATA_KEYS.STATE);
            const nextState = currentState === CONSTANTS.UI_STATES.EXPANDED ? CONSTANTS.UI_STATES.COLLAPSED : CONSTANTS.UI_STATES.EXPANDED;
            DomState.set(button, CONSTANTS.DATA_KEYS.STATE, nextState);
            this._updateBulkCollapseButtonTooltip(button);

            // Use the correct dynamic class names to find elements and toggle state
            const messages = document.querySelectorAll(`.${bubbleCls.collapsibleParent}`);
            const shouldCollapse = nextState === CONSTANTS.UI_STATES.COLLAPSED;
            const highlightedMessage = this.state.highlightedMessage;

            messages.forEach((msg) => {
                msg.classList.toggle(bubbleCls.collapsed, shouldCollapse);
            });

            if (highlightedMessage) {
                requestAnimationFrame(() => {
                    document.body.offsetHeight; // Forcing reflow

                    requestAnimationFrame(() => {
                        this._scrollToMessage(highlightedMessage);
                    });
                });
            }
        }

        /**
         * Handles clicks on the document body to delegate actions for the nav console.
         * @param {MouseEvent} e The click event object.
         * @returns {void}
         */
        handleBodyClick(e) {
            const target = e.target;
            if (!(target instanceof Element)) {
                return;
            }

            const cls = this.styleHandle.classes;

            // If the click is inside the jump list (including preview), let the component handle it.
            if (this.state.jumpListComponent?.contains(target)) {
                return;
            }

            // Close the jump list if the click is outside both the console and the list itself.
            if (this.state.jumpListComponent && !this.navConsole?.contains(target)) {
                this._hideJumpList();
            }

            const navButton = target.closest(`.${cls.btn}`);
            if (navButton instanceof HTMLElement && this.navConsole?.contains(navButton)) {
                this.handleButtonClick(navButton);
                return;
            }

            // In the new UI, counters and labels are singleton elements representing the active role.
            // We no longer filter by role attribute.
            const counter = target.closest(`.${cls.counter}`);
            if (counter instanceof HTMLElement && this.navConsole?.contains(counter)) {
                this.handleCounterClick(e, counter);
                return;
            }

            // Handle Role Button Click
            const roleBtn = target.closest(`.${cls.roleBtn}`);
            if (roleBtn instanceof HTMLElement && this.navConsole?.contains(roleBtn)) {
                this._toggleJumpList(roleBtn);
                return;
            }

            const messageElement = target.closest(CONSTANTS.SELECTORS.FIXED_NAV_MESSAGE_CONTAINERS);
            if (messageElement instanceof HTMLElement && !target.closest(`a, button, input, #${cls.consoleId}`)) {
                this.setHighlightAndIndices(messageElement);
            }
        }

        /**
         * Handles clicks on the main navigation buttons (prev, next, etc.).
         * @param {HTMLElement} buttonElement The navigation button element that was clicked.
         * @returns {void}
         */
        handleButtonClick(buttonElement) {
            const btns = this.uiCache.buttons;

            // Handle platform-specific buttons dynamically
            if (btns.platformButtons && btns.platformButtons.includes(buttonElement)) {
                return; // Let the button's own event listener handle it
            }

            switch (buttonElement) {
                case btns.fold:
                    this._toggleAllMessages();
                    break;
                case btns.prev:
                    this._navigateTo(this.state.activeRole, 'prev');
                    break;
                case btns.next:
                    this._navigateTo(this.state.activeRole, 'next');
                    break;
                case btns.first:
                    this._navigateTo(this.state.activeRole, 'first');
                    break;
                case btns.last:
                    this._navigateTo(this.state.activeRole, 'last');
                    break;
                default:
                    Logger.warn('NAV ERROR', LOG_STYLES.YELLOW, 'Unknown button clicked:', buttonElement);
                    break;
            }
        }

        /**
         * Handles clicks on the navigation counters, allowing the user to jump to a specific message number.
         * @param {MouseEvent} e The click event object.
         * @param {HTMLElement} counterSpan The counter span element that was clicked.
         * @returns {void}
         */
        handleCounterClick(e, counterSpan) {
            this._startJumpInputSession(counterSpan);
        }

        /**
         * @private
         * Starts the input session for jumping to a specific message index.
         * @param {HTMLElement} counterSpan The counter element that initiated the session.
         */
        _startJumpInputSession(counterSpan) {
            const cls = this.styleHandle.classes;
            // Use activeRole instead of DOM attribute
            const role = this.state.activeRole;
            const input = h(`input.${cls.jumpInput}`, { type: 'text' });
            if (!(input instanceof HTMLInputElement)) return;

            counterSpan.classList.add(cls.isHidden);
            counterSpan.parentNode.insertBefore(input, counterSpan.nextSibling);
            input.focus();

            let isEditing = true;

            const endEdit = (shouldJump) => {
                if (!isEditing) return;
                isEditing = false;

                if (shouldJump) {
                    const valStr = input.value.trim();
                    // Validate integer input only (reject decimals)
                    if (/^-?\d+$/.test(valStr)) {
                        const num = parseInt(valStr, 10);
                        const roleMap = {
                            [CONSTANTS.NAV_ROLES.USER]: this.messageCacheManager.getUserMessages(),
                            [CONSTANTS.NAV_ROLES.ASSISTANT]: this.messageCacheManager.getAssistantMessages(),
                            [CONSTANTS.NAV_ROLES.TOTAL]: this.messageCacheManager.getTotalMessages(),
                        };
                        const targetArray = roleMap[role];

                        if (targetArray && targetArray.length > 0) {
                            // Clamp value between 1 and total length
                            const clampedNum = Math.max(1, Math.min(num, targetArray.length));
                            const index = clampedNum - 1;
                            this.navigateToMessage(targetArray[index]);
                        }
                    }
                }

                // Check if the element is still connected to the DOM before removing.
                if (input.isConnected) {
                    input.remove();
                }

                counterSpan.classList.remove(cls.isHidden);
            };

            input.addEventListener('blur', () => endEdit(false));
            input.addEventListener('keydown', (ev) => {
                if (ev instanceof KeyboardEvent) {
                    if (ev.key === 'Enter') {
                        ev.preventDefault();
                        endEdit(true);
                    } else if (ev.key === 'Escape') {
                        endEdit(false);
                    }
                }
            });
        }

        _cancelJumpInput() {
            if (!this.navConsole) return;
            const cls = this.styleHandle.classes;

            // Instead of manually removing, trigger the standard blur event.
            // This invokes the existing endEdit logic which handles state cleanup and DOM removal safely.
            const input = this.navConsole.querySelector(`input.${cls.jumpInput}`);
            if (input instanceof HTMLElement) {
                input.blur();
            }

            // Fallback: Ensure counters are visible if the blur didn't clean them up for some reason
            // (e.g. input was already detached but counters remained hidden)
            const hiddenCounters = this.navConsole.querySelectorAll(`.${cls.counter}.${cls.isHidden}`);
            hiddenCounters.forEach((counter) => {
                counter.classList.remove(cls.isHidden);
            });
        }

        _handleKeyDown(e) {
            if (e.key === 'Escape') {
                // Handle auto-scroll cancellation first.
                if (this.autoScrollManager?.isScrolling) {
                    e.preventDefault();
                    e.stopPropagation();
                    EventBus.publish(EVENTS.AUTO_SCROLL_CANCEL_REQUEST);
                }
                // Then handle jump list closure if auto-scroll is not active.
                else if (this.state.jumpListComponent) {
                    e.preventDefault();
                    e.stopPropagation();
                    this._hideJumpList();
                }
            }
        }

        _handleDocumentKeyChange(e) {
            if (e.repeat) return;
            // Guard: Do not change input mode if the Jump List is open.
            // This prevents the list from closing unexpectedly when typing uppercase letters (Shift+Char).
            if (this.state.jumpListComponent) return;

            if (e.key !== 'Shift') return;

            // Only update input mode if the user is interacting with the console
            if (!this.state.interactionActive) return;

            let newMode = CONSTANTS.INPUT_MODES.NORMAL;
            if (e.shiftKey) {
                newMode = CONSTANTS.INPUT_MODES.SHIFT;
            }

            if (this.state.inputMode !== newMode) {
                // Close jump list immediately on mode change to prevent inconsistencies
                this._hideJumpList();
                this.state.inputMode = newMode;
                this._renderUI();
            }
        }

        _handleInteractionStateChange(e) {
            const cls = this.styleHandle.classes;

            // Check if the user is currently editing the jump input
            const isEditing = document.activeElement && document.activeElement.classList.contains(cls.jumpInput);

            // Force cancel active input ONLY if we are not currently editing it.
            // This prevents the focus event (triggered by creating the input) from immediately destroying it.
            if (!isEditing) {
                this._cancelJumpInput();
            }

            // Update input mode immediately on entry if modifier keys are pressed
            if (e.type === 'mouseenter') {
                if (e.shiftKey) this.state.inputMode = CONSTANTS.INPUT_MODES.SHIFT;
                else this.state.inputMode = CONSTANTS.INPUT_MODES.NORMAL;
            }

            // Delay check to handle focus transition gaps
            // Use requestAnimationFrame instead of setTimeout to prevent forced reflow violations during rapid events
            requestAnimationFrame(() => {
                if (!this.navConsole) return;
                const isHovered = this.navConsole.matches(':hover');
                const isFocused = this.navConsole.contains(document.activeElement);
                const isActive = isHovered || isFocused;

                let shouldRender = false;

                if (this.state.interactionActive !== isActive) {
                    this.state.interactionActive = isActive;
                    shouldRender = true;
                }

                // Reset mode to normal when interaction ends to prevent stuck states
                if (!isActive && this.state.inputMode !== CONSTANTS.INPUT_MODES.NORMAL) {
                    this.state.inputMode = CONSTANTS.INPUT_MODES.NORMAL;
                    shouldRender = true;
                }

                // If entered with modifiers, force render to show correct mode
                if (isActive && e.type === 'mouseenter') {
                    shouldRender = true;
                }

                if (shouldRender) {
                    this._renderUI();
                }
            });
        }

        _handleRoleContextMenu(e) {
            e.preventDefault();
            e.stopPropagation();

            // Close jump list immediately to prevent content mismatch
            this._hideJumpList();

            const roles = [CONSTANTS.NAV_ROLES.TOTAL, CONSTANTS.NAV_ROLES.ASSISTANT, CONSTANTS.NAV_ROLES.USER];
            const currentIndex = roles.indexOf(this.state.activeRole);
            const nextIndex = (currentIndex + 1) % roles.length;

            this.state.activeRole = roles[nextIndex];
            this._renderUI();
        }

        _handleModeContextMenu(e) {
            e.preventDefault();
            e.stopPropagation();

            const modes = [null, CONSTANTS.INPUT_MODES.SHIFT];
            const currentIndex = modes.indexOf(this.state.stickyMode);
            const nextIndex = (currentIndex + 1) % modes.length;

            this.state.stickyMode = modes[nextIndex];
            this._renderUI();
        }

        _handleWindowBlur() {
            // Reset input mode to normal when the window loses focus (e.g. Alt+Tab).
            // This prevents modifier keys from getting stuck in the active state.
            if (this.state.inputMode !== CONSTANTS.INPUT_MODES.NORMAL) {
                this.state.inputMode = CONSTANTS.INPUT_MODES.NORMAL;
                this._renderUI();
            }
        }

        async _toggleJumpList(labelElement) {
            // Use activeRole instead of DOM attribute
            const role = this.state.activeRole;
            if (this.state.jumpListComponent?.role === role) {
                this._hideJumpList();
                return;
            }

            this._hideJumpList();

            const roleMap = {
                [CONSTANTS.NAV_ROLES.USER]: this.messageCacheManager.getUserMessages(),
                [CONSTANTS.NAV_ROLES.ASSISTANT]: this.messageCacheManager.getAssistantMessages(),
                [CONSTANTS.NAV_ROLES.TOTAL]: this.messageCacheManager.getTotalMessages(),
            };
            const messages = roleMap[role];
            if (!messages || messages.length === 0) return;

            // Force refresh the last message in the cache to ensure latest text content.
            // This is critical for streaming messages where content changes but element identity remains.
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && this.searchCache.has(lastMessage)) {
                this.searchCache.delete(lastMessage);
            }

            const jumpList = new JumpListComponent(
                role,
                messages,
                this.state.highlightedMessage,
                {
                    onSelect: (message) => this._handleJumpListSelect(message),
                },
                this.jumpListStyleHandle,
                // Fallback to empty string as initialFilterValue is mandatory
                this.state.lastFilterValue || '',
                this.searchCache // Pass the shared cache
            );

            // Register as managed resource to ensure safe destruction
            this.manageResource(CONSTANTS.RESOURCE_KEYS.JUMP_LIST, jumpList);

            await jumpList.init();

            // Keep reference in state for logic
            this.state.jumpListComponent = jumpList;

            this.state.jumpListComponent.show(labelElement);
        }

        _hideJumpList() {
            if (!this.state.jumpListComponent) return;
            this.state.lastFilterValue = this.state.jumpListComponent.getFilterValue();

            // Dispose resource (calls destroy internally) and clear reference
            this.manageResource(CONSTANTS.RESOURCE_KEYS.JUMP_LIST, null);
            this.state.jumpListComponent = null;
        }

        _handleJumpListSelect(messageElement) {
            this.navigateToMessage(messageElement);
            this._hideJumpList();
        }
    }

    // =================================================================================
    // SECTION: Message Lifecycle Orchestrator
    // Description: Listens for raw message additions from Sentinel and orchestrates
    //              the appropriate high-level events (avatar injection, UI setup).
    // =================================================================================

    class MessageLifecycleManager extends BaseManager {
        /**
         * @param {MessageCacheManager} messageCacheManager
         */
        constructor(messageCacheManager) {
            super();
            this.messageCacheManager = messageCacheManager;
            this.scanAttempts = 0;
            this.boundStopPollingScan = this.stopPollingScan.bind(this);
            // Define options once to ensure consistency between add/remove listeners
            // Cast to any to suppress TS error on removeEventListener (which accepts EventListenerOptions but ignores extra props like passive/once)
            /** @type {any} */
            this.scanOptions = { once: true, passive: true };
        }

        _onInit() {
            this._subscribe(EVENTS.RAW_MESSAGE_ADDED, (elem) => this.processRawMessage(elem));
            this._subscribe(EVENTS.NAVIGATION_END, () => {
                PlatformAdapters.General.onNavigationEnd?.(this);
            });

            this.addDisposable(() => this.stopPollingScan());
        }

        _onDestroy() {
            // Cleanup handled by disposables.
        }

        /**
         * @description Starts a polling mechanism to repeatedly scan for unprocessed messages.
         * The polling stops automatically after a set number of attempts, on user interaction, or once a new message is found.
         */
        startPollingScan() {
            this.stopPollingScan(); // Ensure any previous polling is stopped
            this.scanAttempts = 0;
            const MAX_ATTEMPTS = CONSTANTS.RETRY.POLLING_SCAN_LIMIT;
            const INTERVAL_MS = CONSTANTS.TIMING.POLLING.MESSAGE_DISCOVERY_MS;

            Logger.log('', '', 'Starting polling scan for unprocessed messages.');

            const id = setInterval(() => {
                this.scanAttempts++;
                Logger.log('', '', `Executing polling scan (Attempt ${this.scanAttempts}/${MAX_ATTEMPTS})...`);
                const newItemsFound = this.scanForUnprocessedMessages();

                if (newItemsFound > 0) {
                    Logger.log('', '', `Polling scan found ${newItemsFound} new message(s). Stopping early.`);
                    EventBus.publish(EVENTS.POLLING_MESSAGES_FOUND);
                    this.stopPollingScan();
                    return;
                }

                if (this.scanAttempts >= MAX_ATTEMPTS) {
                    Logger.log('', '', `Polling scan finished after ${this.scanAttempts} attempts without finding new messages.`);
                    this.stopPollingScan();
                }
            }, INTERVAL_MS);

            // Register the interval cleanup
            this.manageResource(CONSTANTS.RESOURCE_KEYS.POLLING_SCAN, () => clearInterval(id));

            // Stop polling immediately on user interaction
            window.addEventListener('wheel', this.boundStopPollingScan, this.scanOptions);
            window.addEventListener('keydown', this.boundStopPollingScan, this.scanOptions);
        }

        /**
         * @description Stops the polling scan and cleans up associated listeners.
         */
        stopPollingScan() {
            // Dispose of the polling resource (clears interval)
            this.manageResource(CONSTANTS.RESOURCE_KEYS.POLLING_SCAN, null);

            Logger.debug('', '', 'Polling scan stopped.');

            // Clean up interaction listeners regardless
            window.removeEventListener('wheel', this.boundStopPollingScan, this.scanOptions);
            window.removeEventListener('keydown', this.boundStopPollingScan, this.scanOptions);
        }

        /**
         * @description Performs a one-time scan for any unprocessed messages after initial page load,
         * complementing the real-time detection by Sentinel.
         * @returns {number} The number of new items found and processed.
         */
        scanForUnprocessedMessages() {
            return PlatformAdapters.General.performInitialScan?.(this) || 0;
        }

        processRawMessage(contentElement) {
            // Check for class-based flag
            if (contentElement.classList.contains(CONSTANTS.CLASSES.PROCESSED)) {
                return;
            }
            contentElement.classList.add(CONSTANTS.CLASSES.PROCESSED);

            let messageElement = PlatformAdapters.General.findMessageElement(contentElement);

            // Platform-specific hook to handle elements that need a container
            if (!messageElement && PlatformAdapters.General.ensureMessageContainerForImage) {
                // Let the adapter create a wrapper if needed and return it.
                // We only do this for the image selector, not for markdown.
                if (contentElement.matches(CONSTANTS.SELECTORS.RAW_ASSISTANT_IMAGE_BUBBLE)) {
                    messageElement = PlatformAdapters.General.ensureMessageContainerForImage(contentElement);
                }
            }

            // If we have a valid message container, proceed.
            if (messageElement) {
                // Publish the timestamp for this message as soon as it's identified.
                // This is for real-time messages; historical ones are loaded via API.
                // Find the correct messageId from the parent element
                const messageIdHolder = messageElement.closest(CONSTANTS.SELECTORS.MESSAGE_ID_HOLDER);
                const messageId = PlatformAdapters.General.getMessageId(messageIdHolder);

                // Always publish TIMESTAMP_ADDED when a message is detected.
                // The TimestampManager will handle buffering (during navigation) or immediate application.
                if (messageId) {
                    EventBus.publish(EVENTS.TIMESTAMP_ADDED, { messageId: messageId, timestamp: new Date() });
                }

                // Fire avatar injection event. The AvatarManager will handle the one-per-turn logic.
                EventBus.publish(EVENTS.AVATAR_INJECT, messageElement);

                // Fire message complete event for other managers.
                // Use a different flag to ensure this only fires once per message container,
                // even if it has multiple content parts detected (e.g. text and images).
                if (!messageElement.classList.contains(CONSTANTS.CLASSES.COMPLETE_FIRED)) {
                    messageElement.classList.add(CONSTANTS.CLASSES.COMPLETE_FIRED);
                    EventBus.publish(EVENTS.MESSAGE_COMPLETE, messageElement);
                }
            }
        }
    }

    // =================================================================================
    // SECTION: Timestamp Management
    // Description: Manages message timestamps, handling both API-fetched historical
    //              data and real-time message additions.
    // =================================================================================

    class TimestampManager extends BaseManager {
        /**
         * @param {ConfigManager} configManager
         * @param {MessageCacheManager} messageCacheManager
         */
        constructor(configManager, messageCacheManager) {
            super();
            this.configManager = configManager;
            this.messageCacheManager = messageCacheManager;
            /** @type {Map<string, Date>} */
            this.pendingTimestamps = new Map(); // Buffer for timestamps during navigation
            /** @type {Map<HTMLElement, HTMLElement>} */
            this.timestampDomCache = new Map();
            this.styleHandle = null;
            this.timestampContainerTemplate = null;
            this.timestampSpanTemplate = null;
            this.currentChatId = null;
            this.isEnabled = false; // Add state tracking
            this.isNavigating = true; // Track navigation state (Initialize as true to buffer initial page load)
            /** @type {(() => void) | null} */
            this._cacheUpdateUnsub = null;
        }

        /**
         * Initializes the manager by injecting styles and subscribing to events.
         */
        _onInit() {
            this.injectStyle();

            // Register automatic cleanup of UI and listeners when destroyed
            this.addDisposable(() => this.disable());

            // Subscribe to navigation events to clear the cache and load new data
            // This must always run, even when disabled, to clear the cache on page change.
            this._subscribe(EVENTS.NAVIGATION, () => {
                this._handleNavigation();
                // Cancel pending batch tasks on navigation
                this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, null);
            });
            this._subscribe(EVENTS.NAVIGATION_START, () => this._handleNavigationStart());
            this._subscribe(EVENTS.NAVIGATION_END, () => this._handleNavigationEnd());

            // Subscribe to data events regardless of the feature toggle state.
            this._subscribe(EVENTS.TIMESTAMP_ADDED, (data) => this._handleTimestampAdded(data));
            this._subscribe(EVENTS.TIMESTAMPS_LOADED, (data) => this._loadHistoricalTimestamps(data));
        }

        /**
         * Unsubscribes from events and clears DOM elements.
         * Called when the feature is disabled.
         */
        _onDestroy() {
            // disable() is called via disposable.
            this.pendingTimestamps.clear();
        }

        /**
         * @private
         */
        _handleNavigationStart() {
            this.isNavigating = true;
            this.pendingTimestamps.clear();

            // Cancel pending batch tasks and remove DOM elements immediately
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, null);
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK_SINGLE, null);
            this.manageResource(CONSTANTS.RESOURCE_KEYS.REMOVAL_TASK, null);
            this._clearAllTimestampsDOM();
        }

        /**
         * @private
         */
        _handleNavigationEnd() {
            this.isNavigating = false;

            // Fallback strategy:
            // Apply pending timestamps only if API didn't provide data for them.
            // This handles "New Chat" scenarios or API failures/delays.
            if (this.pendingTimestamps.size > 0) {
                Logger.debug('TIMESTAMPS', LOG_STYLES.TEAL, `Processing ${this.pendingTimestamps.size} pending timestamps.`);

                let addedCount = 0;
                this.pendingTimestamps.forEach((timestamp, messageId) => {
                    // Only apply if NOT already present (i.e., not loaded from API)
                    if (!PlatformAdapters.Timestamp.getTimestamp(messageId)) {
                        PlatformAdapters.Timestamp.addTimestamp(messageId, timestamp);
                        addedCount++;
                    }
                });

                this.pendingTimestamps.clear();

                if (addedCount > 0 && this.isEnabled) {
                    Logger.debug('TIMESTAMPS', LOG_STYLES.TEAL, `Applied ${addedCount} fallback timestamps.`);
                    this.updateAllTimestamps();
                }
            }
        }

        /**
         * Subscribes to events and performs an initial load and render.
         * Called when the feature is enabled.
         */
        enable() {
            Logger.debug('TIMESTAMPS', LOG_STYLES.TEAL, 'Enabling...');
            this.isEnabled = true;

            // Subscribe to cache updates (e.g., deletions) using the new return-based pattern
            if (!this._cacheUpdateUnsub) {
                this._cacheUpdateUnsub = this._subscribe(EVENTS.CACHE_UPDATED, () => this.updateAllTimestamps());
            }

            // Initial render
            // This will render any data that was collected while the setting was OFF.
            this.updateAllTimestamps();
        }

        /**
         * Unsubscribes from events and clears DOM elements.
         * Called when the feature is disabled.
         */
        disable() {
            Logger.debug('TIMESTAMPS', LOG_STYLES.TEAL, 'Disabling...');
            this.isEnabled = false;
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, null);
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK_SINGLE, null);

            // Unsubscribe from events that trigger DOM updates
            if (this._cacheUpdateUnsub) {
                this._cacheUpdateUnsub();
                this._cacheUpdateUnsub = null;
            }

            // Clear all visible timestamps from the DOM
            this._clearAllTimestampsDOM();
        }

        /**
         * @private
         * Clears caches on navigation and prepares for new data.
         */
        _handleNavigation() {
            // Reset chat ID as we are on a new page
            this.currentChatId = null;
        }

        /**
         * @private
         * @param {object} detail - The event detail object.
         * @param {string} detail.chatId - The ID of the chat.
         * @param {Map<string, Date>} detail.timestamps - The map of historical timestamps.
         */
        _loadHistoricalTimestamps({ chatId, timestamps }) {
            if (chatId !== this.currentChatId) {
                this.currentChatId = chatId;
            }

            // Data is already stored in Adapter by the time this event fires.
            if (timestamps && timestamps.size > 0) {
                Logger.debug('TIMESTAMPS', LOG_STYLES.TEAL, `Notified of ${timestamps.size} historical timestamps.`);
            }

            // If enabled, trigger a DOM update now that historical data is loaded
            if (this.isEnabled) {
                this.updateAllTimestamps();
            }
        }

        /**
         * @private
         * @param {object} detail - The event detail object.
         * @param {string} detail.messageId - The ID of the message.
         * @param {Date} detail.timestamp - The timestamp (Date object) of when the message was processed.
         */
        _handleTimestampAdded({ messageId, timestamp }) {
            if (!messageId || !timestamp) return;

            // If navigating and NOT a new chat page, buffer the timestamp.
            // "New Chat" pages don't trigger history load, so we can apply immediately.
            const isNewChat = PlatformAdapters.General.isNewChatPage();

            if (this.isNavigating && !isNewChat) {
                this.pendingTimestamps.set(messageId, timestamp);
                return;
            }

            // Normal processing (Real-time or New Chat)
            if (!PlatformAdapters.Timestamp.getTimestamp(messageId)) {
                Logger.debug('TIMESTAMPS', LOG_STYLES.TEAL, `Added real-time timestamp for ${messageId}.`);

                PlatformAdapters.Timestamp.addTimestamp(messageId, timestamp);

                // If enabled, trigger a DOM update for the new real-time timestamp
                if (this.isEnabled) {
                    this._updateSingleTimestamp(messageId);
                }
            }
        }

        /**
         * @private
         * Updates a single timestamp item. Uses BATCH_TASK_SINGLE to avoid conflicts with full updates.
         */
        _updateSingleTimestamp(messageId) {
            const selector = `[${CONSTANTS.ATTRIBUTES.MESSAGE_ID}="${messageId}"]`;
            const anchor = document.querySelector(selector);
            if (!anchor) return;

            const messageElement = PlatformAdapters.General.findMessageElement(anchor);
            if (!messageElement) return;

            // Cancel any pending single update to prioritize the latest one if spamming occurs
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK_SINGLE, null);

            const item = {
                messageElement,
                existingContainer: this.timestampDomCache.get(messageElement),
                anchor,
                roleClass: null,
                timestampText: this._formatTimestamp(PlatformAdapters.Timestamp.getTimestamp(messageId)),
            };

            const cls = this.styleHandle.classes;

            const cancel = runBatchUpdate(
                [item],
                1,
                (m) => {
                    // Measure
                    if (!m.messageElement.isConnected) return null;

                    // If not in cache, check DOM to prevent duplicates from race conditions
                    if (!m.existingContainer) {
                        m.existingContainer = m.anchor.querySelector(`.${cls.container}`);
                        if (m.existingContainer) {
                            this.timestampDomCache.set(m.messageElement, m.existingContainer);
                        }
                    }

                    if (!m.existingContainer) {
                        const role = PlatformAdapters.General.getMessageRole(m.messageElement);
                        if (role) {
                            m.roleClass = role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_USER ? cls.user : cls.assistant;
                        }
                    }
                    return m;
                },
                (m) => {
                    // Mutate
                    let container = m.existingContainer;
                    if (!container && m.anchor && m.anchor.isConnected && m.roleClass) {
                        const node = this.timestampContainerTemplate.cloneNode(true);
                        const span = this.timestampSpanTemplate.cloneNode(true);
                        if (node instanceof HTMLElement && span instanceof Element) {
                            container = node;
                            container.classList.add(m.roleClass);
                            container.appendChild(span);
                            m.anchor.prepend(container);
                            this.timestampDomCache.set(m.messageElement, container);
                        }
                    }
                    if (container && container.isConnected) {
                        const span = container.lastElementChild;
                        if (span) span.textContent = m.timestampText;
                        container.classList.toggle(cls.hidden, !m.timestampText);
                    }
                },
                () => this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK_SINGLE, null)
            );
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK_SINGLE, cancel);
        }

        /**
         * @param {string} messageId The ID of the message.
         * @returns {Date | undefined} The Date object for the message, or undefined if not found.
         */
        getTimestamp(messageId) {
            return PlatformAdapters.Timestamp.getTimestamp(messageId);
        }

        /**
         * Injects the necessary CSS for positioning and styling the timestamps.
         */
        injectStyle() {
            if (this.styleHandle) return;
            this.styleHandle = StyleManager.request(StyleDefinitions.getTimestamp);

            const cls = this.styleHandle.classes;
            this.timestampContainerTemplate = h(`div.${cls.container}`);
            this.timestampSpanTemplate = h(`span.${cls.text}`);
        }

        /**
         * Removes all timestamp DOM elements from the page.
         * @private
         */
        _clearAllTimestampsDOM() {
            this.timestampDomCache.forEach((container) => {
                container.remove();
            });
            this.timestampDomCache.clear();
        }

        _syncCache() {
            // Identifies timestamp elements for removal whose corresponding message is no longer in the cache.
            // This prevents DOM leaks when messages are deleted.
            const currentMessages = new Set(this.messageCacheManager.getTotalMessages());
            const removalCandidates = [];
            for (const [messageElement, domElement] of this.timestampDomCache.entries()) {
                if (!currentMessages.has(messageElement)) {
                    removalCandidates.push({ messageElement, domElement });
                }
            }
            return removalCandidates;
        }

        /**
         * Updates the text content of all visible timestamps.
         * Creates the timestamp element if it doesn't exist.
         * Separates READ and WRITE operations to prevent layout thrashing.
         */
        updateAllTimestamps() {
            // Cancel any existing batch task immediately
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, null);
            this.manageResource(CONSTANTS.RESOURCE_KEYS.REMOVAL_TASK, null);

            // 1. Async Cache Sync & Removal
            const removalCandidates = this._syncCache();
            if (removalCandidates.length > 0) {
                const cancelRemoval = runBatchUpdate(
                    removalCandidates,
                    CONSTANTS.PROCESSING.BATCH_SIZE,
                    (item) => item,
                    ({ messageElement, domElement }) => {
                        if (domElement.isConnected) domElement.remove(); // Remove the timestamp from the DOM
                        this.timestampDomCache.delete(messageElement); // Remove from the cache
                    },
                    () => this.manageResource(CONSTANTS.RESOURCE_KEYS.REMOVAL_TASK, null)
                );
                this.manageResource(CONSTANTS.RESOURCE_KEYS.REMOVAL_TASK, cancelRemoval);
            }

            const config = this.configManager.get();
            if (!config) return;

            const allMessages = this.messageCacheManager.getTotalMessages();
            const isTimestampEnabled = config.platforms[PLATFORM].features.timestamp.enabled;

            // 2. If the feature is disabled, ensure all DOM elements are removed and stop.
            if (!isTimestampEnabled) {
                this._clearAllTimestampsDOM();
                return;
            }

            // 3. Run a batch operation with Measure/Mutate separation to create/update all
            const cls = this.styleHandle.classes;

            const cancelFn = runBatchUpdate(
                allMessages,
                CONSTANTS.PROCESSING.BATCH_SIZE,
                // Measure
                (messageElement) => {
                    if (!messageElement.isConnected) return null;

                    let existingContainer = this.timestampDomCache.get(messageElement);
                    let anchor = null;
                    let roleClass = null;
                    let timestampText = '';

                    // Calculate Anchor & Role only if needed (not cached yet)
                    if (!existingContainer) {
                        const messageIdHolder = messageElement.closest(CONSTANTS.SELECTORS.MESSAGE_ID_HOLDER);
                        if (messageIdHolder) {
                            anchor = messageIdHolder;

                            // Check DOM for existing container (Idempotency)
                            existingContainer = anchor.querySelector(`.${cls.container}`);
                            if (existingContainer) {
                                this.timestampDomCache.set(messageElement, existingContainer);
                            } else {
                                const role = PlatformAdapters.General.getMessageRole(messageElement);
                                if (role) {
                                    roleClass = role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_USER ? cls.user : cls.assistant;
                                }
                            }
                        }
                    } else {
                        // If we have cached container, ensure we can find the ID holder for text update
                        anchor = existingContainer.parentElement;
                    }

                    // Calculate Text (always needed to update content/visibility)
                    if (isTimestampEnabled) {
                        // Use the anchor found above, or find it now if we have a container but need ID
                        const holder = anchor || messageElement.closest(CONSTANTS.SELECTORS.MESSAGE_ID_HOLDER);
                        if (holder) {
                            const messageId = PlatformAdapters.General.getMessageId(holder);
                            const timestamp = messageId ? this.getTimestamp(messageId) : undefined;
                            timestampText = this._formatTimestamp(timestamp);
                        }
                    }

                    return {
                        messageElement,
                        existingContainer,
                        anchor,
                        roleClass,
                        timestampText,
                    };
                },
                // Mutate
                (m) => {
                    let container = m.existingContainer;

                    // Create if missing and valid
                    if (!container && m.anchor && m.anchor.isConnected && m.roleClass) {
                        const node = this.timestampContainerTemplate.cloneNode(true);
                        const span = this.timestampSpanTemplate.cloneNode(true);

                        if (node instanceof HTMLElement && span instanceof Element) {
                            container = node;
                            container.classList.add(m.roleClass);
                            container.appendChild(span);
                            m.anchor.prepend(container);
                            this.timestampDomCache.set(m.messageElement, container);
                        }
                    }

                    // Update
                    if (container && container.isConnected) {
                        const span = container.lastElementChild; // Assuming span is appended last
                        if (span) {
                            span.textContent = m.timestampText;
                        }
                        container.classList.toggle(cls.hidden, !isTimestampEnabled || !m.timestampText);
                    }
                },
                // On Finish
                () => {
                    this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, null);
                }
            );

            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, cancelFn);
        }

        /**
         * Formats a Date object into a fixed string format.
         * @param {Date} date The Date object to format.
         * @returns {string} The formatted timestamp string.
         * @private
         */
        _formatTimestamp(date) {
            if (!(date instanceof Date) || isNaN(date.getTime())) {
                return ''; // Return empty string if date is invalid
            }
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const ii = String(date.getMinutes()).padStart(2, '0');
            const ss = String(date.getSeconds()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${hh}:${ii}:${ss}`;
        }
    }

    class MessageNumberManager extends BaseManager {
        /**
         * @param {ConfigManager} configManager
         * @param {MessageCacheManager} messageCacheManager
         */
        constructor(configManager, messageCacheManager) {
            super();
            this.configManager = configManager;
            this.messageCacheManager = messageCacheManager;
            this.numberSpanCache = new Map();
            this.styleHandle = null;
            this.numberSpanTemplate = null;
        }

        /**
         * Initializes the manager.
         */
        _onInit() {
            this.injectStyle();
            // Use :cacheUpdated for batch updates (re-numbering, visibility toggles after config changes).
            this._subscribe(EVENTS.CACHE_UPDATED, () => this.updateAllMessageNumbers());

            // Clean up immediately on navigation start
            this._subscribe(EVENTS.NAVIGATION_START, () => this._handleNavigationStart());

            // Clear cache on navigation to prevent errors.
            this._subscribe(EVENTS.NAVIGATION, () => {
                this.numberSpanCache.clear();
            });
        }

        /**
         * Removes all message number elements from the DOM and clears the cache.
         */
        _onDestroy() {
            this.numberSpanCache.forEach((span) => {
                span.remove();
            });
            this.numberSpanCache.clear();
        }

        _syncCache() {
            const currentMessages = new Set(this.messageCacheManager.getTotalMessages());
            const removalCandidates = [];
            for (const [messageElement, span] of this.numberSpanCache.entries()) {
                if (!currentMessages.has(messageElement)) {
                    removalCandidates.push({ messageElement, span });
                }
            }
            return removalCandidates;
        }

        /**
         * Cleans up resources and DOM elements when navigation starts.
         * @private
         */
        _handleNavigationStart() {
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, null);
            this.manageResource(CONSTANTS.RESOURCE_KEYS.REMOVAL_TASK, null);

            // Remove all message number spans from the DOM
            this.numberSpanCache.forEach((span) => span.remove());
            this.numberSpanCache.clear();
        }

        /**
         * Injects the necessary CSS for positioning and styling the message numbers.
         */
        injectStyle() {
            if (this.styleHandle) return;
            this.styleHandle = StyleManager.request(StyleDefinitions.getMessageNumber);

            const cls = this.styleHandle.classes;
            this.numberSpanTemplate = h(`span.${cls.number}`);
        }

        /**
         * Updates the text content of all visible message numbers.
         * Creates the number element if it doesn't exist.
         * Separates READ and WRITE operations to prevent layout thrashing.
         */
        updateAllMessageNumbers() {
            // Cancel any existing batch task immediately
            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, null);
            this.manageResource(CONSTANTS.RESOURCE_KEYS.REMOVAL_TASK, null);

            // 1. Async Cache Sync & Removal
            const removalCandidates = this._syncCache();
            if (removalCandidates.length > 0) {
                const cancelRemoval = runBatchUpdate(
                    removalCandidates,
                    CONSTANTS.PROCESSING.BATCH_SIZE,
                    (item) => item,
                    ({ messageElement, span }) => {
                        if (span.isConnected) span.remove();
                        this.numberSpanCache.delete(messageElement);
                    },
                    () => this.manageResource(CONSTANTS.RESOURCE_KEYS.REMOVAL_TASK, null)
                );
                this.manageResource(CONSTANTS.RESOURCE_KEYS.REMOVAL_TASK, cancelRemoval);
            }

            const config = this.configManager.get();
            if (!config) return;

            const allMessages = this.messageCacheManager.getTotalMessages();
            const isNavConsoleEnabled = config.platforms[PLATFORM].features.fixed_nav_console.enabled;
            const cls = this.styleHandle.classes;

            const cancelFn = runBatchUpdate(
                allMessages,
                CONSTANTS.PROCESSING.BATCH_SIZE,
                // Measure
                (message, i) => {
                    // Skip if message is no longer in DOM
                    if (!message.isConnected) return null;

                    const existingSpan = this.numberSpanCache.get(message);
                    let anchor = null;
                    let role = null;

                    // Only query DOM if span doesn't exist yet
                    if (!existingSpan) {
                        anchor = PlatformAdapters.BubbleUI.getNavPositioningParent(message);
                        if (anchor) {
                            role = PlatformAdapters.General.getMessageRole(message);
                        }
                    }

                    return {
                        message,
                        displayIndex: i + 1,
                        existingSpan,
                        anchor,
                        role,
                    };
                },
                // Mutate
                (m) => {
                    let span = m.existingSpan;

                    // Create new span if needed
                    if (!span && m.anchor && m.anchor.isConnected && m.role) {
                        m.anchor.classList.add(cls.parent);
                        const roleClass = m.role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_USER ? cls.user : cls.assistant;

                        const node = this.numberSpanTemplate.cloneNode(true);
                        if (node instanceof HTMLElement) {
                            span = node;
                            span.classList.add(roleClass);
                            m.anchor.appendChild(span);
                            this.numberSpanCache.set(m.message, span);
                        }
                    }

                    // Update content and visibility
                    if (span && span.isConnected) {
                        span.textContent = `#${m.displayIndex}`;
                        span.classList.toggle(cls.hidden, !isNavConsoleEnabled);
                    }
                },
                // On Finish
                () => {
                    this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, null);
                }
            );

            this.manageResource(CONSTANTS.RESOURCE_KEYS.BATCH_TASK, cancelFn);
        }
    }

    // =================================================================================
    // SECTION: UI Elements - Components and Manager
    // Description: Provides reusable UI components, a reactive form engine, and manages high-level UI orchestration.
    // =================================================================================

    /**
     * @abstract
     * @class UIComponentBase
     * @extends BaseManager
     * @description Base class for a UI component with lifecycle management.
     */
    class UIComponentBase extends BaseManager {
        constructor(callbacks = {}) {
            super();
            this.callbacks = callbacks;
            this.element = null;
            this.storeSubscriptions = [];
        }

        /**
         * @abstract
         * Renders the component's DOM structure. Must be implemented by subclasses.
         * @returns {HTMLElement|void}
         */
        render() {
            throw new Error('Component must implement render method.');
        }

        /**
         * Adds a store subscription handle (unsubscribe function) to be managed by the component.
         * @param {() => void} unsub - The unsubscribe function returned by store.subscribe.
         */
        addStoreSubscription(unsub) {
            if (typeof unsub === 'function') {
                this.storeSubscriptions.push(unsub);
            }
        }

        /**
         * Executes all registered store subscription handles and clears the list.
         * Can be called manually (e.g. on modal close) or automatically on destroy.
         */
        clearStoreSubscriptions() {
            this.storeSubscriptions.forEach((unsub) => unsub());
            this.storeSubscriptions = [];
        }

        /**
         * Lifecycle hook for cleanup.
         * Removes the component's element from the DOM.
         * @protected
         * @override
         */
        _onDestroy() {
            this.clearStoreSubscriptions();
            this.element?.remove();
            this.element = null;
        }
    }

    /**
     * @class ReactiveStore
     * @description A simple reactive store implementing the Pub/Sub pattern.
     * It allows setting and getting values using dot-notation paths and notifies listeners on changes.
     *
     * [NOTIFICATION BEHAVIOR]
     * - Notifications are triggered strictly for the exact path being modified.
     * - Changes do NOT bubble up to parent paths.
     * - Subscribers are responsible for determining if a change affects them (e.g., using startsWith checks).
     */
    class ReactiveStore {
        constructor(initialState) {
            this.state = deepClone(initialState);
            this.listeners = new Set();
        }

        /**
         * Retrieves a value from the store by path.
         * @param {string} path - The dot-notation path to the property.
         * @returns {any} The value at the specified path.
         */
        get(path) {
            return getPropertyByPath(this.state, path);
        }

        /**
         * Sets a value in the store at the specified path.
         * Notifies listeners if the value has effectively changed.
         * @param {string} path - The dot-notation path to the property.
         * @param {any} value - The new value to set.
         */
        set(path, value) {
            // Validate path to prevent errors in split logic or setPropertyByPath
            if (!path || typeof path !== 'string') {
                Logger.warn('Store', '', `ReactiveStore.set: Invalid path "${path}"`);
                return;
            }

            const currentValue = this.get(path);
            // Use Object.is for strict equality check (handles NaN, -0/+0 correctly)
            if (Object.is(currentValue, value)) return;

            // Only notify if the update was successful
            if (setPropertyByPath(this.state, path, value)) {
                // Notify only the specific path that changed.
                this.notify(path);
            }
        }

        /**
         * Returns a deep copy of the current full state object.
         * @returns {object}
         */
        getData() {
            return deepClone(this.state);
        }

        /**
         * Replaces the entire state with a new object and notifies listeners.
         * Triggers notifications for all top-level keys in both old and new states.
         * @param {object} newState - The new full state object. Must be a valid object (null is ignored).
         */
        replaceState(newState) {
            if (!newState || typeof newState !== 'object') {
                Logger.warn('Store', '', 'ReactiveStore.replaceState: Invalid state object.');
                return;
            }

            const oldState = this.state;
            this.state = deepClone(newState);

            // Notify for the union of keys in old and new states to ensure deleted keys are handled
            const keys = new Set([...Object.keys(oldState || {}), ...Object.keys(this.state || {})]);

            keys.forEach((key) => {
                this.notify(key);
            });
        }

        /**
         * Subscribes to store updates.
         * WARNING: The state object passed to the callback is a direct reference to the store's internal state.
         * Do not mutate the state object directly within the callback. Use store.set() for updates.
         * @param {function(object, string): void} callback - The function to call on update. Receives (state, changedPath).
         * @returns {function(): void} A function to unsubscribe.
         */
        subscribe(callback) {
            if (typeof callback !== 'function') {
                Logger.warn('Store', '', 'ReactiveStore.subscribe: Callback must be a function.');
                return () => {};
            }
            this.listeners.add(callback);
            return () => this.listeners.delete(callback);
        }

        /**
         * @private
         * Notifies all subscribers of a change.
         * @param {string} changedPath - The path that was updated.
         */
        notify(changedPath) {
            for (const listener of this.listeners) {
                try {
                    listener(this.state, changedPath);
                } catch (e) {
                    Logger.error('Store', '', 'ReactiveStore listener failed:', e);
                }
            }
        }
    }

    /**
     * @class UIBuilder
     * @description A lightweight, procedural UI builder that handles DOM generation,
     * two-way data binding with ReactiveStore, and lifecycle management.
     */
    class UIBuilder {
        /**
         * @param {ReactiveStore} store - The data store.
         * @param {object} context - Context containing styles, siteStyles, fileHandler, etc.
         * @param {(fn: () => void) => void} disposer - Function to register cleanup callbacks.
         */
        constructor(store, context, disposer) {
            this.store = store;
            this.context = context;
            this.styles = context.styles || {};
            this.disposer = disposer;
        }

        /**
         * Creates a DOM element wrapper using the global h() function.
         * @param {string} tag
         * @param {object} [props]
         * @param {Array<Node|string>} [children]
         * @returns {HTMLElement | SVGElement}
         */
        create(tag, props = {}, children = []) {
            return h(tag, props, children);
        }

        /**
         * Observes store paths and triggers callback on change.
         * Automatically registers cleanup.
         * @param {string|string[]} paths - Config key(s) to observe.
         * @param {function(any): void} callback - Called with full store state on change.
         */
        observe(paths, callback) {
            const pathList = Array.isArray(paths) ? paths : [paths];
            // Initial call
            callback(this.store.getData());

            const unsub = this.store.subscribe((state, changedPath) => {
                // Check if changedPath matches or is parent/child of any observed path
                const isMatch = pathList.some((p) => p === changedPath || changedPath.startsWith(p + '.') || p.startsWith(changedPath + '.'));
                if (isMatch) {
                    callback(state);
                }
            });
            this.disposer(unsub);
        }

        /**
         * @private
         * Sets up dynamic visibility and disabled state.
         * @param {HTMLElement} element
         * @param {object} options
         */
        _setupDynamicState(element, options) {
            if (options.visibleIf || options.disabledIf) {
                const deps = options.dependencies || [];
                // If specific dependencies aren't listed but we have a key, watch the key too (unlikely for visibility but safe)
                if (options.key && !deps.includes(options.key)) deps.push(options.key);

                if (deps.length > 0) {
                    this.observe(deps, (state) => {
                        if (options.visibleIf) {
                            element.style.display = options.visibleIf(state) ? '' : 'none';
                        }
                        if (options.disabledIf) {
                            const isDisabled = options.disabledIf(state);
                            const targets = element.matches('input, select, textarea, button') ? [element] : element.querySelectorAll('input, select, textarea, button');
                            targets.forEach((t) => {
                                if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement || t instanceof HTMLButtonElement) {
                                    t.disabled = isDisabled;
                                }
                            });
                            element.classList.toggle('is-disabled', isDisabled);
                            element.style.opacity = isDisabled ? '0.5' : '';
                            element.style.pointerEvents = isDisabled ? 'none' : '';
                        }
                    });
                }
            }
        }

        /**
         * @private
         * Binds an input element to the store key.
         * @param {HTMLElement} element - The container element.
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} input - The input element.
         * @param {string} key - Store key.
         * @param {object} options - Transform options.
         */
        _bindInput(element, input, key, options) {
            // 1. Store -> UI Update
            this.observe(key, (state) => {
                // Clear error on external update
                this._updateErrorState(element, key, state);

                const rawValue = getPropertyByPath(state, key);
                // Allow manual override for complex components (like ColorPicker)
                if (options.onStoreUpdate) {
                    options.onStoreUpdate(input, rawValue);
                    return;
                }

                const uiValue = options.toInputValue ? options.toInputValue(rawValue) : rawValue;

                if (input instanceof HTMLInputElement && input.type === 'checkbox') {
                    input.checked = !!uiValue;
                } else if (input.value !== String(uiValue ?? '')) {
                    // Avoid resetting cursor position if value is effectively same
                    input.value = String(uiValue ?? '');
                }

                // Hook for label update (sliders)
                // Pass rawValue to allow formatting based on the actual store value (e.g. null -> "Auto")
                if (options.onUIUpdate) options.onUIUpdate(rawValue, uiValue);
            });

            // 2. UI -> Store Update
            let eventType = 'input';
            if (input instanceof HTMLInputElement && input.type === 'checkbox') {
                eventType = 'change';
            } else if (input instanceof HTMLSelectElement) {
                eventType = 'change';
            }

            const handler = (e) => {
                let value;
                if (input instanceof HTMLInputElement && input.type === 'checkbox') {
                    value = input.checked;
                } else {
                    value = input.value;
                }

                if (input instanceof HTMLInputElement && (input.type === 'number' || input.type === 'range')) {
                    value = value === '' ? null : parseFloat(String(value));
                } else if (typeof value === 'string' && value === '') {
                    value = null; // Normalize empty string to null
                }

                if (options.transformValue) {
                    value = options.transformValue(value);
                }

                this.store.set(key, value);

                // Optimistic error clearing
                this._clearError(key);
            };

            input.addEventListener(eventType, handler);
            this.disposer(() => input.removeEventListener(eventType, handler));
        }

        /**
         * @private
         * Manages error display based on store state.
         */
        _updateErrorState(element, key, state) {
            const errorPath = `${CONSTANTS.STORE_KEYS.ERRORS_PATH}.${key}`;
            const error = getPropertyByPath(state, errorPath); // Expecting { message: string } or null

            const errorMsg = element.querySelector(`.${this.styles.formErrorMsg}`);
            const input = element.querySelector('input, select, textarea');

            if (errorMsg && error) {
                errorMsg.textContent = error.message || error;
                if (input) input.classList.add(this.styles.invalidInput);
            } else if (errorMsg) {
                errorMsg.textContent = '';
                if (input) input.classList.remove(this.styles.invalidInput);
            }
        }

        _clearError(key) {
            // Helper to clear error in store
            this.store.set(`${CONSTANTS.STORE_KEYS.ERRORS_PATH}.${key}`, null);
        }

        // --- Components ---

        text(key, label, options = {}) {
            const cls = this.styles;
            const input = this.create('input', { type: 'text' });
            const errorSpan = this.create('div', { className: cls.formErrorMsg });

            const children = [input];

            // File selection button for image fields
            if (options.fieldType === 'image' || options.fieldType === 'icon') {
                const btn = this.create(
                    'button',
                    {
                        className: cls.localFileBtn,
                        type: 'button',
                        title: 'Select local file',
                        onclick: () => {
                            if (this.context.fileHandler) {
                                this.context.fileHandler(key, {
                                    onStart: () => {
                                        if (errorSpan instanceof HTMLElement) {
                                            errorSpan.textContent = 'Processing...';
                                            errorSpan.style.color = this.context.siteStyles?.PALETTE?.accent_text;
                                        }
                                    },
                                    onSuccess: () => {
                                        if (errorSpan instanceof HTMLElement) {
                                            errorSpan.textContent = '';
                                            errorSpan.style.color = '';
                                        }
                                        if (input instanceof HTMLElement) input.classList.remove(cls.invalidInput);
                                    },
                                    onError: (msg) => {
                                        if (errorSpan instanceof HTMLElement) {
                                            errorSpan.textContent = msg;
                                            errorSpan.style.color = this.context.siteStyles?.PALETTE?.error_text;
                                        }
                                    },
                                });
                            }
                        },
                    },
                    [createIconFromDef(StyleDefinitions.ICONS.folder)]
                );
                children.push(btn);
            }

            const container = this.create('div', { className: cls.formField }, [
                this.create('div', { className: cls.labelRow }, [this.create('label', { title: options.tooltip }, label)]),
                this.create('div', { className: cls.inputWrapper }, children),
                errorSpan,
            ]);

            if (container instanceof HTMLElement && input instanceof HTMLInputElement) {
                this._bindInput(container, input, key, options);
                this._setupDynamicState(container, options);

                // Allow manual error update observing
                this.observe(`${CONSTANTS.STORE_KEYS.ERRORS_PATH}.${key}`, (state) => this._updateErrorState(container, key, state));
            }

            return container;
        }

        textarea(key, label, options = {}) {
            const cls = this.styles;
            const input = this.create('textarea', { rows: options.rows || 3 });
            const errorSpan = this.create('div', { className: cls.formErrorMsg });

            const container = this.create('div', { className: cls.formField }, [this.create('label', { title: options.tooltip }, label), input, errorSpan]);

            if (container instanceof HTMLElement && input instanceof HTMLTextAreaElement) {
                this._bindInput(container, input, key, options);
                this._setupDynamicState(container, options);
                this.observe(`${CONSTANTS.STORE_KEYS.ERRORS_PATH}.${key}`, (state) => this._updateErrorState(container, key, state));
            }

            return container;
        }

        toggle(key, label, options = {}) {
            const cls = this.styles;
            const input = this.create('input', { type: 'checkbox' });

            const container = this.create('div', { className: cls.submenuRow }, [
                this.create('label', { title: options.title }, label), // Label on left
                this.create('label', { className: cls.toggleSwitch, title: options.title }, [
                    // Switch on right
                    input,
                    this.create('span', { className: cls.toggleSlider }),
                ]),
            ]);

            if (container instanceof HTMLElement && input instanceof HTMLInputElement) {
                this._bindInput(container, input, key, options);
                this._setupDynamicState(container, options);
            }

            return container;
        }

        range(key, label, min, max, options = {}) {
            const cls = this.styles;
            const step = options.step || 1;

            const input = this.create('input', { type: 'range', min, max, step });
            const display = this.create('span', { className: cls.sliderDisplay });

            const controlGroup = this.create('div', { className: cls.sliderSubgroupControl }, [input, display]);
            const containerClass = options.containerClass ? cls[options.containerClass] : cls.sliderContainer;

            const container = this.create('div', { className: containerClass }, [this.create('label', { title: options.tooltip }, label), controlGroup]);

            const extendedOptions = {
                ...options,
                // Use rawValue (val) for display logic to handle 'Auto' (null) correctly
                onUIUpdate: (val, uiVal) => {
                    if (options.valueLabelFormatter) {
                        display.textContent = options.valueLabelFormatter(val);
                    } else {
                        display.textContent = val === null || val === undefined ? 'Auto' : String(val);
                    }
                    // Handle 'default' style (grey out text if auto)
                    if (controlGroup instanceof HTMLElement) {
                        const isDefault = val === null || val === undefined;
                        controlGroup.classList.toggle('is-default', isDefault);
                    }
                },
            };

            if (container instanceof HTMLElement && input instanceof HTMLInputElement) {
                this._bindInput(container, input, key, extendedOptions);
                this._setupDynamicState(container, options);
            }

            return container;
        }

        select(key, label, options = {}) {
            const cls = this.styles;
            const selectOptions = (options.options || []).map((opt) => {
                const text = opt === '' ? '(not set)' : opt;
                return this.create('option', { value: opt }, text);
            });

            const input = this.create('select', {}, selectOptions);

            let container;
            if (options.showLabel) {
                container = this.create('div', { className: cls.formField }, [this.create('label', { title: options.tooltip }, label), input]);
            } else {
                // Bare select (often used in rows)
                container = input;
            }

            if (container instanceof HTMLElement && input instanceof HTMLSelectElement) {
                this._bindInput(container, input, key, options);
                this._setupDynamicState(container, options);
            }

            return container;
        }

        color(key, label, options = {}) {
            const cls = this.styles;
            const input = this.create('input', { type: 'text', autocomplete: 'off' });

            const swatchValue = this.create('span', { className: cls.colorSwatchValue });
            const swatch = this.create('button', { className: cls.colorSwatch, type: 'button', title: 'Open color picker' }, [this.create('span', { className: cls.colorSwatchChecker }), swatchValue]);

            // Picker logic encapsulation
            let activePicker = null;
            const closePicker = () => {
                if (activePicker) {
                    activePicker.destroy();
                    activePicker.popup.remove();
                    activePicker = null;
                }
            };

            // Ensure picker is closed when the parent component is destroyed or re-rendered
            this.disposer(() => closePicker());

            if (swatch instanceof HTMLElement) {
                swatch.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!(input instanceof HTMLInputElement)) return;
                    if (activePicker) {
                        closePicker();
                        return;
                    }

                    // Create popup
                    const popupRoot = this.create('div');
                    const popupWrapper = this.create('div', { className: cls.colorPickerPopup, style: { position: 'absolute' } }, [popupRoot]);

                    const dialog = swatch.closest('dialog') || document.body;
                    if (popupWrapper instanceof HTMLElement) {
                        dialog.appendChild(popupWrapper);
                    }

                    if (popupRoot instanceof HTMLElement) {
                        const picker = new CustomColorPicker(popupRoot, {
                            initialColor: input.value || 'rgb(128 128 128 / 1)',
                            classes: cls,
                        });
                        picker.render();

                        // Positioning logic (simplified from existing)
                        const rect = swatch.getBoundingClientRect();
                        const containerRect = dialog.getBoundingClientRect();
                        if (popupWrapper instanceof HTMLElement) {
                            popupWrapper.style.top = `${rect.bottom - containerRect.top + 4}px`;
                            popupWrapper.style.left = `${rect.left - containerRect.left}px`;
                        }

                        // Events
                        const onColorChange = (ev) => {
                            if (ev instanceof CustomEvent) {
                                const color = ev.detail.color;
                                input.value = color;
                                if (swatchValue instanceof HTMLElement) {
                                    swatchValue.style.backgroundColor = color;
                                }
                                input.dispatchEvent(new Event('input')); // Trigger store update
                            }
                        };
                        popupRoot.addEventListener('color-change', onColorChange);

                        // Auto close
                        const outsideClick = (ev) => {
                            if (popupWrapper instanceof HTMLElement) {
                                if (ev.target instanceof Node && !popupWrapper.contains(ev.target) && ev.target !== swatch && !swatch.contains(ev.target)) closePicker();
                            }
                        };
                        setTimeout(() => document.addEventListener('click', outsideClick, true), 0);

                        activePicker = {
                            destroy: () => {
                                picker.destroy();
                                document.removeEventListener('click', outsideClick, true);
                            },
                            popup: popupWrapper,
                        };
                    }
                };
            }

            const container = this.create('div', { className: cls.formField }, [
                this.create('div', { className: cls.labelRow }, [
                    this.create('label', { title: options.tooltip }, label),
                    this.create('span', { className: cls.statusText }), // Error container placeholder
                ]),
                this.create('div', { className: cls.colorFieldWrapper }, [input, swatch]),
            ]);

            const extendedOptions = {
                ...options,
                onStoreUpdate: (el, val) => {
                    if (input instanceof HTMLInputElement) input.value = val || '';
                    if (swatchValue instanceof HTMLElement) swatchValue.style.backgroundColor = val || 'transparent';
                },
            };

            if (container instanceof HTMLElement && input instanceof HTMLInputElement) {
                this._bindInput(container, input, key, extendedOptions);
                this._setupDynamicState(container, options);
                // Error handling for color field (using statusText)
                this.observe(`${CONSTANTS.STORE_KEYS.ERRORS_PATH}.${key}`, (state) => {
                    const error = getPropertyByPath(state, `${CONSTANTS.STORE_KEYS.ERRORS_PATH}.${key}`);
                    const statusText = container.querySelector(`.${cls.statusText}`);
                    if (statusText instanceof HTMLElement) {
                        statusText.textContent = error ? error.message || error : '';
                        statusText.style.color = error ? this.context.siteStyles?.PALETTE?.error_text || 'red' : '';
                    }
                    if (error) input.classList.add(cls.invalidInput);
                    else input.classList.remove(cls.invalidInput);
                });
            }

            return container;
        }

        button(id, text, onClick, options = {}) {
            const cls = this.styles;
            const className = options.className ? `${cls.modalButton} ${options.className}` : cls.modalButton;
            const btn = this.create(
                'button',
                {
                    id,
                    className,
                    type: 'button',
                    title: options.title || '',
                    onclick: (e) => {
                        e.preventDefault();
                        if (typeof onClick === 'function') {
                            onClick(e);
                        }
                    },
                    style: { width: options.fullWidth ? '100%' : 'auto' },
                },
                text
            );
            return btn;
        }

        // --- Layouts ---

        group(label, children, options = {}) {
            const cls = this.styles;
            const container = this.create('fieldset', { className: cls.submenuFieldset }, [this.create('legend', {}, label), ...children]);
            if (container instanceof HTMLElement) {
                this._setupDynamicState(container, options);
            }
            return container;
        }

        row(children, options = {}) {
            const cls = this.styles;
            let className = cls.submenuRow;
            if (options.className && cls[options.className]) {
                className += ` ${cls[options.className]}`;
            } else if (options.className) {
                className += ` ${options.className}`;
            }
            const container = this.create('div', { className }, children);
            if (container instanceof HTMLElement) {
                this._setupDynamicState(container, options);
            }
            return container;
        }

        separator(options = {}) {
            const container = this.create('div', { className: this.styles.submenuSeparator });
            if (container instanceof HTMLElement) {
                this._setupDynamicState(container, options);
            }
            return container;
        }

        label(text, options = {}) {
            const container = this.create('label', { title: options.title }, text);
            if (container instanceof HTMLElement) {
                this._setupDynamicState(container, options);
            }
            return container;
        }

        container(children, options = {}) {
            let className = '';
            if (options.className && this.styles[options.className]) {
                className = this.styles[options.className];
            }
            const container = this.create('div', { className }, children);
            if (container instanceof HTMLElement) {
                this._setupDynamicState(container, options);
            }
            return container;
        }
    }

    /**
     * @class SchemaBuilder
     * @description Helper functions to create type-safe schema objects.
     */
    const SchemaBuilder = {
        /**
         * @typedef {object} CommonOptions
         * @property {string} [tooltip] - Tooltip text.
         * @property {string} [title] - Title text.
         * @property {string} [className] - Custom CSS class.
         * @property {(data: any) => boolean} [visibleIf] - Conditional visibility.
         * @property {(data: any) => boolean} [disabledIf] - Conditional disabled state.
         * @property {string[]} [dependencies] - Array of config keys to observe.
         * @property {(value: any, data: any) => void} [onChange] - Side effect callback.
         */

        /**
         * @param {string} type
         * @param {string} [id]
         * @param {object} props
         */
        create(type, id, props = {}) {
            return { type, id, ...props };
        },

        // --- Controls ---
        /**
         * @param {string} key
         * @param {string} label
         * @param {CommonOptions} [options]
         */
        Toggle(key, label, options = {}) {
            return { type: 'toggle', configKey: key, label, ...options };
        },
    };

    /**
     * @class ThemePreviewController
     * @description Manages the live preview updates within the Theme Modal.
     * It decouples DOM manipulation from the Modal component logic by reacting to Store changes.
     */
    class ThemePreviewController {
        /**
         * @param {HTMLElement} rootElement - The root element of the modal to search for preview nodes.
         * @param {ReactiveStore} store - The store instance to subscribe to.
         * @param {object} defaultSet - The default theme configuration for fallback values.
         */
        constructor(rootElement, store, defaultSet) {
            this.store = store;
            this.defaultSet = defaultSet || {};
            this.isEditingDefault = false;
            /**
             * @type {{
             * user: Element | null,
             * assistant: Element | null,
             * inputArea: Element | null,
             * window: Element | null
             * }}
             */
            this.dom = {
                user: rootElement.querySelector(DomState.getSelector(CONSTANTS.DATA_KEYS.PREVIEW_FOR, 'user')),
                assistant: rootElement.querySelector(DomState.getSelector(CONSTANTS.DATA_KEYS.PREVIEW_FOR, 'assistant')),
                inputArea: rootElement.querySelector(DomState.getSelector(CONSTANTS.DATA_KEYS.PREVIEW_FOR, 'inputArea')),
                window: rootElement.querySelector(DomState.getSelector(CONSTANTS.DATA_KEYS.PREVIEW_FOR, 'window')),
            };

            // Bind method to preserve 'this' context
            this.onStoreUpdate = this.onStoreUpdate.bind(this);
            this.unsubscribe = this.store.subscribe(this.onStoreUpdate);
        }

        destroy() {
            if (this.unsubscribe) {
                this.unsubscribe();
            }
            this.dom = {
                user: null,
                assistant: null,
                inputArea: null,
                window: null,
            };
        }

        /**
         * Updates the internal reference to the default set.
         * Used to ensure fallback values are current after a "Save" or "Apply" action.
         * @param {object} newDefaultSet - The updated default theme configuration.
         */
        setDefaultSet(newDefaultSet) {
            this.defaultSet = newDefaultSet || {};
        }

        /**
         * Sets the flag indicating whether the current theme being edited is the default set.
         * When true, fallback logic is disabled to correctly preview "unset" (null) values.
         * @param {boolean} isEditingDefault
         */
        setIsEditingDefault(isEditingDefault) {
            this.isEditingDefault = isEditingDefault;

            // Force re-render of all preview sections to apply the new mode immediately.
            // This ensures that switching between "Default" (no fallback) and "Custom" (with fallback)
            // updates the preview appearance even if the underlying data hasn't changed.
            if (this.store) {
                const state = this.store.getData();
                this.onStoreUpdate(state, 'user');
                this.onStoreUpdate(state, 'assistant');
                this.onStoreUpdate(state, 'window');
                this.onStoreUpdate(state, 'inputArea');
            }
        }

        /**
         * Handles updates from the store and dispatches to specific render methods.
         * Checks for both exact key matches (e.g., 'user') and nested paths (e.g., 'user.textColor').
         * @param {object} state - The full state object.
         * @param {string} changedPath - The path of the property that changed.
         */
        onStoreUpdate(state, changedPath) {
            if (!changedPath) return;

            if (changedPath === 'user' || changedPath.startsWith('user.')) {
                this.renderActorPreview('user', state.user);
            } else if (changedPath === 'assistant' || changedPath.startsWith('assistant.')) {
                this.renderActorPreview('assistant', state.assistant);
            } else if (changedPath === 'window' || changedPath.startsWith('window.')) {
                this.renderWindowPreview(state.window);
            } else if (changedPath === 'inputArea' || changedPath.startsWith('inputArea.')) {
                this.renderInputAreaPreview(state.inputArea);
            }
        }

        /**
         * Resolves the effective value for a theme property based on editing mode.
         * @private
         * @param {object} config - The current config object.
         * @param {object} defaultConfig - The default config object.
         * @param {string} key - The property key.
         * @returns {any} The resolved value.
         */
        _resolveValue(config, defaultConfig, key) {
            const val = config[key];
            if (this.isEditingDefault) return val;
            return val ?? defaultConfig[key];
        }

        /**
         * Applies mapped styles to an element using resolved values.
         * @private
         * @param {HTMLElement} element - The target element.
         * @param {object} config - The current config object.
         * @param {object} defaultConfig - The default config object.
         * @param {Record<string, string>} mapping - Map of CSS property to config key.
         */
        _applyStyles(element, config, defaultConfig, mapping) {
            const style = element.style;
            for (const [cssProp, configKey] of Object.entries(mapping)) {
                style[cssProp] = this._resolveValue(config, defaultConfig, configKey) || '';
            }
        }

        /**
         * Updates the preview style for a specific actor (user/assistant).
         * Falls back to defaultSet values if properties are null/undefined, unless editing the default set itself.
         * @param {'user'|'assistant'} actor
         * @param {object} config
         */
        renderActorPreview(actor, config) {
            const element = this.dom[actor];
            if (!(element instanceof HTMLElement)) return;

            const currentConfig = config || {};
            const defaultConfig = this.defaultSet[actor] || {};

            // Apply standard styles
            this._applyStyles(element, currentConfig, defaultConfig, {
                color: 'textColor',
                backgroundColor: 'bubbleBackgroundColor',
                fontFamily: 'font',
                borderRadius: 'bubbleBorderRadius',
                padding: 'bubblePadding',
            });

            // Max Width (Special handling for Auto fallback)
            // If the resolved value is null (Auto), fallback to hardcoded defaults for preview purposes
            // to mimic the behavior of previous versions (user: 50%, assistant: 90%).
            const resolvedWidth = this._resolveValue(currentConfig, defaultConfig, 'bubbleMaxWidth');
            const maxWidthDefault = actor === 'user' ? CONSTANTS.UI_SPECS.PREVIEW_BUBBLE_MAX_WIDTH.USER : CONSTANTS.UI_SPECS.PREVIEW_BUBBLE_MAX_WIDTH.ASSISTANT;
            const maxWidth = resolvedWidth ?? maxWidthDefault;

            element.style.width = maxWidth;
            element.style.maxWidth = maxWidth;
        }

        /**
         * Updates the preview style for the input area.
         * Falls back to defaultSet values if properties are null/undefined, unless editing the default set itself.
         * @param {object} config
         */
        renderInputAreaPreview(config) {
            const element = this.dom.inputArea;
            if (!(element instanceof HTMLElement)) return;

            const currentConfig = config || {};
            const defaultConfig = this.defaultSet.inputArea || {};

            this._applyStyles(element, currentConfig, defaultConfig, {
                color: 'textColor',
                backgroundColor: 'backgroundColor',
            });
        }

        /**
         * Updates the preview style for the window background.
         * Falls back to defaultSet values if properties are null/undefined, unless editing the default set itself.
         * @param {object} config
         */
        renderWindowPreview(config) {
            const element = this.dom.window;
            if (!(element instanceof HTMLElement)) return;

            const currentConfig = config || {};
            const defaultConfig = this.defaultSet.window || {};

            // Only background-color is previewed for window
            this._applyStyles(element, currentConfig, defaultConfig, {
                backgroundColor: 'backgroundColor',
            });
        }
    }

    /**
     * @class CustomColorPicker
     * @description A reusable color picker UI component.
     * It renders the UI using the CSS classes provided in the options, relying on external style injection.
     * Uses static methods for color conversion and the external `validateColorString` helper for validation.
     */
    class CustomColorPicker {
        static DIMENSIONS = {
            WIDTH: 280,
            HEIGHT: 350,
            PADDING: 32,
            MARGIN: 4,
        };

        /**
         * @param {Element} rootElement The DOM element to render the picker into.
         * @param {object} options
         * @param {string} options.initialColor The initial color to display.
         * @param {Record<string, string>} options.classes The CSS class map provided by StyleManager.
         */
        constructor(rootElement, options) {
            this.rootElement = rootElement;
            this.options = options;
            this.state = { h: 0, s: 100, v: 100, a: 1 };
            this.dom = {};
            this.isUpdating = false;
            this._pendingEmit = false; // Flag to track if the next update should emit an event
            this._handleSvPointerMove = this._handleSvPointerMove.bind(this);
            this._handleSvPointerUp = this._handleSvPointerUp.bind(this);
        }

        // =================================================================================
        // SECTION: Static Color Utility Methods
        // =================================================================================

        /**
         * Converts HSV color values to RGB.
         * @param {number} h - Hue (0-360)
         * @param {number} s - Saturation (0-100)
         * @param {number} v - Value (0-100)
         * @returns {{r: number, g: number, b: number}} RGB object (0-255).
         */
        static hsvToRgb(h, s, v) {
            s /= 100;
            v /= 100;
            let r, g, b;
            const i = Math.floor(h / 60);
            const f = h / 60 - i,
                p = v * (1 - s),
                q = v * (1 - s * f),
                t = v * (1 - s * (1 - f));
            switch (i % 6) {
                case 0: {
                    r = v;
                    g = t;
                    b = p;
                    break;
                }
                case 1: {
                    r = q;
                    g = v;
                    b = p;
                    break;
                }
                case 2: {
                    r = p;
                    g = v;
                    b = t;
                    break;
                }
                case 3: {
                    r = p;
                    g = q;
                    b = v;
                    break;
                }
                case 4: {
                    r = t;
                    g = p;
                    b = v;
                    break;
                }
                case 5: {
                    r = v;
                    g = p;
                    b = q;
                    break;
                }
            }
            return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
        }

        /**
         * Converts RGB color values to HSV.
         * @param {number} r - Red (0-255)
         * @param {number} g - Green (0-255)
         * @param {number} b - Blue (0-255)
         * @returns {{h: number, s: number, v: number}} HSV object.
         */
        static rgbToHsv(r, g, b) {
            r /= 255;
            g /= 255;
            b /= 255;
            const max = Math.max(r, g, b),
                min = Math.min(r, g, b);
            const v = max;
            const d = max - min;
            const s = max === 0 ? 0 : d / max;
            let h;

            if (max === min) {
                h = 0;
            } else {
                switch (max) {
                    case r: {
                        h = (g - b) / d + (g < b ? 6 : 0);
                        break;
                    }
                    case g: {
                        h = (b - r) / d + 2;
                        break;
                    }
                    case b: {
                        h = (r - g) / d + 4;
                        break;
                    }
                }
                h /= 6;
            }
            return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
        }

        /**
         * Converts an RGB object to a CSS rgb() or rgba() string with modern space-separated syntax.
         * @param {number} r - Red (0-255)
         * @param {number} g - Green (0-255)
         * @param {number} b - Blue (0-255)
         * @param {number} a - Alpha (0-1)
         * @returns {string} CSS color string.
         */
        static rgbToString(r, g, b, a) {
            if (a < 1) {
                return `rgb(${r} ${g} ${b} / ${a.toFixed(2).replace(/\.?0+$/, '') || 0})`;
            }
            return `rgb(${r} ${g} ${b})`;
        }

        /**
         * Resolves a CSS color string to an RGBA object using the DOM.
         * This method is only called when the UI is active and the DOM is available.
         * @param {string} str - The color string.
         * @returns {{r: number, g: number, b: number, a: number} | null} RGBA object or null if invalid.
         */
        static resolveColor(str) {
            // First check validity using the lightweight global validator (no DOM insertion)
            if (!validateColorString(str)) return null;

            // Then use DOM to parse components (e.g. 'red' -> 255, 0, 0)
            const temp = document.createElement('div');
            temp.style.color = 'initial';
            temp.style.color = str;

            if (temp.style.color === '' || temp.style.color === 'initial') {
                return null;
            }

            temp.style.display = 'none';
            document.body.appendChild(temp);
            const computedColor = window.getComputedStyle(temp).color;
            document.body.removeChild(temp);

            const rgbaMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
            if (rgbaMatch) {
                return {
                    r: parseInt(rgbaMatch[1], 10),
                    g: parseInt(rgbaMatch[2], 10),
                    b: parseInt(rgbaMatch[3], 10),
                    a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
                };
            }
            return null;
        }

        // =================================================================================
        // SECTION: Public and Private Instance Methods
        // =================================================================================

        render() {
            // Get references to created DOM elements from _createDom
            Object.assign(this.dom, this._createDom());
            this._attachEventListeners();
            // Initial render should not emit events
            this.setColor(this.options.initialColor, true);
        }

        destroy() {
            // Remove instance-specific window event listeners
            window.removeEventListener('pointermove', this._handleSvPointerMove);
            window.removeEventListener('pointerup', this._handleSvPointerUp);

            // Clear the DOM content of this specific picker instance
            if (this.rootElement) {
                this.rootElement.textContent = '';
            }

            // Nullify references to prevent memory leaks and mark as destroyed
            this.rootElement = null;
            this.dom = {};

            // Shared styles are managed by StyleManager and should NOT be removed here.
        }

        setColor(rgbString, silent) {
            // Use the DOM-based resolver since we need RGB components for HSV conversion
            const parsed = CustomColorPicker.resolveColor(rgbString);
            if (parsed) {
                const { r, g, b, a } = parsed;
                const { h, s, v } = CustomColorPicker.rgbToHsv(r, g, b);
                this.state = { h, s, v, a };
                // If silent is true, do NOT emit event (pass false to _requestUpdate)
                this._requestUpdate(!silent);
                return true;
            }
            return false;
        }

        getColor() {
            const { h, s, v, a } = this.state;
            const { r, g, b } = CustomColorPicker.hsvToRgb(h, s, v);
            return CustomColorPicker.rgbToString(r, g, b, a);
        }

        _createDom() {
            const cls = this.options.classes;
            this.rootElement.textContent = '';

            // References to key elements will be captured during creation.
            let svPlane, svThumb, hueSlider, alphaSlider, alphaTrack;

            const colorPicker = h(`div.${cls.picker}`, { 'aria-label': 'Color picker' }, [
                (svPlane = h(
                    `div.${cls.svPlane}`,
                    {
                        role: 'slider',
                        tabIndex: 0,
                        'aria-label': 'Saturation and Value',
                    },
                    [h(`div.${cls.gradientWhite}`), h(`div.${cls.gradientBlack}`), (svThumb = h(`div.${cls.svThumb}`))]
                )),
                h(`div.${cls.sliderGroup}`, [
                    h(`div.${cls.sliderTrack}.${cls.hueTrack}`),
                    (hueSlider = h('input', {
                        type: 'range',
                        min: '0',
                        max: '360',
                        step: '1',
                        'aria-label': 'Hue',
                    })),
                ]),
                h(`div.${cls.sliderGroup}`, [
                    h(`div.${cls.alphaCheckerboard}`),
                    (alphaTrack = h(`div.${cls.sliderTrack}`)),
                    (alphaSlider = h('input', {
                        type: 'range',
                        min: '0',
                        max: '1',
                        step: '0.01',
                        'aria-label': 'Alpha',
                    })),
                ]),
            ]);

            this.rootElement.appendChild(colorPicker);

            // Return references to the created elements.
            return { svPlane, svThumb, hueSlider, alphaSlider, alphaTrack };
        }

        _handleSvPointerDown(e) {
            e.preventDefault();
            this.dom.svPlane.focus();
            this._updateSv(e.clientX, e.clientY);
            window.addEventListener('pointermove', this._handleSvPointerMove);
            window.addEventListener('pointerup', this._handleSvPointerUp);
        }

        _handleSvPointerMove(e) {
            this._updateSv(e.clientX, e.clientY);
        }

        _handleSvPointerUp() {
            window.removeEventListener('pointermove', this._handleSvPointerMove);
            window.removeEventListener('pointerup', this._handleSvPointerUp);
        }

        _updateSv(clientX, clientY) {
            const rect = this.dom.svPlane.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
            const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
            this.state.s = Math.round((x / rect.width) * 100);
            this.state.v = Math.round((1 - y / rect.height) * 100);
            // User interaction should always emit events
            this._requestUpdate(true);
        }

        _attachEventListeners() {
            const { svPlane, hueSlider, alphaSlider } = this.dom;
            svPlane.addEventListener('pointerdown', this._handleSvPointerDown.bind(this));
            svPlane.addEventListener('keydown', (e) => {
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
                e.preventDefault();
                const sStep = e.shiftKey ? 10 : 1;
                const vStep = e.shiftKey ? 10 : 1;
                switch (e.key) {
                    case 'ArrowLeft': {
                        this.state.s = Math.max(0, this.state.s - sStep);
                        break;
                    }
                    case 'ArrowRight': {
                        this.state.s = Math.min(100, this.state.s + sStep);
                        break;
                    }
                    case 'ArrowUp': {
                        this.state.v = Math.min(100, this.state.v + vStep);
                        break;
                    }
                    case 'ArrowDown': {
                        this.state.v = Math.max(0, this.state.v - vStep);
                        break;
                    }
                }
                // Keyboard interaction should emit events
                this._requestUpdate(true);
            });
            hueSlider.addEventListener('input', () => {
                this.state.h = parseInt(hueSlider.value, 10);
                // Slider interaction should emit events
                this._requestUpdate(true);
            });
            alphaSlider.addEventListener('input', () => {
                this.state.a = parseFloat(alphaSlider.value);
                // Slider interaction should emit events
                this._requestUpdate(true);
            });
        }

        _requestUpdate(emitEvent) {
            // Accumulate the emit flag. If any update in this frame requests an emit, it should happen.
            this._pendingEmit = this._pendingEmit || emitEvent;

            if (this.isUpdating) return;
            this.isUpdating = true;
            requestAnimationFrame(() => {
                this._updateUIDisplay();

                if (this._pendingEmit) {
                    this._dispatchChangeEvent();
                    this._pendingEmit = false;
                }

                this.isUpdating = false;
            });
        }

        _updateUIDisplay() {
            if (!this.rootElement) return; // Guard against updates after destruction
            const { h, s, v, a } = this.state;
            const { svPlane, svThumb, hueSlider, alphaSlider, alphaTrack } = this.dom;
            const { r, g, b } = CustomColorPicker.hsvToRgb(h, s, v);
            svPlane.style.backgroundColor = `hsl(${h} 100% 50%)`;
            svThumb.style.left = `${s}%`;
            svThumb.style.top = `${100 - v}%`;
            svThumb.style.backgroundColor = `rgb(${r} ${g} ${b})`;
            hueSlider.value = h;
            alphaSlider.value = a;
            alphaTrack.style.background = `linear-gradient(to right, transparent, rgb(${r} ${g} ${b}))`;
            svPlane.setAttribute('aria-valuetext', `Saturation ${s}%, Value ${v}%`);
            hueSlider.setAttribute('aria-valuenow', h);
            alphaSlider.setAttribute('aria-valuenow', a.toFixed(2));
        }

        _dispatchChangeEvent() {
            if (this.rootElement) {
                this.rootElement.dispatchEvent(
                    new CustomEvent('color-change', {
                        detail: {
                            color: this.getColor(),
                        },
                        bubbles: true,
                    })
                );
            }
        }
    }

    /**
     * @class CustomModal
     * @description A reusable, promise-based modal component. It provides a flexible
     * structure with header, content, and footer sections, and manages its own lifecycle and styles.
     * @callback ModalButtonOnClick
     * @param {CustomModal} modalInstance - The instance of the modal that the button belongs to.
     * @param {MouseEvent} event - The mouse click event.
     * @returns {void}
     */
    class CustomModal {
        static DEFAULTS = {
            WIDTH: '500px',
        };

        /**
         * @param {object} options
         * @param {string} [options.title] - The title displayed in the modal header.
         * @param {string} [options.width] - The width of the modal.
         * @param {string} options.id - The ID for the modal dialog element.
         * @param {number|string} [options.zIndex] - The z-index for the modal.
         * @param {boolean} [options.closeOnBackdropClick] - Whether to close the modal when clicking the backdrop.
         * @param {Array<{text: string, id: string, className?: string, title?: string, onClick: ModalButtonOnClick}>} [options.buttons] - An array of button definitions for the footer.
         * @param {function(): void} [options.onDestroy] - A callback function executed when the modal is destroyed.
         */
        constructor(options) {
            this.options = {
                title: '',
                width: CustomModal.DEFAULTS.WIDTH,
                id: null,
                zIndex: undefined,
                closeOnBackdropClick: true,
                buttons: [],
                onDestroy: null,
                ...options,
            };
            this.style = StyleManager.request(StyleDefinitions.getModal);
            this.element = null;
            this.dom = {}; // To hold references to internal elements like header, content, footer
            this._createModalElement();
        }

        _createModalElement() {
            const cls = this.style.classes;
            const commonBtnClass = StyleDefinitions.COMMON_CLASSES.modalButton;

            // Define variables to hold references to key elements.
            let header, content, footer, modalBox, footerMessage;

            // Create footer buttons declaratively using map and h().
            const buttons = this.options.buttons.map((btnDef) => {
                // Combine common button class with any custom classes provided
                const fullClassName = [commonBtnClass, btnDef.className].filter(Boolean).join(' ');
                return h(
                    'button',
                    {
                        id: btnDef.id,
                        className: fullClassName,
                        onclick: (e) => btnDef.onClick(this, e),
                        title: btnDef.title || '',
                    },
                    btnDef.text
                );
            });

            const buttonGroup = h(`div.${cls.buttonGroup}`, buttons);

            // Create the entire modal structure using h().
            const dialogElement = h(
                `dialog.${cls.dialog}`, // Common dialog class
                { id: this.options.id }, // Specific ID passed from options
                (modalBox = h(`div.${cls.box}`, { style: { width: this.options.width } }, [
                    (header = h(`div.${cls.header}`, this.options.title)),
                    (content = h(`div.${cls.content}`)),
                    (footer = h(`div.${cls.footer}`, [(footerMessage = h(`div.${cls.footerMessage}`)), buttonGroup])),
                ]))
            );

            if (!(dialogElement instanceof HTMLDialogElement)) {
                Logger.error('UI', '', 'Failed to create modal dialog element.');
                return;
            }
            this.element = dialogElement;

            // The 'close' event is the single source of truth for when the dialog has been dismissed.
            this.element.addEventListener('close', () => this.destroy());

            if (this.options.closeOnBackdropClick) {
                this.element.addEventListener('click', (e) => {
                    if (e.target === this.element) {
                        this.close();
                    }
                });
            }

            // Store references and append the final element to the body.
            this.dom = { header, content, footer, modalBox, footerMessage };
            document.body.appendChild(this.element);
        }

        show(anchorElement) {
            if (this.element instanceof HTMLDialogElement && typeof this.element.showModal === 'function') {
                if (this.element.open) return;

                if (this.options.zIndex !== undefined) {
                    this.element.style.zIndex = String(this.options.zIndex);
                }
                this.element.showModal();
                // Positioning logic
                if (anchorElement && typeof anchorElement.getBoundingClientRect === 'function') {
                    // ANCHORED POSITIONING
                    const modalBox = this.dom.modalBox;
                    const btnRect = anchorElement.getBoundingClientRect();
                    const margin = CONSTANTS.UI_SPECS.MODAL_MARGIN;
                    const anchorOffset = CONSTANTS.UI_SPECS.ANCHOR_OFFSET;
                    const modalWidth = modalBox.offsetWidth || parseInt(this.options.width, 10);
                    const modalHeight = modalBox.offsetHeight;

                    let left = btnRect.left;
                    const top = btnRect.bottom + anchorOffset;

                    if (left + modalWidth > window.innerWidth - margin) {
                        left = window.innerWidth - modalWidth - margin;
                    }

                    // Vertical collision detection & adjustment
                    let finalTop = top;
                    if (finalTop + modalHeight > window.innerHeight - margin) {
                        // Try positioning above the anchor
                        const topAbove = btnRect.top - modalHeight - anchorOffset;
                        if (topAbove > margin) {
                            finalTop = topAbove;
                        } else {
                            // If it doesn't fit above, pin to the bottom edge of the window
                            finalTop = window.innerHeight - modalHeight - margin;
                        }
                    }

                    Object.assign(this.element.style, {
                        position: 'absolute',
                        left: `${Math.max(left, margin)}px`,
                        top: `${Math.max(finalTop, margin)}px`,
                        margin: '0',
                        transform: 'none',
                    });
                } else {
                    // DEFAULT CENTERING
                    Object.assign(this.element.style, {
                        position: 'fixed',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        margin: '0',
                    });
                }
            }
        }

        close() {
            if (this.element && this.element.open) {
                this.element.close();
            }
        }

        destroy() {
            if (!this.element) return;
            this.element.remove();
            this.element = null;

            if (this.options.onDestroy) {
                this.options.onDestroy();
            }
        }

        /**
         * @param {Node} element
         */
        setContent(element) {
            this.dom.content.textContent = '';
            this.dom.content.appendChild(element);
        }

        getContentContainer() {
            return this.dom.content;
        }
    }

    /**
     * Manages a configurable, reusable settings button.
     * This component is static and does not include drag-and-drop functionality.
     */
    class CustomSettingsButton extends UIComponentBase {
        /**
         * @param {object} callbacks - Functions to be called on component events.
         * @param {function(): void} callbacks.onClick - Called when the button is clicked.
         * @param {object} options - Configuration for the button's appearance and behavior.
         * @param {string} options.id - The HTML ID for the button element.
         * @param {string} options.title - The tooltip text for the button.
         */
        constructor(callbacks, options) {
            super(callbacks);
            this.options = options;
            this.styleHandle = null;
            this.id = null;
        }

        /**
         * Renders the settings button element in memory.
         * @returns {HTMLElement} The created button element.
         */
        render() {
            // Inject styles and get the managed ID
            this.styleHandle = StyleManager.request(StyleDefinitions.getSettingsButton);
            this.id = this.styleHandle.classes.buttonId;

            const oldElement = document.getElementById(this.id);
            if (oldElement) {
                oldElement.remove();
            }

            this.element = h('button', {
                id: this.id,
                type: 'button',
                title: this.options.title,
                onclick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.callbacks.onClick?.();
                },
            });

            const iconDef = StyleDefinitions.ICONS.settings;
            if (iconDef) {
                const svgElement = createIconFromDef(iconDef);
                if (svgElement instanceof Node) {
                    this.element.appendChild(svgElement);
                }
            }

            return this.element;
        }

        _onDestroy() {
            this.styleHandle = null;
            super._onDestroy();
        }

        /**
         * Toggles the loading animation state of the button.
         * @param {boolean} isLoading
         */
        setLoading(isLoading) {
            if (this.element) {
                this.element.classList.toggle('is-loading', isLoading);
            }
        }
    }

    /**
     * Manages the settings panel/submenu using ReactiveStore for state management.
     */
    class SettingsPanelComponent extends UIComponentBase {
        /**
         * @param {object} callbacks
         * @param {(config: AppConfig) => Promise<void>} [callbacks.onSave]
         * @param {() => Promise<AppConfig>} [callbacks.getCurrentConfig]
         * @param {() => object} [callbacks.getCurrentWarning]
         * @param {() => ThemeSet} [callbacks.getCurrentThemeSet]
         * @param {() => void} [callbacks.onShowJsonModal]
         * @param {function(string=): void} [callbacks.onShowThemeModal]
         * @param {() => HTMLElement|null} [callbacks.getAnchorElement]
         * @param {(config: AppConfig) => {size: number, isExceeded: boolean}} [callbacks.checkSize]
         * @param {() => void} [callbacks.onShow]
         */
        constructor(callbacks) {
            super(callbacks);
            this.activeThemeSet = null;
            this.subscriptions = [];
            this.store = null;
            this.debouncedSave = debounce(this._handleDebouncedSave.bind(this), CONSTANTS.TIMING.DEBOUNCE_DELAYS.SETTINGS_SAVE, true);
            this._handleDocumentClick = this._handleDocumentClick.bind(this);
            this._handleDocumentKeydown = this._handleDocumentKeydown.bind(this);
            this.isUpdatingFromExternal = false; // Flag to prevent save loops
            /** @type {Array<() => void>} */
            this._uiSubscriptions = []; // Transient subscriptions for the current render cycle
        }

        _onInit() {
            this.style = StyleManager.request(StyleDefinitions.getSettingsPanel);
            this.commonStyleHandle = StyleManager.request(StyleDefinitions.getCommon);

            this._subscribe(EVENTS.CONFIG_UPDATED, async (newConfig) => {
                // If the panel is open, refresh the store.
                // Guard against save loops triggered by external updates.
                if (this.isOpen() && this.store) {
                    this.isUpdatingFromExternal = true;
                    try {
                        // Preserve current system state to keep warning banners visible
                        const currentSystem = this.store.get(CONSTANTS.STORE_KEYS.SYSTEM_ROOT);
                        const newState = { ...newConfig, [CONSTANTS.STORE_KEYS.SYSTEM_ROOT]: currentSystem };
                        this.store.replaceState(newState);
                    } finally {
                        this.isUpdatingFromExternal = false;
                    }
                }
            });
            // Subscribe to warning updates to update the store dynamically
            this._subscribe(EVENTS.CONFIG_WARNING_UPDATE, (payload) => {
                if (this.store) {
                    this.store.set(CONSTANTS.STORE_KEYS.WARNING_PATH, payload);
                }
            });

            this.addDisposable(this.debouncedSave.cancel);
            // Ensure listeners are removed and panel is hidden on destroy
            this.addDisposable(() => this.hide());
        }

        _onDestroy() {
            this.store = null;

            // Clean up transient UI subscriptions
            this._uiSubscriptions.forEach((unsub) => unsub());
            this._uiSubscriptions = [];

            super._onDestroy();
        }

        render() {
            if (this.style && document.getElementById(this.style.classes.panel)) {
                document.getElementById(this.style.classes.panel).remove();
            }
            this.element = this._createPanelContainer();
            document.body.appendChild(this.element);

            // Note: Content is rendered in show() because it depends on the current config
            return this.element;
        }

        toggle() {
            const shouldShow = this.element.style.display === 'none';
            if (shouldShow) {
                this.show();
            } else {
                this.hide();
            }
        }

        isOpen() {
            return this.element && this.element.style.display !== 'none';
        }

        hide() {
            if (this.element) {
                this.element.style.display = 'none';
            }
            document.removeEventListener('click', this._handleDocumentClick, true);
            document.removeEventListener('keydown', this._handleDocumentKeydown, true);
        }

        /**
         * Updates the displayed theme name, refreshes the store, and shows the panel.
         * @returns {Promise<void>}
         */
        async show() {
            // Initialize or refresh store with the latest config
            const currentConfig = await this.callbacks.getCurrentConfig();
            if (this.isDestroyed) return;

            const currentWarning = this.callbacks.getCurrentWarning();
            const { SYSTEM_ROOT, SYSTEM_WARNING, SYSTEM_SIZE_EXCEEDED } = CONSTANTS.STORE_KEYS;

            // Check size state
            const sizeInfo = this.callbacks.checkSize(currentConfig);
            // If size is exceeded, override warning message for the panel context
            // unless a system warning is already active.
            let warningState = currentWarning;
            if (sizeInfo.isExceeded) {
                warningState = {
                    show: true,
                    message: 'Configuration size limit exceeded.\nSome settings are disabled. Please reduce size via JSON or Themes.',
                };
            }

            // Merge system state into the config for the store
            const storeState = {
                ...deepClone(currentConfig),
                [SYSTEM_ROOT]: {
                    [SYSTEM_WARNING]: warningState,
                    [SYSTEM_SIZE_EXCEEDED]: sizeInfo.isExceeded,
                },
            };

            if (this.store) {
                this.isUpdatingFromExternal = true;
                try {
                    this.store.replaceState(storeState);
                } finally {
                    this.isUpdatingFromExternal = false;
                }
            } else {
                this.store = new ReactiveStore(storeState);
                // Subscribe store changes to save logic
                const unsub = this.store.subscribe((state, path) => {
                    // Block save if updating from external source
                    if (this.isUpdatingFromExternal) return;

                    // Block save if the change is within the system internal state
                    if (path && String(path).startsWith(CONSTANTS.STORE_KEYS.SYSTEM_ROOT)) {
                        return;
                    }

                    this.debouncedSave();
                });
                // Register the unsubscribe callback for cleanup
                this.addStoreSubscription(unsub);
            }

            // Re-render content to ensure schema freshness (and update disabled states)
            this._renderContent();

            // Update applied theme name display (manual DOM update as it's not in store)
            if (this.callbacks.getCurrentThemeSet) {
                this.activeThemeSet = this.callbacks.getCurrentThemeSet();
                const themeName = this.activeThemeSet.metadata?.name || 'Default Settings';
                const themeNameEl = this.element.querySelector(`#${this.style.prefix}-theme-name`);
                if (themeNameEl) {
                    themeNameEl.textContent = themeName;
                }
            }

            const anchor = this.callbacks.getAnchorElement();

            if (anchor) {
                const anchorRect = anchor.getBoundingClientRect();
                const margin = CONSTANTS.UI_SPECS.PANEL_MARGIN;
                const offset = CONSTANTS.UI_SPECS.ANCHOR_OFFSET;
                let top = anchorRect.bottom + offset;
                let left = anchorRect.left;

                this.element.style.display = 'block';
                const panelWidth = this.element.offsetWidth;
                const panelHeight = this.element.offsetHeight;

                if (left + panelWidth > window.innerWidth - margin) {
                    left = window.innerWidth - panelWidth - margin;
                }
                if (top + panelHeight > window.innerHeight - margin) {
                    top = window.innerHeight - panelHeight - margin;
                }

                this.element.style.left = `${Math.max(margin, left)}px`;
                this.element.style.top = `${Math.max(margin, top)}px`;
            } else {
                // Fallback if no anchor
                this.element.style.display = 'block';
            }

            document.addEventListener('click', this._handleDocumentClick, true);
            document.addEventListener('keydown', this._handleDocumentKeydown, true);

            // Notify callbacks
            this.callbacks.onShow?.();
        }

        _createPanelContainer() {
            return h(`div#${this.style.classes.panel}`, { style: { display: 'none' }, role: 'menu' });
        }

        _renderContent() {
            // 1. Clean up previous render's resources
            this._uiSubscriptions.forEach((unsub) => unsub());
            this._uiSubscriptions = [];

            this.element.textContent = '';

            const cls = { ...this.commonStyleHandle.classes, ...this.style.classes };
            const prefix = this.style.prefix;
            const context = { styles: cls, siteStyles: SITE_STYLES };

            // UIBuilder instance: Pass a wrapper to register transient subscriptions
            const uiDisposer = (unsub) => {
                if (typeof unsub === 'function') {
                    this._uiSubscriptions.push(unsub);
                }
            };
            const ui = new UIBuilder(this.store, context, uiDisposer);

            // --- 1. System Warning Banner ---
            const warningBanner = this._createSystemWarning(ui);

            // --- 2. Applied Theme Section ---
            const themeSection = ui.group('Applied Theme', [ui.button(`${prefix}-theme-name`, 'Loading...', null, { fullWidth: true, title: 'Click to edit this theme' })]);

            // --- 3. Submenu Section ---
            const submenuSection = ui.row(
                [
                    ui.group('Themes', [ui.button(`${prefix}-edit-themes-btn`, 'Edit Themes...', null, { fullWidth: true, title: 'Open the theme editor to create and modify themes.' })]),
                    ui.group('JSON', [ui.button(`${prefix}-json-btn`, 'JSON...', null, { fullWidth: true, title: 'Opens the advanced settings modal to directly edit, import, or export the entire configuration in JSON format.' })]),
                ],
                { className: 'topRow' }
            );

            // --- 4. Options Section ---
            const p = `platforms.${PLATFORM}`;
            const widthConfig = CONSTANTS.SLIDER_CONFIGS.CHAT_WIDTH;
            const sizeCheck = {
                dependencies: [CONSTANTS.STORE_KEYS.SIZE_EXCEEDED_PATH],
                disabledIf: (data) => getPropertyByPath(data, CONSTANTS.STORE_KEYS.SIZE_EXCEEDED_PATH),
            };

            const optionsSection = ui.group(
                'Options',
                [
                    ui.range(`${p}.options.icon_size`, 'Icon size:', 0, CONSTANTS.UI_SPECS.AVATAR.SIZE_OPTIONS.length - 1, {
                        step: 1,
                        tooltip: 'Specifies the size of the chat icons in pixels.',
                        transformValue: (index) => CONSTANTS.UI_SPECS.AVATAR.SIZE_OPTIONS[index] ?? CONSTANTS.UI_SPECS.AVATAR.DEFAULT_SIZE,
                        toInputValue: (pixelVal) => {
                            const idx = CONSTANTS.UI_SPECS.AVATAR.SIZE_OPTIONS.indexOf(pixelVal);
                            return idx !== -1 ? idx : 0;
                        },
                        valueLabelFormatter: (val) => `${val}px`,
                    }),
                    ui.range(`${p}.options.chat_content_max_width`, 'Chat content max width:', widthConfig.MIN, widthConfig.MAX, {
                        step: 1,
                        tooltip: `Adjusts the maximum width of the chat content.\nMove slider to the far left for default.\nRange: ${widthConfig.NULL_THRESHOLD}vw to ${widthConfig.MAX}vw.`,
                        transformValue: (val) => {
                            if (val < widthConfig.NULL_THRESHOLD) return null;
                            return `${val}vw`;
                        },
                        toInputValue: (val) => {
                            if (val === null) return widthConfig.MIN;
                            return parseInt(val, 10);
                        },
                        valueLabelFormatter: (val) => (!val ? 'Auto' : val),
                    }),
                    ui.separator({ className: 'submenuSeparator' }),
                    ui.row([
                        ui.label('Prevent image/avatar overlap:', {
                            title: 'When enabled, adjusts the standing image area to not overlap the avatar icon.\nWhen disabled, the standing image is maximized but may overlap the icon.',
                        }),
                        ui.toggle(`${p}.options.respect_avatar_space`, '', {
                            title: 'When enabled, adjusts the standing image area to not overlap the avatar icon.\nWhen disabled, the standing image is maximized but may overlap the icon.',
                        }),
                    ]),
                ],
                sizeCheck
            );

            // --- 5. Features Section ---
            const featureRows = [];

            // Platform Specific Features (Adapter returns Schema objects, convert them to UIBuilder calls)
            const platformFeatures = PlatformAdapters.SettingsPanel.getPlatformSpecificFeatureToggles();
            platformFeatures.forEach((feat) => {
                featureRows.push(
                    ui.row(
                        [
                            ui.label(feat.label, { title: feat.title }),
                            ui.toggle(feat.configKey, '', {
                                title: feat.title,
                                disabledIf: feat.disabledIf,
                                dependencies: feat.dependencies,
                            }),
                        ],
                        { className: 'featureGroup' }
                    )
                );
            });

            // Common Features
            // Collapsible
            featureRows.push(
                ui.row(
                    [
                        ui.label('Collapsible button', { title: 'Enables a button to collapse large message bubbles.' }),
                        ui.toggle(`${p}.features.collapsible_button.enabled`, '', { title: 'Enables a button to collapse large message bubbles.' }),
                    ],
                    { className: 'featureGroup' }
                )
            );

            // Bubble Nav
            featureRows.push(
                ui.row(
                    [
                        ui.label('Bubble nav buttons', { title: 'Enables navigation buttons (Prev/Next/Top) attached to each message.' }),
                        ui.toggle(`${p}.features.bubble_nav_buttons.enabled`, '', { title: 'Enables navigation buttons (Prev/Next/Top) attached to each message.' }),
                    ],
                    { className: 'featureGroup' }
                )
            );

            // Navigation Console
            featureRows.push(
                ui.row(
                    [
                        ui.label('Navigation console', { title: 'When enabled, a navigation console with message counters will be displayed.' }),
                        ui.toggle(`${p}.features.fixed_nav_console.enabled`, '', { title: 'When enabled, a navigation console with message counters will be displayed.' }),
                    ],
                    { className: 'featureGroup' }
                )
            );

            // Console Position (Select)
            featureRows.push(
                ui.row(
                    [
                        ui.label('Console Position', { title: 'Choose where to display the navigation console.' }),
                        ui.select(`${p}.features.fixed_nav_console.position`, '', {
                            options: [CONSTANTS.CONSOLE_POSITIONS.INPUT_TOP, CONSTANTS.CONSOLE_POSITIONS.HEADER],
                            title: 'Choose where to display the navigation console.\nInput Top: Floating above the input area (Default).\nHeader: Embedded in the top toolbar.',
                            dependencies: [`${p}.features.fixed_nav_console.enabled`],
                            disabledIf: (data) => !getPropertyByPath(data, `${p}.features.fixed_nav_console.enabled`),
                        }),
                    ],
                    { className: 'featureGroup' }
                )
            );

            const featuresSection = ui.group('Features', featureRows, sizeCheck);

            // Assemble
            this.element.append(warningBanner, themeSection, submenuSection, optionsSection, featuresSection);

            this._setupStaticListeners();
            this._setupObservers(ui);
        }

        _createSystemWarning(ui) {
            const warningKey = CONSTANTS.STORE_KEYS.WARNING_MSG_PATH;
            const showKey = CONSTANTS.STORE_KEYS.WARNING_SHOW_PATH;
            const cls = this.commonStyleHandle.classes;

            const container = ui.create('div', { className: cls.warningBanner });

            // Bind content and visibility manually via observe
            ui.observe([warningKey, showKey], (state) => {
                const message = getPropertyByPath(state, warningKey);
                const show = getPropertyByPath(state, showKey);

                container.textContent = message || '';
                container.style.display = show ? '' : 'none';
            });

            return container;
        }

        _setupObservers(ui) {
            const p = `platforms.${PLATFORM}`;
            const widthKey = `${p}.options.chat_content_max_width`;

            // Watch for chat width changes to trigger preview
            // Use UIBuilder's observe to auto-manage lifecycle
            ui.observe(widthKey, (state) => {
                const val = getPropertyByPath(state, widthKey);
                // Trigger preview event
                EventBus.publish(EVENTS.WIDTH_PREVIEW, val);
            });
        }

        _handleDocumentClick(e) {
            const anchor = this.callbacks.getAnchorElement();
            if (this.element && !this.element.contains(e.target) && anchor && !anchor.contains(e.target)) {
                this.hide();
            }
        }

        _handleDocumentKeydown(e) {
            if (e.key === 'Escape') {
                this.hide();
            }
        }

        /**
         * @private
         * Collects data from Store and calls the onSave callback.
         */
        async _handleDebouncedSave() {
            if (!this.store) return;
            const storeData = this.store.getData();
            const newConfig = sanitizeConfigForSave(storeData);
            try {
                await this.callbacks.onSave?.(newConfig);
            } catch (e) {
                Logger.error('UI', '', 'SettingsPanel save failed:', e);
            }
        }

        _setupStaticListeners() {
            const prefix = this.style.prefix;

            // Bind actions for self-static buttons (Theme, JSON, etc.)
            // Note: Use optional chaining or check existence as re-render might change IDs
            const bindClick = (id, handler) => {
                const btn = this.element.querySelector(`#${id}`);
                if (btn) btn.onclick = handler;
            };

            bindClick(`${prefix}-theme-name`, () => {
                if (this.activeThemeSet) {
                    let themeKey = this.activeThemeSet.metadata?.id;
                    if (themeKey === 'default') {
                        themeKey = CONSTANTS.THEME_IDS.DEFAULT;
                    }
                    this.callbacks.onShowThemeModal?.(themeKey || CONSTANTS.THEME_IDS.DEFAULT);
                    this.hide();
                }
            });

            bindClick(`${prefix}-json-btn`, () => {
                this.callbacks.onShowJsonModal?.();
                this.hide();
            });

            bindClick(`${prefix}-edit-themes-btn`, () => {
                this.callbacks.onShowThemeModal?.();
                this.hide();
            });
        }
    }

    /**
     * Manages the JSON editing modal by using the CustomModal component.
     */
    class JsonModalComponent extends UIComponentBase {
        static DEFAULTS = {
            WIDTH: 'min(440px, 95vw)',
        };

        static RESOURCE_KEYS = {
            DEBOUNCE_CALC: 'debounceCalc',
            LISTENERS: 'listeners',
            MODAL: 'modal',
            FILE_READER: 'fileReader',
        };

        constructor(callbacks) {
            super(callbacks);
            this.modal = null;
            this.styleHandle = null;
            this.store = null;

            // Debounced calculator is initialized in _onInit
        }

        _onInit() {
            // Initialize the debounced size calculator as a managed resource
            this.debouncedCalcSize = debounce(this._calculateAndSetSize.bind(this), CONSTANTS.TIMING.DEBOUNCE_DELAYS.SIZE_CALCULATION, true);
            // Debounce the size calculation to avoid heavy operations on every keystroke
            this.manageResource(JsonModalComponent.RESOURCE_KEYS.DEBOUNCE_CALC, this.debouncedCalcSize.cancel);
        }

        render() {
            // No-op
        }

        async open(anchorElement) {
            if (this.modal) return;

            // Inject styles
            this.styleHandle = StyleManager.request(StyleDefinitions.getJsonModal);
            this.commonStyleHandle = StyleManager.request(StyleDefinitions.getCommon);

            const btnClass = this.commonStyleHandle.classes.modalButton;
            const primaryBtnClass = this.commonStyleHandle.classes.primaryBtn;
            const pushRightBtnClass = this.commonStyleHandle.classes.pushRightBtn;
            const cls = this.styleHandle.classes;

            // Initialize Data
            const currentConfig = await this.callbacks.getCurrentConfig();

            // Guard: Stop if component was destroyed during await
            if (this.isDestroyed) return;

            const initialJson = JSON.stringify(currentConfig, null, 2);
            const currentWarning = this.callbacks.getCurrentWarning();
            const { SYSTEM_ROOT, SYSTEM_WARNING } = CONSTANTS.STORE_KEYS;

            this.store = new ReactiveStore({
                jsonString: initialJson,
                status: { text: '', color: '' },
                sizeInfo: { text: 'Checking...', color: '' },
                isProcessing: false,
                [SYSTEM_ROOT]: { [SYSTEM_WARNING]: currentWarning },
            });

            // Prepare Listener Keys
            const warningListenerKey = createEventKey(this, EVENTS.CONFIG_WARNING_UPDATE);
            const configUpdateListenerKey = createEventKey(this, EVENTS.CONFIG_UPDATED);

            // Register cleanup for listeners
            const cleanupListeners = () => {
                this.clearStoreSubscriptions();
                EventBus.unsubscribe(EVENTS.CONFIG_WARNING_UPDATE, warningListenerKey);
                EventBus.unsubscribe(EVENTS.CONFIG_UPDATED, configUpdateListenerKey);
                this._cleanupListeners();
            };
            this.manageResource(JsonModalComponent.RESOURCE_KEYS.LISTENERS, cleanupListeners);

            // Subscribe to jsonString changes to update size info
            const sizeUnsub = this.store.subscribe((state, path) => {
                if (path === 'jsonString') {
                    this.debouncedCalcSize(state.jsonString);
                }
                // Update Button states based on size info and processing status
                if (path === 'sizeInfo' || path === 'jsonString' || path === 'isProcessing') {
                    const isProcessing = state.isProcessing;
                    const isExceeded = state.sizeInfo && state.sizeInfo.color === SITE_STYLES.PALETTE.danger_text;

                    const saveBtn = this.modal?.element?.querySelector(`#${cls.saveBtn}`);
                    const exportBtn = this.modal?.element?.querySelector(`#${cls.exportBtn}`);
                    const importBtn = this.modal?.element?.querySelector(`#${cls.importBtn}`);
                    const cancelBtn = this.modal?.element?.querySelector(`#${cls.cancelBtn}`);

                    // Disable other buttons during processing
                    if (exportBtn instanceof HTMLButtonElement) exportBtn.disabled = isProcessing;
                    if (importBtn instanceof HTMLButtonElement) importBtn.disabled = isProcessing;
                    if (cancelBtn instanceof HTMLButtonElement) cancelBtn.disabled = isProcessing;

                    if (saveBtn instanceof HTMLButtonElement) {
                        // Save is disabled if processing OR size exceeded
                        const shouldDisable = isProcessing || isExceeded;
                        saveBtn.disabled = shouldDisable;

                        if (isProcessing) {
                            saveBtn.style.opacity = '0.5';
                            saveBtn.style.cursor = 'wait';
                        } else if (isExceeded) {
                            saveBtn.title = 'Cannot save: Configuration size limit exceeded.';
                            saveBtn.style.opacity = '0.5';
                            saveBtn.style.cursor = 'not-allowed';
                            // Show warning status
                            this.store.set('status', {
                                text: 'Size Limit Exceeded: Save disabled.',
                                color: SITE_STYLES.PALETTE.danger_text,
                            });
                        } else {
                            saveBtn.title = 'Apply changes and close.';
                            saveBtn.style.opacity = '';
                            saveBtn.style.cursor = '';
                            // Clear warning status if it was set by this check
                            const currentStatus = this.store.get('status');
                            if (currentStatus && currentStatus.text === 'Size Limit Exceeded: Save disabled.') {
                                this.store.set('status', { text: '', color: '' });
                            }
                        }
                    }

                    // Update global cursor
                    if (this.modal?.element) {
                        this.modal.element.style.cursor = isProcessing ? 'wait' : '';
                    }
                }
            });
            // Register the unsubscribe callback for cleanup
            this.addStoreSubscription(sizeUnsub);

            // Subscribe to warning updates
            EventBus.subscribe(
                EVENTS.CONFIG_WARNING_UPDATE,
                (payload) => {
                    if (this.store) {
                        this.store.set(CONSTANTS.STORE_KEYS.WARNING_PATH, payload);
                    }
                },
                warningListenerKey
            );

            // Subscribe to remote configuration updates to support "Reload UI" functionality
            EventBus.subscribe(
                EVENTS.CONFIG_UPDATED,
                async (newConfig) => {
                    const newJson = JSON.stringify(newConfig, null, 2);
                    if (this.store) {
                        this.store.set('jsonString', newJson);
                        // Reset status
                        this.store.set('status', {
                            text: 'Refreshed from storage.',
                            color: SITE_STYLES.PALETTE.accent_text,
                        });
                    }
                    // Clear conflict notification if present
                    if (this.modal && this.modal.dom.footerMessage) {
                        this.modal.dom.footerMessage.textContent = '';
                        this.modal.dom.footerMessage.classList.remove(this.commonStyleHandle.classes.conflictText);
                    }
                },
                configUpdateListenerKey
            );

            this.modal = new CustomModal({
                title: `${APPNAME} Settings`,
                width: JsonModalComponent.DEFAULTS.WIDTH, // Responsive width
                id: this.styleHandle.classes.dialogId,
                zIndex: SITE_STYLES.Z_INDICES.JSON_MODAL,
                closeOnBackdropClick: false,
                buttons: [
                    { text: 'Export', id: cls.exportBtn, className: btnClass, title: 'Export current settings to a JSON file.', onClick: () => this._handleExport() },
                    { text: 'Import', id: cls.importBtn, className: btnClass, title: 'Click to replace settings.\nHold [Ctrl] to append themes (keep existing).', onClick: (modal, e) => this._handleImport(e.ctrlKey) },
                    { text: 'Cancel', id: cls.cancelBtn, className: `${btnClass} ${pushRightBtnClass}`, title: 'Close without saving.', onClick: () => this.close() },
                    { text: 'Save', id: cls.saveBtn, className: `${btnClass} ${primaryBtnClass}`, title: 'Apply changes and close.', onClick: () => this._handleSave() },
                ],
                onDestroy: () => {
                    // When the modal is closed (by user or code), ensure all temporary resources are disposed via the manager.
                    this.manageResource(JsonModalComponent.RESOURCE_KEYS.MODAL, null);
                    this.manageResource(JsonModalComponent.RESOURCE_KEYS.LISTENERS, null);
                    this.manageResource(JsonModalComponent.RESOURCE_KEYS.FILE_READER, null);

                    this.store = null;
                    this.modal = null;
                },
            });

            // Register Modal as a managed resource
            this.manageResource(JsonModalComponent.RESOURCE_KEYS.MODAL, this.modal);

            this._setupKeyboardListeners(cls, primaryBtnClass);

            const contentContainer = this.modal.getContentContainer();

            // --- UI Rendering using UIBuilder ---
            const context = {
                styles: { ...this.commonStyleHandle.classes, ...this.styleHandle.classes },
            };
            const ui = new UIBuilder(this.store, context, this.addStoreSubscription.bind(this));

            contentContainer.style.padding = '8px';
            const content = this._renderJsonContent(ui);
            contentContainer.appendChild(content);

            // Initial size calculation
            this._calculateAndSetSize(initialJson);

            this.callbacks.onModalOpen?.();
            this.modal.show(anchorElement);

            // Focus handling
            requestAnimationFrame(() => {
                const textarea = contentContainer.querySelector('textarea');
                if (textarea) {
                    textarea.focus();
                    textarea.scrollTop = 0;
                    textarea.selectionStart = 0;
                    textarea.selectionEnd = 0;
                }
            });
        }

        _renderJsonContent(ui) {
            const cls = ui.context.styles;
            const container = document.createDocumentFragment();

            // 1. JSON Editor
            const textarea = ui.create('textarea', {
                className: cls.jsonEditor,
                spellcheck: false,
            });

            // Manual binding for code editor
            ui.observe('jsonString', (state) => {
                // Prevent cursor jumping if user is typing
                if (document.activeElement === textarea) return;
                textarea.value = state.jsonString || '';
            });

            textarea.addEventListener('input', (e) => {
                // Update store (which triggers size calculation)
                ui.store.set('jsonString', e.target.value);
            });

            const editorField = ui.container([textarea], { className: cls.formField });
            container.appendChild(editorField);

            // 2. Status Bar
            const statusMsg = ui.create('div', { className: 'status-msg-display' });
            const sizeInfo = ui.create('div', { className: 'size-info-display' });

            ui.observe(['status', 'sizeInfo'], (state) => {
                const status = state.status || {};
                const info = state.sizeInfo || {};

                // Update Status Message
                if (statusMsg.textContent !== (status.text || '')) {
                    statusMsg.textContent = status.text || '';
                    statusMsg.style.color = status.color || '';
                }

                // Update Size Info
                if (sizeInfo.textContent !== (info.text || '')) {
                    sizeInfo.textContent = info.text || '';
                    sizeInfo.style.color = info.color || '';
                    sizeInfo.style.fontWeight = info.bold ? 'bold' : 'normal';
                }
            });

            const statusRow = ui.container([statusMsg, sizeInfo], { className: cls.statusContainer });
            container.appendChild(statusRow);

            return container;
        }

        close() {
            this.modal?.close();
        }

        _onDestroy() {
            // BaseManager handles disposal of MODAL, LISTENERS, FILE_READER and DEBOUNCE_CALC via managed resources.
            this.styleHandle = null;
            this.store = null;
            this.modal = null;
            super._onDestroy();
        }

        _setupKeyboardListeners(cls, primaryBtnClass) {
            let isCtrlPressed = false;
            let isHovered = false;
            let isFocused = false;

            // Capture the button element immediately as it exists in the modal
            const importBtn = this.modal?.element?.querySelector(`#${cls.importBtn}`);
            if (!importBtn) return;

            const updateButtonState = () => {
                // Only switch to Append mode if Ctrl is pressed AND the button is being interacted with
                const shouldAppend = isCtrlPressed && (isHovered || isFocused);
                const currentText = importBtn.textContent;
                const targetText = shouldAppend ? 'Append' : 'Import';

                if (currentText !== targetText) {
                    importBtn.textContent = targetText;
                    importBtn.classList.toggle(primaryBtnClass, shouldAppend);
                }
            };

            // Global key listener for Ctrl state
            this._keyListener = (e) => {
                if (e.key === 'Control') {
                    isCtrlPressed = e.type === 'keydown';
                    updateButtonState();
                }
            };
            document.addEventListener('keydown', this._keyListener);
            document.addEventListener('keyup', this._keyListener);

            // Window focus listener to reset state (safety)
            this._focusListener = () => {
                isCtrlPressed = false;
                updateButtonState();
            };
            window.addEventListener('focus', this._focusListener);

            // Button-specific interaction listeners
            // Note: These do not need explicit removal in _cleanupListeners because
            // the button element itself is destroyed when the modal is closed.
            importBtn.addEventListener('mouseenter', () => {
                isHovered = true;
                updateButtonState();
            });
            importBtn.addEventListener('mouseleave', () => {
                isHovered = false;
                updateButtonState();
            });
            importBtn.addEventListener('focus', () => {
                isFocused = true;
                updateButtonState();
            });
            importBtn.addEventListener('blur', () => {
                isFocused = false;
                updateButtonState();
            });
        }

        _cleanupListeners() {
            if (this._keyListener) {
                document.removeEventListener('keydown', this._keyListener);
                document.removeEventListener('keyup', this._keyListener);
                this._keyListener = null;
            }
            if (this._focusListener) {
                window.removeEventListener('focus', this._focusListener);
                this._focusListener = null;
            }
        }

        _calculateAndSetSize(text) {
            if (!this.store) return;

            let sizeInBytes = 0;
            let isRaw = false;

            try {
                const obj = JSON.parse(text);
                const minified = JSON.stringify(obj);
                sizeInBytes = new Blob([minified]).size;
            } catch {
                sizeInBytes = new Blob([text]).size;
                isRaw = true;
            }

            const sizeStr = this._formatBytes(sizeInBytes);
            const recommendedStr = this._formatBytes(CONSTANTS.STORAGE_SETTINGS.CONFIG_SIZE_RECOMMENDED_LIMIT_BYTES);
            const limitStr = this._formatBytes(CONSTANTS.STORAGE_SETTINGS.CONFIG_SIZE_LIMIT_BYTES);
            const displayStr = `${isRaw ? '(Raw) ' : ''}${sizeStr} / ${recommendedStr} (Max: ${limitStr})`;

            let color = '';
            if (sizeInBytes >= CONSTANTS.STORAGE_SETTINGS.CONFIG_SIZE_LIMIT_BYTES) {
                color = SITE_STYLES.PALETTE.danger_text;
            } else if (sizeInBytes >= CONSTANTS.STORAGE_SETTINGS.CONFIG_SIZE_RECOMMENDED_LIMIT_BYTES) {
                color = '#ff9800'; // Warning color
            }

            this.store.set('sizeInfo', {
                text: displayStr,
                color: color,
                bold: !!color,
            });
        }

        _formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        async _handleSave() {
            if (!this.store) return;
            this.store.set('isProcessing', true);
            const jsonString = this.store.get('jsonString');

            // Reset status
            this.store.set('status', { text: '', color: '' });

            try {
                const obj = JSON.parse(jsonString);
                await this.callbacks.onSave(obj);
                this.close();
            } catch (e) {
                this.store.set('status', {
                    text: e.message,
                    color: SITE_STYLES.PALETTE.danger_text,
                });
            } finally {
                if (this.store) {
                    this.store.set('isProcessing', false);
                }
            }
        }

        async _handleExport() {
            if (!this.store) return;
            this.store.set('status', { text: '', color: '' });

            try {
                const config = await this.callbacks.getCurrentConfig();
                const jsonString = JSON.stringify(config, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = h('a', { href: url, download: `${APPID}_config.json` });

                if (a instanceof HTMLElement) a.click();

                setTimeout(() => URL.revokeObjectURL(url), CONSTANTS.TIMING.TIMEOUTS.BLOB_URL_REVOKE_DELAY);

                this.store.set('status', {
                    text: 'Export successful.',
                    color: SITE_STYLES.PALETTE.accent_text,
                });
            } catch (e) {
                this.store.set('status', {
                    text: `Export failed: ${e.message}`,
                    color: SITE_STYLES.PALETTE.danger_text,
                });
            }
        }

        _handleImport(isAppend) {
            if (!this.store) return;
            const fileInput = h('input', {
                type: 'file',
                accept: 'application/json',
                onchange: (event) => {
                    const target = event.target;
                    if (!(target instanceof HTMLInputElement)) return;
                    const file = target.files?.[0];
                    target.value = '';
                    if (!file) return;

                    const reader = new FileReader();

                    // Register FileReader as a managed resource to allow auto-abort on destroy/re-run
                    this.manageResource(JsonModalComponent.RESOURCE_KEYS.FILE_READER, reader);

                    reader.onload = async (e) => {
                        // Guard: Check if destroyed during file read
                        if (this.isDestroyed || !this.store) return;

                        this.store.set('status', { text: 'Processing...', color: '' });
                        this.store.set('isProcessing', true);

                        requestAnimationFrame(async () => {
                            // Guard: Check if destroyed during animation frame
                            if (this.isDestroyed || !this.store) return;

                            try {
                                const result = e.target?.result;
                                if (typeof result !== 'string') throw new Error('Invalid file');

                                const importedConfig = JSON.parse(result);
                                if (!importedConfig || typeof importedConfig !== 'object' || Array.isArray(importedConfig)) {
                                    throw new Error('Invalid JSON structure');
                                }

                                let baseConfig;
                                if (isAppend) {
                                    try {
                                        // Append Mode: Use current editor content as base
                                        const currentEditorJson = this.store.get('jsonString');
                                        baseConfig = JSON.parse(currentEditorJson);
                                    } catch {
                                        throw new Error('Cannot append: Editor contains invalid JSON. Please fix it before appending.');
                                    }
                                } else {
                                    // Replace Mode: Use default config as base (reset)
                                    baseConfig = DEFAULT_THEME_CONFIG;
                                }

                                const mergedConfig = deepClone(baseConfig);

                                if (!isAppend) mergedConfig.themeSets = [];

                                // --- Theme Import Logic ---
                                if (Array.isArray(importedConfig.themeSets)) {
                                    if (isAppend) {
                                        // Append Mode: Ignore Import IDs, Assign New IDs, Append All
                                        importedConfig.themeSets.forEach((importedTheme) => {
                                            if (!importedTheme || typeof importedTheme !== 'object') return;
                                            if (!importedTheme.metadata) importedTheme.metadata = {};

                                            // Always generate a new unique ID to avoid collision with existing themes
                                            importedTheme.metadata.id = generateUniqueId('theme');
                                            mergedConfig.themeSets.push(importedTheme);
                                        });
                                    } else {
                                        // Replace Mode: Preserve Import IDs (dedupe within file only)
                                        const processedIds = new Set();
                                        importedConfig.themeSets.forEach((importedTheme) => {
                                            if (!importedTheme || typeof importedTheme !== 'object') return;
                                            if (!importedTheme.metadata) importedTheme.metadata = {};
                                            if (!importedTheme.metadata.id) importedTheme.metadata.id = generateUniqueId('theme');

                                            const id = importedTheme.metadata.id;
                                            // If ID is duplicated within the import file itself, regenerate it
                                            if (processedIds.has(id)) {
                                                const newId = generateUniqueId('theme');
                                                importedTheme.metadata.id = newId;
                                                mergedConfig.themeSets.push(importedTheme);
                                                processedIds.add(newId);
                                            } else {
                                                mergedConfig.themeSets.push(importedTheme);
                                                processedIds.add(id);
                                            }
                                        });
                                    }
                                }

                                ['developer', 'platforms'].forEach((key) => {
                                    if (importedConfig[key] !== undefined && isObject(importedConfig[key])) {
                                        if (!mergedConfig[key]) mergedConfig[key] = {};
                                        resolveConfig(mergedConfig[key], importedConfig[key]);
                                    }
                                });

                                const finalConfig = deepClone(DEFAULT_THEME_CONFIG);
                                resolveConfig(finalConfig, mergedConfig);
                                ConfigProcessor.process(finalConfig);

                                const jsonString = JSON.stringify(finalConfig, null, 2);

                                // Update Store (which updates UI)
                                this.store.set('jsonString', jsonString);

                                const statusText = isAppend ? 'Import appended to current view. Repeat to add more, or click "Save" to apply.' : 'Import successful. Click "Save" to apply.';

                                this.store.set('status', {
                                    text: statusText,
                                    color: SITE_STYLES.PALETTE.accent_text,
                                });
                            } catch (err) {
                                this.store.set('status', {
                                    text: `Import failed: ${err.message}`,
                                    color: SITE_STYLES.PALETTE.danger_text,
                                });
                            } finally {
                                if (this.store) {
                                    this.store.set('isProcessing', false);
                                }
                                // Clean up the file reader resource
                                this.manageResource(JsonModalComponent.RESOURCE_KEYS.FILE_READER, null);
                            }
                        });
                    };

                    this.store.set('status', { text: 'Reading file...', color: '' });
                    reader.readAsText(file);
                },
            });

            if (fileInput instanceof HTMLElement) {
                fileInput.click();
            }
        }
    }

    /**
     * @class ThemeService
     * @description Encapsulates business logic for theme operations (CRUD).
     * Operates on AppConfig objects and returns updated states.
     */
    class ThemeService {
        /**
         * Creates a new theme.
         * @param {AppConfig} config The current configuration.
         * @returns {{ config: AppConfig, newThemeId: string }}
         */
        static create(config) {
            const newConfig = deepClone(config);
            const existingNames = new Set(newConfig.themeSets.map((t) => t.metadata.name?.trim().toLowerCase()));
            const newName = proposeUniqueName('New Theme', existingNames);
            const newId = generateUniqueId('theme');

            // Use defaultSet as a template to ensure the correct structure (keys).
            const defaultSet = newConfig.platforms[PLATFORM].defaultSet;
            const emptyTheme = deepClone(defaultSet);

            // Recursively set all configuration values to null to signify "inherit from default".
            const nullify = (obj) => {
                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                            nullify(obj[key]);
                        } else {
                            obj[key] = null;
                        }
                    }
                }
            };
            nullify(emptyTheme);

            /** @type {ThemeSet} */
            const newTheme = {
                ...emptyTheme,
                metadata: {
                    id: newId,
                    name: newName,
                    matchPatterns: [],
                    urlPatterns: [],
                },
            };

            newConfig.themeSets.push(newTheme);
            return { config: newConfig, newThemeId: newId };
        }

        /**
         * Copies an existing theme.
         * @param {AppConfig} config
         * @param {string} sourceId
         * @returns {{ config: AppConfig, newThemeId: string } | null}
         */
        static copy(config, sourceId) {
            const newConfig = deepClone(config);
            const isDefault = sourceId === CONSTANTS.THEME_IDS.DEFAULT;

            let sourceThemeContent;
            let baseName;
            let sourceMatchPatterns = [];
            let sourceUrlPatterns = [];

            if (isDefault) {
                sourceThemeContent = newConfig.platforms[PLATFORM].defaultSet;
                baseName = 'Default';
            } else {
                const found = newConfig.themeSets.find((t) => t.metadata.id === sourceId);
                if (!found) return null;
                sourceThemeContent = found;
                baseName = found.metadata.name || 'Theme';
                sourceMatchPatterns = found.metadata.matchPatterns || [];
                sourceUrlPatterns = found.metadata.urlPatterns || [];
            }

            const existingNames = new Set(newConfig.themeSets.map((t) => t.metadata.name?.trim().toLowerCase()));
            const newName = proposeUniqueName(baseName, existingNames);
            const newId = generateUniqueId('theme');

            // Construct new theme ensuring ThemeSet type compliance
            /** @type {ThemeSet} */
            const newTheme = {
                ...deepClone(sourceThemeContent),
                metadata: {
                    id: newId,
                    name: newName,
                    matchPatterns: [...sourceMatchPatterns],
                    urlPatterns: [...sourceUrlPatterns],
                },
            };

            let insertIndex = 0;
            if (!isDefault) {
                const currentIndex = newConfig.themeSets.findIndex((t) => t.metadata.id === sourceId);
                if (currentIndex !== -1) {
                    insertIndex = currentIndex + 1;
                }
            }
            newConfig.themeSets.splice(insertIndex, 0, newTheme);

            return { config: newConfig, newThemeId: newId };
        }

        /**
         * Deletes a theme.
         * @param {AppConfig} config
         * @param {string} themeId
         * @returns {{ config: AppConfig, nextActiveId: string }}
         */
        static delete(config, themeId) {
            const newConfig = deepClone(config);
            let nextActiveId = CONSTANTS.THEME_IDS.DEFAULT;

            const currentIndex = newConfig.themeSets.findIndex((t) => t.metadata.id === themeId);
            const currentLength = newConfig.themeSets.length;

            if (currentLength > 1) {
                if (currentIndex === currentLength - 1) {
                    nextActiveId = newConfig.themeSets[currentIndex - 1].metadata.id;
                } else {
                    nextActiveId = newConfig.themeSets[currentIndex + 1].metadata.id;
                }
            }

            newConfig.themeSets = newConfig.themeSets.filter((t) => t.metadata.id !== themeId);
            return { config: newConfig, nextActiveId };
        }

        /**
         * Moves a theme in the list.
         * @param {AppConfig} config
         * @param {string} themeId
         * @param {number} direction -1 or 1
         * @returns {AppConfig | null} Returns null if move is invalid
         */
        static move(config, themeId, direction) {
            if (themeId === CONSTANTS.THEME_IDS.DEFAULT) return null;

            const newConfig = deepClone(config);
            const currentIndex = newConfig.themeSets.findIndex((t) => t.metadata.id === themeId);

            if (currentIndex === -1) return null;

            const newIndex = currentIndex + direction;
            if (newIndex < 0 || newIndex >= newConfig.themeSets.length) return null;

            const item = newConfig.themeSets.splice(currentIndex, 1)[0];
            newConfig.themeSets.splice(newIndex, 0, item);

            return newConfig;
        }

        /**
         * Renames a theme.
         * @param {AppConfig} config
         * @param {string} themeId
         * @param {string} newName
         * @returns {AppConfig}
         * @throws {Error} If validation fails
         */
        static rename(config, themeId, newName) {
            const trimmedName = newName.trim();
            if (!trimmedName) {
                throw new Error('Theme name cannot be empty.');
            }

            const newConfig = deepClone(config);

            const isNameTaken = newConfig.themeSets.some((t) => t.metadata.id !== themeId && t.metadata.name?.toLowerCase() === trimmedName.toLowerCase());

            if (isNameTaken) {
                throw new Error(`Name "${trimmedName}" is already in use.`);
            }

            const theme = newConfig.themeSets.find((t) => t.metadata.id === themeId);
            if (theme) {
                theme.metadata.name = trimmedName;
            }

            return newConfig;
        }
    }

    /**
     * Manages the Theme Settings modal by leveraging the CustomModal component.
     */
    class ThemeModalComponent extends UIComponentBase {
        static UI_MODES = {
            NORMAL: 'NORMAL',
            RENAMING: 'RENAMING_THEME',
            DELETING: 'CONFIRM_DELETE',
        };
        static DEFAULTS = {
            WIDTH: 'min(880px, 95vw)',
        };

        static RESOURCE_KEYS = {
            MODAL: 'modal',
            PREVIEW_CTRL: 'previewCtrl',
            LISTENERS: 'listeners',
        };

        constructor(callbacks) {
            super(callbacks);
            this.modal = null;
            this.dataConverter = callbacks.dataConverter;
            this.checkSize = callbacks.checkSize;
            this.store = null;
            this.previewController = null;
            this.style = null; // Style handle will be stored here

            // Centralized state management
            this.state = {
                activeThemeKey: null,
                uiMode: ThemeModalComponent.UI_MODES.NORMAL, // 'NORMAL', 'RENAMING_THEME', 'CONFIRM_DELETE'
                pendingDeletionKey: null,
                config: null, // Holds the working copy of the config
                isSizeExceeded: false,
                isSaving: false,
            };
        }

        render() {
            // No-op: DOM generation is delegated to CustomModal in open().
        }

        /**
         * Opens the theme modal for the specified theme or default set.
         * @param {string} [selectThemeKey] - The ID of the theme to select initially.
         */
        async open(selectThemeKey) {
            if (this.modal) return;

            // 1. Request all necessary styles upfront
            this.commonStyle = StyleManager.request(StyleDefinitions.getCommon);
            this.style = StyleManager.request(StyleDefinitions.getThemeModal);
            this.pickerStyle = StyleManager.request(StyleDefinitions.getColorPicker);

            const initialConfig = await this.callbacks.getCurrentConfig();

            // Guard: Stop if component was destroyed during await
            if (this.isDestroyed) return;
            if (!initialConfig) return;

            const { isExceeded } = this.checkSize(initialConfig);

            // Initialize state for the new session
            this.state = {
                activeThemeKey: selectThemeKey || CONSTANTS.THEME_IDS.DEFAULT,
                uiMode: ThemeModalComponent.UI_MODES.NORMAL,
                pendingDeletionKey: null,
                config: deepClone(initialConfig), // Create a deep copy for editing
                isSizeExceeded: isExceeded,
                isSaving: false,
            };

            const primaryBtnClass = this.commonStyle.classes.primaryBtn;
            const cls = this.style.classes;

            // Prepare Listener Keys
            const warningListenerKey = createEventKey(this, EVENTS.CONFIG_WARNING_UPDATE);
            const configUpdateListenerKey = createEventKey(this, EVENTS.CONFIG_UPDATED);

            // Register cleanup for listeners
            const cleanupListeners = () => {
                this.clearStoreSubscriptions();
                EventBus.unsubscribe(EVENTS.CONFIG_WARNING_UPDATE, warningListenerKey);
                EventBus.unsubscribe(EVENTS.CONFIG_UPDATED, configUpdateListenerKey);
            };
            this.manageResource(ThemeModalComponent.RESOURCE_KEYS.LISTENERS, cleanupListeners);

            // Subscribe to warning updates
            EventBus.subscribe(
                EVENTS.CONFIG_WARNING_UPDATE,
                (payload) => {
                    if (this.store) {
                        this.store.set(CONSTANTS.STORE_KEYS.WARNING_PATH, payload);
                    }
                },
                warningListenerKey
            );

            // Subscribe to remote configuration updates to support "Reload UI" functionality
            EventBus.subscribe(
                EVENTS.CONFIG_UPDATED,
                async (newConfig) => {
                    // Guard: Skip UI refresh if we are currently saving changes ourselves.
                    // This prevents resetting the scroll position and focus processing during "Apply".
                    if (this.state.isSaving) return;

                    // Update internal state with new config
                    this.state.config = deepClone(newConfig);
                    const sizeInfo = this.checkSize(newConfig);
                    this.state.isSizeExceeded = sizeInfo.isExceeded;

                    // Re-initialize form with current active key (or fallback if deleted)
                    const themeExists = this.state.activeThemeKey === CONSTANTS.THEME_IDS.DEFAULT || this.state.config.themeSets.some((t) => t.metadata.id === this.state.activeThemeKey);

                    if (!themeExists) {
                        this.state.activeThemeKey = CONSTANTS.THEME_IDS.DEFAULT;
                    }

                    // Refresh form and UI
                    await this._initFormWithTheme(this.state.activeThemeKey);
                    this._renderUI();

                    // Clear conflict notification if present
                    if (this.modal && this.modal.dom.footerMessage) {
                        this.modal.dom.footerMessage.textContent = '';
                        this.modal.dom.footerMessage.classList.remove(this.commonStyle.classes.conflictText);
                    }
                },
                configUpdateListenerKey
            );

            this.modal = new CustomModal({
                title: `${APPNAME} - Theme settings`,
                width: ThemeModalComponent.DEFAULTS.WIDTH,
                id: this.style.classes.dialogId,
                zIndex: CONSTANTS.Z_INDICES.THEME_MODAL,
                closeOnBackdropClick: false,
                buttons: [
                    { text: 'Cancel', id: cls.cancelBtn, className: ``, title: 'Discard changes and close the modal.', onClick: () => this.close() },
                    { text: 'Apply', id: cls.applyBtn, className: ``, title: 'Save changes and keep the modal open.', onClick: () => this._handleThemeAction(false) },
                    { text: 'Save', id: cls.saveBtn, className: primaryBtnClass, title: 'Save changes and close the modal.', onClick: () => this._handleThemeAction(true) },
                ],
                onDestroy: () => {
                    // When the modal is closed (by user or code), ensure all temporary resources are disposed via the manager.
                    this.manageResource(ThemeModalComponent.RESOURCE_KEYS.MODAL, null);
                    this.manageResource(ThemeModalComponent.RESOURCE_KEYS.PREVIEW_CTRL, null);
                    this.manageResource(ThemeModalComponent.RESOURCE_KEYS.LISTENERS, null);

                    this.store = null;
                    this.modal = null;
                    this.previewController = null;
                    // Release memory: Clear the temporary state containing the config copy
                    this.state = {
                        activeThemeKey: null,
                        uiMode: ThemeModalComponent.UI_MODES.NORMAL,
                        pendingDeletionKey: null,
                        config: null,
                        isSizeExceeded: false,
                        isSaving: false,
                    };
                },
            });

            // Register Modal as a managed resource
            this.manageResource(ThemeModalComponent.RESOURCE_KEYS.MODAL, this.modal);

            const headerControls = this._createHeaderControls();
            const mainContent = this._createMainContent();

            // Override base modal styles for specific layout needs
            Object.assign(this.modal.dom.header.style, {
                borderBottom: `1px solid ${SITE_STYLES.PALETTE.border}`,
                paddingBottom: CONSTANTS.UI_SPECS.THEME_MODAL_HEADER_PADDING,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '12px',
            });
            Object.assign(this.modal.dom.footer.style, {
                borderTop: `1px solid ${SITE_STYLES.PALETTE.border}`,
                paddingTop: CONSTANTS.UI_SPECS.THEME_MODAL_FOOTER_PADDING,
            });
            this.modal.dom.header.appendChild(headerControls);
            this.modal.setContent(mainContent);

            this._setupEventListeners();

            // Initialize Store and Form Engine with current theme
            await this._initFormWithTheme(this.state.activeThemeKey);

            // Connect Controller to DOM
            this.previewController = new ThemePreviewController(this.modal.element, this.store, initialConfig.platforms[PLATFORM].defaultSet);
            this.manageResource(ThemeModalComponent.RESOURCE_KEYS.PREVIEW_CTRL, this.previewController);

            // Sync initial mode.
            this.previewController.setIsEditingDefault(this.state.activeThemeKey === CONSTANTS.THEME_IDS.DEFAULT);

            this.callbacks.onModalOpen?.();

            this._renderUI(); // Update header controls

            this.modal.show(null);
            requestAnimationFrame(() => {
                const scrollableArea = this.modal.element.querySelector(`.${this.style.classes.scrollableArea}`);
                if (scrollableArea) scrollableArea.scrollTop = 0;
            });
        }

        _onDestroy() {
            // BaseManager handles disposal of managed resources.
            // Only non-managed references need explicit clearing here.
            this.style = null;
            this.commonStyle = null;
            this.pickerStyle = null;
            super._onDestroy();
        }

        close() {
            this.modal?.close();
        }

        _getCurrentThemeData(config, key) {
            if (key === CONSTANTS.THEME_IDS.DEFAULT) {
                return config.platforms[PLATFORM].defaultSet;
            }
            const found = config.themeSets.find((t) => t.metadata.id === key);
            return found || {};
        }

        async _initFormWithTheme(themeKey) {
            // Guard: Check if destroyed before proceeding (especially if called after async op)
            if (this.isDestroyed || !this.state.config) return;

            // Clear old subscriptions before re-initializing the form to prevent memory leaks
            this.clearStoreSubscriptions();

            const initialTheme = this._getCurrentThemeData(this.state.config, themeKey);
            const currentWarning = this.callbacks.getCurrentWarning();
            const { SYSTEM_ROOT, SYSTEM_WARNING } = CONSTANTS.STORE_KEYS;

            // Merge system state into the theme data
            const storeState = {
                ...initialTheme,
                [SYSTEM_ROOT]: { [SYSTEM_WARNING]: currentWarning },
            };

            if (!this.store) {
                this.store = new ReactiveStore(storeState);
            } else {
                this.store.replaceState(storeState);
            }

            const contentArea = this.modal.element.querySelector(`.${this.style.classes.content}`);
            if (contentArea) {
                contentArea.textContent = '';

                const context = {
                    styles: {
                        ...this.commonStyle.classes,
                        ...this.style.classes,
                        ...this.pickerStyle.classes,
                    },
                    siteStyles: SITE_STYLES,
                    fileHandler: this._handleLocalFileSelect.bind(this),
                };

                const ui = new UIBuilder(this.store, context, this.addStoreSubscription.bind(this));

                // Render the entire form structure
                const formContent = this._renderThemeForm(ui, themeKey);
                contentArea.appendChild(formContent);

                // Add error monitoring to auto-clear footer message
                this.addStoreSubscription(
                    this.store.subscribe((state, path) => {
                        // Check if the update is related to errors
                        if (path && path.startsWith(CONSTANTS.STORE_KEYS.ERRORS_PATH)) {
                            const errors = getPropertyByPath(state, CONSTANTS.STORE_KEYS.ERRORS_PATH) || {};
                            // Check if any error still exists
                            const hasError = Object.values(errors).some((val) => val && val.message);

                            const footerMessage = this.modal?.dom?.footerMessage;
                            // Only clear if it matches the validation error message
                            if (footerMessage && !hasError && footerMessage.textContent === 'Please correct the errors above.') {
                                footerMessage.textContent = '';
                            }
                        }
                    })
                );

                // Re-initialize preview controller to bind to new DOM elements
                // First, dispose the old one
                this.manageResource(ThemeModalComponent.RESOURCE_KEYS.PREVIEW_CTRL, null);

                // Create new one with the current store and default set
                this.previewController = new ThemePreviewController(this.modal.element, this.store, this.state.config.platforms[PLATFORM].defaultSet);
                // Sync mode
                this.previewController.setIsEditingDefault(themeKey === CONSTANTS.THEME_IDS.DEFAULT);

                this.manageResource(ThemeModalComponent.RESOURCE_KEYS.PREVIEW_CTRL, this.previewController);
            }
        }

        /**
         * @private
         * Renders the theme editor form using UIBuilder.
         */
        /**
         * @private
         * Renders the theme editor form using UIBuilder.
         */
        _renderThemeForm(ui, themeKey) {
            const isNotDefault = themeKey !== CONSTANTS.THEME_IDS.DEFAULT;

            const fragments = [];

            // 1. General Settings (Patterns) - Only for custom themes
            if (isNotDefault) {
                const patternsGroup = ui.container(
                    [
                        ui.textarea('metadata.matchPatterns', 'Title Patterns (one per line):', {
                            tooltip: 'Enter one RegEx pattern per line to automatically apply this theme (e.g., /My Project/i).\nNote: "g" (global) and "y" (sticky) flags are ignored for performance.',
                            rows: 3,
                            transformValue: (val) => (val ? val.split('\n') : []),
                            toInputValue: (val) => (Array.isArray(val) ? val.join('\n') : val || ''),
                        }),
                        ui.textarea('metadata.urlPatterns', 'URL Patterns (one per line):', {
                            tooltip: 'Enter one RegEx pattern per line to match against the decoded URL path.\nExample: /\\/c\\/.*$/i\nNote: "g" (global) and "y" (sticky) flags are ignored for performance.',
                            rows: 3,
                            transformValue: (val) => (val ? val.split('\n') : []),
                            toInputValue: (val) => (Array.isArray(val) ? val.join('\n') : val || ''),
                        }),
                    ],
                    { className: 'compoundFormFieldContainer' }
                ); // Grid layout for patterns

                fragments.push(ui.container([patternsGroup], { className: 'generalSettings' }));
                fragments.push(ui.separator({ className: 'separator' }));
            }

            // 2. Actor & Window Settings Grid
            const gridContent = ui.container([this._renderActorGroup(ui, 'assistant', 'Assistant'), this._renderActorGroup(ui, 'user', 'User'), this._renderWindowGroup(ui), this._renderInputGroup(ui)], { className: 'grid' });

            fragments.push(gridContent);

            return ui.container(fragments, { className: 'scrollableArea' });
        }

        _renderActorGroup(ui, actor, title) {
            const prefix = actor;
            const bubbleWidthConfig = CONSTANTS.SLIDER_CONFIGS.BUBBLE_MAX_WIDTH;

            // Helper for pixel transformers
            const pxTransform = {
                transformValue: (val) => (val < 0 ? null : `${val}px`),
                toInputValue: (val) => {
                    if (typeof val === 'string' && val.endsWith('px')) {
                        const match = String(val).match(/^(-?\d+)/);
                        if (match) return parseInt(match[1], 10);
                        return -1;
                    }
                    if (typeof val === 'number') return val;
                    return -1; // null -> -1 (Auto)
                },
                valueLabelFormatter: (val) => (val === null ? 'Auto' : val),
            };

            return ui.group(title, [
                ui.text(`${prefix}.name`, 'Name:', { tooltip: `The name displayed for the ${actor}.`, fieldType: 'name' }),
                ui.text(`${prefix}.icon`, 'Icon:', { tooltip: `URL, Data URI, or <svg> for the ${actor}'s icon.`, fieldType: 'icon' }),
                ui.text(`${prefix}.standingImageUrl`, 'Standing image:', { tooltip: `URL or Data URI for the character's standing image.`, fieldType: 'image' }),

                ui.group('Bubble Settings', [
                    ui.color(`${prefix}.bubbleBackgroundColor`, 'Background color:', { tooltip: 'Background color of the message bubble.' }),
                    ui.color(`${prefix}.textColor`, 'Text color:', { tooltip: 'Color of the text inside the bubble.' }),
                    ui.text(`${prefix}.font`, 'Font:', { tooltip: 'Font family for the text.\nFont names with spaces must be quoted (e.g., "Times New Roman").' }),

                    // Compound container for Padding & Radius
                    ui.container(
                        [
                            ui.range(`${prefix}.bubblePadding`, 'Padding:', -1, 30, {
                                step: 1,
                                tooltip: 'Adjusts padding for all sides.\nSet to the far left for (auto).',
                                containerClass: 'sliderSubgroup',
                                ...pxTransform,
                            }),
                            ui.range(`${prefix}.bubbleBorderRadius`, 'Radius:', -1, 50, {
                                step: 1,
                                tooltip: 'Corner roundness of the bubble (e.g., 10px).\nSet to the far left for (auto).',
                                containerClass: 'sliderSubgroup',
                                ...pxTransform,
                            }),
                        ],
                        { className: 'compoundSliderContainer' }
                    ),

                    ui.range(`${prefix}.bubbleMaxWidth`, 'max Width:', bubbleWidthConfig.MIN, bubbleWidthConfig.MAX, {
                        step: 1,
                        tooltip: 'Maximum width of the bubble.\nSet to the far left for (auto).',
                        containerClass: 'sliderContainer',
                        transformValue: (val) => (val < bubbleWidthConfig.NULL_THRESHOLD ? null : `${val}%`),
                        toInputValue: (val) => {
                            if (typeof val === 'string' && val.endsWith('%')) return parseInt(val, 10);
                            if (typeof val === 'number') return val;
                            return bubbleWidthConfig.MIN;
                        },
                        valueLabelFormatter: (val) => (val === null ? 'Auto' : val),
                    }),

                    ui.separator({ className: 'separator' }),
                    this._renderPreview(ui, actor),
                ]),
            ]);
        }

        _renderWindowGroup(ui) {
            return ui.group('Background', [
                ui.color('window.backgroundColor', 'Background color:', { tooltip: 'Main background color of the chat window.' }),
                ui.text('window.backgroundImageUrl', 'Background image:', { tooltip: 'URL or Data URI for the main background image.', fieldType: 'image' }),

                ui.container(
                    [
                        ui.select('window.backgroundSize', 'Size:', {
                            options: ['', 'auto', 'cover', 'contain'],
                            tooltip: 'How the background image is sized.',
                            showLabel: true,
                        }),
                        ui.select('window.backgroundPosition', 'Position:', {
                            options: ['', 'top left', 'top center', 'top right', 'center left', 'center center', 'center right', 'bottom left', 'bottom center', 'bottom right'],
                            tooltip: 'Position of the background image.',
                            showLabel: true,
                        }),
                    ],
                    { className: 'compoundFormFieldContainer' }
                ),

                ui.container(
                    [
                        ui.select('window.backgroundRepeat', 'Repeat:', {
                            options: ['', 'no-repeat', 'repeat'],
                            tooltip: 'How the background image is repeated.',
                            showLabel: true,
                        }),
                        this._renderPreviewBackground(ui),
                    ],
                    { className: 'compoundFormFieldContainer' }
                ),
            ]);
        }

        _renderInputGroup(ui) {
            return ui.group('Input area', [
                ui.color('inputArea.backgroundColor', 'Background color:', { tooltip: 'Background color of the text input area.' }),
                ui.color('inputArea.textColor', 'Text color:', { tooltip: 'Color of the text you type.' }),
                ui.separator({ className: 'separator' }),
                this._renderPreviewInput(ui),
            ]);
        }

        _renderPreview(ui, actor) {
            const cls = ui.context.styles;
            const wrapperClass = actor === 'user' ? `${cls.previewBubbleWrapper} ${cls.userPreview}` : cls.previewBubbleWrapper;
            return ui.create('div', { className: cls.previewContainer }, [
                ui.create('label', {}, 'Preview:'),
                ui.create('div', { className: wrapperClass }, [ui.create('div', { className: cls.previewBubble, dataset: { [CONSTANTS.DATA_KEYS.PREVIEW_FOR]: actor } }, [ui.create('span', {}, 'Sample Text')])]),
            ]);
        }

        _renderPreviewInput(ui) {
            const cls = ui.context.styles;
            return ui.create('div', { className: cls.previewContainer }, [
                ui.create('label', {}, 'Preview:'),
                ui.create('div', { className: cls.previewBubbleWrapper }, [ui.create('div', { className: cls.previewInputArea, dataset: { [CONSTANTS.DATA_KEYS.PREVIEW_FOR]: 'inputArea' } }, [ui.create('span', {}, 'Sample input text')])]),
            ]);
        }

        _renderPreviewBackground(ui) {
            const cls = ui.context.styles;
            return ui.create('div', { className: cls.formField }, [
                ui.create('label', {}, 'BG Preview:'),
                ui.create('div', { className: cls.previewBubbleWrapper, style: { padding: '0', minHeight: '0' } }, [ui.create('div', { className: cls.previewBackground, dataset: { [CONSTANTS.DATA_KEYS.PREVIEW_FOR]: 'window' } })]),
            ]);
        }

        _setupEventListeners() {
            if (!this.modal) return;
            const modalElement = this.modal.element;
            const cls = this.style.classes;

            modalElement.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;

                const actionMap = {
                    [`${cls.newBtn}`]: () => this._handleThemeNew(),
                    [`${cls.copyBtn}`]: () => this._handleThemeCopy(),
                    [`${cls.deleteBtn}`]: () => this._handleDeleteClick(),
                    [`${cls.deleteConfirmBtn}`]: () => this._handleThemeDeleteConfirm(),
                    [`${cls.deleteCancelBtn}`]: () => this._handleActionCancel(),
                    [`${cls.upBtn}`]: () => this._handleThemeMove(-1),
                    [`${cls.downBtn}`]: () => this._handleThemeMove(1),
                    [`${cls.renameBtn}`]: () => this._handleRenameClick(),
                    [`${cls.renameOkBtn}`]: () => this._handleRenameConfirm(),
                    [`${cls.renameCancelBtn}`]: () => this._handleActionCancel(),
                };
                const action = actionMap[target.id];
                if (action) action();
            });

            modalElement.addEventListener('change', (e) => {
                const target = e.target;
                if (!(target instanceof HTMLElement)) return;

                if (target.matches(`#${cls.themeSelect}`) && target instanceof HTMLSelectElement) {
                    this.state.activeThemeKey = target.value;
                    this._initFormWithTheme(this.state.activeThemeKey);
                    this._renderUI();
                }
            });

            modalElement.addEventListener('mouseover', (e) => {
                const target = e.target;
                if (!(target instanceof HTMLElement)) return;

                if (target.matches('input[type="text"], textarea') && (target.offsetWidth < target.scrollWidth || target.offsetHeight < target.scrollHeight)) {
                    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                        target.title = target.value;
                    }
                }
            });

            modalElement.addEventListener('mouseout', (e) => {
                const target = e.target;
                if (!(target instanceof HTMLElement)) return;
                if (target.matches('input[type="text"], textarea')) target.title = '';
            });

            modalElement.addEventListener('keydown', (e) => {
                const target = e.target;
                if (!(target instanceof HTMLElement)) return;

                if (target.matches(`#${cls.renameInput}`)) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this._handleRenameConfirm();
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        this._handleActionCancel();
                    }
                }
            });
        }

        async _handleLocalFileSelect(targetKey, callbacks) {
            const fileInput = h('input', { type: 'file', accept: 'image/*' });
            fileInput.onchange = async (event) => {
                const target = event.target;
                if (!(target instanceof HTMLInputElement)) return;

                const file = target.files?.[0];
                if (!file) return;

                try {
                    if (callbacks && callbacks.onStart) {
                        callbacks.onStart();
                    }

                    const options = this._getImageOptions(targetKey, this.state.config);
                    const dataUrl = await this.dataConverter.imageToOptimizedDataUrl(file, options);

                    // Guard: Check if destroyed or closed after async op
                    if (this.isDestroyed || !this.store) return;

                    if (this.store) {
                        this.store.set(targetKey, dataUrl);
                    }

                    if (callbacks && callbacks.onSuccess) {
                        callbacks.onSuccess();
                    }
                } catch (error) {
                    // Check abort condition before logging
                    if (this.isDestroyed || !this.store) return;

                    Logger.error('IMAGE PROC FAILED', LOG_STYLES.RED, 'Image processing failed:', error);
                    if (callbacks && callbacks.onError) {
                        callbacks.onError(`Error: ${error.message}`);
                    }
                }
            };

            if (fileInput instanceof HTMLElement) {
                fileInput.click();
            }
        }

        _getImageOptions(targetKey, config) {
            const quality = CONSTANTS.IMAGE_PROCESSING.QUALITY;
            // targetKey is the full config path string
            if (targetKey.includes('backgroundImageUrl')) {
                return { maxWidth: CONSTANTS.IMAGE_PROCESSING.MAX_WIDTH_BG, quality };
            }
            if (targetKey.includes('standingImageUrl')) {
                return { maxHeight: CONSTANTS.IMAGE_PROCESSING.MAX_HEIGHT_STANDING, quality };
            }
            if (targetKey.includes('icon')) {
                const iconSize = config?.platforms?.[PLATFORM]?.options?.icon_size ?? CONSTANTS.UI_SPECS.AVATAR.DEFAULT_SIZE;
                return { maxWidth: iconSize, maxHeight: iconSize, quality };
            }
            return { quality };
        }

        _renderUI() {
            if (!this.modal) return;

            const { uiMode, activeThemeKey, config, isSizeExceeded, isSaving } = this.state;
            const cls = this.style.classes;
            const isDefault = activeThemeKey === CONSTANTS.THEME_IDS.DEFAULT;
            const isRenaming = uiMode === ThemeModalComponent.UI_MODES.RENAMING;
            const isDeleting = uiMode === ThemeModalComponent.UI_MODES.DELETING;

            const headerRow = this.modal.element.querySelector(`.${cls.headerRow}`);

            // --- UI Element References ---
            const select = headerRow.querySelector('select');
            const renameInput = headerRow.querySelector('input[type="text"]');
            const mainActions = headerRow.querySelector(`#${cls.mainActionsId}`);
            const renameActions = headerRow.querySelector(`#${cls.renameActionsId}`);
            const deleteConfirmGroup = headerRow.querySelector(`#${cls.deleteConfirmGroup}`);

            // --- Toggle visibility based on mode ---
            select.style.display = isRenaming ? 'none' : 'block';
            renameInput.style.display = isRenaming ? 'block' : 'none';
            mainActions.style.visibility = uiMode === ThemeModalComponent.UI_MODES.NORMAL ? 'visible' : 'hidden';
            renameActions.style.display = isRenaming ? 'flex' : 'none';
            deleteConfirmGroup.style.display = isDeleting ? 'flex' : 'none';

            // --- Populate select box if not renaming ---
            if (!isRenaming) {
                const scroll = select.scrollTop;
                select.textContent = '';
                select.appendChild(h('option', { value: CONSTANTS.THEME_IDS.DEFAULT }, 'Default Settings'));
                config.themeSets.forEach((theme, index) => {
                    const rawName = (theme.metadata?.name || '').trim() || `Theme ${index + 1}`;
                    // Display index to help user identify position (UI only, does not affect data)
                    const displayName = `${index + 1}. ${rawName}`;
                    select.appendChild(h('option', { value: theme.metadata.id }, displayName));
                });
                select.value = activeThemeKey;
                select.scrollTop = scroll;
            }

            // --- Populate rename input if renaming ---
            if (isRenaming) {
                const theme = isDefault ? { metadata: { name: 'Default Settings' } } : config.themeSets.find((t) => t.metadata.id === activeThemeKey);
                renameInput.value = theme?.metadata?.name || '';
            }

            // --- Set enabled/disabled state of all controls ---
            const isActionInProgress = uiMode !== ThemeModalComponent.UI_MODES.NORMAL || isSaving;
            const index = config.themeSets.findIndex((t) => t.metadata.id === activeThemeKey);

            // Block structural changes if size is exceeded
            headerRow.querySelector(`#${cls.upBtn}`).disabled = isActionInProgress || isDefault || index <= 0 || isSizeExceeded;
            headerRow.querySelector(`#${cls.downBtn}`).disabled = isActionInProgress || isDefault || index >= config.themeSets.length - 1 || isSizeExceeded;
            headerRow.querySelector(`#${cls.deleteBtn}`).disabled = isActionInProgress || isDefault; // Delete always allowed
            headerRow.querySelector(`#${cls.newBtn}`).disabled = isActionInProgress || isSizeExceeded;
            headerRow.querySelector(`#${cls.copyBtn}`).disabled = isActionInProgress || isSizeExceeded;
            headerRow.querySelector(`#${cls.renameBtn}`).disabled = isActionInProgress || isDefault || isSizeExceeded;

            // --- Disable content areas and footer buttons during actions ---
            // Access DOM via engine elements if needed, or query global class
            const scrollArea = this.modal.element.querySelector(`.${cls.scrollableArea}`);
            if (scrollArea) scrollArea.classList.toggle('is-disabled', isActionInProgress);

            this.modal.element.querySelector(`#${cls.applyBtn}`).disabled = isActionInProgress;
            this.modal.element.querySelector(`#${cls.saveBtn}`).disabled = isActionInProgress;
            this.modal.element.querySelector(`#${cls.cancelBtn}`).disabled = isActionInProgress;

            // --- Show warning in footer if exceeded ---
            const footerMessage = this.modal.dom.footerMessage;
            if (footerMessage) {
                if (isSizeExceeded) {
                    footerMessage.textContent = 'Configuration size limit exceeded. Please reduce size via JSON or Delete.';
                    footerMessage.style.color = SITE_STYLES.PALETTE.error_text;
                } else if (!footerMessage.classList.contains(this.commonStyle.classes.conflictText)) {
                    // Clear only if it's not a conflict message
                    footerMessage.textContent = '';
                }
            }
        }

        _createHeaderControls() {
            const cls = this.style.classes;
            const commonBtn = StyleDefinitions.COMMON_CLASSES.modalButton;
            const moveBtnClass = `${commonBtn} ${cls.moveBtn}`;
            const deleteConfirmBtnClass = `${commonBtn} ${cls.deleteConfirmBtnYes}`;

            return h(`div.${cls.headerControls}`, [
                h(`div.${cls.headerRow}`, [
                    h('label', { htmlFor: cls.themeSelect }, 'Theme:'),
                    h(`div.${cls.renameArea}`, [h(`select#${cls.themeSelect}`), h('input', { type: 'text', id: cls.renameInput, style: { display: 'none' } })]),
                    h(`div.${cls.actionArea}`, [
                        h(`div#${cls.mainActionsId}`, [
                            h(`button#${cls.renameBtn}.${commonBtn}`, 'Rename'),
                            h('button', { id: cls.upBtn, className: moveBtnClass }, [createIconFromDef(StyleDefinitions.ICONS.arrowUp)]),
                            h('button', { id: cls.downBtn, className: moveBtnClass }, [createIconFromDef(StyleDefinitions.ICONS.arrowDown)]),
                            h(`button#${cls.newBtn}.${commonBtn}`, 'New'),
                            h(`button#${cls.copyBtn}.${commonBtn}`, 'Copy'),
                            h(`button#${cls.deleteBtn}.${commonBtn}`, 'Delete'),
                        ]),
                        h(`div#${cls.renameActionsId}`, { style: { display: 'none' } }, [h(`button#${cls.renameOkBtn}.${commonBtn}`, 'OK'), h(`button#${cls.renameCancelBtn}.${commonBtn}`, 'Cancel')]),
                        h(`div#${cls.deleteConfirmGroup}`, { style: { display: 'none' } }, [
                            h(`span.${cls.deleteConfirmLabel}`, 'Are you sure?'),
                            h('button', { id: cls.deleteConfirmBtn, className: deleteConfirmBtnClass }, 'Confirm Delete'),
                            h(`button#${cls.deleteCancelBtn}.${commonBtn}`, 'Cancel'),
                        ]),
                    ]),
                ]),
            ]);
        }

        _createMainContent() {
            // Container for UIBuilder output
            return h(`div.${this.style.classes.content}`);
        }

        async _saveConfigAndHandleFeedback(newConfig, onSuccessCallback) {
            // Guard: Check if destroyed before proceeding (modal might be closed)
            if (!this.modal || this.isDestroyed) return false;

            const footerMessage = this.modal.dom.footerMessage;
            if (footerMessage) footerMessage.textContent = '';

            try {
                await this.callbacks.onSave(newConfig);

                // Guard: Check if destroyed during await
                if (!this.modal || this.isDestroyed) return false;

                this.state.config = deepClone(newConfig);

                // Re-calculate size state after successful save (e.g. deletion might remove exceeded state)
                const sizeInfo = this.checkSize(newConfig);
                this.state.isSizeExceeded = sizeInfo.isExceeded;

                // Update the preview controller with the latest default set.
                if (this.previewController) {
                    this.previewController.setDefaultSet(newConfig.platforms[PLATFORM].defaultSet);
                }

                if (onSuccessCallback) await onSuccessCallback();
                return true;
            } catch (e) {
                // Check if still valid before updating UI
                if (this.modal && footerMessage) {
                    footerMessage.textContent = e.message;
                    footerMessage.style.color = SITE_STYLES.PALETTE.error_text;
                }
                return false;
            }
        }

        async _handleThemeAction(shouldClose) {
            const footerMessage = this.modal?.dom?.footerMessage;
            // Guard: Do not clear the footer message if it is a conflict warning (waiting for reload)
            if (footerMessage && !footerMessage.classList.contains(this.commonStyle.classes.conflictText)) {
                footerMessage.textContent = '';
            }

            // Get current form data from Store and sanitize it
            const storeData = this.store.getData();
            let themeData = sanitizeConfigForSave(storeData);

            // Normalize data (remove empty patterns) before validation and saving
            themeData = ConfigProcessor.normalize(themeData);

            const validationResult = ConfigProcessor.validate(themeData, this.state.activeThemeKey === CONSTANTS.THEME_IDS.DEFAULT);

            if (!validationResult.isValid) {
                // Map validation errors to store to trigger UI updates
                validationResult.errors.forEach((err) => {
                    this.store.set(`${CONSTANTS.STORE_KEYS.ERRORS_PATH}.${err.field}`, { message: err.message });
                });

                // Also show a summary in the footer
                if (footerMessage) {
                    footerMessage.textContent = 'Please correct the errors above.';
                    footerMessage.style.color = SITE_STYLES.PALETTE.error_text;
                }
                return;
            }

            // Lock UI
            this.state.isSaving = true;
            this._renderUI();

            const newConfig = deepClone(this.state.config);
            if (this.state.activeThemeKey === CONSTANTS.THEME_IDS.DEFAULT) {
                // Update defaultSet
                resolveConfig(newConfig.platforms[PLATFORM].defaultSet, themeData);
                delete newConfig.platforms[PLATFORM].defaultSet.metadata;
            } else {
                const index = newConfig.themeSets.findIndex((t) => t.metadata.id === this.state.activeThemeKey);
                if (index !== -1) {
                    // Update specific theme, preserving metadata not in form (id, name)
                    const existingMetadata = newConfig.themeSets[index].metadata;
                    themeData.metadata = {
                        ...existingMetadata,
                        matchPatterns: themeData.metadata.matchPatterns,
                        urlPatterns: themeData.metadata.urlPatterns,
                    };
                    newConfig.themeSets[index] = themeData;
                }
            }

            const onSuccess = async () => (shouldClose ? this.close() : this._renderUI());
            await this._saveConfigAndHandleFeedback(newConfig, onSuccess);

            // Unlock UI (if still open)
            this.state.isSaving = false;
            if (!shouldClose) {
                this._renderUI();
            }
        }

        _handleThemeNew() {
            const { config } = this.state;
            const { config: newConfig, newThemeId } = ThemeService.create(config);

            // Check size before proceeding
            const { isExceeded } = this.checkSize(newConfig);
            if (isExceeded) {
                const footerMessage = this.modal?.dom?.footerMessage;
                if (footerMessage) {
                    footerMessage.textContent = 'Cannot create new theme: Configuration size limit exceeded.';
                    footerMessage.style.color = SITE_STYLES.PALETTE.error_text;
                }
                return;
            }

            const onSuccess = () => {
                this.state.activeThemeKey = newThemeId;
                this.state.uiMode = ThemeModalComponent.UI_MODES.RENAMING;
                this._initFormWithTheme(this.state.activeThemeKey);
                this._renderUI();
                const input = this.modal.element.querySelector(`#${this.style.classes.renameInput}`);
                if (input) {
                    input.focus();
                    input.select();
                }
            };
            this._saveConfigAndHandleFeedback(newConfig, onSuccess);
        }

        _handleThemeCopy() {
            const { config, activeThemeKey } = this.state;
            const result = ThemeService.copy(config, activeThemeKey);

            if (!result) return;
            const { config: newConfig, newThemeId } = result;

            // Check size before proceeding
            const { isExceeded } = this.checkSize(newConfig);
            if (isExceeded) {
                const footerMessage = this.modal?.dom?.footerMessage;
                if (footerMessage) {
                    footerMessage.textContent = 'Cannot copy theme: Configuration size limit exceeded.';
                    footerMessage.style.color = SITE_STYLES.PALETTE.error_text;
                }
                return;
            }

            const onSuccess = () => {
                this.state.activeThemeKey = newThemeId;
                this._initFormWithTheme(this.state.activeThemeKey);
                this._renderUI();
            };
            this._saveConfigAndHandleFeedback(newConfig, onSuccess);
        }

        _handleThemeMove(direction) {
            const { config, activeThemeKey } = this.state;
            const newConfig = ThemeService.move(config, activeThemeKey, direction);

            if (newConfig) {
                this._saveConfigAndHandleFeedback(newConfig, () => this._renderUI());
            }
        }

        _handleRenameClick() {
            this.state.uiMode = ThemeModalComponent.UI_MODES.RENAMING;
            this._renderUI();
            const input = this.modal.element.querySelector(`#${this.style.classes.renameInput}`);
            if (input) {
                input.focus();
                input.select();
            }
        }

        _handleRenameConfirm() {
            const { config, activeThemeKey } = this.state;
            const footerMessage = this.modal?.dom?.footerMessage;
            if (footerMessage) footerMessage.textContent = '';

            const input = this.modal.element.querySelector(`#${this.style.classes.renameInput}`);
            const newName = input.value;

            try {
                const newConfig = ThemeService.rename(config, activeThemeKey, newName);
                this._saveConfigAndHandleFeedback(newConfig, () => {
                    this.state.uiMode = ThemeModalComponent.UI_MODES.NORMAL;
                    this._renderUI();
                });
            } catch (e) {
                if (footerMessage) footerMessage.textContent = e.message;
            }
        }

        _handleDeleteClick() {
            this.state.uiMode = ThemeModalComponent.UI_MODES.DELETING;
            this.state.pendingDeletionKey = this.state.activeThemeKey;
            this._renderUI();
        }

        _handleThemeDeleteConfirm() {
            const { config, pendingDeletionKey } = this.state;
            if (pendingDeletionKey === CONSTANTS.THEME_IDS.DEFAULT || !pendingDeletionKey) {
                this._handleActionCancel();
                return;
            }

            const { config: newConfig, nextActiveId } = ThemeService.delete(config, pendingDeletionKey);

            this._saveConfigAndHandleFeedback(newConfig, () => {
                this.state.activeThemeKey = nextActiveId;
                this.state.pendingDeletionKey = null;
                this.state.uiMode = ThemeModalComponent.UI_MODES.NORMAL;
                this._initFormWithTheme(nextActiveId);
                this._renderUI();
            });
        }

        _handleActionCancel() {
            this.state.uiMode = ThemeModalComponent.UI_MODES.NORMAL;
            this.state.pendingDeletionKey = null;
            this._renderUI();
        }
    }

    class JumpListComponent extends UIComponentBase {
        static DIMENSIONS = {
            ITEM_HEIGHT: 34,
            WIDTH: 360,
            MAX_VISIBLE_ITEMS: 20,
            INITIAL_BATCH_SIZE: 30, // Number of items to render initially (20 visible + 10 buffer)
            SCROLL_BUFFER: 5, // Number of extra items to render above/below the visible area
        };

        static RESOURCE_KEYS = {
            RESIZE_OBSERVER: 'resizeObserver',
        };

        constructor(role, messages, highlightedMessage, callbacks, styleHandle, initialFilterValue, searchCache) {
            super(callbacks);
            this.role = role;
            this.messages = messages;
            this.styleHandle = styleHandle;

            // Use the shared cache to build the searchable list efficiently.
            // If a message is not yet in the cache (e.g. indexing incomplete), verify and add it on the fly.
            const cls = this.styleHandle.classes;
            this.searchableMessages = this.messages.map((msg, originalIndex) => {
                let cachedData = searchCache.get(msg);

                if (!cachedData) {
                    // Fallback: Generate data synchronously for uncached items
                    const role = PlatformAdapters.General.getMessageRole(msg);
                    const roleClass = role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_USER ? cls.userItem : role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_ASSISTANT ? cls.asstItem : null;

                    const rawText = PlatformAdapters.General.getJumpListDisplayText(msg);
                    const displayText = (rawText || '').replace(/\s+/g, ' ').trim();

                    cachedData = {
                        displayText: displayText,
                        lowerText: displayText.toLowerCase(),
                        roleClass: roleClass,
                    };
                    // Update cache to prevent future re-calculation
                    searchCache.set(msg, cachedData);
                }

                return {
                    element: msg,
                    originalIndex: originalIndex,
                    displayText: cachedData.displayText,
                    lowerText: cachedData.lowerText,
                    roleClass: cachedData.roleClass,
                };
            });

            // --- Component state ---
            this.state = {
                highlightedMessage: highlightedMessage,
                initialFilterValue: initialFilterValue,
                filteredMessages: [],
                scrollTop: 0,
                focusedIndex: -1,
                isRendering: false,
                // Cache ONLY container dimensions for scroll calculations.
                // Position (top/left) is NOT cached to avoid sync issues.
                containerHeight: 0,
            };

            // --- DOM Management & Virtualization ---
            // Map<index, HTMLElement> - Tracks currently rendered elements to avoid DOM queries
            this.renderedItems = new Map();
            // Array<HTMLElement> - Pool of recycled list items to reduce GC pressure
            this.itemPool = [];

            // --- Render scheduling ---
            this.renderRafId = null;
            this.isRenderScheduled = false;

            // Pending state for preview update aggregation
            this.pendingPreviewIndex = -1;
            this.isPreviewUpdateScheduled = false;

            // --- Interaction throttling ---
            // Timer to re-enable pointer events after scrolling
            this.scrollEndTimer = null;

            // --- Virtual scroll properties ---
            this.itemHeight = JumpListComponent.DIMENSIONS.ITEM_HEIGHT; // The fixed height of each list item in pixels.
            this.element = null; // The main component container
            this.scrollBox = null; // The dedicated scrolling element
            this.listElement = null; // The inner element that provides the virtual height
            this.previewTooltip = null;
            this.isPreviewVisible = false; // Internal flag to track preview visibility state
            this.previewTimer = null; // Timer for debounce management
            this.filterTimer = null; // Timer for filter input debounce
            this.lastPreviewText = null; // Cache to avoid unnecessary reflows in preview
            this.lastPreviewIndex = -1; // Cache to track position changes

            // --- Resize Observer ---
            // Monitors size changes without polling or forced reflows
            // Managed by BaseManager for automatic cleanup
            this.resizeObserver = this.manageFactory(JumpListComponent.RESOURCE_KEYS.RESIZE_OBSERVER, () => {
                return new ResizeObserver((entries) => {
                    let needsUpdate = false;
                    for (const entry of entries) {
                        if (entry.target === this.scrollBox) {
                            // Only trigger render if metrics actually changed
                            if (this.state.containerHeight !== this.scrollBox.clientHeight) {
                                this.state.containerHeight = this.scrollBox.clientHeight;
                                needsUpdate = true;
                            }
                        }
                    }
                    if (needsUpdate) {
                        this._requestRender();
                    }
                });
            });

            // Bind handlers
            this._handleClick = this._handleClick.bind(this);
            this._handleKeyDown = this._handleKeyDown.bind(this);
            this._handleFilter = this._handleFilter.bind(this);
            this._handleFilterKeyDown = this._handleFilterKeyDown.bind(this);
            this._handleScroll = this._handleScroll.bind(this);
            this._performPreviewUpdate = this._performPreviewUpdate.bind(this);

            // Static handlers for recycled items to avoid closure creation
            this._handleItemMouseEnter = this._handleItemMouseEnter.bind(this);
            this._handleItemMouseLeave = this._handleItemMouseLeave.bind(this);
        }

        render() {
            const cls = this.styleHandle.classes;

            // 1. The inner list (ul) acts as a "sizer" or "spacer".
            this.listElement = h(`ul#${cls.listId}`, {
                style: { position: 'relative', overflow: 'hidden', height: '0px' },
            });

            // 2. The scrollBox (div) is the "viewport".
            this.scrollBox = h(`div.${cls.scrollbox}`, {
                onkeydown: this._handleKeyDown,
                tabindex: -1,
                style: {
                    overflowY: 'auto',
                    position: 'relative',
                    flex: '1 1 auto', // Allows this box to fill the available space in the flex container.
                },
            });
            this.scrollBox.appendChild(this.listElement);
            // Use passive listener for smooth scrolling
            this.scrollBox.addEventListener('scroll', this._handleScroll, { passive: true });

            // 3. The filter input container.
            const filterInput = h('input', {
                type: 'text',
                placeholder: 'Filter with text or /pattern/flags',
                // Update tooltip to reflect flag restrictions
                title:
                    'Filter by plain text or a regular expression.\n' + 'Enter text for a simple search.\n' + 'Use /regex/flags format for advanced filtering.\n' + 'Allowed flags: i, m, s, u\n' + "(Note: 'g' and 'y' flags are forbidden)",
                className: cls.filter,
                value: this.state.initialFilterValue,
                oninput: this._handleFilter,
                onkeydown: this._handleFilterKeyDown,
                onclick: (e) => e.stopPropagation(),
            });
            const modeLabel = h('span', { className: cls.modeLabel });
            const inputContainer = h(`div.${cls.filterContainer}`, [filterInput, modeLabel]);

            // 4. The main element (div) handles the overall layout using flexbox.
            this.element = h(`div#${cls.containerId}`, {
                onclick: this._handleClick,
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden', // Important to prevent the main container itself from scrolling.
                },
            });

            this.element.append(this.scrollBox, inputContainer);
            this._createPreviewTooltip();

            // Start observing layout changes
            this.resizeObserver.observe(this.scrollBox);

            return this.element;
        }

        show(anchorElement) {
            if (!this.element) this.render();

            // 1. Measure (Read Phase)
            const anchorRect = anchorElement.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            // 2. Mutate (Write Phase)
            document.body.appendChild(this.element);

            const cls = this.styleHandle.classes;

            // Manually trigger the filter immediately to populate the list without delay
            this._executeFilter();

            const verticalMargin = 8;
            // Increase horizontal margin to avoid overlapping with browser scrollbar
            const horizontalMargin = 24;
            const width = JumpListComponent.DIMENSIONS.WIDTH;
            const isTopHalf = anchorRect.top < viewportHeight / 2;

            // Strict List Height Calculation:
            // Apply max-height directly to the scrollBox to enforce exactly 20 items.
            // This decouples the list size from the filter input size (which varies by OS/Browser).
            const listMaxHeight = JumpListComponent.DIMENSIONS.MAX_VISIBLE_ITEMS * this.itemHeight;
            this.scrollBox.style.maxHeight = `${listMaxHeight}px`;

            // Horizontal Positioning (Keep on screen)
            let left = anchorRect.left;
            if (left + width > viewportWidth - horizontalMargin) {
                left = viewportWidth - width - horizontalMargin;
            }
            // Ensure strictly non-negative left position
            left = Math.max(horizontalMargin, left);

            this.element.style.left = `${left}px`;
            this.element.style.width = `${width}px`;

            if (isTopHalf) {
                // Expand Down (Header Mode / Top Half)
                this.element.classList.add(cls.expandDown);
                this.element.style.top = `${anchorRect.bottom + 4}px`;
                this.element.style.bottom = 'auto';

                // Viewport Constraint for the Outer Container
                const availableHeight = viewportHeight - anchorRect.bottom - verticalMargin * 2;
                this.element.style.maxHeight = `${Math.max(100, availableHeight)}px`;
            } else {
                // Expand Up (Footer Mode / Bottom Half)
                this.element.classList.remove(cls.expandDown);
                this.element.style.top = 'auto';
                this.element.style.bottom = `${viewportHeight - anchorRect.top + 4}px`;

                // Viewport Constraint for the Outer Container
                // Reserve 10% space at the top to avoid covering headers entirely
                const topLimit = viewportHeight * 0.1;
                const availableHeight = anchorRect.top - topLimit - verticalMargin;
                this.element.style.maxHeight = `${Math.max(100, availableHeight)}px`;
            }

            // Force reflow to ensure start position is applied before transition
            this.element.getBoundingClientRect();

            this.element.classList.add(cls.visible);

            const filterInput = this.element.querySelector(`.${cls.filter}`);
            if (filterInput instanceof HTMLInputElement) {
                filterInput.focus();
                filterInput.select();
            }
        }

        _onInit() {
            this.isRenderScheduled = false;
            this.isPreviewUpdateScheduled = false;
        }

        _onDestroy() {
            // ResizeObserver is automatically disconnected by BaseManager
            this.resizeObserver = null;

            this._cancelScheduledPreview();
            this._cancelScheduledFilter();
            this._hidePreview();
            if (this.scrollEndTimer) clearTimeout(this.scrollEndTimer);
            if (this.renderRafId) cancelAnimationFrame(this.renderRafId);

            this.previewTooltip?.remove();
            this.previewTooltip = null;

            // Break circular references from DOM elements to this instance via bound event handlers
            const cleanupItem = (item) => {
                item.onmouseenter = null;
                item.onmouseleave = null;
            };
            this.renderedItems.forEach((item) => {
                cleanupItem(item);
                item.remove();
            });
            this.renderedItems.clear();
            this.itemPool.forEach(cleanupItem);
            this.itemPool = [];

            // Explicitly release large data structures
            this.messages = null;
            this.searchableMessages = null;
            this.state = null; // Important: Clear state containing filteredMessages references

            this.listElement = null;
            this.scrollBox = null;
            super._onDestroy();
        }

        /**
         * @private
         * Parses the search input into a structured object containing validation status, mode, and components.
         * Centralizes parsing logic to ensure consistency between filtering and highlighting.
         * @param {string} searchTerm
         * @returns {{ isValid: boolean, mode: 'RegExp'|'Text'|'Invalid', source: string, flags: string }}
         */
        _parseSearchInput(searchTerm) {
            /** @type {'RegExp'|'Text'|'Invalid'} */
            let mode = 'Text';
            let isValid = true;
            let source = searchTerm;
            let flags = '';

            // Robust RegExp Parsing using lastIndexOf to handle slashes in pattern
            if (searchTerm.startsWith('/')) {
                const lastSlashIndex = searchTerm.lastIndexOf('/');
                if (lastSlashIndex > 0) {
                    const pattern = searchTerm.substring(1, lastSlashIndex);
                    const flagsRaw = searchTerm.substring(lastSlashIndex + 1);

                    // Check for invalid flags
                    // Only allow 'i', 'm', 's', 'u'.
                    // 'g' and 'y' are forbidden as they interfere with the internal highlighting logic.
                    // Any other characters are also invalid.
                    if (/[^imsu]/.test(flagsRaw)) {
                        mode = 'Invalid';
                        isValid = false;
                    } else if (pattern.length > 0) {
                        try {
                            // Test if it's a valid regex (checks for syntax errors and duplicate flags)
                            new RegExp(pattern, flagsRaw);
                            mode = 'RegExp';
                            isValid = true;
                            source = pattern;
                            flags = flagsRaw;
                        } catch {
                            mode = 'Invalid';
                            isValid = false;
                        }
                    } else {
                        // Empty pattern `//` -> treat as invalid
                        mode = 'Invalid';
                        isValid = false;
                    }
                }
            }

            return { isValid, mode, source, flags };
        }

        _executeFilter() {
            if (!this.element) return;
            const cls = this.styleHandle.classes;
            // Always query the input element from the DOM to ensure we get the latest value
            const inputElement = this.element.querySelector(`.${cls.filter}`);
            if (!(inputElement instanceof HTMLInputElement)) return;

            const searchTerm = inputElement.value;

            // Clear render cache but KEEP the pool for reuse
            this.renderedItems.clear();
            // Note: We don't clear itemPool here, we want to reuse DOM elements even across filter changes.

            if (this.listElement) {
                this.listElement.textContent = '';
            }

            // Update state
            this.state.filteredMessages = this._filterMessages(searchTerm, inputElement);
            this.state.focusedIndex = -1;
            this.state.scrollTop = 0;
            if (this.scrollBox) this.scrollBox.scrollTop = 0;

            // Trigger re-render
            this._requestRender();
            this._hidePreview();
        }

        _scheduleFilter() {
            this._cancelScheduledFilter();
            this.filterTimer = setTimeout(() => {
                this._executeFilter();
                this.filterTimer = null;
            }, CONSTANTS.TIMING.DEBOUNCE_DELAYS.FILTER_INPUT_DEBOUNCE);
        }

        _cancelScheduledFilter() {
            if (this.filterTimer) {
                clearTimeout(this.filterTimer);
                this.filterTimer = null;
            }
        }

        _flushPendingFilter() {
            // If a filter update is pending, execute it immediately
            if (this.filterTimer) {
                this._cancelScheduledFilter();
                this._executeFilter();
            }
        }

        /**
         * Disables mouse interactions (pointer-events) on the list during scrolling.
         * This prevents expensive 'mouseenter' events and preview updates when items are moving rapidly.
         */
        _disableMouseInteractions() {
            if (!this.listElement) return;

            // Set pointer-events: none to prevent hover/click while scrolling
            if (this.listElement.style.pointerEvents !== 'none') {
                this.listElement.style.pointerEvents = 'none';
            }

            // Debounce re-enabling
            if (this.scrollEndTimer) {
                clearTimeout(this.scrollEndTimer);
            }

            this.scrollEndTimer = setTimeout(() => {
                if (this.listElement) {
                    this.listElement.style.pointerEvents = 'auto';
                }
                this.scrollEndTimer = null;
            }, 150); // 150ms buffer after last scroll event
        }

        /**
         * Schedules a preview update (show or hide) with a delay.
         * Using a timer for both actions allows the user to move the mouse from the list item
         * into the preview tooltip without it disappearing immediately.
         * @param {number} index - The index of the item to preview, or -1 to hide.
         * @param {number} delay - Delay in ms.
         */
        _schedulePreview(index, delay) {
            this._cancelScheduledPreview();

            this.previewTimer = setTimeout(() => {
                this._showPreview(index);
                this.previewTimer = null;
            }, delay);
        }

        _cancelScheduledPreview() {
            if (this.previewTimer) {
                clearTimeout(this.previewTimer);
                this.previewTimer = null;
            }
        }

        updateHighlightedMessage(newMessage) {
            this.state.highlightedMessage = newMessage;
            // Re-render visible items to update the '.is-current' class
            this._requestRender();
        }

        /**
         * Checks if a DOM element is contained within the jump list or its preview tooltip.
         * @param {Node} target The element to check.
         * @returns {boolean} True if the element is inside the component.
         */
        contains(target) {
            if (!target) return false;
            // Check if inside the main list element
            if (this.element?.contains(target)) return true;
            // Check if inside the preview tooltip (which is attached to body)
            if (this.previewTooltip?.contains(target)) return true;
            return false;
        }

        _createPreviewTooltip() {
            if (this.previewTooltip) return;
            const cls = this.styleHandle.classes;
            this.previewTooltip = h(`div#${cls.previewId}`);

            // Prevent clicks and selections inside the tooltip from bubbling up and closing the UI
            ['pointerdown', 'click', 'mouseup'].forEach((eventType) => {
                this.previewTooltip.addEventListener(eventType, (e) => e.stopPropagation());
            });

            // Cancel any pending hide/change actions when the mouse enters the tooltip
            this.previewTooltip.addEventListener('mouseenter', () => this._cancelScheduledPreview());
            this.previewTooltip.addEventListener('mouseleave', (e) => {
                // Guard: Do not close if the user is dragging (mouse button down)
                // or if text is currently selected (user might be moving to copy).
                // e.buttons & 1 checks if the primary (left) button is pressed.
                const isDragging = e instanceof MouseEvent && (e.buttons & 1) === 1;
                const hasSelection = window.getSelection()?.toString().length > 0;

                if (isDragging || hasSelection) {
                    return;
                }
                this._revertToFocusedPreview();
            });
            document.body.appendChild(this.previewTooltip);
        }

        _showPreview(index) {
            this.pendingPreviewIndex = index;

            if (!this.isPreviewUpdateScheduled) {
                this.isPreviewUpdateScheduled = true;
                requestAnimationFrame(this._performPreviewUpdate);
            }
        }

        _performPreviewUpdate() {
            this.isPreviewUpdateScheduled = false;
            const index = this.pendingPreviewIndex;

            if (!this.previewTooltip || index < 0 || index >= this.state.filteredMessages.length) {
                this._hidePreview();
                return;
            }

            const searchableMessage = this.state.filteredMessages[index];
            if (!searchableMessage) {
                this._hidePreview();
                return;
            }

            const cls = this.styleHandle.classes;
            // Use cached text
            const fullText = searchableMessage.displayText;

            // --- 1. Prepare Filter Logic (Regex or String) ---
            const filterInput = this.element.querySelector(`.${cls.filter}`);
            const searchTerm = filterInput instanceof HTMLInputElement ? filterInput.value : '';

            // Use common parsing logic
            const parsed = this._parseSearchInput(searchTerm);
            let highlightRegex = null;

            if (searchTerm.trim()) {
                if (parsed.mode === 'RegExp' && parsed.isValid) {
                    try {
                        // Safe regex creation for highlighting (force 'g' for multiple matches)
                        highlightRegex = new RegExp(parsed.source, parsed.flags + 'g');
                    } catch {
                        highlightRegex = null;
                    }
                } else {
                    // Fallback to plain string search for highlighting (Text or Invalid mode)
                    // Important: Use escapeRegExp on the raw searchTerm to prevent crashes on special chars
                    highlightRegex = new RegExp(escapeRegExp(searchTerm), 'gi');
                }
            }

            // Cache Key Update: Must include the actual displayed text (full text in this case)
            // Cache Key: includes text, filter term, and validity to handle highlighting changes
            const cacheKey = `${fullText}|${searchTerm}|${parsed.isValid}|${parsed.mode}`;

            // Skip updating if content AND position (index) haven't changed
            if (this.lastPreviewText === cacheKey && this.lastPreviewIndex === index && this.isPreviewVisible) {
                return;
            }
            this.lastPreviewText = cacheKey;
            this.lastPreviewIndex = index;

            // --- 2. Build DOM ---
            const contentFragment = document.createDocumentFragment();
            contentFragment.appendChild(document.createTextNode(`${searchableMessage.originalIndex + 1}: `));

            // Robust Highlight Logic with exec loop
            if (highlightRegex) {
                let lastIndex = 0;
                let match;
                const MAX_MATCHES = 100; // Circuit breaker to prevent freezing on many matches
                let matchCount = 0;

                // Ensure regex is not stateful from previous runs
                highlightRegex.lastIndex = 0;

                while ((match = highlightRegex.exec(fullText)) !== null) {
                    if (matchCount++ > MAX_MATCHES) break;

                    // Append text before match
                    if (match.index > lastIndex) {
                        contentFragment.appendChild(document.createTextNode(fullText.substring(lastIndex, match.index)));
                    }
                    // Append matched text
                    contentFragment.appendChild(h('strong', match[0]));

                    lastIndex = highlightRegex.lastIndex;

                    // Prevent infinite loop on zero-length matches (e.g. /^/)
                    if (match.index === highlightRegex.lastIndex) {
                        highlightRegex.lastIndex++;
                    }
                }
                // Append remaining text
                if (lastIndex < fullText.length) {
                    contentFragment.appendChild(document.createTextNode(fullText.substring(lastIndex)));
                }
            } else {
                contentFragment.appendChild(document.createTextNode(fullText));
            }

            // Phase 1: Write (Update Content)
            this.previewTooltip.textContent = '';
            this.previewTooltip.appendChild(contentFragment);

            // Phase 2: Read & Position (Synchronous in this frame)
            if (!this.previewTooltip) return;

            // --- Position Calculation using Metrics (Read DOM for position, use cached size if possible) ---
            const margin = 12;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const scrollBoxRect = this.scrollBox.getBoundingClientRect();
            const itemRelativeTop = index * this.itemHeight - this.state.scrollTop;
            const itemAbsoluteTop = scrollBoxRect.top + itemRelativeTop;

            // Initial position candidate (Right of list)
            let left = scrollBoxRect.right + margin;
            let top = itemAbsoluteTop;

            // Measure tooltip only once.
            const tooltipRect = this.previewTooltip.getBoundingClientRect();

            // Collision detection
            if (left + tooltipRect.width > viewportWidth - margin) {
                // Flip to Left of list
                left = scrollBoxRect.left - tooltipRect.width - margin;
            }
            if (top + tooltipRect.height > viewportHeight - margin) {
                // Shift up
                top = viewportHeight - tooltipRect.height - margin;
            }
            top = Math.max(margin, top);
            left = Math.max(margin, left);

            this.previewTooltip.style.left = `${left}px`;
            this.previewTooltip.style.top = `${top}px`;
            this.previewTooltip.classList.add(cls.visible);
            this.isPreviewVisible = true;
        }

        _hidePreview() {
            // Update pending state to invalid so scheduled rAF will perform hide
            this.pendingPreviewIndex = -1;

            // If we are already visible, we can hide immediately or wait for rAF.
            // But to be responsive for direct calls (like from filter), handle immediate DOM update too.
            if (this.previewTooltip) {
                this.previewTooltip.classList.remove(this.styleHandle.classes.visible);
                this.isPreviewVisible = false;
                this.lastPreviewText = null;
            }
        }

        _revertToFocusedPreview() {
            if (this.state.focusedIndex > -1) {
                this._showPreview(this.state.focusedIndex);
            } else {
                this._hidePreview();
            }
        }

        _handleItemMouseEnter(e) {
            const target = e.currentTarget;
            if (!target) return;
            // Retrieve index from dataset, avoiding closure capture
            const index = parseInt(target.dataset[CONSTANTS.DATA_KEYS.FILTERED_INDEX], 10);
            if (isNaN(index)) return;

            // Use a short delay for mouse to avoid heavy rendering during rapid movement
            // If preview is already visible (user is exploring the list), switch instantly.
            const delay = this.isPreviewVisible ? 0 : CONSTANTS.TIMING.DEBOUNCE_DELAYS.JUMP_LIST_PREVIEW_HOVER;
            this._schedulePreview(index, delay);
        }

        _handleItemMouseLeave() {
            // Revert to the focused item (or hide) after a delay
            this._schedulePreview(this.state.focusedIndex, CONSTANTS.TIMING.DEBOUNCE_DELAYS.JUMP_LIST_PREVIEW_RESET);
        }

        _createListItem() {
            // Only create the DOM structure and bind static listeners once
            const item = h('li', {
                style: {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    height: `${this.itemHeight}px`,
                    width: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                },
                onmouseenter: this._handleItemMouseEnter,
                onmouseleave: this._handleItemMouseLeave,
            });
            return item;
        }

        _configureItem(item, searchableMessage, index) {
            const messageElement = searchableMessage.element;
            const originalIndex = searchableMessage.originalIndex;
            const cls = this.styleHandle.classes;

            // Use pre-calculated values
            const displayText = `${originalIndex + 1}: ${searchableMessage.displayText}`;

            // Reset dynamic classes but keep base 'li' styling implicitly via tag
            // Explicitly remove ONLY the dynamic classes we manage
            item.classList.remove(cls.current, cls.focused, cls.userItem, cls.asstItem);

            // Update Data & Styles
            item.dataset[CONSTANTS.DATA_KEYS.MESSAGE_INDEX] = originalIndex;
            item.dataset[CONSTANTS.DATA_KEYS.FILTERED_INDEX] = index;

            // Use transform for performance instead of 'top'
            item.style.transform = `translate3d(0, ${index * this.itemHeight}px, 0)`;

            // Update text content only if changed
            if (item.textContent !== displayText) {
                item.textContent = displayText;
            }

            // Apply current state
            if (this.state.highlightedMessage === messageElement) {
                item.classList.add(cls.current);
            }
            if (this.state.focusedIndex === index) {
                item.classList.add(cls.focused);
            }
            if (searchableMessage.roleClass) {
                item.classList.add(searchableMessage.roleClass);
            }
        }

        _filterMessages(searchTerm, inputElement) {
            const cls = this.styleHandle.classes;
            const modeLabel = this.element.querySelector(`.${cls.modeLabel}`);

            const parsed = this._parseSearchInput(searchTerm);

            // Update UI only if changed to avoid reflows
            if (inputElement.classList.contains(cls.filterRegexValid) !== parsed.isValid) {
                inputElement.classList.toggle(cls.filterRegexValid, parsed.isValid);
            }

            const modeClassMap = {
                RegExp: `${cls.modeLabel} ${cls.modeRegex}`,
                Invalid: `${cls.modeLabel} ${cls.modeInvalid}`,
                Text: `${cls.modeLabel} ${cls.modeString}`,
            };
            const modeClass = modeClassMap[parsed.mode];

            if (modeLabel.className !== modeClass) {
                modeLabel.className = modeClass;
                modeLabel.textContent = parsed.mode;
            }

            // Prepare RegExp object if valid
            let regex = null;
            if (parsed.mode === 'RegExp' && parsed.isValid) {
                try {
                    regex = new RegExp(parsed.source, parsed.flags);
                } catch {
                    /* ignore, handled by parse */
                }
            }

            const lowerCaseSearchTerm = searchTerm.toLowerCase();

            return this.searchableMessages.filter((msg) => {
                if (regex) {
                    // For regex, test against the original, case-preserved text.
                    return regex.test(msg.displayText);
                } else if (parsed.mode === 'Text') {
                    // For plain text, perform a case-insensitive search using the original input logic.
                    // Note: searchTerm is used here, not parsed.source, though they are same in Text mode.
                    return lowerCaseSearchTerm === '' || msg.lowerText.includes(lowerCaseSearchTerm);
                } else {
                    // Invalid regex -> Treat as literal search of the full input string (Fallback)
                    // This matches the original behavior where invalid regex was often just filtered by the raw string.
                    return lowerCaseSearchTerm === '' || msg.lowerText.includes(lowerCaseSearchTerm);
                }
            });
        }

        _requestRender() {
            if (this.isRenderScheduled) return;
            this.isRenderScheduled = true;
            this.renderRafId = requestAnimationFrame(() => {
                this.isRenderScheduled = false;
                this.renderRafId = null;
                this._renderUI();
            });
        }

        _getVisibleRange() {
            const total = this.state.filteredMessages.length;
            if (!total) return { startIndex: 0, endIndex: -1 };

            // Use cached metrics for height, but state.scrollTop is accurate
            const scrollTop = this.state.scrollTop;
            const containerHeight = this.state.containerHeight;
            const buffer = JumpListComponent.DIMENSIONS.SCROLL_BUFFER;

            const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - buffer);

            if (containerHeight <= 0) {
                // Initial render, container height not yet known. Render a default batch.
                const initialBatchSize = JumpListComponent.DIMENSIONS.INITIAL_BATCH_SIZE;
                // Fix off-by-one: endIndex should be valid index bound
                const endIndex = Math.min(total - 1, initialBatchSize);
                return { startIndex: 0, endIndex };
            }

            // Inclusive index
            const endIndex = Math.min(total - 1, Math.floor((scrollTop + containerHeight) / this.itemHeight) + buffer);
            return { startIndex, endIndex };
        }

        _renderUI() {
            if (!this.listElement || !this.scrollBox) return;

            // Step 1: Update the virtual height immediately to ensure correct layout calculations.
            const totalHeight = this.state.filteredMessages.length * this.itemHeight;
            const heightStyle = `${totalHeight}px`;
            if (this.listElement.style.height !== heightStyle) {
                this.listElement.style.height = heightStyle;
            }

            // Step 2: Determine the new visible range.
            const { startIndex, endIndex } = this._getVisibleRange();
            const visibleIndices = new Set();
            for (let i = startIndex; i <= endIndex; i++) {
                visibleIndices.add(i);
            }

            const fragment = document.createDocumentFragment();

            // First, remove any elements that are no longer in the visible range and recycle them.
            for (const [index, element] of this.renderedItems.entries()) {
                if (!visibleIndices.has(index)) {
                    element.remove();
                    this.renderedItems.delete(index);
                    this.itemPool.push(element);
                }
            }

            // Then, add or update elements that should be visible.
            for (let i = startIndex; i <= endIndex; i++) {
                const message = this.state.filteredMessages[i];
                let item = this.renderedItems.get(i);

                if (item) {
                    // Item exists, just update its state
                    this._configureItem(item, message, i);
                } else {
                    // Item missing, recycle or create
                    if (this.itemPool.length > 0) {
                        item = this.itemPool.pop();
                    } else {
                        item = this._createListItem();
                    }
                    this._configureItem(item, message, i);
                    this.renderedItems.set(i, item);
                    fragment.appendChild(item);
                }
            }

            // Append all new items at once.
            if (fragment.childNodes.length > 0) {
                this.listElement.appendChild(fragment);
            }
        }

        _updateFocus(shouldScroll = true) {
            if (!this.scrollBox) return;

            if (shouldScroll && this.state.focusedIndex > -1) {
                const itemTop = this.state.focusedIndex * this.itemHeight;
                const itemBottom = itemTop + this.itemHeight;

                // Use cached state for read to avoid layout thrashing
                const viewTop = this.state.scrollTop;
                // Use cached height or fallback to DOM read only if necessary (0 means not yet measured)
                const viewHeight = this.state.containerHeight || this.scrollBox.clientHeight;
                const viewBottom = viewTop + viewHeight;

                let newScrollTop = viewTop;

                if (itemTop < viewTop) {
                    newScrollTop = itemTop;
                } else if (itemBottom > viewBottom) {
                    newScrollTop = itemBottom - viewHeight;
                }

                if (newScrollTop !== viewTop) {
                    this.scrollBox.scrollTop = newScrollTop;
                    // Update state after potential scroll change immediately
                    this.state.scrollTop = newScrollTop;
                }
            }

            this._requestRender();
        }

        _handleScroll(event) {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            // Disable mouse interactions to prevent hover spam during scroll
            this._disableMouseInteractions();
            // Explicitly hide preview immediately on scroll for better UX
            this._hidePreview();

            this.state.scrollTop = target.scrollTop;
            this._requestRender();
        }

        _handleFilter(event) {
            // Cancel any pending preview immediately when typing
            this._cancelScheduledPreview();
            // Schedule the filter update (debounce)
            this._scheduleFilter();
        }

        _handleFilterKeyDown(event) {
            // Only flush pending filters for navigation keys to ensure the list is up-to-date.
            // For regular typing, let the debounce timer handle it to prevent input lag.
            if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(event.key)) {
                this._flushPendingFilter();
            }

            if (this.state.filteredMessages.length === 0) return;

            switch (event.key) {
                case 'ArrowDown':
                case 'Tab':
                    if (!event.shiftKey) {
                        event.preventDefault();
                        this.state.focusedIndex = 0;
                        this._updateFocus(true);
                        this.scrollBox.focus({ preventScroll: true });
                        this._schedulePreview(this.state.focusedIndex, CONSTANTS.TIMING.DEBOUNCE_DELAYS.JUMP_LIST_PREVIEW_KEY_NAV);
                    }
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    this.state.focusedIndex = this.state.filteredMessages.length - 1;
                    this._updateFocus(true);
                    this.scrollBox.focus({ preventScroll: true });
                    this._schedulePreview(this.state.focusedIndex, CONSTANTS.TIMING.DEBOUNCE_DELAYS.JUMP_LIST_PREVIEW_KEY_NAV);
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (this.state.filteredMessages.length > 0) {
                        this.state.focusedIndex = 0;
                        this._updateFocus(false);
                        const targetMessage = this.state.filteredMessages[this.state.focusedIndex].element;
                        if (targetMessage) this.callbacks.onSelect?.(targetMessage);
                    }
                    break;
            }

            if (event.shiftKey && event.key === 'Tab') {
                event.preventDefault();
                this.state.focusedIndex = this.state.filteredMessages.length - 1;
                this._updateFocus(true);
                this.scrollBox.focus({ preventScroll: true });
                this._schedulePreview(this.state.focusedIndex, CONSTANTS.TIMING.DEBOUNCE_DELAYS.JUMP_LIST_PREVIEW_KEY_NAV);
            }
        }

        /** @param {KeyboardEvent} event */
        _handleKeyDown(event) {
            // Ensure the list is up-to-date before handling navigation keys
            this._flushPendingFilter();

            if (!this.scrollBox || document.activeElement !== this.scrollBox || this.state.filteredMessages.length === 0) return;

            const totalItems = this.state.filteredMessages.length;
            let newFocusedIndex = this.state.focusedIndex;

            switch (event.key) {
                case 'ArrowDown': {
                    event.preventDefault();
                    newFocusedIndex = newFocusedIndex === -1 ? 0 : (newFocusedIndex + 1) % totalItems;
                    break;
                }
                case 'ArrowUp': {
                    event.preventDefault();
                    newFocusedIndex = newFocusedIndex === -1 ? totalItems - 1 : (newFocusedIndex - 1 + totalItems) % totalItems;
                    break;
                }
                case 'Home': {
                    event.preventDefault();
                    newFocusedIndex = 0;
                    break;
                }
                case 'End': {
                    event.preventDefault();
                    newFocusedIndex = totalItems - 1;
                    break;
                }
                case 'PageDown': {
                    event.preventDefault();
                    if (newFocusedIndex === -1) newFocusedIndex = 0;
                    const itemsPerPage = Math.floor(this.state.containerHeight / this.itemHeight);
                    newFocusedIndex = Math.min(totalItems - 1, newFocusedIndex + itemsPerPage);
                    break;
                }
                case 'PageUp': {
                    event.preventDefault();
                    if (newFocusedIndex === -1) newFocusedIndex = 0;
                    const itemsPerPage = Math.floor(this.state.containerHeight / this.itemHeight);
                    newFocusedIndex = Math.max(0, newFocusedIndex - itemsPerPage);
                    break;
                }
                case 'Enter': {
                    event.preventDefault();
                    if (this.state.focusedIndex > -1) {
                        const targetMessage = this.state.filteredMessages[this.state.focusedIndex].element;
                        if (targetMessage) this.callbacks.onSelect?.(targetMessage);
                    }
                    return; // Don't update focus on enter
                }
                case 'Tab': {
                    event.preventDefault();
                    const filterInput = this.element.querySelector(`.${this.styleHandle.classes.filter}`);
                    if (filterInput instanceof HTMLInputElement) {
                        filterInput.focus();
                        filterInput.select();
                    }
                    this.state.focusedIndex = -1;
                    this._updateFocus(false);
                    // Explicitly hide preview as focus is lost
                    this._cancelScheduledPreview();
                    this._hidePreview();
                    return; // Don't update focus on tab
                }
                default:
                    return;
            }

            if (newFocusedIndex !== this.state.focusedIndex) {
                // Disable mouse interactions during keyboard navigation too
                this._disableMouseInteractions();

                // Immediately hide the current preview when moving focus.
                // It will reappear only after the debounce delay in _schedulePreview expires.
                this._hidePreview();

                this.state.focusedIndex = newFocusedIndex;
                this._updateFocus(true);
                // Schedule preview with a delay to prevent forced reflow during rapid navigation
                this._schedulePreview(this.state.focusedIndex, CONSTANTS.TIMING.DEBOUNCE_DELAYS.JUMP_LIST_PREVIEW_KEY_NAV);
            }
        }

        getFilterValue() {
            const cls = this.styleHandle.classes;
            const filterInput = this.element?.querySelector(`.${cls.filter}`);
            if (filterInput instanceof HTMLInputElement) {
                return filterInput.value || '';
            }
            return '';
        }

        /** @param {MouseEvent} event */
        _handleClick(event) {
            const target = event.target;
            if (!(target instanceof Element)) return;

            const listItem = target.closest('li');
            if (!listItem) return;

            const originalIndex = DomState.getInt(listItem, CONSTANTS.DATA_KEYS.MESSAGE_INDEX);
            if (!isNaN(originalIndex) && this.messages[originalIndex]) {
                this.callbacks.onSelect?.(this.messages[originalIndex]);
            }
        }
    }

    /**
     * @class SettingsWidgetController
     * @description Manages the persistent settings widget (button and panel).
     * Handles lifecycle, positioning, and interaction of the main menu.
     */
    class SettingsWidgetController extends BaseManager {
        /**
         * @param {object} callbacks
         * @param {() => void} callbacks.onShowJsonModal
         * @param {function(string=): void} callbacks.onShowThemeModal
         * @param {(config: AppConfig) => Promise<void>} callbacks.onSave
         * @param {() => Promise<AppConfig>} callbacks.getCurrentConfig
         * @param {() => object} callbacks.getCurrentWarning
         * @param {() => ThemeSet} callbacks.getCurrentThemeSet
         * @param {(config: AppConfig) => {size: number, isExceeded: boolean}} callbacks.checkSize
         */
        constructor(callbacks) {
            super();
            this.callbacks = callbacks;
            this.settingsButton = null;
            this.settingsPanel = null;
            this.isRepositionScheduled = false;

            // Loading state flags
            this.isPageLoading = true;
            this.isThemeLoading = false;
            this.isAutoScrolling = false;

            // Bind methods
            this.scheduleButtonPlacement = this.scheduleButtonPlacement.bind(this);
        }

        async _onInit() {
            this.isRepositionScheduled = false;
            // Initialize components
            this.settingsButton = this.manageFactory(
                CONSTANTS.RESOURCE_KEYS.SETTINGS_BUTTON,
                () =>
                    new CustomSettingsButton(
                        {
                            onClick: () => this.settingsPanel.toggle(),
                        },
                        {
                            id: `${APPID}-settings-button`,
                            title: `Settings (${APPNAME})`,
                        }
                    )
            );

            this.settingsPanel = this.manageFactory(
                CONSTANTS.RESOURCE_KEYS.SETTINGS_PANEL,
                () =>
                    new SettingsPanelComponent({
                        onSave: this.callbacks.onSave,
                        getCurrentConfig: this.callbacks.getCurrentConfig,
                        getCurrentWarning: this.callbacks.getCurrentWarning,
                        getCurrentThemeSet: this.callbacks.getCurrentThemeSet,
                        onShowJsonModal: this.callbacks.onShowJsonModal,
                        onShowThemeModal: this.callbacks.onShowThemeModal,
                        getAnchorElement: () => this.getAnchorElement(),
                        checkSize: this.callbacks.checkSize,
                        onShow: () => {}, // Handled internally
                    })
            );

            // Render and initialize components
            // Note: UI components don't use 'init' in the same way, but 'render'
            if (this.settingsButton) {
                await this.settingsButton.init();
                this.settingsButton.render();
                this.ensureButtonPlacement(); // Initial placement
                this._updateButtonLoadingState(); // Apply initial state
            }

            // Panels act as managers too
            if (this.settingsPanel) {
                await this.settingsPanel.init();
                if (this.isDestroyed) return;

                this.settingsPanel.render();
            }

            // Subscribe to layout events for the button
            this._subscribe(EVENTS.UI_REPOSITION, this.scheduleButtonPlacement);
            this._subscribe(EVENTS.DEFERRED_LAYOUT_UPDATE, this.scheduleButtonPlacement);
            this._subscribe(EVENTS.NAVIGATION_END, () => {
                this.scheduleButtonPlacement();
                // Defer the loading state update to the next UI cycle.
                EventBus.queueUIWork(() => {
                    if (this.isDestroyed) return;
                    this.isPageLoading = false;
                    this._updateButtonLoadingState();
                });
            });

            // Subscribe to events for loading state control
            this._subscribe(EVENTS.NAVIGATION_START, () => {
                // Only wait for message loading on active chat pages.
                // For non-chat pages (New Chat, Lists), skip the wait to prevent infinite loading.
                if (PlatformAdapters.General.isChatPage()) {
                    this.isPageLoading = true;
                } else {
                    this.isPageLoading = false;
                }
                this._updateButtonLoadingState();
            });
            this._subscribe(EVENTS.THEME_UPDATE, () => {
                this.isThemeLoading = true;
                this._updateButtonLoadingState();
            });
            this._subscribe(EVENTS.THEME_APPLIED, () => {
                this.isThemeLoading = false;
                this._updateButtonLoadingState();
            });
            this._subscribe(EVENTS.AUTO_SCROLL_START, () => {
                this.isAutoScrolling = true;
                this._updateButtonLoadingState();
            });
            this._subscribe(EVENTS.AUTO_SCROLL_COMPLETE, () => {
                this.isAutoScrolling = false;
                this._updateButtonLoadingState();
            });
            this._subscribe(EVENTS.CONFIG_WARNING_UPDATE, (data) => {
                // If an error occurs (warning shown), disable loading animation to prevent infinite spinning
                if (data && data.show) {
                    this.isPageLoading = false;
                    this.isThemeLoading = false;
                    this._updateButtonLoadingState();
                }
            });
        }

        _onDestroy() {
            this.settingsButton = null;
            this.settingsPanel = null;
        }

        /**
         * Updates the loading state of the settings button based on internal flags.
         * @private
         */
        _updateButtonLoadingState() {
            if (!this.settingsButton) return;

            const effectivePageLoading = PlatformAdapters.General.isChatPage() && this.isPageLoading;
            const isLoading = effectivePageLoading || this.isThemeLoading || this.isAutoScrolling;
            this.settingsButton.setLoading(isLoading);
        }

        /**
         * Returns the DOM element of the settings button.
         * Used as an anchor for positioning modals.
         * @returns {HTMLElement | null}
         */
        getAnchorElement() {
            return this.settingsButton?.element || null;
        }

        scheduleButtonPlacement() {
            if (this.isRepositionScheduled) return;
            this.isRepositionScheduled = true;
            EventBus.queueUIWork(() => {
                if (this.isDestroyed) return;
                this.ensureButtonPlacement();
                this.isRepositionScheduled = false;
            });
        }

        ensureButtonPlacement() {
            if (!this.settingsButton?.element) return;
            PlatformAdapters.UIManager.ensureButtonPlacement(this.settingsButton);
        }
    }

    /**
     * @class ModalCoordinator
     * @description Manages the lifecycle and coordination of transient modal UI components (JSON editor, Theme editor).
     */
    class ModalCoordinator extends BaseManager {
        /**
         * @param {object} callbacks
         * @param {(config: AppConfig) => Promise<void>} callbacks.onSave
         * @param {() => Promise<AppConfig>} callbacks.getCurrentConfig
         * @param {() => object} callbacks.getCurrentWarning
         * @param {DataConverter} callbacks.dataConverter
         * @param {() => HTMLElement|null} callbacks.getAnchorElement
         * @param {(config: AppConfig) => {size: number, isExceeded: boolean}} callbacks.checkSize
         */
        constructor(callbacks) {
            super();
            this.callbacks = callbacks;
            this.jsonModal = null;
            this.themeModal = null;
        }

        async _onInit() {
            // Initialize transient components
            // They are instantiated here but only render DOM when open() is called
            this.jsonModal = this.manageFactory(
                CONSTANTS.RESOURCE_KEYS.JSON_MODAL,
                () =>
                    new JsonModalComponent({
                        onSave: this.callbacks.onSave,
                        getCurrentConfig: this.callbacks.getCurrentConfig,
                        getCurrentWarning: this.callbacks.getCurrentWarning,
                        onModalOpen: () => {},
                    })
            );

            this.themeModal = this.manageFactory(
                CONSTANTS.RESOURCE_KEYS.THEME_MODAL,
                () =>
                    new ThemeModalComponent({
                        onSave: this.callbacks.onSave,
                        getCurrentConfig: this.callbacks.getCurrentConfig,
                        getCurrentWarning: this.callbacks.getCurrentWarning,
                        dataConverter: this.callbacks.dataConverter,
                        checkSize: this.callbacks.checkSize,
                        onModalOpen: () => {},
                    })
            );

            // Initialize components to ensure their lifecycle hooks (_onInit) are executed.
            // This is critical for initializing resources like debounced functions.
            if (this.jsonModal) await this.jsonModal.init();
            if (this.themeModal) await this.themeModal.init();
        }

        _onDestroy() {
            this.jsonModal = null;
            this.themeModal = null;
        }

        openJsonModal(anchorElement) {
            this.jsonModal?.open(anchorElement);
        }

        openThemeModal(themeKey) {
            this.themeModal?.open(themeKey);
        }

        /**
         * Returns the currently active modal component instance, if any.
         * @returns {JsonModalComponent | ThemeModalComponent | null}
         */
        getActiveModal() {
            if (this.jsonModal?.modal?.element?.open) {
                return this.jsonModal;
            }
            if (this.themeModal?.modal?.element?.open) {
                return this.themeModal;
            }
            return null;
        }

        /**
         * Shows a conflict notification on the active modal.
         * @param {JsonModalComponent | ThemeModalComponent} modalComponent
         * @param {() => void} reloadCallback
         */
        showConflictNotification(modalComponent, reloadCallback) {
            if (!modalComponent?.modal) return;
            this.clearConflictNotification(modalComponent);

            const conflictTextClass = StyleDefinitions.COMMON_CLASSES.conflictText;
            const modalBtnClass = StyleDefinitions.COMMON_CLASSES.modalButton;
            const conflictReloadBtnId = StyleDefinitions.COMMON_CLASSES.conflictReloadBtnId;

            const styles = SITE_STYLES;
            const messageArea = modalComponent.modal.dom.footerMessage;

            if (messageArea) {
                const messageText = h('span', {
                    textContent: 'Settings updated in another tab.',
                    style: { display: 'flex', alignItems: 'center' },
                });

                const reloadBtn = h('button', {
                    id: conflictReloadBtnId,
                    className: modalBtnClass,
                    textContent: 'Reload UI',
                    title: 'Discard local changes and load the settings from the other tab.',
                    style: {
                        borderColor: styles.PALETTE.error_text || 'red',
                        marginLeft: '12px',
                    },
                    onclick: (e) => {
                        e.preventDefault();
                        reloadCallback();
                    },
                });

                messageArea.textContent = '';
                messageArea.classList.add(conflictTextClass);
                messageArea.style.color = styles.PALETTE.error_text || 'red';
                messageArea.append(messageText, reloadBtn);
            }
        }

        /**
         * Clears the conflict notification from a modal.
         * @param {JsonModalComponent | ThemeModalComponent} modalComponent
         */
        clearConflictNotification(modalComponent) {
            if (!modalComponent?.modal) return;
            const messageArea = modalComponent.modal.dom.footerMessage;
            if (messageArea) {
                messageArea.textContent = '';
                messageArea.classList.remove(StyleDefinitions.COMMON_CLASSES.conflictText);
            }
        }
    }

    class UIManager extends BaseManager {
        /**
         * @param {(config: AppConfig) => Promise<void>} onSaveCallback
         * @param {() => Promise<AppConfig>} getCurrentConfigCallback
         * @param {DataConverter} dataConverter
         * @param {() => ThemeSet} getCurrentThemeSetCallback
         * @param {(config: AppConfig) => {size: number, isExceeded: boolean}} checkSizeCallback
         */
        constructor(onSaveCallback, getCurrentConfigCallback, dataConverter, getCurrentThemeSetCallback, checkSizeCallback) {
            super();

            // Global UI State (Source of Truth)
            this.isWarningActive = false;
            this.warningMessage = '';

            this.commonCallbacks = {
                onSave: onSaveCallback,
                getCurrentConfig: getCurrentConfigCallback,
                getCurrentWarning: () => ({ show: this.isWarningActive, message: this.warningMessage }),
                dataConverter: dataConverter,
                checkSize: checkSizeCallback,
            };
            this.getCurrentThemeSetCallback = getCurrentThemeSetCallback;

            // Individual references for internal use
            this.widgetController = null;
            this.modalCoordinator = null;
        }

        async _onInit() {
            // Initialize global common styles immediately to ensure availability
            StyleManager.request(StyleDefinitions.getCommon);

            // Initialize Sub-Controllers
            this.widgetController = this.manageFactory(
                CONSTANTS.RESOURCE_KEYS.WIDGET_CONTROLLER,
                () =>
                    new SettingsWidgetController({
                        ...this.commonCallbacks,
                        getCurrentThemeSet: this.getCurrentThemeSetCallback,
                        // Wiring: Widget -> Modal Actions
                        onShowJsonModal: () => {
                            const anchor = this.widgetController.getAnchorElement();
                            this.modalCoordinator.openJsonModal(anchor);
                        },
                        onShowThemeModal: (themeKey) => {
                            this.modalCoordinator.openThemeModal(themeKey);
                        },
                    })
            );

            this.modalCoordinator = this.manageFactory(
                CONSTANTS.RESOURCE_KEYS.MODAL_COORDINATOR,
                () =>
                    new ModalCoordinator({
                        ...this.commonCallbacks,
                        // Wiring: Modal -> Widget Anchor Access
                        getAnchorElement: () => this.widgetController.getAnchorElement(),
                    })
            );

            // Initialize sub-controllers
            if (this.widgetController) {
                await this.widgetController.init();
                if (this.isDestroyed) return;
            }

            if (this.modalCoordinator) {
                await this.modalCoordinator.init();
                if (this.isDestroyed) return;
            }

            // Subscribe to global UI state events
            this._subscribe(EVENTS.CONFIG_WARNING_UPDATE, ({ show, message }) => {
                this.isWarningActive = show;
                this.warningMessage = message;
            });
        }

        _onDestroy() {
            this.widgetController = null;
            this.modalCoordinator = null;
        }

        // --- Delegate Methods for AppController compatibility ---

        /**
         * Returns the currently active modal component instance.
         * Delegated to ModalCoordinator.
         */
        getActiveModal() {
            return this.modalCoordinator.getActiveModal();
        }

        /**
         * Shows a conflict notification on the active modal.
         * Delegated to ModalCoordinator.
         * @param {JsonModalComponent | ThemeModalComponent} modalComponent
         * @param {() => void} reloadCallback
         */
        showConflictNotification(modalComponent, reloadCallback) {
            this.modalCoordinator.showConflictNotification(modalComponent, reloadCallback);
        }

        /**
         * Clears the conflict notification from a modal.
         * Delegated to ModalCoordinator.
         * @param {JsonModalComponent | ThemeModalComponent} modalComponent
         */
        clearConflictNotification(modalComponent) {
            this.modalCoordinator.clearConflictNotification(modalComponent);
        }
    }

    // =================================================================================
    // SECTION: Main Application Controller
    // =================================================================================

    /**
     * @class Sentinel
     * @description Detects DOM node insertion using a shared, prefixed CSS animation trick.
     * @property {Map<string, Array<(element: Element) => void>>} listeners
     * @property {Set<string>} rules
     * @property {HTMLElement | null} styleElement
     * @property {CSSStyleSheet | null} sheet
     * @property {string[]} pendingRules
     * @property {WeakMap<CSSRule, string>} ruleSelectors
     */
    class Sentinel {
        /**
         * @param {string} prefix - A unique identifier for this Sentinel instance to avoid CSS conflicts. Required.
         */
        constructor(prefix) {
            if (!prefix) {
                throw new Error('[Sentinel] "prefix" argument is required to avoid CSS conflicts.');
            }

            /** @type {any} */
            const globalScope = window;
            globalScope.__global_sentinel_instances__ = globalScope.__global_sentinel_instances__ || {};
            if (globalScope.__global_sentinel_instances__[prefix]) {
                return globalScope.__global_sentinel_instances__[prefix];
            }

            // Use a unique, prefixed animation name shared by all scripts in a project.
            this.animationName = `${prefix}-global-sentinel-animation`;
            this.styleId = `${prefix}-sentinel-global-rules`; // A single, unified style element
            this.listeners = new Map();
            this.rules = new Set(); // Tracks all active selectors
            this.styleElement = null; // Holds the reference to the single style element
            this.sheet = null; // Cache the CSSStyleSheet reference
            this.pendingRules = []; // Queue for rules requested before sheet is ready
            /** @type {WeakMap<CSSRule, string>} */
            this.ruleSelectors = new WeakMap(); // Tracks selector strings associated with CSSRule objects

            this._injectStyleElement();
            document.addEventListener('animationstart', this._handleAnimationStart.bind(this), true);

            globalScope.__global_sentinel_instances__[prefix] = this;
        }

        _injectStyleElement() {
            // Ensure the style element is injected only once per project prefix.
            this.styleElement = document.getElementById(this.styleId);

            if (this.styleElement instanceof HTMLStyleElement) {
                this.sheet = this.styleElement.sheet;
                return;
            }

            // Create empty style element
            this.styleElement = h('style', {
                id: this.styleId,
            });

            // CSP Fix: Try to fetch a valid nonce from existing scripts/styles
            // "nonce" property exists on HTMLScriptElement/HTMLStyleElement, not basic Element.
            let nonce;
            const script = document.querySelector('script[nonce]');
            const style = document.querySelector('style[nonce]');

            if (script instanceof HTMLScriptElement) {
                nonce = script.nonce;
            } else if (style instanceof HTMLStyleElement) {
                nonce = style.nonce;
            }

            if (nonce) {
                this.styleElement.setAttribute('nonce', nonce);
            }

            // Try to inject immediately. If the document is not yet ready (e.g. extremely early document-start), wait for the root element.
            const target = document.head || document.documentElement;

            const initSheet = () => {
                if (this.styleElement instanceof HTMLStyleElement) {
                    this.sheet = this.styleElement.sheet;
                    // Insert the shared keyframes rule at index 0.
                    try {
                        const keyframes = `@keyframes ${this.animationName} { from { transform: none; } to { transform: none; } }`;
                        this.sheet.insertRule(keyframes, 0);
                    } catch (e) {
                        Logger.error('SENTINEL', LOG_STYLES.RED, 'Failed to insert keyframes rule:', e);
                    }
                    this._flushPendingRules();
                }
            };

            if (target) {
                target.appendChild(this.styleElement);
                initSheet();
            } else {
                const observer = new MutationObserver(() => {
                    const retryTarget = document.head || document.documentElement;
                    if (retryTarget) {
                        observer.disconnect();
                        retryTarget.appendChild(this.styleElement);
                        initSheet();
                    }
                });
                observer.observe(document, { childList: true });
            }
        }

        _flushPendingRules() {
            if (!this.sheet || this.pendingRules.length === 0) return;

            const rulesToInsert = [...this.pendingRules];
            this.pendingRules = [];

            rulesToInsert.forEach((selector) => {
                this._insertRule(selector);
            });
        }

        /**
         * Helper to insert a single rule into the stylesheet
         * @param {string} selector
         */
        _insertRule(selector) {
            try {
                const index = this.sheet.cssRules.length;
                const ruleText = `${selector} { animation-duration: 0.001s; animation-name: ${this.animationName}; }`;
                this.sheet.insertRule(ruleText, index);

                // Associate the inserted rule with the selector via WeakMap for safer removal later.
                // This mimics sentinel.js behavior to handle index shifts and selector normalization.
                const insertedRule = this.sheet.cssRules[index];
                if (insertedRule) {
                    this.ruleSelectors.set(insertedRule, selector);
                }
            } catch (e) {
                Logger.error('SENTINEL', LOG_STYLES.RED, `Failed to insert rule for selector "${selector}":`, e);
            }
        }

        _handleAnimationStart(event) {
            // Check if the animation is the one we're listening for.
            if (event.animationName !== this.animationName) return;

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            // Check if the target element matches any of this instance's selectors.
            for (const [selector, callbacks] of this.listeners.entries()) {
                if (target.matches(selector)) {
                    // Use a copy of the callbacks array in case a callback removes itself.
                    [...callbacks].forEach((cb) => cb(target));
                }
            }
        }

        /**
         * @param {string} selector
         * @param {(element: Element) => void} callback
         */
        on(selector, callback) {
            // Add callback to listeners
            if (!this.listeners.has(selector)) {
                this.listeners.set(selector, []);
            }
            this.listeners.get(selector).push(callback);

            // If selector is already registered in rules, do nothing
            if (this.rules.has(selector)) return;

            this.rules.add(selector);

            // Apply rule
            if (this.sheet) {
                this._insertRule(selector);
            } else {
                this.pendingRules.push(selector);
            }
        }

        /**
         * @param {string} selector
         * @param {(element: Element) => void} callback
         */
        off(selector, callback) {
            const callbacks = this.listeners.get(selector);
            if (!callbacks) return;

            const newCallbacks = callbacks.filter((cb) => cb !== callback);

            if (newCallbacks.length === callbacks.length) {
                return; // Callback not found, do nothing.
            }

            if (newCallbacks.length === 0) {
                // Remove listener and rule
                this.listeners.delete(selector);
                this.rules.delete(selector);

                if (this.sheet) {
                    // Iterate backwards to avoid index shifting issues during deletion
                    for (let i = this.sheet.cssRules.length - 1; i >= 0; i--) {
                        const rule = this.sheet.cssRules[i];
                        // Check for recorded selector via WeakMap or fallback to selectorText match
                        const recordedSelector = this.ruleSelectors.get(rule);

                        if (recordedSelector === selector || (rule instanceof CSSStyleRule && rule.selectorText === selector)) {
                            this.sheet.deleteRule(i);
                            // We assume one rule per selector, so we can break after deletion
                            break;
                        }
                    }
                }
            } else {
                this.listeners.set(selector, newCallbacks);
            }
        }

        suspend() {
            if (this.styleElement instanceof HTMLStyleElement) {
                this.styleElement.disabled = true;
            }
            Logger.debug('SENTINEL', LOG_STYLES.CYAN, 'Suspended.');
        }

        resume() {
            if (this.styleElement instanceof HTMLStyleElement) {
                this.styleElement.disabled = false;
            }
            Logger.debug('SENTINEL', LOG_STYLES.CYAN, 'Resumed.');
        }
    }

    // =================================================================================
    // SECTION: Toast Manager
    // Description: Manages the display of temporary toast notifications.
    // =================================================================================

    class ToastManager extends BaseManager {
        constructor() {
            super();
            this.toastElement = null;
            this.activeTimers = new Set();
            this.activeRafs = new Set();
        }

        _onInit() {
            this.styleHandle = StyleManager.request(StyleDefinitions.getToast);

            const message = PlatformAdapters.Toast.getAutoScrollMessage();
            this._subscribe(EVENTS.AUTO_SCROLL_START, () => this.show(message, true));
            this._subscribe(EVENTS.AUTO_SCROLL_COMPLETE, () => this.hide());
        }

        _onDestroy() {
            // Cancel all pending timers and animation frames
            this.activeTimers.forEach((id) => clearTimeout(id));
            this.activeTimers.clear();
            this.activeRafs.forEach((id) => cancelAnimationFrame(id));
            this.activeRafs.clear();

            // Immediately remove the element from DOM to prevent visual artifacts
            if (this.toastElement) {
                this.toastElement.remove();
                this.toastElement = null;
            }

            // Also remove any fading-out elements that might still be in the DOM
            // (e.g. from a hide() call that was interrupted by destroy)
            if (this.styleHandle) {
                const cls = this.styleHandle.classes;
                document.querySelectorAll(`.${cls.container}`).forEach((el) => el.remove());
            }
        }

        _renderToast(message, showCancelButton) {
            const cls = this.styleHandle.classes;
            const children = [h('span', message)];
            if (showCancelButton) {
                const cancelButton = h(
                    'button',
                    {
                        className: cls.cancelBtn,
                        title: 'Stop action',
                        onclick: () => EventBus.publish(EVENTS.AUTO_SCROLL_CANCEL_REQUEST),
                    },
                    'Cancel'
                );
                children.push(cancelButton);
            }
            return h(`div.${cls.container}`, children);
        }

        show(message, showCancelButton) {
            const cls = this.styleHandle.classes;
            // Remove existing toast if any
            if (this.toastElement) {
                this.hide();
            }

            this.toastElement = this._renderToast(message, showCancelButton);
            document.body.appendChild(this.toastElement);

            // Use double requestAnimationFrame to ensure the element is rendered
            // and the browser registers the initial state before adding the class.
            // This guarantees the CSS transition will fire.
            this._requestAnimationFrame(() => {
                this._requestAnimationFrame(() => {
                    this.toastElement?.classList.add(cls.visible);
                });
            });
        }

        hide() {
            if (!this.toastElement) return;
            const cls = this.styleHandle.classes;

            const el = this.toastElement;
            el.classList.remove(cls.visible);

            // Remove from DOM after transition ends using managed timer
            this._setTimeout(() => {
                el.remove();
            }, CONSTANTS.TIMING.ANIMATIONS.TOAST_LEAVE_DURATION);

            this.toastElement = null;
        }

        /**
         * @private
         * Wrapper for setTimeout that ensures cleanup on destroy.
         * @param {Function} callback
         * @param {number} delay
         */
        _setTimeout(callback, delay) {
            const id = setTimeout(() => {
                this.activeTimers.delete(id);
                callback();
            }, delay);
            this.activeTimers.add(id);
        }

        /**
         * @private
         * Wrapper for requestAnimationFrame that ensures cleanup on destroy.
         * @param {Function} callback
         */
        _requestAnimationFrame(callback) {
            const id = requestAnimationFrame(() => {
                this.activeRafs.delete(id);
                callback();
            });
            this.activeRafs.add(id);
        }
    }

    // =================================================================================
    // SECTION: Auto Scroll Manager (Base)
    // Description: Base class for platform-specific AutoScrollManagers.
    // =================================================================================

    /**
     * @class BaseAutoScrollManager
     * @extends BaseManager
     */
    class BaseAutoScrollManager extends BaseManager {
        /**
         * @param {ConfigManager} configManager
         * @param {MessageCacheManager} messageCacheManager
         */
        constructor(configManager, messageCacheManager) {
            super();
            this.configManager = configManager;
            this.messageCacheManager = messageCacheManager;
            this.isEnabled = false;
            this.isScrolling = false;
        }

        _onInit() {
            this.isEnabled = this.configManager.get().platforms[PLATFORM].features.load_full_history_on_chat_load.enabled;
            this._subscribe(EVENTS.AUTO_SCROLL_REQUEST, () => this.start());
            this._subscribe(EVENTS.AUTO_SCROLL_CANCEL_REQUEST, () => this.stop(false));
            this._subscribe(EVENTS.CACHE_UPDATED, () => this._onCacheUpdated());
            this._subscribe(EVENTS.NAVIGATION, () => this._onNavigation());

            this.addDisposable(() => this.stop(false));
        }

        _onDestroy() {
            // Cleanup handled by disposables.
        }

        enable() {
            this.isEnabled = true;
        }

        disable() {
            this.isEnabled = false;
            this.stop(false);
        }

        /**
         * @abstract
         */
        start() {
            // To be implemented by subclasses
        }

        /**
         * @abstract
         * @param {boolean} isNavigation
         */
        stop(isNavigation) {
            // To be implemented by subclasses
        }

        /**
         * @abstract
         * @protected
         */
        _onCacheUpdated() {
            // To be implemented by subclasses
        }

        /**
         * @abstract
         * @protected
         */
        _onNavigation() {
            // To be implemented by subclasses
        }
    }
    // =================================================================================
    // SECTION: App Controller (Main Controller)
    // Description: The central controller that initializes all managers,
    //              handles dependency injection, and orchestrates the application lifecycle.
    // =================================================================================

    /**
     * @class AppController
     * @property {ConfigManager} configManager
     * @property {ImageDataManager} imageDataManager
     * @property {UIManager} uiManager
     * @property {ObserverManager} observerManager
     * @property {MessageCacheManager} messageCacheManager
     * @property {AvatarManager} avatarManager
     * @property {StandingImageManager} standingImageManager
     * @property {ThemeManager} themeManager
     * @property {BubbleUIManager} bubbleUIManager
     * @property {MessageLifecycleManager} messageLifecycleManager
     * @property {FixedNavigationManager | null} fixedNavManager
     * @property {MessageNumberManager} messageNumberManager
     * @property {SyncManager} syncManager
     * @property {any} autoScrollManager
     * @property {any} toastManager
     */
    class AppController extends BaseManager {
        /**
         * @param {DataConverter} dataConverter
         * @param {ImageDataManager} imageDataManager
         */
        constructor(dataConverter, imageDataManager) {
            super();
            this.dataConverter = dataConverter;
            this.imageDataManager = imageDataManager;
            this.configManager = new ConfigManager(this.dataConverter);

            // Individual references for internal use
            this.uiManager = null;
            this.observerManager = null;
            this.messageCacheManager = null;
            this.avatarManager = null;
            this.standingImageManager = null;
            this.themeManager = null;
            this.bubbleUIManager = null;
            this.messageLifecycleManager = null;
            this.timestampManager = null;
            this.fixedNavManager = null;
            this.messageNumberManager = null;
            this.syncManager = null;
            this.autoScrollManager = null;
            this.toastManager = null;
            /** @type {(() => void) | null} */
            this.sentinelCleanup = null;
            this.isConfigSizeExceeded = false;
            this.hasLoadError = false;
            this.configWarningMessage = '';
            this.isNavigating = true;

            /** @type {BaseManager[]} */
            this.managers = [];
        }

        async _onInit() {
            // Reset failed URLs state on initialization to allow retrying previously failed images in this new session
            this.imageDataManager.clearFailedUrls();

            await this.configManager.load(true);
            if (this.isDestroyed) return;

            // Check for load errors and display warning
            if (this.configManager.loadErrors.length > 0) {
                const message = `Warning: Some settings failed to load.\n${this.configManager.loadErrors.join('\n')}\nSaving now may result in data loss. Please check console logs.`;
                this.hasLoadError = true;
                this.configWarningMessage = message;
                EventBus.publish(EVENTS.CONFIG_WARNING_UPDATE, { show: true, message });
            }

            // Set logger level from config, which includes developer settings.
            // The setLevel method itself handles invalid values gracefully.
            Logger.setLevel(this.configManager.get().developer.logger_level);
            Logger.log('', '', `Logger level is set to '${Logger.level}'.`);

            const config = this.configManager.get();
            config.themeSets = this._ensureUniqueThemeIds(config.themeSets);

            // Shared state for streaming status
            const sharedStreamingState = { isActive: false };

            // --- Manager Instantiation ---
            // Create managers that other managers depend on
            this.themeManager = this.manageFactory(CONSTANTS.RESOURCE_KEYS.THEME_MANAGER, () => new ThemeManager(this.configManager, this.imageDataManager));
            this.messageCacheManager = this.manageFactory(CONSTANTS.RESOURCE_KEYS.MESSAGE_CACHE_MANAGER, () => new MessageCacheManager(sharedStreamingState));
            this.syncManager = this.manageFactory(CONSTANTS.RESOURCE_KEYS.SYNC_MANAGER, () => new SyncManager());

            // Create the rest of the managers, injecting their dependencies
            this.observerManager = this.manageFactory(CONSTANTS.RESOURCE_KEYS.OBSERVER_MANAGER, () => new ObserverManager(this.messageCacheManager, sharedStreamingState));
            this.uiManager = this.manageFactory(
                CONSTANTS.RESOURCE_KEYS.UI_MANAGER,
                () =>
                    new UIManager(
                        (newConfig) => this.handleSave(newConfig),
                        () => Promise.resolve(this.configManager.get()),
                        this.dataConverter,
                        () => this.themeManager.getThemeSet(), // Pass the callback directly
                        (config) => ({
                            size: this.configManager.getConfigSize(config),
                            isExceeded: this.configManager.isSizeExceeded(this.configManager.getConfigSize(config)),
                        })
                    )
            );
            this.avatarManager = this.manageFactory(CONSTANTS.RESOURCE_KEYS.AVATAR_MANAGER, () => new AvatarManager(this.configManager, this.messageCacheManager));
            this.standingImageManager = this.manageFactory(CONSTANTS.RESOURCE_KEYS.STANDING_IMAGE_MANAGER, () => new StandingImageManager(this.configManager, this.messageCacheManager, this.themeManager));
            this.bubbleUIManager = this.manageFactory(CONSTANTS.RESOURCE_KEYS.BUBBLE_UI_MANAGER, () => new BubbleUIManager(this.configManager, this.messageCacheManager));
            this.messageLifecycleManager = this.manageFactory(CONSTANTS.RESOURCE_KEYS.MESSAGE_LIFECYCLE_MANAGER, () => new MessageLifecycleManager(this.messageCacheManager));
            this.toastManager = this.manageFactory(CONSTANTS.RESOURCE_KEYS.TOAST_MANAGER, () => new ToastManager());

            // Initialize platform-specific managers, which depend on core managers (like messageLifecycleManager)
            if (!this.isDestroyed) {
                PlatformAdapters.AppController.initializePlatformManagers(this);
            }

            if (PlatformAdapters.Timestamp.hasTimestampLogic()) {
                this.timestampManager = this.manageFactory(CONSTANTS.RESOURCE_KEYS.TIMESTAMP_MANAGER, () => new TimestampManager(this.configManager, this.messageCacheManager));
            }

            if (config.platforms[PLATFORM].features.fixed_nav_console.enabled) {
                this.fixedNavManager = this.manageFactory(
                    CONSTANTS.RESOURCE_KEYS.FIXED_NAV_MANAGER,
                    () =>
                        new FixedNavigationManager(
                            {
                                messageCacheManager: this.messageCacheManager,
                                configManager: this.configManager,
                                autoScrollManager: this.autoScrollManager,
                                messageLifecycleManager: this.messageLifecycleManager,
                            },
                            { isReEnabling: false }
                        )
                );
            }
            this.messageNumberManager = this.manageFactory(CONSTANTS.RESOURCE_KEYS.MESSAGE_NUMBER_MANAGER, () => new MessageNumberManager(this.configManager, this.messageCacheManager));

            // --- Manager Registration ---
            // The order determines the initialization order.
            // Dependencies should be initialized before dependents.
            this.managers = [
                this.themeManager,
                this.messageCacheManager,
                this.avatarManager,
                this.standingImageManager,
                this.bubbleUIManager,
                this.messageLifecycleManager,
                this.timestampManager,
                this.uiManager,
                this.messageNumberManager,
                this.autoScrollManager,
                this.toastManager,
                this.syncManager,
                this.fixedNavManager,
                this.observerManager,
            ].filter(Boolean); // Remove nulls

            // --- Batch Initialization ---
            for (const manager of this.managers) {
                if (manager.init && typeof manager.init === 'function') {
                    // Handle async init if necessary, though most are sync
                    await manager.init();
                    if (this.isDestroyed) return;
                }
            }

            // --- Post-Init Logic ---
            // Manually enable timestamp manager if config says so
            if (this.timestampManager && config.platforms[PLATFORM].features.timestamp.enabled) {
                this.timestampManager.enable();
            }

            // Subscribe to app-wide events
            this._subscribe(EVENTS.NAVIGATION_START, () => (this.isNavigating = true));
            this._subscribe(EVENTS.NAVIGATION_END, () => (this.isNavigating = false));
            this._subscribe(EVENTS.NAVIGATION, () => {
                sentinel.resume(); // Ensure Sentinel is active after navigation (fixes potential suspend state from AutoScroll)
                PerfMonitor.reset();
            });
            this._subscribe(EVENTS.CONFIG_SIZE_EXCEEDED, ({ message }) => {
                this.isConfigSizeExceeded = true;
                this.configWarningMessage = message;
                EventBus.publish(EVENTS.CONFIG_WARNING_UPDATE, { show: true, message });
            });
            this._subscribe(EVENTS.CONFIG_SAVE_SUCCESS, () => {
                this.isConfigSizeExceeded = false;
                this.hasLoadError = false;
                this.configWarningMessage = '';
                EventBus.publish(EVENTS.CONFIG_WARNING_UPDATE, { show: false, message: '' });
            });
            this._subscribe(EVENTS.MESSAGE_COMPLETE, (messageElement) => {
                const turnNode = messageElement.closest(CONSTANTS.SELECTORS.CONVERSATION_UNIT);
                if (turnNode) {
                    this.observerManager.observeTurnForCompletion(turnNode);
                }
                // Check if this message indicates the start of a stream
                this.observerManager.handleMessageComplete(messageElement);
            });
            this._subscribe(EVENTS.SUSPEND_OBSERVERS, () => sentinel.suspend());
            this._subscribe(EVENTS.RESUME_OBSERVERS_AND_REFRESH, () => sentinel.resume());

            // Correctly subscribe with no arguments
            this._subscribe(EVENTS.REMOTE_CONFIG_CHANGED, () => this._handleRemoteConfigChange());

            // Setup Message Processor using Platform Adapter
            // This connects the low-level Sentinel detection to the high-level EventBus.
            this.sentinelCleanup = /** @type {() => void} */ (/** @type {unknown} */ (PlatformAdapters.General.initializeSentinel((el) => this.handleRawMessage(el))));
            this.addDisposable(this.sentinelCleanup);
        }

        _onDestroy() {
            // Ensure global Sentinel is resumed if it was suspended
            sentinel.resume();

            this.managers = [];
            this.sentinelCleanup = null;

            // Release references to all managers to allow GC
            this.uiManager = null;
            this.observerManager = null;
            this.messageCacheManager = null;
            this.avatarManager = null;
            this.standingImageManager = null;
            this.themeManager = null;
            this.bubbleUIManager = null;
            this.messageLifecycleManager = null;
            this.timestampManager = null;
            this.fixedNavManager = null;
            this.messageNumberManager = null;
            this.syncManager = null;
            this.autoScrollManager = null;
            this.toastManager = null;

            Logger.log('APP', '', 'AppController destroyed.');
        }

        /**
         * Handles raw message elements detected by Sentinel.
         * @param {HTMLElement} contentElement
         */
        handleRawMessage(contentElement) {
            if (!this.isInitialized) return;
            EventBus.publish(EVENTS.RAW_MESSAGE_ADDED, contentElement);
        }

        async _handleRemoteConfigChange() {
            const activeModal = this.uiManager.getActiveModal?.();

            if (activeModal) {
                // Modal open: Show conflict notification.
                // The user can choose to reload, which will trigger _performFullReload.
                Logger.warn('SYNC', LOG_STYLES.YELLOW, 'Remote change detected while modal is open. Showing conflict.');
                this.uiManager.showConflictNotification(activeModal, () => this._performFullReload());
            } else {
                // No modal: Silent update.
                Logger.info('SYNC', LOG_STYLES.TEAL, 'Remote change detected. Reloading...');
                await this._performFullReload();
            }
        }

        /**
         * Reloads the configuration from storage and applies changes.
         * Used for silent updates and manual reloads from conflict dialogs.
         */
        async _performFullReload() {
            try {
                // 1. Snapshot old config to detect changes
                const oldConfig = deepClone(this.configManager.get());
                const oldTimestampEnabled = oldConfig.platforms[PLATFORM].features.timestamp.enabled;

                // 2. Load latest from storage (updates ConfigManager state)
                const newConfig = await this.configManager.load(true);
                if (this.isDestroyed) return;

                // 3. Detect changes
                const { themeChanged } = this._detectConfigChanges(oldConfig, newConfig);

                // 4. Apply Updates
                await this._applyUiUpdates(newConfig, themeChanged, oldTimestampEnabled);

                // Reset warning state as we have successfully reloaded a valid config
                EventBus.publish(EVENTS.CONFIG_WARNING_UPDATE, { show: false, message: '' });

                Logger.info('SYNC', LOG_STYLES.TEAL, 'Configuration reloaded from storage.');
            } catch (e) {
                Logger.error('RELOAD FAILED', LOG_STYLES.RED, 'Failed to reload configuration:', e);
            }
        }

        /**
         * Prepares a config object for saving by merging with defaults and sanitizing.
         * @param {object} partialConfig
         * @returns {AppConfig}
         */
        _prepareConfig(partialConfig) {
            // Create a complete config object by merging the incoming data with defaults.
            let completeConfig = resolveConfig(deepClone(DEFAULT_THEME_CONFIG), partialConfig);

            // Ensure all theme IDs are unique before proceeding.
            completeConfig.themeSets = this._ensureUniqueThemeIds(completeConfig.themeSets);

            // Sanitize and validate the entire configuration using the central processor.
            completeConfig = ConfigProcessor.process(completeConfig);

            return completeConfig;
        }

        /**
         * Compares two config objects to determine what aspects have changed.
         * @param {AppConfig} oldConfig
         * @param {AppConfig} newConfig
         * @returns {{ themeChanged: boolean }}
         */
        _detectConfigChanges(oldConfig, newConfig) {
            let themeChanged = JSON.stringify(oldConfig.themeSets) !== JSON.stringify(newConfig.themeSets) || JSON.stringify(oldConfig.platforms[PLATFORM].defaultSet) !== JSON.stringify(newConfig.platforms[PLATFORM].defaultSet);

            // If the icon size has changed, we must treat it as a theme content change
            const oldIconSize = oldConfig.platforms[PLATFORM].options.icon_size;
            const newIconSize = newConfig.platforms[PLATFORM].options.icon_size;
            if (oldIconSize !== newIconSize) {
                themeChanged = true;
            }

            return { themeChanged };
        }

        async _applyUiUpdates(completeConfig, themeChanged, oldTimestampEnabled) {
            this.avatarManager.updateIconSizeCss();
            this.bubbleUIManager.updateAll();
            this.messageNumberManager.updateAllMessageNumbers();

            // Publish an event to notify components of the configuration update.
            // The settings panel will listen for this to repopulate itself if it's open.
            EventBus.publish(EVENTS.CONFIG_UPDATED, completeConfig);

            // Only trigger a full theme update if theme-related data has changed.
            if (themeChanged) {
                this.themeManager.cachedThemeSet = null;
                this.themeManager.updateTheme(themeChanged);
            } else {
                // Otherwise, just apply the layout-specific changes.
                this.themeManager.applyChatContentMaxWidth();
            }

            // Handle TimestampManager lifecycle
            if (this.timestampManager) {
                const newTimestampEnabled = completeConfig.platforms[PLATFORM].features.timestamp.enabled;

                if (newTimestampEnabled && !oldTimestampEnabled) {
                    this.timestampManager.enable();
                } else if (!newTimestampEnabled && oldTimestampEnabled) {
                    this.timestampManager.disable();
                } else if (newTimestampEnabled) {
                    // If already enabled, just force an update (e.g., if nav console was toggled)
                    this.timestampManager.updateAllTimestamps();
                }
            }

            // Handle FixedNavigationManager lifecycle
            const navConsoleEnabled = completeConfig.platforms[PLATFORM].features.fixed_nav_console.enabled;
            if (navConsoleEnabled && !this.fixedNavManager) {
                this.fixedNavManager = this.manageFactory(
                    CONSTANTS.RESOURCE_KEYS.FIXED_NAV_MANAGER,
                    () =>
                        new FixedNavigationManager(
                            {
                                messageCacheManager: this.messageCacheManager,
                                configManager: this.configManager,
                                autoScrollManager: this.autoScrollManager,
                                messageLifecycleManager: this.messageLifecycleManager,
                            },
                            { isReEnabling: true }
                        )
                );
                // Register the new manager to the lifecycle list
                if (this.fixedNavManager) {
                    this.managers.push(this.fixedNavManager);
                    await this.fixedNavManager.init();
                    // Explicitly notify the new instance with the current cache state
                    this.messageCacheManager.notify();
                }
            } else if (!navConsoleEnabled && this.fixedNavManager) {
                this.fixedNavManager.destroy();
                // Remove from the lifecycle list
                this.managers = this.managers.filter((m) => m !== this.fixedNavManager);
                this.fixedNavManager = null;
            } else if (this.fixedNavManager) {
                // If the manager already exists, tell it to re-render with the new config.
                this.fixedNavManager.updateUI();
                this.fixedNavManager.scheduleReposition();
            }
            PlatformAdapters.AppController.applyPlatformSpecificUiUpdates(this, completeConfig);
        }

        /** @param {AppConfig} newConfig */
        async handleSave(newConfig) {
            try {
                const oldConfig = this.configManager.get();
                const oldTimestampEnabled = oldConfig.platforms[PLATFORM].features.timestamp.enabled;

                const completeConfig = this._prepareConfig(newConfig);

                await this.configManager.save(completeConfig);
                if (this.isDestroyed) return;

                // Check changes between the *original* config and the *newly saved* config
                const { themeChanged } = this._detectConfigChanges(oldConfig, completeConfig);

                // Apply the new logger level immediately and provide feedback only if changed.
                const currentLogLevel = Logger.level;
                const newLogLevel = completeConfig.developer.logger_level;

                if (currentLogLevel !== newLogLevel) {
                    Logger.setLevel(newLogLevel);
                    // Use console.warn to ensure the message is visible regardless of the new level.
                    console.warn(LOG_PREFIX, `Logger level is '${Logger.level}'.`);
                }

                const activeModal = this.uiManager.getActiveModal?.();
                if (activeModal) {
                    this.uiManager.clearConflictNotification(activeModal);
                }

                await this._applyUiUpdates(completeConfig, themeChanged, oldTimestampEnabled);
            } catch (e) {
                Logger.error('SAVE FAILED', LOG_STYLES.RED, 'Configuration save failed:', e.message);
                EventBus.publish(EVENTS.CONFIG_SIZE_EXCEEDED, { message: `Save failed: ${e.message}` });
                throw e; // Re-throw the error for the UI layer to catch
            }
        }

        /**
         * Ensures all themes have a unique themeId, assigning one if missing or duplicated.
         * This method operates immutably by returning a new array.
         * @param {ThemeSet[]} themeSets The array of theme sets to sanitize.
         * @returns {ThemeSet[]} A new, sanitized array of theme sets.
         * @private
         */
        _ensureUniqueThemeIds(themeSets) {
            if (!Array.isArray(themeSets)) return [];
            const seenIds = new Set();
            // Use map to create a new array with unique IDs
            return themeSets.map((originalTheme) => {
                // Deep copy to avoid mutating the original theme object in the array
                const theme = deepClone(originalTheme);
                if (!theme.metadata) {
                    theme.metadata = { id: '', name: 'Unnamed Theme', matchPatterns: [], urlPatterns: [] };
                }
                const id = theme.metadata.id;
                if (typeof id !== 'string' || id.trim() === '' || seenIds.has(id)) {
                    theme.metadata.id = generateUniqueId('theme');
                }
                seenIds.add(theme.metadata.id);
                return theme;
            });
        }
    }

    /**
     * @class LifecycleManager
     * @extends BaseManager
     * @description Manages the application lifecycle, handling URL changes and DOM readiness to initialize or destroy the AppController.
     */
    class LifecycleManager extends BaseManager {
        constructor() {
            super();
            this.appController = null;
            // Persist data conversion and caching services across app lifecycles (navigations)
            this.dataConverter = new DataConverter();
            this.imageDataManager = new ImageDataManager(this.dataConverter);
        }

        async _onInit() {
            // Initialize NavigationMonitor as a managed resource
            this.manageFactory(CONSTANTS.RESOURCE_KEYS.NAVIGATION_MONITOR, () => {
                const monitor = new NavigationMonitor();
                monitor.init();
                return monitor;
            });

            // Check for exclusion immediately when navigation starts to stop processes early
            this._subscribe(EVENTS.NAVIGATION_START, () => this._handleNavigationStart());

            // Check for launch eligibility after navigation settles
            this._subscribe(EVENTS.NAVIGATION, () => this._handleNavigation());

            // Initial check
            this._handleNavigation();
        }

        _onDestroy() {
            this.appController = null;
        }

        _handleNavigationStart() {
            if (PlatformAdapters.General.isExcludedPage()) {
                Logger.log('EXCLUDED URL', LOG_STYLES.YELLOW, 'Excluded URL detected. Suspending script functions.');
                this._shutdown();
            }
        }

        _handleNavigation() {
            if (PlatformAdapters.General.isExcludedPage()) {
                // Ensure shutdown if not caught by start event (redundant safety)
                this._shutdown();
            } else {
                this._tryLaunch();
            }
        }

        _tryLaunch() {
            // If already running, do nothing
            if (this.appController) return;

            // Enable Timestamp monitoring immediately upon valid URL detection.
            // This ensures we catch early API calls even before the DOM is ready.
            PlatformAdapters.Timestamp.init();

            const anchorSelector = CONSTANTS.SELECTORS.INPUT_TEXT_FIELD_TARGET;
            const anchor = document.querySelector(anchorSelector);

            if (anchor) {
                this._launchApp();
            } else {
                // Define the listener logic
                const listener = () => {
                    // Double check exclusion in case URL changed while waiting
                    if (!PlatformAdapters.General.isExcludedPage()) {
                        this._launchApp();
                    }
                };

                // Start listening
                sentinel.on(anchorSelector, listener);
                Logger.log('LIFECYCLE', LOG_STYLES.YELLOW, 'Waiting for anchor element...');

                // Register the cleanup function
                this.manageResource(CONSTANTS.RESOURCE_KEYS.ANCHOR_LISTENER, () => {
                    sentinel.off(anchorSelector, listener);
                });
            }
        }

        async _launchApp() {
            // Cleanup anchor listener as we are launching
            this.manageResource(CONSTANTS.RESOURCE_KEYS.ANCHOR_LISTENER, null);

            if (!this.appController) {
                Logger.log('LIFECYCLE', LOG_STYLES.YELLOW, 'Launching AppController...');

                // Initialize AppController and register it as a resource
                // Inject the persistent data/image managers
                this.appController = this.manageFactory(CONSTANTS.RESOURCE_KEYS.APP_CONTROLLER, () => new AppController(this.dataConverter, this.imageDataManager));

                if (this.appController) {
                    await this.appController.init();
                }
            }
        }

        _shutdown() {
            // Cleanup anchor listener
            this.manageResource(CONSTANTS.RESOURCE_KEYS.ANCHOR_LISTENER, null);

            PlatformAdapters.Timestamp.cleanup(); // Disable Timestamp monitoring

            if (this.appController) {
                Logger.log('LIFECYCLE', LOG_STYLES.YELLOW, 'Shutting down AppController (Excluded Page).');
                // Dispose the resource (calls destroy())
                this.manageResource(CONSTANTS.RESOURCE_KEYS.APP_CONTROLLER, null);
                // Explicitly clear reference to prevent double-launch issues
                this.appController = null;
            }
        }
    }

    // =================================================================================
    // SECTION: Entry Point
    // =================================================================================

    // Exit if already executed
    if (ExecutionGuard.hasExecuted()) return;
    // Set executed flag if not executed yet
    ExecutionGuard.setExecuted();

    // Singleton instance for observing DOM node insertions.
    const sentinel = new Sentinel(OWNERID);

    // Initialize network interception immediately to capture early data, but only if not on an excluded page.
    if (!PlatformAdapters.General.isExcludedPage()) {
        PlatformAdapters.Timestamp.init();
    }

    // Initialize lifecycle management to handle app startup and navigation
    const lifecycleManager = new LifecycleManager();
    lifecycleManager.init();

    // =================================================================================
    // SECTION: Platform Definition Factories
    // Description: Encapsulates platform-specific constants and adapters to abstract site differences.
    // =================================================================================

    /**
     * Identifies the current platform based on the hostname.
     * @returns {string | null}
     */
    function identifyPlatform() {
        const hostname = window.location.hostname;
        if (hostname.endsWith(PLATFORM_DEFS.CHATGPT.HOST)) {
            return PLATFORM_DEFS.CHATGPT.NAME;
        }
        if (hostname.endsWith(PLATFORM_DEFS.GEMINI.HOST)) {
            return PLATFORM_DEFS.GEMINI.NAME;
        }
        return null;
    }

    /**
     * Returns definitions and adapters specifically for ChatGPT.
     * @returns {PlatformDefinitions} The set of constants and adapters.
     */
    function defineChatGPTValues() {
        // =============================================================================
        // SECTION: Platform Constants
        // =============================================================================

        // ---- Default Settings & Theme Configuration ----
        const CONSTANTS = {
            ...SHARED_CONSTANTS,
            UI_SPECS: {
                ...SHARED_CONSTANTS.UI_SPECS,
                HEADER_POSITION_MIN_WIDTH: 960,
            },
            OBSERVER_OPTIONS: {
                childList: true,
                subtree: false,
            },
            Z_INDICES: {
                ...SHARED_CONSTANTS.Z_INDICES,
                BUBBLE_NAVIGATION: 'auto',
                STANDING_IMAGE: 'auto',
                NAV_CONSOLE: 'auto',
            },
            ATTRIBUTES: {
                MESSAGE_ROLE: 'data-message-author-role',
                TURN_ROLE: 'data-turn',
                MESSAGE_ID: 'data-message-id',
            },
            SELECTORS: {
                // --- Main containers ---
                MAIN_APP_CONTAINER: 'div[data-scroll-root="true"]',
                MESSAGE_WRAPPER_FINDER: '.w-full',
                MESSAGE_WRAPPER: 'chat-wrapper',
                // Root container for message search optimization
                MESSAGES_ROOT: 'main',

                // --- Message containers ---
                CONVERSATION_UNIT: 'article[data-testid^="conversation-turn-"]',
                MESSAGE_ID_HOLDER: '[data-message-id]',
                MESSAGE_CONTAINER_PARENT: 'div:has(> article[data-testid^="conversation-turn-"])',
                MESSAGE_ROOT_NODE: 'article[data-testid^="conversation-turn-"]',

                // --- Selectors for messages ---
                USER_MESSAGE: 'div[data-message-author-role="user"]',
                ASSISTANT_MESSAGE: 'div[data-message-author-role="assistant"]',

                // --- Selectors for finding elements to tag ---
                RAW_USER_BUBBLE: 'div.user-message-bubble-color',
                RAW_ASSISTANT_BUBBLE: 'div:has(> .markdown)',
                ASSISTANT_MESSAGE_CONTENT: 'div.markdown.prose',
                RAW_USER_IMAGE_BUBBLE: 'div.overflow-hidden:has(img)',
                RAW_ASSISTANT_IMAGE_BUBBLE: 'div.group\\/imagegen-image',

                // --- Text content ---
                USER_TEXT_CONTENT: '.whitespace-pre-wrap',
                ASSISTANT_TEXT_CONTENT: '.markdown',

                // --- Input area ---
                INPUT_AREA_BG_TARGET: 'form[data-type="unified-composer"] div[style*="border-radius"]',
                INPUT_TEXT_FIELD_TARGET: 'div.ProseMirror#prompt-textarea',
                INPUT_RESIZE_TARGET: 'form[data-type="unified-composer"] div[style*="border-radius"]',

                // --- Input area (Button Injection) ---
                INSERTION_ANCHOR: 'form[data-type="unified-composer"] div[class*="[grid-area:trailing]"]',

                // --- Avatar area ---
                AVATAR_USER: 'article[data-turn="user"]',
                AVATAR_ASSISTANT: 'article[data-turn="assistant"]',

                // --- Selectors for Avatar ---
                SIDE_AVATAR_CONTAINER: '.side-avatar-container',
                SIDE_AVATAR_ICON: '.side-avatar-icon',
                SIDE_AVATAR_NAME: '.side-avatar-name',

                // --- Other UI Selectors ---
                SIDEBAR_WIDTH_TARGET: 'div[id="stage-slideover-sidebar"]',
                SIDEBAR_STATE_INDICATOR: '#stage-sidebar-tiny-bar',
                RIGHT_SIDEBAR: 'div.bg-token-sidebar-surface-primary.shrink-0:not(#stage-slideover-sidebar)',
                CHAT_CONTENT_MAX_WIDTH: '.group\\/turn-messages, div[class*="--thread-content-max-width"].grid',
                SCROLL_CONTAINER: 'div[data-scroll-root="true"]',
                STANDING_IMAGE_ANCHOR: '.group\\/turn-messages, div[class*="--thread-content-max-width"].grid',
                PLACEHOLDER_PREFIX: 'placeholder-request-',
                SCROLL_TO_BOTTOM_BUTTON: '#thread-bottom-container button.absolute.z-30.rounded-full',

                // --- Site Specific Selectors ---
                BUTTON_SHARE_CHAT: '[data-testid="share-chat-button"]',
                PAGE_HEADER: '#page-header',
                TITLE_OBSERVER_TARGET: 'title',

                // --- Header Integration Selectors ---
                HEADER_ACTIONS: '#conversation-header-actions',
                HEADER_FALLBACK_SECTION: '#page-header > div:last-child',

                // --- BubbleFeature-specific Selectors ---
                BUBBLE_FEATURE_MESSAGE_CONTAINERS: 'div[data-message-author-role]',
                BUBBLE_FEATURE_TURN_CONTAINERS: 'article[data-testid^="conversation-turn-"]',

                // --- FixedNav-specific Selectors ---
                FIXED_NAV_INPUT_AREA_TARGET: 'form[data-type="unified-composer"]',
                FIXED_NAV_MESSAGE_CONTAINERS: 'div[data-message-author-role]',
                FIXED_NAV_TURN_CONTAINER: 'article[data-testid^="conversation-turn-"]',
                FIXED_NAV_ROLE_USER: 'user',
                FIXED_NAV_ROLE_ASSISTANT: 'assistant',

                // --- Turn Completion Selector ---
                TURN_COMPLETE_SELECTOR: 'button[data-testid="copy-turn-action-button"]',

                // --- Canvas ---
                CANVAS_CONTAINER: 'section.popover button',
                CANVAS_RESIZE_TARGET: 'section.popover',

                // --- Research Panel ---
                RESEARCH_PANEL: '[data-testid="screen-threadFlyOut"]',
                SIDEBAR_SURFACE_PRIMARY: 'div[class*="bg-token-sidebar-surface-primary"]',

                // --- Deep Research ---
                DEEP_RESEARCH_RESULT: '.deep-research-result',

                // --- Style Optimization Selectors (JS-based :has replacement) ---
                PROJECT_PAGE_CLASS: `${APPID}-project-page`,
                PROJECT_TITLE_INPUT: '[name="project-title"]',
                CONTENT_FADE_TOP: '.content-fade-top',
            },
            URL_PATTERNS: {
                EXCLUDED: [/^\/library/, /^\/codex/, /^\/gpts/, /^\/images/, /^\/apps/],
                CONVERSATION_ENDPOINT: '/backend-api/conversation',
            },
        };

        // ---- Site-specific Style Variables ----
        const UI_PALETTE = {
            bg: 'var(--main-surface-primary)',
            input_bg: 'var(--bg-primary)',
            text_primary: 'var(--text-primary)',
            text_secondary: 'var(--text-secondary)',
            border: 'var(--border-default)',
            border_medium: 'var(--border-medium)',
            border_light: 'var(--border-light)',
            btn_bg: 'var(--interactive-bg-tertiary-default)',
            btn_hover_bg: 'var(--interactive-bg-secondary-hover)',
            btn_text: 'var(--text-primary)',
            btn_border: 'var(--border-default)',
            toggle_bg_off: 'var(--bg-primary)',
            toggle_bg_on: 'var(--text-accent)',
            toggle_knob: 'var(--text-primary)',
            danger_text: 'var(--text-danger)',
            accent_text: 'var(--text-accent)',
            loading_spinner: '#ffca28',
            // Shared properties
            slider_display_text: 'var(--text-primary)',
            label_text: 'var(--text-secondary)',
            error_text: 'var(--text-danger)',
            // Component Specifics: Settings Button
            settings_btn_width: 'calc(var(--spacing)*9)',
            settings_btn_height: 'calc(var(--spacing)*9)',
            settings_btn_color: 'var(--text-primary)',
            settings_btn_hover_bg: 'var(--interactive-bg-secondary-hover)',
            // Component Specifics: Theme Modal
            delete_confirm_btn_text: 'var(--interactive-label-danger-secondary-default)',
            delete_confirm_btn_bg: 'var(--interactive-bg-danger-secondary-default)',
            delete_confirm_btn_hover_text: 'var(--interactive-label-danger-secondary-hover)',
            delete_confirm_btn_hover_bg: 'var(--interactive-bg-danger-secondary-hover)',
            // Component Specifics: Fixed Nav
            fixed_nav_bg: 'var(--sidebar-surface-primary)',
            fixed_nav_border: 'var(--border-medium)',
            fixed_nav_separator_bg: 'var(--border-default)',
            fixed_nav_label_text: 'var(--text-secondary)',
            fixed_nav_counter_bg: 'var(--bg-primary)',
            fixed_nav_counter_text: 'var(--text-primary)',
            fixed_nav_counter_border: 'var(--border-accent)',
            fixed_nav_assistant_text: '#e57373',
            fixed_nav_btn_accent_text: 'var(--text-accent)',
            fixed_nav_btn_danger_text: 'var(--text-danger)',
            fixed_nav_highlight_outline: 'var(--text-accent)',
            fixed_nav_highlight_radius: '12px',
            // Component Specifics: Jump List
            jump_list_bg: 'var(--sidebar-surface-primary)',
            jump_list_border: 'var(--border-medium)',
            jump_list_hover_outline: 'var(--text-accent)',
            jump_list_current_outline: 'var(--text-accent)',
        };

        const SITE_STYLES = {
            PALETTE: UI_PALETTE,
            Z_INDICES: CONSTANTS.Z_INDICES,
            CSS_IMPORTANT_FLAG: ' !important',
        };

        // =================================================================================
        // SECTION: Platform-Specific Adapter Classes
        // Description: Implementation of Base Adapters for ChatGPT.
        // =================================================================================

        class ChatGPTGeneralAdapter extends BaseGeneralAdapter {
            /** @override */
            isCanvasModeActive() {
                return !!document.querySelector(CONSTANTS.SELECTORS.CANVAS_CONTAINER);
            }

            /** @override */
            isExcludedPage() {
                const excludedPatterns = CONSTANTS.URL_PATTERNS.EXCLUDED;
                const pathname = window.location.pathname;
                return excludedPatterns.some((pattern) => pattern.test(pathname));
            }

            /** @override */
            isNewChatPage() {
                const path = window.location.pathname;
                // Main new chat page or GPT/Project top page (no conversation ID)
                return path === '/' || (path.startsWith('/g/') && !path.includes('/c/'));
            }

            /** @override */
            isChatPage() {
                // Any URL containing '/c/' is a conversation page
                return window.location.pathname.includes('/c/');
            }

            /** @override */
            getMessagesRoot() {
                const root = document.querySelector(CONSTANTS.SELECTORS.MESSAGES_ROOT);
                return root instanceof HTMLElement ? root : document.body;
            }

            /** @override */
            getMessageId(element) {
                if (!element) return null;
                return element.getAttribute(CONSTANTS.ATTRIBUTES.MESSAGE_ID);
            }

            /** @override */
            getMessageRole(messageElement) {
                if (!messageElement) return null;
                // First, check for the message role attribute (div[data-message-author-role])
                const role = messageElement.getAttribute(CONSTANTS.ATTRIBUTES.MESSAGE_ROLE);
                if (role) {
                    return role;
                }
                // If not found, check for the turn attribute (article[data-turn])
                // This is used by the AvatarManager's self-healing Sentinel listener.
                return messageElement.getAttribute(CONSTANTS.ATTRIBUTES.TURN_ROLE);
            }

            /** @override */
            getChatTitle() {
                // gets the title from the document title.
                return document.title.trim();
            }

            /** @override */
            getJumpListDisplayText(messageElement) {
                const role = messageElement.getAttribute(CONSTANTS.ATTRIBUTES.MESSAGE_ROLE);

                // 1. Check for text content first.
                if (role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_USER) {
                    const contentEl = messageElement.querySelector(CONSTANTS.SELECTORS.USER_TEXT_CONTENT);
                    if (contentEl) return contentEl.textContent.trim();
                } else {
                    const contentEl = messageElement.querySelector(CONSTANTS.SELECTORS.ASSISTANT_TEXT_CONTENT);
                    if (contentEl) return contentEl.textContent.trim();
                }

                // 2. If no text, check for an image within the message container.
                if (messageElement.querySelector(CONSTANTS.SELECTORS.RAW_USER_IMAGE_BUBBLE) || messageElement.querySelector(CONSTANTS.SELECTORS.RAW_ASSISTANT_IMAGE_BUBBLE)) {
                    return '(Image)';
                }

                // 3. If neither, return empty.
                return '';
            }

            /** @override */
            findMessageElement(contentElement) {
                const messageElement = contentElement.closest(CONSTANTS.SELECTORS.BUBBLE_FEATURE_MESSAGE_CONTAINERS);

                // Filter out placeholder elements created during generation to prevent false positives (NAV SKIP logs).
                // These elements often lack the necessary structure for UI injection immediately after creation.
                if (messageElement instanceof HTMLElement) {
                    const messageId = this.getMessageId(messageElement);
                    if (messageId && messageId.startsWith(CONSTANTS.SELECTORS.PLACEHOLDER_PREFIX)) {
                        return null;
                    }
                    return messageElement;
                }

                return null;
            }

            /** @override */
            filterMessage(messageElement) {
                // Filter out placeholder elements created during generation.
                // Including these would cause the message count to fluctuate incorrectly during streaming.
                const messageId = this.getMessageId(messageElement);
                if (messageId && messageId.startsWith(CONSTANTS.SELECTORS.PLACEHOLDER_PREFIX)) {
                    return false;
                }

                const role = this.getMessageRole(messageElement);
                if (role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_ASSISTANT) {
                    // Check if the message has any visible content, either text or an image generated by our script.
                    const hasText = messageElement.querySelector(CONSTANTS.SELECTORS.ASSISTANT_TEXT_CONTENT)?.textContent?.trim();
                    const hasImage = messageElement.querySelector(CONSTANTS.SELECTORS.RAW_ASSISTANT_IMAGE_BUBBLE);

                    // If it has neither text nor an image inside it, check the turn context.
                    if (!hasText && !hasImage) {
                        const turnContainer = messageElement.closest(CONSTANTS.SELECTORS.CONVERSATION_UNIT);
                        // If the turn contains an image elsewhere, this empty message is likely a ghost artifact. Filter it out.
                        if (turnContainer && turnContainer.querySelector(CONSTANTS.SELECTORS.RAW_ASSISTANT_IMAGE_BUBBLE)) {
                            return false; // Exclude this ghost message
                        }
                    }
                }
                return true; // Keep all other messages
            }

            /** @override */
            ensureMessageContainerForImage(imageContentElement) {
                // If already inside a message container, do nothing and return it.
                const existingContainer = imageContentElement.closest(CONSTANTS.SELECTORS.BUBBLE_FEATURE_MESSAGE_CONTAINERS);
                if (existingContainer instanceof HTMLElement) {
                    return existingContainer;
                }

                // Create a new virtual message container.
                const uniqueIdAttr = DomState.toAttributeName(CONSTANTS.DATA_KEYS.UNIQUE_ID);
                const virtualMessage = h('div', {
                    'data-message-author-role': 'assistant',
                    [uniqueIdAttr]: generateUniqueId('virtual-msg'),
                });

                if (!(virtualMessage instanceof HTMLElement)) {
                    return null;
                }

                // Replace the image element with the new wrapper, and move the image inside.
                imageContentElement.parentNode.insertBefore(virtualMessage, imageContentElement);
                virtualMessage.appendChild(imageContentElement);

                return virtualMessage;
            }

            /** @override */
            initializeSentinel(callback) {
                // Create exclusion selector for processed items to reduce browser load
                const notProcessed = `:not(.${CONSTANTS.CLASSES.PROCESSED})`;

                // prettier-ignore
                const userContentSelector = [
                    `${CONSTANTS.SELECTORS.USER_MESSAGE} ${CONSTANTS.SELECTORS.RAW_USER_BUBBLE}${notProcessed}`,
                    `${CONSTANTS.SELECTORS.USER_MESSAGE} ${CONSTANTS.SELECTORS.RAW_USER_IMAGE_BUBBLE}${notProcessed}`,
                ].join(', ');

                // prettier-ignore
                const assistantContentSelector = [
                    // Use lightweight selector for assistant content to avoid :has() cost in Sentinel
                    `${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE_CONTENT}${notProcessed}`,
                    `${CONSTANTS.SELECTORS.RAW_ASSISTANT_IMAGE_BUBBLE}${notProcessed}`,
                ].join(', ');

                const combinedSelector = `${userContentSelector}, ${assistantContentSelector}`;

                sentinel.on(combinedSelector, callback);

                return () => {
                    sentinel.off(combinedSelector, callback);
                };
            }

            /** @override */
            performInitialScan(lifecycleManager) {
                Logger.debug('SCAN', LOG_STYLES.CYAN, 'Performing initial scan for message elements.');

                // prettier-ignore
                const selectors = [
                        CONSTANTS.SELECTORS.RAW_USER_BUBBLE,
                        CONSTANTS.SELECTORS.ASSISTANT_MESSAGE_CONTENT,
                        CONSTANTS.SELECTORS.RAW_USER_IMAGE_BUBBLE,
                        CONSTANTS.SELECTORS.RAW_ASSISTANT_IMAGE_BUBBLE
                    ];

                const notProcessed = `:not(.${CONSTANTS.CLASSES.PROCESSED})`;
                const selector = selectors.map((s) => `${s}${notProcessed}`).join(', ');

                const nodes = document.querySelectorAll(selector);
                nodes.forEach((node) => {
                    lifecycleManager.processRawMessage(node);
                });

                if (nodes.length > 0) {
                    Logger.log('', '', `Found ${nodes.length} unprocessed item(s) on initial scan.`);
                }
                return nodes.length;
            }

            /** @override */
            onNavigationEnd(lifecycleManager) {
                // Start polling only on non-Firefox browsers and on existing chat pages.
                if (!isFirefox() && !isNewChatPage()) {
                    Logger.log('', '', 'Non-Firefox browser and existing chat detected, starting polling scan.');
                    lifecycleManager.startPollingScan();
                }
            }

            /** @override */
            scrollTo(element, options) {
                const { offset = 0, smooth = false } = options || {};
                const behavior = smooth ? 'smooth' : 'auto';

                const scrollContainerSelector = CONSTANTS.SELECTORS.SCROLL_CONTAINER;
                const scrollContainer = scrollContainerSelector ? document.querySelector(scrollContainerSelector) : null;

                if (scrollContainer) {
                    // Find the actual bubble element to be used as the scroll target.
                    const bubbleSelector = `${CONSTANTS.SELECTORS.RAW_USER_BUBBLE}, ${CONSTANTS.SELECTORS.RAW_ASSISTANT_BUBBLE}`;
                    const scrollTargetElement = element.querySelector(bubbleSelector) || element;
                    const targetScrollTop = scrollContainer.scrollTop + scrollTargetElement.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top - offset;
                    scrollContainer.scrollTo({
                        top: targetScrollTop,
                        behavior,
                    });
                }
            }
        }

        class ChatGPTStyleManagerAdapter extends BaseStyleManagerAdapter {
            /** @override */
            getStaticCss(cls) {
                return `
                    :root {
                        ${CSS_VARS.MESSAGE_MARGIN_TOP}: 24px;
                    }
                    ${CONSTANTS.SELECTORS.MAIN_APP_CONTAINER} {
                        transition: background-image 0.3s ease-in-out;
                    }
                    /* Add margin between messages to prevent overlap */
                    ${CONSTANTS.SELECTORS.USER_MESSAGE},
                    ${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} {
                        margin-top: var(${CSS_VARS.MESSAGE_MARGIN_TOP});
                    }
                    ${CONSTANTS.SELECTORS.USER_MESSAGE} ${CONSTANTS.SELECTORS.RAW_USER_BUBBLE},
                    ${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.RAW_ASSISTANT_BUBBLE} {
                        box-sizing: border-box;
                    }
                    /* (2025/12/17 updated) Hide borders, shadows, and backgrounds on the header */
                    #page-header {
                        background: none !important;
                        border: none !important;
                        box-shadow: none !important;
                        outline: none !important;
                    }
                    /* Remove pseudo-elements that might create borders or shadows */
                    #page-header::after,
                    #page-header::before {
                        display: none !important;
                    }
                    /* Remove standalone border elements */
                    div[data-edge="true"] {
                        display: none !important;
                    }
                    ${CONSTANTS.SELECTORS.BUTTON_SHARE_CHAT} {
                        background: transparent;
                    }
                    ${CONSTANTS.SELECTORS.BUTTON_SHARE_CHAT}:hover {
                        background-color: var(--interactive-bg-secondary-hover);
                    }
                    ${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.ASSISTANT_TEXT_CONTENT} {
                        overflow-x: auto;
                        padding-bottom: 8px;
                    }
                    ${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} div[class*="tableContainer"],
                    ${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} div[class*="tableWrapper"] {
                        width: auto;
                        overflow-x: auto;
                        box-sizing: border-box;
                        display: block;
                    }
                    /* (2025/07/01) ChatGPT UI change fix: Remove bottom gradient that conflicts with theme backgrounds. */
                    .content-fade::after {
                        background: none !important;
                    }
                    /* (2025/12/06) Project page top fade fix: Remove top gradient and mask only for project headers. */
                    main ${CONSTANTS.SELECTORS.CONTENT_FADE_TOP}.${CONSTANTS.SELECTORS.PROJECT_PAGE_CLASS},
                    main ${CONSTANTS.SELECTORS.CONTENT_FADE_TOP}.${CONSTANTS.SELECTORS.PROJECT_PAGE_CLASS}::before,
                    main ${CONSTANTS.SELECTORS.CONTENT_FADE_TOP}.${CONSTANTS.SELECTORS.PROJECT_PAGE_CLASS}::after {
                        background: none !important;
                        mask-image: none !important;
                        -webkit-mask-image: none !important;
                    }
                    /* This rule is now conditional on a body class and scoped to the scroll container to avoid affecting other elements. */
                    body.${cls.maxWidthActive} main ${CONSTANTS.SELECTORS.CHAT_CONTENT_MAX_WIDTH} {
                        max-width: var(${CSS_VARS.CHAT_CONTENT_MAX_WIDTH}) !important;
                    }
                    
                    /* Hide default scroll-to-bottom button */
                    ${CONSTANTS.SELECTORS.SCROLL_TO_BOTTOM_BUTTON} {
                        display: none !important;
                    }
                `;
            }

            /** @override */
            getBubbleCss(cls) {
                return StyleTemplates.getBubbleUiCss(cls, UI_PALETTE, CONSTANTS, {
                    // ChatGPT: Default class selector is sufficient for parent
                    collapsibleParentSelector: `.${cls.collapsibleParent}`,
                    // ChatGPT: Button positioning depends on role attribute
                    collapsibleBtnExtraCss: `
                            [data-message-author-role="assistant"] .${cls.collapsibleBtn} {
                                left: 4px;
                            }
                            [data-message-author-role="user"] .${cls.collapsibleBtn} {
                                right: 4px;
                            }
                        `,
                    // ChatGPT: No extra CSS needed (native reflow works)
                    collapsibleCollapsedContentExtraCss: ``,
                });
            }
        }

        class ChatGPTThemeManagerAdapter extends BaseThemeManagerAdapter {
            /** @override */
            shouldDeferInitialTheme(themeManager) {
                const initialTitle = themeManager.getChatTitleAndCache();
                // Defer if the title is the ambiguous "ChatGPT" and we are NOT on the "New Chat" page.
                // This indicates a transition to a specific chat page that hasn't loaded its final title yet.
                if (initialTitle === 'ChatGPT' && !isNewChatPage()) {
                    Logger.log('', '', 'Initial theme application deferred by platform adapter, waiting for final title.');
                    return true;
                }
                return false;
            }

            /** @override */
            selectThemeForUpdate(themeManager, config, urlChanged, titleChanged) {
                const currentTitle = themeManager.getChatTitleAndCache();

                // 1. Invalidate cache on URL change to force pattern re-evaluation.
                if (urlChanged) {
                    themeManager.cachedThemeSet = null;
                }

                // 2. Get the candidate theme based on the current context (URL, Title).
                const candidateTheme = themeManager.getThemeSet();

                // 3. Flicker prevention logic:
                // If the URL changed, the title is currently "ChatGPT" (loading),
                // and the resolved theme is the default one (meaning no URL pattern matched),
                // then keep the previous theme to avoid a flash of the default theme before the title loads.
                // Exception: Do not maintain the previous theme if we are navigating to the "New Chat" page.
                const isDefaultTheme = candidateTheme.metadata.id === 'default' || candidateTheme === config.platforms[PLATFORM].defaultSet;
                const shouldKeepPreviousTheme = urlChanged && currentTitle === 'ChatGPT' && isDefaultTheme && themeManager.lastAppliedThemeSet && !isNewChatPage();

                if (shouldKeepPreviousTheme) {
                    return themeManager.lastAppliedThemeSet;
                }

                // Otherwise, apply the candidate theme immediately.
                // This handles cases where:
                // - URL patterns matched (candidate is not default) -> Instant switch
                // - Title is already loaded -> Correct theme
                // - Navigating to New Chat -> Default theme
                return candidateTheme;
            }

            /** @override */
            getStyleOverrides() {
                return {
                    user: ' margin-left: auto; margin-right: 0;',
                    assistant: ' margin-left: 0; margin-right: auto;',
                };
            }
        }

        class ChatGPTBubbleUIAdapter extends BaseBubbleUIAdapter {
            /** @override */
            getNavPositioningParent(messageElement) {
                // 1. Handle text content first (most common case)
                const role = PlatformAdapters.General.getMessageRole(messageElement);

                if (role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_ASSISTANT) {
                    const contentEl = messageElement.querySelector(CONSTANTS.SELECTORS.ASSISTANT_MESSAGE_CONTENT);
                    // Structure: Row (positioningParent) > Bubble > Content (contentEl)
                    if (contentEl && contentEl.parentElement && contentEl.parentElement.parentElement instanceof HTMLElement) {
                        return contentEl.parentElement.parentElement;
                    }
                } else {
                    const textBubbleParent = messageElement.querySelector(CONSTANTS.SELECTORS.RAW_USER_BUBBLE)?.parentElement;
                    if (textBubbleParent instanceof HTMLElement) {
                        return textBubbleParent;
                    }
                }

                // 2. If no text, it might be an image-only message element.
                if (role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_USER) {
                    // Find the image within this specific user message element
                    const userImageContainer = messageElement.querySelector(CONSTANTS.SELECTORS.RAW_USER_IMAGE_BUBBLE);
                    if (userImageContainer && userImageContainer.parentElement instanceof HTMLElement) {
                        return userImageContainer.parentElement;
                    }
                } else if (role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_ASSISTANT) {
                    // For assistants, search *within* this messageElement for an image.
                    // This prevents empty message shells from finding images elsewhere in the turn.
                    const assistantImageContainer = messageElement.querySelector(CONSTANTS.SELECTORS.RAW_ASSISTANT_IMAGE_BUBBLE);
                    if (assistantImageContainer instanceof HTMLElement && assistantImageContainer.parentElement instanceof HTMLElement) {
                        // Return the PARENT of the image container as the anchor
                        return assistantImageContainer.parentElement;
                    }
                }

                return null;
            }

            /** @override */
            getCollapsibleInfo(messageElement) {
                const msgWrapper = messageElement.closest(CONSTANTS.SELECTORS.MESSAGE_WRAPPER_FINDER);
                if (!(msgWrapper instanceof HTMLElement)) return null;

                const role = messageElement.getAttribute(CONSTANTS.ATTRIBUTES.MESSAGE_ROLE);
                let bubbleElement = null;

                if (role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_USER) {
                    bubbleElement = messageElement.querySelector(CONSTANTS.SELECTORS.RAW_USER_BUBBLE);
                } else {
                    const contentEl = messageElement.querySelector(CONSTANTS.SELECTORS.ASSISTANT_MESSAGE_CONTENT);
                    if (contentEl) {
                        bubbleElement = contentEl.parentElement;
                    }
                }

                if (!(bubbleElement instanceof HTMLElement)) return null;

                const positioningParent = bubbleElement.parentElement;
                if (!(positioningParent instanceof HTMLElement)) return null;

                return { msgWrapper, bubbleElement, positioningParent };
            }
        }

        class ChatGPTToastAdapter extends BaseToastAdapter {
            /** @override */
            getAutoScrollMessage() {
                return 'Scanning layout to prevent scroll issues...';
            }
        }

        class ChatGPTAppControllerAdapter extends BaseAppControllerAdapter {
            /** @override */
            initializePlatformManagers(controller) {
                // =================================================================================
                // SECTION: Auto Scroll Manager
                // Description: Manages the "layout scan" (simulated PageUp scroll)
                //              to force layout calculation and prevent scroll anchoring issues.
                // =================================================================================

                /**
                 * @class AutoScrollManager
                 * @extends BaseAutoScrollManager
                 */
                class AutoScrollManager extends BaseAutoScrollManager {
                    static CONFIG = {
                        // The minimum number of messages required to trigger the auto-scroll feature.
                        MESSAGE_THRESHOLD: 5, // Lower threshold for ChatGPT as it's for layout scanning
                        // Delay between simulated PageUp scrolls (in ms)
                        SCAN_INTERVAL_MS: 30,
                    };

                    /**
                     * @param {ConfigManager} configManager
                     * @param {MessageCacheManager} messageCacheManager
                     * @param {MessageLifecycleManager} messageLifecycleManager
                     */
                    constructor(configManager, messageCacheManager, messageLifecycleManager) {
                        super(configManager, messageCacheManager);
                        this.messageLifecycleManager = messageLifecycleManager;
                        this.scrollContainer = null;
                        this.isInitialScrollCheckDone = false;
                        this.scanLoopId = null; // Use for setTimeout loop
                        this.boundStop = null;
                        this.isLayoutScanComplete = false;
                    }

                    /**
                     * @override
                     * @description Handles the CACHE_UPDATED event to perform the initial scroll check.
                     */
                    _onInit() {
                        super._onInit();
                        this.isLayoutScanComplete = false;
                    }

                    async start() {
                        if (!isFirefox()) return;
                        if (this.isScrolling || this.isLayoutScanComplete) return;

                        // Set the flag immediately to prevent re-entrancy from other events (e.g. button mashing).
                        this.isScrolling = true;
                        Logger.log('', '', 'AutoScrollManager: Starting layout scan.');

                        const scrollContainerEl = document.querySelector(CONSTANTS.SELECTORS.SCROLL_CONTAINER);
                        if (!(scrollContainerEl instanceof HTMLElement)) {
                            Logger.warn('AUTOSCROLL WARN', LOG_STYLES.YELLOW, 'Could not find scroll container.');
                            this.isScrolling = false;
                            return;
                        }
                        this.scrollContainer = scrollContainerEl;

                        EventBus.publish(EVENTS.AUTO_SCROLL_START);
                        EventBus.publish(EVENTS.SUSPEND_OBSERVERS);

                        // Hide the container to prevent visual flickering
                        this.scrollContainer.style.transition = 'none';
                        this.scrollContainer.style.opacity = '0';

                        this.boundStop = () => this.stop(false);
                        this.scrollContainer.addEventListener('wheel', this.boundStop, { passive: true, once: true });
                        this.scrollContainer.addEventListener('touchmove', this.boundStop, { passive: true, once: true });

                        const originalScrollTop = this.scrollContainer.scrollTop;

                        // Force scroll to the bottom to ensure the scan starts from the end.
                        this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;

                        const scanPageUp = () => {
                            if (!this.isScrolling || !this.scrollContainer) return; // Stop if cancelled

                            const currentTop = this.scrollContainer.scrollTop;
                            if (currentTop <= 0) {
                                // Reached the top, restore and stop
                                this.scrollContainer.scrollTop = originalScrollTop; // Restore original position
                                this.isLayoutScanComplete = true; // Set completion flag
                                this.stop(false);
                                return;
                            }

                            // Scroll up by one page (client height)
                            this.scrollContainer.scrollTop = Math.max(0, currentTop - this.scrollContainer.clientHeight);

                            // Continue loop after interval
                            this.scanLoopId = setTimeout(scanPageUp, AutoScrollManager.CONFIG.SCAN_INTERVAL_MS);
                        };

                        // Start the loop
                        // Add a minimal delay to ensure scrollTop change is registered before scan starts
                        this.scanLoopId = setTimeout(scanPageUp, CONSTANTS.TIMING.DEBOUNCE_DELAYS.LAYOUT_RECALCULATION);
                    }

                    stop(isNavigation) {
                        if (!this.isScrolling && !this.scanLoopId) return; // Prevent multiple stops

                        Logger.log('', '', 'AutoScrollManager: Stopping layout scan.');
                        this.isScrolling = false;

                        if (this.scanLoopId) {
                            clearTimeout(this.scanLoopId);
                            this.scanLoopId = null;
                        }

                        // Restore visibility
                        if (this.scrollContainer) {
                            this.scrollContainer.style.opacity = '1';
                            this.scrollContainer.style.transition = '';
                        }
                        this.scrollContainer = null;

                        // Cleanup listeners
                        if (this.boundStop) {
                            this.scrollContainer?.removeEventListener('wheel', this.boundStop);
                            this.scrollContainer?.removeEventListener('touchmove', this.boundStop);
                            this.boundStop = null;
                        }

                        EventBus.publish(EVENTS.AUTO_SCROLL_COMPLETE);

                        // On navigation, ObserverManager handles observer resumption.
                        // All other post-scan logic (DOM rescan, cache update) is now handled
                        // by the listener that *requested* the scan.
                        if (!isNavigation) {
                            EventBus.publish(EVENTS.RESUME_OBSERVERS_AND_REFRESH);
                        }
                    }

                    /**
                     * @private
                     * @description Defines the logic to run *after* a scan completes.
                     */
                    _onScanComplete() {
                        // Run the manual scan to create any missing message wrappers
                        if (this.messageLifecycleManager) {
                            this.messageLifecycleManager.scanForUnprocessedMessages();
                        }
                        // Immediately request a cache update to reflect the scan
                        EventBus.publish(EVENTS.CACHE_UPDATE_REQUEST);
                    }

                    /**
                     * @override
                     * @description Handles the CACHE_UPDATED event to perform the initial scroll check.
                     */
                    _onCacheUpdated() {
                        if (!isFirefox()) return;
                        if (!this.isEnabled || this.isInitialScrollCheckDone || this.isScrolling) {
                            return;
                        }

                        const messageCount = this.messageCacheManager.getTotalMessages().length;

                        // Wait for at least one message to ensure history has started loading (First Paint logic)
                        if (messageCount === 0) return;

                        // Latch on first data: Mark initialization as done immediately regardless of threshold.
                        // This prevents subsequent message additions (e.g. user sending a message) from triggering a delayed scan.
                        this.isInitialScrollCheckDone = true;

                        if (messageCount >= AutoScrollManager.CONFIG.MESSAGE_THRESHOLD) {
                            Logger.log('', '', `AutoScrollManager: ${messageCount} messages found. Triggering layout scan.`);

                            // Register the post-scan logic to run *once* on completion
                            this._subscribeOnce(EVENTS.AUTO_SCROLL_COMPLETE, () => this._onScanComplete());
                            // Start the scan
                            EventBus.publish(EVENTS.AUTO_SCROLL_REQUEST);
                        } else {
                            Logger.log('', '', `AutoScrollManager: ${messageCount} messages found (below threshold). Layout scan skipped.`);
                        }
                    }

                    /**
                     * @override
                     * @description Handles the NAVIGATION event to reset the manager's state.
                     */
                    _onNavigation() {
                        super._onNavigation();
                        if (this.isScrolling) {
                            // Stop scroll without triggering a UI refresh, as a new page is loading.
                            this.stop(true);
                        }
                        this.isInitialScrollCheckDone = false;
                        this.isLayoutScanComplete = false;
                    }
                }
                controller.autoScrollManager = controller.manageFactory(CONSTANTS.RESOURCE_KEYS.AUTO_SCROLL_MANAGER, () => new AutoScrollManager(controller.configManager, controller.messageCacheManager, controller.messageLifecycleManager));
            }

            /** @override */
            applyPlatformSpecificUiUpdates(controller, newConfig) {
                // Enable or disable the auto-scroll manager based on the new config.
                if (newConfig.platforms[PLATFORM].features.load_full_history_on_chat_load.enabled) {
                    controller.autoScrollManager?.enable();
                } else {
                    controller.autoScrollManager?.disable();
                }
            }
        }

        class ChatGPTAvatarAdapter extends BaseAvatarAdapter {
            /** @override */
            getCss() {
                const extraCss = `
                    /* Set the message ID holder as the positioning anchor for Timestamps */
                    ${CONSTANTS.SELECTORS.CONVERSATION_UNIT} ${CONSTANTS.SELECTORS.MESSAGE_ID_HOLDER} {
                        position: relative !important;
                    }
                `;
                return StyleTemplates.getAvatarCss(CONSTANTS.SELECTORS, extraCss);
            }

            /** @override */
            measureAvatarTarget(msgElem) {
                let turnContainer;

                // Check if msgElem is the turn container (article) or a message element (div) inside it
                if (msgElem.matches(CONSTANTS.SELECTORS.CONVERSATION_UNIT)) {
                    // Case 1: msgElem is the ARTICLE (from self-healing Sentinel)
                    turnContainer = msgElem;
                } else {
                    // Case 2: msgElem is the DIV (from initial Sentinel or ensureMessageContainerForImage)
                    turnContainer = msgElem.closest(CONSTANTS.SELECTORS.CONVERSATION_UNIT);
                }
                if (!turnContainer) return null;

                const centeredWrapper = turnContainer.querySelector(CONSTANTS.SELECTORS.CHAT_CONTENT_MAX_WIDTH);
                if (!centeredWrapper) return null;

                // Check if avatar container already exists *inside the centered wrapper*.
                if (centeredWrapper.querySelector(CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER)) {
                    // Already present. Return context to ensure processed class is added, but do not inject.
                    return {
                        shouldInject: false,
                        targetElement: null,
                        processedTarget: turnContainer,
                        exclusionKey: turnContainer,
                        originalElement: msgElem,
                    };
                }

                // Find the *first* message element within this turn.
                const firstMessageElement = turnContainer.querySelector(CONSTANTS.SELECTORS.BUBBLE_FEATURE_MESSAGE_CONTAINERS);
                if (!(firstMessageElement instanceof HTMLElement)) {
                    return null; // No message element found to attach to
                }

                // Guard: Skip avatar injection for Deep Research result containers.
                // These containers have their own layout that conflicts with the avatar.
                if (firstMessageElement.querySelector(CONSTANTS.SELECTORS.DEEP_RESEARCH_RESULT)) {
                    return null;
                }

                return {
                    shouldInject: true,
                    targetElement: firstMessageElement,
                    processedTarget: turnContainer,
                    exclusionKey: turnContainer,
                    originalElement: msgElem,
                };
            }

            /** @override */
            injectAvatar(measurement, avatarContainer, processedClass) {
                const { shouldInject, targetElement, processedTarget } = measurement;

                // Inject the avatar directly into the *first message element*
                if (shouldInject && targetElement && avatarContainer) {
                    targetElement.prepend(avatarContainer);
                }

                // Mark the TURN container as processed.
                if (processedTarget && !processedTarget.classList.contains(processedClass)) {
                    processedTarget.classList.add(processedClass);
                }
            }
        }

        class ChatGPTStandingImageAdapter extends BaseStandingImageAdapter {
            /** @override */
            async recalculateLayout(instance) {
                const rootStyle = document.documentElement.style;
                const cls = instance.style.classes;
                const v = instance.style.vars;

                // Check for Canvas mode
                const isCanvasActive = PlatformAdapters.General.isCanvasModeActive();

                // Check for Right Sidebar (Activity Panel)
                const rightSidebar = document.querySelector(CONSTANTS.SELECTORS.RIGHT_SIDEBAR);
                let isRightSidebarOpen = false;
                if (rightSidebar instanceof HTMLElement && rightSidebar.offsetWidth > 0) {
                    const rect = rightSidebar.getBoundingClientRect();
                    // Robustness check: Ensure it's actually on the right side
                    if (rect.left > window.innerWidth / 2) {
                        isRightSidebarOpen = true;
                    }
                }

                // If canvas mode is active or the activity panel is open, hide standing images.
                if (isCanvasActive || isRightSidebarOpen) {
                    rootStyle.setProperty(v.assistantWidth, '0px');
                    rootStyle.setProperty(v.userWidth, '0px');
                    return;
                }

                // --- Determine Message Area Rect ---
                let chatRect = null;
                const isNewChat = PlatformAdapters.General.isNewChatPage();

                if (isNewChat) {
                    // On new chat pages, do not wait for the element. Calculate virtual rect immediately.
                    // We assume standard centering logic for the virtual area.
                } else {
                    // On existing chat pages, wait for the content to load to ensure correct positioning.
                    const chatContent = await waitForElement(CONSTANTS.SELECTORS.CHAT_CONTENT_MAX_WIDTH, { timeout: CONSTANTS.TIMING.TIMEOUTS.WAIT_FOR_MAIN_CONTENT, context: document }, sentinel);
                    if (chatContent) {
                        chatRect = chatContent.getBoundingClientRect();
                    } else {
                        // If timeout occurs on a normal page, abort to avoid visual bugs.
                        return;
                    }
                }

                await withLayoutCycle({
                    measure: () => {
                        // --- Read Phase ---
                        const assistantImg = document.getElementById(cls.assistantImageId);
                        const userImg = document.getElementById(cls.userImageId);

                        return {
                            chatRect: chatRect, // Can be null (for virtual calculation) or pre-fetched rect
                            sidebarWidth: getSidebarWidth(),
                            windowWidth: window.innerWidth,
                            windowHeight: window.innerHeight,
                            assistantImgHeight: assistantImg ? assistantImg.offsetHeight : 0,
                            userImgHeight: userImg ? userImg.offsetHeight : 0,
                        };
                    },
                    mutate: (measured) => {
                        // --- Write Phase ---
                        if (instance.isDestroyed) return;
                        if (!measured) return;

                        const { sidebarWidth, windowWidth, windowHeight, assistantImgHeight, userImgHeight } = measured;
                        let { chatRect } = measured;

                        const config = instance.configManager.get();

                        // --- Virtual Rect Calculation (if needed) ---
                        if (!chatRect) {
                            // Default width fallback (50vw per requirement)
                            let targetWidth = windowWidth * 0.5;

                            const configWidth = config.platforms[PLATFORM].options.chat_content_max_width;
                            if (configWidth && typeof configWidth === 'string' && configWidth.endsWith('vw')) {
                                const vwValue = parseInt(configWidth, 10);
                                if (!isNaN(vwValue)) {
                                    targetWidth = (windowWidth * vwValue) / 100;
                                }
                            }

                            // Calculate centered position relative to the available space (window - sidebar)
                            const availableSpace = windowWidth - sidebarWidth;
                            // If the configured width is wider than available space, clamp it
                            const effectiveWidth = Math.min(targetWidth, availableSpace);

                            const left = sidebarWidth + (availableSpace - effectiveWidth) / 2;

                            chatRect = new DOMRect(left, 0, effectiveWidth, 0);
                        }

                        // Apply right sidebar width for positioning
                        rootStyle.setProperty(v.rightSidebarWidth, '0px');

                        // Set Assistant base position (Platform specific)
                        rootStyle.setProperty(v.assistantLeft, sidebarWidth + 'px');

                        // Calculate available widths
                        const assistantAvailableWidth = chatRect.left - sidebarWidth;
                        const userAvailableWidth = windowWidth - chatRect.right;

                        // Delegate common calculation
                        StandingImageLayout.apply(instance, {
                            assistantAvailableWidth,
                            userAvailableWidth,
                            assistantImgHeight,
                            userImgHeight,
                            windowHeight,
                        });
                    },
                });
            }

            /** @override */
            updateVisibility(instance) {
                const isCanvasActive = PlatformAdapters.General.isCanvasModeActive();
                const cls = instance.style.classes;
                const v = instance.style.vars;

                [cls.userImageId, cls.assistantImageId].forEach((id) => {
                    const imgElement = document.getElementById(id);
                    if (!imgElement) return;

                    // Determine actor based on index or ID check
                    const isUser = id === cls.userImageId;
                    const varName = isUser ? v.userImage : v.assistantImage;

                    const hasImage = !!document.documentElement.style.getPropertyValue(varName);
                    imgElement.style.opacity = hasImage && !isCanvasActive ? '1' : '0';
                });
            }
        }

        class ChatGPTObserverAdapter extends BaseObserverAdapter {
            /**
             * @private
             * @description Starts a stateful observer for the right sidebar (Activity/Thread flyout).
             * @param {object} dependencies
             * @returns {() => void}
             */
            startRightSidebarObserver(dependencies) {
                // Use shared logic from ObserverManager via dependencies
                return dependencies.startGenericPanelObserver({
                    triggerSelector: CONSTANTS.SELECTORS.RIGHT_SIDEBAR,
                    observerType: CONSTANTS.OBSERVED_ELEMENT_TYPES.SIDE_PANEL,
                    targetResolver: (el) => el, // Target Resolver (Trigger is the Panel)
                    immediateCallback: () => EventBus.publish(EVENTS.SIDEBAR_LAYOUT_CHANGED),
                });
            }

            /**
             * @private
             * @description Starts a stateful observer for the Research Panel.
             * @param {object} dependencies
             * @returns {() => void}
             */
            startResearchPanelObserver(dependencies) {
                // Use shared logic from ObserverManager via dependencies
                return dependencies.startGenericPanelObserver({
                    triggerSelector: CONSTANTS.SELECTORS.RESEARCH_PANEL,
                    observerType: CONSTANTS.OBSERVED_ELEMENT_TYPES.SIDE_PANEL,
                    // Target Resolver: The trigger is inside a section, inside the main div.
                    // We need the parent div that holds the width.
                    targetResolver: (el) => el.closest(CONSTANTS.SELECTORS.SIDEBAR_SURFACE_PRIMARY),
                    immediateCallback: () => EventBus.publish(EVENTS.VISIBILITY_RECHECK),
                });
            }

            /**
             * @private
             * @description Starts a stateful observer to detect the appearance and disappearance of the Canvas panel using a high-performance hybrid approach.
             * @param {object} dependencies The required methods from ObserverManager.
             * @returns {() => void} A cleanup function.
             */
            startCanvasObserver(dependencies) {
                // Use shared logic from ObserverManager via dependencies
                return dependencies.startGenericPanelObserver({
                    triggerSelector: CONSTANTS.SELECTORS.CANVAS_CONTAINER, // Trigger (Button)
                    observerType: CONSTANTS.OBSERVED_ELEMENT_TYPES.SIDE_PANEL,
                    targetResolver: (el) => el.closest(CONSTANTS.SELECTORS.CANVAS_RESIZE_TARGET), // Target Resolver (Find Parent Panel)
                    immediateCallback: () => EventBus.publish(EVENTS.VISIBILITY_RECHECK),
                });
            }

            /**
             * @param {object} dependencies The dependencies passed from ObserverManager (unused in this method).
             * @private
             * @description Sets up the monitoring for title changes.
             * @returns {() => void} A cleanup function to stop the observer.
             */
            startGlobalTitleObserver(dependencies) {
                let titleObserver = null;

                const setupObserver = (targetElement) => {
                    titleObserver?.disconnect(); // Disconnect if already running

                    // Encapsulate state within the closure
                    let lastObservedTitle = (targetElement.textContent || '').trim();
                    const currentObservedTitleSource = targetElement;

                    titleObserver = new MutationObserver(() => {
                        const currentText = (currentObservedTitleSource?.textContent || '').trim();
                        if (currentText !== lastObservedTitle) {
                            lastObservedTitle = currentText;
                            EventBus.publish(EVENTS.TITLE_CHANGED);
                        }
                    });
                    titleObserver.observe(targetElement, {
                        childList: true,
                        characterData: true,
                        subtree: true,
                    });
                };

                const selector = CONSTANTS.SELECTORS.TITLE_OBSERVER_TARGET;
                sentinel.on(selector, setupObserver);

                const existingTarget = document.querySelector(selector);
                if (existingTarget) {
                    setupObserver(existingTarget);
                }

                // Return the cleanup function for this observer.
                return () => {
                    sentinel.off(selector, setupObserver);
                    titleObserver?.disconnect();
                };
            }

            /**
             * @param {object} dependencies The dependencies passed from ObserverManager (unused in this method).
             * @private
             * @description Sets up a robust, two-tiered observer for the sidebar.
             * @returns {() => void} A cleanup function.
             */
            startSidebarObserver(dependencies) {
                let attributeObserver = null;
                let animationLoopId = null;
                const ANIMATION_DURATION = CONSTANTS.TIMING.ANIMATIONS.LAYOUT_STABILIZATION_MS;

                // Function to run the layout update loop
                const startUpdateLoop = () => {
                    if (animationLoopId) cancelAnimationFrame(animationLoopId);

                    const startTime = Date.now();

                    const loop = () => {
                        // Publish update immediately
                        EventBus.publish(EVENTS.SIDEBAR_LAYOUT_CHANGED);

                        if (Date.now() - startTime < ANIMATION_DURATION) {
                            animationLoopId = requestAnimationFrame(loop);
                        } else {
                            animationLoopId = null;
                        }
                    };

                    loop();
                };

                const setupAttributeObserver = (sidebarContainer) => {
                    const stateIndicator = sidebarContainer.querySelector(CONSTANTS.SELECTORS.SIDEBAR_STATE_INDICATOR);
                    attributeObserver?.disconnect(); // Disconnect previous observer if any
                    if (stateIndicator) {
                        attributeObserver = new MutationObserver(() => {
                            // Start the update loop immediately upon detection
                            startUpdateLoop();
                        });
                        attributeObserver.observe(stateIndicator, {
                            attributes: true,
                            attributeFilter: ['class'],
                        });
                        // Trigger once initially
                        EventBus.publish(EVENTS.SIDEBAR_LAYOUT_CHANGED);
                    }
                };

                // Use Sentinel to detect when the sidebar container is added.
                sentinel.on(CONSTANTS.SELECTORS.SIDEBAR_WIDTH_TARGET, setupAttributeObserver);

                // Initial check in case the sidebar is already present.
                const initialSidebar = document.querySelector(CONSTANTS.SELECTORS.SIDEBAR_WIDTH_TARGET);
                if (initialSidebar) {
                    setupAttributeObserver(initialSidebar);
                }

                // Return the cleanup function for all resources created by this observer.
                return () => {
                    sentinel.off(CONSTANTS.SELECTORS.SIDEBAR_WIDTH_TARGET, setupAttributeObserver);
                    attributeObserver?.disconnect();
                    if (animationLoopId) cancelAnimationFrame(animationLoopId);
                };
            }

            /**
             * @private
             * @description Starts a stateful observer for the input area to detect resizing and DOM reconstruction (button removal).
             * @param {object} dependencies The ObserverManager dependencies.
             * @returns {() => void} A cleanup function.
             */
            startInputAreaObserver(dependencies) {
                // Use shared logic from ObserverManager via dependencies
                return dependencies.startGenericInputAreaObserver({
                    triggerSelector: CONSTANTS.SELECTORS.INPUT_RESIZE_TARGET,
                    resizeTargetSelector: CONSTANTS.SELECTORS.INPUT_RESIZE_TARGET,
                });
            }

            /**
             * @private
             * @description Optimizes style application by detecting DOM elements via JS instead of using expensive CSS :has().
             * Specifically handles the Project Page top gradient removal by adding a class to the container when the project title input is present.
             * @param {object} dependencies
             * @returns {() => void} A cleanup function.
             */
            startStyleOptimizationObserver(dependencies) {
                const triggerSelector = CONSTANTS.SELECTORS.PROJECT_TITLE_INPUT;
                const targetSelector = CONSTANTS.SELECTORS.CONTENT_FADE_TOP;
                const className = CONSTANTS.SELECTORS.PROJECT_PAGE_CLASS;

                const listener = (element) => {
                    // Find the parent/ancestor container to apply the class to
                    const target = element.closest(targetSelector);
                    if (target instanceof HTMLElement) {
                        target.classList.add(className);
                    }
                };

                // Use Sentinel to efficiently detect the input element
                sentinel.on(triggerSelector, listener);

                // Initial check in case it's already present
                const existing = document.querySelector(triggerSelector);
                if (existing) {
                    listener(existing);
                }

                return () => {
                    sentinel.off(triggerSelector, listener);
                };
            }

            /** @override */
            getPlatformObserverStarters() {
                // prettier-ignore
                return [
                    this.startGlobalTitleObserver,
                    this.startSidebarObserver,
                    this.startCanvasObserver,
                    this.startRightSidebarObserver,
                    this.startResearchPanelObserver,
                    this.startInputAreaObserver,
                    this.startStyleOptimizationObserver,
                ];
            }

            /** @override */
            isTurnComplete(turnNode) {
                // A turn is complete if it's an assistant message that has rendered its action buttons.
                // User message turns are handled implicitly and don't trigger this "complete" state in the context of streaming.
                const assistantActions = turnNode.querySelector(CONSTANTS.SELECTORS.TURN_COMPLETE_SELECTOR);
                return !!assistantActions;
            }
        }

        class ChatGPTSettingsPanelAdapter extends BaseSettingsPanelAdapter {
            /** @override */
            getPlatformSpecificFeatureToggles() {
                const p = `platforms.${PLATFORM}`;
                const timestampFeature = SchemaBuilder.Toggle(`${p}.features.timestamp.enabled`, 'Show timestamp', { title: 'Displays the timestamp for each message.' });

                const autoCollapseFeature = SchemaBuilder.Toggle(`${p}.features.auto_collapse_user_message.enabled`, 'Auto collapse user message', {
                    title: 'Automatically collapses user messages that exceed the height threshold.\nApplies to new messages and existing history on load.\nRequires "Collapsible button" to be enabled.',
                    disabledIf: (data) => !getPropertyByPath(data, `${p}.features.collapsible_button.enabled`),
                    dependencies: [`${p}.features.collapsible_button.enabled`],
                });

                if (!isFirefox()) {
                    return [timestampFeature, autoCollapseFeature];
                }

                const scanLayoutFeature = SchemaBuilder.Toggle(`${p}.features.load_full_history_on_chat_load.enabled`, 'Scan layout on chat load', {
                    title: 'When enabled, automatically scans the layout of all messages when a chat is opened. This prevents layout shifts from images loading later.',
                });

                return [scanLayoutFeature, timestampFeature, autoCollapseFeature];
            }
        }

        class ChatGPTFixedNavAdapter extends BaseFixedNavAdapter {
            /** @override */
            isHeaderPositionAvailable(navConsoleWidth) {
                // 1. Check for panels that compress the layout (Canvas)
                if (PlatformAdapters.General.isCanvasModeActive()) {
                    return false;
                }

                // 2. Check available width in the main container (accounts for sidebar)
                const container = document.querySelector(CONSTANTS.SELECTORS.SCROLL_CONTAINER);
                if (container instanceof HTMLElement) {
                    return container.offsetWidth >= CONSTANTS.UI_SPECS.HEADER_POSITION_MIN_WIDTH;
                }

                // Fallback to window width if container not found
                return window.innerWidth >= CONSTANTS.UI_SPECS.HEADER_POSITION_MIN_WIDTH;
            }

            /** @override */
            getNavAnchorContainer() {
                // Try to find the specific action container first
                const actionContainer = document.querySelector(CONSTANTS.SELECTORS.HEADER_ACTIONS);
                if (actionContainer && actionContainer.parentElement) {
                    return actionContainer.parentElement;
                }

                // Fallback: If on a new chat page or structure changed, try to find the end of the header
                // The header usually has 3 main divs (Left, Center, Right). We want the Right one.
                const rightSection = document.querySelector(CONSTANTS.SELECTORS.HEADER_FALLBACK_SECTION);
                if (rightSection instanceof HTMLElement) {
                    return rightSection;
                }
                return null;
            }

            /** @override */
            handleInfiniteScroll(fixedNavManagerInstance, highlightedMessage, previousTotalMessages) {
                // No-op for ChatGPT as it does not use infinite scrolling for chat history.
                // This method exists to maintain architectural consistency with the Gemini version.
            }

            /** @override */
            applyAdditionalHighlight(messageElement, styleHandle) {
                const role = PlatformAdapters.General.getMessageRole(messageElement);
                if (role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_ASSISTANT) {
                    const turnContainer = messageElement.closest(CONSTANTS.SELECTORS.CONVERSATION_UNIT);
                    const hasImage = turnContainer && turnContainer.querySelector(CONSTANTS.SELECTORS.RAW_ASSISTANT_IMAGE_BUBBLE);
                    const textContent = messageElement.querySelector(CONSTANTS.SELECTORS.ASSISTANT_TEXT_CONTENT);
                    const hasText = textContent && textContent.textContent.trim() !== '';

                    // Apply to turn container only if it's an image-only or effectively image-only message.
                    if (hasImage && !hasText) {
                        turnContainer.classList.add(styleHandle.classes.highlightTurn);
                    }
                }
            }

            /** @override */
            getPlatformSpecificButtons(fixedNavManagerInstance, styleHandle) {
                const cls = styleHandle.classes;
                const autoscrollBtn = h(
                    `button#${cls.autoscrollBtnId}.${cls.btn}`,
                    {
                        title: 'Run layout scan and rescan DOM',
                        dataset: { [CONSTANTS.DATA_KEYS.ORIGINAL_TITLE]: 'Run layout scan and rescan DOM' },
                        onclick: () => {
                            // 1. Subscribe once to the completion event
                            fixedNavManagerInstance.registerPlatformListenerOnce(EVENTS.AUTO_SCROLL_COMPLETE, () => {
                                // 2. Perform the "DOM Rescan" logic *after* scan is complete.
                                if (fixedNavManagerInstance.messageLifecycleManager) {
                                    fixedNavManagerInstance.messageLifecycleManager.scanForUnprocessedMessages();
                                }
                                EventBus.publish(EVENTS.CACHE_UPDATE_REQUEST);
                            });

                            // 3. Start the scan.
                            EventBus.publish(EVENTS.AUTO_SCROLL_REQUEST);
                        },
                    },
                    [createIconFromDef(StyleDefinitions.ICONS.scrollToTop)]
                );

                return [autoscrollBtn];
            }

            /** @override */
            updatePlatformSpecificButtonState(autoscrollBtn, isAutoScrolling, autoScrollManager) {
                if (!isFirefox()) {
                    autoscrollBtn.disabled = true;
                    autoscrollBtn.title = 'Layout scan is not required on your browser.';
                    autoscrollBtn.style.opacity = '0.5';
                    return;
                }

                const isScanComplete = autoScrollManager?.isLayoutScanComplete;
                const isDisabled = isAutoScrolling || isScanComplete;

                autoscrollBtn.disabled = isDisabled;
                autoscrollBtn.style.opacity = '1';

                if (isScanComplete) {
                    autoscrollBtn.title = 'Layout scan complete';
                } else if (isAutoScrolling) {
                    autoscrollBtn.title = 'Scanning layout...';
                } else {
                    autoscrollBtn.title = DomState.get(autoscrollBtn, CONSTANTS.DATA_KEYS.ORIGINAL_TITLE);
                }
            }
        }

        class ChatGPTTimestampAdapter extends BaseTimestampAdapter {
            constructor() {
                super();
                this.originalFetch = unsafeWindow.fetch.bind(unsafeWindow);
                this.isInitialized = false;
                this.fetchWrapperSymbol = Symbol.for(`${APPID}:FETCH_WRAPPER`);
                this._lastFetchObserveErrorAt = 0; // Rate-limit observer errors to avoid log spam
            }

            /** @override */
            init() {
                if (this.isInitialized) return;

                // Check if unsafeWindow is available and valid
                if (typeof unsafeWindow === 'undefined' || !unsafeWindow.fetch) {
                    Logger.error('TIMESTAMP', '', 'unsafeWindow.fetch is unavailable. Adapter disabled.');
                    return;
                }

                try {
                    // Backup original fetch from the page context
                    // Bind to unsafeWindow to ensure correct 'this' context
                    this.originalFetch = unsafeWindow.fetch.bind(unsafeWindow);

                    // Create the wrapper logic
                    const wrappedFetch = this._wrappedFetch.bind(this);

                    // Mark our wrapper to prevent double-wrapping
                    wrappedFetch[this.fetchWrapperSymbol] = true;

                    // Override the page's fetch
                    unsafeWindow.fetch = wrappedFetch;

                    this.isInitialized = true;
                    Logger.debug('TIMESTAMP', LOG_STYLES.TEAL, 'Successfully intercepted unsafeWindow.fetch');
                } catch (e) {
                    Logger.error('FETCH WRAP FAILED', LOG_STYLES.RED, 'Could not wrap fetch:', e);
                    // Attempt to restore if partially failed
                    if (this.originalFetch) {
                        unsafeWindow.fetch = this.originalFetch;
                    }
                }
            }

            /** @override */
            cleanup() {
                // Restore the original fetch if we modified it
                if (this.isInitialized && this.originalFetch) {
                    unsafeWindow.fetch = this.originalFetch;
                    this.isInitialized = false;
                    Logger.debug('TIMESTAMP', LOG_STYLES.TEAL, 'Restored original unsafeWindow.fetch');
                }
                // Data cache is preserved (BaseTimestampAdapter behavior)
            }

            /** @override */
            hasTimestampLogic() {
                return true;
            }

            _getChatIdFromUrl(url) {
                if (!url) return null;
                // Match .../conversation/[ID] only. Must end with the ID.
                // The ID must contain at least 4 hyphens.
                // (e.g., 8-4-4-4-12 format)
                const endpoint = CONSTANTS.URL_PATTERNS.CONVERSATION_ENDPOINT;
                const pattern = new RegExp(`${escapeRegExp(endpoint)}\\/([^/]*-[^/]*-[^/]*-[^/]*-[^/]+)$`);
                const match = url.match(pattern);
                return match ? match[1] : null;
            }

            _wrappedFetch(input, init) {
                // 1. Call the original fetch immediately.
                // We return this Promise chain to the site code.
                return this.originalFetch(input, init).then((response) => {
                    try {
                        // 2. Clone the response immediately upon resolution.
                        // This ensures we get a copy before the site's code consumes the stream.
                        // Wrapped in try-catch to act as a failsafe; if cloning fails (e.g. stream locked),
                        // we must still return the original response to avoid breaking the site.
                        const clonedResponse = response.clone();

                        // 3. Process the clone asynchronously (Fire-and-forget).
                        this._processIntercentedResponse(input, clonedResponse).catch((e) => {
                            // Rate-limit error logging
                            const now = Date.now();
                            if (now - this._lastFetchObserveErrorAt > 60000) {
                                this._lastFetchObserveErrorAt = now;
                                Logger.debug('FETCH', LOG_STYLES.ORANGE, 'Internal processing failed:', e);
                            }
                        });
                    } catch (e) {
                        // Log error but suppress it to protect the main application flow
                        Logger.debug('FETCH', LOG_STYLES.ORANGE, 'Response cloning failed:', e);
                    }

                    // 4. Return the ORIGINAL response to the site.
                    return response;
                });
            }

            /**
             * Processes the intercepted response to extract timestamps.
             * @param {RequestInfo|URL} input
             * @param {Response} response
             */
            async _processIntercentedResponse(input, response) {
                if (!this.isInitialized) return;

                // Check URL patterns
                const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
                let normalizedUrl = url;
                try {
                    // Resolve relative URLs relative to the current page
                    normalizedUrl = new URL(url, location.href).pathname;
                } catch {
                    // Ignore URL parsing errors
                }

                // Try to get ID from URL first (GET request)
                let chatId = this._getChatIdFromUrl(normalizedUrl);

                // Only process conversation endpoints
                if (!normalizedUrl.includes(CONSTANTS.URL_PATTERNS.CONVERSATION_ENDPOINT)) return;

                // Check response status
                if (!response.ok || response.status !== 200) return;

                Logger.debug('FETCH', LOG_STYLES.ORANGE, 'Target API URL intercepted:', url);

                try {
                    const data = await response.json();

                    // If ID wasn't in URL, try to find it in the response (POST request / New Chat)
                    if (!chatId && data.conversation_id) {
                        chatId = data.conversation_id;
                    }

                    if (!chatId) return;

                    // Parse the JSON data
                    const timestamps = this._extractTimestamps(data);

                    if (timestamps.size > 0) {
                        // Store in persistent cache
                        timestamps.forEach((date, id) => this.addTimestamp(id, date));
                        // Publish event
                        EventBus.publish(EVENTS.TIMESTAMPS_LOADED, { chatId, timestamps });
                    }
                } catch (e) {
                    Logger.error('TIMESTAMP ERROR', LOG_STYLES.RED, 'Failed to parse conversation JSON:', e);
                }
            }

            /**
             * Extracts timestamps from the parsed JSON object.
             * @param {object} data - The parsed JSON response.
             * @returns {Map<string, Date>}
             */
            _extractTimestamps(data) {
                /** @type {Map<string, Date>} */
                const newTimestamps = new Map();
                let added = 0;

                if (data && data.mapping) {
                    Object.values(data.mapping).forEach((item) => {
                        if (item && item.message && item.message.id && item.message.create_time) {
                            // Add to our temporary map. We don't check for existence,
                            // TimestampManager will handle merging/overwriting.
                            newTimestamps.set(item.message.id, new Date(item.message.create_time * 1000));
                            added++;
                        }
                    });

                    if (added > 0) {
                        Logger.debug('TIMESTAMPS', LOG_STYLES.TEAL, `Parsed ${added} historical timestamps.`);
                    } else {
                        Logger.debug('TIMESTAMPS', LOG_STYLES.TEAL, 'API response processed, but no valid timestamps were found in data.mapping.');
                    }
                } else {
                    Logger.debug('TIMESTAMPS', LOG_STYLES.TEAL, 'API response processed, but data.mapping was not found or was empty.');
                }
                return newTimestamps;
            }
        }

        class ChatGPTUIManagerAdapter extends BaseUIManagerAdapter {
            /** @override */
            ensureButtonPlacement(settingsButton) {
                ensureSettingsButtonPlacement(settingsButton, CONSTANTS.SELECTORS.INSERTION_ANCHOR, PlatformAdapters.General.isExcludedPage);
            }
        }

        const PlatformAdapters = {
            General: new ChatGPTGeneralAdapter(),
            StyleManager: new ChatGPTStyleManagerAdapter(),
            ThemeManager: new ChatGPTThemeManagerAdapter(),
            BubbleUI: new ChatGPTBubbleUIAdapter(),
            Toast: new ChatGPTToastAdapter(),
            AppController: new ChatGPTAppControllerAdapter(),
            Avatar: new ChatGPTAvatarAdapter(),
            StandingImage: new ChatGPTStandingImageAdapter(),
            Observer: new ChatGPTObserverAdapter(),
            SettingsPanel: new ChatGPTSettingsPanelAdapter(),
            FixedNav: new ChatGPTFixedNavAdapter(),
            Timestamp: new ChatGPTTimestampAdapter(),
            UIManager: new ChatGPTUIManagerAdapter(),
        };

        return {
            CONSTANTS,
            SITE_STYLES,
            PlatformAdapters,
        };
    }

    /**
     * Returns definitions and adapters specifically for Gemini.
     * @returns {PlatformDefinitions} The set of constants and adapters.
     */
    function defineGeminiValues() {
        // =============================================================================
        // SECTION: Platform Constants
        // =============================================================================

        // ---- Default Settings & Theme Configuration ----
        const CONSTANTS = {
            ...SHARED_CONSTANTS,
            UI_SPECS: {
                ...SHARED_CONSTANTS.UI_SPECS,
                HEADER_POSITION_MIN_WIDTH: 960,
            },
            OBSERVER_OPTIONS: {
                childList: true,
                subtree: true,
            },
            Z_INDICES: {
                ...SHARED_CONSTANTS.Z_INDICES,
                BUBBLE_NAVIGATION: 'auto',
                STANDING_IMAGE: 1,
                NAV_CONSOLE: 500,
            },
            ATTRIBUTES: {
                MESSAGE_ID: 'data-message-id',
            },
            SELECTORS: {
                // --- Main containers ---
                MAIN_APP_CONTAINER: 'bard-sidenav-content',
                CHAT_WINDOW_CONTENT: 'chat-window-content',
                CHAT_WINDOW: 'chat-window',
                CHAT_HISTORY_MAIN: 'div#chat-history',
                INPUT_CONTAINER: 'input-container',
                // Root container for message search optimization
                MESSAGES_ROOT: 'chat-history',

                // --- Message containers ---
                CONVERSATION_UNIT: 'user-query, model-response',
                MESSAGE_ID_HOLDER: '[data-message-id]',
                MESSAGE_CONTAINER_PARENT: 'div#chat-history',
                MESSAGE_ROOT_NODE: 'user-query, model-response',
                USER_QUERY_CONTAINER: 'user-query-content',

                // --- Selectors for messages ---
                USER_MESSAGE: 'user-query',
                ASSISTANT_MESSAGE: 'model-response',

                // --- Selectors for finding elements to tag ---
                RAW_USER_BUBBLE: '.user-query-bubble-with-background',
                RAW_ASSISTANT_BUBBLE: '.response-container-with-gpi',

                // --- Text content ---
                USER_TEXT_CONTENT: '.query-text',
                ASSISTANT_TEXT_CONTENT: '.markdown',
                ASSISTANT_ANSWER_CONTENT: 'message-content.model-response-text',

                // --- Input area ---
                INPUT_AREA_BG_TARGET: 'input-area-v2',
                INPUT_TEXT_FIELD_TARGET: 'rich-textarea .ql-editor',
                INPUT_RESIZE_TARGET: 'input-area-v2',

                // --- Input area (Button Injection) ---
                INSERTION_ANCHOR: 'input-area-v2 .trailing-actions-wrapper',

                // --- Avatar area ---
                AVATAR_USER: 'user-query',
                AVATAR_ASSISTANT: 'model-response',

                // --- Selectors for Avatar ---
                SIDE_AVATAR_CONTAINER: '.side-avatar-container',
                SIDE_AVATAR_ICON: '.side-avatar-icon',
                SIDE_AVATAR_NAME: '.side-avatar-name',

                // --- Other UI Selectors ---
                SIDEBAR_WIDTH_TARGET: 'bard-sidenav',
                // Used for CSS max-width application
                CHAT_CONTENT_MAX_WIDTH: '.conversation-container',
                // Used for standing image layout calculation
                STANDING_IMAGE_ANCHOR: '.conversation-container user-query, .conversation-container model-response',
                SCROLL_CONTAINER: null,

                // --- Site Specific Selectors ---
                CONVERSATION_TITLE_WRAPPER: '[data-test-id="conversation"].selected',
                CONVERSATION_TITLE_TEXT: '.conversation-title',
                CHAT_HISTORY_SCROLL_CONTAINER: '[data-test-id="chat-history-container"]',

                // --- BubbleFeature-specific Selectors ---
                BUBBLE_FEATURE_MESSAGE_CONTAINERS: 'user-query, model-response',
                BUBBLE_FEATURE_TURN_CONTAINERS: null, // Not applicable to Gemini

                // --- FixedNav-specific Selectors ---
                FIXED_NAV_INPUT_AREA_TARGET: 'input-area-v2',
                FIXED_NAV_MESSAGE_CONTAINERS: 'user-query, model-response',
                FIXED_NAV_TURN_CONTAINER: 'user-query, model-response',
                FIXED_NAV_ROLE_USER: 'user-query',
                FIXED_NAV_ROLE_ASSISTANT: 'model-response',

                // --- Turn Completion Selector ---
                TURN_COMPLETE_SELECTOR: 'model-response message-actions',

                // --- Canvas ---
                CANVAS_CONTAINER: 'immersive-panel',
                CANVAS_CLOSE_BUTTON: 'button[data-test-id="close-button"]',

                // --- File Panel ---
                FILE_PANEL_CONTAINER: 'context-sidebar',

                // --- Gem Selectors ---
                GEM_SELECTED_ITEM: 'bot-list-item.bot-list-item--selected',
                GEM_NAME: '.bot-name',

                // --- List Item Selectors for Observation ---
                CHAT_HISTORY_ITEM: '[data-test-id="conversation"]',
                GEM_LIST_ITEM: 'bot-list-item',

                // --- Gem Manager ---
                GEM_MANAGER_CONTAINER: 'all-bots',

                // --- Auto Scroll ---
                PROGRESS_BAR: 'mat-progress-bar[role="progressbar"]',

                // --- Header Integration Selectors ---
                HEADER_RIGHT_SECTION: 'top-bar-actions .right-section',
            },
            URL_PATTERNS: {
                EXCLUDED: [],
            },
        };

        // ---- Site-specific Style Variables ----
        const UI_PALETTE = {
            bg: 'var(--gem-sys-color--surface-container-highest)',
            input_bg: 'var(--gem-sys-color--surface-container-low)',
            text_primary: 'var(--gem-sys-color--on-surface)',
            text_secondary: 'var(--gem-sys-color--on-surface-variant)',
            border: 'var(--gem-sys-color--outline)',
            border_medium: 'var(--gem-sys-color--outline)',
            border_light: 'var(--gem-sys-color--outline-low)',
            btn_bg: 'var(--gem-sys-color--surface-container-high)',
            btn_hover_bg: 'var(--gem-sys-color--surface-container-higher)',
            btn_text: 'var(--gem-sys-color--on-surface-variant)',
            btn_border: 'var(--gem-sys-color--outline)',
            toggle_bg_off: 'var(--gem-sys-color--surface-container)',
            toggle_bg_on: 'var(--gem-sys-color--primary)',
            toggle_knob: 'var(--gem-sys-color--on-primary-container)',
            danger_text: 'var(--gem-sys-color--error)',
            accent_text: 'var(--gem-sys-color--primary)',
            loading_spinner: '#ffca28',
            // Shared properties
            slider_display_text: 'var(--gem-sys-color--on-surface)',
            label_text: 'var(--gem-sys-color--on-surface-variant)',
            error_text: 'var(--gem-sys-color--error)',
            // Component Specifics: Settings Button
            settings_btn_width: '40px',
            settings_btn_height: '40px',
            settings_btn_color: 'var(--mat-icon-button-icon-color, var(--mat-sys-on-surface-variant))',
            settings_btn_hover_bg: 'color-mix(in srgb, var(--mat-icon-button-state-layer-color) 8%, transparent)',
            // Component Specifics: Theme Modal
            delete_confirm_btn_text: 'var(--gem-sys-color--on-error-container)',
            delete_confirm_btn_bg: 'var(--gem-sys-color--error-container)',
            delete_confirm_btn_hover_text: 'var(--gem-sys-color--on-error-container)',
            delete_confirm_btn_hover_bg: 'var(--gem-sys-color--error-container)',
            // Component Specifics: Fixed Nav
            fixed_nav_bg: 'var(--gem-sys-color--surface-container)',
            fixed_nav_border: 'var(--gem-sys-color--outline)',
            fixed_nav_separator_bg: 'var(--gem-sys-color--outline)',
            fixed_nav_label_text: 'var(--text-secondary)',
            fixed_nav_counter_bg: 'var(--gem-sys-color--surface-container-high)',
            fixed_nav_counter_text: 'var(--gem-sys-color--on-surface-variant)',
            fixed_nav_counter_border: 'var(--gem-sys-color--primary)',
            fixed_nav_assistant_text: '#e57373',
            fixed_nav_btn_accent_text: 'var(--gem-sys-color--primary)',
            fixed_nav_btn_danger_text: 'var(--gem-sys-color--error)',
            fixed_nav_highlight_outline: 'var(--gem-sys-color--primary)',
            fixed_nav_highlight_radius: '12px',
            // Component Specifics: Jump List
            jump_list_bg: 'var(--gem-sys-color--surface-container)',
            jump_list_border: 'var(--gem-sys-color--outline)',
            jump_list_hover_outline: 'var(--gem-sys-color--outline)',
            jump_list_current_outline: 'var(--gem-sys-color--primary)',
        };

        const SITE_STYLES = {
            PALETTE: UI_PALETTE,
            Z_INDICES: CONSTANTS.Z_INDICES,
            CSS_IMPORTANT_FLAG: ' !important',
        };

        // =================================================================================
        // SECTION: Platform-Specific Adapter Classes
        // Description: Implementation of Base Adapters for Gemini.
        // =================================================================================

        class GeminiGeneralAdapter extends BaseGeneralAdapter {
            /** @override */
            isCanvasModeActive() {
                return !!document.querySelector(CONSTANTS.SELECTORS.CANVAS_CONTAINER);
            }

            /** @override */
            isExcludedPage() {
                const excludedPatterns = CONSTANTS.URL_PATTERNS.EXCLUDED;
                const pathname = window.location.pathname;
                return excludedPatterns.some((pattern) => pattern.test(pathname));
            }

            /** @override */
            isFilePanelActive() {
                return !!document.querySelector(CONSTANTS.SELECTORS.FILE_PANEL_CONTAINER);
            }

            /** @override */
            isNewChatPage() {
                const path = window.location.pathname;
                // 1. /app (Standard New Chat)
                // 2. /gems/view (Gems List)
                // 3. /gem/[GemID] (Gem Top - no ChatID)
                return /^\/app\/?$/.test(path) || /^\/gems\/view\/?$/.test(path) || /^\/gem\/[^/]+\/?$/.test(path);
            }

            /** @override */
            isChatPage() {
                const path = window.location.pathname;
                // 1. /app/[ChatID] (Standard Chat)
                // 2. /gem/[GemID]/[ChatID] (Gem Chat)
                return /^\/app\/[^/]+/.test(path) || /^\/gem\/[^/]+\/[^/]+/.test(path);
            }

            /** @override */
            getMessagesRoot() {
                const root = document.getElementById(CONSTANTS.SELECTORS.MESSAGES_ROOT);
                return root instanceof HTMLElement ? root : document.body;
            }

            /** @override */
            getMessageId(element) {
                if (!element) return null;
                return element.getAttribute(CONSTANTS.ATTRIBUTES.MESSAGE_ID);
            }

            /** @override */
            getMessageRole(messageElement) {
                if (!messageElement) return null;
                return messageElement.tagName.toLowerCase();
            }

            /** @override */
            getChatTitle() {
                // 1. Try to get title from selected chat history item
                const chatTitle = document.querySelector(CONSTANTS.SELECTORS.CONVERSATION_TITLE_WRAPPER)?.querySelector(CONSTANTS.SELECTORS.CONVERSATION_TITLE_TEXT)?.textContent.trim();
                if (chatTitle) {
                    return chatTitle;
                }

                // 2. If no chat selected, try to get title from selected Gem
                const selectedGem = document.querySelector(CONSTANTS.SELECTORS.GEM_SELECTED_ITEM);
                if (selectedGem) {
                    return selectedGem.querySelector(CONSTANTS.SELECTORS.GEM_NAME)?.textContent.trim() ?? null;
                }

                // Return null if no specific chat or Gem is active (e.g., initial load or "New Chat" page).
                // This signals the ThemeManager to apply the default theme set.
                return null;
            }

            /** @override */
            getJumpListDisplayText(messageElement) {
                const tagName = messageElement.tagName.toLowerCase();

                if (tagName === CONSTANTS.SELECTORS.ASSISTANT_MESSAGE) {
                    // Assistant (model-response)
                    // Gemini has a specific structure: try the main answer container first.
                    const answerContainer = messageElement.querySelector(CONSTANTS.SELECTORS.ASSISTANT_ANSWER_CONTENT);
                    if (answerContainer) {
                        const textEl = answerContainer.querySelector(CONSTANTS.SELECTORS.ASSISTANT_TEXT_CONTENT);
                        if (textEl) return textEl.textContent.trim();
                    }

                    // Fallback: Try finding text content directly if container structure varies
                    const fallbackTextEl = messageElement.querySelector(CONSTANTS.SELECTORS.ASSISTANT_TEXT_CONTENT);
                    if (fallbackTextEl) return fallbackTextEl.textContent.trim();
                } else if (tagName === CONSTANTS.SELECTORS.USER_MESSAGE) {
                    // User (user-query)
                    const contentEl = messageElement.querySelector(CONSTANTS.SELECTORS.USER_TEXT_CONTENT);
                    if (contentEl) return contentEl.textContent.trim();
                }

                return '';
            }

            /** @override */
            findMessageElement(contentElement) {
                return contentElement.closest(CONSTANTS.SELECTORS.BUBBLE_FEATURE_MESSAGE_CONTAINERS);
            }

            /** @override */
            initializeSentinel(callback) {
                const notProcessed = `:not(.${CONSTANTS.CLASSES.PROCESSED})`;

                // prettier-ignore
                const userContentSelector = [
                    `${CONSTANTS.SELECTORS.USER_MESSAGE} ${CONSTANTS.SELECTORS.RAW_USER_BUBBLE}${notProcessed}`,
                    `${CONSTANTS.SELECTORS.USER_MESSAGE} ${CONSTANTS.SELECTORS.RAW_USER_IMAGE_BUBBLE}${notProcessed}`,
                ].join(', ');

                // prettier-ignore
                const assistantContentSelector = [
                    `${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.RAW_ASSISTANT_BUBBLE}${notProcessed}`,
                    `${CONSTANTS.SELECTORS.RAW_ASSISTANT_IMAGE_BUBBLE}${notProcessed}`, // Assistant images are direct children usually
                ].join(', ');

                const combinedSelector = `${userContentSelector}, ${assistantContentSelector}`;

                sentinel.on(combinedSelector, callback);

                return () => {
                    sentinel.off(combinedSelector, callback);
                };
            }

            /** @override */
            scrollTo(element, options) {
                const { offset = 0, smooth = false } = options || {};
                const behavior = smooth ? 'smooth' : 'auto';

                // Use scrollIntoView + scroll-margin-top logic
                const originalScrollMargin = element.style.scrollMarginTop;
                element.style.scrollMarginTop = `${offset}px`;

                element.scrollIntoView({ behavior, block: 'start' });

                setTimeout(() => {
                    element.style.scrollMarginTop = originalScrollMargin;
                }, CONSTANTS.TIMING.TIMEOUTS.SCROLL_OFFSET_CLEANUP);
            }
        }

        class GeminiStyleManagerAdapter extends BaseStyleManagerAdapter {
            /** @override */
            getStaticCss(cls) {
                return `
                    ${CONSTANTS.SELECTORS.MAIN_APP_CONTAINER} {
                        transition: background-image 0.3s ease-in-out;
                    }
                    /* This rule is now conditional on a body class, which is toggled by applyChatContentMaxWidth. */
                    body.${cls.maxWidthActive} ${CONSTANTS.SELECTORS.CHAT_CONTENT_MAX_WIDTH}{
                        max-width: var(${CSS_VARS.CHAT_CONTENT_MAX_WIDTH}) !important;
                        margin-inline: auto !important;
                    }

                    /* Ensure the user message container inside the turn expands and aligns the bubble to the right. */
                    ${CONSTANTS.SELECTORS.CHAT_HISTORY_MAIN} ${CONSTANTS.SELECTORS.USER_MESSAGE} {
                        width: 100% !important;
                        max-width: none !important;
                        display: flex !important;
                        justify-content: flex-end !important;
                    }

                    /* Make content areas transparent to show the main background */
                    ${CONSTANTS.SELECTORS.CHAT_WINDOW},
                    ${CONSTANTS.SELECTORS.INPUT_CONTAINER},
                    ${CONSTANTS.SELECTORS.INPUT_AREA_BG_TARGET},
                    ${CONSTANTS.SELECTORS.GEM_MANAGER_CONTAINER},
                    ${CONSTANTS.SELECTORS.GEM_MANAGER_CONTAINER} > .container {
                        background: none !important;
                    }

                    /* Forcefully hide the gradient pseudo-element on the input container */
                    ${CONSTANTS.SELECTORS.INPUT_CONTAINER}::before {
                        display: none !important;
                    }
                `;
            }

            /** @override */
            getBubbleCss(cls) {
                return StyleTemplates.getBubbleUiCss(cls, UI_PALETTE, CONSTANTS, {
                    // Gemini: Parent is specifically the model-response element
                    collapsibleParentSelector: `model-response.${cls.collapsibleParent}`,
                    // Gemini: Collapsible button is only for assistant
                    collapsibleBtnExtraCss: `
                            .${cls.collapsibleBtn} {
                                left: 4px;
                            }
                        `,
                    // Gemini: Content area needs overflow handling
                    collapsibleCollapsedContentExtraCss: 'overflow-y: auto;',
                });
            }
        }

        class GeminiThemeManagerAdapter extends BaseThemeManagerAdapter {
            /** @override */
            shouldDeferInitialTheme(themeManager) {
                // This issue is specific to ChatGPT's title behavior, so Gemini never defers.
                return false;
            }

            /** @override */
            selectThemeForUpdate(themeManager, config, urlChanged, titleChanged) {
                // If the URL has changed, we must invalidate the cache to allow 'urlPatterns' (and 'matchPatterns') to be re-evaluated against the new context.
                if (urlChanged) {
                    themeManager.cachedThemeSet = null;
                }

                // Always return the evaluated theme set.
                return themeManager.getThemeSet();
            }

            /** @override */
            getStyleOverrides() {
                // The default block alignment is sufficient for Gemini.
                return {};
            }
        }

        class GeminiBubbleUIAdapter extends BaseBubbleUIAdapter {
            /** @override */
            getNavPositioningParent(messageElement) {
                const role = PlatformAdapters.General.getMessageRole(messageElement);

                if (role === CONSTANTS.SELECTORS.USER_MESSAGE) {
                    // For user messages, use the specific content container as the positioning context.
                    const container = messageElement.querySelector(CONSTANTS.SELECTORS.USER_QUERY_CONTAINER);
                    return container instanceof HTMLElement ? container : null;
                } else {
                    // For model-response, the element itself remains the correct context.
                    return messageElement;
                }
            }

            /** @override */
            getCollapsibleInfo(messageElement) {
                if (messageElement.tagName.toLowerCase() !== CONSTANTS.SELECTORS.ASSISTANT_MESSAGE) {
                    return null;
                }

                const bubbleElement = messageElement.querySelector(CONSTANTS.SELECTORS.RAW_ASSISTANT_BUBBLE);
                if (!(bubbleElement instanceof HTMLElement)) return null;

                // For Gemini, the messageElement serves as both msgWrapper and positioningParent
                return {
                    msgWrapper: messageElement,
                    bubbleElement,
                    positioningParent: messageElement,
                };
            }
        }

        class GeminiToastAdapter extends BaseToastAdapter {
            /** @override */
            getAutoScrollMessage() {
                return 'Auto-scrolling to load history...';
            }
        }

        class GeminiAppControllerAdapter extends BaseAppControllerAdapter {
            /** @override */
            initializePlatformManagers(controller) {
                // =================================================================================
                // SECTION: Auto Scroll Manager
                // Description: Manages the auto-scrolling feature to load the entire chat history.
                // =================================================================================

                /**
                 * @class AutoScrollManager
                 * @extends BaseAutoScrollManager
                 */
                class AutoScrollManager extends BaseAutoScrollManager {
                    static CONFIG = {
                        // The minimum number of messages required to trigger the auto-scroll feature.
                        MESSAGE_THRESHOLD: 20,
                        // The maximum time (in ms) to wait for the progress bar to appear after scrolling up.
                        APPEAR_TIMEOUT_MS: 2000,
                        // The maximum time (in ms) to wait for the progress bar to disappear after it has appeared.
                        DISAPPEAR_TIMEOUT_MS: 5000,
                        // The maximum time (in ms) to wait for Canvas to close before aborting scroll.
                        CANVAS_CLOSE_TIMEOUT_MS: 1000,
                    };

                    /**
                     * @param {ConfigManager} configManager
                     * @param {MessageCacheManager} messageCacheManager
                     * @param {ToastManager} toastManager
                     */
                    constructor(configManager, messageCacheManager, toastManager) {
                        super(configManager, messageCacheManager);
                        this.toastManager = toastManager;
                        this.scrollContainer = null;
                        this.observerContainer = null;
                        this.toastShown = false;
                        this.isInitialScrollCheckDone = false;
                        this.boundStop = null;
                        this.PROGRESS_BAR_SELECTOR = CONSTANTS.SELECTORS.PROGRESS_BAR;
                        this.progressObserver = null;
                        this.appearTimeout = null;
                        this.disappearTimeout = null;
                    }

                    /**
                     * @override
                     * @description Initializes the manager and subscribes to streaming events.
                     */
                    _onInit() {
                        super._onInit();
                        this._subscribe(EVENTS.STREAMING_START, () => this._onStreamingStart());
                        this.isInitialScrollCheckDone = false;
                    }

                    async start() {
                        if (this.isScrolling) return;

                        // Canvas (Immersive Panel) Handling
                        // If Canvas is open, it changes the DOM structure and causes freezing during scroll.
                        // We must close it before starting the scroll process.
                        const canvas = document.querySelector(CONSTANTS.SELECTORS.CANVAS_CONTAINER);
                        if (canvas) {
                            Logger.debug('AUTOSCROLL', LOG_STYLES.CYAN, 'Canvas detected. Attempting to close...');

                            // Scope the search strictly within the canvas container to avoid false positives
                            const closeBtn = canvas.querySelector(CONSTANTS.SELECTORS.CANVAS_CLOSE_BUTTON);

                            if (closeBtn instanceof HTMLElement) {
                                closeBtn.click();
                                // Notify user about the action
                                if (this.toastManager) {
                                    this.toastManager.show('Canvas closed for auto-scroll', false);
                                }

                                // Wait for Canvas to disappear from DOM
                                const startWait = Date.now();
                                while (document.querySelector(CONSTANTS.SELECTORS.CANVAS_CONTAINER)) {
                                    if (Date.now() - startWait > AutoScrollManager.CONFIG.CANVAS_CLOSE_TIMEOUT_MS) {
                                        Logger.warn('AUTOSCROLL', LOG_STYLES.YELLOW, 'Timed out waiting for Canvas to close. Aborting scroll.');
                                        return;
                                    }
                                    await new Promise((r) => requestAnimationFrame(r));
                                }
                            } else {
                                Logger.warn('AUTOSCROLL', LOG_STYLES.YELLOW, 'Canvas active but close button not found. Aborting scroll to prevent freeze.');
                                return;
                            }
                        }

                        // Set the flag immediately to prevent re-entrancy from other events.
                        this.isScrolling = true;

                        this.observerContainer = await waitForElement(CONSTANTS.SELECTORS.CHAT_WINDOW_CONTENT, { timeout: CONSTANTS.TIMING.TIMEOUTS.WAIT_FOR_MAIN_CONTENT, context: document }, sentinel);
                        // Guard against cancellation during await
                        if (!this.isScrolling) return;

                        this.scrollContainer = this.observerContainer?.querySelector(CONSTANTS.SELECTORS.CHAT_HISTORY_SCROLL_CONTAINER);

                        if (!this.observerContainer || !this.scrollContainer) {
                            Logger.warn('AUTOSCROLL WARN', LOG_STYLES.YELLOW, 'Could not find required containers.');
                            // Reset flags to allow re-triggering
                            this.isInitialScrollCheckDone = false;
                            this.isScrolling = false;
                            return;
                        }

                        Logger.log('', '', 'AutoScrollManager: Starting auto-scroll with MutationObserver.');
                        this.toastShown = false;

                        EventBus.publish(EVENTS.SUSPEND_OBSERVERS);

                        this.boundStop = () => this.stop(false);
                        this.scrollContainer.addEventListener('wheel', this.boundStop, { passive: true, once: true });
                        this.scrollContainer.addEventListener('touchmove', this.boundStop, { passive: true, once: true });

                        this._startObserver();
                        this._triggerScroll();
                    }

                    stop(isNavigation) {
                        if (!this.isScrolling && !this.progressObserver) return; // Prevent multiple stops

                        Logger.log('', '', 'AutoScrollManager: Stopping auto-scroll.');
                        this.isScrolling = false;
                        this.toastShown = false;

                        // Cleanup listeners and observers
                        if (this.boundStop) {
                            this.scrollContainer?.removeEventListener('wheel', this.boundStop);
                            this.scrollContainer?.removeEventListener('touchmove', this.boundStop);
                            this.boundStop = null;
                        }
                        this.progressObserver?.disconnect();
                        this.progressObserver = null;
                        clearTimeout(this.appearTimeout);
                        clearTimeout(this.disappearTimeout);
                        this.appearTimeout = null;
                        this.disappearTimeout = null;

                        this.scrollContainer = null;
                        this.observerContainer = null;

                        EventBus.publish(EVENTS.AUTO_SCROLL_COMPLETE);

                        // On navigation, ObserverManager handles observer resumption.
                        if (!isNavigation) {
                            EventBus.publish(EVENTS.RESUME_OBSERVERS_AND_REFRESH);
                            // Ensure the theme is re-evaluated and applied after scrolling is complete and observers are resumed.
                            EventBus.publish(EVENTS.THEME_UPDATE);
                        }
                    }

                    /**
                     * Starts the MutationObserver to watch for the progress bar.
                     */
                    _startObserver() {
                        if (this.progressObserver) this.progressObserver.disconnect();

                        const observerCallback = (mutations) => {
                            for (const mutation of mutations) {
                                this._handleProgressChange(mutation.addedNodes, mutation.removedNodes);
                            }
                        };

                        this.progressObserver = new MutationObserver(observerCallback);
                        this.progressObserver.observe(this.observerContainer, {
                            childList: true,
                            subtree: true,
                        });
                    }

                    /**
                     * Handles the appearance and disappearance of the progress bar.
                     * @param {NodeList} addedNodes
                     * @param {NodeList} removedNodes
                     */
                    _handleProgressChange(addedNodes, removedNodes) {
                        const progressBarAppeared = Array.from(addedNodes).some((node) => {
                            if (node instanceof Element) {
                                return node.matches(this.PROGRESS_BAR_SELECTOR) || node.querySelector(this.PROGRESS_BAR_SELECTOR);
                            }
                            return false;
                        });
                        const progressBarDisappeared = Array.from(removedNodes).some((node) => {
                            if (node instanceof Element) {
                                return node.matches(this.PROGRESS_BAR_SELECTOR) || node.querySelector(this.PROGRESS_BAR_SELECTOR);
                            }
                            return false;
                        });

                        if (progressBarAppeared) {
                            Logger.debug('AUTOSCROLL', LOG_STYLES.CYAN, 'Progress bar appeared.');
                            clearTimeout(this.appearTimeout); // Cancel the "end of history" timer
                            if (!this.toastShown) {
                                EventBus.publish(EVENTS.AUTO_SCROLL_START);
                                this.toastShown = true;
                            }
                            // Set a safety timeout in case loading gets stuck
                            this.disappearTimeout = setTimeout(() => {
                                Logger.warn('', '', 'AutoScrollManager: Timed out waiting for progress bar to disappear. Stopping.');
                                this.stop(false);
                            }, AutoScrollManager.CONFIG.DISAPPEAR_TIMEOUT_MS);
                        }

                        if (progressBarDisappeared) {
                            Logger.debug('AUTOSCROLL', LOG_STYLES.CYAN, 'Progress bar disappeared.');
                            clearTimeout(this.disappearTimeout); // Cancel the "stuck" timer
                            this._triggerScroll(); // Trigger the next scroll
                        }
                    }

                    /**
                     * Scrolls the container to the top and sets a timeout to check if loading has started.
                     */
                    _triggerScroll() {
                        if (!this.isScrolling || !this.scrollContainer) return;
                        this.scrollContainer.scrollTop = 0;

                        // Set a timeout to detect the end of the history. If the progress bar
                        // doesn't appear within this time, we assume there's no more content to load.
                        this.appearTimeout = setTimeout(() => {
                            Logger.log('', '', 'AutoScrollManager: Progress bar did not appear. Assuming scroll is complete.');
                            this.stop(false);
                        }, AutoScrollManager.CONFIG.APPEAR_TIMEOUT_MS);
                    }

                    /**
                     * @override
                     * @description Handles the CACHE_UPDATED event to perform the initial scroll check.
                     */
                    _onCacheUpdated() {
                        if (!this.isEnabled || this.isInitialScrollCheckDone) {
                            return;
                        }

                        const messageCount = this.messageCacheManager.getTotalMessages().length;

                        // Wait for at least one message to ensure history has started loading (First Paint logic)
                        if (messageCount === 0) return;

                        // Latch on first data: Mark initialization as done immediately regardless of threshold.
                        this.isInitialScrollCheckDone = true;

                        if (messageCount >= AutoScrollManager.CONFIG.MESSAGE_THRESHOLD) {
                            Logger.log('', '', `AutoScrollManager: ${messageCount} messages found. Triggering auto-scroll.`);
                            EventBus.publish(EVENTS.AUTO_SCROLL_REQUEST);
                        } else {
                            Logger.log('', '', `AutoScrollManager: ${messageCount} messages found (below threshold). Auto-scroll skipped.`);
                        }
                    }

                    /**
                     * @private
                     * @description Handles the STREAMING_START event to prevent auto-scroll from misfiring.
                     * Once the user starts interacting (which causes streaming), we consider the "initial" phase over.
                     */
                    _onStreamingStart() {
                        // If streaming starts (e.g., user sends a new message), permanently disable the
                        // initial auto-scroll check for this page load.
                        if (!this.isInitialScrollCheckDone) {
                            Logger.log('', '', 'AutoScrollManager: Streaming detected. Disabling initial auto-scroll check.');
                            this.isInitialScrollCheckDone = true;
                        }
                    }

                    /**
                     * @override
                     * @description Handles the NAVIGATION event to reset the manager's state.
                     */
                    _onNavigation() {
                        super._onNavigation();
                        if (this.isScrolling) {
                            // Stop scroll without triggering a UI refresh, as a new page is loading.
                            this.stop(true);
                        }
                        this.isInitialScrollCheckDone = false;
                    }
                }
                // Inject toastManager into the constructor
                controller.autoScrollManager = controller.manageFactory(CONSTANTS.RESOURCE_KEYS.AUTO_SCROLL_MANAGER, () => new AutoScrollManager(controller.configManager, controller.messageCacheManager, controller.toastManager));
            }

            /** @override */
            applyPlatformSpecificUiUpdates(controller, newConfig) {
                // Enable or disable the auto-scroll manager based on the new config.
                if (newConfig.platforms[PLATFORM].features.load_full_history_on_chat_load.enabled) {
                    controller.autoScrollManager?.enable();
                } else {
                    controller.autoScrollManager?.disable();
                }
            }
        }

        class GeminiAvatarAdapter extends BaseAvatarAdapter {
            /** @override */
            getCss() {
                const extraCss = `
                    /* Gemini Only: force user message and avatar to be top-aligned */
                    ${CONSTANTS.SELECTORS.AVATAR_USER} {
                        align-items: flex-start !important;
                    }
                    ${CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER} {
                        align-self: flex-start !important;
                    }
                `;
                return StyleTemplates.getAvatarCss(CONSTANTS.SELECTORS, extraCss);
            }

            /** @override */
            measureAvatarTarget(msgElem) {
                // The guard should only check for the existence of the avatar container itself.
                if (msgElem.querySelector(CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER)) {
                    // (Logic adapted: Return context to ensure processed check is maintained, but do not inject)
                    return {
                        shouldInject: false,
                        targetElement: null,
                        processedTarget: msgElem,
                        exclusionKey: msgElem,
                        originalElement: msgElem,
                    };
                }

                return {
                    shouldInject: true,
                    targetElement: msgElem,
                    processedTarget: msgElem,
                    exclusionKey: msgElem,
                    originalElement: msgElem,
                };
            }

            /** @override */
            injectAvatar(measurement, avatarContainer, processedClass) {
                const { shouldInject, targetElement, processedTarget } = measurement;

                // Add the container to the message element and mark as processed.
                if (shouldInject && targetElement && avatarContainer) {
                    targetElement.prepend(avatarContainer);
                }

                // Add the processed class only if it's not already there.
                if (processedTarget && !processedTarget.classList.contains(processedClass)) {
                    processedTarget.classList.add(processedClass);
                }
            }
        }

        class GeminiStandingImageAdapter extends BaseStandingImageAdapter {
            /** @override */
            async recalculateLayout(instance) {
                // Handle early exits that don't require measurement.
                const v = instance.style.vars;
                const cls = instance.style.classes;

                if (PlatformAdapters.General.isCanvasModeActive() || PlatformAdapters.General.isFilePanelActive()) {
                    const rootStyle = document.documentElement.style;
                    rootStyle.setProperty(v.assistantWidth, '0px');
                    rootStyle.setProperty(v.userWidth, '0px');
                    return;
                }

                await withLayoutCycle({
                    measure: () => {
                        // --- Read Phase ---
                        const chatArea = document.querySelector(CONSTANTS.SELECTORS.MAIN_APP_CONTAINER);

                        // Find the message area using priority selectors defined in STANDING_IMAGE_ANCHOR
                        const selectors = CONSTANTS.SELECTORS.STANDING_IMAGE_ANCHOR.split(',').map((s) => s.trim());
                        let messageArea = null;
                        for (const selector of selectors) {
                            messageArea = document.querySelector(selector);
                            if (messageArea) break;
                        }

                        if (!chatArea || !messageArea) return null; // Signal to mutate to reset styles.

                        const assistantImg = document.getElementById(cls.assistantImageId);
                        const userImg = document.getElementById(cls.userImageId);

                        return {
                            chatRect: chatArea.getBoundingClientRect(),
                            messageRect: messageArea.getBoundingClientRect(),
                            windowHeight: window.innerHeight,
                            assistantImgHeight: assistantImg ? assistantImg.offsetHeight : 0,
                            userImgHeight: userImg ? userImg.offsetHeight : 0,
                        };
                    },
                    mutate: (measured) => {
                        // --- Write Phase ---
                        if (instance.isDestroyed) return;
                        const rootStyle = document.documentElement.style;

                        if (!measured) {
                            rootStyle.setProperty(v.assistantWidth, '0px');
                            rootStyle.setProperty(v.userWidth, '0px');
                            return;
                        }

                        const { chatRect, messageRect, windowHeight, assistantImgHeight, userImgHeight } = measured;

                        // Set Assistant base position (Platform specific)
                        rootStyle.setProperty(v.assistantLeft, `${chatRect.left}px`);

                        // Calculate available widths
                        const assistantAvailableWidth = messageRect.left - chatRect.left;
                        const userAvailableWidth = chatRect.right - messageRect.right;

                        // Delegate common calculation
                        StandingImageLayout.apply(instance, {
                            assistantAvailableWidth,
                            userAvailableWidth,
                            assistantImgHeight,
                            userImgHeight,
                            windowHeight,
                        });
                    },
                });
            }

            /** @override */
            updateVisibility(instance) {
                const isCanvasActive = PlatformAdapters.General.isCanvasModeActive();
                const isFilePanelActive = PlatformAdapters.General.isFilePanelActive();
                const cls = instance.style.classes;
                const v = instance.style.vars;

                [cls.userImageId, cls.assistantImageId].forEach((id) => {
                    const imgElement = document.getElementById(id);
                    if (!imgElement) return;

                    const isUser = id === cls.userImageId;
                    const varName = isUser ? v.userImage : v.assistantImage;

                    const hasImage = !!document.documentElement.style.getPropertyValue(varName);
                    imgElement.style.opacity = hasImage && !isCanvasActive && !isFilePanelActive ? '1' : '0';
                });
            }

            /** @override */
            setupEventListeners(instance) {
                // Gemini-specific: Subscribe to cacheUpdated because this platform's updateVisibility() logic depends on the message count.
                // Use scheduleUpdate to ensure layout is also recalculated after navigation or DOM updates.
                instance.registerPlatformListener(EVENTS.CACHE_UPDATED, instance.scheduleUpdate);
            }
        }

        class GeminiObserverAdapter extends BaseObserverAdapter {
            /**
             * @private
             * @description Starts a stateful observer to detect the appearance and disappearance of panels (Immersive/File) using a high-performance hybrid approach.
             * @param {object} dependencies The required methods from ObserverManager.
             * @returns {() => void} A cleanup function.
             */
            startPanelObserver(dependencies) {
                // Use shared logic from ObserverManager via dependencies
                return dependencies.startGenericPanelObserver({
                    triggerSelector: `${CONSTANTS.SELECTORS.CANVAS_CONTAINER}, ${CONSTANTS.SELECTORS.FILE_PANEL_CONTAINER}`, // Trigger (Panel itself)
                    observerType: CONSTANTS.OBSERVED_ELEMENT_TYPES.SIDE_PANEL,
                    targetResolver: (el) => el, // Target Resolver (The trigger is the panel)
                    immediateCallback: () => EventBus.publish(EVENTS.VISIBILITY_RECHECK),
                });
            }

            /**
             * @param {object} dependencies The dependencies passed from ObserverManager (unused in this method).
             * @private
             * @description Sets up a targeted observer on the sidebar for title and selection changes.
             * @returns {() => void} A cleanup function.
             */
            startSidebarObserver(dependencies) {
                let animationLoopId = null;
                const ANIMATION_DURATION = CONSTANTS.TIMING.ANIMATIONS.LAYOUT_STABILIZATION_MS;
                let sidebarObserver = null;
                let transitionEndHandler = null;
                let observedElement = null;

                const setupObserver = (sidebar) => {
                    // Clean up previous listener if element has changed or observer is re-running
                    if (observedElement && transitionEndHandler) {
                        observedElement.removeEventListener('transitionend', transitionEndHandler);
                    }

                    sidebarObserver?.disconnect();

                    // Function to run the layout update loop
                    const startUpdateLoop = () => {
                        if (animationLoopId) cancelAnimationFrame(animationLoopId);

                        const startTime = Date.now();

                        const loop = () => {
                            EventBus.publish(EVENTS.SIDEBAR_LAYOUT_CHANGED);

                            if (Date.now() - startTime < ANIMATION_DURATION) {
                                animationLoopId = requestAnimationFrame(loop);
                            } else {
                                animationLoopId = null;
                            }
                        };

                        loop();
                    };

                    // Keep title updates debounced as they don't require animation loops
                    const debouncedTitleUpdate = debounce(() => EventBus.publish(EVENTS.TITLE_CHANGED), CONSTANTS.TIMING.DEBOUNCE_DELAYS.THEME_UPDATE, true);

                    // Handle transition end as a safety net to ensure final position is captured
                    if (!transitionEndHandler) {
                        transitionEndHandler = () => EventBus.publish(EVENTS.SIDEBAR_LAYOUT_CHANGED);
                    }

                    sidebar.addEventListener('transitionend', transitionEndHandler);
                    observedElement = sidebar;

                    sidebarObserver = new MutationObserver((mutations) => {
                        let layoutChanged = false;
                        let titleChanged = false;

                        for (const mutation of mutations) {
                            const target = mutation.target;

                            // Check for layout changes (start of animation)
                            if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'style' || mutation.attributeName === 'width')) {
                                layoutChanged = true;

                                // Enhanced Check: Detect selection changes in Chat History or Gem List
                                // If the class of a list item changes, it likely means selection/deselection, which implies a title change.
                                if (mutation.attributeName === 'class' && target instanceof Element) {
                                    // Check if the target is a chat history item or a gem list item
                                    if (target.matches(CONSTANTS.SELECTORS.CHAT_HISTORY_ITEM) || target.matches(CONSTANTS.SELECTORS.GEM_LIST_ITEM)) {
                                        titleChanged = true;
                                    }
                                }
                            }
                            // Check for title text changes (renaming)
                            if (mutation.type === 'characterData' && target.parentElement?.matches(CONSTANTS.SELECTORS.CONVERSATION_TITLE_TEXT)) {
                                titleChanged = true;
                            }
                        }

                        if (layoutChanged) {
                            startUpdateLoop();
                        }
                        if (titleChanged) {
                            debouncedTitleUpdate();
                        }
                    });

                    sidebarObserver.observe(sidebar, {
                        attributes: true, // Enable attribute observation for layout changes and selection state
                        attributeFilter: ['class', 'style', 'width'], // specific attributes
                        characterData: true, // For title changes
                        subtree: true, // Needed for title text nodes deeper in the tree
                        childList: false,
                    });

                    // Initial triggers for the first load.
                    debouncedTitleUpdate();
                    EventBus.publish(EVENTS.SIDEBAR_LAYOUT_CHANGED);
                };

                const selector = CONSTANTS.SELECTORS.SIDEBAR_WIDTH_TARGET;
                sentinel.on(selector, setupObserver);

                const existingSidebar = document.querySelector(selector);
                if (existingSidebar) {
                    setupObserver(existingSidebar);
                }

                // Return the cleanup function for all resources created by this observer.
                return () => {
                    sentinel.off(selector, setupObserver);
                    if (sidebarObserver) {
                        sidebarObserver.disconnect();
                    }
                    if (animationLoopId) cancelAnimationFrame(animationLoopId);

                    // Explicitly remove the event listener from the stored element reference
                    if (observedElement && transitionEndHandler) {
                        observedElement.removeEventListener('transitionend', transitionEndHandler);
                        observedElement = null;
                    }
                };
            }

            /**
             * @private
             * @description Starts a stateful observer for the input area to detect resizing and DOM reconstruction (button removal).
             * @param {object} dependencies The ObserverManager dependencies.
             * @returns {() => void} A cleanup function.
             */
            startInputAreaObserver(dependencies) {
                // Use shared logic from ObserverManager via dependencies
                return dependencies.startGenericInputAreaObserver({
                    triggerSelector: CONSTANTS.SELECTORS.INPUT_RESIZE_TARGET,
                    resizeTargetSelector: CONSTANTS.SELECTORS.INPUT_RESIZE_TARGET,
                });
            }

            /** @override */
            getPlatformObserverStarters() {
                // prettier-ignore
                return [
                    this.startSidebarObserver,
                    this.startPanelObserver,
                    this.startInputAreaObserver,
                ];
            }

            /** @override */
            isTurnComplete(turnNode) {
                // In Gemini, a single turn container can include the user message.
                // Therefore, a turn is considered complete *only* when the assistant's
                // action buttons are present, regardless of whether a user message exists.
                const assistantActions = turnNode.querySelector(CONSTANTS.SELECTORS.TURN_COMPLETE_SELECTOR);
                return !!assistantActions;
            }
        }

        class GeminiSettingsPanelAdapter extends BaseSettingsPanelAdapter {
            /** @override */
            getPlatformSpecificFeatureToggles() {
                const p = `platforms.${PLATFORM}`;
                return [
                    SchemaBuilder.Toggle(`${p}.features.load_full_history_on_chat_load.enabled`, 'Load full history on chat load', {
                        title: 'When enabled, automatically scrolls back through the history when a chat is opened to load all messages.',
                    }),
                ];
            }
        }

        class GeminiFixedNavAdapter extends BaseFixedNavAdapter {
            /** @override */
            isHeaderPositionAvailable(navConsoleWidth) {
                // 1. Check for panels that compress the layout (Canvas or File Panel)
                if (PlatformAdapters.General.isCanvasModeActive() || PlatformAdapters.General.isFilePanelActive()) {
                    return false;
                }

                // 2. Check available width in the main container (accounts for sidebar)
                const container = document.querySelector(CONSTANTS.SELECTORS.MAIN_APP_CONTAINER);
                if (container instanceof HTMLElement) {
                    return container.offsetWidth >= CONSTANTS.UI_SPECS.HEADER_POSITION_MIN_WIDTH;
                }

                // Fallback to window width if container not found
                return window.innerWidth >= CONSTANTS.UI_SPECS.HEADER_POSITION_MIN_WIDTH;
            }

            /** @override */
            getNavAnchorContainer() {
                // Target the right section of the top bar actions
                const el = document.querySelector(CONSTANTS.SELECTORS.HEADER_RIGHT_SECTION);
                return el instanceof HTMLElement ? el : null;
            }

            /** @override */
            handleInfiniteScroll(fixedNavManagerInstance, highlightedMessage, previousTotalMessages) {
                const currentTotalMessages = fixedNavManagerInstance.messageCacheManager.getTotalMessages().length;

                // If new messages have been loaded (scrolled up), and a message is currently highlighted.
                if (currentTotalMessages > previousTotalMessages && highlightedMessage) {
                    // Re-calculate the indices based on the updated (larger) message cache.
                    fixedNavManagerInstance.setHighlightAndIndices(highlightedMessage);
                }
            }

            /** @override */
            getPlatformSpecificButtons(fixedNavManagerInstance, styleHandle) {
                const cls = styleHandle.classes;
                const autoscrollBtn = h(
                    `button#${cls.autoscrollBtnId}.${cls.btn}`,
                    {
                        title: 'Load full chat history',
                        dataset: { [CONSTANTS.DATA_KEYS.ORIGINAL_TITLE]: 'Load full chat history' },
                        onclick: () => EventBus.publish(EVENTS.AUTO_SCROLL_REQUEST),
                    },
                    [createIconFromDef(StyleDefinitions.ICONS.scrollToTop)]
                );

                return [autoscrollBtn];
            }

            /** @override */
            updatePlatformSpecificButtonState(autoscrollBtn, isAutoScrolling, autoScrollManager) {
                autoscrollBtn.disabled = isAutoScrolling;

                if (isAutoScrolling) {
                    autoscrollBtn.title = 'Loading history...';
                } else {
                    autoscrollBtn.title = DomState.get(autoscrollBtn, CONSTANTS.DATA_KEYS.ORIGINAL_TITLE);
                }
            }
        }

        class GeminiTimestampAdapter extends BaseTimestampAdapter {
            // No-op adapter, inherits defaults
        }

        class GeminiUIManagerAdapter extends BaseUIManagerAdapter {
            /** @override */
            ensureButtonPlacement(settingsButton) {
                ensureSettingsButtonPlacement(settingsButton, CONSTANTS.SELECTORS.INSERTION_ANCHOR, PlatformAdapters.General.isExcludedPage);
            }
        }

        const PlatformAdapters = {
            General: new GeminiGeneralAdapter(),
            StyleManager: new GeminiStyleManagerAdapter(),
            ThemeManager: new GeminiThemeManagerAdapter(),
            BubbleUI: new GeminiBubbleUIAdapter(),
            Toast: new GeminiToastAdapter(),
            AppController: new GeminiAppControllerAdapter(),
            Avatar: new GeminiAvatarAdapter(),
            StandingImage: new GeminiStandingImageAdapter(),
            Observer: new GeminiObserverAdapter(),
            SettingsPanel: new GeminiSettingsPanelAdapter(),
            FixedNav: new GeminiFixedNavAdapter(),
            Timestamp: new GeminiTimestampAdapter(),
            UIManager: new GeminiUIManagerAdapter(),
        };

        return {
            CONSTANTS,
            SITE_STYLES,
            PlatformAdapters,
        };
    }
})();
