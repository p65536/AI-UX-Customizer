// ==UserScript==
// @name         Gemini-UX-Customizer
// @namespace    https://github.com/p65536
// @version      1.6.0
// @license      MIT
// @description  Fully customize the chat UI. Automatically applies themes based on chat names to control everything from avatar icons and standing images to bubble styles and backgrounds. Adds powerful navigation features like a message jump list with search.
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gemini.google.com
// @author       p65536
// @match        https://gemini.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @connect      *
// @run-at       document-idle
// @noframes
// ==/UserScript==

(() => {
    'use strict';

    // =================================================================================
    // SECTION: Platform-Specific Definitions (DO NOT COPY TO OTHER PLATFORM)
    // =================================================================================

    const OWNERID = 'p65536';
    const APPID = 'gggux';
    const APPNAME = 'Gemini UX Customizer';
    const ASSISTANT_NAME = 'Gemini';
    const LOG_PREFIX = `[${APPID.toUpperCase()}]`;

    // =================================================================================
    // SECTION: Logging Utility
    // Description: Centralized logging interface for consistent log output across modules.
    //              Handles log level control, message formatting, and console API wrapping.
    // =================================================================================

    const Logger = {
        /** @property {object} levels - Defines the numerical hierarchy of log levels. */
        levels: {
            error: 0,
            warn: 1,
            info: 2,
            log: 3,
            debug: 4,
        },
        /** @property {string} level - The current active log level. */
        level: 'log', // Default level
        /**
         * Sets the current log level.
         * @param {string} level The new log level. Must be one of 'error', 'warn', 'info', 'log', 'debug'.
         */
        setLevel(level) {
            if (Object.prototype.hasOwnProperty.call(this.levels, level)) {
                this.level = level;
            } else {
                console.warn(LOG_PREFIX, `Invalid log level "${level}". Valid levels are: ${Object.keys(this.levels).join(', ')}. Level not changed.`);
            }
        },
        /** @param {...any} args The messages or objects to log. */
        error(...args) {
            if (this.levels[this.level] >= this.levels.error) {
                console.error(LOG_PREFIX, ...args);
            }
        },
        /** @param {...any} args The messages or objects to log. */
        warn(...args) {
            if (this.levels[this.level] >= this.levels.warn) {
                console.warn(LOG_PREFIX, ...args);
            }
        },
        /** @param {...any} args The messages or objects to log. */
        info(...args) {
            if (this.levels[this.level] >= this.levels.info) {
                console.info(LOG_PREFIX, ...args);
            }
        },
        /** @param {...any} args The messages or objects to log. */
        log(...args) {
            if (this.levels[this.level] >= this.levels.log) {
                console.log(LOG_PREFIX, ...args);
            }
        },
        /**
         * Logs messages for debugging. Only active in 'debug' level.
         * @param {...any} args The messages or objects to log.
         */
        debug(...args) {
            if (this.levels[this.level] >= this.levels.debug) {
                // Use console.debug for better filtering in browser dev tools.
                console.debug(LOG_PREFIX, ...args);
            }
        },
        /**
         * Starts a timer for performance measurement. Only active in 'debug' level.
         * @param {string} label The label for the timer.
         */
        time(label) {
            if (this.levels[this.level] >= this.levels.debug) {
                console.time(`${LOG_PREFIX} ${label}`);
            }
        },
        /**
         * Ends a timer and logs the elapsed time. Only active in 'debug' level.
         * @param {string} label The label for the timer, must match the one used in time().
         */
        timeEnd(label) {
            if (this.levels[this.level] >= this.levels.debug) {
                console.timeEnd(`${LOG_PREFIX} ${label}`);
            }
        },
        /**
         * @param {...any} args The title for the log group.
         * @returns {void}
         */
        group: (...args) => console.group(LOG_PREFIX, ...args),
        /**
         * @param {...any} args The title for the collapsed log group.
         * @returns {void}
         */
        groupCollapsed: (...args) => console.groupCollapsed(LOG_PREFIX, ...args),
        /**
         * Closes the current log group.
         * @returns {void}
         */
        groupEnd: () => console.groupEnd(),
    };

    /**
     * @description A lightweight performance monitor to track event frequency.
     * Only active when Logger.level is set to 'debug'.
     */
    const PerfMonitor = {
        _events: {},
        /**
         * Logs the frequency of an event, throttled by a specified delay.
         * @param {string} key A unique key for the event to track.
         * @param {number} [delay] The time window in milliseconds to aggregate calls.
         */
        throttleLog(key, delay = 1000) {
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
                Logger.debug(`[PerfMonitor] ${key}: ${this._events[key].count} calls in ${now - this._events[key].startTime}ms (${callsPerSecond} calls/sec)`);
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
    // SECTION: Configuration and Constants
    // Description: Defines default settings, global constants, and CSS selectors.
    // =================================================================================

    // ---- Default Settings & Theme Configuration ----
    const CONSTANTS = {
        CONFIG_KEY: `${APPID}_config`,
        CONFIG_SIZE_LIMIT_BYTES: 5033164, // 4.8MB
        CACHE_SIZE_LIMIT_BYTES: 10 * 1024 * 1024, // 10MB
        ICON_SIZE: 64,
        ICON_SIZE_VALUES: [64, 96, 128, 160, 192],
        ICON_MARGIN: 16,
        BUTTON_VISIBILITY_THRESHOLD_PX: 128,
        BATCH_PROCESSING_SIZE: 50,
        RETRY: {
            MAX_STANDING_IMAGES: 10,
            STANDING_IMAGES_INTERVAL: 250,
            SCROLL_OFFSET_FOR_NAV: 40,
        },
        TIMING: {
            DEBOUNCE_DELAYS: {
                // Delay for recalculating UI elements after visibility changes
                VISIBILITY_CHECK: 250,
                // Delay for updating the message cache after DOM mutations
                CACHE_UPDATE: 250,
                // Delay for recalculating layout-dependent elements (e.g., standing images) after resize
                LAYOUT_RECALCULATION: 150,
                // Delay for updating navigation buttons after a message is completed
                NAVIGATION_UPDATE: 100,
                // Delay for repositioning UI elements like the settings button
                UI_REPOSITION: 100,
                // Delay for updating the theme after sidebar mutations (Gemini-specific)
                THEME_UPDATE: 150,
                // Delay for saving settings after user input in the settings panel
                SETTINGS_SAVE: 300,
                // Delay for updating the theme editor's preview pane
                THEME_PREVIEW: 50,
                // Delay for batching avatar injection events on initial load
                AVATAR_INJECTION: 25,
            },
            TIMEOUTS: {
                // Delay to wait for the DOM to settle after a URL change before re-scanning
                POST_NAVIGATION_DOM_SETTLE: 200,
                // Delay before removing the temporary anchor element used for smooth scrolling with an offset
                VIRTUAL_ANCHOR_CLEANUP: 1500,
                // Delay before reopening a modal after a settings sync conflict is resolved
                MODAL_REOPEN_DELAY: 100,
                // Delay to wait for panel transition animations (e.g., Canvas, File Panel) to complete
                PANEL_TRANSITION_DURATION: 350,
                // Fallback delay for requestIdleCallback
                IDLE_EXECUTION_FALLBACK: 50,
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
        },
        Z_INDICES: {
            SETTINGS_BUTTON: 10000,
            SETTINGS_PANEL: 11000,
            THEME_MODAL: 12000,
            JSON_MODAL: 15000,
            JUMP_LIST_PREVIEW: 16000,
            STANDING_IMAGE: 1,
            BUBBLE_NAVIGATION: 'auto',
            NAV_CONSOLE: 500,
        },
        MODAL: {
            WIDTH: 440,
            PADDING: 4,
            RADIUS: 8,
            BTN_RADIUS: 5,
            BTN_FONT_SIZE: 13,
            BTN_PADDING: '5px 16px',
            TITLE_MARGIN_BOTTOM: 8,
            BTN_GROUP_GAP: 8,
            TEXTAREA_HEIGHT: 200,
        },
        UI_DEFAULTS: {
            SETTINGS_BUTTON_CANVAS_OFFSET_PX: 96,
            SETTINGS_BUTTON_DEFAULT_POSITION: { top: '10px', right: '320px' },
        },
        SELECTORS: {
            // --- Main containers ---
            MAIN_APP_CONTAINER: 'bard-sidenav-content',
            CHAT_WINDOW_CONTENT: 'chat-window-content',
            CHAT_WINDOW: 'chat-window',
            CHAT_HISTORY_MAIN: 'div#chat-history',
            INPUT_CONTAINER: 'input-container',

            // --- Message containers ---
            CONVERSATION_CONTAINER: '.conversation-container',
            MESSAGE_CONTAINER_PARENT: '.conversation-container',
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

            // --- Avatar area ---
            AVATAR_USER: 'user-query',
            AVATAR_ASSISTANT: 'model-response',

            // --- Selectors for Avatar ---
            SIDE_AVATAR_CONTAINER: '.side-avatar-container',
            SIDE_AVATAR_ICON: '.side-avatar-icon',
            SIDE_AVATAR_NAME: '.side-avatar-name',

            // --- Other UI Selectors ---
            SIDEBAR_WIDTH_TARGET: 'bard-sidenav',
            CHAT_CONTENT_MAX_WIDTH: '.conversation-container',
            SCROLL_CONTAINER: null,

            // --- Site Specific Selectors ---

            // --- BubbleFeature-specific Selectors ---
            BUBBLE_FEATURE_MESSAGE_CONTAINERS: 'user-query, model-response',
            BUBBLE_FEATURE_TURN_CONTAINERS: null, // Not applicable to Gemini

            // --- FixedNav-specific Selectors ---
            FIXED_NAV_INPUT_AREA_TARGET: 'input-area-v2',
            FIXED_NAV_MESSAGE_CONTAINERS: 'user-query, model-response',
            FIXED_NAV_TURN_CONTAINER: '.conversation-container',
            FIXED_NAV_ROLE_USER: 'user-query',
            FIXED_NAV_ROLE_ASSISTANT: 'model-response',
            FIXED_NAV_HIGHLIGHT_TARGETS: `.${APPID}-highlight-message .user-query-bubble-with-background, .${APPID}-highlight-message .response-container-with-gpi`,

            // --- Turn Completion Selector ---
            TURN_COMPLETE_SELECTOR: 'model-response message-actions',
            MESSAGE_ACTIONS_TOOLBAR: 'message-actions',

            // --- Debug Selectors ---
            DEBUG_CONTAINER_TURN: '.conversation-container',
            DEBUG_CONTAINER_ASSISTANT: 'model-response',
            DEBUG_CONTAINER_USER: 'user-query',

            // --- Canvas ---
            CANVAS_CONTAINER: 'immersive-panel',

            // --- File Panel ---
            FILE_PANEL_CONTAINER: 'context-sidebar',
        },
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
         * @description Requests a repositioning of floating UI elements like the settings button.
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
        /**
         * @description Requests to reopen a modal, typically after a settings sync conflict is resolved.
         * @event REOPEN_MODAL
         * @property {object} detail - Context for which modal to reopen (e.g., { type: 'json' }).
         */
        REOPEN_MODAL: `${APPID}:reOpenModal`,

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
         * @description Fired to request a full application shutdown and cleanup.
         * @event APP_SHUTDOWN
         * @property {null} detail - No payload.
         */
        APP_SHUTDOWN: `${APPID}:appShutdown`,

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

    // ---- Site-specific Style Variables ----
    const SITE_STYLES = {
        ICONS: {
            // For ThemeModal
            folder: {
                tag: 'svg',
                props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' },
                children: [{ tag: 'path', props: { d: 'M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z' } }],
            },
            // For BubbleUI (prev, collapse), FixedNav (prev), ThemeModal (up)
            arrowUp: {
                tag: 'svg',
                props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' },
                children: [{ tag: 'path', props: { d: 'M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z' } }],
            },
            // For BubbleUI (next), FixedNav (next), ThemeModal (down)
            arrowDown: {
                tag: 'svg',
                props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' },
                children: [{ tag: 'path', props: { d: 'M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z' } }],
            },
            // For BubbleUI (top)
            scrollToTop: {
                tag: 'svg',
                props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' },
                children: [{ tag: 'path', props: { d: 'M440-160v-480L280-480l-56-56 256-256 256 256-56 56-160-160v480h-80Zm-200-640v-80h400v80H240Z' } }],
            },
            // For FixedNav
            scrollToFirst: {
                tag: 'svg',
                props: { viewBox: '0 -960 960 960' },
                children: [{ tag: 'path', props: { d: 'm280-280 200-200 200 200-56 56-144-144-144 144-56-56Zm-40-360v-80h480v80H240Z' } }],
            },
            scrollToLast: {
                tag: 'svg',
                props: { viewBox: '0 -960 960 960' },
                children: [{ tag: 'path', props: { d: 'M240-200v-80h480v80H240Zm240-160L280-560l56-56 144 144 144-144 56 56-200 200Z' } }],
            },
            bulkCollapse: {
                tag: 'svg',
                props: { className: 'icon-collapse', viewBox: '0 -960 960 960' },
                children: [{ tag: 'path', props: { d: 'M440-440v240h-80v-160H200v-80h240Zm160-320v160h160v80H520v-240h80Z' } }],
            },
            bulkExpand: {
                tag: 'svg',
                props: { className: 'icon-expand', viewBox: '0 -960 960 960' },
                children: [{ tag: 'path', props: { d: 'M200-200v-240h80v160h160v80H200Zm480-320v-160H520v-80h240v240h-80Z' } }],
            },
            refresh: {
                tag: 'svg',
                props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' },
                children: [
                    {
                        tag: 'path',
                        props: {
                            d: 'M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-54-87-87t-121-33q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z',
                        },
                    },
                ],
            },
        },
        SETTINGS_BUTTON: {
            background: 'var(--gem-sys-color--surface-container-high)',
            borderColor: 'var(--gem-sys-color--outline)',
            backgroundHover: 'var(--gem-sys-color--surface-container-higher)',
            borderColorHover: 'var(--gem-sys-color--outline)',
            borderRadius: '50%',
            iconDef: {
                tag: 'svg',
                props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 0 24 24', width: '24px', fill: 'currentColor' },
                children: [
                    { tag: 'path', props: { d: 'M0 0h24v24H0V0z', fill: 'none' } },
                    {
                        tag: 'path',
                        props: {
                            d: 'M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.08-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z',
                        },
                    },
                ],
            },
        },
        SETTINGS_PANEL: {
            bg: 'var(--gem-sys-color--surface-container-highest)',
            text_primary: 'var(--gem-sys-color--on-surface)',
            text_secondary: 'var(--gem-sys-color--on-surface-variant)',
            border_medium: 'var(--gem-sys-color--outline)',
            border_default: 'var(--gem-sys-color--outline)',
            border_light: 'var(--gem-sys-color--outline)',
            toggle_bg_off: 'var(--gem-sys-color--surface-container)',
            toggle_bg_on: 'var(--gem-sys-color--primary)',
            toggle_knob: 'var(--gem-sys-color--on-primary-container)',
        },
        JSON_MODAL: {
            bg: 'var(--gem-sys-color--surface-container-highest)',
            text: 'var(--gem-sys-color--on-surface)',
            border: 'var(--gem-sys-color--outline)',
            btn_bg: 'var(--gem-sys-color--surface-container-high)',
            btn_hover_bg: 'var(--gem-sys-color--surface-container-higher)',
            btn_text: 'var(--gem-sys-color--on-surface-variant)',
            btn_border: 'var(--gem-sys-color--outline)',
            textarea_bg: 'var(--gem-sys-color--surface-container-low)',
            textarea_text: 'var(--gem-sys-color--on-surface)',
            textarea_border: 'var(--gem-sys-color--outline)',
            msg_error_text: 'var(--gem-sys-color--error)',
            msg_success_text: 'var(--gem-sys-color--primary)',
        },
        THEME_MODAL: {
            modal_bg: 'var(--gem-sys-color--surface-container-highest)',
            modal_text: 'var(--gem-sys-color--on-surface)',
            modal_border: 'var(--gem-sys-color--outline)',
            btn_bg: 'var(--gem-sys-color--surface-container-high)',
            btn_hover_bg: 'var(--gem-sys-color--surface-container-higher)',
            btn_text: 'var(--gem-sys-color--on-surface-variant)',
            btn_border: 'var(--gem-sys-color--outline)',
            error_text: 'var(--gem-sys-color--error)',
            delete_confirm_label_text: 'var(--gem-sys-color--error)',
            delete_confirm_btn_text: 'var(--gem-sys-color--on-error-container)',
            delete_confirm_btn_bg: 'var(--gem-sys-color--error-container)',
            delete_confirm_btn_hover_text: 'var(--gem-sys-color--on-error-container)',
            delete_confirm_btn_hover_bg: 'var(--gem-sys-color--error-container)',
            fieldset_border: 'var(--gem-sys-color--outline)',
            legend_text: 'var(--gem-sys-color--on-surface-variant)',
            label_text: 'var(--gem-sys-color--on-surface-variant)',
            input_bg: 'var(--gem-sys-color--surface-container-low)',
            input_text: 'var(--gem-sys-color--on-surface)',
            input_border: 'var(--gem-sys-color--outline)',
            slider_display_text: 'var(--gem-sys-color--on-surface)',
            popup_bg: 'var(--gem-sys-color--surface-container-highest)',
            popup_border: 'var(--gem-sys-color--outline)',
            dnd_indicator_color: 'var(--gem-sys-color--primary)',
            folderIconDef: {
                tag: 'svg',
                props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' },
                children: [{ tag: 'path', props: { d: 'M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z' } }],
            },
            upIconDef: {
                tag: 'svg',
                props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' },
                children: [{ tag: 'path', props: { d: 'M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z' } }],
            },
            downIconDef: {
                tag: 'svg',
                props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' },
                children: [{ tag: 'path', props: { d: 'M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z' } }],
            },
        },
        FIXED_NAV: {
            bg: 'var(--gem-sys-color--surface-container)',
            border: 'var(--gem-sys-color--outline)',
            separator_bg: 'var(--gem-sys-color--outline)',
            label_text: 'var(--gem-sys-color--on-surface-variant)',
            counter_bg: 'var(--gem-sys-color--surface-container-high)',
            counter_text: 'var(--gem-sys-color--on-surface-variant)',
            counter_border: 'var(--gem-sys-color--primary)',
            btn_bg: 'var(--gem-sys-color--surface-container-high)',
            btn_hover_bg: 'var(--gem-sys-color--surface-container-higher)',
            btn_text: 'var(--gem-sys-color--on-surface-variant)',
            btn_border: 'var(--gem-sys-color--outline)',
            btn_accent_text: 'var(--gem-sys-color--primary)',
            btn_danger_text: 'var(--gem-sys-color--error)',
            highlight_outline: 'var(--gem-sys-color--primary)',
            highlight_border_radius: '12px',
        },
        JUMP_LIST: {
            list_bg: 'var(--gem-sys-color--surface-container)',
            list_border: 'var(--gem-sys-color--outline)',
            hover_outline: 'var(--gem-sys-color--outline)',
            current_outline: 'var(--gem-sys-color--primary)',
        },
        CSS_IMPORTANT_FLAG: ' !important',
        COLLAPSIBLE_CSS: `
            model-response.${APPID}-collapsible {
                position: relative;
            }
            /* Create a transparent hover area above the button */
            model-response.${APPID}-collapsible::before {
                content: '';
                position: absolute;
                top: -24px;
                left: 0;
                width: 144px;
                height: 24px;
            }
            /* Add a transparent border in the normal state to prevent width changes on collapse */
            .${APPID}-collapsible-content {
                border: 1px solid transparent;
                box-sizing: border-box;
                overflow: hidden;
                max-height: 999999px;
            }
            .${APPID}-collapsible-toggle-btn {
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
                background-color: var(--gem-sys-color--surface-container-high);
                color: var(--gem-sys-color--on-surface-variant);
                border: 1px solid var(--gem-sys-color--outline);
            }
            .${APPID}-collapsible-toggle-btn.${APPID}-hidden {
                display: none;
            }
            model-response.${APPID}-collapsible:hover .${APPID}-collapsible-toggle-btn {
                visibility: visible;
                opacity: 1;
                transition-delay: 0s;
            }
            .${APPID}-collapsible-toggle-btn:hover {
                background-color: var(--gem-sys-color--surface-container-higher);
                color: var(--gem-sys-color--on-surface);
            }
            .${APPID}-collapsible-toggle-btn svg {
                width: 100%;
                height: 100%;
                transition: transform 0.2s ease-in-out;
            }
            .${APPID}-collapsible.${APPID}-bubble-collapsed .${APPID}-collapsible-content {
                max-height: ${CONSTANTS.BUTTON_VISIBILITY_THRESHOLD_PX}px;
                border: 1px dashed var(--gem-sys-color--outline);
                box-sizing: border-box;
                overflow-y: auto;
            }
            .${APPID}-collapsible.${APPID}-bubble-collapsed .${APPID}-collapsible-toggle-btn svg {
                transform: rotate(-180deg);
            }
        `,
        BUBBLE_NAV_CSS: `
            .${APPID}-bubble-nav-container {
                position: absolute;
                top: 0;
                bottom: 0;
                width: 24px;
                z-index: ${CONSTANTS.Z_INDICES.BUBBLE_NAVIGATION};
            }
            .${APPID}-nav-buttons {
                position: relative;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                visibility: hidden;
                opacity: 0;
                transition: visibility 0s linear 0.1s, opacity 0.1s ease-in-out;
                pointer-events: auto;
                gap: 4px; /* Add gap between top and bottom groups when space is limited */
            }
            .${APPID}-bubble-parent-with-nav:hover .${APPID}-nav-buttons,
            .${APPID}-bubble-nav-container:hover .${APPID}-nav-buttons {
                visibility: visible;
                opacity: 1;
                transition-delay: 0s;
            }
            /* Default for assistant text turns */
            ${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} .${APPID}-bubble-nav-container {
                left: -25px;
            }
            /* Override for assistant image turns where the anchor is the image container */
            ${CONSTANTS.SELECTORS.RAW_ASSISTANT_IMAGE_BUBBLE} > .${APPID}-bubble-nav-container {
                left: 0;
                transform: translateX(calc(-100% - 4px));
            }
            ${CONSTANTS.SELECTORS.USER_MESSAGE} .${APPID}-bubble-nav-container {
                right: -25px;
            }
            .${APPID}-nav-group-top, .${APPID}-nav-group-bottom {
                position: relative; /* Changed from absolute */
                display: flex;
                flex-direction: column;
                gap: 4px;
                width: 100%; /* Ensure groups take full width of the flex container */
            }
            .${APPID}-nav-group-bottom {
                margin-top: auto; /* Push to the bottom if space is available */
            }
            .${APPID}-nav-group-top.${APPID}-hidden, .${APPID}-nav-group-bottom.${APPID}-hidden {
                display: none !important;
            }
            .${APPID}-bubble-nav-btn {
                width: 20px;
                height: 20px;
                padding: 2px;
                border-radius: 5px;
                box-sizing: border-box;
                cursor: pointer;
                background-color: var(--gem-sys-color--surface-container-high);
                color: var(--gem-sys-color--on-surface-variant);
                border: 1px solid var(--gem-sys-color--outline);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s ease-in-out;
                margin: 0 auto; /* Center the buttons within the group */
            }
            .${APPID}-bubble-nav-btn:hover {
                background-color: var(--gem-sys-color--surface-container-higher);
                color: var(--gem-sys-color--on-surface);
            }
            .${APPID}-bubble-nav-btn:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }
            .${APPID}-bubble-nav-btn svg {
                width: 100%;
                height: 100%;
            }
        `,
    };

    // ---- Validation Rules ----
    const THEME_VALIDATION_RULES = {
        bubbleBorderRadius: { unit: 'px', min: 0, max: 50, nullable: true },
        bubbleMaxWidth: { unit: '%', min: 30, max: 100, nullable: true },
    };

    /** @type {AppConfig} */
    const DEFAULT_THEME_CONFIG = {
        options: {
            icon_size: CONSTANTS.ICON_SIZE,
            chat_content_max_width: CONSTANTS.SLIDER_CONFIGS.CHAT_WIDTH.DEFAULT,
            respect_avatar_space: true,
        },
        features: {
            collapsible_button: {
                enabled: true,
            },
            sequential_nav_buttons: {
                enabled: true,
            },
            scroll_to_top_button: {
                enabled: true,
            },
            fixed_nav_console: {
                enabled: true,
            },
            load_full_history_on_chat_load: {
                enabled: true,
            },
        },
        developer: {
            logger_level: 'log', // 'error', 'warn', 'info', 'log', 'debug'
        },
        themeSets: [
            {
                metadata: {
                    id: `${APPID}-theme-example-1`,
                    name: 'Project Example',
                    matchPatterns: ['/project1/i'],
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
        defaultSet: {
            assistant: {
                name: `${ASSISTANT_NAME}`,
                icon: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#e3e3e3"><g><rect fill="none" height="24" width="24"/></g><g><g><path d="M19.94,9.06C19.5,5.73,16.57,3,13,3C9.47,3,6.57,5.61,6.08,9l-1.93,3.48C3.74,13.14,4.22,14,5,14h1l0,2c0,1.1,0.9,2,2,2h1 v3h7l0-4.68C18.62,15.07,20.35,12.24,19.94,9.06z M14.89,14.63L14,15.05V19h-3v-3H8v-4H6.7l1.33-2.33C8.21,7.06,10.35,5,13,5 c2.76,0,5,2.24,5,5C18,12.09,16.71,13.88,14.89,14.63z"/><path d="M12.5,12.54c-0.41,0-0.74,0.31-0.74,0.73c0,0.41,0.33,0.74,0.74,0.74c0.42,0,0.73-0.33,0.73-0.74 C13.23,12.85,12.92,12.54,12.5,12.54z"/><path d="M12.5,7c-1.03,0-1.74,0.67-2,1.45l0.96,0.4c0.13-0.39,0.43-0.86,1.05-0.86c0.95,0,1.13,0.89,0.8,1.36 c-0.32,0.45-0.86,0.75-1.14,1.26c-0.23,0.4-0.18,0.87-0.18,1.16h1.06c0-0.55,0.04-0.65,0.13-0.82c0.23-0.42,0.65-0.62,1.09-1.27 c0.4-0.59,0.25-1.38-0.01-1.8C13.95,7.39,13.36,7,12.5,7z"/></g></g></svg>',
                textColor: null,
                font: null,
                bubbleBackgroundColor: null,
                bubblePadding: '6px 10px',
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
                bubblePadding: '6px 10px',
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
    };

    // =================================================================================
    // SECTION: Platform-Specific Adapter
    // Description: Centralizes all platform-specific logic, such as selectors and
    //              DOM manipulation strategies. This isolates platform differences
    //              from the core application logic.
    // =================================================================================

    const PlatformAdapters = {
        // =================================================================================
        // SECTION: General Adapters
        // =================================================================================
        General: {
            /**
             * Checks if the Canvas feature is currently active on the page.
             * @returns {boolean} True if Canvas mode is detected, otherwise false.
             */
            isCanvasModeActive() {
                return !!document.querySelector(CONSTANTS.SELECTORS.CANVAS_CONTAINER);
            },

            /**
             * Checks if the current page URL is on the exclusion list for this platform.
             * @returns {boolean} True if the page should be excluded, otherwise false.
             */
            isExcludedPage() {
                // No excluded pages for this platform.
                return false;
            },

            /**
             * Checks if the File Panel feature is currently active on the page.
             * @returns {boolean} True if File Panel mode is detected, otherwise false.
             */
            isFilePanelActive() {
                return !!document.querySelector(CONSTANTS.SELECTORS.FILE_PANEL_CONTAINER);
            },

            /**
             * Gets the platform-specific role identifier from a message element.
             * @param {Element} messageElement The message element.
             * @returns {string | null} The platform's role identifier (e.g., 'user', 'user-query').
             */
            getMessageRole(messageElement) {
                if (!messageElement) return null;
                return messageElement.tagName.toLowerCase();
            },

            /**
             * Gets the current chat title in a platform-specific way.
             * @returns {string | null}
             */
            getChatTitle() {
                // GGGUX gets the title from a specific DOM element.
                return document.querySelector('[data-test-id="conversation"].selected')?.querySelector('.conversation-title')?.textContent.trim() ?? null;
            },

            /**
             * Gets the platform-specific display text from a message element for the jump list.
             * This method centralizes the logic for extracting the most relevant text,
             * bypassing irrelevant content like system messages or UI elements within the message container.
             * @param {HTMLElement} messageElement The message element.
             * @returns {string} The text content to be displayed in the jump list.
             */
            getJumpListDisplayText(messageElement) {
                const role = this.getMessageRole(messageElement);
                let contentEl;

                if (role === CONSTANTS.SELECTORS.ASSISTANT_MESSAGE) {
                    // Gemini has a more specific structure for assistant messages we can target first
                    const answerContainer = messageElement.querySelector(CONSTANTS.SELECTORS.ASSISTANT_ANSWER_CONTENT);
                    contentEl = answerContainer?.querySelector(CONSTANTS.SELECTORS.ASSISTANT_TEXT_CONTENT);
                    // Fallback to the general assistant content selector if the specific one isn't found
                    if (!contentEl) {
                        contentEl = messageElement.querySelector(CONSTANTS.SELECTORS.ASSISTANT_TEXT_CONTENT);
                    }
                } else if (role === CONSTANTS.SELECTORS.USER_MESSAGE) {
                    contentEl = messageElement.querySelector(CONSTANTS.SELECTORS.USER_TEXT_CONTENT);
                }

                return contentEl?.textContent || '';
            },

            /**
             * @description Finds the root message container element for a given content element within it.
             * @param {Element} contentElement The element inside a message bubble (e.g., the text content or an image).
             * @returns {HTMLElement | null} The closest parent message container element (e.g., `user-query`, `div[data-message-author-role="user"]`), or `null` if not found.
             */
            findMessageElement(contentElement) {
                return contentElement.closest(CONSTANTS.SELECTORS.BUBBLE_FEATURE_MESSAGE_CONTAINERS);
            },

            /**
             * Filters out ghost/empty message containers before they are added to the cache.
             * @param {Element} messageElement The message element to check.
             * @returns {boolean} Returns `false` to exclude the message, `true` to keep it.
             */
            filterMessage(messageElement) {
                // This issue does not occur on Gemini, so we always keep the message.
                return true;
            },

            /**
             * Placeholder for ensuring a message container exists for an image.
             * On Gemini, images are already within message containers, so this is a no-op.
             * @param {HTMLElement} imageContentElement The image container element.
             * @returns {null} Always returns null as no action is needed.
             */
            ensureMessageContainerForImage(imageContentElement) {
                // Not needed for Gemini, images are structured within model-response.
                return null;
            },

            /**
             * @description Sets up platform-specific Sentinel listeners to detect when new message content elements are added to the DOM.
             * @param {(element: HTMLElement) => void} callback The function to be called when a new message content element is detected by Sentinel.
             */
            initializeSentinel(callback) {
                const userBubbleSelector = `${CONSTANTS.SELECTORS.USER_MESSAGE} ${CONSTANTS.SELECTORS.RAW_USER_BUBBLE}`;
                const assistantBubbleSelector = `${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.RAW_ASSISTANT_BUBBLE}`;
                sentinel.on(userBubbleSelector, callback);
                sentinel.on(assistantBubbleSelector, callback);
            },

            /**
             * @description (Gemini) No-op. This platform does not require an initial scan for messages.
             * The method exists for architectural consistency.
             * @param {MessageLifecycleManager} lifecycleManager
             * @returns {number}
             */
            performInitialScan(lifecycleManager) {
                // No-op for this platform.
                return 0;
            },

            /**
             * @description (Gemini) No-op. This platform does not require special handling on navigation end.
             * The method exists for architectural consistency.
             * @param {MessageLifecycleManager} lifecycleManager
             */
            onNavigationEnd(lifecycleManager) {
                // No-op for this platform.
            },
        },

        // =================================================================================
        // SECTION: Adapters for class StyleManager
        // =================================================================================
        StyleManager: {
            /**
             * Returns the platform-specific static CSS that does not change with themes.
             * @returns {string} The static CSS string.
             */
            getStaticCss() {
                return `
                    ${CONSTANTS.SELECTORS.MAIN_APP_CONTAINER} {
                        transition: background-image 0.3s ease-in-out;
                    }
                    /* This rule is now conditional on a body class, which is toggled by applyChatContentMaxWidth. */
                    body.${APPID}-max-width-active ${CONSTANTS.SELECTORS.CHAT_CONTENT_MAX_WIDTH}{
                        max-width: var(--${APPID}-chat-content-max-width) !important;
                        margin-inline: auto !important;
                    }

                    /* Ensure the user message container inside the turn expands and aligns the bubble to the right. */
                    ${CONSTANTS.SELECTORS.CHAT_HISTORY_MAIN} ${CONSTANTS.SELECTORS.CONVERSATION_CONTAINER} ${CONSTANTS.SELECTORS.USER_MESSAGE} {
                        width: 100% !important;
                        max-width: none !important;
                        display: flex !important;
                        justify-content: flex-end !important;
                    }

                    /* Make content areas transparent to show the main background */
                    ${CONSTANTS.SELECTORS.CHAT_WINDOW},
                    ${CONSTANTS.SELECTORS.INPUT_CONTAINER},
                    ${CONSTANTS.SELECTORS.INPUT_AREA_BG_TARGET} {
                        background: none !important;
                    }

                    /* Forcefully hide the gradient pseudo-element on the input container */
                    ${CONSTANTS.SELECTORS.INPUT_CONTAINER}::before {
                        display: none !important;
                    }
                `;
            },
        },

        // =================================================================================
        // SECTION: Adapters for class ThemeManager
        // =================================================================================
        ThemeManager: {
            /**
             * Determines if the initial theme application should be deferred on this platform.
             * @param {ThemeManager} themeManager - The main controller instance.
             * @returns {boolean} True if theme application should be deferred.
             */
            shouldDeferInitialTheme(themeManager) {
                // This issue is specific to ChatGPT's title behavior, so Gemini never defers.
                return false;
            },

            /**
             * Selects the appropriate theme set based on platform-specific logic during an update check.
             * @param {ThemeManager} themeManager - The instance of the theme manager.
             * @param {AppConfig} config - The full application configuration.
             * @param {boolean} urlChanged - Whether the URL has changed since the last check.
             * @param {boolean} titleChanged - Whether the title has changed since the last check.
             * @returns {ThemeSet} The theme set that should be applied.
             */
            selectThemeForUpdate(themeManager, config, urlChanged, titleChanged) {
                // GGGUX-specific logic: If the URL changed but the title hasn't (yet),
                // apply the default theme as a fallback to prevent applying the previous chat's theme.
                if (urlChanged && !titleChanged) {
                    return { ...config.defaultSet, metadata: /** @type {{id: string, name: string, matchPatterns: string[]}} */ ({}) };
                }

                // Default logic
                return themeManager.getThemeSet();
            },

            /**
             * Returns platform-specific CSS overrides for the style definition generator.
             * @returns {object} An object containing CSS rule strings.
             */
            getStyleOverrides() {
                // The default block alignment is sufficient for Gemini.
                return {};
            },
        },

        // =================================================================================
        // SECTION: Adapters for class BubbleUIManager
        // =================================================================================
        BubbleUI: {
            /**
             * @description Gets the platform-specific parent element for attaching navigation buttons.
             * On Gemini, the positioning context differs between user and assistant messages due to the DOM structure.
             * For user messages, a specific inner container must be used as the anchor.
             * For assistant messages, the main message element itself is the correct anchor.
             * @param {HTMLElement} messageElement The message element.
             * @returns {HTMLElement | null} The parent element for the nav container.
             */
            getNavPositioningParent(messageElement) {
                const role = PlatformAdapters.General.getMessageRole(messageElement);

                if (role === CONSTANTS.SELECTORS.USER_MESSAGE) {
                    // For user messages, use the specific content container as the positioning context.
                    return messageElement.querySelector(CONSTANTS.SELECTORS.USER_QUERY_CONTAINER);
                } else {
                    // For model-response, the element itself remains the correct context.
                    return messageElement;
                }
            },

            /**
             * @description Retrieves the necessary DOM elements for applying the collapsible button feature to a message.
             * @description The returned object contains the elements needed to manage the collapsed state and position the toggle button correctly. The specific elements returned are platform-dependent.
             * @param {HTMLElement} messageElement The root element of the message to be processed.
             * @returns {{msgWrapper: HTMLElement, bubbleElement: HTMLElement, positioningParent: HTMLElement} | null} An object containing key elements for the feature, or `null` if the message is not eligible for the collapse feature on the current platform.
             */
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
            },

            /**
             * @description Determines if a message element is eligible for sequential navigation buttons (previous/next).
             * @description This method is designed for extensibility. Currently, it allows buttons on all messages.
             * @param {HTMLElement} messageElement The message element to check.
             * @returns {object | null} An empty object `{}` if the buttons should be rendered, or `null` to prevent rendering.
             */
            getSequentialNavInfo(messageElement) {
                return {};
            },

            /**
             * @description Determines if a message element is eligible for the "Scroll to Top" button.
             * @description This method is designed for extensibility. Currently, it allows buttons on all messages.
             * @param {HTMLElement} messageElement The message element to check.
             * @returns {object | null} An empty object `{}` if the buttons should be rendered, or `null` to prevent rendering.
             */
            getScrollToTopInfo(messageElement) {
                return {};
            },
        },

        // =================================================================================
        // SECTION: Adapters for class ThemeAutomator
        // =================================================================================
        ThemeAutomator: {
            /**
             * Initializes platform-specific managers and registers them with the main application controller.
             * @param {ThemeAutomator} automatorInstance - The main controller instance.
             */
            initializePlatformManagers(automatorInstance) {
                // =================================================================================
                // SECTION: Auto Scroll Manager
                // Description: Manages the auto-scrolling feature to load the entire chat history.
                // =================================================================================

                class AutoScrollManager {
                    static CONFIG = {
                        // The minimum number of messages required to trigger the auto-scroll feature.
                        MESSAGE_THRESHOLD: 20,
                        // The maximum time (in ms) to wait for the progress bar to appear after scrolling up.
                        APPEAR_TIMEOUT_MS: 2000,
                        // The maximum time (in ms) to wait for the progress bar to disappear after it has appeared.
                        DISAPPEAR_TIMEOUT_MS: 5000,
                    };

                    /**
                     * @param {ConfigManager} configManager
                     * @param {MessageCacheManager} messageCacheManager
                     */
                    constructor(configManager, messageCacheManager) {
                        this.configManager = configManager;
                        this.messageCacheManager = messageCacheManager;
                        this.scrollContainer = null;
                        this.observerContainer = null;
                        this.isEnabled = false;
                        this.isScrolling = false;
                        this.toastShown = false;
                        this.isInitialScrollCheckDone = false;
                        this.boundStop = null;
                        this.subscriptions = [];
                        this.PROGRESS_BAR_SELECTOR = 'mat-progress-bar[role="progressbar"]';
                        this.progressObserver = null;
                        this.appearTimeout = null;
                        this.disappearTimeout = null;
                    }

                    _subscribe(event, listener) {
                        const key = createEventKey(this, event);
                        EventBus.subscribe(event, listener, key);
                        this.subscriptions.push({ event, key });
                    }

                    init() {
                        this.isEnabled = this.configManager.get().features.load_full_history_on_chat_load.enabled;
                        this._subscribe(EVENTS.AUTO_SCROLL_REQUEST, () => this.start());
                        this._subscribe(EVENTS.AUTO_SCROLL_CANCEL_REQUEST, () => this.stop());
                        this._subscribe(EVENTS.CACHE_UPDATED, () => this._onCacheUpdated());
                        this._subscribe(EVENTS.NAVIGATION, () => this._onNavigation());
                        this._subscribe(EVENTS.APP_SHUTDOWN, () => this.destroy());
                    }

                    destroy() {
                        this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
                        this.subscriptions = [];
                        this.stop();
                    }

                    enable() {
                        this.isEnabled = true;
                    }

                    disable() {
                        this.isEnabled = false;
                        this.stop();
                    }

                    async start() {
                        if (this.isScrolling) return;

                        this.observerContainer = await waitForElement(CONSTANTS.SELECTORS.CHAT_WINDOW_CONTENT);
                        this.scrollContainer = this.observerContainer?.querySelector('[data-test-id="chat-history-container"]');

                        if (!this.observerContainer || !this.scrollContainer) {
                            Logger.warn('AutoScrollManager: Could not find required containers.');
                            this.stop();
                            return;
                        }

                        // Set the flag immediately to prevent re-entrancy from other events.
                        this.isScrolling = true;
                        Logger.log('AutoScrollManager: Starting auto-scroll with MutationObserver.');
                        this.toastShown = false;

                        EventBus.publish(EVENTS.SUSPEND_OBSERVERS);

                        this.boundStop = () => this.stop();
                        this.scrollContainer.addEventListener('wheel', this.boundStop, { passive: true, once: true });
                        this.scrollContainer.addEventListener('touchmove', this.boundStop, { passive: true, once: true });

                        this._startObserver();
                        this._triggerScroll();
                    }

                    stop(isNavigation = false) {
                        if (!this.isScrolling && !this.progressObserver) return; // Prevent multiple stops

                        Logger.log('AutoScrollManager: Stopping auto-scroll.');
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
                            Logger.debug('AutoScrollManager: Progress bar appeared.');
                            clearTimeout(this.appearTimeout); // Cancel the "end of history" timer
                            if (!this.toastShown) {
                                EventBus.publish(EVENTS.AUTO_SCROLL_START);
                                this.toastShown = true;
                            }
                            // Set a safety timeout in case loading gets stuck
                            this.disappearTimeout = setTimeout(() => {
                                Logger.warn('AutoScrollManager: Timed out waiting for progress bar to disappear. Stopping.');
                                this.stop();
                            }, AutoScrollManager.CONFIG.DISAPPEAR_TIMEOUT_MS);
                        }

                        if (progressBarDisappeared) {
                            Logger.debug('AutoScrollManager: Progress bar disappeared.');
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
                            Logger.log('AutoScrollManager: Progress bar did not appear. Assuming scroll is complete.');
                            this.stop();
                        }, AutoScrollManager.CONFIG.APPEAR_TIMEOUT_MS);
                    }

                    /**
                     * @private
                     * @description Handles the CACHE_UPDATED event to perform the initial scroll check.
                     */
                    _onCacheUpdated() {
                        if (!this.isEnabled || this.isInitialScrollCheckDone) {
                            return;
                        }
                        this.isInitialScrollCheckDone = true;

                        const messageCount = this.messageCacheManager.getTotalMessages().length;
                        if (messageCount >= AutoScrollManager.CONFIG.MESSAGE_THRESHOLD) {
                            Logger.log(`AutoScrollManager: ${messageCount} messages found. Triggering auto-scroll.`);
                            EventBus.publish(EVENTS.AUTO_SCROLL_REQUEST);
                        } else {
                            Logger.log(`AutoScrollManager: ${messageCount} messages found. No scroll needed.`);
                        }
                    }

                    /**
                     * @private
                     * @description Handles the NAVIGATION event to reset the manager's state.
                     */
                    _onNavigation() {
                        if (this.isScrolling) {
                            // Stop scroll without triggering a UI refresh, as a new page is loading.
                            this.stop(true);
                        }
                        this.isInitialScrollCheckDone = false;
                    }
                }

                // =================================================================================
                // SECTION: Toast Manager
                // Description: Manages the display of temporary toast notifications.
                // =================================================================================

                class ToastManager {
                    constructor() {
                        this.toastElement = null;
                        this.subscriptions = [];
                    }

                    _subscribe(event, listener) {
                        const key = createEventKey(this, event);
                        EventBus.subscribe(event, listener, key);
                        this.subscriptions.push({ event, key });
                    }

                    init() {
                        this._injectStyles();
                        this._subscribe(EVENTS.AUTO_SCROLL_START, () => this.show('Auto-scrolling to load history...', true));
                        this._subscribe(EVENTS.AUTO_SCROLL_COMPLETE, () => this.hide());
                        this._subscribe(EVENTS.APP_SHUTDOWN, () => this.destroy());
                    }

                    destroy() {
                        this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
                        this.subscriptions = [];
                        this.hide();
                    }

                    _injectStyles() {
                        const styleId = `${APPID}-toast-style`;
                        if (document.getElementById(styleId)) return;

                        // Define custom warning styles for the toast
                        const warnStyles = {
                            bg: 'rgb(255 165 0 / 0.9)', // Orange background for warning
                            text: '#ffffff', // White text
                            border: '#ffa000', // Darker orange border
                            cancel_btn_bg: 'rgb(255 255 255 / 0.2)', // Semi-transparent white for button background
                            cancel_btn_text: '#ffffff', // White text for button
                        };

                        const style = h('style', {
                            id: styleId,
                            textContent: `
                                .${APPID}-toast-container {
                                    position: fixed; /* Changed to fixed for viewport relative positioning */
                                    top: 30%; /* Position from the top */
                                    left: 50%; /* Center horizontally */
                                    transform: translate(-50%, -50%); /* Adjust for exact centering */
                                    z-index: 10002; /* Higher z-index */
                                    background-color: ${warnStyles.bg};
                                    color: ${warnStyles.text};
                                    padding: 15px 25px; /* Slightly more padding */
                                    border-radius: 12px; /* More rounded corners */
                                    border: 1px solid ${warnStyles.border};
                                    box-shadow: 0 6px 20px rgb(0 0 0 / 0.2); /* Stronger shadow */
                                    display: flex;
                                    align-items: center;
                                    gap: 15px; /* Increased gap */
                                    font-size: 1.1em; /* Larger font */
                                    font-weight: bold; /* Bold text */
                                    opacity: 0;
                                    transition: opacity 0.4s ease, transform 0.4s ease; /* Smoother transition */
                                    pointer-events: none;
                                    white-space: nowrap; /* Prevent text wrapping */
                                }
                                .${APPID}-toast-container.is-visible {
                                    opacity: 1;
                                    transform: translate(-50%, 0); /* Move into view from adjusted vertical position */
                                    pointer-events: auto;
                                }
                                .${APPID}-toast-cancel-btn {
                                    background: ${warnStyles.cancel_btn_bg};
                                    color: ${warnStyles.cancel_btn_text};
                                    border: none;
                                    padding: 8px 15px; /* Larger button padding */
                                    margin-left: 10px; /* Adjusted margin */
                                    cursor: pointer;
                                    font-weight: bold;
                                    border-radius: 6px; /* Rounded button */
                                    transition: background-color 0.2s ease;
                                }
                                .${APPID}-toast-cancel-btn:hover {
                                    background-color: rgb(255 255 255 / 0.3); /* Lighter hover background */
                                }
                            `,
                        });
                        document.head.appendChild(style);
                    }

                    _renderToast(message, showCancelButton) {
                        const children = [h('span', message)];
                        if (showCancelButton) {
                            const cancelButton = h(
                                'button',
                                {
                                    className: `${APPID}-toast-cancel-btn`,
                                    title: 'Stop auto-scrolling',
                                    onclick: () => EventBus.publish(EVENTS.AUTO_SCROLL_CANCEL_REQUEST),
                                },
                                'Cancel'
                            );
                            children.push(cancelButton);
                        }
                        return h(`div.${APPID}-toast-container`, children);
                    }

                    show(message, showCancelButton = false) {
                        // Remove existing toast if any
                        if (this.toastElement) {
                            this.hide();
                        }

                        this.toastElement = this._renderToast(message, showCancelButton);
                        document.body.appendChild(this.toastElement);

                        // Trigger the transition
                        setTimeout(() => {
                            this.toastElement?.classList.add('is-visible');
                        }, 10);
                    }

                    hide() {
                        if (!this.toastElement) return;

                        const el = this.toastElement;
                        el.classList.remove('is-visible');

                        // Remove from DOM after transition ends
                        setTimeout(() => {
                            el.remove();
                        }, 300);

                        this.toastElement = null;
                    }
                }

                automatorInstance.autoScrollManager = new AutoScrollManager(automatorInstance.configManager, automatorInstance.messageCacheManager);
                automatorInstance.autoScrollManager.init();

                automatorInstance.toastManager = new ToastManager();
                automatorInstance.toastManager.init();
            },

            /**
             * Applies UI updates specific to the platform after a configuration change.
             * @param {ThemeAutomator} automatorInstance - The main controller instance.
             * @param {object} newConfig - The newly applied configuration object.
             */
            applyPlatformSpecificUiUpdates(automatorInstance, newConfig) {
                // Enable or disable the auto-scroll manager based on the new config.
                if (newConfig.features.load_full_history_on_chat_load.enabled) {
                    automatorInstance.autoScrollManager?.enable();
                } else {
                    automatorInstance.autoScrollManager?.disable();
                }
            },
        },

        // =================================================================================
        // SECTION: Adapters for class SettingsPanelComponent
        // =================================================================================
        SettingsPanel: {
            /**
             * Returns an array of UI definitions for platform-specific feature toggles in the settings panel.
             * @returns {object[]} An array of definition objects.
             */
            getPlatformSpecificFeatureToggles() {
                return [
                    {
                        id: 'load-history-enabled',
                        configKey: 'features.load_full_history_on_chat_load.enabled',
                        label: 'Load full history on chat load',
                        title: 'When enabled, automatically scrolls back through the history when a chat is opened to load all messages.',
                    },
                ];
            },
        },

        // =================================================================================
        // SECTION: Adapters for class AvatarManager
        // =================================================================================
        Avatar: {
            /**
             * Returns the platform-specific CSS for styling avatars.
             * @param {string} iconSizeCssVar - The CSS variable name for icon size.
             * @param {string} iconMarginCssVar - The CSS variable name for icon margin.
             * @returns {string} The CSS string.
             */
            getCss(iconSizeCssVar, iconMarginCssVar) {
                return `
                    /* Set message containers as positioning contexts */
                    ${CONSTANTS.SELECTORS.AVATAR_USER},
                    ${CONSTANTS.SELECTORS.AVATAR_ASSISTANT} {
                        position: relative !important;
                        overflow: visible !important;
                    }

                    /* Performance: Ensure the wrapper is tall enough for the avatar + name without JS calculation. */
                    ${CONSTANTS.SELECTORS.AVATAR_USER},
                    ${CONSTANTS.SELECTORS.AVATAR_ASSISTANT} {
                        min-height: calc(var(${iconSizeCssVar}) + 3em);
                    }

                    ${CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER} {
                        position: absolute;
                        top: 0;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        width: var(${iconSizeCssVar});
                        pointer-events: none;
                        white-space: normal;
                        word-break: break-word;
                    }
                    /* Position Assistant avatar (inside model-response) to the LEFT */
                    ${CONSTANTS.SELECTORS.AVATAR_ASSISTANT} ${CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER} {
                        right: 100%;
                        margin-right: var(${iconMarginCssVar});
                    }
                    /* Position User avatar (inside user-query) to the RIGHT */
                    ${CONSTANTS.SELECTORS.AVATAR_USER} ${CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER} {
                        left: 100%;
                        margin-left: var(${iconMarginCssVar});
                    }
                    ${CONSTANTS.SELECTORS.SIDE_AVATAR_ICON} {
                        width: var(${iconSizeCssVar});
                        height: var(${iconSizeCssVar});
                        border-radius: 50%;
                        display: block;
                        box-shadow: 0 0 6px rgb(0 0 0 / 0.2);
                        background-size: cover;
                        background-position: center;
                        background-repeat: no-repeat;
                        transition: background-image 0.3s ease-in-out;
                    }
                    ${CONSTANTS.SELECTORS.SIDE_AVATAR_NAME} {
                        font-size: 0.75rem;
                        text-align: center;
                        margin-top: 4px;
                        width: 100%;
                        background-color: rgb(0 0 0 / 0.2);
                        padding: 2px 6px;
                        border-radius: 4px;
                        box-sizing: border-box;
                    }
                    ${CONSTANTS.SELECTORS.AVATAR_USER} ${CONSTANTS.SELECTORS.SIDE_AVATAR_ICON} {
                        background-image: var(--${APPID}-user-icon);
                    }
                    ${CONSTANTS.SELECTORS.AVATAR_USER} ${CONSTANTS.SELECTORS.SIDE_AVATAR_NAME} {
                        color: var(--${APPID}-user-textColor);
                    }
                    ${CONSTANTS.SELECTORS.AVATAR_USER} ${CONSTANTS.SELECTORS.SIDE_AVATAR_NAME}::after {
                        content: var(--${APPID}-user-name);
                    }
                    ${CONSTANTS.SELECTORS.AVATAR_ASSISTANT} ${CONSTANTS.SELECTORS.SIDE_AVATAR_ICON} {
                        background-image: var(--${APPID}-assistant-icon);
                    }
                    ${CONSTANTS.SELECTORS.AVATAR_ASSISTANT} ${CONSTANTS.SELECTORS.SIDE_AVATAR_NAME} {
                        color: var(--${APPID}-assistant-textColor);
                    }
                    ${CONSTANTS.SELECTORS.AVATAR_ASSISTANT} ${CONSTANTS.SELECTORS.SIDE_AVATAR_NAME}::after {
                        content: var(--${APPID}-assistant-name);
                    }

                    /* Gemini Only: force user message and avatar to be top-aligned */
                    ${CONSTANTS.SELECTORS.AVATAR_USER} {
                        align-items: flex-start !important;
                    }
                    ${CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER} {
                        align-self: flex-start !important;
                    }
                `;
            },

            /**
             * Injects the avatar UI into the appropriate location within a message element.
             * @param {HTMLElement} msgElem - The root message element.
             * @param {HTMLElement} avatarContainer - The avatar container element to inject.
             */
            addAvatarToMessage(msgElem, avatarContainer) {
                // The guard should only check for the existence of the avatar container itself.
                if (msgElem.querySelector(CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER)) return;

                const processedClass = `${APPID}-avatar-processed`;

                // Add the container to the message element and mark as processed.
                msgElem.prepend(avatarContainer);
                // Add the processed class only if it's not already there.
                if (!msgElem.classList.contains(processedClass)) {
                    msgElem.classList.add(processedClass);
                }
            },
        },

        // =================================================================================
        // SECTION: Adapters for class StandingImageManager
        // =================================================================================
        StandingImage: {
            /**
             * Recalculates and applies the layout for standing images.
             * @param {StandingImageManager} instance - The instance of the StandingImageManager.
             */
            async recalculateLayout(instance) {
                // Handle early exits that don't require measurement.
                if (PlatformAdapters.General.isCanvasModeActive() || PlatformAdapters.General.isFilePanelActive()) {
                    const rootStyle = document.documentElement.style;
                    rootStyle.setProperty(`--${APPID}-standing-image-assistant-width`, '0px');
                    rootStyle.setProperty(`--${APPID}-standing-image-user-width`, '0px');
                    return;
                }

                await withLayoutCycle({
                    measure: () => {
                        // --- Read Phase ---
                        const chatArea = document.querySelector(CONSTANTS.SELECTORS.MAIN_APP_CONTAINER);
                        const messageArea = document.querySelector(CONSTANTS.SELECTORS.CONVERSATION_CONTAINER);
                        if (!chatArea || !messageArea) return null; // Signal to mutate to reset styles.

                        const assistantImg = document.getElementById(`${APPID}-standing-image-assistant`);
                        const userImg = document.getElementById(`${APPID}-standing-image-user`);

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
                        const rootStyle = document.documentElement.style;

                        if (!measured) {
                            rootStyle.setProperty(`--${APPID}-standing-image-assistant-width`, '0px');
                            rootStyle.setProperty(`--${APPID}-standing-image-user-width`, '0px');
                            return;
                        }

                        const { chatRect, messageRect, windowHeight, assistantImgHeight, userImgHeight } = measured;

                        // Config values can be read here as they don't cause reflow.
                        const config = instance.configManager.get();
                        const iconSize = instance.configManager.getIconSize();
                        const respectAvatarSpace = config.options.respect_avatar_space;
                        const avatarGap = respectAvatarSpace ? iconSize + CONSTANTS.ICON_MARGIN * 2 : 0;

                        const assistantWidth = Math.max(0, messageRect.left - chatRect.left - avatarGap);
                        const userWidth = Math.max(0, chatRect.right - messageRect.right - avatarGap);

                        rootStyle.setProperty(`--${APPID}-standing-image-assistant-left`, `${chatRect.left}px`);
                        rootStyle.setProperty(`--${APPID}-standing-image-assistant-width`, `${assistantWidth}px`);
                        rootStyle.setProperty(`--${APPID}-standing-image-user-width`, `${userWidth}px`);

                        // Masking
                        const maskValue = `linear-gradient(to bottom, transparent 0px, rgb(0 0 0 / 1) 60px, rgb(0 0 0 / 1) 100%)`;
                        if (assistantImgHeight >= windowHeight - 32) {
                            rootStyle.setProperty(`--${APPID}-standing-image-assistant-mask`, maskValue);
                        } else {
                            rootStyle.setProperty(`--${APPID}-standing-image-assistant-mask`, 'none');
                        }

                        if (userImgHeight >= windowHeight - 32) {
                            rootStyle.setProperty(`--${APPID}-standing-image-user-mask`, maskValue);
                        } else {
                            rootStyle.setProperty(`--${APPID}-standing-image-user-mask`, 'none');
                        }
                    },
                });
            },

            /**
             * Updates the visibility of standing images based on the current context.
             * @param {StandingImageManager} instance - The instance of the StandingImageManager.
             */
            updateVisibility(instance) {
                const isActiveChat = !!document.querySelector('[data-test-id="conversation"].selected');
                const hasMessages = instance.messageCacheManager.getTotalMessages().length > 0;
                const shouldShowActors = isActiveChat && hasMessages;
                const isCanvasActive = PlatformAdapters.General.isCanvasModeActive();
                const isFilePanelActive = PlatformAdapters.General.isFilePanelActive();

                ['user', 'assistant'].forEach((actor) => {
                    const imgElement = document.getElementById(`${APPID}-standing-image-${actor}`);
                    if (!imgElement) return;

                    const hasImage = !!document.documentElement.style.getPropertyValue(`--${APPID}-${actor}-standing-image`);

                    // Combine all visibility checks
                    imgElement.style.opacity = shouldShowActors && hasImage && !isCanvasActive && !isFilePanelActive ? '1' : '0';
                });
            },

            /**
             * Sets up platform-specific event listeners for the StandingImageManager.
             * @param {StandingImageManager} instance - The instance of the StandingImageManager.
             */
            setupEventListeners(instance) {
                // Gemini-specific: Subscribe to cacheUpdated because this platform's updateVisibility() logic depends on the message count.
                // This ensures standing images reappear correctly when navigating from a new chat to an existing one.
                instance._subscribe(EVENTS.CACHE_UPDATED, () => instance.updateVisibility());
            },
        },

        // =================================================================================
        // SECTION: Adapters for class DebugManager
        // =================================================================================
        Debug: {
            /**
             * Returns the platform-specific CSS for debugging layout borders.
             * @returns {string} The CSS string.
             */
            getBordersCss() {
                const userFrameSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="1" y="1" width="98" height="98" fill="rgb(231 76 60 / 0.1)" stroke="rgb(231 76 60 / 0.9)" stroke-width="2" /></svg>`;
                const asstFrameSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="1" y="1" width="98" height="98" fill="rgb(52 152 219 / 0.1)" stroke="rgb(52 152 219 / 0.9)" stroke-width="2" /></svg>`;
                const userFrameDataUri = svgToDataUrl(userFrameSvg);
                const asstFrameDataUri = svgToDataUrl(asstFrameSvg);
                return `
                        /* --- DEBUG BORDERS --- */
                        :root {
                            --dbg-layout-color: rgb(26 188 156 / 0.8); /* Greenish */
                            --dbg-user-color: rgb(231 76 60 / 0.8); /* Reddish */
                            --dbg-asst-color: rgb(52 152 219 / 0.8); /* Blueish */
                            --dbg-comp-color: rgb(22 160 133 / 0.8); /* Cyan */
                            --dbg-zone-color: rgb(142 68 173 / 0.9); /* Purplish */
                            --dbg-neutral-color: rgb(128 128 128 / 0.7); /* Gray */
                        }

                        /* Layout Containers */
                        ${CONSTANTS.SELECTORS.SIDEBAR_WIDTH_TARGET} { outline: 2px solid var(--dbg-layout-color) !important; }
                        ${CONSTANTS.SELECTORS.CHAT_CONTENT_MAX_WIDTH} { outline: 2px dashed var(--dbg-layout-color) !important; }
                        ${CONSTANTS.SELECTORS.INPUT_AREA_BG_TARGET} { outline: 1px solid var(--dbg-layout-color) !important; }
                        #${APPID}-nav-console { outline: 1px dotted var(--dbg-layout-color) !important; }

                        /* Message Containers */
                        ${CONSTANTS.SELECTORS.DEBUG_CONTAINER_TURN} { outline: 1px solid var(--dbg-neutral-color) !important; outline-offset: -1px; }
                        ${CONSTANTS.SELECTORS.DEBUG_CONTAINER_USER} { outline: 2px solid var(--dbg-user-color) !important; outline-offset: -2px; }
                        ${CONSTANTS.SELECTORS.RAW_USER_BUBBLE} { outline: 1px dashed var(--dbg-user-color) !important; outline-offset: -4px; }
                        ${CONSTANTS.SELECTORS.DEBUG_CONTAINER_ASSISTANT} { outline: 2px solid var(--dbg-asst-color) !important; outline-offset: -2px; }
                        ${CONSTANTS.SELECTORS.RAW_ASSISTANT_BUBBLE} { outline: 1px dashed var(--dbg-asst-color) !important; outline-offset: -4px; }

                        /* Components */
                        ${CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER} { outline: 1px solid var(--dbg-comp-color) !important; }
                        ${CONSTANTS.SELECTORS.SIDE_AVATAR_ICON} { outline: 1px dotted var(--dbg-comp-color) !important; }
                        ${CONSTANTS.SELECTORS.SIDE_AVATAR_NAME} { outline: 1px dotted var(--dbg-comp-color) !important; }

                        /* Standing Image Debug Overrides */
                        #${APPID}-standing-image-user {
                            background-image: url("${userFrameDataUri}") !important;
                            z-index: 15000 !important;
                            opacity: 0.7 !important;
                            min-width: 30px !important;
                        }
                        #${APPID}-standing-image-assistant {
                            background-image: url("${asstFrameDataUri}") !important;
                            z-index: 15000 !important;
                            opacity: 0.7 !important;
                            min-width: 30px !important;
                        }

                        /* Interactive Zones */
                        model-response.${APPID}-collapsible::before {
                            outline: 1px solid var(--dbg-zone-color) !important;
                            content: 'HOVER AREA' !important;
                            color: var(--dbg-zone-color);
                            font-size: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .${APPID}-bubble-nav-container { outline: 1px dashed var(--dbg-zone-color) !important; }
                    `;
            },
        },

        // =================================================================================
        // SECTION: Adapters for class ObserverManager
        // =================================================================================
        Observer: {
            /**
             * Returns an array of functions that start platform-specific observers.
             * Each function, when called, should return a cleanup function to stop its observer.
             * @returns {Array<Function>} An array of observer starter functions.
             */
            getPlatformObserverStarters() {
                return [this.startSidebarObserver, this.startPanelObserver];
            },

            /**
             * @private
             * @description Starts a stateful observer to detect the appearance and disappearance of panels (Immersive/File) using a high-performance hybrid approach.
             * @param {object} dependencies The dependencies passed from ObserverManager (unused in this platform).
             * @returns {Promise<() => void>} A promise that resolves with a cleanup function.
             */
            async startPanelObserver(dependencies) {
                let isPanelVisible = false;
                let isStateUpdating = false; // Lock to prevent race conditions
                let disappearanceObserver = null;
                let repositionTimeoutId = null;

                const panelSelector = `${CONSTANTS.SELECTORS.CANVAS_CONTAINER}, ${CONSTANTS.SELECTORS.FILE_PANEL_CONTAINER}`;

                // This is the single source of truth for updating the UI based on panel visibility.
                const updatePanelState = async () => {
                    if (isStateUpdating) return; // Prevent concurrent executions
                    isStateUpdating = true;

                    try {
                        const panel = document.querySelector(panelSelector);
                        const isNowVisible = !!panel;

                        // Do nothing if the state hasn't changed. This prevents event loops.
                        if (isNowVisible === isPanelVisible) {
                            return;
                        }

                        isPanelVisible = isNowVisible;
                        clearTimeout(repositionTimeoutId);

                        if (isNowVisible) {
                            // --- Panel just appeared ---
                            Logger.debug('[Stateful Observer] Panel appeared:', panel.tagName);
                            const chatWindow = await waitForElement(CONSTANTS.SELECTORS.CHAT_WINDOW);
                            if (!chatWindow) return;

                            // Setup a lightweight observer to detect when the panel is removed.
                            disappearanceObserver = new MutationObserver(() => {
                                // Re-check state if the parent container's children change.
                                updatePanelState();
                            });
                            disappearanceObserver.observe(chatWindow, { childList: true, subtree: false });
                        } else {
                            // --- Panel just disappeared ---
                            Logger.debug('[Stateful Observer] Panel disappeared.');
                            disappearanceObserver?.disconnect();
                            disappearanceObserver = null;
                        }

                        // Publish events after state change.
                        EventBus.publish(EVENTS.VISIBILITY_RECHECK);
                        repositionTimeoutId = setTimeout(() => {
                            EventBus.publish(EVENTS.UI_REPOSITION);
                        }, CONSTANTS.TIMING.TIMEOUTS.PANEL_TRANSITION_DURATION);
                    } finally {
                        isStateUpdating = false; // Release the lock
                    }
                };

                // Use Sentinel to efficiently detect when a panel might have been added.
                sentinel.on(panelSelector, updatePanelState);

                // Perform an initial check in case a panel is already present on load.
                updatePanelState();

                // Return the cleanup function for all resources created by this observer.
                return () => {
                    sentinel.off(panelSelector, updatePanelState);
                    disappearanceObserver?.disconnect();
                };
            },

            /**
             * @param {{themeManager: ThemeManager}} dependencies The required properties from ObserverManager.
             * @private
             * @description Sets up the monitoring for title changes.
             */
            startGlobalTitleObserver(dependencies) {
                // Not required for Gemini at the moment but reserved
            },

            /**
             * @param {object} dependencies The dependencies passed from ObserverManager (unused in this method).
             * @private
             * @description Sets up a targeted observer on the sidebar for title and selection changes.
             * @returns {Promise<(() => void) | null>} A promise that resolves with a cleanup function, or null if setup fails.
             */
            async startSidebarObserver(dependencies) {
                const sidebar = await waitForElement(CONSTANTS.SELECTORS.SIDEBAR_WIDTH_TARGET);
                if (!sidebar) {
                    Logger.warn('Sidebar element not found for targeted observation.');
                    return null;
                }

                const debouncedTitleUpdate = debounce(() => EventBus.publish(EVENTS.TITLE_CHANGED), CONSTANTS.TIMING.DEBOUNCE_DELAYS.THEME_UPDATE);
                const debouncedSidebarLayoutChanged = debounce(() => EventBus.publish(EVENTS.SIDEBAR_LAYOUT_CHANGED), CONSTANTS.TIMING.DEBOUNCE_DELAYS.LAYOUT_RECALCULATION);

                const handleTransitionEnd = () => debouncedSidebarLayoutChanged();
                sidebar.addEventListener('transitionend', handleTransitionEnd);

                const renameObserver = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        if (mutation.type === 'characterData' && mutation.target.parentElement?.matches('.conversation-title')) {
                            debouncedTitleUpdate();
                            return;
                        }
                    }
                });
                renameObserver.observe(sidebar, {
                    characterData: true,
                    subtree: true,
                    attributes: false,
                    childList: false,
                });

                // Initial triggers for the first load.
                debouncedTitleUpdate();
                debouncedSidebarLayoutChanged();

                // Return the cleanup function for all resources created by this observer.
                return () => {
                    sidebar.removeEventListener('transitionend', handleTransitionEnd);
                    renameObserver.disconnect();
                };
            },

            /**
             * Checks if a conversation turn is complete based on Gemini's DOM structure.
             * @param {HTMLElement} turnNode The turn container element.
             * @returns {boolean} True if the turn is complete.
             */
            isTurnComplete(turnNode) {
                // In Gemini, a single turn container can include the user message.
                // Therefore, a turn is considered complete *only* when the assistant's
                // action buttons are present, regardless of whether a user message exists.
                const assistantActions = turnNode.querySelector(CONSTANTS.SELECTORS.TURN_COMPLETE_SELECTOR);
                return !!assistantActions;
            },
        },

        // =================================================================================
        // SECTION: Adapters for class UIManager
        // =================================================================================
        UIManager: {
            repositionSettingsButton(settingsButton) {
                // This method is a no-op for Gemini, as dynamic repositioning is not needed.
                // It exists to make the UIManager class identical across platforms.
                return;
            },
        },

        // =================================================================================
        // SECTION: Adapters for class FixedNavigationManager
        // =================================================================================
        FixedNav: {
            /**
             * @description (Gemini) A lifecycle hook for `FixedNavigationManager` to handle UI state changes after new messages are loaded via infinite scrolling.
             * @description When the user scrolls to the top and older messages are loaded into the DOM, this function ensures that the navigation indices (`currentIndices`) are recalculated relative to the newly expanded message list, preventing the highlighted message from "losing its place".
             * @param {FixedNavigationManager} fixedNavManagerInstance The instance of the `FixedNavigationManager`.
             * @param {HTMLElement | null} highlightedMessage The currently highlighted message element.
             * @param {number} previousTotalMessages The total number of messages before the cache update.
             * @returns {void}
             */
            handleInfiniteScroll(fixedNavManagerInstance, highlightedMessage, previousTotalMessages) {
                const currentTotalMessages = fixedNavManagerInstance.messageCacheManager.getTotalMessages().length;

                // If new messages have been loaded (scrolled up), and a message is currently highlighted.
                if (currentTotalMessages > previousTotalMessages && highlightedMessage) {
                    // Re-calculate the indices based on the updated (larger) message cache.
                    fixedNavManagerInstance.setHighlightAndIndices(highlightedMessage);
                }
            },

            /**
             * Applies additional, platform-specific highlight classes if needed.
             * @param {HTMLElement} messageElement The currently highlighted message element.
             */
            applyAdditionalHighlight(messageElement) {
                // No additional logic is needed for Gemini.
            },

            /**
             * @description Returns an array of platform-specific UI elements, such as buttons and separators,
             * to be added to the left side of the navigation console.
             * @param {FixedNavigationManager} fixedNavManagerInstance The instance of the FixedNavigationManager.
             * @returns {Element[]} An array of `Element` objects. Returns an empty array
             * if no platform-specific buttons are needed for the current platform.
             */
            getPlatformSpecificButtons(fixedNavManagerInstance) {
                const autoscrollBtn = h(
                    `button#${APPID}-autoscroll-btn.${APPID}-nav-btn`,
                    {
                        title: 'Load full chat history',
                        onclick: () => EventBus.publish(EVENTS.AUTO_SCROLL_REQUEST),
                    },
                    [createIconFromDef(SITE_STYLES.ICONS.scrollToTop)]
                );

                return [autoscrollBtn, h(`div.${APPID}-nav-separator`)];
            },
        },
    };

    // =================================================================================
    // SECTION: Declarative Style Mapper
    // Description: Single source of truth for all theme-driven style generation.
    // This array declaratively maps configuration properties to CSS variables and rules.
    // The StyleGenerator engine processes this array to build the final CSS.
    // =================================================================================

    /**
     * @param {string} actor - 'user' or 'assistant'
     * @param {object} [overrides={}] - Platform-specific overrides.
     * @returns {object[]} An array of style definition objects for the given actor.
     */
    function createActorStyleDefinitions(actor, overrides = {}) {
        const actorUpper = actor.toUpperCase();
        const important = SITE_STYLES.CSS_IMPORTANT_FLAG;

        return [
            {
                configKey: `${actor}.name`,
                fallbackKey: `defaultSet.${actor}.name`,
                cssVar: `--${APPID}-${actor}-name`,
                transformer: (value) => (value ? `'${value.replace(/'/g, "\\'")}'` : null),
            },
            {
                configKey: `${actor}.icon`,
                fallbackKey: `defaultSet.${actor}.icon`,
                cssVar: `--${APPID}-${actor}-icon`,
            },
            {
                configKey: `${actor}.standingImageUrl`,
                fallbackKey: `defaultSet.${actor}.standingImageUrl`,
                cssVar: `--${APPID}-${actor}-standing-image`,
            },
            {
                configKey: `${actor}.textColor`,
                fallbackKey: `defaultSet.${actor}.textColor`,
                cssVar: `--${APPID}-${actor}-textColor`,
                selector: `${CONSTANTS.SELECTORS[`${actorUpper}_MESSAGE`]} ${CONSTANTS.SELECTORS[`${actorUpper}_TEXT_CONTENT`]}`,
                property: 'color',
                generator: (value) => {
                    if (actor !== 'assistant' || !value) return '';
                    // This generator is specific to the assistant and is common across platforms.
                    const childSelectors = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul li', 'ol li', 'ul li::marker', 'ol li::marker', 'strong', 'em', 'blockquote', 'table', 'th', 'td'];
                    const fullSelectors = childSelectors.map((s) => `${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.ASSISTANT_TEXT_CONTENT} ${s}`);
                    return `${fullSelectors.join(', ')} { color: var(--${APPID}-assistant-textColor); }`;
                },
            },
            {
                configKey: `${actor}.font`,
                fallbackKey: `defaultSet.${actor}.font`,
                cssVar: `--${APPID}-${actor}-font`,
                selector: `${CONSTANTS.SELECTORS[`${actorUpper}_MESSAGE`]} ${CONSTANTS.SELECTORS[`${actorUpper}_TEXT_CONTENT`]}`,
                property: 'font-family',
            },
            {
                configKey: `${actor}.bubbleBackgroundColor`,
                fallbackKey: `defaultSet.${actor}.bubbleBackgroundColor`,
                cssVar: `--${APPID}-${actor}-bubble-bg`,
                selector: `${CONSTANTS.SELECTORS[`${actorUpper}_MESSAGE`]} ${CONSTANTS.SELECTORS[`RAW_${actorUpper}_BUBBLE`]}`,
                property: 'background-color',
            },
            {
                configKey: `${actor}.bubblePadding`,
                fallbackKey: `defaultSet.${actor}.bubblePadding`,
                cssVar: `--${APPID}-${actor}-bubble-padding`,
                selector: `${CONSTANTS.SELECTORS[`${actorUpper}_MESSAGE`]} ${CONSTANTS.SELECTORS[`RAW_${actorUpper}_BUBBLE`]}`,
                property: 'padding',
            },
            {
                configKey: `${actor}.bubbleBorderRadius`,
                fallbackKey: `defaultSet.${actor}.bubbleBorderRadius`,
                cssVar: `--${APPID}-${actor}-bubble-radius`,
                selector: `${CONSTANTS.SELECTORS[`${actorUpper}_MESSAGE`]} ${CONSTANTS.SELECTORS[`RAW_${actorUpper}_BUBBLE`]}`,
                property: 'border-radius',
            },
            {
                configKey: `${actor}.bubbleMaxWidth`,
                fallbackKey: `defaultSet.${actor}.bubbleMaxWidth`,
                cssVar: `--${APPID}-${actor}-bubble-maxwidth`,
                generator: (value) => {
                    if (!value) return '';
                    const selector = `${CONSTANTS.SELECTORS[`${actorUpper}_MESSAGE`]} ${CONSTANTS.SELECTORS[`RAW_${actorUpper}_BUBBLE`]}`;
                    const cssVar = `--${APPID}-${actor}-bubble-maxwidth`;
                    const extraRule = overrides[actor] || '';
                    return `${selector} { max-width: var(${cssVar})${important};${extraRule} }`;
                },
            },
        ];
    }

    const STYLE_DEFINITIONS = {
        user: createActorStyleDefinitions('user', PlatformAdapters.ThemeManager.getStyleOverrides()),
        assistant: createActorStyleDefinitions('assistant', PlatformAdapters.ThemeManager.getStyleOverrides()),
        window: [
            {
                configKey: 'window.backgroundColor',
                fallbackKey: 'defaultSet.window.backgroundColor',
                cssVar: `--${APPID}-window-bg-color`,
                selector: CONSTANTS.SELECTORS.MAIN_APP_CONTAINER,
                property: 'background-color',
            },
            {
                configKey: 'window.backgroundImageUrl',
                fallbackKey: 'defaultSet.window.backgroundImageUrl',
                cssVar: `--${APPID}-window-bg-image`,
                generator: (value) => (value ? `${CONSTANTS.SELECTORS.MAIN_APP_CONTAINER} { background-image: var(--${APPID}-window-bg-image)${SITE_STYLES.CSS_IMPORTANT_FLAG}; }` : ''),
            },
            {
                configKey: 'window.backgroundSize',
                fallbackKey: 'defaultSet.window.backgroundSize',
                cssVar: `--${APPID}-window-bg-size`,
                generator: (value) => (value ? `${CONSTANTS.SELECTORS.MAIN_APP_CONTAINER} { background-size: var(--${APPID}-window-bg-size)${SITE_STYLES.CSS_IMPORTANT_FLAG}; }` : ''),
            },
            {
                configKey: 'window.backgroundPosition',
                fallbackKey: 'defaultSet.window.backgroundPosition',
                cssVar: `--${APPID}-window-bg-pos`,
                generator: (value) => (value ? `${CONSTANTS.SELECTORS.MAIN_APP_CONTAINER} { background-position: var(--${APPID}-window-bg-pos)${SITE_STYLES.CSS_IMPORTANT_FLAG}; }` : ''),
            },
            {
                configKey: 'window.backgroundRepeat',
                fallbackKey: 'defaultSet.window.backgroundRepeat',
                cssVar: `--${APPID}-window-bg-repeat`,
                generator: (value) => (value ? `${CONSTANTS.SELECTORS.MAIN_APP_CONTAINER} { background-repeat: var(--${APPID}-window-bg-repeat)${SITE_STYLES.CSS_IMPORTANT_FLAG}; }` : ''),
            },
        ],
        inputArea: [
            {
                configKey: 'inputArea.backgroundColor',
                fallbackKey: 'defaultSet.inputArea.backgroundColor',
                cssVar: `--${APPID}-input-bg`,
                selector: CONSTANTS.SELECTORS.INPUT_AREA_BG_TARGET,
                property: 'background-color',
                generator: (value) => (value ? `${CONSTANTS.SELECTORS.INPUT_TEXT_FIELD_TARGET} { background-color: transparent; }` : ''),
            },
            {
                configKey: 'inputArea.textColor',
                fallbackKey: 'defaultSet.inputArea.textColor',
                cssVar: `--${APPID}-input-color`,
                selector: CONSTANTS.SELECTORS.INPUT_TEXT_FIELD_TARGET,
                property: 'color',
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
        _aggregatedEvents: new Set([EVENTS.RAW_MESSAGE_ADDED, EVENTS.AVATAR_INJECT, EVENTS.MESSAGE_COMPLETE, EVENTS.TURN_COMPLETE]),
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
                Logger.error('EventBus.subscribe requires a unique key.');
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
                Logger.error('EventBus.once requires a unique key.');
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
                            console.log(LOG_PREFIX, `Event Published: ${event} (x${finalCount})`);
                        }
                        delete this._logAggregation[event];
                    }, this._aggregationDelay);

                    // Execute subscribers for the aggregated event, but without the verbose individual logs.
                    [...this.events[event].values()].forEach((listener) => {
                        try {
                            listener(...args);
                        } catch (e) {
                            Logger.error(`EventBus error in listener for event "${event}":`, e);
                        }
                    });
                    return; // End execution here for aggregated events in debug mode.
                }
                // --- Aggregation logic END ---

                // In debug mode, provide detailed logging for NON-aggregated events.
                const subscriberKeys = [...this.events[event].keys()];

                // Use groupCollapsed for a cleaner default view
                console.groupCollapsed(LOG_PREFIX, `Event Published: ${event}`);

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
                        Logger.debug(`-> Executing: ${key}`);
                        listener(...args);
                    } catch (e) {
                        // Enhance error logging with the specific subscriber key
                        Logger.error(`EventBus error in listener "${key}" for event "${event}":`, e);
                    }
                });

                console.groupEnd();
            } else {
                // Iterate over a copy of the values in case a listener unsubscribes itself.
                [...this.events[event].values()].forEach((listener) => {
                    try {
                        listener(...args);
                    } catch (e) {
                        Logger.error(`EventBus error in listener for event "${event}":`, e);
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
                    Logger.error('EventBus error in queued UI work:', e);
                }
            }
            this.isUiWorkScheduled = false;
        },
    };

    // =================================================================================
    // SECTION: Data Conversion Utilities
    // Description: Handles image optimization.
    // =================================================================================

    class DataConverter {
        /**
         * Converts an image file to an optimized Data URL.
         * @param {File} file The image file object.
         * @param {object} options
         * @param {number} [options.maxWidth] Max width for resizing.
         * @param {number} [options.maxHeight] Max height for resizing.
         * @param {number} [options.quality] The quality for WebP compression (0 to 1).
         * @returns {Promise<string>} A promise that resolves with the optimized Data URL.
         */
        imageToOptimizedDataUrl(file, { maxWidth, maxHeight, quality = 0.85 }) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        // Check if we can skip re-compression
                        const isWebP = file.type === 'image/webp';
                        const needsResize = (maxWidth && img.width > maxWidth) || (maxHeight && img.height > maxHeight);

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

                        let { width, height } = img;
                        if (needsResize) {
                            const ratio = width / height;
                            if (maxWidth && width > maxWidth) {
                                width = maxWidth;
                                height = width / ratio;
                            }
                            if (maxHeight && height > maxHeight) {
                                height = maxHeight;
                                width = height * ratio;
                            }
                        }

                        canvas.width = Math.round(width);
                        canvas.height = Math.round(height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                        resolve(canvas.toDataURL('image/webp', quality));
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
     * @param {(deadline: IdleDeadline) => void} callback The function to execute.
     * @param {number} [timeout] The maximum delay in milliseconds.
     */
    function runWhenIdle(callback, timeout = 2000) {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(callback, { timeout });
        } else {
            setTimeout(callback, CONSTANTS.TIMING.TIMEOUTS.IDLE_EXECUTION_FALLBACK);
        }
    }

    /**
     * @param {Function} func
     * @param {number} delay
     * @returns {Function}
     */
    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                // After the debounce delay, schedule the actual execution for when the browser is idle.
                runWhenIdle(() => func.apply(this, args));
            }, delay);
        };
    }

    /**
     * Helper function to check if an item is a non-array object.
     * @param {*} item The item to check.
     * @returns {boolean}
     */
    function isObject(item) {
        return !!(item && typeof item === 'object' && !Array.isArray(item));
    }

    /**
     * Recursively merges the properties of a source object into a target object.
     * The target object is mutated. This is ideal for merging a partial user config into a complete default config.
     * @param {object} target The target object (e.g., a deep copy of default config).
     * @param {object} source The source object (e.g., user config).
     * @returns {object} The mutated target object.
     */
    function deepMerge(target, source) {
        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                const sourceVal = source[key];
                if (isObject(sourceVal) && Object.prototype.hasOwnProperty.call(target, key) && isObject(target[key])) {
                    // If both are objects, recurse
                    deepMerge(target[key], sourceVal);
                } else if (typeof sourceVal !== 'undefined') {
                    // Otherwise, overwrite or set the value from the source
                    target[key] = sourceVal;
                }
            }
        }
        return target;
    }

    /**
     * Checks if the current page is the "New Chat" page.
     * This is determined by checking if the URL path is exactly '/'.
     * @returns {boolean} True if it is the new chat page, otherwise false.
     */
    function isNewChatPage() {
        return window.location.pathname === '/';
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
     * @returns {HTMLElement|SVGElement} The created DOM element.
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
                        Logger.warn(`Blocked potentially unsafe protocol "${parsedUrl.protocol}" in attribute "${key}":`, url);
                    }
                } catch {
                    el.setAttribute(key, '#');
                    Logger.warn(`Blocked invalid or relative URL in attribute "${key}":`, url);
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
            } else if (key.startsWith('on') && typeof value === 'function') {
                el.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key === 'className') {
                const classes = String(value).trim();
                if (classes) {
                    el.classList.add(...classes.split(/\s+/));
                }
            } else if (key.startsWith('aria-')) {
                el.setAttribute(key, String(value));
            }
            // 4. Default attribute handling.
            else if (value !== false && value !== null) {
                el.setAttribute(key, value === true ? '' : String(value));
            }
        }
        // --- End of Attribute/Property Handling ---

        const fragment = document.createDocumentFragment();
        /**
         *
         * @param child
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

        return el;
    }

    /**
     * @description A dispatch table object that maps UI schema types to their respective rendering functions.
     */
    const UI_SCHEMA_RENDERERS = {
        _renderContainer(def) {
            let className = def.className;
            if (!className) {
                const classMap = {
                    'compound-slider': `${APPID}-compound-slider-container`,
                    'compound-container': `${APPID}-compound-form-field-container`,
                    'slider-container': `${APPID}-slider-container`,
                    'container-row': `${APPID}-submenu-row`,
                    'container-stacked-row': `${APPID}-submenu-row ${APPID}-submenu-row-stacked`,
                };
                className = classMap[def.type] || '';
            }
            const element = h(`div`, { className });
            if (def.children) {
                element.appendChild(buildUIFromSchema(def.children));
            }
            return element;
        },
        fieldset(def) {
            const element = h(`fieldset.${APPID}-submenu-fieldset`, [h('legend', def.legend)]);
            if (def.children) {
                element.appendChild(buildUIFromSchema(def.children));
            }
            return element;
        },
        separator(def) {
            let element = h(`hr.${APPID}-theme-separator`, { tabIndex: -1 });
            if (def.legend) {
                element = h('fieldset', [h('legend', def.legend), element]);
            }
            return element;
        },
        'submenu-separator': (def) => h(`div.${APPID}-submenu-separator`),
        textarea(def, formId) {
            return h(`div.${APPID}-form-field`, [
                h('label', { htmlFor: formId, title: def.tooltip }, def.label),
                h('textarea', { id: formId, rows: def.rows }),
                h(`div.${APPID}-form-error-msg`, { 'data-error-for': def.id.replace(/\./g, '-') }),
            ]);
        },
        textfield(def, formId) {
            const isImageField = ['image', 'icon'].includes(def.fieldType);
            const inputWrapperChildren = [h('input', { type: 'text', id: formId })];
            if (isImageField) {
                inputWrapperChildren.push(h(`button.${APPID}-local-file-btn`, { type: 'button', 'data-target-id': def.id.replace(/\./g, '-'), title: 'Select local file' }, [createIconFromDef(SITE_STYLES.ICONS.folder)]));
            }
            return h(`div.${APPID}-form-field`, [
                h('label', { htmlFor: formId, title: def.tooltip }, def.label),
                h(`div.${APPID}-input-wrapper`, inputWrapperChildren),
                h(`div.${APPID}-form-error-msg`, { 'data-error-for': def.id.replace(/\./g, '-') }),
            ]);
        },
        colorfield(def, formId) {
            const hint = 'Click the swatch to open the color picker.\nAccepts any valid CSS color string.';
            const fullTooltip = def.tooltip ? `${def.tooltip}\n---\n${hint}` : hint;
            return h(`div.${APPID}-form-field`, [
                h('label', { htmlFor: formId, title: fullTooltip }, def.label),
                h(`div.${APPID}-color-field-wrapper`, [
                    h('input', { type: 'text', id: formId, autocomplete: 'off' }),
                    h(`button.${APPID}-color-swatch`, { type: 'button', 'data-controls-color': def.id.replace(/\./g, '-'), title: 'Open color picker' }, [h(`span.${APPID}-color-swatch-checkerboard`), h(`span.${APPID}-color-swatch-value`)]),
                ]),
            ]);
        },
        select(def, formId) {
            return h(`div.${APPID}-form-field`, [
                h('label', { htmlFor: formId, title: def.tooltip }, def.label),
                h('select', { id: formId }, [h('option', { value: '' }, '(not set)'), ...def.options.map((o) => h('option', { value: o }, o))]),
            ]);
        },
        slider(def, formId) {
            const wrapperTag = def.containerClass ? `div.${def.containerClass}` : 'div';
            const inputId = `${formId}-slider`;
            return h(wrapperTag, [
                h('label', { htmlFor: inputId, title: def.tooltip }, def.label),
                h(`div.${APPID}-slider-subgroup-control`, [h('input', { type: 'range', id: inputId, min: def.min, max: def.max, step: def.step, dataset: def.dataset }), h('span', { 'data-slider-display-for': def.id })]),
            ]);
        },
        paddingslider(def, formId) {
            const createSubgroup = (name, suffix, min, max, step) => {
                const sliderId = `${APPID}-form-${def.actor}-bubblePadding-${suffix}`;
                return h(`div.${APPID}-slider-subgroup`, [
                    h('label', { htmlFor: sliderId }, name),
                    h(`div.${APPID}-slider-subgroup-control`, [
                        h('input', { type: 'range', id: sliderId, min, max, step, dataset: { nullThreshold: 0, sliderFor: sliderId, unit: 'px' } }),
                        h('span', { 'data-slider-display-for': sliderId }),
                    ]),
                ]);
            };
            return h(`div.${APPID}-form-field`, { id: formId }, [h(`div.${APPID}-compound-slider-container`, [createSubgroup('Padding Top/Bottom:', `tb`, -1, 30, 1), createSubgroup('Padding Left/Right:', `lr`, -1, 30, 1)])]);
        },
        preview(def) {
            const wrapperClass = `${APPID}-preview-bubble-wrapper ${def.actor === 'user' ? 'user-preview' : ''}`;
            return h(`div.${APPID}-preview-container`, [h('label', 'Preview:'), h('div', { className: wrapperClass }, [h(`div.${APPID}-preview-bubble`, { 'data-preview-for': def.actor }, [h('span', 'Sample Text')])])]);
        },
        'preview-input': (def) =>
            h(`div.${APPID}-preview-container`, [h('label', 'Preview:'), h(`div.${APPID}-preview-bubble-wrapper`, [h(`div.${APPID}-preview-input-area`, { 'data-preview-for': 'inputArea' }, [h('span', 'Sample input text')])])]),
        'preview-background': (def) =>
            h(`div.${APPID}-form-field`, [h('label', 'BG Preview:'), h(`div.${APPID}-preview-bubble-wrapper`, { style: { padding: '0', minHeight: '0' } }, [h(`div.${APPID}-preview-background`, { 'data-preview-for': 'window' })])]),
        button: (def) => h(`button#${def.id}.${APPID}-modal-button`, { title: def.title, style: { width: def.fullWidth ? '100%' : 'auto' } }, def.text),
        label: (def) => h('label', { htmlFor: def.for, title: def.title }, def.text),
        toggle: (def, formId) => h(`label.${APPID}-toggle-switch`, [h('input', { type: 'checkbox', id: formId }), h(`span.${APPID}-toggle-slider`)]),
    };

    // Assign aliases for container types
    ['container', 'grid', 'compound-slider', 'compound-container', 'slider-container', 'container-row', 'container-stacked-row'].forEach((type) => {
        UI_SCHEMA_RENDERERS[type] = UI_SCHEMA_RENDERERS._renderContainer;
    });

    /**
     * @description Recursively builds a DOM fragment from a declarative schema object.
     * This function is the core of the declarative UI system, translating object definitions into DOM elements.
     * @param {Array<object>} definitions - An array of objects, each defining a UI element.
     * @returns {DocumentFragment} A document fragment containing the constructed DOM elements.
     */
    function buildUIFromSchema(definitions) {
        const fragment = document.createDocumentFragment();
        if (!definitions) return fragment;

        for (const def of definitions) {
            const formId = def.id ? `${APPID}-form-${def.id.replace(/\./g, '-')}` : '';
            const renderer = UI_SCHEMA_RENDERERS[def.type];
            let element = null;

            if (renderer) {
                element = renderer(def, formId);
            }

            if (element) {
                if (def.isDefaultHidden) {
                    element.dataset.isDefaultHidden = 'true';
                }
                fragment.appendChild(element);
            }
        }
        return fragment;
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
     * @param {object} [options]
     * @param {number} [options.timeout] The maximum time to wait in milliseconds.
     * @param {Document | HTMLElement} [options.context] The element to search within.
     * @returns {Promise<HTMLElement | null>} A promise that resolves with the HTMLElement or null if timed out.
     */
    function waitForElement(selector, { timeout = 10000, context = document } = {}) {
        // First, check if the element already exists.
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
                if (sentinelCallback) sentinel.off(selector, sentinelCallback);
            };

            timer = setTimeout(() => {
                cleanup();
                Logger.warn(`Timed out after ${timeout}ms waiting for element "${selector}"`);
                resolve(null);
            }, timeout);

            sentinelCallback = (element) => {
                // Ensure the found element is an HTMLElement and is within the specified context.
                if (element instanceof HTMLElement && context.contains(element)) {
                    cleanup();
                    resolve(element);
                }
            };

            sentinel.on(selector, sentinelCallback);
        });
    }

    /**
     * Generates a unique ID string with a given prefix.
     * @param {string} [prefix='theme'] - The prefix for the ID.
     * @returns {string}
     */
    function generateUniqueId(prefix = 'theme') {
        return `${APPID}-${prefix}-` + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
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
     * Escapes special characters in a string for use in a regular expression.
     * @param {string} string The string to escape.
     * @returns {string} The escaped string.
     */
    function escapeRegExp(string) {
        // $& means the whole matched string
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
     * It's platform-aware. For platforms with a dedicated scroll container (like ChatGPT), it uses the reliable `scrollTo` method.
     * For others (like Gemini), it falls back to a "virtual anchor" method for offset scrolls.
     * This method temporarily injects an invisible element positioned above the target, scrolls to it, and then removes it.
     * @param {HTMLElement} element The target element to scroll to.
     * @param {object} [options] - Scrolling options.
     * @param {number} [options.offset] - A pixel offset to apply above the target element.
     * @param {boolean} [options.smooth] - Whether to use smooth scrolling.
     */
    function scrollToElement(element, options = {}) {
        if (!element) return;
        const { offset = 0, smooth = false } = options;
        const behavior = smooth ? 'smooth' : 'auto';

        const scrollContainerSelector = CONSTANTS.SELECTORS.SCROLL_CONTAINER;
        const scrollContainer = scrollContainerSelector ? document.querySelector(scrollContainerSelector) : null;

        if (scrollContainer) {
            Logger.debug('[scrollToElement] Using scroll container method.');
            // Find the actual bubble element to be used as the scroll target
            const bubbleSelector = `${CONSTANTS.SELECTORS.RAW_USER_BUBBLE}, ${CONSTANTS.SELECTORS.RAW_ASSISTANT_BUBBLE}`;
            const scrollTargetElement = element.querySelector(bubbleSelector) || element;
            const targetScrollTop = scrollContainer.scrollTop + scrollTargetElement.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top - offset;
            scrollContainer.scrollTo({
                top: targetScrollTop,
                behavior,
            });
            return;
        }

        // Fallback for standard window scrolling (like Gemini).
        if (offset === 0) {
            Logger.debug('[scrollToElement] (Scroll container not found): Using simple scrollIntoView() (no offset).');
            // Use the simplest method for non-offset scrolls.
            element.scrollIntoView({ behavior, block: 'start' });
        } else {
            Logger.debug('[scrollToElement] (Scroll container not found): Using virtual anchor method (with offset).');
            // Use the "virtual anchor" method for offset scrolls where direct manipulation is not possible.
            const target = element;
            const originalPosition = window.getComputedStyle(target).position;
            if (originalPosition === 'static') {
                target.style.position = 'relative';
            }

            const anchor = h('div', {
                style: {
                    position: 'absolute',
                    top: `-${offset}px`,
                    height: '1px',
                    width: '1px',
                },
            });

            target.prepend(anchor);
            anchor.scrollIntoView({ behavior, block: 'start' });

            // Clean up after a delay
            setTimeout(() => {
                anchor.remove();
                if (originalPosition === 'static') {
                    target.style.position = originalPosition;
                }
            }, CONSTANTS.TIMING.TIMEOUTS.VIRTUAL_ANCHOR_CLEANUP);
        }
    }

    /**
     * Sets a nested property on an object using a dot-notation path.
     * @param {object} obj The object to modify.
     * @param {string} path The dot-separated path to the property.
     * @param {any} value The value to set.
     */
    function setPropertyByPath(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!isObject(current[key])) {
                current[key] = {};
            }
            current = current[key];
        }
        current[keys[keys.length - 1]] = value;
    }

    /**
     * Populates a form with data from a configuration object based on a UI schema.
     * @param {Array<object>} definitions The UI schema definitions.
     * @param {HTMLElement} rootElement The root element of the form to populate.
     * @param {object} config The configuration object containing the data.
     * @param {object} componentInstance The component instance, passed to the handler for context.
     */
    function populateFormFromSchema(definitions, rootElement, config, componentInstance) {
        for (const def of definitions) {
            const configKey = def.configKey || def.id;
            const handler = FORM_FIELD_HANDLERS[def.type];

            if (handler && configKey) {
                const formId = `${APPID}-form-${configKey.replace(/\./g, '-')}`;
                const element = rootElement.querySelector(`#${formId}, #${formId}-slider`);

                if (element) {
                    const value = getPropertyByPath(config, configKey);
                    handler.setValue(element, value, { componentInstance });
                }
            }
            if (def.children) {
                populateFormFromSchema(def.children, rootElement, config, componentInstance);
            }
        }
    }

    /**
     * Collects data from a form into a configuration object based on a UI schema.
     * @param {Array<object>} definitions The UI schema definitions.
     * @param {HTMLElement} rootElement The root element of the form.
     * @param {object} configObject The configuration object to populate with data.
     */
    function collectDataFromSchema(definitions, rootElement, configObject) {
        for (const def of definitions) {
            const configKey = def.configKey || def.id;
            const handler = FORM_FIELD_HANDLERS[def.type];

            if (handler && configKey) {
                const formId = `${APPID}-form-${configKey.replace(/\./g, '-')}`;
                const element = rootElement.querySelector(`#${formId}, #${formId}-slider`);

                if (element) {
                    const value = handler.getValue(element);
                    setPropertyByPath(configObject, configKey, value);
                }
            }
            if (def.children) {
                collectDataFromSchema(def.children, rootElement, configObject);
            }
        }
    }

    /**
     * @description A utility function to update the text display of a slider component.
     * It handles values from a predefined map, nullable thresholds, and units.
     * @param {HTMLInputElement} slider The slider input element.
     * @param {HTMLElement} display The element where the slider's value is displayed.
     */
    function updateSliderDisplay(slider, display) {
        if (!slider || !display) return;

        const sliderValue = parseInt(slider.value, 10);
        const { valueMapKey, unit, nullThreshold } = slider.dataset;
        const sliderContainer = slider.closest(`.${APPID}-slider-subgroup-control`);

        if (valueMapKey) {
            const values = getPropertyByPath(CONSTANTS, valueMapKey);
            if (values) {
                display.textContent = `${values[sliderValue]}px`;
            }
            return;
        }

        const threshold = parseInt(nullThreshold, 10);
        if (!isNaN(threshold) && sliderValue < threshold) {
            display.textContent = 'Auto';
            display.title = 'Auto means the default value is used.';
            if (sliderContainer) sliderContainer.classList.add('is-default');
        } else {
            display.textContent = `${sliderValue}${unit}`;
            display.title = '';
            if (sliderContainer) sliderContainer.classList.remove('is-default');
        }
    }

    /**
     * @description A dispatch table defining how to get/set values for different form field types.
     */
    const FORM_FIELD_HANDLERS = {
        textfield: {
            getValue: (el) => el.value.trim() || null,
            setValue: (el, value) => {
                el.value = value ?? '';
            },
        },
        textarea: {
            getValue: (el) =>
                el.value
                    .split('\n')
                    .map((p) => p.trim())
                    .filter(Boolean) || [],
            setValue: (el, value) => {
                el.value = Array.isArray(value) ? value.join('\n') : value ?? '';
            },
        },
        select: {
            getValue: (el) => el.value || null,
            setValue: (el, value) => {
                el.value = value ?? '';
            },
        },
        colorfield: {
            getValue: (el) => el.value.trim() || null,
            setValue: (el, value, { modalElement }) => {
                el.value = value ?? '';
                // Manually update the swatch color
                const swatch = el.closest(`.${APPID}-color-field-wrapper`)?.querySelector(`.${APPID}-color-swatch-value`);
                if (swatch) {
                    swatch.style.backgroundColor = value || 'transparent';
                }
            },
        },
        slider: {
            getValue: (slider) => {
                const value = parseInt(slider.value, 10);
                const { valueMapKey, unit, nullThreshold } = slider.dataset;

                if (valueMapKey) {
                    const values = getPropertyByPath(CONSTANTS, valueMapKey);
                    return values?.[value] ?? values?.[0];
                }

                const threshold = parseInt(nullThreshold, 10);
                if (!isNaN(threshold) && value < threshold) {
                    return null;
                }

                return unit ? `${value}${unit}` : `${value}px`; // Default to 'px' if no unit is specified
            },
            setValue: (slider, value, { componentInstance }) => {
                const { valueMapKey, nullThreshold } = slider.dataset;

                if (valueMapKey) {
                    const values = getPropertyByPath(CONSTANTS, valueMapKey);
                    if (values) {
                        const index = values.indexOf(value);
                        slider.value = index !== -1 ? String(index) : '0';
                    }
                } else {
                    const threshold = parseInt(nullThreshold, 10);
                    const numVal = parseInt(String(value), 10);

                    if (value === null || isNaN(numVal)) {
                        slider.value = String(!isNaN(threshold) ? threshold - 1 : slider.min);
                    } else {
                        slider.value = String(numVal);
                    }
                }
                componentInstance._updateSliderDisplay(slider);
            },
        },
        paddingslider: {
            getValue: (el) => {
                const tb = el.querySelector(`[id$="-bubblePadding-tb"]`);
                const lr = el.querySelector(`[id$="-bubblePadding-lr"]`);
                if (!tb || !lr || tb.value < 0 || lr.value < 0) {
                    return null;
                }
                return `${tb.value}px ${lr.value}px`;
            },
            setValue: (el, value, { componentInstance }) => {
                const tbSlider = el.querySelector(`[id$="-bubblePadding-tb"]`);
                const lrSlider = el.querySelector(`[id$="-bubblePadding-lr"]`);
                if (!tbSlider || !lrSlider) return;

                if (value === null) {
                    tbSlider.value = -1;
                    lrSlider.value = -1;
                } else {
                    const parts = String(value)
                        .replace(/px/g, '')
                        .trim()
                        .split(/\s+/)
                        .map((p) => parseInt(p, 10));
                    if (parts.length === 1 && !isNaN(parts[0])) {
                        tbSlider.value = lrSlider.value = parts[0];
                    } else if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        tbSlider.value = parts[0];
                        lrSlider.value = parts[1];
                    } else {
                        tbSlider.value = -1;
                        lrSlider.value = -1;
                    }
                }
                componentInstance._updateSliderDisplay(tbSlider);
                componentInstance._updateSliderDisplay(lrSlider);
            },
        },
        toggle: {
            getValue: (el) => el.checked,
            setValue: (el, value) => {
                el.checked = !!value;
            },
        },
    };

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
     * Creates a unique, consistent event subscription key for EventBus.
     * @param {object} context The `this` context of the subscribing class instance.
     * @param {string} eventName The full event name from the EVENTS constant (e.g., 'EVENTS.NAVIGATION').
     * @returns {string} A key in the format 'ClassName.purpose'.
     */
    function createEventKey(context, eventName) {
        const purpose = eventName.split(':')[1] || eventName;
        if (!context || !context.constructor || !context.constructor.name) {
            // Fallback for contexts where constructor name might not be available
            return `UnknownContext.${purpose}`;
        }
        return `${context.constructor.name}.${purpose}`;
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
                Logger.error('withLayoutCycle: Error during measure phase:', e);
                reject(e);
                return;
            }

            // Phase 2: Schedule the DOM mutations to run in the next animation frame.
            requestAnimationFrame(() => {
                try {
                    mutate(measuredData);
                    resolve();
                } catch (e) {
                    Logger.error('withLayoutCycle: Error during mutate phase:', e);
                    reject(e);
                }
            });
        });
    }

    /**
     * @description Processes an array of items in asynchronous batches to avoid blocking the main thread.
     * @param {Array<T>} items The array of items to process.
     * @param {(item: T, index: number) => void} processItem The function to execute for each item.
     * @param {number} batchSize The number of items to process in each batch.
     * @param {() => void} [onComplete] An optional callback to execute when all batches are complete.
     * @template T
     */
    function processInBatches(items, processItem, batchSize, onComplete) {
        let index = 0;
        const totalItems = items.length;

        if (totalItems === 0) {
            onComplete?.();
            return;
        }

        function runNextBatch() {
            const endIndex = Math.min(index + batchSize, totalItems);
            for (; index < endIndex; index++) {
                processItem(items[index], index);
            }

            if (index < totalItems) {
                requestAnimationFrame(runNextBatch);
            } else {
                onComplete?.();
            }
        }

        requestAnimationFrame(runNextBatch);
    }

    // =================================================================================
    // SECTION: Configuration Management (GM Storage)
    // =================================================================================

    /**
     * @description A centralized utility for validating and sanitizing configuration objects.
     * @typedef {{
     * id: string;
     * type: 'icon' | 'image';
     * label: string;
     * }} ImageFieldDefinition
     */
    const ConfigProcessor = {
        /**
         * Validates a single theme object and returns user-facing errors. Does not mutate the object.
         * @param {object} themeData The theme data to validate.
         * @param {boolean} isDefaultSet Whether the theme being validated is the defaultSet.
         * @returns {{isValid: boolean, errors: Array<{field: string, message: string}>}} Validation result.
         */
        validate(themeData, isDefaultSet = false) {
            /** @type {Array<{field: string, message: string}>} */
            const errors = [];

            // --- Image and Icon Validation ---
            /** @type {ImageFieldDefinition[]} */
            const imageFields = [
                { id: 'user.icon', type: 'icon', label: 'Icon:' },
                { id: 'user.standingImageUrl', type: 'image', label: 'Standing image:' },
                { id: 'assistant.icon', type: 'icon', label: 'Icon:' },
                { id: 'assistant.standingImageUrl', type: 'image', label: 'Standing image:' },
                { id: 'window.backgroundImageUrl', type: 'image', label: 'Background image:' },
            ];
            for (const { id, type, label } of imageFields) {
                const value = getPropertyByPath(themeData, id);
                const result = validateImageString(value, type);
                if (!result.isValid) {
                    errors.push({ field: id.replace(/\./g, '-'), message: `${label} ${result.message}` });
                }
            }

            // --- RegExp Pattern Validation (only for non-default themes) ---
            if (!isDefaultSet && themeData.metadata?.matchPatterns) {
                for (const p of themeData.metadata.matchPatterns) {
                    try {
                        const lastSlash = p.lastIndexOf('/');
                        new RegExp(p.slice(1, lastSlash), p.slice(lastSlash + 1));
                    } catch (e) {
                        errors.push({ field: 'metadata-matchPatterns', message: `Invalid RegExp: "${p}". ${e.message}` });
                        break; // Stop after first invalid regex
                    }
                }
            }

            return { isValid: errors.length === 0, errors };
        },

        /**
         * Processes and sanitizes an entire configuration object, applying defaults for invalid values.
         * Mutates the passed config object.
         * @param {AppConfig} config The full configuration object to process.
         * @returns {AppConfig} The sanitized configuration object.
         */
        process(config) {
            // 1. Sanitize Global Options
            if (config.options) {
                // Sanitize icon_size
                if (!CONSTANTS.ICON_SIZE_VALUES.includes(config.options.icon_size)) {
                    config.options.icon_size = CONSTANTS.ICON_SIZE;
                }

                // Sanitize chat_content_max_width
                const width = config.options.chat_content_max_width;
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
                    config.options.chat_content_max_width = defaultValue;
                }
            }

            // 2. Sanitize all theme sets and the default set
            const allThemes = [...(config.themeSets || []), config.defaultSet];
            for (const theme of allThemes) {
                if (!theme) continue;
                // Sanitize image strings (throws error on invalid format)
                this._validateThemeImageStrings(theme);

                // Sanitize numeric/unit properties (falls back to default)
                ['user', 'assistant'].forEach((actor) => {
                    if (!theme[actor]) theme[actor] = {};
                    const actorConf = theme[actor];
                    const defaultActorConf = DEFAULT_THEME_CONFIG.defaultSet[actor];

                    for (const key in THEME_VALIDATION_RULES) {
                        if (Object.prototype.hasOwnProperty.call(actorConf, key)) {
                            const rule = THEME_VALIDATION_RULES[key];
                            actorConf[key] = this._sanitizeProperty(actorConf[key], rule, defaultActorConf[key]);
                        }
                    }
                });
            }

            // 3. Validate RegExp patterns (throws error on invalid format)
            this._validateThemeMatchPatterns(config);

            return config;
        },

        /**
         * @private
         * Throws an error if any image string in a theme is invalid.
         * @param {Partial<ThemeSet>} theme
         */
        _validateThemeImageStrings(theme) {
            const themeName = theme.metadata?.name || 'Default Set';
            const check = (value, type) => {
                const result = validateImageString(value, type);
                if (!result.isValid) throw new Error(`Theme "${themeName}": ${result.message}`);
            };
            if (theme.user) {
                check(theme.user.icon, 'icon');
                check(theme.user.standingImageUrl, 'image');
            }
            if (theme.assistant) {
                check(theme.assistant.icon, 'icon');
                check(theme.assistant.standingImageUrl, 'image');
            }
            if (theme.window) {
                check(theme.window.backgroundImageUrl, 'image');
            }
        },

        /**
         * @private
         * Validates the matchPatterns within the themeSets of a given config object.
         * Throws an error if validation fails.
         * @param {AppConfig} config - The configuration object to validate.
         */
        _validateThemeMatchPatterns(config) {
            if (!config || !config.themeSets || !Array.isArray(config.themeSets)) {
                return;
            }
            for (const set of config.themeSets) {
                if (!set.metadata || !Array.isArray(set.metadata.matchPatterns)) continue;
                for (const p of set.metadata.matchPatterns) {
                    if (typeof p !== 'string' || !/^\/.*\/[gimsuy]*$/.test(p)) {
                        throw new Error(`Invalid format. Must be /pattern/flags string: ${p}`);
                    }
                    try {
                        const lastSlash = p.lastIndexOf('/');
                        new RegExp(p.slice(1, lastSlash), p.slice(lastSlash + 1));
                    } catch (e) {
                        throw new Error(`Invalid RegExp: "${p}"\n${e.message}`);
                    }
                }
            }
        },

        /**
         * @private
         * @param {string | null} value The value to sanitize.
         * @param {object} rule The validation rule from THEME_VALIDATION_RULES.
         * @param {string | null} defaultValue The fallback value.
         * @returns {string | null} The sanitized value.
         */
        _sanitizeProperty(value, rule, defaultValue) {
            if (rule.nullable && value === null) {
                return value;
            }

            if (typeof value !== 'string' || !value.endsWith(rule.unit)) {
                return defaultValue;
            }

            const numVal = parseInt(value, 10);
            if (isNaN(numVal) || numVal < rule.min || numVal > rule.max) {
                return defaultValue;
            }

            return value; // The original value is valid
        },
    };

    /**
     * @abstract
     * @description Base class for managing script configurations via GM_setValue/GM_getValue.
     * Handles generic logic for loading, saving, backups, and validation.
     * This class is platform-agnostic and designed to be extended.
     */
    class ConfigManagerBase {
        /**
         * @param {object} params
         * @param {string} params.configKey The key for GM_setValue/GM_getValue.
         * @param {object} params.defaultConfig The default configuration object for the script.
         */
        constructor({ configKey, defaultConfig }) {
            if (!configKey || !defaultConfig) {
                throw new Error('configKey and defaultConfig must be provided.');
            }
            this.CONFIG_KEY = configKey;
            this.DEFAULT_CONFIG = defaultConfig;
            /** @type {AppConfig|null} */
            this.config = null;
        }

        /**
         * Loads the configuration from storage.
         * Assumes the configuration is stored as a JSON string.
         * @returns {Promise<any>}
         */
        async load() {
            const raw = await GM_getValue(this.CONFIG_KEY);
            let userConfig = null;
            if (raw) {
                try {
                    userConfig = JSON.parse(raw);
                } catch (e) {
                    Logger.error('Failed to parse configuration. Resetting to default settings.', e);
                    userConfig = null;
                }
            }

            const completeConfig = JSON.parse(JSON.stringify(this.DEFAULT_CONFIG));
            this.config = deepMerge(completeConfig, userConfig || {});

            this._validateAndSanitizeOptions();
        }

        /**
         * Saves the configuration object to storage as a JSON string.
         * @param {object} obj The configuration object to save.
         * @returns {Promise<void>}
         */
        async save(obj) {
            this.config = obj;
            await GM_setValue(this.CONFIG_KEY, JSON.stringify(obj));
        }

        /**
         * @returns {AppConfig|null} The current configuration object.
         */
        get() {
            return this.config;
        }

        /**
         * @abstract
         * @protected
         * This method should be overridden by subclasses to perform script-specific
         * validation and sanitization of the `this.config.options` object.
         */
        _validateAndSanitizeOptions() {
            // Default implementation does nothing.
            // Subclasses should provide their own logic.
        }
    }

    class ConfigManager extends ConfigManagerBase {
        constructor(dataConverter) {
            super({
                configKey: CONSTANTS.CONFIG_KEY,
                defaultConfig: DEFAULT_THEME_CONFIG,
            });
            this.dataConverter = dataConverter;
        }

        /**
         * @override
         * Loads the configuration from storage.
         * @returns {Promise<AppConfig>}
         */
        async load() {
            const raw = await GM_getValue(this.CONFIG_KEY);
            let userConfig = null;

            if (raw) {
                // Try parsing as plain JSON.
                try {
                    const parsed = JSON.parse(raw);
                    if (isObject(parsed)) {
                        userConfig = parsed;
                    }
                } catch (e) {
                    Logger.error('Failed to parse config. Resetting to default.', e);
                    userConfig = null;
                }
            }

            const completeConfig = JSON.parse(JSON.stringify(this.DEFAULT_CONFIG));
            this.config = deepMerge(completeConfig, userConfig || {});

            this._validateAndSanitizeOptions();
            return this.config;
        }

        /**
         * @override
         * Saves the configuration object to storage, but only if it's under the size limit.
         * Throws a specific error if the limit is exceeded.
         * @param {object} obj The configuration object to save.
         * @returns {Promise<void>}
         */
        async save(obj) {
            const jsonString = JSON.stringify(obj);
            const configSize = new Blob([jsonString]).size; // Use Blob to get accurate byte size

            if (configSize > CONSTANTS.CONFIG_SIZE_LIMIT_BYTES) {
                this.config = obj; // Keep oversized config in memory
                const sizeInMB = (configSize / 1024 / 1024).toFixed(2);
                const limitInMB = (CONSTANTS.CONFIG_SIZE_LIMIT_BYTES / 1024 / 1024).toFixed(1);
                const errorMsg = `Configuration size (${sizeInMB} MB) exceeds the ${limitInMB} MB limit. Changes are not saved.`;

                EventBus.publish(EVENTS.CONFIG_SIZE_EXCEEDED, { message: errorMsg });
                throw new Error(errorMsg); // Throw error for immediate UI feedback
            }

            this.config = obj;
            await GM_setValue(this.CONFIG_KEY, jsonString);
            EventBus.publish(EVENTS.CONFIG_SAVE_SUCCESS); // Notify UI to clear warnings
        }

        /**
         * @override
         * @protected
         * Validates and sanitizes App-specific option values after loading.
         */
        _validateAndSanitizeOptions() {
            if (!this.config || !this.config.options) return;
            const options = this.config.options;
            const width = options.chat_content_max_width;
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

            // If validation fails at any point, reset to default (null).
            if (!sanitized) {
                this.config.options.chat_content_max_width = defaultValue;
            }
        }

        /**
         * Getter for the icon size, required by other managers.
         * @returns {number}
         */
        getIconSize() {
            return this.config?.options?.icon_size || CONSTANTS.ICON_SIZE;
        }
    }

    // =================================================================================
    // SECTION: Sync Manager
    // =================================================================================

    class SyncManager {
        constructor() {
            this.listenerId = null;
            this.subscriptions = [];
        }

        _subscribe(event, listener) {
            const key = createEventKey(this, event);
            EventBus.subscribe(event, listener, key);
            this.subscriptions.push({ event, key });
        }

        init() {
            this.listenerId = GM_addValueChangeListener(CONSTANTS.CONFIG_KEY, (name, oldValue, newValue, remote) => {
                if (remote) {
                    this._handleRemoteChange(newValue);
                }
            });
            this._subscribe(EVENTS.APP_SHUTDOWN, () => this.destroy());
        }

        destroy() {
            if (this.listenerId) {
                GM_removeValueChangeListener(this.listenerId);
                this.listenerId = null;
            }
            this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
            this.subscriptions = [];
        }

        /**
         * Handles the config change event from another tab/window by publishing an event.
         * @private
         * @param {string} newValue The new configuration value from the storage event.
         */
        _handleRemoteChange(newValue) {
            Logger.log('SyncManager: Remote config change detected. Publishing event.');
            EventBus.publish(EVENTS.REMOTE_CONFIG_CHANGED, { newValue });
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
            if (newItemSize > CONSTANTS.CACHE_SIZE_LIMIT_BYTES) {
                Logger.warn(`Item size (${newItemSize}) exceeds cache limit (${CONSTANTS.CACHE_SIZE_LIMIT_BYTES}). Cannot be cached.`);
                return;
            }
            while (this.currentCacheSize + newItemSize > CONSTANTS.CACHE_SIZE_LIMIT_BYTES && this.cache.size > 0) {
                // Evict the least recently used item (first item in map iterator)
                const oldestKey = this.cache.keys().next().value;
                const oldestItem = this.cache.get(oldestKey);
                if (oldestItem) {
                    this.currentCacheSize -= oldestItem.size;
                    this.cache.delete(oldestKey);
                    Logger.log(`Evicted ${oldestKey} from cache to free up space.`);
                }
            }
        }

        /**
         * Gets an image as a data URL. Returns a cached version immediately if available.
         * Can fetch and resize the image based on the provided options.
         * @param {string} url The URL of the image to fetch.
         * @param {object} [resizeOptions] Optional resizing parameters.
         * @param {number} [resizeOptions.width] The target max width for resizing.
         * @param {number} [resizeOptions.height] The target max height for resizing.
         * @returns {Promise<string|null>} A promise that resolves with the data URL or null on failure.
         */
        async getImageAsDataUrl(url, resizeOptions = {}) {
            if (!url || typeof url !== 'string' || !url.startsWith('http')) {
                return url; // Return data URIs or other values directly
            }

            const cacheKey = resizeOptions.width ? `${url}|w=${resizeOptions.width},h=${resizeOptions.height}` : url;

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
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'blob',
                    onload: async (response) => {
                        if (response.status >= 200 && response.status < 300) {
                            try {
                                const dataUrl = await this.dataConverter.imageToOptimizedDataUrl(response.response, {
                                    maxWidth: resizeOptions.width,
                                    maxHeight: resizeOptions.height,
                                    quality: 0.85,
                                });
                                const size = new Blob([dataUrl]).size;

                                this._makeSpaceForNewItem(size);
                                this.cache.set(cacheKey, { data: dataUrl, size });
                                this.currentCacheSize += size;
                                resolve(dataUrl);
                            } catch (e) {
                                Logger.error(`Data conversion error for URL: ${url}`, e);
                                this.failedUrls.add(cacheKey);
                                resolve(null);
                            }
                        } else {
                            Logger.error(`Failed to fetch image. Status: ${response.status}, URL: ${url}`);
                            this.failedUrls.add(cacheKey);
                            resolve(null);
                        }
                    },
                    onerror: (error) => {
                        Logger.error(`GM_xmlhttpRequest error for URL: ${url}`, error);
                        this.failedUrls.add(cacheKey);
                        resolve(null);
                    },
                    ontimeout: () => {
                        Logger.error(`GM_xmlhttpRequest timeout for URL: ${url}`);
                        this.failedUrls.add(cacheKey);
                        resolve(null);
                    },
                });
            });
        }
    }

    // =================================================================================
    // SECTION: Message Cache Management
    // Description: Centralized manager for caching and sorting message elements from the DOM.
    // =================================================================================

    class MessageCacheManager {
        constructor() {
            this.userMessages = [];
            this.assistantMessages = [];
            this.totalMessages = [];
            this.subscriptions = [];
            this.isStreaming = false;
            this.debouncedRebuildCache = debounce(this._rebuildCache.bind(this), CONSTANTS.TIMING.DEBOUNCE_DELAYS.CACHE_UPDATE);
        }

        _subscribe(event, listener) {
            const key = createEventKey(this, event);
            EventBus.subscribe(event, listener, key);
            this.subscriptions.push({ event, key });
        }

        init() {
            this._subscribe(EVENTS.CACHE_UPDATE_REQUEST, () => this.debouncedRebuildCache());
            this._subscribe(EVENTS.NAVIGATION, () => this.clear());
            this._subscribe(EVENTS.APP_SHUTDOWN, () => this.destroy());
            this._subscribe(EVENTS.STREAMING_START, () => (this.isStreaming = true));
            this._subscribe(EVENTS.STREAMING_END, () => (this.isStreaming = false));
            this._rebuildCache();
        }

        destroy() {
            this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
            this.subscriptions = [];
        }

        _rebuildCache() {
            if (this.isStreaming) return;
            Logger.time('MessageCacheManager._rebuildCache');
            // Guard clause: If no conversation turns are on the page (e.g., on the homepage),
            // clear the cache if it's not already empty and exit early to prevent unnecessary queries.
            if (!document.querySelector(CONSTANTS.SELECTORS.CONVERSATION_CONTAINER)) {
                if (this.totalMessages.length > 0) {
                    this.clear();
                }
                Logger.timeEnd('MessageCacheManager._rebuildCache');
                return;
            }
            this.userMessages = Array.from(document.querySelectorAll(CONSTANTS.SELECTORS.USER_MESSAGE));
            const rawAssistantMessages = Array.from(document.querySelectorAll(CONSTANTS.SELECTORS.ASSISTANT_MESSAGE));
            // Filter out empty, non-functional message containers that might appear in image-only turns.
            this.assistantMessages = rawAssistantMessages.filter((msg) => PlatformAdapters.General.filterMessage(msg));

            // Construct totalMessages from the filtered lists and sort them by DOM order.
            const allMessages = [...this.userMessages, ...this.assistantMessages];
            allMessages.sort((a, b) => {
                const position = a.compareDocumentPosition(b);
                if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
                    return -1; // a comes before b
                } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
                    return 1; // a comes after b
                }
                return 0;
            });
            this.totalMessages = allMessages;

            this.notify();
            Logger.timeEnd('MessageCacheManager._rebuildCache');
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
         * @returns {{role: 'user'|'assistant', index: number} | null} An object with the role and index, or null if not found.
         */
        findMessageIndex(messageElement) {
            let index = this.userMessages.indexOf(messageElement);
            if (index !== -1) {
                return { role: 'user', index };
            }

            index = this.assistantMessages.indexOf(messageElement);
            if (index !== -1) {
                return { role: 'assistant', index };
            }

            return null;
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
        return path.split('.').reduce((o, k) => (o && o[k] !== 'undefined' ? o[k] : undefined), obj);
    }

    class StyleGenerator {
        /**
         * Generates all dynamic CSS rules based on the active theme and STYLE_DEFINITIONS.
         * @param {ThemeSet} currentThemeSet The active theme configuration.
         * @param {AppConfig} fullConfig The entire configuration object, including defaultSet.
         * @returns {string[]} An array of CSS rule strings.
         */
        generateDynamicCss(currentThemeSet, fullConfig) {
            const dynamicRules = [];
            const important = SITE_STYLES.CSS_IMPORTANT_FLAG || '';

            for (const definition of ALL_STYLE_DEFINITIONS) {
                const value = getPropertyByPath(currentThemeSet, definition.configKey) ?? getPropertyByPath(fullConfig, definition.fallbackKey);

                if (value === null || value === undefined) continue;
                // Generate rules for direct selector-property mappings
                if (definition.selector && definition.property) {
                    const selectors = Array.isArray(definition.selector) ? definition.selector.join(', ') : definition.selector;
                    dynamicRules.push(`${selectors} { ${definition.property}: var(${definition.cssVar})${important}; }`);
                }

                // Generate additional complex CSS blocks if a generator function is defined
                if (typeof definition.generator === 'function') {
                    const block = definition.generator(value);
                    if (block) {
                        dynamicRules.push(block);
                    }
                }
            }
            return dynamicRules;
        }
    }

    class ThemeManager {
        /**
         * @param {ConfigManager} configManager
         * @param {ImageDataManager} imageDataManager
         */
        constructor(configManager, imageDataManager) {
            this.configManager = configManager;
            this.imageDataManager = imageDataManager;
            this.styleGenerator = new StyleGenerator();
            this.themeStyleElem = null;
            this.dynamicRulesStyleElem = null;
            this.lastURL = null;
            this.lastTitle = null;
            this.lastAppliedThemeSet = null;
            this.cachedTitle = null;
            /** @type {ThemeSet | null} */
            this.cachedThemeSet = null;
            this.subscriptions = [];
            this.debouncedUpdateTheme = debounce(this.updateTheme.bind(this), CONSTANTS.TIMING.DEBOUNCE_DELAYS.THEME_UPDATE);
            this.isStreaming = false;
        }

        _subscribe(event, listener) {
            const key = createEventKey(this, event);
            EventBus.subscribe(event, listener, key);
            this.subscriptions.push({ event, key });
        }

        init() {
            this._subscribe(EVENTS.NAVIGATION, () => this._onNavigation());
            this._subscribe(EVENTS.TITLE_CHANGED, this.debouncedUpdateTheme);
            this._subscribe(EVENTS.THEME_UPDATE, this.debouncedUpdateTheme);
            this._subscribe(EVENTS.STREAMING_START, () => (this.isStreaming = true));
            this._subscribe(EVENTS.STREAMING_END, () => (this.isStreaming = false));
            this._subscribe(EVENTS.DEFERRED_LAYOUT_UPDATE, () => this._handleLayoutEvent());
        }

        destroy() {
            this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
            this.subscriptions = [];
            this.themeStyleElem?.remove();
            this.dynamicRulesStyleElem?.remove();
            this.themeStyleElem = null;
            this.dynamicRulesStyleElem = null;
        }

        _onNavigation() {
            if (!PlatformAdapters.ThemeManager.shouldDeferInitialTheme(this)) {
                this.updateTheme();
            }
        }

        _handleLayoutEvent(forcedWidth = undefined) {
            if (this.isStreaming) return;
            this.applyChatContentMaxWidth(forcedWidth);
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
            const config = this.configManager.get();
            const regexArr = [];
            for (const set of config.themeSets ?? []) {
                for (const title of set.metadata?.matchPatterns ?? []) {
                    if (typeof title === 'string') {
                        if (/^\/.*\/[gimsuy]*$/.test(title)) {
                            const lastSlash = title.lastIndexOf('/');
                            const pattern = title.slice(1, lastSlash);
                            const flags = title.slice(lastSlash + 1);
                            try {
                                regexArr.push({ pattern: new RegExp(pattern, flags), set });
                            } catch {
                                /* ignore invalid regex strings in config */
                            }
                        } else {
                            Logger.error(`Invalid match pattern format (must be /pattern/flags): ${title}`);
                        }
                    }
                }
            }

            const name = this.cachedTitle;
            if (name) {
                const regexHit = regexArr.find((r) => r.pattern.test(name));
                if (regexHit) {
                    this.cachedThemeSet = regexHit.set;
                    return regexHit.set;
                }
            }

            // Fallback to default if no title or no match
            const defaultMetadata = { id: 'default', name: 'Default Settings', matchPatterns: [] };
            this.cachedThemeSet = { ...config.defaultSet, metadata: defaultMetadata };
            return this.cachedThemeSet;
        }

        /**
         * Main theme update handler.
         * @param {boolean} [force] - If true, forces the theme to be reapplied even if no changes are detected.
         */
        updateTheme(force = false) {
            Logger.debug('Theme update triggered.');
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
                Logger.debug('Theme update deferred by platform adapter.');
                return;
            }

            // Deep comparison to detect changes from the settings panel
            const contentChanged = JSON.stringify(currentThemeSet) !== JSON.stringify(this.lastAppliedThemeSet);

            const themeShouldUpdate = force || urlChanged || titleChanged || contentChanged;
            if (themeShouldUpdate) {
                this.applyThemeStyles(currentThemeSet, config);
                this.applyChatContentMaxWidth();
            }
        }

        /**
         * @private
         * Ensures that the <style> elements for static and dynamic CSS exist in the document head.
         * Creates them if they don't exist and stores references in `this`.
         */
        _ensureStylesheets() {
            if (!this.themeStyleElem) {
                this.themeStyleElem = h('style', {
                    id: `${APPID}-theme-style`,
                    textContent: PlatformAdapters.StyleManager.getStaticCss(),
                });
                document.head.appendChild(this.themeStyleElem);
            }

            if (!this.dynamicRulesStyleElem) {
                const dynamicRulesStyleId = `${APPID}-dynamic-rules-style`;
                this.dynamicRulesStyleElem = document.getElementById(dynamicRulesStyleId);
                if (!this.dynamicRulesStyleElem) {
                    this.dynamicRulesStyleElem = h('style', { id: dynamicRulesStyleId });
                    document.head.appendChild(this.dynamicRulesStyleElem);
                }
            }
        }

        /**
         * Applies all theme-related styles to the document by orchestrating helper methods.
         * @param {ThemeSet} currentThemeSet The active theme configuration.
         * @param {AppConfig} fullConfig The entire configuration object, including defaultSet.
         */
        async applyThemeStyles(currentThemeSet, fullConfig) {
            Logger.time('ThemeManager.applyThemeStyles');
            this.lastAppliedThemeSet = currentThemeSet;

            this._ensureStylesheets();

            const dynamicRules = this.styleGenerator.generateDynamicCss(currentThemeSet, fullConfig);
            this.dynamicRulesStyleElem.textContent = dynamicRules.join('\n');

            const rootStyle = document.documentElement.style;
            const imageProcessingPromises = [];

            for (const definition of ALL_STYLE_DEFINITIONS) {
                if (!definition.cssVar) continue;

                const value = getPropertyByPath(currentThemeSet, definition.configKey) ?? getPropertyByPath(fullConfig, definition.fallbackKey);
                const isImage = definition.configKey.endsWith('icon') || definition.configKey.includes('ImageUrl');

                if (isImage) {
                    // Stage 1 (Sync): Immediately set to 'none' to prevent flicker of default images.
                    rootStyle.setProperty(definition.cssVar, 'none');

                    if (value) {
                        // Stage 2 (Async): Start processing the image in the background.
                        const processImage = async () => {
                            const val = String(value).trim();
                            let finalCssValue = val;

                            if (val.startsWith('<svg')) {
                                finalCssValue = `url("${svgToDataUrl(val)}")`;
                            } else if (val.startsWith('http')) {
                                const isIcon = definition.configKey.endsWith('icon');
                                let resizeOptions = {};
                                if (isIcon) {
                                    const iconSize = this.configManager.getIconSize();
                                    resizeOptions = { width: iconSize, height: iconSize };
                                }
                                const dataUrl = await this.imageDataManager.getImageAsDataUrl(val, resizeOptions);
                                finalCssValue = dataUrl ? `url("${dataUrl}")` : 'none';
                            } else if (val.startsWith('data:image')) {
                                finalCssValue = `url("${val}")`;
                            }

                            // When ready, update the CSS variable to show the themed image.
                            if (finalCssValue !== 'none') {
                                rootStyle.setProperty(definition.cssVar, finalCssValue);
                            }
                        };
                        imageProcessingPromises.push(processImage());
                    }
                } else {
                    // This is a non-image style, apply it synchronously.
                    if (value !== null && value !== undefined) {
                        // Apply the transformer function if it exists (e.g., for actor names).
                        const finalValue = typeof definition.transformer === 'function' ? definition.transformer(value, fullConfig) : value;
                        rootStyle.setProperty(definition.cssVar, finalValue);
                    } else {
                        rootStyle.removeProperty(definition.cssVar);
                    }
                }
            }

            // After all image processing promises have resolved, publish the final event.
            Promise.all(imageProcessingPromises).then(() => {
                EventBus.publish(EVENTS.THEME_APPLIED, { theme: currentThemeSet, config: fullConfig });
            });

            Logger.timeEnd('ThemeManager.applyThemeStyles');
        }

        /**
         * Calculates and applies the dynamic max-width for the chat content area.
         * @param {string | null} [forcedWidth] - A specific width value to apply for previews.
         */
        applyChatContentMaxWidth(forcedWidth = undefined) {
            const rootStyle = document.documentElement.style;
            const config = this.configManager.get();
            if (!config) return;

            // Use forcedWidth for preview if provided; otherwise, get from config.
            const userMaxWidth = forcedWidth !== undefined ? forcedWidth : config.options.chat_content_max_width;

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
                    if (!userMaxWidth) {
                        document.body.classList.remove(`${APPID}-max-width-active`);
                        rootStyle.removeProperty(`--${APPID}-chat-content-max-width`);
                    } else {
                        document.body.classList.add(`${APPID}-max-width-active`);

                        const themeSet = this.getThemeSet();
                        const iconSize = config.options.icon_size;

                        // Check if standing images are active in the current theme or default.
                        const hasStandingImage =
                            getPropertyByPath(themeSet, 'user.standingImageUrl') ||
                            getPropertyByPath(themeSet, 'assistant.standingImageUrl') ||
                            getPropertyByPath(config.defaultSet, 'user.standingImageUrl') ||
                            getPropertyByPath(config.defaultSet, 'assistant.standingImageUrl');
                        let requiredMarginPerSide = iconSize + CONSTANTS.ICON_MARGIN * 2;
                        if (hasStandingImage) {
                            const minStandingImageWidth = iconSize * 2;
                            requiredMarginPerSide = Math.max(requiredMarginPerSide, minStandingImageWidth);
                        }

                        const { sidebarWidth, windowWidth } = measured;
                        const totalRequiredMargin = sidebarWidth + requiredMarginPerSide * 2;
                        const maxAllowedWidth = windowWidth - totalRequiredMargin;
                        // Use CSS min() to ensure the user's value does not exceed the calculated available space.
                        const finalMaxWidth = `min(${userMaxWidth}, ${maxAllowedWidth}px)`;
                        rootStyle.setProperty(`--${APPID}-chat-content-max-width`, finalMaxWidth);
                    }
                },
            });

            // Notify other managers that the chat content width may have changed.
            EventBus.publish(EVENTS.CHAT_CONTENT_WIDTH_UPDATED);
        }
    }

    // =================================================================================
    // SECTION: DOM Observers and Event Listeners
    // =================================================================================

    class ObserverManager {
        constructor() {
            this.mainObserver = null;
            this.mainObserverContainer = null;
            this.layoutResizeObserver = new ResizeObserver(this._handleResize.bind(this));
            this.observedElements = new Map();
            this.processedTurnNodes = new Set();
            this.sentinelTurnListeners = new Map();
            this.subscriptions = [];
            this.debouncedCacheUpdate = debounce(this._publishCacheUpdate.bind(this), CONSTANTS.TIMING.DEBOUNCE_DELAYS.CACHE_UPDATE);
            this.activeObservers = [];
            this.activePageObservers = [];
            this.urlObserverInitialized = false;

            // Properties for robust URL observation lifecycle
            this.originalHistoryMethods = { pushState: null, replaceState: null };
            this.boundURLChangeHandler = null;

            // The debounced visibility check
            this.debouncedVisibilityCheck = debounce(() => EventBus.queueUIWork(this.publishVisibilityRecheck.bind(this)), CONSTANTS.TIMING.DEBOUNCE_DELAYS.VISIBILITY_CHECK);
        }

        _subscribe(event, listener) {
            const key = createEventKey(this, event);
            EventBus.subscribe(event, listener, key);
            this.subscriptions.push({ event, key });
        }

        _subscribeOnce(event, listener) {
            const key = createEventKey(this, event);
            EventBus.once(event, listener, key);
            // 'once' subscriptions manage their own lifecycle, so we don't add them to the array for manual cleanup.
        }

        /**
         * Initializes the manager by subscribing to system-wide events.
         * This method's functionality was previously part of start().
         */
        init() {
            this._subscribe(EVENTS.SUSPEND_OBSERVERS, () => this.stopMainObserver());
            this._subscribe(EVENTS.RESUME_OBSERVERS_AND_REFRESH, () => {
                if (this.mainObserverContainer) {
                    this.startMainObserver(this.mainObserverContainer);
                    // Manually trigger a full refresh.
                    this.debouncedCacheUpdate.bind(this)();
                }
            });
            this._subscribe(EVENTS.APP_SHUTDOWN, () => this.destroy());
        }

        addObserver(observer) {
            this.activeObservers.push(observer);
        }

        /**
         * Starts all platform-specific observers.
         */
        async start() {
            const container = await waitForElement(CONSTANTS.SELECTORS.MAIN_APP_CONTAINER);
            if (!container) {
                Logger.error('Main container not found. Observer not started.');
                return;
            }
            this.mainObserverContainer = container;

            this.mainObserver = new MutationObserver((mutations) => this._handleMainMutations(mutations));

            // Centralized ResizeObserver for layout changes
            this.observeElement(document.body, CONSTANTS.OBSERVED_ELEMENT_TYPES.BODY);

            // Call the URL change observer to set up all page-specific listeners.
            this.startURLChangeObserver();
            await this.startInputAreaObserver();
        }

        destroy() {
            this.stopMainObserver();
            // Clean up any lingering turn completion listeners.
            for (const [selector, callback] of this.sentinelTurnListeners.values()) {
                sentinel.off(selector, callback);
            }
            this.sentinelTurnListeners.clear();

            this.layoutResizeObserver?.disconnect();
            this.activeObservers.forEach((observer) => observer.disconnect());
            this.activeObservers = [];

            // Add cleanup for page-specific observers
            this.activePageObservers.forEach((cleanup) => cleanup());
            this.activePageObservers = [];

            this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
            this.subscriptions = [];

            // Restore original history methods and remove listeners if they were initialized.
            if (this.urlObserverInitialized) {
                if (this.originalHistoryMethods.pushState) {
                    history.pushState = this.originalHistoryMethods.pushState;
                    this.originalHistoryMethods.pushState = null;
                }
                if (this.originalHistoryMethods.replaceState) {
                    history.replaceState = this.originalHistoryMethods.replaceState;
                    this.originalHistoryMethods.replaceState = null;
                }
                if (this.boundURLChangeHandler) {
                    window.removeEventListener('popstate', this.boundURLChangeHandler);
                }
                this.urlObserverInitialized = false;
                this.boundURLChangeHandler = null;
            }
        }

        /**
         * @private
         * @description Sets up the monitoring for URL changes, which acts as the main entry point for initializing page-specific observers.
         */
        startURLChangeObserver() {
            // The handler is now defined only once and bound to the instance for stable reference.
            if (!this.boundURLChangeHandler) {
                // Initialize with null to ensure the handler logic runs on the first call after any init.
                let lastHref = null;

                this.boundURLChangeHandler = async () => {
                    if (location.href !== lastHref) {
                        lastHref = location.href;
                        EventBus.publish(EVENTS.NAVIGATION_START);

                        // Check if the new URL is an excluded page
                        if (PlatformAdapters.General.isExcludedPage()) {
                            Logger.log('Excluded URL detected. Shutting down script.');
                            EventBus.publish(EVENTS.APP_SHUTDOWN);
                            return; // Stop further processing
                        }

                        // --- Default behavior for navigation between valid chat pages ---

                        // Clean up all observers from the previous page before setting up new ones.
                        this.activePageObservers.forEach((cleanup) => cleanup());
                        this.activePageObservers = [];

                        // This one-time listener is the key to transitioning from "navigating" to "stable" state.
                        this._subscribeOnce(EVENTS.CACHE_UPDATED, () => {
                            EventBus.publish(EVENTS.NAVIGATION_END);
                            Logger.debug('Initial cache updated. Sentinel is now active for real-time messages.');
                        });

                        this.stopMainObserver();
                        // Clean up any lingering turn completion listeners from the previous page.
                        for (const [selector, callback] of this.sentinelTurnListeners.values()) {
                            sentinel.off(selector, callback);
                        }
                        this.sentinelTurnListeners.clear();

                        EventBus.publish(EVENTS.NAVIGATION);

                        // Wait for the main app container, which is always present on chat pages.
                        const appContainer = await waitForElement(CONSTANTS.SELECTORS.MAIN_APP_CONTAINER);
                        if (!appContainer) {
                            Logger.warn('ObserverManager: Main app container not found after URL change.');
                            return;
                        }

                        // --- Start all page-specific observers from here ---
                        const observerStarters = PlatformAdapters.Observer.getPlatformObserverStarters();
                        for (const startObserver of observerStarters) {
                            const cleanup = await startObserver({
                                observeElement: this.observeElement.bind(this),
                                unobserveElement: this.unobserveElement.bind(this),
                            });
                            if (typeof cleanup === 'function') {
                                this.activePageObservers.push(cleanup);
                            }
                        }

                        // Function to set up the main observer on the message container
                        const setupMainObserver = (messageContainer) => {
                            this.mainObserverContainer = messageContainer;
                            this.startMainObserver(messageContainer);
                        };

                        // Wait for the new message container to appear, then set up the permanent observer.
                        const newParentContainer = await waitForElement(CONSTANTS.SELECTORS.MESSAGE_CONTAINER_PARENT, { context: appContainer });
                        if (newParentContainer) {
                            setupMainObserver(newParentContainer);
                        }

                        // Trigger an initial cache update in case the DOM is already stable.
                        this.debouncedCacheUpdate();
                    }
                };
            }

            // Hook into history changes only once per lifecycle, managed by the destroy method.
            if (!this.urlObserverInitialized) {
                this.urlObserverInitialized = true;

                // Capture the ObserverManager instance for use in the wrapper function.
                const observerManagerInstance = this;

                for (const m of ['pushState', 'replaceState']) {
                    const orig = history[m];
                    this.originalHistoryMethods[m] = orig; // Store original for restoration

                    history[m] = function (...args) {
                        // Call original method with the correct context (`this` = `history`).
                        const result = orig.apply(this, args);

                        // Call our handler using the captured instance.
                        if (observerManagerInstance.boundURLChangeHandler) {
                            observerManagerInstance.boundURLChangeHandler();
                        }
                        return result;
                    };
                }
                window.addEventListener('popstate', this.boundURLChangeHandler);
            }

            // Manually call the handler on initialization to process the initial page load/navigation.
            if (this.boundURLChangeHandler) {
                this.boundURLChangeHandler();
            }
        }

        /**
         * @private
         * @description Starts a stateful observer for the input area, attaching a ResizeObserver to trigger UI repositioning events.
         * @returns {Promise<void>}
         */
        async startInputAreaObserver() {
            let observedInputArea = null;
            // Capture the ObserverManager instance for use in the callback
            const instance = this;

            const setupObserver = (inputArea) => {
                if (inputArea === observedInputArea) return; // Already observing this element

                // Unobserve the old element if it exists and is different
                if (observedInputArea) {
                    instance.unobserveElement(observedInputArea);
                }

                // Observe the new element
                instance.observeElement(inputArea, CONSTANTS.OBSERVED_ELEMENT_TYPES.INPUT_AREA);
                observedInputArea = inputArea;
            };

            const selector = CONSTANTS.SELECTORS.FIXED_NAV_INPUT_AREA_TARGET;
            sentinel.on(selector, setupObserver);

            // Initial check in case the element is already present on load
            const initialInputArea = document.querySelector(selector);
            if (initialInputArea instanceof HTMLElement) {
                setupObserver(initialInputArea);
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
            if (this.mainObserver && container) {
                this.mainObserver.observe(container, { childList: true, subtree: false });
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
                Logger.debug('_handleMainMutations (UPDATE: Message was deleted)');
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

            PerfMonitor.throttleLog('observeTurnForCompletion');
            // Do not re-process turns that have already been handled or are currently being observed.
            if (this.processedTurnNodes.has(turnNode) || this.sentinelTurnListeners.has(turnNode)) return;
            if (turnNode.nodeType !== Node.ELEMENT_NODE) return;

            if (this._isTurnComplete(turnNode)) {
                EventBus.publish(EVENTS.TURN_COMPLETE, turnNode);
                this.debouncedCacheUpdate(); // Update cache for completed turns to immediately reflect the message count in the navigation console.
                // Mark this turn as processed to prevent redundant executions.
                this.processedTurnNodes.add(turnNode);
            } else {
                // This branch handles streaming turns using the efficient Sentinel observer.
                const sentinelCallback = (completionElement) => {
                    // Ensure the completion element belongs to the turn we are observing.
                    const completedTurnNode = completionElement.closest(CONSTANTS.SELECTORS.CONVERSATION_CONTAINER);
                    if (completedTurnNode !== turnNode) return;

                    // Self-remove the listener to prevent memory leaks and redundant calls.
                    sentinel.off(CONSTANTS.SELECTORS.TURN_COMPLETE_SELECTOR, sentinelCallback);
                    this.sentinelTurnListeners.delete(turnNode);

                    EventBus.publish(EVENTS.TURN_COMPLETE, turnNode);

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

    class AvatarManager {
        /**
         * @param {ConfigManager} configManager
         * @param messageCacheManager
         */
        constructor(configManager, messageCacheManager) {
            this.configManager = configManager;
            this.messageCacheManager = messageCacheManager;
            this.subscriptions = [];
            // A queue to hold incoming avatar injection requests.
            this._injectionQueue = [];
            // A debounced function to process the queue in a single batch.
            this._debouncedProcessQueue = debounce(this._processInjectionQueue.bind(this), CONSTANTS.TIMING.DEBOUNCE_DELAYS.AVATAR_INJECTION);
            this._handleAvatarDisappearance = (element) => {
                if (element instanceof HTMLElement) {
                    this.queueForInjection(element);
                }
            };
        }

        _subscribe(event, listener) {
            const key = createEventKey(this, event);
            EventBus.subscribe(event, listener, key);
            this.subscriptions.push({ event, key });
        }

        /**
         * Initializes the manager by injecting styles and subscribing to events.
         */
        init() {
            this.injectAvatarStyle();
            // Instead of processing immediately, queue the element for batch processing.
            this._subscribe(EVENTS.AVATAR_INJECT, (elem) => this.queueForInjection(elem));
            this._subscribe(EVENTS.APP_SHUTDOWN, () => this.destroy());

            // Use the Sentinel class to detect when an avatar has been removed from a processed element.
            // This is a highly performant self-healing mechanism.
            const disappearanceSelector = `.${APPID}-avatar-processed:not(:has(${CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER}))`;
            sentinel.on(disappearanceSelector, this._handleAvatarDisappearance);
        }

        destroy() {
            this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
            this.subscriptions = [];
            document.getElementById(`${APPID}-avatar-style`)?.remove();
            // Clean up the listener from the Sentinel instance.
            const disappearanceSelector = `.${APPID}-avatar-processed:not(:has(${CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER}))`;
            sentinel.off(disappearanceSelector, this._handleAvatarDisappearance);
        }

        /**
         * Adds a message element to the injection queue and triggers the debounced processor.
         * @param {HTMLElement} msgElem The message element to process.
         */
        queueForInjection(msgElem) {
            const ATTEMPT_KEY = 'avatarInjectAttempts';
            const MAX_ATTEMPTS = 5;

            const attempts = parseInt(msgElem.dataset[ATTEMPT_KEY] || '0', 10);

            if (attempts >= MAX_ATTEMPTS) {
                // Log the failure only once to avoid spamming the console.
                if (!msgElem.dataset.avatarInjectFailed) {
                    Logger.warn(`Avatar injection for an element failed after ${MAX_ATTEMPTS} attempts. Halting retries for this element:`, msgElem);
                    msgElem.dataset.avatarInjectFailed = 'true';
                }
                return; // Stop trying
            }

            msgElem.dataset[ATTEMPT_KEY] = String(attempts + 1);

            if (!this._injectionQueue.includes(msgElem)) {
                this._injectionQueue.push(msgElem);
            }
            this._debouncedProcessQueue();
        }

        /**
         * Processes all queued avatar injection requests in a batch to optimize performance.
         * This method separates DOM writes from reads to prevent layout thrashing.
         * @private
         */
        _processInjectionQueue() {
            if (this._injectionQueue.length === 0) {
                return;
            }
            Logger.debug(`Processing avatar injection queue with ${this._injectionQueue.length} items.`);

            const messagesToProcess = [...this._injectionQueue];
            this._injectionQueue = [];

            processInBatches(
                messagesToProcess,
                (msgElem) => {
                    const role = PlatformAdapters.General.getMessageRole(msgElem);
                    if (!role) return;

                    const container = h(`div${CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER}`, [h(`span${CONSTANTS.SELECTORS.SIDE_AVATAR_ICON}`), h(`div${CONSTANTS.SELECTORS.SIDE_AVATAR_NAME}`)]);
                    if (container instanceof HTMLElement) {
                        PlatformAdapters.Avatar.addAvatarToMessage(msgElem, container);

                        // On successful injection attempt, remove the counter.
                        // If the injection somehow fails and the avatar is still missing,
                        // Sentinel will re-queue it, and the counter will be incremented again.
                        // Also clear the permanent failure flag.
                        delete msgElem.dataset.avatarInjectAttempts;
                        delete msgElem.dataset.avatarInjectFailed;
                    }
                },
                CONSTANTS.BATCH_PROCESSING_SIZE
            );
        }

        /**
         * Injects the CSS for avatar styling.
         */
        injectAvatarStyle() {
            const styleId = `${APPID}-avatar-style`;
            const existingStyle = document.getElementById(styleId);
            if (existingStyle) {
                existingStyle.remove();
            }

            this.updateIconSizeCss();
            const iconSizeCssVar = `--${APPID}-icon-size`;
            const iconMarginCssVar = `--${APPID}-icon-margin`;

            const avatarStyle = h('style', {
                id: styleId,
                textContent: PlatformAdapters.Avatar.getCss(iconSizeCssVar, iconMarginCssVar),
            });
            document.head.appendChild(avatarStyle);
        }

        /**
         * Reads the icon size from config and applies it as a CSS variable.
         */
        updateIconSizeCss() {
            const iconSize = this.configManager.getIconSize();
            document.documentElement.style.setProperty(`--${APPID}-icon-size`, `${iconSize}px`);
            document.documentElement.style.setProperty(`--${APPID}-icon-margin`, `${CONSTANTS.ICON_MARGIN}px`);
        }
    }

    class StandingImageManager {
        /**
         * @param {ConfigManager} configManager
         * @param messageCacheManager
         */
        constructor(configManager, messageCacheManager) {
            this.configManager = configManager;
            this.messageCacheManager = messageCacheManager;
            this.subscriptions = [];
            this.isStreaming = false;
            this.debouncedRecalculateStandingImagesLayout = debounce(() => {
                if (this.isStreaming) return;
                EventBus.queueUIWork(this.recalculateStandingImagesLayout.bind(this));
            }, CONSTANTS.RETRY.STANDING_IMAGES_INTERVAL);
        }

        _subscribe(event, listener) {
            const key = createEventKey(this, event);
            EventBus.subscribe(event, listener, key);
            this.subscriptions.push({ event, key });
        }

        /**
         * Initializes the manager by injecting styles and subscribing to events.
         */
        init() {
            this.createContainers();
            this.injectStyles();
            this._subscribe(EVENTS.WINDOW_RESIZED, this.debouncedRecalculateStandingImagesLayout);
            this._subscribe(EVENTS.SIDEBAR_LAYOUT_CHANGED, this.debouncedRecalculateStandingImagesLayout);
            // Subscribe to the new event that fires after all images are processed.
            this._subscribe(EVENTS.THEME_APPLIED, () => {
                this.updateVisibility();
                this.debouncedRecalculateStandingImagesLayout();
            });
            this._subscribe(EVENTS.VISIBILITY_RECHECK, () => {
                this.updateVisibility();
            });
            // Subscribe to the UI reposition event to recalculate layout after transitions.
            this._subscribe(EVENTS.UI_REPOSITION, this.debouncedRecalculateStandingImagesLayout);
            this._subscribe(EVENTS.CHAT_CONTENT_WIDTH_UPDATED, this.debouncedRecalculateStandingImagesLayout);
            this._subscribe(EVENTS.APP_SHUTDOWN, () => this.destroy());
            this._subscribe(EVENTS.STREAMING_START, () => (this.isStreaming = true));
            this._subscribe(EVENTS.STREAMING_END, () => (this.isStreaming = false));
            this._subscribe(EVENTS.DEFERRED_LAYOUT_UPDATE, this.debouncedRecalculateStandingImagesLayout);
            PlatformAdapters.StandingImage.setupEventListeners(this);
        }

        destroy() {
            this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
            this.subscriptions = [];
            document.getElementById(`${APPID}-standing-image-user`)?.remove();
            document.getElementById(`${APPID}-standing-image-assistant`)?.remove();
            document.getElementById(`${APPID}-standing-image-style`)?.remove();
        }

        injectStyles() {
            const styleId = `${APPID}-standing-image-style`;
            if (document.getElementById(styleId)) return;

            document.head.appendChild(
                h('style', {
                    id: styleId,
                    textContent: `
                #${APPID}-standing-image-user,
                #${APPID}-standing-image-assistant {
                    position: fixed;
                    bottom: 0;
                    height: 100vh;
                    max-height: 100vh;
                    pointer-events: none;
                    z-index: ${CONSTANTS.Z_INDICES.STANDING_IMAGE};
                    margin: 0;
                    padding: 0;
                    opacity: 0;
                    transition: opacity 0.3s, background-image 0.3s ease-in-out;
                    background-repeat: no-repeat;
                    background-position: bottom center;
                    background-size: contain;
                }
                #${APPID}-standing-image-assistant {
                    background-image: var(--${APPID}-assistant-standing-image, none);
                    left: var(--${APPID}-standing-image-assistant-left, 0px);
                    width: var(--${APPID}-standing-image-assistant-width, 0px);
                    max-width: var(--${APPID}-standing-image-assistant-width, 0px);
                    mask-image: var(--${APPID}-standing-image-assistant-mask, none);
                    -webkit-mask-image: var(--${APPID}-standing-image-assistant-mask, none);
                }
                #${APPID}-standing-image-user {
                    background-image: var(--${APPID}-user-standing-image, none);
                    right: 0;
                    width: var(--${APPID}-standing-image-user-width, 0px);
                    max-width: var(--${APPID}-standing-image-user-width, 0px);
                    mask-image: var(--${APPID}-standing-image-user-mask, none);
                    -webkit-mask-image: var(--${APPID}-standing-image-user-mask, none);
                }
            `,
                })
            );
        }

        createContainers() {
            if (document.getElementById(`${APPID}-standing-image-assistant`)) return;
            ['user', 'assistant'].forEach((actor) => {
                document.body.appendChild(h(`div`, { id: `${APPID}-standing-image-${actor}` }));
            });
        }

        updateVisibility() {
            PlatformAdapters.StandingImage.updateVisibility(this);
        }

        /**
         * Recalculates the layout for the standing images.
         * @returns {Promise<void>}
         */
        async recalculateStandingImagesLayout() {
            PlatformAdapters.StandingImage.recalculateLayout(this);
        }
    }

    // =================================================================================
    // SECTION: Bubble Feature Management
    // =================================================================================

    /**
     * Manages the lifecycle of UI elements injected into chat bubbles, such as collapsible and navigation buttons.
     * It uses a feature-driven architecture, where each UI addition is a self-contained "feature" object.
     * This class acts as an engine that processes these features for each message element.
     */
    class BubbleUIManager {
        /**
         * @param {ConfigManager} configManager
         * @param {MessageCacheManager} messageCacheManager
         */
        constructor(configManager, messageCacheManager) {
            this.configManager = configManager;
            this.messageCacheManager = messageCacheManager;
            this.navContainers = new Map();
            this.featureElementsCache = new Map();
            this.subscriptions = [];

            /**
             * @private
             * @type {Array<object>}
             */
            this._features = [
                // Collapsible Button Feature Definition
                {
                    name: 'collapsible',
                    isEnabled: (config) => config.features.collapsible_button.enabled,
                    getInfo: (msgElem) => PlatformAdapters.BubbleUI.getCollapsibleInfo(msgElem),
                    render: (info, msgElem, manager) => {
                        const button = h(
                            `button.${APPID}-collapsible-toggle-btn`,
                            {
                                type: 'button',
                                title: 'Toggle message',
                                onclick: (e) => {
                                    e.stopPropagation();
                                    info.msgWrapper.classList.toggle(`${APPID}-bubble-collapsed`);
                                },
                            },
                            [this._createIcon('collapse')]
                        );
                        info.positioningParent.appendChild(button);
                        return button;
                    },
                    update: (element, info, isEnabled) => {
                        if (isEnabled && info) {
                            element.classList.remove(`${APPID}-hidden`);
                            info.msgWrapper.classList.add(`${APPID}-collapsible`);
                            info.bubbleElement.classList.add(`${APPID}-collapsible-content`);
                            info.positioningParent.classList.add(`${APPID}-collapsible-parent`);
                        } else {
                            element.classList.add(`${APPID}-hidden`);
                            if (info) {
                                info.msgWrapper.classList.remove(`${APPID}-collapsible`, `${APPID}-bubble-collapsed`);
                                info.bubbleElement.classList.remove(`${APPID}-collapsible-content`);
                                info.positioningParent.classList.remove(`${APPID}-collapsible-parent`);
                            }
                        }
                    },
                },
                // Sequential Navigation Buttons Feature Definition
                {
                    name: 'sequentialNav',
                    group: 'sideNav',
                    position: 'top',
                    isEnabled: (config) => config.features.sequential_nav_buttons.enabled,
                    getInfo: (msgElem) => PlatformAdapters.BubbleUI.getSequentialNavInfo(msgElem),
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
                        const prevBtn = h(
                            `button.${APPID}-bubble-nav-btn.${APPID}-nav-prev`,
                            { type: 'button', title: 'Scroll to previous message', dataset: { originalTitle: 'Scroll to previous message' }, onclick: createClickHandler(-1) },
                            [manager._createIcon('prev')]
                        );
                        const nextBtn = h(`button.${APPID}-bubble-nav-btn.${APPID}-nav-next`, { type: 'button', title: 'Scroll to next message', dataset: { originalTitle: 'Scroll to next message' }, onclick: createClickHandler(1) }, [
                            manager._createIcon('next'),
                        ]);
                        return h(`div.${APPID}-nav-group-top`, [prevBtn, nextBtn]);
                    },
                    update: (element, info, isEnabled) => {
                        element.classList.toggle(`${APPID}-hidden`, !isEnabled);
                    },
                },
                // Scroll to Top Button Feature Definition
                {
                    name: 'scrollToTop',
                    group: 'sideNav',
                    position: 'bottom',
                    isEnabled: (config) => config.features.scroll_to_top_button.enabled,
                    getInfo: (msgElem) => PlatformAdapters.BubbleUI.getScrollToTopInfo(msgElem),
                    render: (info, msgElem, manager) => {
                        const topBtn = h(
                            `button.${APPID}-bubble-nav-btn.${APPID}-nav-top`,
                            {
                                type: 'button',
                                title: 'Scroll to top of this message',
                                onclick: (e) => {
                                    e.stopPropagation();
                                    scrollToElement(msgElem, { offset: CONSTANTS.RETRY.SCROLL_OFFSET_FOR_NAV });
                                },
                            },
                            [manager._createIcon('top')]
                        );
                        return h(`div.${APPID}-nav-group-bottom`, [topBtn]);
                    },
                    update: (element, info, isEnabled) => {
                        element.classList.toggle(`${APPID}-hidden`, !isEnabled);
                    },
                },
            ];
        }

        _subscribe(event, listener) {
            const key = createEventKey(this, event);
            EventBus.subscribe(event, listener, key);
            this.subscriptions.push({ event, key });
        }

        /**
         * Initializes the manager by injecting styles and subscribing to events.
         */
        init() {
            this.injectStyle();
            this._subscribe(EVENTS.TURN_COMPLETE, (turnNode) => this.processTurn(turnNode));
            this._subscribe(EVENTS.NAVIGATION, () => this._onNavigation());
            this._subscribe(EVENTS.CACHE_UPDATED, () => this.updateAll());
            this._subscribe(EVENTS.APP_SHUTDOWN, () => this.destroy());
        }

        /**
         * Cleans up all event listeners and clears caches.
         */
        destroy() {
            this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
            this.subscriptions = [];
            document.getElementById(this.getStyleId())?.remove();
            this.navContainers.clear();
            this.featureElementsCache.clear();
        }

        /**
         * Forces a re-processing of all visible messages, typically after a config change.
         */
        updateAll() {
            this._syncCaches();
            const allMessages = this.messageCacheManager.getTotalMessages();
            processInBatches(
                allMessages,
                (messageElement) => {
                    this.processElement(messageElement);
                },
                CONSTANTS.BATCH_PROCESSING_SIZE,
                () => {
                    // Update nav button states after all elements have been processed.
                    this._updateNavButtonStates();
                }
            );
        }

        /**
         * Gets the unique ID for the style element.
         * @returns {string}
         */
        getStyleId() {
            return `${APPID}-bubble-ui-style`;
        }

        /**
         * Generates the consolidated CSS string for all bubble features.
         * @returns {string}
         */
        generateCss() {
            return SITE_STYLES.COLLAPSIBLE_CSS + '\n' + SITE_STYLES.BUBBLE_NAV_CSS;
        }

        /**
         * Injects the feature's specific CSS into the document head if not already present.
         */
        injectStyle() {
            const styleId = this.getStyleId();
            if (document.getElementById(styleId)) return;
            const style = h('style', {
                id: styleId,
                textContent: this.generateCss(),
            });
            document.head.appendChild(style);
        }

        /**
         * Processes a single message element, applying all relevant features.
         * @param {HTMLElement} messageElement The message element to process.
         */
        processElement(messageElement) {
            const config = this.configManager.get();
            if (!config) return;

            // Self-correction: If this element was previously marked as an image-only anchor but is now receiving content, remove the anchor class to restore normal layout.
            if (messageElement.classList.contains(`${APPID}-image-only-anchor`)) {
                messageElement.classList.remove(`${APPID}-image-only-anchor`);
            }

            const uniqueId = messageElement.dataset[`${APPID}UniqueId`] || (messageElement.dataset[`${APPID}UniqueId`] = generateUniqueId('msg'));

            // Phase 1: Read/Gather information without modifying the DOM.
            const featureTasks = this._features.map((feature) => ({
                feature,
                cacheKey: `${feature.name}-${uniqueId}`,
                isEnabled: feature.isEnabled(config),
                info: feature.getInfo(messageElement),
            }));

            // Phase 2: Write/Mutate the DOM based on the gathered information.
            let sideNavContainer = null;

            for (const task of featureTasks) {
                const { feature, cacheKey, isEnabled, info } = task;

                if (isEnabled && info) {
                    let featureElement = this.featureElementsCache.get(cacheKey);
                    if (!featureElement) {
                        featureElement = feature.render(info, messageElement, this);
                        if (featureElement) {
                            this.featureElementsCache.set(cacheKey, featureElement);

                            if (feature.group === 'sideNav') {
                                if (!sideNavContainer) {
                                    sideNavContainer = this._getOrCreateNavContainer(messageElement);
                                }
                                const navButtons = sideNavContainer?.querySelector(`.${APPID}-nav-buttons`);
                                if (feature.position === 'top') {
                                    navButtons?.prepend(featureElement);
                                } else {
                                    navButtons?.appendChild(featureElement);
                                }
                            }
                        }
                    }
                    if (featureElement) {
                        feature.update(featureElement, info, true);
                    }
                } else {
                    const featureElement = this.featureElementsCache.get(cacheKey);
                    if (featureElement) {
                        feature.update(featureElement, info, false);
                    }
                }
            }
        }

        /**
         * Processes a conversation turn after it has completed rendering.
         * @param {HTMLElement} turnNode The turn container element.
         */
        processTurn(turnNode) {
            /** @type {NodeListOf<HTMLElement>} */
            const allMessageElements = turnNode.querySelectorAll(CONSTANTS.SELECTORS.BUBBLE_FEATURE_MESSAGE_CONTAINERS);
            allMessageElements.forEach((messageElement) => {
                this.processElement(messageElement);
            });
        }

        /**
         * Resets caches on page navigation.
         * @private
         */
        _onNavigation() {
            this.navContainers.clear();
            this.featureElementsCache.clear();
        }

        /**
         * Removes stale entries from caches.
         * @private
         */
        _syncCaches() {
            // Remove entries for messages that are no longer in the DOM.
            syncCacheWithMessages(this.navContainers, this.messageCacheManager);

            // Remove entries for feature elements that are no longer connected to the DOM.
            for (const [key, element] of this.featureElementsCache.entries()) {
                if (!element.isConnected) {
                    this.featureElementsCache.delete(key);
                }
            }
        }

        /**
         * Creates an SVG icon element from a predefined map.
         * @param {string} type The type of icon to create.
         * @returns {SVGElement | null}
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
            const element = createIconFromDef(SITE_STYLES.ICONS[iconKey]);
            if (element instanceof SVGElement) {
                return element;
            }
            return null;
        }

        /**
         * Retrieves or creates the shared navigation button container for a message element.
         * @private
         * @param {HTMLElement} messageElement The message to attach the container to.
         * @returns {HTMLElement | null} The navigation container element.
         */
        _getOrCreateNavContainer(messageElement) {
            if (this.navContainers.has(messageElement)) {
                return this.navContainers.get(messageElement);
            }

            const positioningParent = PlatformAdapters.BubbleUI.getNavPositioningParent(messageElement);
            if (!positioningParent) {
                Logger.warn('Navigation button container could not be attached. Positioning parent not found for:', messageElement);
                return null;
            }

            let container = messageElement.querySelector(`.${APPID}-bubble-nav-container`);
            if (container instanceof HTMLElement) {
                this.navContainers.set(messageElement, container);
                return container;
            }

            positioningParent.style.position = 'relative';
            positioningParent.classList.add(`${APPID}-bubble-parent-with-nav`);

            container = h(`div.${APPID}-bubble-nav-container`, [h(`div.${APPID}-nav-buttons`)]);
            if (!(container instanceof HTMLElement)) return null;

            positioningParent.appendChild(container);
            this.navContainers.set(messageElement, container);
            return container;
        }

        /**
         * Updates the enabled/disabled state of sequential navigation buttons.
         * @private
         */
        _updateNavButtonStates() {
            this._syncCaches(); // Clean up caches before processing
            const disabledHint = '(No message to scroll to)';
            const updateActorButtons = (messages) => {
                messages.forEach((message, index) => {
                    const container = this.navContainers.get(message);
                    if (!container) return;
                    const prevBtn = container.querySelector(`.${APPID}-nav-prev`);
                    if (prevBtn) {
                        const isDisabled = index === 0;
                        prevBtn.disabled = isDisabled;
                        prevBtn.title = isDisabled ? `${prevBtn.dataset.originalTitle} ${disabledHint}` : prevBtn.dataset.originalTitle;
                    }
                    const nextBtn = container.querySelector(`.${APPID}-nav-next`);
                    if (nextBtn) {
                        const isDisabled = index === messages.length - 1;
                        nextBtn.disabled = isDisabled;
                        nextBtn.title = isDisabled ? `${nextBtn.dataset.originalTitle} ${disabledHint}` : nextBtn.dataset.originalTitle;
                    }
                });
            };
            updateActorButtons(this.messageCacheManager.getUserMessages());
            updateActorButtons(this.messageCacheManager.getAssistantMessages());
        }
    }

    // =================================================================================
    // SECTION: Fixed Navigation Console
    // Description: Manages the fixed navigation UI docked to the input area.
    // =================================================================================

    class JumpListComponent {
        constructor(role, messages, highlightedMessage, callbacks, siteStyles, initialFilterValue = '') {
            this.role = role;
            this.messages = messages;
            this.callbacks = callbacks;
            this.siteStyles = siteStyles;

            // Pre-cache the display text for each message to avoid repeated DOM queries during filtering.
            this.searchableMessages = this.messages.map((msg) => ({
                element: msg,
                text: PlatformAdapters.General.getJumpListDisplayText(msg),
            }));

            // --- Component state ---
            this.state = {
                highlightedMessage: highlightedMessage,
                initialFilterValue: initialFilterValue,
                filteredMessages: [],
                scrollTop: 0,
                focusedIndex: -1,
                isRendering: false,
            };

            // --- Virtual scroll properties ---
            this.itemHeight = 34; // The fixed height of each list item in pixels.
            this.element = null; // The main component container
            this.scrollBox = null; // The dedicated scrolling element
            this.listElement = null; // The inner element that provides the virtual height
            this.previewTooltip = null;
            this.hideTimeout = null;
            this.hoveredItem = null;

            // Bind event handlers
            this._handleClick = this._handleClick.bind(this);
            this._handleFilter = this._handleFilter.bind(this);
            this._handleKeyDown = this._handleKeyDown.bind(this);
            this._handleFilterKeyDown = this._handleFilterKeyDown.bind(this);
            this._handleScroll = this._handleScroll.bind(this);
        }

        render() {
            // 1. The inner list (ul) acts as a "sizer" or "spacer".
            // It has no overflow and its height is set to the total virtual height of all items.
            this.listElement = h(`ul#${APPID}-jump-list`, {
                style: { position: 'relative', overflow: 'hidden', height: '0px' },
            });

            // 2. The scrollBox (div) is the "viewport".
            // It is the element that actually scrolls and has a fixed visible height.
            this.scrollBox = h(`div.${APPID}-jump-list-scrollbox`, {
                onkeydown: this._handleKeyDown,
                tabindex: -1,
                style: {
                    overflowY: 'auto',
                    position: 'relative',
                    flex: '1 1 auto', // Allows this box to fill the available space in the flex container.
                },
            });
            this.scrollBox.appendChild(this.listElement);
            this.scrollBox.addEventListener('scroll', this._handleScroll, { passive: true });

            // 3. The filter input container.
            const filterInput = h('input', {
                type: 'text',
                placeholder: 'Filter with text or /pattern/flags',
                title: 'Filter by plain text or a regular expression.\nEnter text for a simple search.\nUse /regex/flags format for advanced filtering.',
                className: `${APPID}-jump-list-filter`,
                value: this.state.initialFilterValue,
                oninput: this._handleFilter,
                onkeydown: this._handleFilterKeyDown,
                onclick: (e) => e.stopPropagation(),
            });
            const modeLabel = h('span', { className: `${APPID}-jump-list-mode-label` });
            const inputContainer = h(`div.${APPID}-jump-list-filter-container`, [filterInput, modeLabel]);

            // 4. The main element (div) handles the overall layout using flexbox.
            this.element = h(`div#${APPID}-jump-list-container`, {
                onclick: this._handleClick,
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden', // Important to prevent the main container itself from scrolling.
                },
            });

            this.element.append(this.scrollBox, inputContainer);
            this._createPreviewTooltip();
            return this.element;
        }

        show(anchorElement) {
            if (!this.element) this.render();
            document.body.appendChild(this.element);

            // Manually trigger the filter once on show to apply the initial value
            this._handleFilter({ target: this.element.querySelector(`.${APPID}-jump-list-filter`) });

            requestAnimationFrame(() => {
                const anchorRect = anchorElement.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const margin = 8;
                const topLimit = viewportHeight * 0.3;

                this.element.style.left = `${anchorRect.left}px`;
                this.element.style.bottom = `${viewportHeight - anchorRect.top + 4}px`;
                this.element.style.width = `360px`;

                const maxHeight = anchorRect.top - topLimit - margin;
                this.element.style.maxHeight = `${Math.max(100, maxHeight)}px`;

                this.element.classList.add('is-visible');
                const filterInput = this.element.querySelector(`.${APPID}-jump-list-filter`);
                if (filterInput instanceof HTMLInputElement) {
                    filterInput.focus();
                    filterInput.select();
                }
            });
        }

        destroy() {
            if (!this.element) return;
            this._hidePreview();
            this.previewTooltip?.remove();
            this.element.remove();
            this.element = null;
            this.previewTooltip = null;
        }

        updateHighlightedMessage(newMessage) {
            this.state.highlightedMessage = newMessage;
            // Re-render visible items to update the '.is-current' class
            this._renderUI();
        }

        _createPreviewTooltip() {
            if (this.previewTooltip) return;
            this.previewTooltip = h(`div#${APPID}-jump-list-preview`);
            this.previewTooltip.addEventListener('mouseenter', () => clearTimeout(this.hideTimeout));
            this.previewTooltip.addEventListener('mouseleave', () => this._revertToFocusedPreview());
            document.body.appendChild(this.previewTooltip);
        }

        _showPreview(index) {
            if (!this.previewTooltip || index < 0 || index >= this.state.filteredMessages.length) {
                this._hidePreview();
                return;
            }

            const searchableMessage = this.state.filteredMessages[index];
            if (!searchableMessage) {
                this._hidePreview();
                return;
            }

            const fullText = (searchableMessage.text || '').replace(/\s+/g, ' ').trim();
            const filterInput = this.element.querySelector(`.${APPID}-jump-list-filter`);
            const searchTerm = filterInput instanceof HTMLInputElement ? filterInput.value : '';

            const contentFragment = document.createDocumentFragment();
            contentFragment.appendChild(document.createTextNode(`${this.messages.indexOf(searchableMessage.element) + 1}: `));

            let regex = null;
            if (searchTerm.trim()) {
                const regexMatch = searchTerm.match(/^\/(.*)\/([gimsuy]*)$/);
                if (regexMatch && filterInput?.classList.contains('is-regex-valid')) {
                    // This will be a valid regex because it's pre-validated in _handleFilter
                    regex = new RegExp(regexMatch[1], regexMatch[2]);
                } else {
                    // Fallback to plain string search for highlighting
                    regex = new RegExp(escapeRegExp(searchTerm), 'gi');
                }
            }

            if (regex) {
                const parts = fullText.split(regex);
                const matches = fullText.match(regex) || [];
                parts.forEach((part, i) => {
                    contentFragment.appendChild(document.createTextNode(part));
                    if (i < parts.length - 1) {
                        contentFragment.appendChild(h('strong', matches[i]));
                    }
                });
            } else {
                contentFragment.appendChild(document.createTextNode(fullText));
            }

            this.previewTooltip.textContent = '';
            this.previewTooltip.appendChild(contentFragment);

            withLayoutCycle({
                measure: () => {
                    const listItem = this.listElement.querySelector(`li[data-filtered-index="${index}"]`);
                    if (!this.element || !this.previewTooltip || !(listItem instanceof HTMLElement)) {
                        return null;
                    }
                    return {
                        listRect: this.element.getBoundingClientRect(),
                        itemRect: listItem.getBoundingClientRect(),
                        tooltipRect: this.previewTooltip.getBoundingClientRect(),
                        windowWidth: window.innerWidth,
                        windowHeight: window.innerHeight,
                    };
                },
                mutate: (measured) => {
                    if (!measured) {
                        this._hidePreview();
                        return;
                    }

                    const { listRect, itemRect, tooltipRect, windowWidth, windowHeight } = measured;
                    const margin = 12;

                    let top = itemRect.top;
                    let left = listRect.right + margin;

                    if (left + tooltipRect.width > windowWidth - margin) {
                        left = listRect.left - tooltipRect.width - margin;
                    }
                    if (top + tooltipRect.height > windowHeight - margin) {
                        top = windowHeight - tooltipRect.height - margin;
                    }
                    top = Math.max(margin, top);
                    left = Math.max(margin, left);

                    this.previewTooltip.style.left = `${left}px`;
                    this.previewTooltip.style.top = `${top}px`;
                    this.previewTooltip.classList.add('is-visible');
                },
            });
        }

        _hidePreview() {
            if (this.previewTooltip) {
                this.previewTooltip.classList.remove('is-visible');
            }
        }

        _revertToFocusedPreview() {
            if (this.state.focusedIndex > -1) {
                this._showPreview(this.state.focusedIndex);
            } else {
                this._hidePreview();
            }
        }

        _createListItem(searchableMessage, index) {
            const messageElement = searchableMessage.element;
            const originalIndex = this.messages.indexOf(messageElement);
            const role = PlatformAdapters.General.getMessageRole(messageElement);

            // Use the adapter to get the appropriate display text, handling platform differences.
            const textContent = (searchableMessage.text || '').replace(/\s+/g, ' ').trim();

            const displayText = `${originalIndex + 1}: ${textContent}`;

            const item = h(
                'li',
                {
                    dataset: {
                        messageIndex: originalIndex,
                        filteredIndex: index,
                    },
                    style: {
                        position: 'absolute',
                        top: `${index * this.itemHeight}px`,
                        height: `${this.itemHeight}px`,
                        width: '100%',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                    },
                    onmouseenter: (e) => {
                        clearTimeout(this.hideTimeout);
                        this.hoveredItem = e.currentTarget;
                        this._showPreview(index);
                    },
                    onmouseleave: () => {
                        this.hoveredItem = null;
                        this.hideTimeout = setTimeout(() => this._revertToFocusedPreview(), 200);
                    },
                },
                displayText
            );

            if (this.state.highlightedMessage === messageElement) {
                item.classList.add('is-current');
            }
            if (this.state.focusedIndex === index) {
                item.classList.add('is-focused');
            }
            if (role) {
                item.classList.add(role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_USER ? 'user-item' : 'assistant-item');
            }

            return item;
        }

        _filterMessages(searchTerm, inputElement) {
            const modeLabel = this.element.querySelector(`.${APPID}-jump-list-mode-label`);
            let regex = null;

            inputElement.classList.remove('is-regex-valid');
            modeLabel.setAttribute('class', `${APPID}-jump-list-mode-label is-string`);
            modeLabel.textContent = 'Text';

            const regexMatch = searchTerm.match(/^\/(.*)\/([gimsuy]*)$/);
            if (regexMatch) {
                try {
                    regex = new RegExp(regexMatch[1], regexMatch[2]);
                    inputElement.classList.add('is-regex-valid');
                    modeLabel.setAttribute('class', `${APPID}-jump-list-mode-label is-regex`);
                    modeLabel.textContent = 'RegExp';
                } catch {
                    // Invalid regex, remains null and will be treated as a plain string.
                    modeLabel.setAttribute('class', `${APPID}-jump-list-mode-label is-regex-invalid`);
                    modeLabel.textContent = 'Invalid';
                }
            }

            const lowerCaseSearchTerm = searchTerm.toLowerCase();

            return this.searchableMessages.filter((msg) => {
                const originalItemText = msg.text;

                if (regex) {
                    // For regex, test against the original, case-preserved text.
                    // The user controls case-sensitivity with the 'i' flag.
                    return regex.test(originalItemText);
                } else {
                    // For plain text, perform a case-insensitive search.
                    const lowerCaseItemText = originalItemText.toLowerCase();
                    return lowerCaseSearchTerm === '' || lowerCaseItemText.includes(lowerCaseSearchTerm);
                }
            });
        }

        _getVisibleRange() {
            if (!this.scrollBox) return { startIndex: 0, endIndex: -1 };

            const containerHeight = this.scrollBox.clientHeight;
            const buffer = 5;
            const startIndex = Math.max(0, Math.floor(this.state.scrollTop / this.itemHeight) - buffer);

            if (containerHeight === 0) {
                // Initial render, container height not yet known. Render a default batch.
                const initialBatchSize = 20;
                const endIndex = Math.min(this.state.filteredMessages.length - 1, initialBatchSize);
                return { startIndex: 0, endIndex };
            }

            const endIndex = Math.min(this.state.filteredMessages.length - 1, Math.ceil((this.state.scrollTop + containerHeight) / this.itemHeight) + buffer);
            return { startIndex, endIndex };
        }

        _renderUI() {
            if (!this.listElement || !this.scrollBox) return;

            // Step 1: Update the virtual height immediately to ensure correct layout calculations.
            this.listElement.style.height = `${this.state.filteredMessages.length * this.itemHeight}px`;

            // Step 2: Determine the new visible range.
            const { startIndex, endIndex } = this._getVisibleRange();
            const visibleIndices = new Set();
            for (let i = startIndex; i <= endIndex; i++) {
                visibleIndices.add(i);
            }

            // Step 3: Map existing DOM elements for efficient lookup.
            const existingElements = new Map(
                Array.from(this.listElement.children)
                    .filter((el) => el instanceof HTMLElement)
                    .map((el) => [parseInt(el.dataset.filteredIndex, 10), el])
            );

            // Step 4: Reconcile the DOM against the new state.
            const fragment = document.createDocumentFragment();

            // First, remove any elements that are no longer in the visible range.
            for (const [index, element] of existingElements.entries()) {
                if (!visibleIndices.has(index)) {
                    element.remove();
                }
            }

            // Then, add or update elements that should be visible.
            for (let i = startIndex; i <= endIndex; i++) {
                const message = this.state.filteredMessages[i];
                const existingEl = existingElements.get(i);

                if (existingEl) {
                    // Element exists, just update its state (e.g., current/focused classes).
                    existingEl.classList.toggle('is-current', this.state.highlightedMessage === message);
                    existingEl.classList.toggle('is-focused', this.state.focusedIndex === i);
                } else {
                    // Element is missing, create it and add to the fragment for batch insertion.
                    const newItem = this._createListItem(message, i);
                    fragment.appendChild(newItem);
                }
            }

            // Append all new items at once.
            if (fragment.children.length > 0) {
                this.listElement.appendChild(fragment);
            }
        }

        _updateFocus(shouldScroll = true) {
            if (!this.scrollBox) return;

            if (shouldScroll && this.state.focusedIndex > -1) {
                const itemTop = this.state.focusedIndex * this.itemHeight;
                const itemBottom = itemTop + this.itemHeight;
                const viewTop = this.scrollBox.scrollTop;
                const viewBottom = viewTop + this.scrollBox.clientHeight;

                if (itemTop < viewTop) {
                    this.scrollBox.scrollTop = itemTop;
                } else if (itemBottom > viewBottom) {
                    this.scrollBox.scrollTop = itemBottom - this.scrollBox.clientHeight;
                }
                // Update state after potential scroll change
                this.state.scrollTop = this.scrollBox.scrollTop;
            }

            this._renderUI();

            // Defer the preview update to the next animation frame.
            // This ensures that the DOM updates from _renderUI have been rendered by the browser,
            // making the target <li> element available for _showPreview to find.
            requestAnimationFrame(() => {
                if (this.state.focusedIndex > -1) {
                    this._showPreview(this.state.focusedIndex);
                } else {
                    this._hidePreview();
                }
            });
        }

        _handleScroll(event) {
            this.state.scrollTop = event.target.scrollTop;
            if (!this.state.isRendering) {
                requestAnimationFrame(() => {
                    this._renderUI();
                    this.state.isRendering = false;
                });
                this.state.isRendering = true;
            }
        }

        _handleFilter(event) {
            const inputElement = event.target;
            const searchTerm = inputElement.value;

            if (this.listElement) {
                this.listElement.textContent = '';
            }

            // Update state
            this.state.filteredMessages = this._filterMessages(searchTerm, inputElement);
            this.state.focusedIndex = -1;
            this.state.scrollTop = 0;
            if (this.scrollBox) this.scrollBox.scrollTop = 0;

            this._renderUI();
            this._hidePreview();
        }

        _handleFilterKeyDown(event) {
            if (this.state.filteredMessages.length === 0) return;

            switch (event.key) {
                case 'ArrowDown':
                case 'Tab':
                    if (!event.shiftKey) {
                        event.preventDefault();
                        this.state.focusedIndex = 0;
                        this._updateFocus(true);
                        this.scrollBox.focus({ preventScroll: true });
                    }
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    this.state.focusedIndex = this.state.filteredMessages.length - 1;
                    this._updateFocus(true);
                    this.scrollBox.focus({ preventScroll: true });
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
            }
        }

        /** @param {KeyboardEvent} event */
        _handleKeyDown(event) {
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
                    const itemsPerPage = Math.floor(this.scrollBox.clientHeight / this.itemHeight);
                    newFocusedIndex = Math.min(totalItems - 1, newFocusedIndex + itemsPerPage);
                    break;
                }
                case 'PageUp': {
                    event.preventDefault();
                    if (newFocusedIndex === -1) newFocusedIndex = 0;
                    const itemsPerPage = Math.floor(this.scrollBox.clientHeight / this.itemHeight);
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
                    const filterInput = this.element.querySelector(`.${APPID}-jump-list-filter`);
                    if (filterInput instanceof HTMLInputElement) {
                        filterInput.focus();
                        filterInput.select();
                    }
                    this.state.focusedIndex = -1;
                    this._updateFocus(false);
                    return; // Don't update focus on tab
                }
                default:
                    return;
            }

            if (newFocusedIndex !== this.state.focusedIndex) {
                this.state.focusedIndex = newFocusedIndex;
                this._updateFocus(true);
            }
        }

        getFilterValue() {
            const filterInput = this.element?.querySelector(`.${APPID}-jump-list-filter`);
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

            const originalIndex = parseInt(listItem.dataset.messageIndex, 10);
            if (!isNaN(originalIndex) && this.messages[originalIndex]) {
                this.callbacks.onSelect?.(this.messages[originalIndex]);
            }
        }
    }

    class FixedNavigationManager {
        /**
         * @param {object} dependencies
         * @param {MessageCacheManager} dependencies.messageCacheManager
         * @param {ConfigManager} dependencies.configManager
         * @param {any} dependencies.autoScrollManager
         * @param {MessageLifecycleManager} dependencies.messageLifecycleManager
         * @param {object} [options]
         */
        constructor({ messageCacheManager, configManager, autoScrollManager, messageLifecycleManager }, options = {}) {
            this.messageCacheManager = messageCacheManager;
            this.configManager = configManager;
            this.autoScrollManager = autoScrollManager; // May be null
            this.messageLifecycleManager = messageLifecycleManager;

            // Centralized state management
            this.state = {
                currentIndices: { user: -1, asst: -1, total: -1 },
                highlightedMessage: null,
                isInitialSelectionDone: !!options.isReEnabling,
                jumpListComponent: null,
                lastFilterValue: '',
                previousTotalMessages: 0,
                isAutoScrolling: false,
            };

            this.subscriptions = [];
            this.debouncedReposition = debounce(() => EventBus.queueUIWork(this.repositionContainers.bind(this)), CONSTANTS.TIMING.DEBOUNCE_DELAYS.NAVIGATION_UPDATE);

            this.handleBodyClick = this.handleBodyClick.bind(this);
            this._handleKeyDown = this._handleKeyDown.bind(this);
        }

        _subscribe(event, listener) {
            const key = createEventKey(this, event);
            EventBus.subscribe(event, listener, key);
            this.subscriptions.push({ event, key });
        }

        /**
         * Initializes the fixed navigation console.
         * @returns {Promise<void>}
         */
        async init() {
            this.injectStyle();
            this.createContainers();

            this._subscribe(EVENTS.CACHE_UPDATED, this._handleCacheUpdate.bind(this));
            this._subscribe(EVENTS.NAVIGATION, this.resetState.bind(this));
            this._subscribe(EVENTS.POLLING_MESSAGES_FOUND, this._handlePollingMessagesFound.bind(this));
            this._subscribe(EVENTS.NAV_HIGHLIGHT_MESSAGE, this.setHighlightAndIndices.bind(this));
            this._subscribe(EVENTS.WINDOW_RESIZED, this.debouncedReposition);
            this._subscribe(EVENTS.SIDEBAR_LAYOUT_CHANGED, this.debouncedReposition);
            this._subscribe(EVENTS.INPUT_AREA_RESIZED, this.debouncedReposition);
            this._subscribe(EVENTS.UI_REPOSITION, this.debouncedReposition);
            this._subscribe(EVENTS.APP_SHUTDOWN, () => this.destroy());
            this._subscribe(EVENTS.MESSAGE_COMPLETE, this._detectStreamingStart.bind(this));
            this._subscribe(EVENTS.TURN_COMPLETE, this._handleTurnComplete.bind(this));
            this._subscribe(EVENTS.DEFERRED_LAYOUT_UPDATE, this.debouncedReposition);

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

        resetState() {
            if (this.state.highlightedMessage) {
                this.state.highlightedMessage.classList.remove(`${APPID}-highlight-message`);
            }
            this.state = {
                currentIndices: { user: -1, asst: -1, total: -1 },
                highlightedMessage: null,
                isInitialSelectionDone: false,
                jumpListComponent: null,
                lastFilterValue: '',
                previousTotalMessages: 0,
                isAutoScrolling: false,
                isStreaming: false,
            };

            // Reset filter text
            this.lastFilterValue = '';

            // Reset the bulk collapse button to its default state
            const collapseBtn = this.navConsole?.querySelector(`#${APPID}-bulk-collapse-btn`);
            if (collapseBtn instanceof HTMLElement) {
                collapseBtn.dataset.state = 'expanded';
            }

            this._renderUI();
        }

        /**
         * Destroys the component and cleans up all related DOM elements and listeners.
         * @returns {void}
         */
        destroy() {
            if (this.state.highlightedMessage) {
                this.state.highlightedMessage.classList.remove(`${APPID}-highlight-message`);
            }

            this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
            this.subscriptions = [];

            this.state.jumpListComponent?.destroy();
            this.navConsole?.remove();
            this.navConsole = null;
            document.getElementById(`${APPID}-fixed-nav-style`)?.remove();
            document.body.removeEventListener('click', this.handleBodyClick, true);
            document.removeEventListener('keydown', this._handleKeyDown, true);
        }

        _detectStreamingStart(messageElement) {
            // Guard against re-entry if streaming is already detected.
            if (this.state.isStreaming) {
                return;
            }

            // Guard: Do not check for streaming during the initial page load or auto-scrolling phase.
            if (!this.state.isInitialSelectionDone || this.state.isAutoScrolling) {
                return;
            }

            const role = PlatformAdapters.General.getMessageRole(messageElement);
            // If an assistant message is detected and it's not yet complete, flag that streaming has started.
            if (role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_ASSISTANT) {
                const turnNode = messageElement.closest(CONSTANTS.SELECTORS.FIXED_NAV_TURN_CONTAINER);
                if (turnNode && !PlatformAdapters.Observer.isTurnComplete(turnNode)) {
                    this.state.isStreaming = true;
                    EventBus.publish(EVENTS.STREAMING_START);
                }
            }
        }

        _handleTurnComplete(turnNode) {
            // If streaming was in progress, reset the flag and trigger a cache update,
            // which will then update the UI with the final message counts.
            if (this.state.isStreaming) {
                this.state.isStreaming = false;
                EventBus.publish(EVENTS.STREAMING_END);
                this.messageCacheManager.debouncedRebuildCache();
                EventBus.publish(EVENTS.DEFERRED_LAYOUT_UPDATE);
            }
            // Also trigger a cache update for non-streaming turns (e.g., user messages)
            // to keep the nav console in sync.
            else {
                // Failsafe: If a non-streaming turn (like a user message) completes while
                // the flag is stuck on true (e.g., from a previously failed stream), reset it.
                if (this.state.isStreaming) {
                    this.state.isStreaming = false;
                    EventBus.publish(EVENTS.STREAMING_END);
                    EventBus.publish(EVENTS.DEFERRED_LAYOUT_UPDATE);
                }
                this.messageCacheManager.debouncedRebuildCache();
            }
        }

        _handlePollingMessagesFound() {
            this.selectLastMessage();
        }

        updateUI() {
            this._renderUI();
        }

        _handleCacheUpdate() {
            // Do not update the UI while a message is streaming to prevent flickering and performance issues.
            // The UI will be updated once the turn is complete.
            if (this.state.isStreaming) return;

            // If the jump list is open, a cache update means its data is stale.
            // Close it to prevent inconsistent state and user confusion.
            if (this.state.jumpListComponent) {
                this._hideJumpList();
                return; // Exit early to prevent further UI changes while the user was interacting.
            }

            const totalMessages = this.messageCacheManager.getTotalMessages();

            // Validate the currently highlighted message.
            if (this.state.highlightedMessage && !totalMessages.includes(this.state.highlightedMessage)) {
                Logger.log('Highlighted message was removed from the DOM. Reselecting...');
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
                this.setHighlightAndIndices(totalMessages[0]);
            }

            PlatformAdapters.FixedNav.handleInfiniteScroll(this, this.state.highlightedMessage, this.state.previousTotalMessages);
            this.state.previousTotalMessages = totalMessages.length;

            this._renderUI();
        }

        _renderUI() {
            if (!this.navConsole) return;
            const { currentIndices, highlightedMessage } = this.state;
            const userMessages = this.messageCacheManager.getUserMessages();
            const asstMessages = this.messageCacheManager.getAssistantMessages();
            const totalMessages = this.messageCacheManager.getTotalMessages();

            // Toggle visibility based on message count or if it's a new chat page
            if (totalMessages.length === 0 || isNewChatPage()) {
                this.navConsole.classList.add(`${APPID}-nav-hidden`);
            } else {
                this.navConsole.classList.remove(`${APPID}-nav-hidden`);
                // The first time it becomes visible, also remove the initial positioning-guard class.
                if (this.navConsole.classList.contains(`${APPID}-nav-unpositioned`)) {
                    this.navConsole.classList.remove(`${APPID}-nav-unpositioned`);
                }
            }

            this.navConsole.querySelector(`#${APPID}-nav-group-user .${APPID}-counter-total`).textContent = String(userMessages.length ? userMessages.length : '--');
            this.navConsole.querySelector(`#${APPID}-nav-group-assistant .${APPID}-counter-total`).textContent = String(asstMessages.length ? asstMessages.length : '--');
            this.navConsole.querySelector(`#${APPID}-nav-group-total .${APPID}-counter-total`).textContent = String(totalMessages.length ? totalMessages.length : '--');

            this.navConsole.querySelector(`#${APPID}-nav-group-user .${APPID}-counter-current`).textContent = String(currentIndices.user > -1 ? currentIndices.user + 1 : '--');
            this.navConsole.querySelector(`#${APPID}-nav-group-assistant .${APPID}-counter-current`).textContent = String(currentIndices.asst > -1 ? currentIndices.asst + 1 : '--');
            this.navConsole.querySelector(`#${APPID}-nav-group-total .${APPID}-counter-current`).textContent = String(currentIndices.total > -1 ? currentIndices.total + 1 : '--');

            document.querySelectorAll(`.${APPID}-highlight-message, .${APPID}-highlight-turn`).forEach((el) => {
                el.classList.remove(`${APPID}-highlight-message`);
                el.classList.remove(`${APPID}-highlight-turn`);
            });
            if (highlightedMessage) {
                highlightedMessage.classList.add(`${APPID}-highlight-message`);
                PlatformAdapters.FixedNav.applyAdditionalHighlight(highlightedMessage);
            }

            if (this.state.jumpListComponent) {
                this.state.jumpListComponent.updateHighlightedMessage(highlightedMessage);
            }

            // Update UI state for the auto-scroll feature.
            if (this.autoScrollManager) {
                const autoscrollBtn = this.navConsole.querySelector(`#${APPID}-autoscroll-btn`);
                if (autoscrollBtn instanceof HTMLButtonElement) {
                    autoscrollBtn.disabled = this.state.isAutoScrolling;
                }
            }

            // Update bulk collapse button visibility
            const config = this.configManager.get();
            const collapseBtn = this.navConsole.querySelector(`#${APPID}-bulk-collapse-btn`);
            if (collapseBtn instanceof HTMLElement) {
                const collapsibleEnabled = config?.features?.collapsible_button?.enabled ?? false;
                const shouldShow = collapsibleEnabled && totalMessages.length > 0;
                collapseBtn.style.display = shouldShow ? 'flex' : 'none';
                const separator = collapseBtn.previousElementSibling;
                if (separator instanceof HTMLElement && separator.classList.contains(`${APPID}-nav-separator`)) {
                    separator.style.display = shouldShow ? 'flex' : 'none';
                }
                this._updateBulkCollapseButtonTooltip(collapseBtn);
            }

            this.repositionContainers();
        }

        _updateBulkCollapseButtonTooltip(button) {
            if (!button) return;
            const currentState = button.dataset.state;
            // Set the tooltip to describe the action that WILL be taken on click.
            const tooltipText = currentState === 'expanded' ? 'Collapse all messages' : 'Expand all messages';
            button.title = tooltipText;
        }

        _toggleAllMessages() {
            const button = this.navConsole.querySelector(`#${APPID}-bulk-collapse-btn`);
            if (!(button instanceof HTMLElement)) return;

            const currentState = button.dataset.state;
            const nextState = currentState === 'expanded' ? 'collapsed' : 'expanded';
            button.dataset.state = nextState;
            this._updateBulkCollapseButtonTooltip(button);

            const messages = document.querySelectorAll(`.${APPID}-collapsible`);
            const shouldCollapse = nextState === 'collapsed';
            const highlightedMessage = this.state.highlightedMessage;

            messages.forEach((msg) => {
                msg.classList.toggle(`${APPID}-bubble-collapsed`, shouldCollapse);
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
         * Highlights a target message and updates the navigation counters to reflect its position.
         * @param {HTMLElement} targetMsg The message element to highlight and use as the reference for indices.
         * @returns {void}
         */
        setHighlightAndIndices(targetMsg) {
            if (!targetMsg) return;

            const userMessages = this.messageCacheManager.getUserMessages();
            const asstMessages = this.messageCacheManager.getAssistantMessages();
            const totalMessages = this.messageCacheManager.getTotalMessages();

            const newIndices = {
                total: totalMessages.indexOf(targetMsg),
                user: -1,
                asst: -1,
            };

            const role = PlatformAdapters.General.getMessageRole(targetMsg);

            if (role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_USER) {
                newIndices.user = userMessages.indexOf(targetMsg);
                newIndices.asst = this.findNearestIndex(targetMsg, asstMessages);
            } else {
                newIndices.asst = asstMessages.indexOf(targetMsg);
                newIndices.user = this.findNearestIndex(targetMsg, userMessages);
            }

            this.state.highlightedMessage = targetMsg;
            this.state.currentIndices = newIndices;

            this._renderUI();
        }

        /**
         * @private
         * @description Finds the index of the message in a given array that is nearest to the current message, using DOM order. This avoids performance-intensive layout calculations.
         * @description It iterates backwards through a master list of all messages from the current message's position, looking for the first message that exists in the target role's array.
         * @param {HTMLElement} currentMsg The reference message element.
         * @param {HTMLElement[]} messageArray The array of messages (e.g., only user messages) to search within.
         * @returns {number} The index of the nearest message in `messageArray`, or -1 if not found.
         */
        findNearestIndex(currentMsg, messageArray) {
            if (messageArray.length === 0) {
                return -1;
            }

            const totalMessages = this.messageCacheManager.getTotalMessages();
            const currentIndexInTotal = totalMessages.indexOf(currentMsg);

            if (currentIndexInTotal === -1) {
                return -1; // Should not happen in normal operation
            }

            // Create a Set for efficient O(1) average time complexity lookups.
            const messageSet = new Set(messageArray);

            // Iterate backwards from the current message's position in the master list.
            for (let i = currentIndexInTotal; i >= 0; i--) {
                const candidateMsg = totalMessages[i];
                // Check if the candidate message belongs to the target role array.
                if (messageSet.has(candidateMsg)) {
                    // Found the nearest message. Now, find its index within its own role array.
                    return messageArray.indexOf(candidateMsg);
                }
            }

            return -1; // Fallback if no preceding message is found
        }

        /**
         * Handles clicks on the main navigation buttons (prev, next, etc.).
         * @param {HTMLElement} buttonElement The navigation button element that was clicked.
         * @returns {void}
         */
        handleButtonClick(buttonElement) {
            const navCommand = buttonElement.dataset.nav;
            if (!navCommand) return;

            const [role, direction] = navCommand.split('-');
            if (role && direction) {
                this._navigateTo(role, direction);
            }
        }

        /**
         * Navigates to a message based on role and direction.
         * @private
         * @param {string} role The role to navigate within ('user', 'asst', 'total').
         * @param {string} direction The direction to navigate ('prev', 'next', 'first', 'last').
         */
        _navigateTo(role, direction) {
            const { user: currentUserIndex, asst: currentAsstIndex, total: currentTotalIndex } = this.state.currentIndices;
            const roleMap = {
                user: { messages: this.messageCacheManager.getUserMessages(), currentIndex: currentUserIndex },
                asst: { messages: this.messageCacheManager.getAssistantMessages(), currentIndex: currentAsstIndex },
                total: { messages: this.messageCacheManager.getTotalMessages(), currentIndex: currentTotalIndex },
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

        /**
         * Handles clicks on the navigation counters, allowing the user to jump to a specific message number.
         * @param {MouseEvent} e The click event object.
         * @param {HTMLElement} counterSpan The counter span element that was clicked.
         * @returns {void}
         */
        handleCounterClick(e, counterSpan) {
            const role = counterSpan.dataset.role;
            const input = h(`input.${APPID}-nav-jump-input`, { type: 'text' });
            if (!(input instanceof HTMLInputElement)) return;

            counterSpan.classList.add('is-hidden');
            counterSpan.parentNode.insertBefore(input, counterSpan.nextSibling);
            input.focus();

            let isEditing = true;

            const endEdit = (shouldJump) => {
                if (!isEditing) return;
                isEditing = false;

                if (shouldJump) {
                    const num = parseInt(input.value, 10);
                    if (!isNaN(num)) {
                        const roleMap = {
                            user: this.messageCacheManager.getUserMessages(),
                            asst: this.messageCacheManager.getAssistantMessages(),
                            total: this.messageCacheManager.getTotalMessages(),
                        };
                        const targetArray = roleMap[role];
                        const index = num - 1;
                        if (targetArray && index >= 0 && index < targetArray.length) {
                            this.navigateToMessage(targetArray[index]);
                        }
                    }
                }
                input.remove();
                counterSpan.classList.remove('is-hidden');
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

        navigateToMessage(element) {
            if (!element) return;
            this.setHighlightAndIndices(element);
            this._scrollToMessage(element);
        }

        _scrollToMessage(element) {
            if (!element) return;
            const targetToScroll = element;
            scrollToElement(targetToScroll, { offset: CONSTANTS.RETRY.SCROLL_OFFSET_FOR_NAV });
        }

        /**
         * Repositions the navigation console to align with the main input form.
         * @returns {void}
         */
        repositionContainers() {
            const inputForm = document.querySelector(CONSTANTS.SELECTORS.FIXED_NAV_INPUT_AREA_TARGET);
            if (!inputForm || !this.navConsole) return;

            // Use withLayoutCycle to prevent layout thrashing
            withLayoutCycle({
                measure: () => {
                    // --- Read Phase ---
                    return {
                        formRect: inputForm.getBoundingClientRect(),
                        consoleWidth: this.navConsole.offsetWidth,
                        windowHeight: window.innerHeight,
                    };
                },
                mutate: (measured) => {
                    // --- Write Phase ---
                    if (!measured) return;

                    const { formRect, consoleWidth, windowHeight } = measured;
                    const bottomPosition = `${windowHeight - formRect.top + 8}px`;
                    const formCenter = formRect.left + formRect.width / 2;

                    this.navConsole.style.left = `${formCenter - consoleWidth / 2}px`;
                    this.navConsole.style.bottom = bottomPosition;
                },
            });
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

        hideJumpList() {
            this._hideJumpList();
        }

        _toggleJumpList(labelElement) {
            const role = labelElement.dataset.role;
            if (this.state.jumpListComponent?.role === role) {
                this._hideJumpList();
                return;
            }

            this._hideJumpList();

            const roleMap = {
                user: this.messageCacheManager.getUserMessages(),
                asst: this.messageCacheManager.getAssistantMessages(),
                total: this.messageCacheManager.getTotalMessages(),
            };
            const messages = roleMap[role];
            if (!messages || messages.length === 0) return;

            this.state.jumpListComponent = new JumpListComponent(
                role,
                messages,
                this.state.highlightedMessage,
                {
                    onSelect: (message) => this._handleJumpListSelect(message),
                },
                SITE_STYLES.FIXED_NAV,
                this.state.lastFilterValue
            );
            this.state.jumpListComponent.show(labelElement);
        }

        _hideJumpList() {
            if (!this.state.jumpListComponent) return;
            this.state.lastFilterValue = this.state.jumpListComponent.getFilterValue();
            this.state.jumpListComponent.destroy();
            this.state.jumpListComponent = null;
        }

        _handleJumpListSelect(messageElement) {
            this.navigateToMessage(messageElement);
            this._hideJumpList();
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

            // If the click is inside the jump list, let the component handle it.
            if (this.state.jumpListComponent?.element.contains(target)) {
                return;
            }

            // Close the jump list if the click is outside both the console and the list itself.
            if (this.state.jumpListComponent && !this.navConsole?.contains(target)) {
                this._hideJumpList();
            }

            const navButton = target.closest(`.${APPID}-nav-btn`);
            if (navButton instanceof HTMLElement && this.navConsole?.contains(navButton)) {
                this.handleButtonClick(navButton);
                return;
            }

            const counter = target.closest(`.${APPID}-nav-counter[data-role]`);
            if (counter instanceof HTMLElement) {
                this.handleCounterClick(e, counter);
                return;
            }

            const label = target.closest(`.${APPID}-nav-label[data-role]`);
            if (label instanceof HTMLElement) {
                this._toggleJumpList(label);
                return;
            }

            const messageElement = target.closest(CONSTANTS.SELECTORS.FIXED_NAV_MESSAGE_CONTAINERS);
            if (messageElement instanceof HTMLElement && !target.closest(`a, button, input, #${APPID}-nav-console`)) {
                this.setHighlightAndIndices(messageElement);
            }
        }

        createContainers() {
            if (document.getElementById(`${APPID}-nav-console`)) return;
            const navConsole = h(`div#${APPID}-nav-console.${APPID}-nav-unpositioned`);
            if (!(navConsole instanceof HTMLElement)) return;
            this.navConsole = navConsole;
            document.body.appendChild(this.navConsole);

            this.renderInitialUI();
            this.attachEventListeners();
        }

        renderInitialUI() {
            if (!this.navConsole) return;

            const bulkCollapseBtn = h(
                `button#${APPID}-bulk-collapse-btn.${APPID}-nav-btn`,
                {
                    style: { display: 'none' },
                    dataset: { state: 'expanded' },
                    onclick: (e) => {
                        e.stopPropagation();
                        this._toggleAllMessages();
                    },
                },
                [createIconFromDef(SITE_STYLES.ICONS.bulkCollapse), createIconFromDef(SITE_STYLES.ICONS.bulkExpand)]
            );

            const platformButtons = PlatformAdapters.FixedNav.getPlatformSpecificButtons(this);

            const navUI = [
                ...platformButtons,
                h(`div#${APPID}-nav-group-assistant.${APPID}-nav-group`, [
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'asst-prev', title: 'Previous assistant message' }, [createIconFromDef(SITE_STYLES.ICONS.arrowUp)]),
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'asst-next', title: 'Next assistant message' }, [createIconFromDef(SITE_STYLES.ICONS.arrowDown)]),
                    h(`span.${APPID}-nav-label`, { 'data-role': 'asst', title: 'Show message list' }, 'Assistant:'),
                    h(`span.${APPID}-nav-counter`, { 'data-role': 'asst', title: 'Click to jump to a message' }, [h(`span.${APPID}-counter-current`, '--'), ' / ', h(`span.${APPID}-counter-total`, '--')]),
                ]),
                h(`div.${APPID}-nav-separator`),
                h(`div#${APPID}-nav-group-total.${APPID}-nav-group`, [
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'total-first', title: 'First message' }, [createIconFromDef(SITE_STYLES.ICONS.scrollToFirst)]),
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'total-prev', title: 'Previous message' }, [createIconFromDef(SITE_STYLES.ICONS.arrowUp)]),
                    h(`span.${APPID}-nav-label`, { 'data-role': 'total', title: 'Show message list' }, 'Total:'),
                    h(`span.${APPID}-nav-counter`, { 'data-role': 'total', title: 'Click to jump to a message' }, [h(`span.${APPID}-counter-current`, '--'), ' / ', h(`span.${APPID}-counter-total`, '--')]),
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'total-next', title: 'Next message' }, [createIconFromDef(SITE_STYLES.ICONS.arrowDown)]),
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'total-last', title: 'Last message' }, [createIconFromDef(SITE_STYLES.ICONS.scrollToLast)]),
                ]),
                h(`div.${APPID}-nav-separator`),
                h(`div#${APPID}-nav-group-user.${APPID}-nav-group`, [
                    h(`span.${APPID}-nav-label`, { 'data-role': 'user', title: 'Show message list' }, 'User:'),
                    h(`span.${APPID}-nav-counter`, { 'data-role': 'user', title: 'Click to jump to a message' }, [h(`span.${APPID}-counter-current`, '--'), ' / ', h(`span.${APPID}-counter-total`, '--')]),
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'user-prev', title: 'Previous user message' }, [createIconFromDef(SITE_STYLES.ICONS.arrowUp)]),
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'user-next', title: 'Next user message' }, [createIconFromDef(SITE_STYLES.ICONS.arrowDown)]),
                ]),
                h(`div.${APPID}-nav-separator`),
                bulkCollapseBtn,
            ];
            this.navConsole.textContent = '';
            navUI.forEach((el) => this.navConsole.appendChild(el));
        }

        attachEventListeners() {
            document.body.addEventListener('click', this.handleBodyClick, true);
            document.addEventListener('keydown', this._handleKeyDown, true);
        }

        injectStyle() {
            const styleId = `${APPID}-fixed-nav-style`;
            if (document.getElementById(styleId)) return;

            const navStyles = SITE_STYLES.FIXED_NAV;
            const jumpListStyles = SITE_STYLES.JUMP_LIST;

            // Add Firefox-specific style for the scrollbar gutter
            const firefoxScrollbarFix = /firefox/i.test(navigator.userAgent)
                ? `
                .${APPID}-jump-list-scrollbox {
                    padding-right: 12px; /* Add physical space for the overlay scrollbar */
                }`
                : '';

            const style = h('style', {
                id: styleId,
                textContent: `
                #${APPID}-nav-console .is-hidden {
                    display: none !important;
                  }
                #${APPID}-nav-console.${APPID}-nav-unpositioned {
                    visibility: hidden;
                    opacity: 0;
                  }
                #${APPID}-nav-console {
                    position: fixed;
                    z-index: ${CONSTANTS.Z_INDICES.NAV_CONSOLE};
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background-color: ${navStyles.bg};
                    padding: 4px 8px;
                    border-radius: 8px;
                    border: 1px solid ${navStyles.border};
                    box-shadow: 0 2px 10px rgb(0 0 0 / 0.05);
                    font-size: 0.8rem;
                    opacity: 1;
                    transform-origin: bottom;
                }
                #${APPID}-nav-console.${APPID}-nav-hidden {
                    display: none !important;
                }
                #${APPID}-nav-console .${APPID}-nav-group {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                #${APPID}-nav-console .${APPID}-nav-separator {
                    width: 1px;
                    height: 20px;
                    background-color: ${navStyles.separator_bg};
                }
                #${APPID}-nav-console .${APPID}-nav-label {
                    color: ${navStyles.label_text};
                    font-weight: 500;
                    cursor: pointer;
                    user-select: none;
                }
                #${APPID}-nav-console .${APPID}-nav-counter,
                #${APPID}-nav-console .${APPID}-nav-jump-input {
                    box-sizing: border-box;
                    width: 85px;
                    height: 24px;
                    margin: 0;
                    background-color: ${navStyles.counter_bg};
                    color: ${navStyles.counter_text};
                    padding: 1px 4px;
                    border: 1px solid transparent;
                    border-color: ${navStyles.counter_border};
                    border-radius: 4px;
                    text-align: center;
                    vertical-align: middle;
                    font-family: monospace;
                    font: inherit;
                }
                #${APPID}-nav-console .${APPID}-nav-btn {
                    background-color: ${navStyles.btn_bg};
                    color: ${navStyles.btn_text};
                    border: 1px solid ${navStyles.btn_border};
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
                #${APPID}-nav-console .${APPID}-nav-btn:hover {
                    background-color: ${navStyles.btn_hover_bg};
                }
                #${APPID}-nav-console .${APPID}-nav-btn svg {
                    width: 20px;
                    height: 20px;
                    fill: currentColor;
                }
                #${APPID}-bulk-collapse-btn svg {
                    width: 100%;
                    height: 100%;
                }
                #${APPID}-bulk-collapse-btn[data-state="expanded"] .icon-expand { display: none; }
                #${APPID}-bulk-collapse-btn[data-state="expanded"] .icon-collapse { display: block; }
                #${APPID}-bulk-collapse-btn[data-state="collapsed"] .icon-expand { display: block; }
                #${APPID}-bulk-collapse-btn[data-state="collapsed"] .icon-collapse { display: none; }
                #${APPID}-nav-console .${APPID}-nav-btn[data-nav$="-prev"],
                #${APPID}-nav-console .${APPID}-nav-btn[data-nav$="-next"] {
                    color: ${navStyles.btn_accent_text};
                }
                #${APPID}-nav-console .${APPID}-nav-btn[data-nav="total-first"],
                #${APPID}-nav-console .${APPID}-nav-btn[data-nav="total-last"] {
                    color: ${navStyles.btn_danger_text};
                }
                #${APPID}-autoscroll-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                ${CONSTANTS.SELECTORS.FIXED_NAV_HIGHLIGHT_TARGETS} {
                    outline: 2px solid ${navStyles.highlight_outline} !important;
                    outline-offset: -2px;
                    border-radius: ${navStyles.highlight_border_radius} !important;
                    box-shadow: 0 0 8px ${navStyles.highlight_outline} !important;
                }
                #${APPID}-jump-list-container {
                    position: fixed;
                    z-index: ${CONSTANTS.Z_INDICES.NAV_CONSOLE + 1};
                    background: ${jumpListStyles.list_bg};
                    border: 1px solid ${jumpListStyles.list_border};
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
                #${APPID}-jump-list-container:focus, #${APPID}-jump-list:focus, .${APPID}-jump-list-scrollbox:focus {
                    outline: none;
                }
                #${APPID}-jump-list-container.is-visible {
                    opacity: 1;
                    transform: translateY(0);
                    visibility: visible;
                }
                .${APPID}-jump-list-scrollbox {
                    flex: 1 1 auto;
                    position: relative;
                }
                #${APPID}-jump-list {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                }
                .${APPID}-jump-list-filter-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                    border-top: 1px solid ${jumpListStyles.list_border};
                    margin: 4px 0 0 0;
                    flex-shrink: 0;
                }
                .${APPID}-jump-list-filter {
                    border: none;
                    background-color: transparent;
                    color: inherit;
                    padding: 8px 60px 8px 8px; /* Make space for the label on the right */
                    outline: none;
                    font-size: 0.85rem;
                    border-radius: 0 0 4px 4px;
                    width: 100%;
                    box-sizing: border-box;
                }
                .${APPID}-jump-list-filter.is-regex-valid {
                    border-color: ${jumpListStyles.current_outline};
                }
                .${APPID}-jump-list-mode-label {
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
                .${APPID}-jump-list-mode-label.is-string {
                    background-color: transparent;
                    color: ${navStyles.label_text};
                }
                .${APPID}-jump-list-mode-label.is-regex {
                    background-color: #28a745;
                    color: #ffffff;
                }
                .${APPID}-jump-list-mode-label.is-regex-invalid {
                    background-color: #dc3545;
                    color: #ffffff;
                }
                #${APPID}-jump-list li {
                    padding: 6px 10px;
                    cursor: pointer;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    border-radius: 4px;
                    font-size: 0.85rem;
                }
                #${APPID}-jump-list li:hover, #${APPID}-jump-list li.is-focused {
                    outline: 1px solid ${jumpListStyles.hover_outline};
                    outline-offset: -1px;
                }
                #${APPID}-jump-list li.is-current {
                    outline: 2px solid ${jumpListStyles.current_outline};
                    outline-offset: -2px;
                }
                #${APPID}-jump-list li.is-current:hover, #${APPID}-jump-list li.is-current.is-focused {
                    outline-width: 2px;
                    outline-offset: -2px;
                }
                #${APPID}-jump-list li.user-item {
                    background-color: var(--${APPID}-user-bubble-bg, transparent);
                    color: var(--${APPID}-user-textColor, inherit);
                }
                #${APPID}-jump-list li.assistant-item {
                    background-color: var(--${APPID}-assistant-bubble-bg, transparent);
                    color: var(--${APPID}-assistant-textColor, inherit);
                }
                #${APPID}-jump-list-preview {
                    position: fixed;
                    z-index: ${CONSTANTS.Z_INDICES.JUMP_LIST_PREVIEW};
                    background: ${jumpListStyles.list_bg};
                    border: 1px solid ${jumpListStyles.list_border};
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
                    padding: 8px 12px;
                    max-width: 400px;
                    max-height: 300px;
                    overflow-y: auto;
                    font-size: 0.85rem;
                    opacity: 0;
                    transition: opacity 0.1s ease-in-out;
                    white-space: pre-wrap;
                    word-break: break-word;
                    visibility: hidden;
                }
                #${APPID}-jump-list-preview.is-visible {
                    opacity: 1;
                    visibility: visible;
                }
                #${APPID}-jump-list-preview strong {
                    color: ${jumpListStyles.current_outline};
                    font-weight: bold;
                    background-color: transparent;
                }
                ${firefoxScrollbarFix}
            `,
            });
            document.head.appendChild(style);
        }
    }

    // =================================================================================
    // SECTION: Message Lifecycle Orchestrator
    // Description: Listens for raw message additions from Sentinel and orchestrates
    //              the appropriate high-level events (avatar injection, UI setup).
    // =================================================================================

    class MessageLifecycleManager {
        /**
         * @param {MessageCacheManager} messageCacheManager
         */
        constructor(messageCacheManager) {
            this.messageCacheManager = messageCacheManager;
            this.scanIntervalId = null;
            this.scanAttempts = 0;
            this.subscriptions = [];
            this.boundStopPollingScan = this.stopPollingScan.bind(this);
        }

        _subscribe(event, listener) {
            const key = createEventKey(this, event);
            EventBus.subscribe(event, listener, key);
            this.subscriptions.push({ event, key });
        }

        init() {
            this._subscribe(EVENTS.RAW_MESSAGE_ADDED, (elem) => this.processRawMessage(elem));
            this._subscribe(EVENTS.APP_SHUTDOWN, () => this.destroy());
            this._subscribe(EVENTS.NAVIGATION_END, () => {
                PlatformAdapters.General.onNavigationEnd?.(this);
            });
        }

        destroy() {
            this.stopPollingScan();
            this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
            this.subscriptions = [];
        }

        /**
         * @description Starts a polling mechanism to repeatedly scan for unprocessed messages.
         * The polling stops automatically after a set number of attempts, on user interaction, or once a new message is found.
         */
        startPollingScan() {
            this.stopPollingScan(); // Ensure any previous polling is stopped
            this.scanAttempts = 0;
            const MAX_ATTEMPTS = 7;
            const INTERVAL_MS = 750;

            Logger.log('Starting polling scan for unprocessed messages.');

            this.scanIntervalId = setInterval(() => {
                this.scanAttempts++;
                Logger.log(`Executing polling scan (Attempt ${this.scanAttempts}/${MAX_ATTEMPTS})...`);
                const newItemsFound = this.scanForUnprocessedMessages();

                if (newItemsFound > 0) {
                    Logger.log(`Polling scan found ${newItemsFound} new message(s). Stopping early.`);
                    EventBus.publish(EVENTS.POLLING_MESSAGES_FOUND);
                    this.stopPollingScan();
                    return;
                }

                if (this.scanAttempts >= MAX_ATTEMPTS) {
                    Logger.log(`Polling scan finished after ${this.scanAttempts} attempts without finding new messages.`);
                    this.stopPollingScan();
                }
            }, INTERVAL_MS);

            // Stop polling immediately on user interaction
            window.addEventListener('wheel', this.boundStopPollingScan, { once: true, passive: true });
            window.addEventListener('keydown', this.boundStopPollingScan, { once: true, passive: true });
        }

        /**
         * @description Stops the polling scan and cleans up associated listeners.
         */
        stopPollingScan() {
            if (this.scanIntervalId) {
                clearInterval(this.scanIntervalId);
                this.scanIntervalId = null;
                Logger.debug('Polling scan stopped.');
            }
            // Clean up interaction listeners regardless
            window.removeEventListener('wheel', this.boundStopPollingScan);
            window.removeEventListener('keydown', this.boundStopPollingScan);
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
            // Flag the specific content piece as processed to avoid re-triggering from the same element.
            const contentProcessedFlag = `${APPID}ContentProcessed`;
            if (contentElement.dataset[contentProcessedFlag]) {
                return;
            }
            contentElement.dataset[contentProcessedFlag] = 'true';

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
                // Fire avatar injection event. The AvatarManager will handle the one-per-turn logic.
                EventBus.publish(EVENTS.AVATAR_INJECT, messageElement);

                // Fire message complete event for other managers.
                // Use a different flag to ensure this only fires once per message container,
                // even if it has multiple content parts detected (e.g. text and images).
                const messageCompleteFlag = `${APPID}MessageCompleteFired`;
                if (!messageElement.dataset[messageCompleteFlag]) {
                    messageElement.dataset[messageCompleteFlag] = 'true';
                    EventBus.publish(EVENTS.MESSAGE_COMPLETE, messageElement);
                }
            }
        }
    }

    class MessageNumberManager {
        /**
         * @param {ConfigManager} configManager
         * @param {MessageCacheManager} messageCacheManager
         */
        constructor(configManager, messageCacheManager) {
            this.configManager = configManager;
            this.messageCacheManager = messageCacheManager;
            this.numberSpanCache = new Map();
            this.subscriptions = [];
        }

        _subscribe(event, listener) {
            const key = createEventKey(this, event);
            EventBus.subscribe(event, listener, key);
            this.subscriptions.push({ event, key });
        }

        /**
         * Initializes the manager.
         */
        init() {
            this.injectStyle();
            // Use :cacheUpdated for batch updates (re-numbering, visibility toggles after config changes).
            this._subscribe(EVENTS.CACHE_UPDATED, () => this.updateAllMessageNumbers());
            this._subscribe(EVENTS.NAVIGATION, () => {
                this.numberSpanCache.clear();
            });
            this._subscribe(EVENTS.APP_SHUTDOWN, () => this.destroy());
        }

        /**
         * Cleans up event listeners.
         */
        destroy() {
            this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
            this.subscriptions = [];
            document.getElementById(`${APPID}-message-number-style`)?.remove();
            this.numberSpanCache.clear();
        }

        _syncCache() {
            syncCacheWithMessages(this.numberSpanCache, this.messageCacheManager);
        }

        /**
         * Injects the necessary CSS for positioning and styling the message numbers.
         */
        injectStyle() {
            const styleId = `${APPID}-message-number-style`;
            if (document.getElementById(styleId)) return;

            const style = h('style', {
                id: styleId,
                textContent: `
                .${APPID}-parent-with-number {
                    position: relative !important;
                }
                .${APPID}-message-number {
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
                .${APPID}-message-number-assistant {
                    top: -16px;
                    right: 100%;
                    margin-right: 0px;
                }
                .${APPID}-message-number-user {
                    top: -16px;
                    left: 100%;
                    margin-left: 0px;
                }
                .${APPID}-message-number-hidden {
                    display: none !important;
                }
            `,
            });
            document.head.appendChild(style);
        }

        /**
         * Updates the text content of all visible message numbers.
         * Creates the number element if it doesn't exist.
         */
        updateAllMessageNumbers() {
            this._syncCache();
            const config = this.configManager.get();
            if (!config) return;

            const allMessages = this.messageCacheManager.getTotalMessages();
            const isNavConsoleEnabled = config.features.fixed_nav_console.enabled;

            // --- Measure Phase ---
            const toCreate = [];
            allMessages.forEach((message) => {
                if (!this.numberSpanCache.has(message)) {
                    const anchor = PlatformAdapters.BubbleUI.getNavPositioningParent(message);
                    if (anchor) {
                        toCreate.push({ message, anchor });
                    }
                }
            });

            // --- Mutate Phase (in batches) ---
            const createSpans = () => {
                processInBatches(
                    toCreate,
                    ({ message, anchor }) => {
                        anchor.classList.add(`${APPID}-parent-with-number`);
                        const role = PlatformAdapters.General.getMessageRole(message);
                        if (role) {
                            const roleClass = role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_USER ? `${APPID}-message-number-user` : `${APPID}-message-number-assistant`;
                            const numberSpan = h(`span.${APPID}-message-number.${roleClass}`);
                            anchor.appendChild(numberSpan);
                            this.numberSpanCache.set(message, numberSpan);
                        }
                    },
                    CONSTANTS.BATCH_PROCESSING_SIZE,
                    updateNumbers // Chain to the next step
                );
            };

            const updateNumbers = () => {
                processInBatches(
                    allMessages,
                    (message, index) => {
                        const numberSpan = this.numberSpanCache.get(message);
                        if (numberSpan) {
                            numberSpan.textContent = `#${index + 1}`;
                            numberSpan.classList.toggle(`${APPID}-message-number-hidden`, !isNavConsoleEnabled);
                        }
                    },
                    CONSTANTS.BATCH_PROCESSING_SIZE
                );
            };

            createSpans(); // Start the chain
        }
    }

    // =================================================================================
    // SECTION: UI Elements - Components and Manager
    // =================================================================================

    /**
     * @abstract
     * @description Base class for a UI component.
     */
    class UIComponentBase {
        constructor(callbacks = {}) {
            this.callbacks = callbacks;
            this.element = null;
        }

        /**
         * @abstract
         * Renders the component's DOM structure. Must be implemented by subclasses.
         * @returns {void}
         */
        render() {
            throw new Error('Component must implement render method.');
        }

        /**
         * Removes the component's element from the DOM and performs cleanup.
         * @returns {void}
         */
        destroy() {
            this.element?.remove();
            this.element = null;
        }
    }

    /**
     * @class ColorPickerPopupManager
     * @description Manages the lifecycle and interaction of color picker popups within a given container.
     */
    class ColorPickerPopupManager {
        constructor(containerElement) {
            this.container = containerElement;
            this.activePicker = null;
            this._isSyncing = false;

            // Bind methods
            this._handleClick = this._handleClick.bind(this);
            this._handleOutsideClick = this._handleOutsideClick.bind(this);
            this._handleTextInput = this._handleTextInput.bind(this);
        }

        init() {
            this.container.addEventListener('click', this._handleClick);
            this.container.addEventListener('input', this._handleTextInput);
        }

        destroy() {
            this._closePicker();
            this.container.removeEventListener('click', this._handleClick);
            this.container.removeEventListener('input', this._handleTextInput);
        }

        _handleTextInput(e) {
            const textInput = e.target;
            if (!(textInput instanceof HTMLInputElement)) {
                return;
            }

            const idSuffix = textInput.id.replace(new RegExp(`^${APPID}-form-`), '');
            const wrapper = textInput.closest(`.${APPID}-color-field-wrapper`);
            if (!wrapper || !wrapper.querySelector(`[data-controls-color="${idSuffix}"]`)) {
                return;
            }

            if (this._isSyncing) return;

            const value = textInput.value.trim();
            let isValid = false;

            // If a picker is active for this input, use its full validation and update logic.
            if (this.activePicker && this.activePicker.textInput === textInput) {
                this._isSyncing = true;
                isValid = this.activePicker.picker.setColor(value);
                this._isSyncing = false;
            } else {
                // Otherwise, use the static method for validation only.
                isValid = !!CustomColorPicker.parseColorString(value);
            }

            textInput.classList.toggle('is-invalid', value !== '' && !isValid);
            const swatch = wrapper.querySelector(`.${APPID}-color-swatch`);
            if (swatch) {
                const swatchValue = swatch.querySelector(`.${APPID}-color-swatch-value`);
                if (swatchValue instanceof HTMLElement) {
                    swatchValue.style.backgroundColor = value === '' || isValid ? value : 'transparent';
                }
            }
        }

        _handleClick(e) {
            const swatch = e.target.closest(`.${APPID}-color-swatch`);
            if (swatch) {
                this._togglePicker(swatch);
            }
        }

        _togglePicker(swatchElement) {
            if (this.activePicker && this.activePicker.swatch === swatchElement) {
                this._closePicker();
                return;
            }
            this._closePicker();
            this._openPicker(swatchElement);
        }

        _openPicker(swatchElement) {
            const targetId = swatchElement.dataset.controlsColor;
            const textInput = this.container.querySelector(`#${APPID}-form-${targetId}`);
            if (!(textInput instanceof HTMLInputElement)) {
                return;
            }

            let pickerRoot;
            const popupWrapper = h(`div.${APPID}-color-picker-popup`, [(pickerRoot = h('div'))]);
            this.container.appendChild(popupWrapper);

            const picker = new CustomColorPicker(pickerRoot, {
                initialColor: textInput.value || 'rgb(128 128 128 / 1)',
                cssPrefix: `${APPID}-ccp`,
            });
            picker.render();

            this.activePicker = { picker, popupWrapper, textInput, swatch: swatchElement };

            this._setupBindings();
            requestAnimationFrame(() => {
                this._positionPicker(popupWrapper, swatchElement);
                document.addEventListener('click', this._handleOutsideClick, { capture: true });
            });
        }

        _closePicker() {
            if (!this.activePicker) return;
            this.activePicker.picker.destroy();
            this.activePicker.popupWrapper.remove();
            this.activePicker = null;
            document.removeEventListener('click', this._handleOutsideClick, { capture: true });
        }

        _setupBindings() {
            const { picker, textInput, swatch } = this.activePicker;
            // Sync picker to text input initially
            this._isSyncing = true;
            const initialColor = picker.getColor();
            textInput.value = initialColor;

            const swatchValue = swatch.querySelector(`.${APPID}-color-swatch-value`);
            if (swatchValue instanceof HTMLElement) {
                swatchValue.style.backgroundColor = initialColor;
            }

            textInput.classList.remove('is-invalid');
            this._isSyncing = false;
            // Picker -> Text Input: This remains crucial for updating the text when the user drags the picker.
            picker.rootElement.addEventListener('color-change', (e) => {
                if (this._isSyncing) return;

                if (e instanceof CustomEvent) {
                    this._isSyncing = true;
                    textInput.value = e.detail.color;
                    if (swatchValue instanceof HTMLElement) {
                        swatchValue.style.backgroundColor = e.detail.color;
                    }
                    textInput.classList.remove('is-invalid');
                    this._isSyncing = false;
                }
            });
        }

        _positionPicker(popupWrapper, swatchElement) {
            const dialogRect = this.container.getBoundingClientRect();
            const swatchRect = swatchElement.getBoundingClientRect();
            const pickerHeight = popupWrapper.offsetHeight;
            const pickerWidth = popupWrapper.offsetWidth;
            const margin = 4;
            // Default to showing the picker above the swatch.
            let top = swatchRect.top - dialogRect.top - pickerHeight - margin;
            let left = swatchRect.left - dialogRect.left;

            // If there's not enough space above, show it below instead.
            if (top < 0) {
                top = swatchRect.bottom - dialogRect.top + margin;
            }

            if (swatchRect.left + pickerWidth > dialogRect.right) {
                left = swatchRect.right - dialogRect.left - pickerWidth;
            }

            left = Math.max(margin, left);
            top = Math.max(margin, top);
            popupWrapper.style.top = `${top}px`;
            popupWrapper.style.left = `${left}px`;
        }

        _handleOutsideClick(e) {
            if (!this.activePicker) return;
            if (this.activePicker.swatch.contains(e.target)) {
                return;
            }
            if (this.activePicker.popupWrapper.contains(e.target)) {
                return;
            }
            this._closePicker();
        }
    }

    /**
     * @class CustomColorPicker
     * @description A self-contained, reusable color picker UI component. It has no external
     * dependencies and injects its own styles into the document head. All utility
     * methods are included as static methods.
     */
    class CustomColorPicker {
        /**
         * @param {Element} rootElement The DOM element to render the picker into.
         * @param {object} [options]
         * @param {string} [options.initialColor] The initial color to display.
         * @param {string} [options.cssPrefix] A prefix for all CSS classes to avoid conflicts.
         */
        constructor(rootElement, options = {}) {
            this.rootElement = rootElement;
            this.options = {
                initialColor: 'rgb(255 0 0 / 1)',
                cssPrefix: 'ccp',
                ...options,
            };
            this.state = { h: 0, s: 100, v: 100, a: 1 };
            this.dom = {};
            this.isUpdating = false;
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
         * @param {number} [a] - Alpha (0-1)
         * @returns {string} CSS color string.
         */
        static rgbToString(r, g, b, a = 1) {
            if (a < 1) {
                return `rgb(${r} ${g} ${b} / ${a.toFixed(2).replace(/\.?0+$/, '') || 0})`;
            }
            return `rgb(${r} ${g} ${b})`;
        }

        /**
         * Parses a color string into an RGBA object.
         * @param {string | null} str - The CSS color string.
         * @returns {{r: number, g: number, b: number, a: number} | null} RGBA object or null if invalid.
         */
        static parseColorString(str) {
            if (!str || String(str).trim() === '') return null;
            const s = String(str).trim();

            if (/^(rgb|rgba|hsl|hsla)\(/.test(s)) {
                const openParenCount = (s.match(/\(/g) || []).length;
                const closeParenCount = (s.match(/\)/g) || []).length;
                if (openParenCount !== closeParenCount) {
                    return null;
                }
            }

            const temp = h('div');
            temp.style.color = 'initial';
            temp.style.color = s;

            if (temp.style.color === '' || temp.style.color === 'initial') {
                return null;
            }

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
            this._injectStyles();
            // Get references to created DOM elements from _createDom
            Object.assign(this.dom, this._createDom());
            this._attachEventListeners();
            this.setColor(this.options.initialColor);
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

            // After this instance's DOM is removed, check if any other pickers with the same prefix still exist.
            const p = this.options.cssPrefix;
            const remainingPickers = document.querySelector(`.${p}-color-picker`);

            // If no other pickers are found, it is now safe to remove the shared style element.
            if (!remainingPickers) {
                const styleElement = document.getElementById(p + '-styles');
                if (styleElement) {
                    styleElement.remove();
                }
            }
        }

        setColor(rgbString) {
            const parsed = CustomColorPicker.parseColorString(rgbString);
            if (parsed) {
                const { r, g, b, a } = parsed;
                const { h, s, v } = CustomColorPicker.rgbToHsv(r, g, b);
                this.state = { h, s, v, a };
                this._requestUpdate();
                return true;
            }
            return false;
        }

        getColor() {
            const { h, s, v, a } = this.state;
            const { r, g, b } = CustomColorPicker.hsvToRgb(h, s, v);
            return CustomColorPicker.rgbToString(r, g, b, a);
        }

        _injectStyles() {
            const styleId = this.options.cssPrefix + '-styles';
            if (document.getElementById(styleId)) return;

            const p = this.options.cssPrefix;
            const style = h('style', { id: styleId });
            style.textContent = `
                .${p}-color-picker { display: flex;  flex-direction: column; gap: 16px; }
                .${p}-sv-plane { position: relative;  width: 100%; aspect-ratio: 1 / 1; cursor: crosshair; touch-action: none; border-radius: 4px; overflow: hidden;  }
                .${p}-sv-plane:focus { outline: 2px solid var(--${p}-focus-color, deepskyblue);  }
                .${p}-sv-plane .${p}-gradient-white, .${p}-sv-plane .${p}-gradient-black { position: absolute;  inset: 0; pointer-events: none; }
                .${p}-sv-plane .${p}-gradient-white { background: linear-gradient(to right, white, transparent);  }
                .${p}-sv-plane .${p}-gradient-black { background: linear-gradient(to top, black, transparent);  }
                .${p}-sv-thumb { position: absolute;  width: 20px; height: 20px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 2px 1px rgb(0 0 0 / 0.5);  box-sizing: border-box; transform: translate(-50%, -50%); pointer-events: none; }
                .${p}-slider-group { position: relative;  cursor: pointer; height: 20px; }
                .${p}-slider-group .${p}-slider-track, .${p}-slider-group .${p}-alpha-checkerboard { position: absolute;  top: 50%; transform: translateY(-50%); width: 100%; height: 12px; border-radius: 6px; pointer-events: none;  }
                .${p}-slider-group .${p}-alpha-checkerboard { background-image: repeating-conic-gradient(#808080 0% 25%, #c0c0c0 0% 50%);  background-size: 12px 12px; }
                .${p}-slider-group .${p}-hue-track { background: linear-gradient( to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%) );  }
                .${p}-slider-group input[type="range"] { -webkit-appearance: none;  appearance: none; position: relative; width: 100%; height: 100%; margin: 0; padding: 0; background-color: transparent; cursor: pointer;  }
                .${p}-slider-group input[type="range"]:focus { outline: none;  }
                .${p}-slider-group input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none;  appearance: none; width: 20px; height: 20px; border: 2px solid white; border-radius: 50%; background-color: #fff;  box-shadow: 0 0 2px 1px rgb(0 0 0 / 0.5);  }
                .${p}-slider-group input[type="range"]::-moz-range-thumb { width: 20px;  height: 20px; border: 2px solid white; border-radius: 50%; background-color: #fff; box-shadow: 0 0 2px 1px rgb(0 0 0 / 0.5);  }
                .${p}-slider-group input[type="range"]:focus::-webkit-slider-thumb { outline: 2px solid var(--${p}-focus-color, deepskyblue);  outline-offset: 1px; }
                .${p}-slider-group input[type="range"]:focus::-moz-range-thumb { outline: 2px solid var(--${p}-focus-color, deepskyblue);  outline-offset: 1px; }
            `;
            document.head.appendChild(style);
        }

        _createDom() {
            const p = this.options.cssPrefix;
            this.rootElement.textContent = '';

            // References to key elements will be captured during creation.
            let svPlane, svThumb, hueSlider, alphaSlider, alphaTrack;

            const colorPicker = h(`div.${p}-color-picker`, { 'aria-label': 'Color picker' }, [
                (svPlane = h(
                    `div.${p}-sv-plane`,
                    {
                        role: 'slider',
                        tabIndex: 0,
                        'aria-label': 'Saturation and Value',
                    },
                    [h(`div.${p}-gradient-white`), h(`div.${p}-gradient-black`), (svThumb = h(`div.${p}-sv-thumb`))]
                )),
                h(`div.${p}-slider-group.${p}-hue-slider`, [
                    h(`div.${p}-slider-track.${p}-hue-track`),
                    (hueSlider = h('input', {
                        type: 'range',
                        min: '0',
                        max: '360',
                        step: '1',
                        'aria-label': 'Hue',
                    })),
                ]),
                h(`div.${p}-slider-group.${p}-alpha-slider`, [
                    h(`div.${p}-alpha-checkerboard`),
                    (alphaTrack = h(`div.${p}-slider-track`)),
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
            this._requestUpdate();
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
                this._requestUpdate();
            });
            hueSlider.addEventListener('input', () => {
                this.state.h = parseInt(hueSlider.value, 10);
                this._requestUpdate();
            });
            alphaSlider.addEventListener('input', () => {
                this.state.a = parseFloat(alphaSlider.value);
                this._requestUpdate();
            });
        }

        _requestUpdate() {
            if (this.isUpdating) return;
            this.isUpdating = true;
            requestAnimationFrame(() => {
                this._updateUIDisplay();
                this._dispatchChangeEvent();
                this.isUpdating = false;
            });
        }

        _updateUIDisplay() {
            if (!this.rootElement) return; // Guard against updates after destruction
            const { h, s, v, a } = this.state;
            const { svPlane, svThumb, hueSlider, alphaSlider, alphaTrack } = this.dom;
            const { r, g, b } = CustomColorPicker.hsvToRgb(h, s, v);
            svPlane.style.backgroundColor = `hsl(${h}, 100%, 50%)`;
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
        /**
         * @param {object} [options]
         * @param {string} [options.title] - The title displayed in the modal header.
         * @param {string} [options.width] - The width of the modal.
         * @param {string} [options.cssPrefix] - A prefix for all CSS classes.
         * @param {boolean} [options.closeOnBackdropClick] - Whether to close the modal when clicking the backdrop.
         * @param {Array<{text: string, id: string, className?: string, title?: string, onClick: ModalButtonOnClick}>} [options.buttons] - An array of button definitions for the footer.
         * @param {function(): void} [options.onDestroy] - A callback function executed when the modal is destroyed.
         * @param {object} [options.styles] - Site-specific styles to apply to the modal.
         */
        constructor(options = {}) {
            this.options = {
                title: '',
                width: '500px',
                cssPrefix: 'cm',
                closeOnBackdropClick: true,
                buttons: [],
                onDestroy: null,
                styles: {}, // Add styles option
                ...options,
            };
            this.element = null;
            this.dom = {}; // To hold references to internal elements like header, content, footer
            this._injectStyles();
            this._createModalElement();
        }

        _injectStyles() {
            const styleId = this.options.cssPrefix + '-styles';
            if (document.getElementById(styleId)) return;

            const p = this.options.cssPrefix;
            const style = h('style', { id: styleId });
            // Use CSS variables for theming, which will be set on the element itself.
            style.textContent = `
                dialog.${p}-dialog {
                    padding: 0;
                    border: none;
                    background: transparent;
                    max-width: 100vw;
                    max-height: 100vh;
                    overflow: visible;
                }
                dialog.${p}-dialog::backdrop {
                    background: rgb(0 0 0 / 0.5);
                    pointer-events: auto;
                }
                .${p}-box {
                    display: flex;
                    flex-direction: column;
                    background: var(--${p}-bg);
                    color: var(--${p}-text);
                    border: 1px solid var(--${p}-border-color);
                    border-radius: 8px;
                    box-shadow: 0 4px 16px rgb(0 0 0 / 0.2);
                }
                .${p}-header, .${p}-footer {
                    flex-shrink: 0;
                    padding: 12px 16px;
                }
                .${p}-header {
                    font-size: 1.1em;
                    font-weight: 600;
                    border-bottom: 1px solid var(--${p}-border-color);
                }
                .${p}-content {
                    flex-grow: 1;
                    padding: 16px;
                    overflow-y: auto;
                }
                .${p}-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    border-top: 1px solid var(--${p}-border-color);
                }
                .${p}-footer-message {
                    flex-grow: 1;
                    font-size: 0.9em;
                }
                .${p}-button-group {
                    display: flex;
                    gap: 8px;
                }
                .${p}-button {
                    background: var(--${p}-btn-bg);
                    color: var(--${p}-btn-text);
                    border: 1px solid var(--${p}-btn-border-color);
                    border-radius: 5px;
                    padding: 5px 16px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: background 0.12s;
                }
                .${p}-button:hover {
                    background: var(--${p}-btn-hover-bg);
                }
            `;
            document.head.appendChild(style);
        }

        _createModalElement() {
            const p = this.options.cssPrefix;
            // Define variables to hold references to key elements.
            let header, content, footer, modalBox, footerMessage;
            // Create footer buttons declaratively using map and h().
            const buttons = this.options.buttons.map((btnDef) => {
                const fullClassName = [`${p}-button`, btnDef.className, `${APPID}-modal-button`].filter(Boolean).join(' ');
                return h(
                    'button',
                    {
                        id: btnDef.id,
                        className: fullClassName,
                        onclick: (e) => btnDef.onClick(this, e),
                    },
                    btnDef.text
                );
            });

            const buttonGroup = h(`div.${p}-button-group`, buttons);

            // Create the entire modal structure using h().
            const dialogElement = h(
                `dialog.${p}-dialog`,
                (modalBox = h(`div.${p}-box`, { style: { width: this.options.width } }, [
                    (header = h(`div.${p}-header`, this.options.title)),
                    (content = h(`div.${p}-content`)),
                    (footer = h(`div.${p}-footer`, [(footerMessage = h(`div.${p}-footer-message`)), buttonGroup])),
                ]))
            );

            if (!(dialogElement instanceof HTMLDialogElement)) {
                Logger.error('Failed to create modal dialog element.');
                return;
            }
            this.element = dialogElement;

            // Apply site-specific styles via CSS custom properties.
            const s = this.options.styles;
            if (s) {
                const bg = s.bg || s.modal_bg || '#fff';
                const text = s.text || s.modal_text || '#000';
                const border = s.border || s.modal_border || '#888';

                modalBox.style.setProperty(`--${p}-bg`, bg);
                modalBox.style.setProperty(`--${p}-text`, text);
                modalBox.style.setProperty(`--${p}-border-color`, border);
                modalBox.style.setProperty(`--${p}-btn-bg`, s.btn_bg || '#efefef');
                modalBox.style.setProperty(`--${p}-btn-text`, s.btn_text || '#000');
                modalBox.style.setProperty(`--${p}-btn-border-color`, s.btn_border || '#ccc');
                modalBox.style.setProperty(`--${p}-btn-hover-bg`, s.btn_hover_bg || '#e0e0e0');
            }

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

        show(anchorElement = null) {
            if (this.element && typeof this.element.showModal === 'function') {
                this.element.showModal();
                // Positioning logic
                if (anchorElement && typeof anchorElement.getBoundingClientRect === 'function') {
                    // ANCHORED POSITIONING
                    const modalBox = this.dom.modalBox;
                    const btnRect = anchorElement.getBoundingClientRect();
                    const margin = 8;
                    const modalWidth = modalBox.offsetWidth || parseInt(this.options.width, 10);

                    let left = btnRect.left;
                    const top = btnRect.bottom + 4;

                    if (left + modalWidth > window.innerWidth - margin) {
                        left = window.innerWidth - modalWidth - margin;
                    }

                    Object.assign(this.element.style, {
                        position: 'absolute',
                        left: `${Math.max(left, margin)}px`,
                        top: `${Math.max(top, margin)}px`,
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

            // Check if any other modals with the same prefix exist
            const p = this.options.cssPrefix;
            const remainingModals = document.querySelector(`dialog.${p}-dialog`);
            if (!remainingModals) {
                document.getElementById(`${p}-styles`)?.remove();
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
         * @param {string} options.id - The DOM ID for the button element.
         * @param {string} options.textContent - The text or emoji to display inside the button.
         * @param {string} options.title - The tooltip text for the button.
         * @param {number|string} options.zIndex - The z-index for the button.
         * @param {{top?: string, right?: string, bottom?: string, left?: string}} options.position - The fixed position of the button.
         * @param {object} options.siteStyles - CSS variables for theming.
         */
        constructor(callbacks, options) {
            super(callbacks);
            this.options = options;
            this.id = this.options.id;
            this.styleId = `${this.id}-style`;
        }

        destroy() {
            this.element?.remove();
            this.element = null;
            document.getElementById(this.styleId)?.remove();
        }

        /**
         * Renders the settings button element and appends it to the document body.
         * @returns {HTMLElement} The created button element.
         */
        render() {
            this._injectStyles();
            const oldElement = document.getElementById(this.id);
            if (oldElement) {
                oldElement.remove();
            }

            this.element = h('button', {
                id: this.id,
                title: this.options.title,
                onclick: (e) => {
                    e.stopPropagation();
                    this.callbacks.onClick?.();
                },
            });

            const iconDef = this.options.siteStyles.iconDef;
            if (iconDef) {
                const svgElement = createIconFromDef(iconDef);
                if (svgElement) {
                    this.element.appendChild(svgElement);
                }
            }
            document.body.appendChild(this.element);

            return this.element;
        }

        /**
         * @private
         * Injects the component's CSS into the document head, using options for configuration.
         */
        _injectStyles() {
            if (document.getElementById(this.styleId)) return;
            const { position, zIndex, siteStyles } = this.options;

            const style = h('style', {
                id: this.styleId,
                textContent: `
                #${this.id} {
                    position: fixed;
                    top: ${position.top || 'auto'};
                    right: ${position.right || 'auto'};
                    bottom: ${position.bottom || 'auto'};
                    left: ${position.left || 'auto'};
                    z-index: ${zIndex};
                    width: 32px;
                    height: 32px;
                    border-radius: ${siteStyles.borderRadius};
                    background: ${siteStyles.background};
                    border: 1px solid ${siteStyles.borderColor};
                    font-size: 16px;
                    cursor: pointer;
                    box-shadow: var(--drop-shadow-xs, 0 1px 1px #0000000d);
                    transition: background 0.12s, border-color 0.12s, box-shadow 0.12s;

                    /* Add flexbox properties for centering */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                    pointer-events: auto !important;
                }
                #${this.id}:hover {
                    background: ${siteStyles.backgroundHover};
                    border-color: ${siteStyles.borderColorHover};
                }
            `,
            });
            document.head.appendChild(style);
        }
    }

    /**
     * @abstract
     * @description Base class for a settings panel/submenu UI component.
     */
    class SettingsPanelBase extends UIComponentBase {
        constructor(callbacks) {
            super(callbacks);
            this.debouncedSave = debounce(this._handleDebouncedSave.bind(this), CONSTANTS.TIMING.DEBOUNCE_DELAYS.SETTINGS_SAVE);
            this._handleDocumentClick = this._handleDocumentClick.bind(this);
            this._handleDocumentKeydown = this._handleDocumentKeydown.bind(this);
        }

        render() {
            if (document.getElementById(`${APPID}-settings-panel`)) {
                document.getElementById(`${APPID}-settings-panel`).remove();
            }
            this._injectStyles();
            this.element = this._createPanelContainer();
            const content = this._createPanelContent();
            this.element.appendChild(content);

            document.body.appendChild(this.element);
            this._setupEventListeners();
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

        async show() {
            await this._populateForm();
            const anchorRect = this.callbacks.getAnchorElement().getBoundingClientRect();

            let top = anchorRect.bottom + 4;
            let left = anchorRect.left;

            this.element.style.display = 'block';
            const panelWidth = this.element.offsetWidth;
            const panelHeight = this.element.offsetHeight;

            if (left + panelWidth > window.innerWidth - 8) {
                left = window.innerWidth - panelWidth - 8;
            }
            if (top + panelHeight > window.innerHeight - 8) {
                top = window.innerHeight - panelHeight - 8;
            }

            this.element.style.left = `${Math.max(8, left)}px`;
            this.element.style.top = `${Math.max(8, top)}px`;
            document.addEventListener('click', this._handleDocumentClick, true);
            document.addEventListener('keydown', this._handleDocumentKeydown, true);
        }

        hide() {
            this.element.style.display = 'none';
            document.removeEventListener('click', this._handleDocumentClick, true);
            document.removeEventListener('keydown', this._handleDocumentKeydown, true);
        }

        /**
         * @private
         * Collects data and calls the onSave callback. Designed to be debounced.
         */
        async _handleDebouncedSave() {
            const newConfig = await this._collectDataFromForm();
            this.callbacks.onSave?.(newConfig);
        }

        _createPanelContainer() {
            return h(`div#${APPID}-settings-panel`, { style: { display: 'none' }, role: 'menu' });
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

        // --- Abstract methods to be implemented by subclasses ---
        _createPanelContent() {
            throw new Error('Subclass must implement _createPanelContent()');
        }
        _injectStyles() {
            throw new Error('Subclass must implement _injectStyles()');
        }
        _populateForm() {
            throw new Error('Subclass must implement _populateForm()');
        }
        _collectDataFromForm() {
            throw new Error('Subclass must implement _collectDataFromForm()');
        }
        _setupEventListeners() {
            throw new Error('Subclass must implement _setupEventListeners()');
        }
    }

    /**
     * Manages the settings panel/submenu.
     */
    class SettingsPanelComponent extends SettingsPanelBase {
        constructor(callbacks) {
            super(callbacks);
            this.activeThemeSet = null;
            this.subscriptions = [];
        }

        _subscribe(event, listener) {
            const key = createEventKey(this, event);
            EventBus.subscribe(event, listener, key);
            this.subscriptions.push({ event, key });
        }

        init() {
            this._subscribe(EVENTS.CONFIG_UPDATED, async () => {
                if (this.isOpen()) {
                    await this._populateForm();
                }
            });
        }

        destroy() {
            super.destroy();
            this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
            this.subscriptions = [];
            document.getElementById(`${APPID}-ui-styles`)?.remove();
        }

        /**
         * @override
         * Updates the displayed theme name and then shows the panel.
         * @returns {Promise<void>}
         */
        async show() {
            // Update applied theme name display (if callback is available)
            if (this.callbacks.getCurrentThemeSet) {
                this.activeThemeSet = this.callbacks.getCurrentThemeSet();
                const themeName = this.activeThemeSet.metadata?.name || 'Default Settings';
                const themeNameEl = this.element.querySelector(`#${APPID}-applied-theme-name`);
                if (themeNameEl) {
                    themeNameEl.textContent = themeName;
                }
            }
            await super.show();
        }

        _createPanelContent() {
            const schema = this._getPanelSchema();
            // Wrap the generated elements in a single parent div to match the original DOM structure
            return h('div', [buildUIFromSchema(schema)]);
        }

        _getPanelSchema() {
            const widthConfig = CONSTANTS.SLIDER_CONFIGS.CHAT_WIDTH;

            const commonFeatures = [
                { id: 'features.collapsible_button.enabled', label: 'Collapsible button', title: 'Enables a button to collapse large message bubbles.' },
                { id: 'features.sequential_nav_buttons.enabled', label: 'Sequential nav buttons', title: 'Enables buttons to jump to the previous/next message.' },
                { id: 'features.scroll_to_top_button.enabled', label: 'Scroll to top button', title: 'Enables a button to scroll to the top of a message.' },
                { id: 'features.fixed_nav_console.enabled', label: 'Navigation console', title: 'When enabled, a navigation console with message counters will be displayed next to the text input area.' },
            ];

            const platformFeatures = PlatformAdapters.SettingsPanel.getPlatformSpecificFeatureToggles().map((f) => ({ ...f, id: f.configKey }));
            const allFeatures = [...platformFeatures, ...commonFeatures];

            const featureGroups = allFeatures.map((feature) => {
                const formId = `${APPID}-form-${feature.id.replace(/\./g, '-')}`;
                return {
                    type: 'container',
                    className: `${APPID}-feature-group`,
                    children: [
                        {
                            type: 'container-row',
                            children: [
                                { type: 'label', for: formId, title: feature.title, text: feature.label },
                                { type: 'toggle', id: feature.id, configKey: feature.id },
                            ],
                        },
                    ],
                };
            });

            return [
                {
                    type: 'fieldset',
                    legend: 'Applied Theme',
                    children: [{ type: 'button', id: `${APPID}-applied-theme-name`, text: 'Loading...', title: 'Click to edit this theme', fullWidth: true }],
                },
                {
                    type: 'container',
                    className: `${APPID}-submenu-top-row`,
                    children: [
                        { type: 'fieldset', legend: 'Themes', children: [{ type: 'button', id: `${APPID}-submenu-edit-themes-btn`, text: 'Edit Themes...', title: 'Open the theme editor to create and modify themes.', fullWidth: true }] },
                        {
                            type: 'fieldset',
                            legend: 'JSON',
                            children: [
                                { type: 'button', id: `${APPID}-submenu-json-btn`, text: 'JSON...', title: 'Opens the advanced settings modal to directly edit, import, or export the entire configuration in JSON format.', fullWidth: true },
                            ],
                        },
                    ],
                },
                {
                    type: 'fieldset',
                    legend: 'Options',
                    children: [
                        {
                            type: 'slider',
                            containerClass: `${APPID}-submenu-row-stacked`,
                            id: 'options.icon_size',
                            label: 'Icon size:',
                            tooltip: 'Specifies the size of the chat icons in pixels.',
                            min: 0,
                            max: CONSTANTS.ICON_SIZE_VALUES.length - 1,
                            step: 1,
                            dataset: { sliderFor: 'options.icon_size', valueMapKey: 'ICON_SIZE_VALUES' },
                        },
                        {
                            type: 'slider',
                            containerClass: `${APPID}-submenu-row-stacked`,
                            id: 'options.chat_content_max_width',
                            label: 'Chat content max width:',
                            tooltip: `Adjusts the maximum width of the chat content.\nMove slider to the far left for default.\nRange: ${widthConfig.NULL_THRESHOLD}vw to ${widthConfig.MAX}vw.`,
                            min: widthConfig.MIN,
                            max: widthConfig.MAX,
                            step: 1,
                            dataset: { sliderFor: 'options.chat_content_max_width', unit: 'vw', nullThreshold: widthConfig.NULL_THRESHOLD },
                        },
                        { type: 'submenu-separator' },
                        {
                            type: 'container-row',
                            children: [
                                {
                                    type: 'label',
                                    for: `${APPID}-form-options-respect_avatar_space`,
                                    title: 'When enabled, adjusts the standing image area to not overlap the avatar icon.\nWhen disabled, the standing image is maximized but may overlap the icon.',
                                    text: 'Prevent image/avatar overlap:',
                                },
                                { type: 'toggle', id: 'options.respect_avatar_space', configKey: 'options.respect_avatar_space' },
                            ],
                        },
                    ],
                },
                { type: 'fieldset', legend: 'Features', children: featureGroups },
            ];
        }

        async _populateForm() {
            const config = await this.callbacks.getCurrentConfig();
            if (!config || !this.element) return;

            populateFormFromSchema(this._getPanelSchema(), this.element, config, this);
        }

        async _collectDataFromForm() {
            const currentConfig = await this.callbacks.getCurrentConfig();
            const newConfig = JSON.parse(JSON.stringify(currentConfig));
            if (!this.element) return newConfig;

            collectDataFromSchema(this._getPanelSchema(), this.element, newConfig);
            return newConfig;
        }

        _updateSliderDisplay(slider) {
            const displayId = slider.dataset.sliderFor;
            if (!displayId) return;

            const display = this.element.querySelector(`[data-slider-display-for="${displayId}"]`);
            if (!display) return;

            updateSliderDisplay(slider, display);
        }

        _setupEventListeners() {
            // Modal Buttons
            this.element.querySelector(`#${APPID}-applied-theme-name`).addEventListener('click', () => {
                if (this.activeThemeSet) {
                    let themeKey = this.activeThemeSet.metadata?.id;
                    // If the ID is 'default', map it to 'defaultSet' to match the <select> option value.
                    if (themeKey === 'default') {
                        themeKey = 'defaultSet';
                    }
                    this.callbacks.onShowThemeModal?.(themeKey || 'defaultSet');
                    this.hide();
                }
            });
            this.element.querySelector(`#${APPID}-submenu-json-btn`).addEventListener('click', () => {
                this.callbacks.onShowJsonModal?.();
                this.hide();
            });
            this.element.querySelector(`#${APPID}-submenu-edit-themes-btn`).addEventListener('click', () => {
                this.callbacks.onShowThemeModal?.();
                this.hide();
            });

            // Input event delegation
            this.element.addEventListener('input', (e) => {
                if (e.target.matches('input[type="range"]')) {
                    this._updateSliderDisplay(e.target);
                    // Special handling for width preview
                    if (e.target.dataset.sliderFor === 'options.chat_content_max_width') {
                        const sliderValue = parseInt(e.target.value, 10);
                        const widthConfig = CONSTANTS.SLIDER_CONFIGS.CHAT_WIDTH;
                        const newWidthValue = sliderValue < widthConfig.NULL_THRESHOLD ? null : `${sliderValue}vw`;
                        EventBus.publish(EVENTS.WIDTH_PREVIEW, newWidthValue);
                    }
                    this.debouncedSave();
                }
            });

            this.element.addEventListener('change', (e) => {
                if (e.target.matches('input[type="checkbox"]')) {
                    this.debouncedSave();
                }
            });
        }

        _injectStyles() {
            const styleId = `${APPID}-ui-styles`;
            if (document.getElementById(styleId)) return;

            const styles = this.callbacks.siteStyles;
            const style = h('style', {
                id: styleId,
                textContent: `
                #${APPID}-settings-panel {
                    position: fixed;
                    width: 340px;
                    background: ${styles.bg};
                    color: ${styles.text_primary};
                    border-radius: 0.5rem;
                    box-shadow: 0 4px 20px 0 rgb(0 0 0 / 15%);
                    padding: 12px;
                    z-index: ${CONSTANTS.Z_INDICES.SETTINGS_PANEL};
                    border: 1px solid ${styles.border_medium};
                    font-size: 0.9em;
                }
                #${APPID}-applied-theme-name {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .${APPID}-submenu-top-row {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 12px;
                }
                .${APPID}-submenu-top-row .${APPID}-submenu-fieldset {
                    flex: 1 1 0px;
                    margin-bottom: 0;
                }
                .${APPID}-submenu-fieldset {
                    border: 1px solid ${styles.border_default};
                    border-radius: 4px;
                    padding: 8px 12px 12px;
                    margin: 0 0 12px 0;
                    min-width: 0;
                }
                .${APPID}-submenu-fieldset legend {
                    padding: 0 4px;
                    font-weight: 500;
                    color: ${styles.text_secondary};
                }
                .${APPID}-submenu-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-top: 8px;
                }
                .${APPID}-submenu-row label {
                    flex-shrink: 0;
                }
                .${APPID}-submenu-row-stacked {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 4px;
                }
                .${APPID}-submenu-row-stacked label {
                    margin-inline-end: 0;
                    flex-shrink: 1;
                    color: ${styles.text_secondary};
                }
                .${APPID}-submenu-separator {
                    border-top: 1px solid ${styles.border_light};
                    margin: 12px 0;
                }
                .${APPID}-slider-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-grow: 1;
                }
                .${APPID}-slider-container input[type="range"] {
                    flex-grow: 1;
                    margin: 0;
                }
                .${APPID}-slider-display {
                    min-width: 4.5em;
                    text-align: right;
                    font-family: monospace;
                    color: ${styles.text_primary};
                }
                .${APPID}-slider-subgroup-control.is-default .${APPID}-slider-display {
                    color: ${styles.text_secondary};
                }
                .${APPID}-feature-group {
                    padding: 8px 0;
                }
                .${APPID}-feature-group:not(:first-child) {
                    border-top: 1px solid ${styles.border_light};
                }
                .${APPID}-feature-group .${APPID}-submenu-row:first-child {
                    margin-top: 0;
                }

                /* Toggle Switch Styles */
                .${APPID}-toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 40px;
                    height: 22px;
                    flex-shrink: 0;
                }
                .${APPID}-toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .${APPID}-toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: ${styles.toggle_bg_off};
                    transition: .3s;
                    border-radius: 22px;
                }
                .${APPID}-toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 3px;
                    bottom: 3px;
                    background-color: ${styles.toggle_knob};
                    transition: .3s;
                    border-radius: 50%;
                }
                .${APPID}-toggle-switch input:checked + .${APPID}-toggle-slider {
                    background-color: ${styles.toggle_bg_on};
                }
                .${APPID}-toggle-switch input:checked + .${APPID}-toggle-slider:before {
                    transform: translateX(18px);
                }
            `,
            });
            document.head.appendChild(style);
        }
    }

    /**
     * Manages the JSON editing modal by using the CustomModal component.
     */
    class JsonModalComponent {
        constructor(callbacks) {
            this.callbacks = callbacks;
            this.modal = null; // To hold the CustomModal instance
        }

        async open(anchorElement) {
            if (this.modal) return;
            this.callbacks.onModalOpenStateChange?.(true);

            const p = APPID;
            this.modal = new CustomModal({
                title: `${APPNAME} Settings`,
                width: `${CONSTANTS.MODAL.WIDTH}px`,
                cssPrefix: `${p}-modal-shell`,
                styles: this.callbacks.siteStyles, // Pass styles to the modal
                buttons: [
                    { text: 'Export', id: `${p}-json-modal-export-btn`, className: '', onClick: () => this._handleExport() },
                    { text: 'Import', id: `${p}-json-modal-import-btn`, className: '', onClick: () => this._handleImport() },
                    { text: 'Save', id: `${p}-json-modal-save-btn`, className: '', onClick: () => this._handleSave() },
                    { text: 'Cancel', id: `${p}-json-modal-cancel-btn`, className: '', onClick: () => this.close() },
                ],
                onDestroy: () => {
                    this.callbacks.onModalOpenStateChange?.(false);
                    this.modal = null;
                },
            });

            this._injectStyles(); // This method is empty but kept for structural consistency
            const contentContainer = this.modal.getContentContainer();
            this._createContent(contentContainer);

            this.callbacks.onModalOpen?.(); // Notify UIManager to check for warnings

            const config = await this.callbacks.getCurrentConfig();
            const textarea = contentContainer.querySelector('textarea');
            if (textarea) {
                textarea.value = JSON.stringify(config, null, 2);
                // Set focus and move cursor to the start of the textarea.
                textarea.focus();
                textarea.scrollTop = 0;
                textarea.selectionStart = 0;
                textarea.selectionEnd = 0;
            }

            this.modal.show(anchorElement);
        }

        close() {
            if (this.modal) {
                this.modal.close();
            }
        }

        _createContent(parent) {
            const styles = this.callbacks.siteStyles;
            parent.style.paddingTop = '16px';
            parent.style.paddingBottom = '8px';

            const textarea = h('textarea', {
                style: {
                    width: '100%',
                    height: `${CONSTANTS.MODAL.TEXTAREA_HEIGHT}px`,
                    boxSizing: 'border-box',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    marginBottom: '0',
                    border: `1px solid ${styles.textarea_border}`,
                    background: styles.textarea_bg,
                    color: styles.textarea_text,
                },
            });
            const msgDiv = h(`div.${APPID}-modal-msg`, {
                style: {
                    color: styles.msg_error_text,
                    marginTop: '4px',
                    fontSize: '0.9em',
                },
            });
            parent.append(textarea, msgDiv);
        }

        async _handleSave() {
            const contentContainer = this.modal.getContentContainer();
            const textarea = contentContainer.querySelector('textarea');
            const msgDiv = contentContainer.querySelector(`.${APPID}-modal-msg`);

            if (!(textarea && msgDiv instanceof HTMLElement)) {
                return;
            }

            try {
                const obj = JSON.parse(textarea.value);
                await this.callbacks.onSave(obj);
                this.close();
            } catch (e) {
                // Display the specific error message from the save process.
                msgDiv.textContent = e.message;
                msgDiv.style.color = this.callbacks.siteStyles.msg_error_text;
            }
        }

        async _handleExport() {
            const msgDiv = this.modal.getContentContainer().querySelector(`.${APPID}-modal-msg`);
            if (!(msgDiv instanceof HTMLElement)) {
                return;
            }

            try {
                // Clear previous messages before starting.
                msgDiv.textContent = '';

                const config = await this.callbacks.getCurrentConfig();
                const jsonString = JSON.stringify(config, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = h('a', {
                    href: url,
                    download: `${APPID}_config.json`,
                });

                if (a instanceof HTMLElement) {
                    a.click();
                }

                // Revoke the URL after a delay to ensure the download has time to start.
                setTimeout(() => URL.revokeObjectURL(url), 10000);
                msgDiv.textContent = 'Export successful.';
                msgDiv.style.color = this.callbacks.siteStyles.msg_success_text;
            } catch (e) {
                msgDiv.textContent = `Export failed: ${e.message}`;
                msgDiv.style.color = this.callbacks.siteStyles.msg_error_text;
            }
        }

        _handleImport() {
            const contentContainer = this.modal.getContentContainer();
            const textarea = contentContainer.querySelector('textarea');
            const msgDiv = contentContainer.querySelector(`.${APPID}-modal-msg`);

            if (!(textarea && msgDiv instanceof HTMLElement)) {
                return;
            }

            const fileInput = h('input', {
                type: 'file',
                accept: 'application/json',
                onchange: (event) => {
                    const target = event.target;
                    if (!(target instanceof HTMLInputElement)) return;

                    const file = target.files?.[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const readerTarget = e.target;
                                if (readerTarget && typeof readerTarget.result === 'string') {
                                    const importedConfig = JSON.parse(readerTarget.result);
                                    textarea.value = JSON.stringify(importedConfig, null, 2);
                                    msgDiv.textContent = 'Import successful. Click "Save" to apply.';
                                    msgDiv.style.color = this.callbacks.siteStyles.msg_success_text;
                                }
                            } catch (err) {
                                msgDiv.textContent = `Import failed: ${err.message}`;
                                msgDiv.style.color = this.callbacks.siteStyles.msg_error_text;
                            }
                        };
                        reader.readAsText(file);
                    }
                },
            });

            if (fileInput instanceof HTMLElement) {
                fileInput.click();
            }
        }

        _injectStyles() {
            const styleId = `${APPID}-json-modal-styles`;
            if (document.getElementById(styleId)) {
                document.getElementById(styleId).remove();
            }
        }

        getContextForReopen() {
            return { type: 'json' };
        }
    }

    /**
     * Manages the Theme Settings modal by leveraging the CustomModal component.
     */
    class ThemeModalComponent extends UIComponentBase {
        static _PREVIEW_STYLE_DEFINITIONS = [
            // Actor-specific previews (user & assistant)
            { target: 'actor', property: 'backgroundColor', configKeySuffix: 'bubbleBackgroundColor', fallbackKey: 'bubbleBackgroundColor' },
            { target: 'actor', property: 'color', configKeySuffix: 'textColor', fallbackKey: 'textColor' },
            { target: 'actor', property: 'fontFamily', configKeySuffix: 'font', fallbackKey: 'font' },
            { target: 'actor', handler: '_updatePaddingPreview' },
            { target: 'actor', handler: '_updateRadiusPreview' },
            { target: 'actor', handler: '_updateMaxWidthPreview' },

            // InputArea preview
            { target: 'inputArea', property: 'backgroundColor', configKeySuffix: 'backgroundColor', fallbackKey: 'backgroundColor' },
            { target: 'inputArea', property: 'color', configKeySuffix: 'textColor', fallbackKey: 'textColor' },

            // Window preview
            { target: 'window', property: 'backgroundColor', configKeySuffix: 'backgroundColor', fallbackKey: 'backgroundColor' },
        ];

        constructor(callbacks) {
            super(callbacks);
            this.modal = null;
            this.colorPickerManager = null;
            this.dataConverter = callbacks.dataConverter;
            this.debouncedUpdatePreview = debounce(this._updateAllPreviews.bind(this), CONSTANTS.TIMING.DEBOUNCE_DELAYS.THEME_PREVIEW);

            // Centralized state management
            this.state = {
                activeThemeKey: null,
                uiMode: 'NORMAL', // 'NORMAL', 'RENAMING_THEME', 'CONFIRM_DELETE'
                pendingDeletionKey: null,
                config: null, // Holds the working copy of the config
            };

            // This will hold cached references to DOM elements within the modal.
            this.domCache = null;

            // Centralized UI definition
            this.uiDefinition = [
                {
                    type: 'container',
                    className: `${APPID}-theme-general-settings`,
                    isDefaultHidden: true,
                    children: [
                        {
                            type: 'textarea',
                            id: 'metadata.matchPatterns',
                            label: 'Patterns (one per line):',
                            tooltip: 'Enter one RegEx pattern per line to automatically apply this theme (e.g., /My Project/i).',
                            rows: 3,
                            validation: { type: 'regexArray' },
                        },
                    ],
                },
                { type: 'separator', isDefaultHidden: true },
                {
                    type: 'container',
                    className: `${APPID}-theme-scrollable-area`,
                    children: [
                        {
                            type: 'grid',
                            className: `${APPID}-theme-grid`,
                            children: [
                                this._createActorUiDefinition('assistant'),
                                this._createActorUiDefinition('user'),
                                {
                                    type: 'fieldset',
                                    legend: 'Background',
                                    children: [
                                        { type: 'colorfield', id: 'window.backgroundColor', label: 'Background color:', tooltip: 'Main background color of the chat window.' },
                                        {
                                            type: 'textfield',
                                            id: 'window.backgroundImageUrl',
                                            label: 'Background image:',
                                            tooltip: 'URL or Data URI for the main background image.',
                                            fieldType: 'image',
                                            validation: { type: 'imageString', imageType: 'image' },
                                        },
                                        {
                                            type: 'compound-container',
                                            children: [
                                                { type: 'select', id: 'window.backgroundSize', label: 'Size:', options: ['auto', 'cover', 'contain'], tooltip: 'How the background image is sized.' },
                                                {
                                                    type: 'select',
                                                    id: 'window.backgroundPosition',
                                                    label: 'Position:',
                                                    options: ['top left', 'top center', 'top right', 'center left', 'center center', 'center right', 'bottom left', 'bottom center', 'bottom right'],
                                                    tooltip: 'Position of the background image.',
                                                },
                                            ],
                                        },
                                        {
                                            type: 'compound-container',
                                            children: [{ type: 'select', id: 'window.backgroundRepeat', label: 'Repeat:', options: ['no-repeat', 'repeat'], tooltip: 'How the background image is repeated.' }, { type: 'preview-background' }],
                                        },
                                    ],
                                },
                                {
                                    type: 'fieldset',
                                    legend: 'Input area',
                                    children: [
                                        { type: 'colorfield', id: 'inputArea.backgroundColor', label: 'Background color:', tooltip: 'Background color of the text input area.' },
                                        { type: 'colorfield', id: 'inputArea.textColor', label: 'Text color:', tooltip: 'Color of the text you type.' },
                                        { type: 'separator' },
                                        { type: 'preview-input' },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ];
        }

        _createActorUiDefinition(actor) {
            return {
                type: 'fieldset',
                legend: actor.charAt(0).toUpperCase() + actor.slice(1),
                children: [
                    { type: 'textfield', id: `${actor}.name`, label: 'Name:', tooltip: `The name displayed for the ${actor}.`, fieldType: 'name' },
                    { type: 'textfield', id: `${actor}.icon`, label: 'Icon:', tooltip: `URL, Data URI, or <svg> for the ${actor}'s icon.`, fieldType: 'icon', validation: { type: 'imageString', imageType: 'icon' } },
                    {
                        type: 'textfield',
                        id: `${actor}.standingImageUrl`,
                        label: 'Standing image:',
                        tooltip: `URL or Data URI for the character's standing image.`,
                        fieldType: 'image',
                        validation: { type: 'imageString', imageType: 'image' },
                    },
                    {
                        type: 'fieldset',
                        legend: 'Bubble Settings',
                        children: [
                            { type: 'colorfield', id: `${actor}.bubbleBackgroundColor`, label: 'Background color:', tooltip: 'Background color of the message bubble.' },
                            { type: 'colorfield', id: `${actor}.textColor`, label: 'Text color:', tooltip: 'Color of the text inside the bubble.' },
                            { type: 'textfield', id: `${actor}.font`, label: 'Font:', tooltip: 'Font family for the text.\nFont names with spaces must be quoted (e.g., "Times New Roman").' },
                            { type: 'paddingslider', id: `${actor}.bubblePadding`, actor },
                            {
                                type: 'compound-slider',
                                children: [
                                    {
                                        type: 'slider',
                                        containerClass: `${APPID}-slider-subgroup`,
                                        label: 'Radius:',
                                        id: `${actor}.bubbleBorderRadius`,
                                        min: -1,
                                        max: 50,
                                        step: 1,
                                        tooltip: 'Corner roundness of the bubble (e.g., 10px).\nSet to the far left for (auto).',
                                        dataset: { sliderFor: `${actor}.bubbleBorderRadius`, unit: 'px', nullThreshold: 0 },
                                    },
                                    {
                                        type: 'slider',
                                        containerClass: `${APPID}-slider-subgroup`,
                                        label: 'max Width:',
                                        id: `${actor}.bubbleMaxWidth`,
                                        min: 29,
                                        max: 100,
                                        step: 1,
                                        tooltip: 'Maximum width of the bubble.\nSet to the far left for (auto).',
                                        dataset: { sliderFor: `${actor}.bubbleMaxWidth`, unit: '%', nullThreshold: 30 },
                                    },
                                ],
                            },
                            { type: 'separator' },
                            { type: 'preview', actor },
                        ],
                    },
                ],
            };
        }

        render() {
            this._injectStyles();
        }

        async open(selectThemeKey) {
            if (this.modal) return;
            this.callbacks.onModalOpenStateChange?.(true);

            const initialConfig = await this.callbacks.getCurrentConfig();
            if (!initialConfig) return;

            // Initialize state for the new session
            this.state = {
                activeThemeKey: selectThemeKey || 'defaultSet',
                uiMode: 'NORMAL',
                pendingDeletionKey: null,
                config: JSON.parse(JSON.stringify(initialConfig)), // Create a deep copy for editing
            };

            this.modal = new CustomModal({
                title: `${APPNAME} - Theme settings`,
                width: '880px',
                cssPrefix: `${APPID}-theme-modal-shell`,
                closeOnBackdropClick: false,
                styles: this.callbacks.siteStyles, // Pass styles to the modal
                buttons: [
                    { text: 'Apply', id: `${APPID}-theme-modal-apply-btn`, className: ``, title: 'Save changes and keep the modal open.', onClick: () => this._handleThemeAction(false) },
                    { text: 'Save', id: `${APPID}-theme-modal-save-btn`, className: ``, title: 'Save changes and close the modal.', onClick: () => this._handleThemeAction(true) },
                    { text: 'Cancel', id: `${APPID}-theme-modal-cancel-btn`, className: ``, title: 'Discard changes and close the modal.', onClick: () => this.close() },
                ],
                onDestroy: () => {
                    this.callbacks.onModalOpenStateChange?.(false);
                    this.colorPickerManager?.destroy();
                    this.colorPickerManager = null;
                    this.modal = null;
                    this.domCache = null; // Clear the cache on destroy
                },
            });

            const headerControls = this._createHeaderControls();
            const mainContent = this._createMainContent();
            // CustomModal now handles its own base styling, so we just add content.
            Object.assign(this.modal.dom.header.style, {
                borderBottom: `1px solid ${this.callbacks.siteStyles.modal_border}`,
                paddingBottom: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '12px',
            });
            Object.assign(this.modal.dom.footer.style, {
                borderTop: `1px solid ${this.callbacks.siteStyles.modal_border}`,
                paddingTop: '16px',
            });
            this.modal.dom.header.appendChild(headerControls);
            this.modal.setContent(mainContent);

            this._cacheDomReferences(); // Cache DOM element references once.
            this._setupEventListeners();
            this.colorPickerManager = new ColorPickerPopupManager(this.modal.element);
            this.colorPickerManager.init();

            this.callbacks.onModalOpen?.();

            await this._populateFormWithThemeData();
            this._renderUI();

            this.modal.show();
            requestAnimationFrame(() => {
                const scrollableArea = this.modal.element.querySelector(`.${APPID}-theme-scrollable-area`);
                if (scrollableArea) scrollableArea.scrollTop = 0;
            });
        }

        /**
         * @private
         * Caches references to all frequently accessed DOM elements within the modal
         * to avoid repeated querySelector calls during preview updates.
         */
        _cacheDomReferences() {
            if (!this.modal) return;
            const modalElement = this.modal.element;

            this.domCache = {
                inputs: {},
                sliders: {},
                previews: {},
                paddingSliders: {
                    user: {},
                    assistant: {},
                },
            };

            this._traverseUIDefinition(this.uiDefinition, (def) => {
                const formId = `${APPID}-form-${def.id.replace(/\./g, '-')}`;
                switch (def.type) {
                    case 'textfield':
                    case 'textarea':
                    case 'select':
                    case 'colorfield':
                        this.domCache.inputs[def.id] = modalElement.querySelector(`#${formId}`);
                        break;
                    case 'slider':
                        this.domCache.sliders[def.id] = modalElement.querySelector(`#${formId}-slider`);
                        break;
                }
            });

            ['user', 'assistant'].forEach((actor) => {
                this.domCache.previews[actor] = modalElement.querySelector(`[data-preview-for="${actor}"]`);
                this.domCache.paddingSliders[actor].tb = modalElement.querySelector(`#${APPID}-form-${actor}-bubblePadding-tb`);
                this.domCache.paddingSliders[actor].lr = modalElement.querySelector(`#${APPID}-form-${actor}-bubblePadding-lr`);
            });
            this.domCache.previews.inputArea = modalElement.querySelector('[data-preview-for="inputArea"]');
            this.domCache.previews.window = modalElement.querySelector('[data-preview-for="window"]');
        }

        close() {
            this.modal?.close();
        }

        _renderUI() {
            if (!this.modal) return;

            const { uiMode, activeThemeKey, config } = this.state;
            const isDefault = activeThemeKey === 'defaultSet';
            const isRenaming = uiMode === 'RENAMING_THEME';
            const isDeleting = uiMode === 'CONFIRM_DELETE';

            const headerRow = this.modal.element.querySelector(`.${APPID}-header-row`);
            const generalSettingsArea = this.modal.element.querySelector(`.${APPID}-theme-general-settings`);
            const scrollArea = this.modal.element.querySelector(`.${APPID}-theme-scrollable-area`);

            // --- UI Element References ---
            const select = headerRow.querySelector('select');
            const renameInput = headerRow.querySelector('input[type="text"]');
            const mainActions = headerRow.querySelector(`#${APPID}-theme-main-actions`);
            const renameActions = headerRow.querySelector(`#${APPID}-theme-rename-actions`);
            const deleteConfirmGroup = headerRow.querySelector(`#${APPID}-theme-delete-confirm-group`);

            // --- Toggle visibility based on mode ---
            select.style.display = isRenaming ? 'none' : 'block';
            renameInput.style.display = isRenaming ? 'block' : 'none';
            mainActions.style.visibility = uiMode === 'NORMAL' ? 'visible' : 'hidden';
            renameActions.style.display = isRenaming ? 'flex' : 'none';
            deleteConfirmGroup.style.display = isDeleting ? 'flex' : 'none';

            // --- Populate select box if not renaming ---
            if (!isRenaming) {
                const scroll = select.scrollTop;
                select.textContent = '';
                select.appendChild(h('option', { value: 'defaultSet' }, 'Default Settings'));
                config.themeSets.forEach((theme, index) => {
                    const themeName = (theme.metadata?.name || '').trim() || `Theme ${index + 1}`;
                    select.appendChild(h('option', { value: theme.metadata.id }, themeName));
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
            const isActionInProgress = uiMode !== 'NORMAL';
            const index = config.themeSets.findIndex((t) => t.metadata.id === activeThemeKey);
            headerRow.querySelector(`#${APPID}-theme-up-btn`).disabled = isActionInProgress || isDefault || index <= 0;
            headerRow.querySelector(`#${APPID}-theme-down-btn`).disabled = isActionInProgress || isDefault || index >= config.themeSets.length - 1;
            headerRow.querySelector(`#${APPID}-theme-delete-btn`).disabled = isActionInProgress || isDefault;
            headerRow.querySelector(`#${APPID}-theme-new-btn`).disabled = isActionInProgress;
            headerRow.querySelector(`#${APPID}-theme-copy-btn`).disabled = isActionInProgress;
            headerRow.querySelector(`#${APPID}-theme-rename-btn`).disabled = isActionInProgress || isDefault;

            // --- Disable content areas and footer buttons during actions ---
            if (generalSettingsArea) generalSettingsArea.classList.toggle('is-disabled', isActionInProgress);
            scrollArea.classList.toggle('is-disabled', isActionInProgress);
            this.modal.element.querySelector(`#${APPID}-theme-modal-apply-btn`).disabled = isActionInProgress;
            this.modal.element.querySelector(`#${APPID}-theme-modal-save-btn`).disabled = isActionInProgress;
            this.modal.element.querySelector(`#${APPID}-theme-modal-cancel-btn`).disabled = isActionInProgress;
        }

        _createHeaderControls() {
            const type = 'theme';
            return h(`div.${APPID}-theme-modal-header-controls`, [
                h(`div.${APPID}-header-row`, { 'data-type': type }, [
                    h('label', { htmlFor: `${APPID}-${type}-select` }, 'Theme:'),
                    h(`div.${APPID}-rename-area`, [h(`select#${APPID}-${type}-select`), h('input', { type: 'text', id: `${APPID}-${type}-rename-input`, style: { display: 'none' } })]),
                    h(`div.${APPID}-action-area`, [
                        h(`div#${APPID}-${type}-main-actions`, [
                            h(`button#${APPID}-${type}-rename-btn.${APPID}-modal-button`, 'Rename'),
                            h(`button#${APPID}-${type}-up-btn.${APPID}-modal-button.${APPID}-move-btn`, [createIconFromDef(SITE_STYLES.ICONS.arrowUp)]),
                            h(`button#${APPID}-${type}-down-btn.${APPID}-modal-button.${APPID}-move-btn`, [createIconFromDef(SITE_STYLES.ICONS.arrowDown)]),
                            h(`button#${APPID}-${type}-new-btn.${APPID}-modal-button`, 'New'),
                            h(`button#${APPID}-${type}-copy-btn.${APPID}-modal-button`, 'Copy'),
                            h(`button#${APPID}-${type}-delete-btn.${APPID}-modal-button`, 'Delete'),
                        ]),
                        h(`div#${APPID}-${type}-rename-actions`, { style: { display: 'none' } }, [
                            h(`button#${APPID}-${type}-rename-ok-btn.${APPID}-modal-button`, 'OK'),
                            h(`button#${APPID}-${type}-rename-cancel-btn.${APPID}-modal-button`, 'Cancel'),
                        ]),
                        h(`div#${APPID}-${type}-delete-confirm-group.${APPID}-delete-confirm-group`, { style: { display: 'none' } }, [
                            h(`span.${APPID}-delete-confirm-label`, 'Are you sure?'),
                            h(`button#${APPID}-${type}-delete-confirm-btn.${APPID}-modal-button.${APPID}-delete-confirm-btn-yes`, 'Confirm Delete'),
                            h(`button#${APPID}-${type}-delete-cancel-btn.${APPID}-modal-button`, 'Cancel'),
                        ]),
                    ]),
                ]),
            ]);
        }

        _createMainContent() {
            return h(`div.${APPID}-theme-modal-content`, [this._buildUIFromDefinition(this.uiDefinition)]);
        }

        _buildUIFromDefinition(definitions) {
            return buildUIFromSchema(definitions);
        }

        _traverseUIDefinition(definitions, callback) {
            if (!definitions) return;
            for (const def of definitions) {
                if (def.id) {
                    callback(def);
                }
                if (def.children) {
                    this._traverseUIDefinition(def.children, callback);
                }
            }
        }

        _updateAllPreviews() {
            this._updatePreviewFor('user');
            this._updatePreviewFor('assistant');
            this._updatePreviewFor('inputArea');
            this._updatePreviewFor('window');
        }

        /**
         * @private
         * @param {'user' | 'assistant' | 'inputArea' | 'window'} target The UI section to update the preview for.
         */
        _updatePreviewFor(target) {
            if (!this.modal || !this.domCache) return;
            const config = this.state.config;
            if (!config) return;

            const isActor = target === 'user' || target === 'assistant';
            const configPath = isActor ? target : target;

            const isEditingDefaultSet = this.state.activeThemeKey === 'defaultSet';
            const defaultSet = config.defaultSet[configPath] || {};
            const fallbackSet = isEditingDefaultSet ? {} : defaultSet;

            requestAnimationFrame(() => {
                const previewElement = this.domCache.previews[target];
                if (!previewElement) return;

                const definitions = ThemeModalComponent._PREVIEW_STYLE_DEFINITIONS.filter((def) => def.target === (isActor ? 'actor' : target));

                for (const def of definitions) {
                    if (def.handler) {
                        this[def.handler](target, previewElement, fallbackSet);
                    } else {
                        const configKey = `${configPath}.${def.configKeySuffix}`;
                        const inputElement = this.domCache.inputs[configKey];
                        const currentValue = inputElement ? inputElement.value.trim() || null : null;
                        const finalValue = currentValue ?? fallbackSet[def.fallbackKey] ?? '';
                        previewElement.style[def.property] = finalValue;
                    }
                }
            });
        }

        /**
         * @private
         * @param {'user' | 'assistant'} actor
         * @param {HTMLElement} previewElement
         * @param {object} fallbackSet
         */
        _updatePaddingPreview(actor, previewElement, fallbackSet) {
            const paddingTBSlider = this.domCache.paddingSliders[actor].tb;
            const paddingLRSlider = this.domCache.paddingSliders[actor].lr;
            const tbVal = paddingTBSlider && paddingTBSlider.value < 0 ? null : paddingTBSlider?.value;
            const lrVal = paddingLRSlider && paddingLRSlider.value < 0 ? null : paddingLRSlider?.value;

            const defaultPaddingValue = fallbackSet.bubblePadding;
            if (tbVal === null && lrVal === null && defaultPaddingValue === null) {
                previewElement.style.padding = '';
            } else {
                const defaultPaddingParts = (defaultPaddingValue || '6px 10px').split(' ');
                const defaultTB = parseInt(defaultPaddingParts[0], 10);
                const defaultLR = parseInt(defaultPaddingParts[1] || defaultPaddingParts[0], 10);
                const finalTB = tbVal !== null ? tbVal : defaultTB;
                const finalLR = lrVal !== null ? lrVal : defaultLR;
                previewElement.style.padding = `${finalTB}px ${finalLR}px`;
            }
        }

        /**
         * @private
         * @param {'user' | 'assistant'} actor
         * @param {HTMLElement} previewElement
         * @param {object} fallbackSet
         */
        _updateRadiusPreview(actor, previewElement, fallbackSet) {
            const radiusSlider = this.domCache.sliders[`${actor}.bubbleBorderRadius`];
            if (radiusSlider) {
                const radiusVal = parseInt(radiusSlider.value, 10);
                const nullThreshold = parseInt(radiusSlider.dataset.nullThreshold, 10);
                const currentRadius = !isNaN(nullThreshold) && radiusVal < nullThreshold ? null : `${radiusVal}px`;
                previewElement.style.borderRadius = currentRadius ?? fallbackSet.bubbleBorderRadius ?? '';
            }
        }

        /**
         * @private
         * @param {'user' | 'assistant'} actor
         * @param {HTMLElement} previewElement
         * @param {object} fallbackSet
         */
        _updateMaxWidthPreview(actor, previewElement, fallbackSet) {
            const widthSlider = this.domCache.sliders[`${actor}.bubbleMaxWidth`];
            if (widthSlider) {
                const widthVal = parseInt(widthSlider.value, 10);
                const nullThreshold = parseInt(widthSlider.dataset.nullThreshold, 10);
                const currentWidth = !isNaN(nullThreshold) && widthVal < nullThreshold ? null : `${widthVal}%`;
                const finalWidth = currentWidth ?? fallbackSet.bubbleMaxWidth ?? (actor === 'user' ? '50%' : '90%');
                previewElement.style.width = finalWidth;
                previewElement.style.maxWidth = finalWidth;
            }
        }

        _setFieldError(fieldName, message) {
            if (!this.modal) return;
            const errorElement = this.modal.element.querySelector(`[data-error-for="${fieldName}"]`);
            const inputElement = this.modal.element.querySelector(`#${APPID}-form-${fieldName}`);
            if (errorElement) {
                errorElement.textContent = message;
            }
            if (inputElement) {
                inputElement.closest(`.${APPID}-input-wrapper, .${APPID}-form-field`)?.querySelector('input, textarea')?.classList.add('is-invalid');
            }
        }

        _clearAllFieldErrors() {
            if (!this.modal) return;
            this.modal.element.querySelectorAll(`.${APPID}-form-error-msg`).forEach((el) => {
                el.textContent = '';
            });
            this.modal.element.querySelectorAll('.is-invalid').forEach((el) => {
                el.classList.remove('is-invalid');
            });
        }

        /**
         * Determines the resize options for an image based on the input field's ID.
         * @param {string} targetId The ID of the target input field.
         * @param {object} config The current configuration object to retrieve settings like icon_size.
         * @returns {object} The options object for imageToOptimizedDataUrl.
         */
        _getImageOptions(targetId, config) {
            if (targetId.includes('backgroundImageUrl')) {
                return { maxWidth: 1920, quality: 0.85 };
            }
            if (targetId.includes('standingImageUrl')) {
                return { maxHeight: 1080, quality: 0.85 };
            }
            // For icons, resize to the currently configured icon size.
            if (targetId.includes('icon')) {
                const iconSize = config?.options?.icon_size ?? CONSTANTS.ICON_SIZE;
                return { maxWidth: iconSize, maxHeight: iconSize, quality: 0.85 };
            }
            return { quality: 0.85 }; // Default
        }

        /**
         * Handles the local file selection process.
         * @param {HTMLElement} button The clicked file selection button.
         */
        async _handleLocalFileSelect(button) {
            const targetId = button.dataset.targetId;
            const targetInput = document.getElementById(`${APPID}-form-${targetId}`);
            if (!(targetInput instanceof HTMLInputElement)) {
                return;
            }

            const fileInput = h('input', { type: 'file', accept: 'image/*' });
            fileInput.onchange = async (event) => {
                const target = event.target;
                if (!(target instanceof HTMLInputElement)) return;

                const file = target.files?.[0];
                if (!file) return;

                const errorField = this.modal.element.querySelector(`[data-error-for="${targetId.replace(/\./g, '-')}"]`);
                try {
                    // Clear any previous error and show a neutral "Processing..." message.
                    if (errorField instanceof HTMLElement) {
                        errorField.textContent = 'Processing...';
                        errorField.style.color = SITE_STYLES.JSON_MODAL.msg_success_text;
                    }

                    const options = this._getImageOptions(targetId, this.state.config);
                    const dataUrl = await this.dataConverter.imageToOptimizedDataUrl(file, options);
                    targetInput.value = dataUrl;
                    targetInput.dispatchEvent(new Event('input', { bubbles: true }));

                    // Clear the "Processing..." message on success.
                    if (errorField instanceof HTMLElement) {
                        errorField.textContent = '';
                        errorField.style.color = ''; // Reset color to inherit from CSS
                    }
                } catch (error) {
                    Logger.error('Image processing failed:', error);
                    // Show a proper error message with the error color on failure.
                    if (errorField instanceof HTMLElement) {
                        errorField.textContent = `Error: ${error.message}`;
                        errorField.style.color = SITE_STYLES.THEME_MODAL.error_text;
                    }
                }
            };

            if (fileInput instanceof HTMLElement) {
                fileInput.click();
            }
        }

        _setupEventListeners() {
            if (!this.modal) return;
            const modalElement = this.modal.element;

            // Listen for custom color picker events
            modalElement.addEventListener('color-change', () => this.debouncedUpdatePreview());

            modalElement.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;

                // Handle local file selection button
                if (target.matches(`.${APPID}-local-file-btn`)) {
                    this._handleLocalFileSelect(target);
                    return;
                }

                const actionMap = {
                    [`${APPID}-theme-new-btn`]: () => this._handleThemeNew(),
                    [`${APPID}-theme-copy-btn`]: () => this._handleThemeCopy(),
                    [`${APPID}-theme-delete-btn`]: () => this._handleDeleteClick(),
                    [`${APPID}-theme-delete-confirm-btn`]: () => this._handleThemeDeleteConfirm(),
                    [`${APPID}-theme-delete-cancel-btn`]: () => this._handleActionCancel(),
                    [`${APPID}-theme-up-btn`]: () => this._handleThemeMove(-1),
                    [`${APPID}-theme-down-btn`]: () => this._handleThemeMove(1),
                    [`${APPID}-theme-rename-btn`]: () => this._handleRenameClick(),
                    [`${APPID}-theme-rename-ok-btn`]: () => this._handleRenameConfirm(),
                    [`${APPID}-theme-rename-cancel-btn`]: () => this._handleActionCancel(),
                };
                const action = actionMap[target.id];
                if (action) action();
            });

            modalElement.addEventListener('change', (e) => {
                if (e.target.matches(`#${APPID}-theme-select`)) {
                    this.state.activeThemeKey = e.target.value;
                    this._populateFormWithThemeData();
                    this._renderUI();
                }
            });

            modalElement.addEventListener('input', (e) => {
                const target = e.target;

                // Trigger preview for text-based inputs
                if (target.matches('input[type="text"], textarea, select')) {
                    this.debouncedUpdatePreview();
                }

                // Handle all range sliders consistently
                if (target.matches('input[type="range"]')) {
                    this._updateSliderDisplay(target);
                    this.debouncedUpdatePreview();
                }
            });

            modalElement.addEventListener('mouseover', (e) => {
                if (e.target.matches('input[type="text"], textarea') && (e.target.offsetWidth < e.target.scrollWidth || e.target.offsetHeight < e.target.scrollHeight)) {
                    e.target.title = e.target.value;
                }
            });

            modalElement.addEventListener('mouseout', (e) => {
                if (e.target.matches('input[type="text"], textarea')) e.target.title = '';
            });

            modalElement.addEventListener('keydown', (e) => {
                if (e.target.matches(`#${APPID}-theme-rename-input`)) {
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

        _updateSliderDisplay(slider) {
            const displayId = slider.dataset.sliderFor;
            if (!displayId) return;

            const display = this.modal.element.querySelector(`[data-slider-display-for="${displayId}"]`);
            if (!display) return;

            updateSliderDisplay(slider, display);
        }

        async _populateFormWithThemeData() {
            if (!this.modal || !this.domCache) return;
            const { activeThemeKey, config } = this.state;
            const modalElement = this.modal.element;
            const scrollableArea = modalElement.querySelector(`.${APPID}-theme-scrollable-area`);
            if (scrollableArea) scrollableArea.style.visibility = 'hidden';

            this._clearAllFieldErrors();

            const isDefault = activeThemeKey === 'defaultSet';
            const theme = isDefault ? config.defaultSet : config.themeSets.find((t) => t.metadata.id === activeThemeKey);
            if (!theme) {
                if (scrollableArea) scrollableArea.style.visibility = 'visible';
                return;
            }

            populateFormFromSchema(this.uiDefinition, modalElement, theme, this);

            // Show/hide fields specific to non-default themes
            modalElement.querySelectorAll('[data-is-default-hidden]').forEach((el) => {
                el.style.display = isDefault ? 'none' : '';
            });

            this._updateAllPreviews();
            if (scrollableArea) scrollableArea.style.visibility = 'visible';
        }

        _collectThemeDataFromForm() {
            if (!this.modal || !this.domCache) return null;
            const themeData = { metadata: {}, user: {}, assistant: {}, window: {}, inputArea: {} };
            const modalElement = this.modal.element;

            collectDataFromSchema(this.uiDefinition, modalElement, themeData);

            return themeData;
        }

        async _saveConfigAndHandleFeedback(newConfig, onSuccessCallback) {
            if (!this.modal) return false;
            const footerMessage = this.modal.dom.footerMessage;
            if (footerMessage) footerMessage.textContent = '';

            try {
                await this.callbacks.onSave(newConfig);
                this.state.config = JSON.parse(JSON.stringify(newConfig)); // Update local state on success
                if (onSuccessCallback) await onSuccessCallback();
                return true;
            } catch (e) {
                if (footerMessage) {
                    footerMessage.textContent = e.message;
                    footerMessage.style.color = this.callbacks.siteStyles.error_text;
                }
                return false;
            }
        }

        async _handleThemeAction(shouldClose) {
            // Clear the global footer message on a new action
            if (this.modal?.dom?.footerMessage) this.modal.dom.footerMessage.textContent = '';

            const themeData = this._collectThemeDataFromForm();
            if (!themeData) return;

            const validationResult = ConfigProcessor.validate(themeData, this.state.activeThemeKey === 'defaultSet');
            if (!validationResult.isValid) {
                validationResult.errors.forEach((err) => this._setFieldError(err.field, err.message));
                return;
            }

            const newConfig = JSON.parse(JSON.stringify(this.state.config));
            if (this.state.activeThemeKey === 'defaultSet') {
                // Use deepMerge to apply changes to defaultSet
                deepMerge(newConfig.defaultSet, themeData);
                // metadata is not part of defaultSet, so clear it
                delete newConfig.defaultSet.metadata;
            } else {
                const index = newConfig.themeSets.findIndex((t) => t.metadata.id === this.state.activeThemeKey);
                if (index !== -1) {
                    // Preserve existing metadata not edited in this form (like name and id)
                    const existingMetadata = newConfig.themeSets[index].metadata;
                    themeData.metadata = { ...existingMetadata, matchPatterns: themeData.metadata.matchPatterns };
                    newConfig.themeSets[index] = themeData;
                }
            }

            const onSuccess = async () => (shouldClose ? this.close() : this._renderUI());
            await this._saveConfigAndHandleFeedback(newConfig, onSuccess);
        }

        _handleThemeNew() {
            const { config } = this.state;
            const existingNames = new Set(config.themeSets.map((t) => t.metadata.name?.trim().toLowerCase()));
            const newName = proposeUniqueName('New Theme', existingNames);
            const newTheme = {
                metadata: { id: generateUniqueId(), name: newName, matchPatterns: [] },
                user: {},
                assistant: {},
                window: {},
                inputArea: {},
            };
            const newConfig = JSON.parse(JSON.stringify(config));
            newConfig.themeSets.push(newTheme);

            const onSuccess = () => {
                this.state.activeThemeKey = newTheme.metadata.id;
                this.state.uiMode = 'RENAMING_THEME';
                this._populateFormWithThemeData();
                this._renderUI();
                const input = this.modal.element.querySelector(`#${APPID}-theme-rename-input`);
                if (input) {
                    input.focus();
                    input.select();
                }
            };
            this._saveConfigAndHandleFeedback(newConfig, onSuccess);
        }

        _handleThemeCopy() {
            const { config, activeThemeKey } = this.state;
            const isDefault = activeThemeKey === 'defaultSet';
            const themeToCopy = isDefault ? { metadata: { name: 'Default' }, ...config.defaultSet } : config.themeSets.find((t) => t.metadata.id === activeThemeKey);
            if (!themeToCopy) return;

            const baseName = `${themeToCopy.metadata.name || 'Theme'} Copy`;
            const existingNames = new Set(config.themeSets.map((t) => t.metadata.name?.trim().toLowerCase()));
            const newName = proposeUniqueName(baseName, existingNames);
            const newTheme = JSON.parse(JSON.stringify(themeToCopy));

            newTheme.metadata = { ...newTheme.metadata, id: generateUniqueId(), name: newName };
            if (isDefault) newTheme.metadata.matchPatterns = [];

            const newConfig = JSON.parse(JSON.stringify(config));
            newConfig.themeSets.push(newTheme);

            const onSuccess = () => {
                this.state.activeThemeKey = newTheme.metadata.id;
                this._populateFormWithThemeData();
                this._renderUI();
            };
            this._saveConfigAndHandleFeedback(newConfig, onSuccess);
        }

        _handleThemeMove(direction) {
            const { config, activeThemeKey } = this.state;
            if (activeThemeKey === 'defaultSet') return;
            const currentIndex = config.themeSets.findIndex((t) => t.metadata.id === activeThemeKey);
            if (currentIndex === -1) return;
            const newIndex = currentIndex + direction;
            if (newIndex < 0 || newIndex >= config.themeSets.length) return;

            const newConfig = JSON.parse(JSON.stringify(config));
            const item = newConfig.themeSets.splice(currentIndex, 1)[0];
            newConfig.themeSets.splice(newIndex, 0, item);

            this._saveConfigAndHandleFeedback(newConfig, () => this._renderUI());
        }

        _handleRenameClick() {
            this.state.uiMode = 'RENAMING_THEME';
            this._renderUI();
            const input = this.modal.element.querySelector(`#${APPID}-theme-rename-input`);
            if (input) {
                input.focus();
                input.select();
            }
        }

        _handleRenameConfirm() {
            const { config, activeThemeKey } = this.state;
            const footerMessage = this.modal?.dom?.footerMessage;
            if (footerMessage) footerMessage.textContent = '';

            const input = this.modal.element.querySelector(`#${APPID}-theme-rename-input`);
            const newName = input.value.trim();

            if (!newName) {
                if (footerMessage) footerMessage.textContent = 'Theme name cannot be empty.';
                return;
            }
            const isNameTaken = config.themeSets.some((t) => t.metadata.id !== activeThemeKey && t.metadata.name?.toLowerCase() === newName.toLowerCase());
            if (isNameTaken) {
                if (footerMessage) footerMessage.textContent = `Name "${newName}" is already in use.`;
                return;
            }

            const newConfig = JSON.parse(JSON.stringify(config));
            const themeToUpdate = newConfig.themeSets.find((t) => t.metadata.id === activeThemeKey);
            if (themeToUpdate) {
                themeToUpdate.metadata.name = newName;
                this._saveConfigAndHandleFeedback(newConfig, () => {
                    this.state.uiMode = 'NORMAL';
                    this._renderUI();
                });
            }
        }

        _handleDeleteClick() {
            this.state.uiMode = 'CONFIRM_DELETE';
            this.state.pendingDeletionKey = this.state.activeThemeKey;
            this._renderUI();
        }

        _handleThemeDeleteConfirm() {
            const { config, pendingDeletionKey } = this.state;
            if (pendingDeletionKey === 'defaultSet' || !pendingDeletionKey) {
                this._handleActionCancel();
                return;
            }
            const newConfig = JSON.parse(JSON.stringify(config));
            newConfig.themeSets = newConfig.themeSets.filter((t) => t.metadata.id !== pendingDeletionKey);
            this._saveConfigAndHandleFeedback(newConfig, () => {
                this.state.activeThemeKey = 'defaultSet';
                this.state.pendingDeletionKey = null;
                this.state.uiMode = 'NORMAL';
                this._populateFormWithThemeData();
                this._renderUI();
            });
        }

        _handleActionCancel() {
            this.state.uiMode = 'NORMAL';
            this.state.pendingDeletionKey = null;
            this._renderUI();
        }

        getContextForReopen() {
            return { type: 'theme', key: this.state.activeThemeKey };
        }

        _injectStyles() {
            const styleId = `${APPID}-theme-modal-styles`;
            if (document.getElementById(styleId)) return;

            const styles = SITE_STYLES.THEME_MODAL;
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* --- New styles for rename UI --- */
                .${APPID}-theme-modal-header-controls {
                  display: flex;
                  flex-direction: column;
                  gap: 12px;
                }
                .${APPID}-header-row {
                  display: grid;
                  grid-template-columns: 5.5rem 1fr auto;
                  gap: 8px;
                  align-items: center;
                }
                .${APPID}-header-row > label {
                  grid-column: 1;
                  text-align: right;
                  color: ${styles.label_text};
                  font-size: 0.9em;
                }
                .${APPID}-header-row > .${APPID}-rename-area {
                  grid-column: 2;
                  min-width: 180px; /* Ensure a minimum width */
                }
                .${APPID}-header-row > .${APPID}-action-area {
                  grid-column: 3;
                  display: grid; /* Use grid for stacking */
                  align-items: center;
                }
                .${APPID}-action-area > * {
                    grid-area: 1 / 1;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .${APPID}-theme-general-settings.is-disabled,
                .${APPID}-theme-scrollable-area.is-disabled {
                  pointer-events: none;
                  opacity: 0.5;
                }
                .${APPID}-input-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .${APPID}-input-wrapper input {
                    flex-grow: 1;
                }
                .${APPID}-local-file-btn {
                    flex-shrink: 0;
                    padding: 4px 6px;
                    height: 32px; /* Match input height */
                    line-height: 1;
                    font-size: 16px;
                    background: ${styles.btn_bg};
                    border: 1px solid ${styles.btn_border};
                    border-radius: 4px;
                    cursor: pointer;
                    color: ${styles.btn_text};
                }
                .${APPID}-local-file-btn:hover {
                    background: ${styles.btn_hover_bg};
                }
                /* --- Existing styles --- */
                .${APPID}-form-error-msg {
                  color: ${styles.error_text};
                  font-size: 0.8em;
                  margin-top: 2px;
                  white-space: pre-wrap;
                }
                .${APPID}-theme-modal-shell-box .is-invalid {
                  border-color: ${styles.error_text} !important;
                }
                .${APPID}-delete-confirm-group {
                    display: none;
                }
                .${APPID}-delete-confirm-group:not([hidden]) {
                  align-items: center;
                  display: flex;
                  gap: 8px;
                }
                .${APPID}-delete-confirm-label {
                  color: ${styles.delete_confirm_label_text};
                  font-style: italic;
                  margin-right: auto;
                }
                .${APPID}-delete-confirm-btn-yes {
                  background-color: ${styles.delete_confirm_btn_bg} !important;
                  color: ${styles.delete_confirm_btn_text} !important;
                }
                .${APPID}-delete-confirm-btn-yes:hover {
                  background-color: ${styles.delete_confirm_btn_hover_bg} !important;
                  color: ${styles.delete_confirm_btn_hover_text} !important;
                }
                .${APPID}-modal-button.${APPID}-move-btn {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  line-height: 1;
                  min-width: 24px;
                  padding: 4px;
                  height: 24px;
                  width: 24px;
                }
                .${APPID}-theme-modal-content {
                  display: flex;
                  flex-direction: column;
                  gap: 16px;
                  height: 70vh;
                  min-height: 400px;
                  overflow: hidden;
                }
                .${APPID}-theme-separator {
                  border: none;
                  border-top: 1px solid ${styles.modal_border};
                  margin: 0;
                }
                fieldset > .${APPID}-theme-separator {
                  margin: 8px 0;
                }
                .${APPID}-theme-general-settings {
                  display: grid;
                  gap: 16px;
                  grid-template-columns: 1fr;
                  transition: opacity 0.2s;
                }
                .${APPID}-theme-scrollable-area {
                  flex-grow: 1;
                  overflow-y: auto;
                  padding-bottom: 8px;
                  padding-right: 8px;
                  transition: opacity 0.2s;
                }
                .${APPID}-theme-scrollable-area:focus {
                  outline: none;
                }
                .${APPID}-theme-grid {
                  display: grid;
                  gap: 16px;
                  grid-template-columns: 1fr 1fr;
                }
                .${APPID}-theme-modal-shell-box fieldset {
                  border: 1px solid ${styles.fieldset_border};
                  border-radius: 4px;
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
                  margin: 0;
                  padding: 12px;
                }
                .${APPID}-theme-modal-shell-box fieldset legend {
                  color: ${styles.legend_text};
                  font-weight: 500;
                  padding: 0 4px;
                }
                .${APPID}-form-field {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
                }
                .${APPID}-form-field > label {
                  color: ${styles.label_text};
                  font-size: 0.9em;
                }
                .${APPID}-color-field-wrapper {
                  display: flex;
                  gap: 8px;
                }
                .${APPID}-color-field-wrapper input[type="text"] {
                  flex-grow: 1;
                }
                .${APPID}-color-field-wrapper input[type="text"].is-invalid {
                  outline: 2px solid ${styles.error_text};
                  outline-offset: -2px;
                }
                .${APPID}-color-swatch {
                  background-color: transparent;
                  border: 1px solid ${styles.input_border};
                  border-radius: 4px;
                  cursor: pointer;
                  flex-shrink: 0;
                  height: 32px;
                  padding: 2px;
                  position: relative;
                  width: 32px;
                }
                .${APPID}-color-swatch-checkerboard, .${APPID}-color-swatch-value {
                  border-radius: 2px;
                  height: auto;
                  inset: 2px;
                  position: absolute;
                  width: auto;
                }
                .${APPID}-color-swatch-checkerboard {
                  background-image: repeating-conic-gradient(#808080 0% 25%, #c0c0c0 0% 50%);
                  background-size: 12px 12px;
                }
                .${APPID}-color-swatch-value {
                  transition: background-color: 0.1s;
                }
                .${APPID}-theme-modal-shell-box input,
                .${APPID}-theme-modal-shell-box textarea,
                .${APPID}-theme-modal-shell-box select {
                  background: ${styles.input_bg};
                  border: 1px solid ${styles.input_border};
                  border-radius: 4px;
                  box-sizing: border-box;
                  color: ${styles.input_text};
                  padding: 6px 8px;
                  width: 100%;
                }
                .${APPID}-theme-modal-shell-box textarea {
                  resize: vertical;
                }
                .${APPID}-slider-subgroup-control {
                  align-items: center;
                  display: flex;
                  gap: 8px;
                }
                .${APPID}-slider-subgroup-control input[type=range] {
                  flex-grow: 1;
                }
                .${APPID}-slider-subgroup-control span {
                  color: ${styles.slider_display_text};
                  font-family: monospace;
                  min-width: 4em;
                  text-align: right;
                }
                .${APPID}-slider-subgroup-control.is-default span {
                  color: ${styles.label_text};
                }
                .${APPID}-compound-slider-container {
                  display: flex;
                  gap: 16px;
                  margin-top: 4px;
                }
                .${APPID}-compound-form-field-container {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 16px;
                }
                .${APPID}-slider-subgroup {
                  flex: 1;
                }
                .${APPID}-slider-subgroup > label {
                  color: ${styles.label_text};
                  display: block;
                  font-size: 0.9em;
                  margin-bottom: 4px;
                }
                .${APPID}-preview-container {
                  margin-top: 0;
                }
                .${APPID}-preview-container > label {
                  color: ${styles.label_text};
                  display: block;
                  font-size: 0.9em;
                  margin-bottom: 4px;
                }
                .${APPID}-preview-bubble-wrapper {
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
                .${APPID}-preview-bubble-wrapper.user-preview {
                  text-align: right;
                }
                .${APPID}-preview-bubble {
                  box-sizing: border-box;
                  display: inline-block;
                  text-align: left;
                  transition: all 0.1s linear;
                  word-break: break-all;
                }
                .${APPID}-preview-input-area {
                  display: block;
                  width: 75%;
                  margin: 0 auto;
                  padding: 8px;
                  border-radius: 6px;
                  background: ${styles.input_bg};
                  color: ${styles.input_text};
                  border: 1px solid ${styles.input_border};
                  transition: all 0.1s linear;
                }
                .${APPID}-preview-background {
                  width: 100%;
                  height: 100%;
                  border-radius: 4px;
                  transition: all 0.1s linear;
                  border: 1px solid ${styles.input_border};
                }
                .${APPID}-compound-form-field-container .${APPID}-form-field > .${APPID}-preview-bubble-wrapper {
                  flex-grow: 1;
                }
                .${APPID}-color-picker-popup {
                  background-color: ${styles.popup_bg};
                  border: 1px solid ${styles.popup_border};
                  border-radius: 4px;
                  box-shadow: 0 4px 12px rgb(0 0 0 / 0.2);
                  padding: 16px;
                  position: absolute;
                  width: 280px;
                  z-index: 10;
                }
                .${APPID}-modal-button {
                  background: ${styles.btn_bg};
                  border: 1px solid ${styles.btn_border};
                  border-radius: var(--radius-md, ${CONSTANTS.MODAL.BTN_RADIUS}px);
                  color: ${styles.btn_text};
                  cursor: pointer;
                  font-size: ${CONSTANTS.MODAL.BTN_FONT_SIZE}px;
                  padding: ${CONSTANTS.MODAL.BTN_PADDING};
                  transition: background 0.12s;
                }
                .${APPID}-modal-button:hover {
                  background: ${styles.btn_hover_bg} !important;
                  border-color: ${styles.btn_border};
                }
                .${APPID}-modal-button:disabled {
                  background: ${styles.btn_bg} !important;
                  cursor: not-allowed;
                  opacity: 0.5;
                }
                .${APPID}-theme-modal-shell-footer-message.${APPID}-conflict-text {
                    color: ${styles.error_text};
                    display: flex;
                    align-items: center;
                }
                #${APPID}-conflict-reload-btn {
                    border-color: ${styles.error_text};
                }
                .${APPID}-text-item.drag-over-top {
                  border-top: 2px solid ${styles.dnd_indicator_color};
                }
                .${APPID}-text-item.drag-over-bottom {
                  border-bottom: 2px solid ${styles.dnd_indicator_color};
                }
            `;
            document.head.appendChild(style);
        }
    }

    class UIManager {
        /**
         * @param {(config: AppConfig) => Promise<void>} onSaveCallback
         * @param {() => Promise<AppConfig>} getCurrentConfigCallback
         * @param {DataConverter} dataConverter
         * @param {() => void} onModalClose
         * @param {object} siteStyles
         * @param getCurrentThemeSetCallback
         */
        constructor(onSaveCallback, getCurrentConfigCallback, dataConverter, onModalClose, siteStyles, getCurrentThemeSetCallback) {
            this.onSave = onSaveCallback;
            this.getCurrentConfig = getCurrentConfigCallback;
            this.dataConverter = dataConverter;
            this.onModalClose = onModalClose;
            this.siteStyles = siteStyles;
            this.isModalOpen = false;
            this.isWarningActive = false;
            this.warningMessage = '';
            this.subscriptions = [];
            this.isStreaming = false;
            const modalCallbacks = {
                onSave: (newConfig) => this.onSave(newConfig),
                getCurrentConfig: () => this.getCurrentConfig(),
                onModalOpenStateChange: (isOpen) => this.setModalState(isOpen),
            };
            this.settingsButton = new CustomSettingsButton(
                {
                    // Callbacks
                    onClick: () => this.settingsPanel.toggle(),
                },
                {
                    // Options
                    id: `${APPID}-settings-button`,
                    textContent: '',
                    title: `Settings (${APPNAME})`,
                    zIndex: CONSTANTS.Z_INDICES.SETTINGS_BUTTON,
                    position: CONSTANTS.UI_DEFAULTS.SETTINGS_BUTTON_DEFAULT_POSITION,
                    siteStyles: this.siteStyles.SETTINGS_BUTTON,
                }
            );
            this.settingsPanel = new SettingsPanelComponent({
                onSave: (newConfig) => this.onSave(newConfig),
                onShowJsonModal: () => this.jsonModal.open(this.settingsButton.element),
                onShowThemeModal: (themeKey) => this.themeModal.open(themeKey),
                getCurrentConfig: () => this.getCurrentConfig(),
                getAnchorElement: () => this.settingsButton.element,
                siteStyles: this.siteStyles.SETTINGS_PANEL,
                onShow: () => this.updateWarningBanners(),
                getCurrentThemeSet: getCurrentThemeSetCallback, // Pass the callback directly
            });
            this.jsonModal = new JsonModalComponent({
                ...modalCallbacks,
                siteStyles: this.siteStyles.JSON_MODAL,
                onModalOpen: () => this.updateWarningBanners(),
            });
            this.themeModal = new ThemeModalComponent({
                ...modalCallbacks,
                dataConverter: this.dataConverter,
                siteStyles: this.siteStyles.THEME_MODAL,
                onModalOpen: () => this.updateWarningBanners(),
            });
        }

        _subscribe(event, listener) {
            const key = createEventKey(this, event);
            EventBus.subscribe(event, listener, key);
            this.subscriptions.push({ event, key });
        }

        init() {
            this.settingsButton.render();
            this.settingsPanel.init();
            this.settingsPanel.render();
            this.themeModal.render();
            this._subscribe(EVENTS.REOPEN_MODAL, ({ type, key }) => {
                if (type === 'json') {
                    this.jsonModal.open(this.settingsButton.element);
                } else if (type === 'theme') {
                    this.themeModal.open(key);
                }
            });
            this._subscribe(EVENTS.UI_REPOSITION, () => this._handleRepositionEvent());
            this._subscribe(EVENTS.CONFIG_WARNING_UPDATE, ({ show, message }) => {
                this.isWarningActive = show;
                this.warningMessage = message;
                this.updateWarningBanners();
            });
            this._subscribe(EVENTS.APP_SHUTDOWN, () => this.destroy());
            this._subscribe(EVENTS.STREAMING_START, () => (this.isStreaming = true));
            this._subscribe(EVENTS.STREAMING_END, () => (this.isStreaming = false));
            this._subscribe(EVENTS.DEFERRED_LAYOUT_UPDATE, () => this._handleRepositionEvent());
        }

        destroy() {
            this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
            this.subscriptions = [];
            this.settingsButton?.destroy();
            this.settingsPanel?.destroy();
            this.jsonModal?.close(); // Modals destroy themselves on close
            this.themeModal?.close();
        }

        _handleRepositionEvent() {
            if (this.isStreaming) return;
            EventBus.queueUIWork(this.repositionSettingsButton.bind(this));
        }

        repositionSettingsButton() {
            if (!this.settingsButton?.element) return;
            PlatformAdapters.UIManager.repositionSettingsButton(this.settingsButton);
        }

        getActiveModal() {
            if (this.jsonModal?.modal?.element?.open) {
                return this.jsonModal;
            }
            if (this.themeModal?.modal?.element?.open) {
                return this.themeModal;
            }
            return null;
        }

        showConflictNotification(modalComponent, reloadCallback) {
            if (!modalComponent?.modal) return;
            this.clearConflictNotification(modalComponent); // Clear previous state first

            const styles = modalComponent.callbacks.siteStyles;
            const messageArea = modalComponent.modal.dom.footerMessage;

            if (messageArea) {
                const messageText = h('span', {
                    textContent: 'Settings updated in another tab.',
                    style: { display: 'flex', alignItems: 'center' },
                });

                const reloadBtn = h('button', {
                    id: `${APPID}-conflict-reload-btn`,
                    className: `${APPID}-modal-button`,
                    textContent: 'Reload UI',
                    title: 'Discard local changes and load the settings from the other tab.',
                    style: {
                        borderColor: styles.error_text || 'red',
                        marginLeft: '12px',
                    },
                    onclick: reloadCallback,
                });

                messageArea.textContent = '';
                messageArea.classList.add(`${APPID}-conflict-text`);
                messageArea.style.color = styles.error_text || 'red';
                messageArea.append(messageText, reloadBtn);
            }
        }

        clearConflictNotification(modalComponent) {
            if (!modalComponent?.modal) return;
            const messageArea = modalComponent.modal.dom.footerMessage;
            if (messageArea) {
                messageArea.textContent = '';
                messageArea.classList.remove(`${APPID}-conflict-text`);
            }
        }

        setModalState(isOpen) {
            this.isModalOpen = isOpen;
            if (!isOpen) {
                this.onModalClose?.();
            }
        }

        _createWarningBanner() {
            return h(
                `div.${APPID}-config-warning-banner`,
                {
                    style: {
                        backgroundColor: 'var(--bg-danger, #ffdddd)',
                        color: 'var(--text-on-danger, #a00)',
                        padding: '8px 12px',
                        fontSize: '0.85em',
                        textAlign: 'center',
                        borderRadius: '4px',
                        margin: '0 0 12px 0',
                        border: '1px solid var(--border-danger-heavy, #c00)',
                        whiteSpace: 'pre-wrap',
                    },
                },
                this.warningMessage
            );
        }

        updateWarningBanners() {
            const components = [this.settingsPanel, this.jsonModal, this.themeModal];
            // First, remove any existing banners from all components
            components.forEach((component) => {
                let modalElement = null;
                if (component instanceof SettingsPanelComponent) {
                    modalElement = component.element;
                } else if (component instanceof JsonModalComponent || component instanceof ThemeModalComponent) {
                    modalElement = component.modal?.element;
                }

                if (modalElement) {
                    modalElement.querySelector(`.${APPID}-config-warning-banner`)?.remove();
                }
            });

            if (this.isWarningActive) {
                const newBanner = this._createWarningBanner();
                // Add banner to any visible settings UI
                if (this.settingsPanel?.isOpen()) {
                    this.settingsPanel.element.prepend(newBanner.cloneNode(true));
                }
                if (this.jsonModal?.modal?.element?.open) {
                    this.jsonModal.modal.getContentContainer().prepend(newBanner.cloneNode(true));
                }
                if (this.themeModal?.modal?.element?.open) {
                    const target = this.themeModal.modal.element.querySelector(`.${APPID}-theme-general-settings`);
                    target?.before(newBanner.cloneNode(true));
                }
            }
        }
    }

    // =================================================================================
    // SECTION: Debugging
    // =================================================================================

    class DebugManager {
        /**
         * @param {ThemeAutomator} automatorInstance An instance of the main controller to access its methods and properties.
         */
        constructor(automatorInstance) {
            this.automator = automatorInstance;
            this.isBordersVisible = false;
        }

        /**
         * Toggles the visibility of debug layout borders.
         * @param {boolean} [forceState] - If true, shows borders. If false, hides them. If undefined, toggles the current state.
         */
        toggleBorders(forceState) {
            this.isBordersVisible = forceState === undefined ? !this.isBordersVisible : forceState;
            const styleId = `${APPID}-debug-style`;
            const existingStyle = document.getElementById(styleId);
            if (this.isBordersVisible) {
                // Already visible
                if (existingStyle) return;

                const debugStyle = h('style', {
                    id: styleId,
                    textContent: PlatformAdapters.Debug.getBordersCss(),
                });
                document.head.appendChild(debugStyle);
                Logger.log('Borders ON');
            } else {
                if (existingStyle) {
                    existingStyle.remove();
                    Logger.log('Borders OFF');
                }
            }
        }

        /**
         * Logs the current configuration object to the console.
         */
        logConfig() {
            Logger.log('Current Config:', this.automator.configManager.get());
        }

        /**
         * Displays available debug commands in the console.
         */
        help() {
            console.group(LOG_PREFIX, 'Debug Commands');
            Logger.log(`${APPID}Debug.help() - Displays this help message.`);
            Logger.log(`${APPID}Debug.toggleBorders() - Toggles visibility of layout borders.`);
            Logger.log(`${APPID}Debug.checkSelectors() - Validates all critical CSS selectors.`);
            Logger.log(`${APPID}Debug.logConfig() - Prints the current configuration object.`);
            console.groupEnd();
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
     */
    class Sentinel {
        constructor(prefix = 'my-project') {
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

            this._injectStyleElement();
            document.addEventListener('animationstart', this._handleAnimationStart.bind(this), true);

            globalScope.__global_sentinel_instances__[prefix] = this;
        }

        _injectStyleElement() {
            // Ensure the style element is injected only once per project prefix.
            this.styleElement = document.getElementById(this.styleId);
            if (this.styleElement) return;

            const keyframes = `@keyframes ${this.animationName} { from { transform: none; } to { transform: none; } }`;
            this.styleElement = h('style', {
                id: this.styleId,
                textContent: keyframes,
            });
            document.head.appendChild(this.styleElement);
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
            if (!this.listeners.has(selector)) {
                this.listeners.set(selector, []);
                this.rules.add(selector);

                // Regenerate and apply all rules to the single style element.
                const keyframes = `@keyframes ${this.animationName} { from { transform: none; } to { transform: none; } }`;
                const selectors = Array.from(this.rules).join(', ');
                this.styleElement.textContent = `${keyframes}\n${selectors} { animation-duration: 0.001s; animation-name: ${this.animationName}; }`;
            }
            this.listeners.get(selector).push(callback);
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
                this.listeners.delete(selector);
                this.rules.delete(selector);

                const keyframes = `@keyframes ${this.animationName} { from { transform: none; } to { transform: none; } }`;
                const selectors = Array.from(this.rules).join(', ');
                this.styleElement.textContent = `${keyframes}\n${selectors ? `${selectors} { animation-duration: 0.001s; animation-name: ${this.animationName}; }` : ''}`;
            } else {
                this.listeners.set(selector, newCallbacks);
            }
        }

        suspend() {
            if (this.styleElement instanceof HTMLStyleElement) {
                this.styleElement.disabled = true;
            }
            Logger.debug('[Sentinel] Suspended.');
        }

        resume() {
            if (this.styleElement instanceof HTMLStyleElement) {
                this.styleElement.disabled = false;
            }
            Logger.debug('[Sentinel] Resumed.');
        }
    }

    /**
     * @class ThemeAutomator
     * @property {ConfigManager} configManager
     * @property {ImageDataManager} imageDataManager
     * @property {UIManager} uiManager
     * @property {ObserverManager} observerManager
     * @property {DebugManager} debugManager
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
    class ThemeAutomator {
        constructor() {
            this.dataConverter = new DataConverter();
            this.configManager = new ConfigManager(this.dataConverter);
            this.imageDataManager = new ImageDataManager(this.dataConverter);
            this.uiManager = null;
            this.observerManager = null;
            this.debugManager = new DebugManager(this);
            this.messageCacheManager = null;
            this.avatarManager = null;
            this.standingImageManager = null;
            this.themeManager = null;
            this.bubbleUIManager = null;
            this.messageLifecycleManager = null;
            this.fixedNavManager = null;
            this.messageNumberManager = null;
            this.syncManager = null;
            this.autoScrollManager = null;
            this.toastManager = null;
            this.isConfigSizeExceeded = false;
            this.configWarningMessage = '';
            this.isNavigating = true;
            this.isInitialized = false;
            this.isDestroying = false;
            this.pendingRemoteConfig = null;
            this.subscriptions = [];
        }

        _subscribe(event, listener) {
            const key = createEventKey(this, event);
            EventBus.subscribe(event, listener, key);
            this.subscriptions.push({ event, key });
        }

        async init() {
            if (this.isInitialized) return;
            this.isDestroying = false; // Reset the destroy guard on re-initialization.

            await this.configManager.load();

            // Set logger level from config, which includes developer settings.
            // The setLevel method itself handles invalid values gracefully.
            Logger.setLevel(this.configManager.get().developer.logger_level);
            Logger.log(`Logger level is set to '${Logger.level}'.`);

            const config = this.configManager.get();
            config.themeSets = this._ensureUniqueThemeIds(config.themeSets);

            // Create managers that other managers depend on
            this.themeManager = new ThemeManager(this.configManager, this.imageDataManager);
            this.messageCacheManager = new MessageCacheManager();
            this.syncManager = new SyncManager();

            // Initialize platform-specific managers, as other managers may depend on them
            PlatformAdapters.ThemeAutomator.initializePlatformManagers(this);

            // Create the rest of the managers, injecting their dependencies
            this.observerManager = new ObserverManager();
            this.uiManager = new UIManager(
                (newConfig) => this.handleSave(newConfig),
                () => Promise.resolve(this.configManager.get()),
                this.dataConverter,
                () => this.applyPendingUpdateOnModalClose(),
                SITE_STYLES,
                () => this.themeManager.getThemeSet() // Pass the callback directly
            );
            this.avatarManager = new AvatarManager(this.configManager, this.messageCacheManager);
            this.standingImageManager = new StandingImageManager(this.configManager, this.messageCacheManager);
            this.bubbleUIManager = new BubbleUIManager(this.configManager, this.messageCacheManager);
            this.messageLifecycleManager = new MessageLifecycleManager(this.messageCacheManager);
            if (config.features.fixed_nav_console.enabled) {
                this.fixedNavManager = new FixedNavigationManager({
                    messageCacheManager: this.messageCacheManager,
                    configManager: this.configManager,
                    autoScrollManager: this.autoScrollManager,
                    messageLifecycleManager: this.messageLifecycleManager,
                });
            }
            this.messageNumberManager = new MessageNumberManager(this.configManager, this.messageCacheManager);

            // Initialize all created managers
            const allManagers = [
                this.themeManager,
                this.messageCacheManager,
                this.avatarManager,
                this.standingImageManager,
                this.bubbleUIManager,
                this.messageLifecycleManager,
                this.uiManager,
                this.messageNumberManager,
                this.observerManager,
                this.syncManager,
                this.autoScrollManager,
                this.toastManager,
            ];
            allManagers.filter(Boolean).forEach((manager) => manager.init());

            if (this.fixedNavManager) {
                await this.fixedNavManager.init();
            }

            // Set initialized flag and start the main observers
            this.isInitialized = true;
            this.observerManager.start();

            // Subscribe to app-wide events
            this._subscribe(EVENTS.APP_SHUTDOWN, () => this.destroy());
            this._subscribe(EVENTS.NAVIGATION_START, () => (this.isNavigating = true));
            this._subscribe(EVENTS.NAVIGATION_END, () => (this.isNavigating = false));
            this._subscribe(EVENTS.NAVIGATION, () => {
                PerfMonitor.reset();
                this.observerManager.processedTurnNodes.clear();
            });
            this._subscribe(EVENTS.CONFIG_SIZE_EXCEEDED, ({ message }) => {
                this.isConfigSizeExceeded = true;
                this.configWarningMessage = message;
                EventBus.publish(EVENTS.CONFIG_WARNING_UPDATE, { show: true, message });
            });
            this._subscribe(EVENTS.CONFIG_SAVE_SUCCESS, () => {
                this.isConfigSizeExceeded = false;
                this.configWarningMessage = '';
                EventBus.publish(EVENTS.CONFIG_WARNING_UPDATE, { show: false, message: '' });
            });
            this._subscribe(EVENTS.MESSAGE_COMPLETE, (messageElement) => {
                const turnNode = messageElement.closest(CONSTANTS.SELECTORS.CONVERSATION_CONTAINER);
                if (turnNode) {
                    this.observerManager.observeTurnForCompletion(turnNode);
                }
            });
            this._subscribe(EVENTS.SUSPEND_OBSERVERS, () => sentinel.suspend());
            this._subscribe(EVENTS.RESUME_OBSERVERS_AND_REFRESH, () => sentinel.resume());
            this._subscribe(EVENTS.REMOTE_CONFIG_CHANGED, ({ newValue }) => this._handleRemoteConfigChange(newValue));
        }

        destroy() {
            if (!this.isInitialized || this.isDestroying) return;
            this.isDestroying = true;

            // This method is now a cleanup handler triggered by the APP_SHUTDOWN event.
            // It should NOT re-publish the event that called it.

            // Explicitly destroy managers that don't self-destroy via event bus subscription.
            this.themeManager?.destroy();

            // Unsubscribe from all events this controller listens to.
            this.subscriptions.forEach(({ event, key }) => EventBus.unsubscribe(event, key));
            this.subscriptions = [];

            Logger.log('ThemeAutomator destroyed.');

            this.isInitialized = false;
            isInitialized = false; // Reset the global guard
        }

        _handleRemoteConfigChange(newValue) {
            try {
                const newConfig = JSON.parse(newValue);
                const activeModal = this.uiManager.getActiveModal?.();

                if (activeModal) {
                    Logger.log('ThemeAutomator: A modal is open. Storing remote update and showing conflict notification.');
                    this.pendingRemoteConfig = newConfig;
                    const reloadCallback = () => {
                        const reopenContext = activeModal.getContextForReopen?.();
                        activeModal.close();
                        // applyPendingUpdateOnModalClose will handle applying the pending update.
                        // Request to reopen the modal after a short delay to ensure sync completion.
                        setTimeout(() => {
                            EventBus.publish(EVENTS.REOPEN_MODAL, reopenContext);
                        }, CONSTANTS.TIMING.TIMEOUTS.MODAL_REOPEN_DELAY);
                    };
                    this.uiManager.showConflictNotification(activeModal, reloadCallback);
                } else {
                    Logger.log('ThemeAutomator: No modal open. Applying silent remote update.');
                    this.applyUpdate(newConfig);
                }
            } catch (e) {
                Logger.error('ThemeAutomator: Failed to handle remote config change:', e);
            }
        }

        applyPendingUpdateOnModalClose() {
            if (this.pendingRemoteConfig) {
                Logger.log('ThemeAutomator: Modal closed with a pending update. Applying it now.');
                this.applyUpdate(this.pendingRemoteConfig);
                this.pendingRemoteConfig = null;
            }
        }

        // Method required by the SyncManager's interface for silent updates
        async applyUpdate(newConfig) {
            try {
                const { completeConfig, themeChanged } = this._processConfig(newConfig);
                this.configManager.config = completeConfig; // Update in-memory config
                await this._applyUiUpdates(completeConfig, themeChanged);
            } catch (e) {
                Logger.error('Failed to apply remote config update:', e.message);
            }
        }

        _processConfig(newConfig) {
            const currentConfig = this.configManager.get();
            const themeChanged = JSON.stringify(currentConfig.themeSets) !== JSON.stringify(newConfig.themeSets) || JSON.stringify(currentConfig.defaultSet) !== JSON.stringify(newConfig.defaultSet);
            // Create a complete config object by merging the incoming data with defaults.
            let completeConfig = deepMerge(JSON.parse(JSON.stringify(DEFAULT_THEME_CONFIG)), newConfig);

            // Ensure all theme IDs are unique before proceeding.
            completeConfig.themeSets = this._ensureUniqueThemeIds(completeConfig.themeSets);

            // Sanitize and validate the entire configuration using the central processor.
            completeConfig = ConfigProcessor.process(completeConfig);

            return { completeConfig, themeChanged };
        }

        async _applyUiUpdates(completeConfig, themeChanged) {
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

            const navConsoleEnabled = completeConfig.features.fixed_nav_console.enabled;
            if (navConsoleEnabled && !this.fixedNavManager) {
                this.fixedNavManager = new FixedNavigationManager(
                    {
                        messageCacheManager: this.messageCacheManager,
                        configManager: this.configManager,
                        autoScrollManager: this.autoScrollManager,
                        messageLifecycleManager: this.messageLifecycleManager,
                    },
                    { isReEnabling: true }
                );
                await this.fixedNavManager.init();
                // Explicitly notify the new instance with the current cache state
                this.messageCacheManager.notify();
            } else if (!navConsoleEnabled && this.fixedNavManager) {
                this.fixedNavManager.destroy();
                this.fixedNavManager = null;
            } else if (this.fixedNavManager) {
                // If the manager already exists, tell it to re-render with the new config.
                this.fixedNavManager.updateUI();
            }
            PlatformAdapters.ThemeAutomator.applyPlatformSpecificUiUpdates(this, completeConfig);
        }

        /** @param {AppConfig} newConfig */
        async handleSave(newConfig) {
            try {
                const oldIconSize = this.configManager.get().options.icon_size;

                const processResult = this._processConfig(newConfig);
                const completeConfig = processResult.completeConfig;
                let themeChanged = processResult.themeChanged;

                // If the icon size has changed, we must treat it as a theme content change
                // to force reprocessing of image URLs with the new dimensions.
                const newIconSize = completeConfig.options.icon_size;
                if (oldIconSize !== newIconSize) {
                    themeChanged = true;
                }

                await this.configManager.save(completeConfig);

                // Apply the new logger level immediately and provide feedback.
                Logger.setLevel(completeConfig.developer.logger_level);
                // Use console.warn to ensure the message is visible regardless of the new level.
                console.warn(LOG_PREFIX, `Logger level is '${Logger.level}'.`);

                // A local save overwrites any pending remote changes.
                this.pendingRemoteConfig = null;
                const activeModal = this.uiManager.getActiveModal?.();
                if (activeModal) {
                    this.uiManager.clearConflictNotification(activeModal);
                }

                await this._applyUiUpdates(completeConfig, themeChanged);
            } catch (e) {
                Logger.error('Configuration save failed:', e.message);
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
                const theme = JSON.parse(JSON.stringify(originalTheme));
                if (!theme.metadata) {
                    theme.metadata = { id: '', name: 'Unnamed Theme', matchPatterns: [] };
                }
                const id = theme.metadata.id;
                if (typeof id !== 'string' || id.trim() === '' || seenIds.has(id)) {
                    theme.metadata.id = generateUniqueId();
                }
                seenIds.add(theme.metadata.id);
                return theme;
            });
        }

        /**
         * @description Checks if all CSS selectors defined in the CONSTANTS.SELECTORS object are valid and exist in the current DOM.
         * @returns {boolean} True if all selectors are valid, otherwise false.
         */
        checkSelectors() {
            // Automatically create the checklist from the CONSTANTS.SELECTORS object.
            const selectorsToCheck = Object.entries(CONSTANTS.SELECTORS).map(([key, selector]) => {
                // Create a description from the key name.
                const desc = key
                    .replace(/_/g, ' ')
                    .toLowerCase()
                    .replace(/ \w/g, (L) => L.toUpperCase());
                return {
                    selector,
                    desc,
                };
            });
            let allOK = true;
            console.groupCollapsed(LOG_PREFIX, 'CSS Selector Check');
            for (const { selector, desc } of selectorsToCheck) {
                try {
                    const el = document.querySelector(selector);
                    if (el) {
                        Logger.log(`✅ [OK] "${selector}"\n     description: ${desc}\n     element found:`, el);
                    } else {
                        Logger.warn(`❌ [NG] "${selector}"\n     description: ${desc}\n     element NOT found.`);
                        allOK = false;
                    }
                } catch (e) {
                    Logger.error(`💥 [ERROR] Invalid selector "${selector}"\n     description: ${desc}\n     error:`, e.message);
                    allOK = false;
                }
            }
            if (allOK) {
                Logger.log('🎉 All essential selectors are currently valid!');
            } else {
                Logger.warn('⚠️ One or more essential selectors are NOT found or invalid. The script might not function correctly.');
            }
            console.groupEnd();
            return allOK;
        }
    }

    // =================================================================================
    // SECTION: Entry Point
    // =================================================================================

    // Exit if already executed
    if (ExecutionGuard.hasExecuted()) return;
    // Set executed flag if not executed yet
    ExecutionGuard.setExecuted();

    // Main controller for the entire application.
    const automator = new ThemeAutomator();
    // Singleton instance for observing DOM node insertions.
    const sentinel = new Sentinel(OWNERID);

    // This immediate hook is crucial for preventing race conditions. It sets the navigating
    // flag as soon as a URL change is initiated, ensuring that the Sentinel's message
    // processor is paused *before* new DOM elements begin to render.
    (() => {
        let lastHref = location.href;
        const handler = () => {
            if (location.href !== lastHref) {
                automator.isNavigating = true;
                lastHref = location.href;
            }
        };
        for (const m of ['pushState', 'replaceState']) {
            const orig = history[m];
            history[m] = function (...args) {
                orig.apply(this, args);
                handler();
            };
        }
        window.addEventListener('popstate', handler);
    })();

    // Use the text input area as a reliable signal that the UI is fully interactive.
    const ANCHOR_SELECTOR = CONSTANTS.SELECTORS.INPUT_TEXT_FIELD_TARGET;
    let isInitialized = false;

    // Use the Sentinel to wait for the main UI container to appear.
    sentinel.on(ANCHOR_SELECTOR, () => {
        // Run the full initialization only once.
        if (isInitialized) return;

        // Guard: Even if the anchor is found, abort if the current page is on the exclusion list.
        // This prevents re-initialization on excluded pages that might contain the anchor element (e.g., /library?tab=images).
        if (PlatformAdapters.General.isExcludedPage()) {
            Logger.log('Anchor element detected, but the page is on the exclusion list. Initialization aborted.');
            return;
        }

        isInitialized = true;

        Logger.log('Anchor element detected. Initializing the script...');
        automator.init();
    });

    /**
     * Processes a message element once its inner bubble is fully rendered and attached to the DOM.
     * This function now acts as a simple relay, publishing a generic event.
     * @param {HTMLElement} contentElement The content element (text bubble, image, etc.) detected by the Sentinel.
     */
    const processReadyMessage = (contentElement) => {
        if (!isInitialized) return;
        EventBus.publish(EVENTS.RAW_MESSAGE_ADDED, contentElement);
    };

    // Use the Platform Adapter to set up platform-specific Sentinel listeners.
    PlatformAdapters.General.initializeSentinel(processReadyMessage);

    // ---- Debugging ----
    // Description: Exposes a debug object to the console.
    try {
        const debugApi = {};
        if (automator.debugManager) {
            const proto = Object.getPrototypeOf(automator.debugManager);
            const methodNames = Object.getOwnPropertyNames(proto).filter((key) => typeof automator.debugManager[key] === 'function' && key !== 'constructor' && !key.startsWith('_'));

            for (const key of methodNames) {
                debugApi[key] = automator.debugManager[key].bind(automator.debugManager);
            }
        }

        if (typeof automator.checkSelectors === 'function') {
            debugApi.checkSelectors = automator.checkSelectors.bind(automator);
        }

        // fallback help if not defined
        if (typeof debugApi.help !== 'function') {
            debugApi.help = () => {
                console.table(Object.keys(debugApi));
                Logger.log('All available debug commands listed above.');
            };
            Logger.warn('debugManager.help not found, fallback help() defined.');
        }

        if (typeof unsafeWindow !== 'undefined') {
            /** @type {any} */ (unsafeWindow)[`${APPID}Debug`] = debugApi;
        }

        Logger.log(`Debug tools are available. Use \`${APPID}Debug.help()\` in the console for a list of commands.`);
    } catch (e) {
        Logger.error('Could not expose debug object to console.', e);
    }
})();
