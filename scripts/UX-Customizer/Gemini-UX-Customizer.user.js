// ==UserScript==
// @name         Gemini-UX-Customizer
// @namespace    https://github.com/p65536
// @version      1.2.0
// @license      MIT
// @description  Automatically applies a theme based on the chat name (changes user/assistant names, text color, icon, bubble style, window background, input area style, standing images, etc.)
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gemini.google.com
// @author       p65536
// @match        https://gemini.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
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
        },
        /** @property {string} level - The current active log level. */
        level: 'log', // Default level
        /**
         * Sets the current log level.
         * @param {string} level The new log level. Must be one of 'error', 'warn', 'info', 'log'.
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
        /** @param {...any} args The title for the log group. */
        group: (...args) => console.group(LOG_PREFIX, ...args),
        /** @param {...any} args The title for the collapsed log group. */
        groupCollapsed: (...args) => console.groupCollapsed(LOG_PREFIX, ...args),
        /** Closes the current log group. */
        groupEnd: () => console.groupEnd(),
    };

    // =================================================================================
    // SECTION: Execution Guard
    // Description: Prevents the script from being executed multiple times per page.
    // =================================================================================

    window.__myproject_guard__ = window.__myproject_guard__ || {};
    if (window.__myproject_guard__[`${APPID}_executed`]) return;
    window.__myproject_guard__[`${APPID}_executed`] = true;

    // =================================================================================
    // SECTION: Platform-Specific Adapter
    // Description: Centralizes all platform-specific logic, such as selectors and
    //              DOM manipulation strategies. This isolates platform differences
    //              from the core application logic.
    // =================================================================================

    class PlatformAdapter {
        /**
         * Platform-specific CSS selectors.
         */
        static SELECTORS = {
            // --- Main containers ---
            MAIN_APP_CONTAINER: 'bard-sidenav-content',
            CHAT_WINDOW: 'chat-window',
            CHAT_HISTORY_MAIN: 'div#chat-history',
            INPUT_CONTAINER: 'input-container',

            // --- Message containers ---
            CONVERSATION_CONTAINER: '.conversation-container',
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
            FIXED_NAV_TURN_CONTAINER: null, // Not applicable to Gemini
            FIXED_NAV_ROLE_USER: 'user-query',
            FIXED_NAV_ROLE_ASSISTANT: 'model-response',
            FIXED_NAV_HIGHLIGHT_TARGETS: `.${APPID}-highlight-message .user-query-bubble-with-background, .${APPID}-highlight-message .response-container-with-gpi`,

            // --- Turn Completion Selector ---
            TURN_COMPLETE_SELECTOR: 'model-response message-actions',

            // --- Debug Selectors ---
            DEBUG_CONTAINER_TURN: '.conversation-container',
            DEBUG_CONTAINER_ASSISTANT: 'model-response',
            DEBUG_CONTAINER_USER: 'user-query',
        };

        /**
         * Gets the platform-specific role identifier from a message element.
         * @param {HTMLElement} messageElement The message element.
         * @returns {string | null} The platform's role identifier (e.g., 'user', 'user-query').
         */
        static getMessageRole(messageElement) {
            if (!messageElement) return null;
            return messageElement.tagName.toLowerCase();
        }

        /**
         * Gets the current chat title in a platform-specific way.
         * @returns {string | null}
         */
        static getChatTitle() {
            // GGGUX gets the title from a specific DOM element.
            const selectedConversation = document.querySelector('[data-test-id="conversation"].selected');
            if (selectedConversation) {
                const titleElement = selectedConversation.querySelector('.conversation-title');
                if (titleElement) {
                    return titleElement.textContent.trim();
                }
            }
            return null;
        }

        /**
         * Selects the appropriate theme set based on platform-specific logic during an update check.
         * @param {ThemeManager} themeManager - The instance of the theme manager.
         * @param {AppConfig} config - The full application configuration.
         * @param {boolean} urlChanged - Whether the URL has changed since the last check.
         * @param {boolean} titleChanged - Whether the title has changed since the last check.
         * @returns {ThemeSet} The theme set that should be applied.
         */
        static selectThemeForUpdate(themeManager, config, urlChanged, titleChanged) {
            // GGGUX-specific logic: If the URL changed but the title hasn't (yet),
            // apply the default theme as a fallback to prevent applying the previous chat's theme.
            if (urlChanged && !titleChanged) {
                return config.defaultSet;
            }

            // Default logic
            return themeManager.getThemeSet();
        }

        /**
         * Gets the platform-specific parent element for attaching navigation buttons.
         * @param {HTMLElement} messageElement The message element.
         * @returns {HTMLElement | null} The parent element for the nav container.
         */
        static getNavPositioningParent(messageElement) {
            const role = this.getMessageRole(messageElement);

            if (role === this.SELECTORS.USER_MESSAGE) {
                // For user messages, use the specific content container as the positioning context.
                return messageElement.querySelector(this.SELECTORS.USER_QUERY_CONTAINER);
            } else {
                // For model-response, the element itself remains the correct context.
                return messageElement;
            }
        }

        /**
         * Applies platform specific fixes.
         * This function is platform-specific.
         * @param {ThemeAutomator} automatorInstance - The main controller instance.
         */
        static applyFixes(automatorInstance) {
            // Not required for Gemini
            return;
        }

        /**
         * Initializes platform-specific properties on the ObserverManager instance.
         * @param {ObserverManager} instance The ObserverManager instance.
         */
        static initializeObserver(instance) {
            instance.debouncedVisibilityCheck = debounce(() => EventBus.publish(`${APPID}:visibilityRecheck`), 250);
        }

        /**
         * Starts all platform-specific observers.
         * @param {ObserverManager} instance The ObserverManager instance.
         */
        static async start(instance) {
            const container = await waitForElement(this.SELECTORS.MAIN_APP_CONTAINER);
            if (!container) {
                Logger.error('Main container not found. Observer not started.');
                return;
            }

            instance.mainObserver = new MutationObserver((mutations) => instance._handleMainMutations(mutations));
            instance.mainObserver.observe(document.body, { childList: true, subtree: true });

            // Centralized ResizeObserver for layout changes
            instance.layoutResizeObserver = new ResizeObserver(instance.debouncedLayoutRecalculate);
            instance.layoutResizeObserver.observe(document.body);

            // Call the static methods on the PlatformAdapter class, passing the instance.
            PlatformAdapter.startConversationTurnObserver(instance);
            PlatformAdapter.startGlobalTitleObserver(instance);
            PlatformAdapter.startSidebarObserver(instance);
            PlatformAdapter.startURLChangeObserver(instance);

            window.addEventListener('resize', instance.debouncedLayoutRecalculate);
        }

        /**
         * Handles platform-specific logic within the main mutation observer callback.
         * @param {ObserverManager} instance The ObserverManager instance.
         * @param {MutationRecord[]} mutations The mutations to handle.
         */
        static handleMainMutations(instance, mutations) {
            instance._garbageCollectPendingTurns(mutations);
            instance._dispatchNodeAddedTasks(mutations);
            instance._checkPendingTurns();
            instance.debouncedCacheUpdate();
            instance.debouncedVisibilityCheck();
        }

        /**
         * @private
         * @description Sets up the monitoring for conversation turns.
         */
        static startConversationTurnObserver(instance) {
            // Register a task for newly added turn nodes.
            instance.registerNodeAddedTask(this.SELECTORS.CONVERSATION_CONTAINER, (turnNode) => {
                instance._processTurnSingle(turnNode);
            });
            // Initial batch processing for all existing turnNodes on page load.
            instance.scanForExistingTurns();
        }

        /**
         * @private
         * @description Sets up the monitoring for URL changes.
         */
        static startURLChangeObserver(instance) {
            let lastHref = location.href;
            const handler = () => {
                if (location.href !== lastHref) {
                    lastHref = location.href;
                    instance.cleanupPendingTurns();
                    EventBus.publish(`${APPID}:themeUpdate`);
                    EventBus.publish(`${APPID}:navigation`);
                    // Give the DOM a moment to settle after navigation, then re-scan existing turns.
                    setTimeout(() => {
                        instance.scanForExistingTurns();
                        instance.debouncedCacheUpdate();
                    }, 200);
                }
            };
            for (const m of ['pushState', 'replaceState']) {
                const orig = history[m];
                history[m] = function(...args) {
                    orig.apply(this, args);
                    handler();
                };
            }
            window.addEventListener('popstate', handler);
        }

        /**
         * @private
         * @description Sets up the monitoring for title changes.
         */
        static startGlobalTitleObserver(instance) {
            // Not required for Gemini
        }

        /**
         * @private
         * @description Sets up a targeted observer on the sidebar for title and selection changes.
         */
        static async startSidebarObserver(instance) {
            const sidebar = await waitForElement(this.SELECTORS.SIDEBAR_WIDTH_TARGET);
            if (!sidebar) {
                Logger.warn('Sidebar element not found for targeted observation.');
                return;
            }

            const debouncedThemeUpdate = debounce(() => EventBus.publish(`${APPID}:themeUpdate`), 150);
            const sidebarObserver = new MutationObserver(() => {
                debouncedThemeUpdate();
                instance.debouncedLayoutRecalculate();
            });
            sidebarObserver.observe(sidebar, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true,
                attributeFilter: ['class']
            });
            debouncedThemeUpdate();
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
        ICON_SIZE: 64,
        ICON_SIZE_VALUES: [64, 96, 128, 160, 192],
        ICON_MARGIN: 16,
        BUTTON_VISIBILITY_THRESHOLD_PX: 128,
        RETRY: {
            MAX_STANDING_IMAGES: 10,
            STANDING_IMAGES_INTERVAL: 250,
            SCROLL_OFFSET_FOR_NAV: 40,
        },
        SLIDER_CONFIGS: {
            CHAT_WIDTH: {
                MIN: 29,
                MAX: 80,
                NULL_THRESHOLD: 30,
                DEFAULT: null
            }
        },
        Z_INDICES: {
            SETTINGS_BUTTON: 10000,
            SETTINGS_PANEL: 11000,
            THEME_MODAL: 12000,
            JSON_MODAL: 15000,
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
        SELECTORS: PlatformAdapter.SELECTORS,
    };

    // ---- Site-specific Style Variables ----
    const SITE_STYLES = {
        SETTINGS_BUTTON: {
            background: 'var(--gem-sys-color--surface-container-high)',
            borderColor: 'var(--gem-sys-color--outline)',
            backgroundHover: 'var(--gem-sys-color--surface-container-higher)',
            borderColorHover: 'var(--gem-sys-color--outline)',
            borderRadius: '50%',
            iconDef: { tag: 'svg', props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 0 24 24', width: '24px', fill: 'currentColor' }, children: [{ tag: 'path', props: { d: 'M0 0h24v24H0V0z', fill: 'none' } }, { tag: 'path', props: { d: 'M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.08-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z' } }] }
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
            slider_display_text: 'var(--gem-sys-color--on-surface-variant)',
            popup_bg: 'var(--gem-sys-color--surface-container-highest)',
            popup_border: 'var(--gem-sys-color--outline)',
            dnd_indicator_color: 'var(--gem-sys-color--primary)',
            folderIconDef: { tag: 'svg', props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' }, children: [{ tag: 'path', props: { d: 'M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z' } }] },
            upIconDef: { tag: 'svg', props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' }, children: [{ tag: 'path', props: { d: 'M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z' } }] },
            downIconDef: { tag: 'svg', props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' }, children: [{ tag: 'path', props: { d: 'M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z' } }] },
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
                transition: border-color 0.15s ease-in-out;
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
            }
            .${APPID}-bubble-parent-with-nav:hover .${APPID}-nav-buttons,
            .${APPID}-bubble-nav-container:hover .${APPID}-nav-buttons {
                visibility: visible;
                opacity: 1;
                transition-delay: 0s;
            }
            ${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} .${APPID}-bubble-nav-container {
                left: -25px;
            }
            ${CONSTANTS.SELECTORS.USER_MESSAGE} .${APPID}-bubble-nav-container {
                right: -25px;
            }
            .${APPID}-nav-group-top, .${APPID}-nav-group-bottom {
                position: absolute;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .${APPID}-nav-group-top { top: 4px; }
            .${APPID}-nav-group-bottom { bottom: 4px; }
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
                background: var(--gem-sys-color--surface-container-high);
                color: var(--gem-sys-color--on-surface-variant);
                border: 1px solid var(--gem-sys-color--outline);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s ease-in-out;
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
        bubbleMaxWidth: { unit: '%', min: 30, max: 100, nullable: true }
    };
    /**
     * @typedef {object} ActorConfig
     * @property {string | null} name
     * @property {string | null} icon
     * @property {string | null} textColor
     * @property {string | null} font
     * @property {string | null} bubbleBackgroundColor
     * @property {string | null} bubblePadding
     * @property {string | null} bubbleBorderRadius
     * @property {string | null} bubbleMaxWidth
     * @property {string | null} standingImageUrl
     */

    /**
     * @typedef {object} ThemeSet
     * @property {{id: string, name: string, matchPatterns: string[]}} metadata
     * @property {ActorConfig} user
     * @property {ActorConfig} assistant
     * @property {{backgroundColor: string | null, backgroundImageUrl: string | null, backgroundSize: string | null, backgroundPosition: string | null, backgroundRepeat: string | null}} window
     * @property {{backgroundColor: string | null, textColor: string | null}} inputArea
     */

    /**
     * @typedef {object} AppConfig
     * @property {{icon_size: number, chat_content_max_width: string | null}} options
     * @property {{collapsible_button: {enabled: boolean}, scroll_to_top_button: {enabled: boolean}, sequential_nav_buttons: {enabled: boolean}}} features
     * @property {ThemeSet[]} themeSets
     * @property {Omit<ThemeSet, 'metadata'>} defaultSet
     */

    /** @type {AppConfig} */
    const DEFAULT_THEME_CONFIG = {
        options: {
            icon_size: CONSTANTS.ICON_SIZE,
            chat_content_max_width: CONSTANTS.SLIDER_CONFIGS.CHAT_WIDTH.DEFAULT,
            respect_avatar_space: true
        },
        features: {
            collapsible_button: {
                enabled: true
            },
            scroll_to_top_button: {
                enabled: true
            },
            sequential_nav_buttons: {
                enabled: true
            },
            fixed_nav_console: {
                enabled: true
            }
        },
        themeSets: [
            {
                metadata: {
                    id: `${APPID}-theme-example-1`,
                    name: 'Project Example',
                    matchPatterns: ["/project1/i"]
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
                    standingImageUrl: null
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
                    standingImageUrl: null
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
                    textColor: null
                }
            }
        ],
        defaultSet: {
            assistant: {
                name: `${ASSISTANT_NAME}`,
                icon: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#e3e3e3"><g><rect fill="none" height="24" width="24"/></g><g><g><path d="M19.94,9.06C19.5,5.73,16.57,3,13,3C9.47,3,6.57,5.61,6.08,9l-1.93,3.48C3.74,13.14,4.22,14,5,14h1l0,2c0,1.1,0.9,2,2,2h1 v3h7l0-4.68C18.62,15.07,20.35,12.24,19.94,9.06z M14.89,14.63L14,15.05V19h-3v-3H8v-4H6.7l1.33-2.33C8.21,7.06,10.35,5,13,5 c2.76,0,5,2.24,5,5C18,12.09,16.71,13.88,14.89,14.63z"/><path d="M12.5,12.54c-0.41,0-0.74,0.31-0.74,0.73c0,0.41,0.33,0.74,0.74,0.74c0.42,0,0.73-0.33,0.73-0.74 C13.23,12.85,12.92,12.54,12.5,12.54z"/><path d="M12.5,7c-1.03,0-1.74,0.67-2,1.45l0.96,0.4c0.13-0.39,0.43-0.86,1.05-0.86c0.95,0,1.13,0.89,0.8,1.36 c-0.32,0.45-0.86,0.75-1.14,1.26c-0.23,0.4-0.18,0.87-0.18,1.16h1.06c0-0.55,0.04-0.65,0.13-0.82c0.23-0.42,0.65-0.62,1.09-1.27 c0.4-0.59,0.25-1.38-0.01-1.8C13.95,7.39,13.36,7,12.5,7z"/></g></g></svg>',
                textColor: null,
                font: null,
                bubbleBackgroundColor: null,
                bubblePadding: "6px 10px",
                bubbleBorderRadius: "10px",
                bubbleMaxWidth: null,
                standingImageUrl: null
            },
            user: {
                name: 'You',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#e3e3e3"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
                textColor: null,
                font: null,
                bubbleBackgroundColor: null,
                bubblePadding: "6px 10px",
                bubbleBorderRadius: "10px",
                bubbleMaxWidth: null,
                standingImageUrl: null
            },
            window: {
                backgroundColor: null,
                backgroundImageUrl: null,
                backgroundSize: "cover",
                backgroundPosition: "center center",
                backgroundRepeat: "no-repeat",
            },
            inputArea: {
                backgroundColor: null,
                textColor: null
            }
        }
    };

    // =================================================================================
    // SECTION: Event-Driven Architecture (Pub/Sub)
    // Description: A event bus for decoupled communication between classes.
    // =================================================================================

    const EventBus = {
        events: {},
        /**
         * Subscribes a listener to an event. Prevents duplicate subscriptions.
         * @param {string} event The event name.
         * @param {Function} listener The callback function.
         * @returns {Function} An unsubscribe function.
         */
        subscribe(event, listener) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            // Prevent adding the same listener multiple times.
            if (!this.events[event].includes(listener)) {
                this.events[event].push(listener);
            }

            // Return an unsubscribe function for easy cleanup.
            const unsubscribe = () => {
                this.unsubscribe(event, listener);
            };
            return unsubscribe;
        },
        /**
         * Subscribes a listener that will be automatically unsubscribed after one execution.
         * @param {string} event The event name.
         * @param {Function} listener The callback function.
         * @returns {Function} An unsubscribe function.
         */
        once(event, listener) {
            const unsubscribe = this.subscribe(event, (...args) => {
                unsubscribe();
                listener(...args);
            });
            return unsubscribe;
        },
        /**
         * Unsubscribes a listener from an event.
         * Cleans up the event array if it becomes empty.
         * @param {string} event The event name.
         * @param {Function} listener The callback function to remove.
         */
        unsubscribe(event, listener) {
            if (!this.events[event]) {
                return;
            }
            this.events[event] = this.events[event].filter(l => l !== listener);

            // If the event has no more listeners, remove the event property to save memory.
            if (this.events[event].length === 0) {
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
            // Iterate over a copy of the array in case a listener unsubscribes itself (e.g., 'once').
            [...this.events[event]].forEach(listener => {
                try {
                    listener(...args);
                } catch (e) {
                    Logger.error(`EventBus error in listener for event "${event}":`, e);
                }
            });
        }
    };

    // =================================================================================
    // SECTION: Data Conversion Utilities
    // Description: Handles image optimization and config data compression.
    // =================================================================================

    class DataConverter {
        /**
         * Converts an image file to an optimized Data URL.
         * @param {File} file The image file object.
         * @param {object} options
         * @param {number} [options.maxWidth] Max width for resizing.
         * @param {number} [options.maxHeight] Max height for resizing.
         * @param {number} [options.quality=0.85] The quality for WebP compression (0 to 1).
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
                            resolve(event.target.result);
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
                    img.src = event.target.result;
                };
                reader.onerror = (err) => reject(new Error('Failed to read file.'));
                reader.readAsDataURL(file);
            });
        }

        /**
         * Compresses a configuration object into a gzipped, Base64-encoded string.
         * @param {object} config The configuration object.
         * @returns {Promise<string>} A promise that resolves with the compressed string.
         */
        async compressConfig(config) {
            try {
                const jsonString = JSON.stringify(config);
                const data = new TextEncoder().encode(jsonString);
                const stream = new Response(data).body.pipeThrough(new CompressionStream('gzip'));
                const compressed = await new Response(stream).arrayBuffer();

                // Convert ArrayBuffer to Base64 in chunks to avoid "Maximum call stack size exceeded"
                let binary = '';
                const bytes = new Uint8Array(compressed);
                const len = bytes.byteLength;
                const CHUNK_SIZE = 8192;
                for (let i = 0; i < len; i += CHUNK_SIZE) {
                    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
                    binary += String.fromCharCode.apply(null, chunk);
                }
                return btoa(binary);
            } catch (error) {
                Logger.error('Compression failed:', error);
                throw new Error("Configuration compression failed.");
            }
        }

        /**
         * Decompresses a gzipped, Base64-encoded string back into a configuration object.
         * @param {string} base64String The compressed string.
         * @returns {Promise<object>} A promise that resolves with the decompressed config object.
         */
        async decompressConfig(base64String) {
            try {
                const binaryString = atob(base64String);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const stream = new Response(bytes).body.pipeThrough(new DecompressionStream('gzip'));
                const decompressed = await new Response(stream).text();
                return JSON.parse(decompressed);
            } catch (error) {
                Logger.error('Decompression failed:', error);
                throw new Error("Configuration is corrupt or in an unknown format.");
            }
        }
    }

    // =================================================================================
    // SECTION: Utility Functions
    // Description: General helper functions used across the script.
    // =================================================================================

    /**
     * @param {Function} func
     * @param {number} delay
     * @returns {Function}
     */
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
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
     * Creates a DOM element using a hyperscript-style syntax.
     * @param {string} tag - Tag name with optional ID/class (e.g., "div#app.container", "my-element").
     * @param {Object|Array|string|Node} [propsOrChildren] - Attributes object or children.
     * @param {Array|string|Node} [children] - Children (if props are specified).
     * @returns {HTMLElement|SVGElement} - The created DOM element.
     */
    function h(tag, propsOrChildren, children) {
        const SVG_NS = 'http://www.w3.org/2000/svg';
        const match = tag.match(/^([a-z0-9-]+)(#[\w-]+)?((\.[\w-]+)*)$/i);
        if (!match) throw new Error(`Invalid tag syntax: ${tag}`);

        const [, tagName, id, classList] = match;
        const isSVG = ['svg', 'circle', 'rect', 'path', 'g', 'line', 'text', 'use', 'defs', 'clipPath'].includes(tagName);
        const el = isSVG
        ? document.createElementNS(SVG_NS, tagName)
        : document.createElement(tagName);

        if (id) el.id = id.slice(1);
        if (classList) el.className = classList.replace(/\./g, ' ').trim();

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
        const safeUrlRegex = /^\s*(?:(?:https?|mailto|tel|ftp|blob):|[^a-z0-9+.-]*[#/])/i;

        for (const [key, value] of Object.entries(props)) {
            // 0. Handle `ref` callback (highest priority after props parsing).
            if (key === 'ref' && typeof value === 'function') {
                value(el);
            }
            // 1. Security check for URL attributes.
            else if (urlAttributes.has(key)) {
                const url = String(value);
                if (safeUrlRegex.test(url)) {
                    el.setAttribute(key, url);
                } else {
                    el.setAttribute(key, '#');
                    Logger.warn(`Blocked potentially unsafe URL in attribute "${key}":`, url);
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
                if (isSVG) {
                    el.setAttribute('class', value);
                } else {
                    el.className = value;
                }
            } else if (key.startsWith('aria-')) {
                el.setAttribute(key, value);
            }
            // 4. Default attribute handling.
            else if (value !== false && value != null) {
                el.setAttribute(key, value === true ? '' : value);
            }
        }
        // --- End of Attribute/Property Handling ---

        const fragment = document.createDocumentFragment();
        function append(child) {
            if (child == null || child === false) return;
            if (typeof child === 'string' || typeof child === 'number') {
                fragment.appendChild(document.createTextNode(child));
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
     * Recursively builds a DOM element from a definition object using the h() function.
     * @param {object} def The definition object for the element.
     * @returns {HTMLElement | SVGElement | null} The created DOM element.
     */
    function createIconFromDef(def) {
        if (!def) return null;
        const children = def.children ? def.children.map(child => createIconFromDef(child)) : [];
        return h(def.tag, def.props, children);
    }

    /**
     * Waits for a specific element to appear in the DOM using MutationObserver for efficiency.
     * @param {string} selector The CSS selector for the element.
     * @param {object} [options]
     * @param {number} [options.timeout=10000] The maximum time to wait in milliseconds.
     * @param {HTMLElement} [options.context=document] The element to search within.
     * @returns {Promise<HTMLElement | null>} A promise that resolves with the element or null if timed out.
     */
    function waitForElement(selector, { timeout = 10000, context = document } = {}) {
        return new Promise((resolve) => {
            // First, check if the element already exists within the given context.
            const el = context.querySelector(selector);
            if (el) {
                return resolve(el);
            }

            const observer = new MutationObserver(() => {
                const found = context.querySelector(selector);
                if (found) {
                    observer.disconnect();
                    clearTimeout(timer);
                    resolve(found);
                }
            });

            const timer = setTimeout(() => {
                observer.disconnect();
                Logger.warn(`Timed out after ${timeout}ms waiting for element "${selector}"`);
                resolve(null);
            }, timeout);

            observer.observe(context, {
                childList: true,
                subtree: true
            });
        });
    }

    /**
     * Generates a unique ID string.
     * @returns {string}
     */
    function generateUniqueId() {
        return `${APPID}-theme-` + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    }

    /**
     * Proposes a unique name by appending a suffix if the base name already exists in a given set.
     * It checks for "Copy", "Copy 2", "Copy 3", etc., in a case-insensitive manner.
     * @param {string} baseName The initial name to check.
     * @param {Set<string> | Array<string>} existingNames A Set or Array containing existing names.
     * @returns {string} A unique name.
     */
    function proposeUniqueName(baseName, existingNames) {
        const existingNamesLower = new Set(Array.from(existingNames).map(name => name.toLowerCase()));

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
        const sanitizedSvg = svg.replace(/<script.+?<\/script>/sg, '');
        // Gemini's CSP blocks single quotes in data URLs, so they must be encoded.
        const encodedSvg = encodeURIComponent(sanitizedSvg)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
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
        const allowed = fieldType === 'icon' ?
              'a URL (http...), Data URI (data:image...), an SVG string, or a CSS function (url(), linear-gradient())' :
        'a URL, a Data URI, or a CSS function';
        return { isValid: false, message: `Invalid format. Must be ${allowed}.` };
    }

    /**
     * Gets the current width of the sidebar.
     * @returns {number}
     */
    function getSidebarWidth() {
        const sidebar = document.querySelector(CONSTANTS.SELECTORS.SIDEBAR_WIDTH_TARGET);
        if (sidebar && sidebar.offsetParent !== null) {
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
     * It's platform-aware for simple (non-offset) scrolls. For offset scrolls,
     * it uses a "virtual anchor" method: it temporarily creates an invisible element
     * positioned above the target, scrolls to it using `scrollIntoView`, and then removes it.
     * @param {HTMLElement} element The target element to scroll to.
     * @param {object} [options] - Scrolling options.
     * @param {number} [options.offset=0] - A pixel offset to apply above the target element.
     * @param {boolean} [options.smooth=false] - Whether to use smooth scrolling.
     */
    function scrollToElement(element, options = {}) {
        if (!element) return;
        const { offset = 0, smooth = false } = options;
        const behavior = smooth ? 'smooth' : 'auto';

        const scrollContainerSelector = CONSTANTS.SELECTORS.SCROLL_CONTAINER;
        const scrollContainer = scrollContainerSelector ? document.querySelector(scrollContainerSelector) : null;

        if (scrollContainer) {
            // Platform-specific scroll method for containers that support direct scrollTop manipulation (like ChatGPT).
            // This is the most reliable method as it doesn't alter the DOM layout.
            const targetScrollTop = element.offsetTop - offset;
            scrollContainer.scrollTo({
                top: targetScrollTop,
                behavior
            });
            return;
        }

        // Fallback for standard window scrolling (like Gemini).
        if (offset === 0) {
            // Use the simplest method for non-offset scrolls.
            element.scrollIntoView({ behavior, block: 'start' });
        } else {
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
                }
            });

            target.prepend(anchor);
            anchor.scrollIntoView({ behavior, block: 'start' });

            // Clean up after a delay
            setTimeout(() => {
                anchor.remove();
                if (originalPosition === 'static') {
                    target.style.position = originalPosition;
                }
            }, 1500);
        }
    }

    // =================================================================================
    // SECTION: Configuration Management (GM Storage)
    // =================================================================================

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
                throw new Error("configKey and defaultConfig must be provided.");
            }
            this.CONFIG_KEY = configKey;
            this.DEFAULT_CONFIG = defaultConfig;
            /** @type {object|null} */
            this.config = null;
        }

        /**
         * Loads the configuration from storage.
         * Assumes the configuration is stored as a JSON string.
         * @returns {Promise<void>}
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
         * @returns {object|null} The current configuration object.
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
        constructor() {
            super({
                configKey: CONSTANTS.CONFIG_KEY,
                defaultConfig: DEFAULT_THEME_CONFIG,
            });
            this.dataConverter = new DataConverter();
        }

        /**
         * @override
         * Loads the configuration from storage.
         * It attempts to parse as JSON for backward
         * compatibility, then falls back to decompressing the new gzipped format.
         * @returns {Promise<void>}
         */
        async load() {
            const raw = await GM_getValue(this.CONFIG_KEY);
            let userConfig = null;
            let migrationNeeded = false;

            if (raw) {
                // 1. Try parsing as plain JSON first.
                try {
                    const parsed = JSON.parse(raw);
                    if (isObject(parsed)) {
                        userConfig = parsed;
                    }
                } catch {
                    // 2. If JSON parsing fails, try decompressing the old format.
                    try {
                        userConfig = await this.dataConverter.decompressConfig(raw);
                        migrationNeeded = true; // Mark for re-saving in the new format.
                        Logger.log('Old compressed config detected. Will migrate to plain JSON on load.');
                    } catch (e) {
                        Logger.error(`Failed to parse or decompress config. Resetting to default. Error: ${e.message}`);
                        userConfig = null;
                    }
                }
            }

            const completeConfig = JSON.parse(JSON.stringify(this.DEFAULT_CONFIG));
            this.config = deepMerge(completeConfig, userConfig || {});

            this._validateAndSanitizeOptions();

            // 3. If migration was needed, save the config back in plain JSON format.
            if (migrationNeeded) {
                try {
                    await this.save(this.config);
                    Logger.log('Successfully migrated config to plain JSON format.');
                } catch (e) {
                    Logger.error('Failed to save migrated config:', e);
                }
            }
        }

        /**
         * @override
         * Compresses and saves the configuration object to storage, but only if it's
         * under the size limit.
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

                EventBus.publish(`${APPID}:configSizeExceeded`, { message: errorMsg });
                throw new Error(errorMsg); // Throw error for immediate UI feedback
            }

            this.config = obj;
            await GM_setValue(this.CONFIG_KEY, jsonString);
            EventBus.publish(`${APPID}:configSaveSuccess`); // Notify UI to clear warnings
        }

        /**
         * Decodes a raw string from storage into a user configuration object.
         * Handles both plain JSON and legacy compressed formats.
         * @param {string | null} rawValue The raw string from GM_getValue.
         * @returns {Promise<object | null>} The parsed user configuration object, or null if parsing fails.
         */
        async decode(rawValue) {
            if (!rawValue) return null;

            // 1. Try parsing as plain JSON first.
            try {
                const parsed = JSON.parse(rawValue);
                if (isObject(parsed)) {
                    return parsed;
                }
            } catch {
                // Not a valid JSON, fall through to try decompression.
            }

            // 2. If JSON parsing fails, try decompressing the old format.
            try {
                return await this.dataConverter.decompressConfig(rawValue);
            } catch (e) {
                Logger.error(`Failed to parse or decompress raw value. Error: ${e.message}`);
                return null;
            }
        }

        /**
         * Validates the matchPatterns within the themeSets of a given config object.
         * Throws an error if validation fails.
         * @param {object} config - The configuration object to validate.
         */
        validateThemeMatchPatterns(config) {
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
        }

        /**
         * @override
         * @protected
         * Validates and sanitizes App-specific option values after loading.
         */
        _validateAndSanitizeOptions() {
            if (!this.config || !this.config.options) return;
            const options = this.config.options;
            let width = options.chat_content_max_width;
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
            return this.config?.options?.icon_size ||
                CONSTANTS.ICON_SIZE;
        }
    }

    // =================================================================================
    // SECTION: Sync Manager
    // =================================================================================

    class SyncManager {
        constructor(appInstance) {
            this.app = appInstance;
            this.pendingRemoteConfig = null;
        }

        init() {
            GM_addValueChangeListener(this.app.configKey, async (name, oldValue, newValue, remote) => {
                if (remote) {
                    await this._handleRemoteChange(newValue);
                }
            });
        }

        onModalClose() {
            if (this.pendingRemoteConfig) {
                Logger.log('SyncManager: Modal closed with a pending update. Applying it now.');
                this.app.applyUpdate(this.pendingRemoteConfig);
                this.pendingRemoteConfig = null;
            }
        }

        onSave() {
            // A local save overwrites any pending remote changes.
            this.pendingRemoteConfig = null;
            // Also, clear any visible conflict notifications.
            const activeModal = this.app.uiManager.getActiveModal?.();
            if (activeModal) {
                this._clearConflictNotification(activeModal);
            }
        }

        async _handleRemoteChange(rawValue) {
            Logger.log('SyncManager: Remote config change detected.');
            try {
                const newConfig = await this.app.configManager.decode(rawValue);
                const activeModal = this.app.uiManager.getActiveModal?.();

                if (activeModal) {
                    Logger.log('SyncManager: A modal is open. Storing update and displaying conflict notification.');
                    this.pendingRemoteConfig = newConfig;
                    this._showConflictNotification(activeModal);
                } else {
                    Logger.log('SyncManager: No modal open. Applying silent update.');
                    this.app.applyUpdate(newConfig);
                }
            } catch (e) {
                Logger.error('SyncManager: Failed to handle remote config change:', e);
            }
        }

        _showConflictNotification(modalComponent) {
            if (!modalComponent?.modal) return;
            this._clearConflictNotification(modalComponent); // Clear previous state first

            const styles = modalComponent.callbacks.siteStyles;
            const messageArea = modalComponent.modal.dom.footerMessage;

            if (messageArea) {
                const messageText = h('span', {
                    textContent: 'Settings updated in another tab.',
                    style: { display: 'flex', alignItems: 'center' }
                });

                const reloadBtn = h('button', {
                    id: `${APPID}-conflict-reload-btn`,
                    className: `${APPID}-modal-button`,
                    textContent: 'Reload UI',
                    title: 'Discard local changes and load the settings from the other tab.',
                    style: {
                        borderColor: styles.error_text || 'red',
                        marginLeft: '12px'
                    },
                    onclick: () => {
                        const reopenContext = modalComponent.getContextForReopen?.();
                        modalComponent.close();
                        // onModalClose will handle applying the pending update.
                        // Request to reopen the modal after a short delay to ensure sync completion.
                        setTimeout(() => {
                            EventBus.publish(`${APPID}:reOpenModal`, reopenContext);
                        }, 100);
                    }
                });

                messageArea.textContent = '';
                messageArea.classList.add(`${APPID}-conflict-text`);
                messageArea.style.color = styles.error_text || 'red';
                messageArea.append(messageText, reloadBtn);
            }
        }

        _clearConflictNotification(modalComponent) {
            if (!modalComponent?.modal) return;
            const messageArea = modalComponent.modal.dom.footerMessage;
            if (messageArea) {
                messageArea.textContent = '';
                messageArea.classList.remove(`${APPID}-conflict-text`);
            }
        }
    }

    // =================================================================================
    // SECTION: Image Data Management
    // Description: Handles fetching external images and converting them to data URLs to bypass CSP.
    // =================================================================================

    class ImageDataManager {
        constructor() {
            /** @type {Map<string, string>} */
            this.cache = new Map();
        }

        /**
         * Fetches an image and converts it to a base64 data URL.
         * Caches the result to avoid redundant requests.
         * @param {string} url The URL of the image to fetch.
         * @returns {Promise<string|null>} A promise that resolves with the data URL or null on failure.
         */
        async getImageAsDataUrl(url) {
            if (!url || typeof url !== 'string') {
                return null;
            }
            if (url.trim().startsWith('data:image')) {
                return url;
            }
            if (this.cache.has(url)) {
                return this.cache.get(url);
            }

            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'blob',
                    onload: (response) => {
                        if (response.status >= 200 && response.status < 300) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const dataUrl = reader.result;
                                this.cache.set(url, dataUrl);
                                resolve(dataUrl);
                            };
                            reader.onerror = () => {
                                Logger.error(`FileReader error for URL: ${url}`);
                                resolve(null);
                            };
                            reader.readAsDataURL(response.response);
                        } else {
                            Logger.error(`Failed to fetch image. Status: ${response.status}, URL: ${url}`);
                            resolve(null);
                        }
                    },
                    onerror: (error) => {
                        Logger.error(`GM_xmlhttpRequest error for URL: ${url}`, error);
                        resolve(null);
                    },
                    ontimeout: () => {
                        Logger.error(`GM_xmlhttpRequest timeout for URL: ${url}`);
                        resolve(null);
                    }
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
            this.debouncedRebuildCache = debounce(this._rebuildCache.bind(this), 250);
        }

        init() {
            EventBus.subscribe(`${APPID}:cacheUpdateRequest`, () => this.debouncedRebuildCache());
            EventBus.subscribe(`${APPID}:navigation`, () => this.clear());
            this._rebuildCache();
        }

        _rebuildCache() {
            this.userMessages = Array.from(document.querySelectorAll(CONSTANTS.SELECTORS.USER_MESSAGE));
            this.assistantMessages = Array.from(document.querySelectorAll(CONSTANTS.SELECTORS.ASSISTANT_MESSAGE));
            this.totalMessages = Array.from(document.querySelectorAll(CONSTANTS.SELECTORS.BUBBLE_FEATURE_MESSAGE_CONTAINERS))
                .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

            this.notify();
        }

        /**
         * Publishes the :cacheUpdated event with the current cache state.
         * Useful for notifying newly initialized components.
         */
        notify() {
            EventBus.publish(`${APPID}:cacheUpdated`);
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

        getUserMessages() {
            return this.userMessages;
        }

        getAssistantMessages() {
            return this.assistantMessages;
        }

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
        return path.split('.').reduce((o, k) => (o && o[k] !== 'undefined') ? o[k] : undefined, obj);
    }

    // =================================================================================
    // SECTION: Declarative Style Mapper
    // Description: Single source of truth for all theme-driven style generation.
    // This array declaratively maps configuration properties to CSS variables and rules.
    // The StyleGenerator engine processes this array to build the final CSS.
    // =================================================================================

    const STATIC_CSS = `
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

    const STYLE_DEFINITIONS = [
        // -----------------------------------------------------------------------------
        // SECTION: User Actor Styles
        // -----------------------------------------------------------------------------
        {
            configKey: 'user.name',
            fallbackKey: 'defaultSet.user.name',
            cssVar: `--${APPID}-user-name`,
            transformer: (value) => value ? `'${value.replace(/'/g, "\\'")}'` : null
        },
        {
            configKey: 'user.icon',
            fallbackKey: 'defaultSet.user.icon',
            cssVar: `--${APPID}-user-icon`,
        },
        {
            configKey: 'user.standingImageUrl',
            fallbackKey: 'defaultSet.user.standingImageUrl',
            cssVar: `--${APPID}-user-standing-image`,
        },
        {
            configKey: 'user.textColor',
            fallbackKey: 'defaultSet.user.textColor',
            cssVar: `--${APPID}-user-textColor`,
            selector: `${CONSTANTS.SELECTORS.USER_MESSAGE} ${CONSTANTS.SELECTORS.USER_TEXT_CONTENT}`,
            property: 'color'
        },
        {
            configKey: 'user.font',
            fallbackKey: 'defaultSet.user.font',
            cssVar: `--${APPID}-user-font`,
            selector: `${CONSTANTS.SELECTORS.USER_MESSAGE} ${CONSTANTS.SELECTORS.USER_TEXT_CONTENT}`,
            property: 'font-family'
        },
        {
            configKey: 'user.bubbleBackgroundColor',
            fallbackKey: 'defaultSet.user.bubbleBackgroundColor',
            cssVar: `--${APPID}-user-bubble-bg`,
            selector: `${CONSTANTS.SELECTORS.USER_MESSAGE} ${CONSTANTS.SELECTORS.RAW_USER_BUBBLE}`,
            property: 'background-color'
        },
        {
            configKey: 'user.bubblePadding',
            fallbackKey: 'defaultSet.user.bubblePadding',
            cssVar: `--${APPID}-user-bubble-padding`,
            selector: `${CONSTANTS.SELECTORS.USER_MESSAGE} ${CONSTANTS.SELECTORS.RAW_USER_BUBBLE}`,
            property: 'padding'
        },
        {
            configKey: 'user.bubbleBorderRadius',
            fallbackKey: 'defaultSet.user.bubbleBorderRadius',
            cssVar: `--${APPID}-user-bubble-radius`,
            selector: `${CONSTANTS.SELECTORS.USER_MESSAGE} ${CONSTANTS.SELECTORS.RAW_USER_BUBBLE}`,
            property: 'border-radius'
        },
        {
            configKey: 'user.bubbleMaxWidth',
            fallbackKey: 'defaultSet.user.bubbleMaxWidth',
            cssVar: `--${APPID}-user-bubble-maxwidth`,
            cssBlockGenerator: (value) => value ? `${CONSTANTS.SELECTORS.USER_MESSAGE} ${CONSTANTS.SELECTORS.RAW_USER_BUBBLE} { max-width: var(--${APPID}-user-bubble-maxwidth)${SITE_STYLES.CSS_IMPORTANT_FLAG}; }` : ''
        },

        // -----------------------------------------------------------------------------
        // SECTION: Assistant Actor Styles
        // -----------------------------------------------------------------------------
        {
            configKey: 'assistant.name',
            fallbackKey: 'defaultSet.assistant.name',
            cssVar: `--${APPID}-assistant-name`,
            transformer: (value) => value ? `'${value.replace(/'/g, "\\'")}'` : null
        },
        {
            configKey: 'assistant.icon',
            fallbackKey: 'defaultSet.assistant.icon',
            cssVar: `--${APPID}-assistant-icon`,
        },
        {
            configKey: 'assistant.standingImageUrl',
            fallbackKey: 'defaultSet.assistant.standingImageUrl',
            cssVar: `--${APPID}-assistant-standing-image`,
        },
        {
            configKey: 'assistant.textColor',
            fallbackKey: 'defaultSet.assistant.textColor',
            cssVar: `--${APPID}-assistant-textColor`,
            selector: `${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.ASSISTANT_TEXT_CONTENT}`,
            property: 'color',
            // Also apply color to all markdown child elements for consistency
            cssBlockGenerator: (value) => {
                if (!value) return '';
                const childSelectors = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul li', 'ol li', 'ul li::marker', 'ol li::marker', 'strong', 'em', 'blockquote', 'table', 'th', 'td'];
                const fullSelectors = childSelectors.map(s => `${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.ASSISTANT_TEXT_CONTENT} ${s}`);
                return `${fullSelectors.join(', ')} { color: var(--${APPID}-assistant-textColor); }`;
            }
        },
        {
            configKey: 'assistant.font',
            fallbackKey: 'defaultSet.assistant.font',
            cssVar: `--${APPID}-assistant-font`,
            selector: `${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.ASSISTANT_TEXT_CONTENT}`,
            property: 'font-family'
        },
        {
            configKey: 'assistant.bubbleBackgroundColor',
            fallbackKey: 'defaultSet.assistant.bubbleBackgroundColor',
            cssVar: `--${APPID}-assistant-bubble-bg`,
            selector: `${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.RAW_ASSISTANT_BUBBLE}`,
            property: 'background-color'
        },
        {
            configKey: 'assistant.bubblePadding',
            fallbackKey: 'defaultSet.assistant.bubblePadding',
            cssVar: `--${APPID}-assistant-bubble-padding`,
            selector: `${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.RAW_ASSISTANT_BUBBLE}`,
            property: 'padding'
        },
        {
            configKey: 'assistant.bubbleBorderRadius',
            fallbackKey: 'defaultSet.assistant.bubbleBorderRadius',
            cssVar: `--${APPID}-assistant-bubble-radius`,
            selector: `${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.RAW_ASSISTANT_BUBBLE}`,
            property: 'border-radius'
        },
        {
            configKey: 'assistant.bubbleMaxWidth',
            fallbackKey: 'defaultSet.assistant.bubbleMaxWidth',
            cssVar: `--${APPID}-assistant-bubble-maxwidth`,
            cssBlockGenerator: (value) => {
                if (!value) return '';
                return `${CONSTANTS.SELECTORS.ASSISTANT_MESSAGE} ${CONSTANTS.SELECTORS.RAW_ASSISTANT_BUBBLE} { max-width: var(--${APPID}-assistant-bubble-maxwidth)${SITE_STYLES.CSS_IMPORTANT_FLAG}; margin-left: 0; margin-right: auto; }`;
            }
        },

        // -----------------------------------------------------------------------------
        // SECTION: Window Styles
        // -----------------------------------------------------------------------------
        {
            configKey: 'window.backgroundColor',
            fallbackKey: 'defaultSet.window.backgroundColor',
            cssVar: `--${APPID}-window-bg-color`,
            selector: CONSTANTS.SELECTORS.MAIN_APP_CONTAINER,
            property: 'background-color'
        },
        {
            configKey: 'window.backgroundImageUrl',
            fallbackKey: 'defaultSet.window.backgroundImageUrl',
            cssVar: `--${APPID}-window-bg-image`,
            cssBlockGenerator: (value) => value ? `${CONSTANTS.SELECTORS.MAIN_APP_CONTAINER} { background-image: var(--${APPID}-window-bg-image)${SITE_STYLES.CSS_IMPORTANT_FLAG}; }` : ''
        },
        {
            configKey: 'window.backgroundSize',
            fallbackKey: 'defaultSet.window.backgroundSize',
            cssVar: `--${APPID}-window-bg-size`,
            cssBlockGenerator: (value) => value ? `${CONSTANTS.SELECTORS.MAIN_APP_CONTAINER} { background-size: var(--${APPID}-window-bg-size)${SITE_STYLES.CSS_IMPORTANT_FLAG}; }` : ''
        },
        {
            configKey: 'window.backgroundPosition',
            fallbackKey: 'defaultSet.window.backgroundPosition',
            cssVar: `--${APPID}-window-bg-pos`,
            cssBlockGenerator: (value) => value ? `${CONSTANTS.SELECTORS.MAIN_APP_CONTAINER} { background-position: var(--${APPID}-window-bg-pos)${SITE_STYLES.CSS_IMPORTANT_FLAG}; }` : ''
        },
        {
            configKey: 'window.backgroundRepeat',
            fallbackKey: 'defaultSet.window.backgroundRepeat',
            cssVar: `--${APPID}-window-bg-repeat`,
            cssBlockGenerator: (value) => value ? `${CONSTANTS.SELECTORS.MAIN_APP_CONTAINER} { background-repeat: var(--${APPID}-window-bg-repeat)${SITE_STYLES.CSS_IMPORTANT_FLAG}; }` : ''
        },

        // -----------------------------------------------------------------------------
        // SECTION: Input Area Styles
        // -----------------------------------------------------------------------------
        {
            configKey: 'inputArea.backgroundColor',
            fallbackKey: 'defaultSet.inputArea.backgroundColor',
            cssVar: `--${APPID}-input-bg`,
            // Use 'background' property to override potential gradients in Gemini's input area.
            selector: CONSTANTS.SELECTORS.INPUT_AREA_BG_TARGET,
            property: 'background'
        },
        {
            configKey: 'inputArea.textColor',
            fallbackKey: 'defaultSet.inputArea.textColor',
            cssVar: `--${APPID}-input-color`,
            selector: CONSTANTS.SELECTORS.INPUT_TEXT_FIELD_TARGET,
            property: 'color'
        },
    ];

    class StyleGenerator {
        /**
         * Creates the static CSS template that does not change with themes.
         * @returns {string} The static CSS string.
         */
        generateStaticCss() {
            return STATIC_CSS;
        }

        /**
         * Generates all dynamic CSS rules based on the active theme and STYLE_DEFINITIONS.
         * @param {ThemeSet} currentThemeSet The active theme configuration.
         * @param {AppConfig} fullConfig The entire configuration object, including defaultSet.
         * @returns {string[]} An array of CSS rule strings.
         */
        generateDynamicCss(currentThemeSet, fullConfig) {
            const dynamicRules = [];
            const important = SITE_STYLES.CSS_IMPORTANT_FLAG || '';

            for (const definition of STYLE_DEFINITIONS) {
                const value = getPropertyByPath(currentThemeSet, definition.configKey) ??
                      getPropertyByPath(fullConfig, definition.fallbackKey);

                if (value === null || value === undefined) continue;
                // Generate rules for direct selector-property mappings
                if (definition.selector && definition.property) {
                    const selectors = Array.isArray(definition.selector) ?
                          definition.selector.join(', ') : definition.selector;
                    dynamicRules.push(`${selectors} { ${definition.property}: var(${definition.cssVar})${important}; }`);
                }

                // Generate additional complex CSS blocks if a generator function is defined
                if (typeof definition.cssBlockGenerator === 'function') {
                    const block = definition.cssBlockGenerator(value);
                    if (block) {
                        dynamicRules.push(block);
                    }
                }
            }
            return dynamicRules;
        }

        /**
         * Generates an object of all CSS variables for the theme.
         * @param {ThemeSet} currentThemeSet The active theme configuration.
         * @param {AppConfig} fullConfig The entire configuration object, including defaultSet.
         * @returns {Object<string, string|null>} Key-value pairs of CSS variables.
         */
        generateThemeVariables(currentThemeSet, fullConfig) {
            const themeVars = {};
            for (const definition of STYLE_DEFINITIONS) {
                if (!definition.cssVar) continue;
                const value = getPropertyByPath(currentThemeSet, definition.configKey) ??
                      getPropertyByPath(fullConfig, definition.fallbackKey);

                if (value === null || value === undefined) {
                    themeVars[definition.cssVar] = null;
                    continue;
                }

                themeVars[definition.cssVar] = typeof definition.transformer === 'function' ?
                    definition.transformer(value, fullConfig) :
                value;
            }

            return themeVars;
        }
    }

    class ThemeManager {
        /**
         * @param {ConfigManager} configManager
         * @param {ImageDataManager} imageDataManager
         * @param {StandingImageManager} standingImageManager
         */
        constructor(configManager, imageDataManager, standingImageManager) {
            this.configManager = configManager;
            this.imageDataManager = imageDataManager;
            this.standingImageManager = standingImageManager;
            this.styleGenerator = new StyleGenerator();
            this.themeStyleElem = null;
            this.lastURL = null;
            this.lastTitle = null;
            this.lastAppliedThemeSet = null;
            this.cachedTitle = null;
            this.cachedThemeSet = null;
            EventBus.subscribe(`${APPID}:themeUpdate`, () => this.updateTheme());
            EventBus.subscribe(`${APPID}:layoutRecalculate`, () => this.applyChatContentMaxWidth());
            EventBus.subscribe(`${APPID}:widthPreview`, (newWidth) => this.applyChatContentMaxWidth(newWidth));
        }

        /**
         * Gets the title of the currently active chat from the page.
         * @returns {string | null}
         */
        getChatTitleAndCache() {
            const currentTitle = PlatformAdapter.getChatTitle();
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
                            } catch { /* ignore invalid regex strings in config */ }
                        } else {
                            Logger.error(`Invalid match pattern format (must be /pattern/flags): ${title}`);
                        }
                    } else if (title instanceof RegExp) {
                        regexArr.push({ pattern: new RegExp(title.source, title.flags), set });
                    }
                }
            }

            const name = this.cachedTitle;
            if (name) {
                const regexHit = regexArr.find(r => r.pattern.test(name));
                if (regexHit) {
                    this.cachedThemeSet = regexHit.set;
                    return regexHit.set;
                }
            }

            // Fallback to default if no title or no match
            this.cachedThemeSet = config.defaultSet;
            return config.defaultSet;
        }

        /**
         * Main theme update handler.
         */
        updateTheme() {
            const currentLiveURL = location.href;
            const currentTitle = this.getChatTitleAndCache();
            const urlChanged = currentLiveURL !== this.lastURL;
            if (urlChanged) this.lastURL = currentLiveURL;
            const titleChanged = currentTitle !== this.lastTitle;
            if (titleChanged) this.lastTitle = currentTitle;

            const config = this.configManager.get();
            const currentThemeSet = PlatformAdapter.selectThemeForUpdate(this, config, urlChanged, titleChanged);
            const contentChanged = currentThemeSet !== this.lastAppliedThemeSet;

            const themeShouldUpdate = urlChanged || titleChanged || contentChanged;
            if (themeShouldUpdate) {
                this.applyThemeStyles(currentThemeSet, config);
                this.applyChatContentMaxWidth();
            }
        }

        /**
         * Applies all theme-related styles to the document.
         * @param {ThemeSet} currentThemeSet The active theme configuration.
         * @param {AppConfig} fullConfig The entire configuration object, including defaultSet.
         */
        async applyThemeStyles(currentThemeSet, fullConfig) {
            this.lastAppliedThemeSet = currentThemeSet;
            // Static styles
            if (!this.themeStyleElem) {
                this.themeStyleElem = h('style', {
                    id: `${APPID}-theme-style`,
                    textContent: this.styleGenerator.generateStaticCss()
                });
                document.head.appendChild(this.themeStyleElem);
            }
            // Dynamic rules
            const dynamicRulesStyleId = `${APPID}-dynamic-rules-style`;
            let dynamicRulesStyleElem = document.getElementById(dynamicRulesStyleId);
            if (!dynamicRulesStyleElem) {
                dynamicRulesStyleElem = h('style', { id: dynamicRulesStyleId });
                document.head.appendChild(dynamicRulesStyleElem);
            }
            // Generate and apply dynamic styles
            const dynamicRules = this.styleGenerator.generateDynamicCss(currentThemeSet, fullConfig);
            dynamicRulesStyleElem.textContent = dynamicRules.join('\n');

            const rootStyle = document.documentElement.style;
            const asyncImageTasks = [];
            const processImageValue = async (value, cssVar) => {
                if (!value) {
                    rootStyle.removeProperty(cssVar);
                    return;
                }
                const val = value.trim();
                let finalCssValue = val; // Default to using the value as-is

                if (val.startsWith('<svg')) {
                    // Case 1: Raw SVG string -> Convert to data URL and wrap
                    finalCssValue = `url("${svgToDataUrl(val)}")`;
                } else if (val.startsWith('http')) {
                    // Case 2: Raw http URL -> Fetch, convert to data URL, and wrap
                    const dataUrl = await this.imageDataManager.getImageAsDataUrl(val);
                    finalCssValue = dataUrl ? `url("${dataUrl}")` : 'none';
                } else if (val.startsWith('data:image')) {
                    // Case 3: Raw data: URI string, needs to be wrapped in url()
                    finalCssValue = `url("${val}")`;
                } else {
                    // Case 4: Assumed to be a complete CSS value (linear-gradient, pre-wrapped url(), etc.) -> Use as-is
                    finalCssValue = val;
                }

                if (finalCssValue && finalCssValue !== 'none') {
                    rootStyle.setProperty(cssVar, finalCssValue);
                } else {
                    rootStyle.removeProperty(cssVar);
                }
            };
            for (const definition of STYLE_DEFINITIONS) {
                if (!definition.cssVar) continue;
                const value = getPropertyByPath(currentThemeSet, definition.configKey) ??
                      getPropertyByPath(fullConfig, `defaultSet.${definition.configKey}`);

                if (value === null || typeof value === 'undefined') {
                    rootStyle.removeProperty(definition.cssVar);
                    continue;
                }

                if (definition.configKey.endsWith('icon') || definition.configKey.includes('ImageUrl')) {
                    asyncImageTasks.push(processImageValue(value, definition.cssVar));
                } else if (typeof definition.transformer === 'function') {
                    rootStyle.setProperty(definition.cssVar, definition.transformer(value, fullConfig));
                } else {
                    rootStyle.setProperty(definition.cssVar, value);
                }
            }

            const themeVars = this.styleGenerator.generateThemeVariables(currentThemeSet, fullConfig);
            for (const [key, value] of Object.entries(themeVars)) {
                // Let processImageValue handle image vars asynchronously
                if (value !== null && value !== undefined && !key.includes('icon') && !key.includes('standing-image')) {
                    rootStyle.setProperty(key, value);
                }
            }

            await Promise.all(asyncImageTasks);
            EventBus.publish(`${APPID}:themeApplied`, { theme: currentThemeSet, config: fullConfig });
        }

        /**
         * Calculates and applies the dynamic max-width for the chat content area.
         * @param {string | null} [forcedWidth=null] - A specific width value to apply for previews.
         */
        applyChatContentMaxWidth(forcedWidth = undefined) {
            const rootStyle = document.documentElement.style;
            const config = this.configManager.get();
            if (!config) return;

            // Use forcedWidth for preview if provided; otherwise, get from config.
            const userMaxWidth = forcedWidth !== undefined ? forcedWidth : config.options.chat_content_max_width;
            // If user has not set a custom width, remove the class and variable to use the default style.
            if (!userMaxWidth) {
                document.body.classList.remove(`${APPID}-max-width-active`);
                rootStyle.removeProperty(`--${APPID}-chat-content-max-width`);
            } else {
                // If a width is set, add the class to enable the rule.
                document.body.classList.add(`${APPID}-max-width-active`);

                const themeSet = this.getThemeSet();
                const iconSize = config.options.icon_size;

                // Check if standing images are active in the current theme or default.
                const hasStandingImage = getPropertyByPath(themeSet, 'user.standingImageUrl') || getPropertyByPath(themeSet, 'assistant.standingImageUrl') ||
                      getPropertyByPath(config.defaultSet, 'user.standingImageUrl') || getPropertyByPath(config.defaultSet, 'assistant.standingImageUrl');
                let requiredMarginPerSide = iconSize + (CONSTANTS.ICON_MARGIN * 2);
                if (hasStandingImage) {
                    const minStandingImageWidth = iconSize * 2;
                    requiredMarginPerSide = Math.max(requiredMarginPerSide, minStandingImageWidth);
                }

                const sidebarWidth = getSidebarWidth();
                // Calculate max allowed width based on the full window, sidebar, and required margins.
                const totalRequiredMargin = sidebarWidth + (requiredMarginPerSide * 2);
                const maxAllowedWidth = window.innerWidth - totalRequiredMargin;
                // Use CSS min() to ensure the user's value does not exceed the calculated available space.
                const finalMaxWidth = `min(${userMaxWidth}, ${maxAllowedWidth}px)`;
                rootStyle.setProperty(`--${APPID}-chat-content-max-width`, finalMaxWidth);
            }

            // Trigger the (debounced) standing image recalculation.
            this.standingImageManager.debouncedRecalculateStandingImagesLayout();
        }
    }

    // =================================================================================
    // SECTION: DOM Observers and Event Listeners
    // =================================================================================

    class ObserverManager {
        constructor() {
            this.mainObserver = null;
            this.layoutResizeObserver = null;
            this.registeredNodeAddedTasks = [];
            this.pendingTurnNodes = new Set();
            this.debouncedNavUpdate = debounce(() => EventBus.publish(`${APPID}:navButtonsUpdate`), 100);
            this.debouncedCacheUpdate = debounce(() => EventBus.publish(`${APPID}:cacheUpdateRequest`), 250);
            this.debouncedLayoutRecalculate = debounce(() => EventBus.publish(`${APPID}:layoutRecalculate`), 150);

            // Delegate platform-specific property initialization to the adapter
            PlatformAdapter.initializeObserver(this);
        }

        async start() {
            // Delegate the entire start logic to the platform-specific adapter
            await PlatformAdapter.start(this);
        }

        /**
         * The main callback, a dispatcher that calls specialized handlers.
         * @param {MutationRecord[]} mutations
         */
        _handleMainMutations(mutations) {
            // Delegate the mutation handling to the platform-specific adapter
            PlatformAdapter.handleMainMutations(this, mutations);
        }

        // --- Common Methods ---

        /**
         * A public method to register a task that runs when a node matching the selector is added.
         * @param {string} selector
         * @param {Function} callback
         */
        registerNodeAddedTask(selector, callback) {
            this.registeredNodeAddedTasks.push({ selector, callback });
        }

        /**
         * Clears all pending conversation turns.
         * Useful when navigating away from a chat.
         */
        cleanupPendingTurns() {
            this.pendingTurnNodes.clear();
        }

        /**
         * Scans the document for all existing conversation turns and processes them.
         * This is crucial for applying themes after page loads or navigations.
         */
        scanForExistingTurns() {
            const existingTurnNodes = Array.from(document.querySelectorAll(CONSTANTS.SELECTORS.CONVERSATION_CONTAINER));
            if (existingTurnNodes.length > 0) {
                for (const turnNode of existingTurnNodes) {
                    this._processTurnSingle(turnNode);
                }
            }
        }

        /**
         * Handles tasks for newly added nodes.
         * @param {MutationRecord[]} mutations
         */
        _dispatchNodeAddedTasks(mutations) {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    for (const addedNode of mutation.addedNodes) {
                        if (addedNode.nodeType !== Node.ELEMENT_NODE) continue;
                        // Process tasks for the added node itself and its descendants
                        for (const task of this.registeredNodeAddedTasks) {
                            if (addedNode.matches(task.selector)) {
                                task.callback(addedNode);
                            }
                            addedNode.querySelectorAll(task.selector).forEach(task.callback);
                        }
                    }
                }
            }
        }

        /**
         * Removes any pending turn nodes that have been removed from the DOM to prevent memory leaks.
         * @param {MutationRecord[]} mutations
         * @private
         */
        _garbageCollectPendingTurns(mutations) {
            if (this.pendingTurnNodes.size === 0) return;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                    for (const removedNode of mutation.removedNodes) {
                        if (removedNode.nodeType !== Node.ELEMENT_NODE) continue;
                        // Check if the removed node itself was a pending turn
                        if (this.pendingTurnNodes.has(removedNode)) {
                            this.pendingTurnNodes.delete(removedNode);
                        }

                        // Check if any descendants of the removed node were pending turns
                        const descendantTurns = removedNode.querySelectorAll(CONSTANTS.SELECTORS.CONVERSATION_CONTAINER);
                        for (const turnNode of descendantTurns) {
                            if (this.pendingTurnNodes.has(turnNode)) {
                                this.pendingTurnNodes.delete(turnNode);
                            }
                        }
                    }
                }
            }
        }

        /**
         * Checks if a conversation turn is complete.
         * @param {HTMLElement} turnNode
         * @returns {boolean}
         * @private
         */
        _isTurnComplete(turnNode) {
            // A turn is complete if it's a user message, or if it's an assistant
            // message that has rendered its action buttons.
            const userMessage = turnNode.querySelector(CONSTANTS.SELECTORS.USER_MESSAGE);
            const assistantActions = turnNode.querySelector(CONSTANTS.SELECTORS.TURN_COMPLETE_SELECTOR);
            return !!(userMessage || assistantActions);
        }

        /**
         * Checks all pending conversation turns for completion.
         * @private
         */
        _checkPendingTurns() {
            if (this.pendingTurnNodes.size === 0) return;
            for (const turnNode of this.pendingTurnNodes) {
                // For streaming turns, continuously inject avatars to handle React re-renders.
                const allElementsInTurn = turnNode.querySelectorAll(CONSTANTS.SELECTORS.BUBBLE_FEATURE_MESSAGE_CONTAINERS);
                allElementsInTurn.forEach(elem => {
                    EventBus.publish(`${APPID}:avatarInject`, elem);
                });
                if (this._isTurnComplete(turnNode)) {
                    // Re-run messageComplete event for all elements in the now-completed turn
                    allElementsInTurn.forEach(elem => {
                        EventBus.publish(`${APPID}:messageComplete`, elem);
                    });
                    EventBus.publish(`${APPID}:turnComplete`, turnNode);

                    this.debouncedNavUpdate();
                    this.pendingTurnNodes.delete(turnNode);
                }
            }
        }

        /**
         * Processes a single turnNode, adding it to the pending queue if it's not already complete.
         * @param {HTMLElement} turnNode
         */
        _processTurnSingle(turnNode) {
            if (turnNode.nodeType !== Node.ELEMENT_NODE || this.pendingTurnNodes.has(turnNode)) return;
            // --- Initial State Processing ---
            const messageElements = turnNode.querySelectorAll(CONSTANTS.SELECTORS.BUBBLE_FEATURE_MESSAGE_CONTAINERS);
            messageElements.forEach(elem => {
                EventBus.publish(`${APPID}:avatarInject`, elem);
            });
            if (this._isTurnComplete(turnNode)) {
                // If the turn is already complete when we first see it, process it immediately.
                messageElements.forEach(elem => {
                    EventBus.publish(`${APPID}:messageComplete`, elem);
                });
                EventBus.publish(`${APPID}:turnComplete`, turnNode);
                this.debouncedNavUpdate();
            } else {
                // Otherwise, add it to the pending list to be checked by the main observer.
                this.pendingTurnNodes.add(turnNode);
            }
        }
    }

    class AvatarManager {
        /**
         * @param {ConfigManager} configManager
         */
        constructor(configManager) {
            this.configManager = configManager;
            this.debouncedUpdateAllMessageHeights = debounce(this.updateAllMessageHeights.bind(this), 250);
        }

        /**
         * Initializes the manager by injecting styles and subscribing to events.
         */
        init() {
            this.injectAvatarStyle();
            EventBus.subscribe(`${APPID}:avatarInject`, (elem) => this.injectAvatar(elem));
            EventBus.subscribe(`${APPID}:cacheUpdateRequest`, () => this.debouncedUpdateAllMessageHeights());
        }

        /**
         * Updates the min-height of all message wrappers on the page.
         */
        updateAllMessageHeights() {
            const allMessageElements = document.querySelectorAll(CONSTANTS.SELECTORS.BUBBLE_FEATURE_MESSAGE_CONTAINERS);
            allMessageElements.forEach(msgElem => {
                const nameDiv = msgElem.querySelector(CONSTANTS.SELECTORS.SIDE_AVATAR_NAME);
                if (!nameDiv) return;

                const setMinHeight = (retryCount = 0) => {
                    requestAnimationFrame(() => {
                        const iconSize = this.configManager.getIconSize();
                        const nameHeight = nameDiv.offsetHeight;

                        if (nameHeight > 0 && iconSize) {
                            msgElem.style.minHeight = (iconSize + nameHeight) + "px";
                        } else if (retryCount < 5) {
                            setTimeout(() => setMinHeight(retryCount + 1), 50);
                        }
                    });
                };
                setMinHeight();
            });
        }

        /**
         * Injects the avatar element into the message wrapper.
         * @param {HTMLElement} msgElem
         */
        injectAvatar(msgElem) {
            // Use a unique class to prevent re-injection
            const processedClass = `${APPID}-avatar-processed`;
            if (msgElem.classList.contains(processedClass)) return;

            const role = PlatformAdapter.getMessageRole(msgElem);
            if (!role) return;
            // This is the main container that gets the icon and name.
            const container = h(`div${CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER}`, [
                h(`span${CONSTANTS.SELECTORS.SIDE_AVATAR_ICON}`),
                h(`div${CONSTANTS.SELECTORS.SIDE_AVATAR_NAME}`)
            ]);
            // Add the container to the message element and mark as processed.
            msgElem.prepend(container);
            msgElem.classList.add(processedClass);
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
            const avatarStyle = h('style', {
                id: styleId,
                textContent: `
                /* Set message containers as positioning contexts */
                ${CONSTANTS.SELECTORS.AVATAR_USER},
                ${CONSTANTS.SELECTORS.AVATAR_ASSISTANT} {
                    position: relative !important;
                    overflow: visible !important;
                }
                ${CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER} {
                    position: absolute;
                    top: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: var(--${APPID}-icon-size);
                    pointer-events: none;
                    white-space: normal;
                    word-break: break-word;
                }
                /* Position Assistant avatar (inside model-response) to the LEFT */
                ${CONSTANTS.SELECTORS.AVATAR_ASSISTANT} ${CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER} {
                    right: 100%;
                    margin-right: var(--${APPID}-icon-margin);
                }
                /* Position User avatar (inside user-query) to the RIGHT */
                ${CONSTANTS.SELECTORS.AVATAR_USER} ${CONSTANTS.SELECTORS.SIDE_AVATAR_CONTAINER} {
                    left: 100%;
                    margin-left: var(--${APPID}-icon-margin);
                }
                ${CONSTANTS.SELECTORS.SIDE_AVATAR_ICON} {
                    width: var(--${APPID}-icon-size);
                    height: var(--${APPID}-icon-size);
                    border-radius: 50%;
                    display: block;
                    box-shadow: 0 0 6px rgb(0 0 0 / 0.2);
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
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
            `
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
         */
        constructor(configManager) {
            this.configManager = configManager;
            this.lastThemeData = null;
            this.debouncedRecalculateStandingImagesLayout = debounce(this.recalculateStandingImagesLayout.bind(this), CONSTANTS.RETRY.STANDING_IMAGES_INTERVAL);
            EventBus.subscribe(`${APPID}:layoutRecalculate`, this.debouncedRecalculateStandingImagesLayout);
        }

        /**
         * Initializes the manager by injecting styles and subscribing to events.
         */
        init() {
            this.createContainers();
            this.injectStyles();
            EventBus.subscribe(`${APPID}:themeApplied`, (data) => {
                this.lastThemeData = data;
                this.updateVisibility();
            });
            EventBus.subscribe(`${APPID}:visibilityRecheck`, () => this.updateVisibility());
        }

        injectStyles() {
            const styleId = `${APPID}-standing-image-style`;
            if (document.getElementById(styleId)) return;

            document.head.appendChild(h('style', {
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
                    transition: opacity 0.3s;
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
            `
            }));
        }

        createContainers() {
            if (document.getElementById(`${APPID}-standing-image-assistant`)) return;
            ['user', 'assistant'].forEach(actor => {
                document.body.appendChild(h(`div`, { id: `${APPID}-standing-image-${actor}` }));
            });
        }

        /**
         * @private
         */
        _isChatActive() {
            return !!document.querySelector('[data-test-id="conversation"].selected');
        }

        updateVisibility() {
            if (!this.lastThemeData) return;
            const { theme, config } = this.lastThemeData;

            const isActiveChat = this._isChatActive();
            const hasMessages = !!document.querySelector(CONSTANTS.SELECTORS.USER_MESSAGE);
            const shouldShowActors = isActiveChat && hasMessages;

            ['user', 'assistant'].forEach(actor => {
                const container = document.getElementById(`${APPID}-standing-image-${actor}`);
                if (!container) return;

                const hasStandingImage = getPropertyByPath(theme, `${actor}.standingImageUrl`) ?? getPropertyByPath(config, `defaultSet.${actor}.standingImageUrl`);

                container.style.opacity = (shouldShowActors && hasStandingImage) ? '1' : '0';
            });
            this.debouncedRecalculateStandingImagesLayout();
        }

        /**
         * Recalculates the layout for the standing images.
         */
        async recalculateStandingImagesLayout() {
            const rootStyle = document.documentElement.style;
            const chatArea = document.querySelector(CONSTANTS.SELECTORS.MAIN_APP_CONTAINER);
            const messageArea = document.querySelector(CONSTANTS.SELECTORS.CONVERSATION_CONTAINER);

            if (!chatArea || !messageArea) {
                rootStyle.setProperty(`--${APPID}-standing-image-assistant-width`, '0px');
                rootStyle.setProperty(`--${APPID}-standing-image-user-width`, '0px');
                return;
            }

            const chatRect = chatArea.getBoundingClientRect();
            const messageRect = messageArea.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            const config = this.configManager.get();
            const iconSize = this.configManager.getIconSize();
            const respectAvatarSpace = config.options.respect_avatar_space;
            const avatarGap = respectAvatarSpace ? (iconSize + (CONSTANTS.ICON_MARGIN * 2)) : 0;

            const assistantWidth = Math.max(0, (messageRect.left - chatRect.left) - avatarGap);
            const userWidth = Math.max(0, (chatRect.right - messageRect.right) - avatarGap);

            rootStyle.setProperty(`--${APPID}-standing-image-assistant-left`, `${chatRect.left}px`);
            rootStyle.setProperty(`--${APPID}-standing-image-assistant-width`, `${assistantWidth}px`);
            rootStyle.setProperty(`--${APPID}-standing-image-user-width`, `${userWidth}px`);

            // Masking
            const maskValue = `linear-gradient(to bottom, transparent 0px, rgb(0 0 0 / 1) 60px, rgb(0 0 0 / 1) 100%)`;
            const assistantImg = document.getElementById(`${APPID}-standing-image-assistant`);
            if (assistantImg && assistantImg.offsetHeight >= (windowHeight - 32)) {
                rootStyle.setProperty(`--${APPID}-standing-image-assistant-mask`, maskValue);
            } else {
                rootStyle.setProperty(`--${APPID}-standing-image-assistant-mask`, 'none');
            }
            const userImg = document.getElementById(`${APPID}-standing-image-user`);
            if (userImg && userImg.offsetHeight >= (windowHeight - 32)) {
                rootStyle.setProperty(`--${APPID}-standing-image-user-mask`, maskValue);
            } else {
                rootStyle.setProperty(`--${APPID}-standing-image-user-mask`, 'none');
            }
        }
    }

    // =================================================================================
    // SECTION: Bubble Feature Management (Base and Implementations)
    // =================================================================================

    /**
     * @abstract
     * @description Base class for features that add UI elements to chat bubbles.
     * Handles the common logic of style injection, element processing, and updates.
     */
    class BubbleFeatureManagerBase {
        /**
         * @param {ConfigManager} configManager
         */
        constructor(configManager, messageCacheManager) {
            this.configManager = configManager;
            this.messageCacheManager = messageCacheManager;
            this.navContainers = new Map();
        }

        /**
         * Initializes the feature by injecting its styles and subscribing to relevant events.
         */
        init() {
            this.injectStyle();
            EventBus.subscribe(`${APPID}:messageComplete`, (elem) => this.processElement(elem));
            EventBus.subscribe(`${APPID}:turnComplete`, (turnNode) => this.processTurn(turnNode));
        }

        /**
         * Injects the feature's specific CSS into the document head if not already present.
         * @private
         */
        injectStyle() {
            const styleId = this.getStyleId();
            if (document.getElementById(styleId)) return;
            const style = h('style', {
                id: styleId,
                textContent: this.generateCss()
            });
            document.head.appendChild(style);
        }

        /**
         * Updates all feature elements on the page according to the current configuration.
         */
        updateAll() {
            const allMessageElements = this.messageCacheManager.getTotalMessages();
            allMessageElements.forEach(elem => this.processElement(elem));

            const turnContainerSelector = CONSTANTS.SELECTORS.BUBBLE_FEATURE_TURN_CONTAINERS;
            if (turnContainerSelector) {
                const allTurnNodes = document.querySelectorAll(turnContainerSelector);
                allTurnNodes.forEach(turn => this.processTurn(turn));
            }
        }

        _getOrCreateNavContainer(messageElement) {
            if (this.navContainers.has(messageElement)) {
                return this.navContainers.get(messageElement);
            }

            const positioningParent = PlatformAdapter.getNavPositioningParent(messageElement);
            if (!positioningParent) return null;

            // Check the DOM for an existing container before creating a new one
            let container = positioningParent.querySelector(`.${APPID}-bubble-nav-container`);
            if (container) {
                this.navContainers.set(messageElement, container);
                return container;
            }

            positioningParent.style.position = 'relative';
            positioningParent.classList.add(`${APPID}-bubble-parent-with-nav`);

            container = h(`div.${APPID}-bubble-nav-container`, [
                h(`div.${APPID}-nav-buttons`)
            ]);

            positioningParent.appendChild(container);
            this.navContainers.set(messageElement, container);
            return container;
        }

        // --- Abstract methods to be implemented by subclasses ---

        /**
         * Processes a single message element, setting up, updating, or cleaning up the feature.
         * @param {HTMLElement} messageElement
         */
        processElement(messageElement) {
            // To be implemented by subclasses if they operate on a per-message basis.
        }

        /**
         * Processes a conversation turn element, typically for features that depend on the turn context.
         * @param {HTMLElement} turnNode
         */
        processTurn(turnNode) {
            // To be implemented by subclasses if they operate on a per-turn basis.
        }

        /** @returns {string} The unique ID for the style element. */
        getStyleId() {
            throw new Error('Subclass must implement getStyleId()');
        }

        /** @returns {string} The CSS string for the feature. */
        generateCss() {
            throw new Error('Subclass must implement generateCss()');
        }
    }

    class CollapsibleBubbleManager extends BubbleFeatureManagerBase {
        constructor(configManager, messageCacheManager) {
            super(configManager, messageCacheManager);
        }

        getStyleId() {
            return `${APPID}-collapsible-bubble-style`;
        }

        generateCss() {
            return SITE_STYLES.COLLAPSIBLE_CSS;
        }

        /**
         * @override
         */
        processElement(messageElement) {
            // This feature only applies to assistant messages in Gemini,
            // as user messages have a native collapse button.
            if (messageElement.tagName.toLowerCase() !== CONSTANTS.SELECTORS.ASSISTANT_MESSAGE) {
                return;
            }

            const featureEnabled = this.configManager.get()?.features.collapsible_button.enabled;
            if (featureEnabled) {
                this.setupFeature(messageElement);
            } else {
                this.cleanupFeature(messageElement);
            }
        }

        /**
         * Sets up the collapsible feature on a message element.
         * @param {HTMLElement} messageElement
         */
        setupFeature(messageElement) {
            if (messageElement.classList.contains(`${APPID}-collapsible-processed`)) {
                // Ensure button is visible if feature was re-enabled
                const toggleBtn = messageElement.querySelector(`.${APPID}-collapsible-toggle-btn`);
                if (toggleBtn) toggleBtn.classList.remove(`${APPID}-hidden`);
            } else {
                messageElement.classList.add(`${APPID}-collapsible-processed`, `${APPID}-collapsible`);
                const toggleBtn = h(`button.${APPID}-collapsible-toggle-btn`, {
                    type: 'button',
                    title: 'Toggle message',
                    onclick: (e) => {
                        e.stopPropagation();
                        messageElement.classList.toggle(`${APPID}-bubble-collapsed`);
                    }
                }, [
                    h('svg', {
                        xmlns: 'http://www.w3.org/2000/svg',
                        height: '24px',
                        viewBox: '0 -960 960 960',
                        width: '24px',
                        fill: 'currentColor'
                    }, [
                        h('path', { d: 'M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z' })
                    ])
                ]);
                messageElement.appendChild(toggleBtn);
            }

            // Add the generic content class to the bubble itself for unified styling
            const bubble = messageElement.querySelector(CONSTANTS.SELECTORS.RAW_USER_BUBBLE) || messageElement.querySelector(CONSTANTS.SELECTORS.RAW_ASSISTANT_BUBBLE);
            if (bubble && !bubble.classList.contains(`${APPID}-collapsible-content`)) {
                bubble.classList.add(`${APPID}-collapsible-content`);
            }
        }

        /**
         * Cleans up the feature from a message element.
         * @param {HTMLElement} messageElement
         */
        cleanupFeature(messageElement) {
            if (messageElement.classList.contains(`${APPID}-collapsible-processed`)) {
                const toggleBtn = messageElement.querySelector(`.${APPID}-collapsible-toggle-btn`);
                if (toggleBtn) {
                    toggleBtn.classList.add(`${APPID}-hidden`);
                }
                // Ensure message is expanded when feature is disabled
                messageElement.classList.remove(`${APPID}-bubble-collapsed`);
            }
        }
    }

    class ScrollToTopManager extends BubbleFeatureManagerBase {
        constructor(configManager, messageCacheManager) {
            super(configManager, messageCacheManager);
        }

        /** @override */
        init() {
            super.init();
            EventBus.subscribe(`${APPID}:navigation`, () => this.navContainers.clear());
        }

        /** @override */
        getStyleId() {
            return `${APPID}-bubble-nav-style`;
        }

        /** @override */
        generateCss() {
            return SITE_STYLES.BUBBLE_NAV_CSS;
        }

        /**
         * @override
         */
        updateAll() {
            const allTurnNodes = document.querySelectorAll(CONSTANTS.SELECTORS.CONVERSATION_CONTAINER);
            allTurnNodes.forEach(turn => this.processTurn(turn));
        }

        /**
         * @override
         * Processes a conversation turn for the scroll-to-top button.
         * @param {HTMLElement} turnNode
         */
        processTurn(turnNode) {
            const config = this.configManager.get();
            if (!config) return;

            const topNavEnabled = config.features.scroll_to_top_button.enabled;

            turnNode.querySelectorAll(CONSTANTS.SELECTORS.BUBBLE_FEATURE_MESSAGE_CONTAINERS).forEach(messageElement => {
                if (topNavEnabled) {
                    this.setupScrollToTopButton(messageElement);
                    const bottomGroup = messageElement.querySelector(`.${APPID}-nav-group-bottom`);
                    if (bottomGroup) {
                        bottomGroup.classList.remove(`${APPID}-hidden`);
                    }
                } else {
                    const bottomGroup = messageElement.querySelector(`.${APPID}-nav-group-bottom`);
                    if (bottomGroup) {
                        bottomGroup.classList.add(`${APPID}-hidden`);
                    }
                }
            });
        }

        setupScrollToTopButton(messageElement) {
            const container = this._getOrCreateNavContainer(messageElement);
            if (!container || container.querySelector(`.${APPID}-nav-group-bottom`)) return;

            const buttonsWrapper = container.querySelector(`.${APPID}-nav-buttons`);

            const turnSelector = CONSTANTS.SELECTORS.BUBBLE_FEATURE_TURN_CONTAINERS;
            const scrollTarget = turnSelector ?
                  messageElement.closest(turnSelector) : messageElement;
            if (!scrollTarget) return;

            const topBtn = h(`button.${APPID}-bubble-nav-btn.${APPID}-nav-top`, {
                type: 'button',
                title: 'Scroll to top of this message',
                onclick: (e) => {
                    e.stopPropagation();
                    scrollToElement(scrollTarget, { offset: CONSTANTS.RETRY.SCROLL_OFFSET_FOR_NAV });
                }
            }, [
                h('svg', { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' }, [
                    h('path', { d: 'M440-160v-480L280-480l-56-56 256-256 256 256-56 56-160-160v480h-80Zm-200-640v-80h400v80H240Z' })
                ])
            ]);
            const bottomGroup = h(`div.${APPID}-nav-group-bottom`, [topBtn]);
            buttonsWrapper.appendChild(bottomGroup);
        }
    }

    class SequentialNavManager extends BubbleFeatureManagerBase {
        constructor(configManager, messageCacheManager) {
            super(configManager, messageCacheManager);
            this.messageCacheManager = messageCacheManager;
        }

        /**
         * @override
         * Initializes the manager by injecting its styles and subscribing to events.
         * It extends the base init and adds subscriptions for its own complex state management.
         */
        init() {
            // Injects style and subscribes to message/turn completion.
            super.init();
            EventBus.subscribe(`${APPID}:cacheUpdated`, () => this.updateAllPrevNextButtons());
            EventBus.subscribe(`${APPID}:navigation`, () => this.navContainers.clear());
        }

        /** @override */
        getStyleId() {
            return `${APPID}-bubble-nav-style`;
        }

        /** @override */
        generateCss() {
            return SITE_STYLES.BUBBLE_NAV_CSS;
        }

        /**
         * @override
         * This comprehensive update method handles all logic when settings change.
         */
        updateAll() {
            // Process visibility for all sequential navigation buttons.
            const allMessageElements = document.querySelectorAll(CONSTANTS.SELECTORS.BUBBLE_FEATURE_MESSAGE_CONTAINERS);
            allMessageElements.forEach(elem => this.processElement(elem));

            // Finally, update the enabled/disabled state of any visible prev/next buttons.
            this.updateAllPrevNextButtons();
        }

        /**
         * @override
         * Processes a single message element for sequential navigation buttons.
         * @param {HTMLElement} messageElement
         */
        processElement(messageElement) {
            const config = this.configManager.get();
            if (!config) return;

            const featureEnabled = config.features.sequential_nav_buttons.enabled;
            if (featureEnabled) {
                this.setupNavigationButtons(messageElement);
            }

            const topGroup = messageElement.querySelector(`.${APPID}-nav-group-top`);
            if (topGroup) {
                topGroup.classList.toggle(`${APPID}-hidden`, !featureEnabled);
            }
        }

        setupNavigationButtons(messageElement) {
            const container = this._getOrCreateNavContainer(messageElement);
            if (!container || container.querySelector(`.${APPID}-nav-group-top`)) return;

            const buttonsWrapper = container.querySelector(`.${APPID}-nav-buttons`);

            const createClickHandler = (direction) => (e) => {
                e.stopPropagation();
                const roleInfo = this.messageCacheManager.findMessageIndex(messageElement);
                if (!roleInfo) return;

                const newIndex = roleInfo.index + direction;
                const targetMsg = this.messageCacheManager.getMessageAtIndex(roleInfo.role, newIndex);

                if (targetMsg) {
                    const turnSelector = CONSTANTS.SELECTORS.BUBBLE_FEATURE_TURN_CONTAINERS;
                    const scrollTarget = turnSelector ? targetMsg.closest(turnSelector) : targetMsg;
                    if (scrollTarget) {
                        scrollToElement(scrollTarget, { offset: CONSTANTS.RETRY.SCROLL_OFFSET_FOR_NAV });
                        EventBus.publish(`${APPID}:nav:highlightMessage`, targetMsg);
                    }
                }
            };
            const prevBtn = h(`button.${APPID}-bubble-nav-btn.${APPID}-nav-prev`, {
                type: 'button',
                title: 'Scroll to previous message',
                dataset: { originalTitle: 'Scroll to previous message' },
                onclick: createClickHandler(-1)
            }, [
                h('svg', { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' }, [
                    h('path', { d: 'M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z' })
                ])
            ]);
            const nextBtn = h(`button.${APPID}-bubble-nav-btn.${APPID}-nav-next`, {
                type: 'button',
                title: 'Scroll to next message',
                dataset: { originalTitle: 'Scroll to next message' },
                onclick: createClickHandler(1)
            }, [
                h('svg', { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' }, [
                    h('path', { d: 'M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z' })
                ])
            ]);
            const topGroup = h(`div.${APPID}-nav-group-top`, [prevBtn, nextBtn]);
            buttonsWrapper.prepend(topGroup);
        }

        updateAllPrevNextButtons() {
            const disabledHint = '(No message to scroll to)';
            const updateActorButtons = (messages) => {
                messages.forEach((message, index) => {
                    const container = this.navContainers.get(message);
                    if (!container) return;

                    const prevBtn = container.querySelector(`.${APPID}-nav-prev`);
                    if (prevBtn) {
                        const isDisabled = (index === 0);
                        prevBtn.disabled = isDisabled;
                        prevBtn.title = isDisabled ? `${prevBtn.dataset.originalTitle} ${disabledHint}` :
                        prevBtn.dataset.originalTitle;
                    }

                    const nextBtn = container.querySelector(`.${APPID}-nav-next`);
                    if (nextBtn) {
                        const isDisabled = (index === messages.length - 1);
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

    class FixedNavigationManager {
        constructor(messageCacheManager) {
            this.navConsole = null;
            this.messageCacheManager = messageCacheManager;
            this.currentIndices = { user: -1, asst: -1, total: -1 };
            this.highlightedMessage = null;
            this.unsubscribers = [];

            this.debouncedUpdateUI = debounce(this._updateUI.bind(this), 50);
            this.debouncedReposition = debounce(this.repositionContainers.bind(this), 100);

            this.handleBodyClick = this.handleBodyClick.bind(this);
        }

        async init() {
            this.injectStyle();
            this.createContainers();

            // Store the unsubscribe functions returned by EventBus.subscribe
            this.unsubscribers.push(
                EventBus.subscribe(`${APPID}:cacheUpdated`, () => this.debouncedUpdateUI()),
                EventBus.subscribe(`${APPID}:navigation`, () => this.resetState()),
                EventBus.subscribe(`${APPID}:nav:highlightMessage`, (messageElement) => this.setHighlightAndIndices(messageElement)),
                EventBus.subscribe(`${APPID}:layoutRecalculate`, () => this.debouncedReposition())
            );

            // Wait for the input area to be ready
            await waitForElement(CONSTANTS.SELECTORS.FIXED_NAV_INPUT_AREA_TARGET);
            // After the main UI is ready, trigger an initial UI update.
            this.debouncedUpdateUI();
        }

        resetState() {
            if (this.highlightedMessage) {
                this.highlightedMessage.classList.remove(`${APPID}-highlight-message`);
                this.highlightedMessage = null;
            }
            this.currentIndices = { user: -1, asst: -1, total: -1 };
            if (this.navConsole) {
                this.navConsole.querySelector(`#${APPID}-nav-group-user .${APPID}-counter-current`).textContent = '--';
                this.navConsole.querySelector(`#${APPID}-nav-group-assistant .${APPID}-counter-current`).textContent = '--';
                this.navConsole.querySelector(`#${APPID}-nav-group-total .${APPID}-counter-current`).textContent = '--';
            }
        }

        destroy() {
            if (this.highlightedMessage) {
                this.highlightedMessage.classList.remove(`${APPID}-highlight-message`);
                this.highlightedMessage = null;
            }

            // Call all unsubscribe functions
            this.unsubscribers.forEach(unsub => unsub());
            this.unsubscribers = [];

            this.navConsole?.remove();
            this.navConsole = null;
            document.body.removeEventListener('click', this.handleBodyClick);
        }

        createContainers() {
            if (document.getElementById(`${APPID}-nav-console`)) return;
            this.navConsole = h(`div#${APPID}-nav-console.${APPID}-nav-unpositioned`);
            document.body.appendChild(this.navConsole);

            this.renderInitialUI();
            this.attachEventListeners();
        }

        renderInitialUI() {
            if (!this.navConsole) return;
            const svgIcons = {
                first: () => h('svg', { viewBox: '0 -960 960 960' }, [h('path', { d: 'm280-280 200-200 200 200-56 56-144-144-144 144-56-56Zm-40-360v-80h480v80H240Z' })]),
                prev: () => h('svg', { viewBox: '0 -960 960 960' }, [h('path', { d: 'm480-528-200 200-56-56 256-256 256 256-56 56-200-200Z' })]),
                next: () => h('svg', { viewBox: '0 -960 960 960' }, [h('path', { d: 'M480-344 224-590l56-56 200 200 200-200 56 56-256 256Z' })]),
                last: () => h('svg', { viewBox: '0 -960 960 960' }, [h('path', { d: 'M240-200v-80h480v80H240Zm240-160L280-560l56-56 144 144 144-144 56 56-200 200Z' })]),
            };
            const navUI = [
                h(`div#${APPID}-nav-group-assistant.${APPID}-nav-group`, [
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'asst-prev', title: 'Previous assistant message' }, [svgIcons.prev()]),
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'asst-next', title: 'Next assistant message' }, [svgIcons.next()]),
                    h(`span.${APPID}-nav-label`, 'Assistant:'),
                    h(`span.${APPID}-nav-counter`, { 'data-role': 'asst', title: 'Click to jump to a message' }, [
                        h(`span.${APPID}-counter-current`, '--'),
                        ' / ',
                        h(`span.${APPID}-counter-total`, '--')
                    ])
                ]),
                h(`div.${APPID}-nav-separator`),
                h(`div#${APPID}-nav-group-total.${APPID}-nav-group`, [
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'total-first', title: 'First message' }, [svgIcons.first()]),
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'total-prev', title: 'Previous message' }, [svgIcons.prev()]),
                    h(`span.${APPID}-nav-label`, 'Total:'),
                    h(`span.${APPID}-nav-counter`, { 'data-role': 'total', title: 'Click to jump to a message' }, [
                        h(`span.${APPID}-counter-current`, '--'),
                        ' / ',
                        h(`span.${APPID}-counter-total`, '--')
                    ]),
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'total-next', title: 'Next message' }, [svgIcons.next()]),
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'total-last', title: 'Last message' }, [svgIcons.last()])
                ]),
                h(`div.${APPID}-nav-separator`),
                h(`div#${APPID}-nav-group-user.${APPID}-nav-group`, [
                    h(`span.${APPID}-nav-label`, 'User:'),
                    h(`span.${APPID}-nav-counter`, { 'data-role': 'user', title: 'Click to jump to a message' }, [
                        h(`span.${APPID}-counter-current`, '--'),
                        ' / ',
                        h(`span.${APPID}-counter-total`, '--')
                    ]),
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'user-prev', title: 'Previous user message' }, [svgIcons.prev()]),
                    h(`button.${APPID}-nav-btn`, { 'data-nav': 'user-next', title: 'Next user message' }, [svgIcons.next()])
                ])
            ];
            this.navConsole.textContent = '';
            navUI.forEach(el => this.navConsole.appendChild(el));
        }

        attachEventListeners() {
            document.body.addEventListener('click', this.handleBodyClick);
        }

        handleBodyClick(e) {
            const navButton = e.target.closest(`.${APPID}-nav-btn`);
            if (navButton && this.navConsole?.contains(navButton)) {
                this.handleButtonClick(navButton);
                return;
            }

            const counter = e.target.closest(`.${APPID}-nav-counter[data-role]`);
            if (counter) {
                this.handleCounterClick(e, counter);
                return;
            }

            const messageElement = e.target.closest(CONSTANTS.SELECTORS.FIXED_NAV_MESSAGE_CONTAINERS);
            if (messageElement && !e.target.closest(`a, button, input, #${APPID}-nav-console`)) {
                this.setHighlightAndIndices(messageElement);
            }
        }

        _updateUI() {
            if (!this.navConsole) return;

            const userMessages = this.messageCacheManager.getUserMessages();
            const asstMessages = this.messageCacheManager.getAssistantMessages();
            const totalMessages = this.messageCacheManager.getTotalMessages();

            // Toggle visibility based on message count
            if (totalMessages.length === 0) {
                this.navConsole.classList.add(`${APPID}-nav-hidden`);
            } else {
                this.navConsole.classList.remove(`${APPID}-nav-hidden`);
                // The first time it becomes visible, also remove the initial positioning-guard class.
                if (this.navConsole.classList.contains(`${APPID}-nav-unpositioned`)) {
                    this.navConsole.classList.remove(`${APPID}-nav-unpositioned`);
                }
            }

            this.navConsole.querySelector(`#${APPID}-nav-group-user .${APPID}-counter-total`).textContent = userMessages.length || '--';
            this.navConsole.querySelector(`#${APPID}-nav-group-assistant .${APPID}-counter-total`).textContent = asstMessages.length || '--';
            this.navConsole.querySelector(`#${APPID}-nav-group-total .${APPID}-counter-total`).textContent = totalMessages.length || '--';

            if (!this.highlightedMessage && totalMessages.length > 0) {
                this.setHighlightAndIndices(totalMessages[0]);
            }

            this.repositionContainers();
        }

        setHighlightAndIndices(targetMsg) {
            if (!targetMsg || !this.navConsole) return;
            this.highlightMessage(targetMsg);

            const userMessages = this.messageCacheManager.getUserMessages();
            const asstMessages = this.messageCacheManager.getAssistantMessages();
            const totalMessages = this.messageCacheManager.getTotalMessages();

            this.currentIndices.total = totalMessages.indexOf(targetMsg);
            const role = PlatformAdapter.getMessageRole(targetMsg);

            if (role === CONSTANTS.SELECTORS.FIXED_NAV_ROLE_USER) {
                this.currentIndices.user = userMessages.indexOf(targetMsg);
                this.currentIndices.asst = this.findNearestIndex(targetMsg, asstMessages);
            } else {
                this.currentIndices.asst = asstMessages.indexOf(targetMsg);
                this.currentIndices.user = this.findNearestIndex(targetMsg, userMessages);
            }

            this.navConsole.querySelector(`#${APPID}-nav-group-user .${APPID}-counter-current`).textContent = this.currentIndices.user > -1 ? this.currentIndices.user + 1 : '--';
            this.navConsole.querySelector(`#${APPID}-nav-group-assistant .${APPID}-counter-current`).textContent = this.currentIndices.asst > -1 ? this.currentIndices.asst + 1 : '--';
            this.navConsole.querySelector(`#${APPID}-nav-group-total .${APPID}-counter-current`).textContent = this.currentIndices.total > -1 ? this.currentIndices.total + 1 : '--';
        }

        findNearestIndex(currentMsg, messageArray) {
            const currentMsgTop = currentMsg.getBoundingClientRect().top;
            let nearestIndex = -1;
            for (let i = messageArray.length - 1; i >= 0; i--) {
                if (messageArray[i].getBoundingClientRect().top <= currentMsgTop) {
                    nearestIndex = i;
                    break;
                }
            }
            return nearestIndex;
        }

        handleButtonClick(buttonElement) {
            let targetMsg = null;
            const userMessages = this.messageCacheManager.getUserMessages();
            const asstMessages = this.messageCacheManager.getAssistantMessages();
            const totalMessages = this.messageCacheManager.getTotalMessages();

            const { user: currentUserIndex, asst: currentAsstIndex, total: currentTotalIndex } = this.currentIndices;

            switch (buttonElement.dataset.nav) {
                case 'user-prev': {
                    const userPrevIndex = currentUserIndex > -1 ? currentUserIndex : 0;
                    targetMsg = this.messageCacheManager.getMessageAtIndex('user', Math.max(0, userPrevIndex - 1));
                    break;
                }
                case 'user-next': {
                    const userNextIndex = currentUserIndex === -1 ? 0 : currentUserIndex + 1;
                    targetMsg = this.messageCacheManager.getMessageAtIndex('user', Math.min(userMessages.length - 1, userNextIndex));
                    break;
                }
                case 'asst-prev': {
                    const asstPrevIndex = currentAsstIndex > -1 ? currentAsstIndex : 0;
                    targetMsg = this.messageCacheManager.getMessageAtIndex('asst', Math.max(0, asstPrevIndex - 1));
                    break;
                }
                case 'asst-next': {
                    const asstNextIndex = currentAsstIndex === -1 ? 0 : currentAsstIndex + 1;
                    targetMsg = this.messageCacheManager.getMessageAtIndex('asst', Math.min(asstMessages.length - 1, asstNextIndex));
                    break;
                }
                case 'total-first': {
                    targetMsg = totalMessages[0];
                    break;
                }
                case 'total-last': {
                    targetMsg = totalMessages[totalMessages.length - 1];
                    break;
                }
                case 'total-prev': {
                    const totalPrevIndex = currentTotalIndex > -1 ? currentTotalIndex : 0;
                    targetMsg = totalMessages[Math.max(0, totalPrevIndex - 1)];
                    break;
                }
                case 'total-next': {
                    const totalNextIndex = currentTotalIndex === -1 ? 0 : currentTotalIndex + 1;
                    targetMsg = totalMessages[Math.min(totalMessages.length - 1, totalNextIndex)];
                    break;
                }
            }

            this.navigateToMessage(targetMsg);
        }

        handleCounterClick(e, counterSpan) {
            const role = counterSpan.dataset.role;
            const input = h(`input.${APPID}-nav-jump-input`, { type: 'text' });
            counterSpan.classList.add('is-hidden');
            counterSpan.parentNode.insertBefore(input, counterSpan.nextSibling);
            input.focus();
            const endEdit = (shouldJump) => {
                if (shouldJump) {
                    const num = parseInt(input.value, 10);
                    if (!isNaN(num)) {
                        const roleMap = {
                            user: this.messageCacheManager.getUserMessages(),
                            asst: this.messageCacheManager.getAssistantMessages(),
                            total: this.messageCacheManager.getTotalMessages()
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
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    endEdit(true);
                } else if (ev.key === 'Escape') {
                    endEdit(false);
                }
            });
        }

        navigateToMessage(element) {
            if (!element) return;
            this.setHighlightAndIndices(element);

            const turnSelector = CONSTANTS.SELECTORS.FIXED_NAV_TURN_CONTAINER;
            const targetToScroll = (turnSelector && element.closest(turnSelector)) || element;
            scrollToElement(targetToScroll, { offset: CONSTANTS.RETRY.SCROLL_OFFSET_FOR_NAV });
        }

        highlightMessage(element) {
            if (this.highlightedMessage === element) return;
            if (this.highlightedMessage) {
                this.highlightedMessage.classList.remove(`${APPID}-highlight-message`);
            }

            if (element) {
                element.classList.add(`${APPID}-highlight-message`);
                this.highlightedMessage = element;
            } else {
                this.highlightedMessage = null;
            }
        }

        repositionContainers() {
            const inputForm = document.querySelector(CONSTANTS.SELECTORS.FIXED_NAV_INPUT_AREA_TARGET);
            if (!inputForm || !this.navConsole) return;

            const formRect = inputForm.getBoundingClientRect();
            const bottomPosition = `${window.innerHeight - formRect.top + 8}px`;
            if (this.navConsole) {
                const formCenter = formRect.left + formRect.width / 2;
                const centerWidth = this.navConsole.offsetWidth;
                this.navConsole.style.left = `${formCenter - (centerWidth / 2)}px`;
                this.navConsole.style.bottom = bottomPosition;
            }
        }

        injectStyle() {
            const styleId = `${APPID}-fixed-nav-style`;
            if (document.getElementById(styleId)) return;

            const styles = SITE_STYLES.FIXED_NAV;
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
                        background-color: ${styles.bg};
                        padding: 4px 8px;
                        border-radius: 8px;
                        border: 1px solid ${styles.border};
                        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
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
                        background-color: ${styles.separator_bg};
                    }
                    #${APPID}-nav-console .${APPID}-nav-label {
                        color: ${styles.label_text};
                        font-weight: 500;
                    }
                    #${APPID}-nav-console .${APPID}-nav-counter,
                    #${APPID}-nav-console .${APPID}-nav-jump-input {
                        box-sizing: border-box;
                        width: 85px;
                        height: 24px;
                        margin: 0;
                        background-color: ${styles.counter_bg};
                        color: ${styles.counter_text};
                        padding: 1px 4px;
                        border: 1px solid transparent;
                        border-color: ${styles.counter_border};
                        border-radius: 4px;
                        text-align: center;
                        vertical-align: middle;
                        font-family: monospace;
                        font: inherit;
                    }
                    #${APPID}-nav-console .${APPID}-nav-btn {
                        background: ${styles.btn_bg};
                        color: ${styles.btn_text};
                        border: 1px solid ${styles.btn_border};
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
                        background: ${styles.btn_hover_bg};
                    }
                    #${APPID}-nav-console .${APPID}-nav-btn svg {
                        width: 20px;
                        height: 20px;
                        fill: currentColor;
                    }
                    #${APPID}-nav-console .${APPID}-nav-btn[data-nav$="-prev"],
                    #${APPID}-nav-console .${APPID}-nav-btn[data-nav$="-next"] {
                        color: ${styles.btn_accent_text};
                    }
                    #${APPID}-nav-console .${APPID}-nav-btn[data-nav="total-first"],
                    #${APPID}-nav-console .${APPID}-nav-btn[data-nav="total-last"] {
                        color: ${styles.btn_danger_text};
                    }
                    ${CONSTANTS.SELECTORS.FIXED_NAV_HIGHLIGHT_TARGETS} {
                        outline: 2px solid ${styles.highlight_outline} !important;
                        outline-offset: -2px;
                        border-radius: ${styles.highlight_border_radius} !important;
                        box-shadow: 0 0 8px ${styles.highlight_outline} !important;
                    }
                `
            });
            document.head.appendChild(style);
        }
    }

    class BulkCollapseManager {
        constructor(configManager) {
            this.configManager = configManager;
            this.button = null;
            this.debouncedReposition = debounce(this.repositionButton.bind(this), 100);
            this.fixedNavManager = null;
        }

        /**
         * Sets the FixedNavigationManager instance.
         * @param {FixedNavigationManager | null} manager
         */
        setFixedNavManager(manager) {
            this.fixedNavManager = manager;
        }

        async init() {
            this.render();
            this.injectStyle();

            EventBus.subscribe(`${APPID}:cacheUpdateRequest`, this.updateVisibility.bind(this));
            EventBus.subscribe(`${APPID}:layoutRecalculate`, this.debouncedReposition);

            const inputArea = await waitForElement(CONSTANTS.SELECTORS.FIXED_NAV_INPUT_AREA_TARGET);
            if (inputArea && this.button) {
                this.repositionButton();
                this.updateVisibility(); // Set initial visibility
                this.button.style.visibility = 'visible';
            }
        }

        render() {
            const collapseIcon = h('svg', { className: 'icon-collapse', viewBox: '0 -960 960 960' }, [h('path', { d: 'M440-440v240h-80v-160H200v-80h240Zm160-320v160h160v80H520v-240h80Z' })]);
            const expandIcon = h('svg', { className: 'icon-expand', viewBox: '0 -960 960 960' }, [h('path', { d: 'M200-200v-240h80v160h160v80H200Zm480-320v-160H520v-80h240v240h-80Z' })]);
            this.button = h('button', {
                id: `${APPID}-bulk-collapse-btn`,
                title: 'Toggle all messages',
                dataset: { state: 'expanded' }, // Initial state
                style: { visibility: 'hidden' },
                onclick: (e) => {
                    e.stopPropagation();
                    const currentState = this.button.dataset.state;
                    const nextState = currentState === 'expanded' ? 'collapsed' : 'expanded';
                    this.button.dataset.state = nextState;
                    this._toggleAllMessages(nextState);
                }
            }, [collapseIcon, expandIcon]);
            document.body.appendChild(this.button);
        }

        injectStyle() {
            const styleId = `${APPID}-bulk-collapse-style`;
            if (document.getElementById(styleId)) return;

            const styles = SITE_STYLES.SETTINGS_BUTTON;
            const style = h('style', {
                id: styleId,
                textContent: `
                    #${APPID}-bulk-collapse-btn {
                        position: fixed;
                        width: 32px;
                        height: 32px;
                        z-index: ${CONSTANTS.Z_INDICES.SETTINGS_BUTTON};
                        background: ${styles.background};
                        border: 1px solid ${styles.borderColor};
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 6px;
                        box-sizing: border-box;
                        transition: background 0.12s;
                    }
                    #${APPID}-bulk-collapse-btn:hover {
                        background: ${styles.backgroundHover};
                    }
                    #${APPID}-bulk-collapse-btn svg {
                        width: 100%;
                        height: 100%;
                        fill: currentColor;
                    }
                    #${APPID}-bulk-collapse-btn[data-state="expanded"] .icon-expand { display: none; }
                    #${APPID}-bulk-collapse-btn[data-state="expanded"] .icon-collapse { display: block; }
                    #${APPID}-bulk-collapse-btn[data-state="collapsed"] .icon-expand { display: block; }
                    #${APPID}-bulk-collapse-btn[data-state="collapsed"] .icon-collapse { display: none; }
                `
            });
            document.head.appendChild(style);
        }

        repositionButton() {
            const inputForm = document.querySelector(CONSTANTS.SELECTORS.FIXED_NAV_INPUT_AREA_TARGET);
            if (!inputForm || !this.button) {
                if (this.button) this.button.style.display = 'none';
                return;
            }

            const formRect = inputForm.getBoundingClientRect();
            const buttonHeight = this.button.offsetHeight;

            const top = formRect.top + (formRect.height / 2) - (buttonHeight / 2);
            const left = formRect.right + 12; // 12px margin

            this.button.style.top = `${top}px`;
            this.button.style.left = `${left}px`;
        }

        updateVisibility() {
            if (!this.button) return;
            const config = this.configManager.get();
            const featureEnabled = config?.features?.collapsible_button?.enabled ?? false;
            const messagesExist = !!document.querySelector(CONSTANTS.SELECTORS.BUBBLE_FEATURE_MESSAGE_CONTAINERS);

            const shouldShow = featureEnabled && messagesExist;
            this.button.style.display = shouldShow ? 'flex' : 'none';

            if (shouldShow) {
                this.repositionButton();
            }
        }

        _toggleAllMessages(state) {
            const messages = document.querySelectorAll(`.${APPID}-collapsible`);
            const shouldCollapse = state === 'collapsed';
            const highlightedMessage = this.fixedNavManager?.highlightedMessage;

            messages.forEach(msg => {
                msg.classList.toggle(`${APPID}-bubble-collapsed`, shouldCollapse);
            });

            // After toggling, explicitly navigate to the highlighted message to ensure correct scroll position.
            if (highlightedMessage && this.fixedNavManager) {
                // Use rAF to wait for the browser to repaint with new heights before navigating.
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        this.fixedNavManager.navigateToMessage(highlightedMessage);
                    });
                });
            }
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

        /** @abstract */
        render() {
            throw new Error("Component must implement render method.");
        }

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
                isValid = CustomColorPicker.parseColorString(value);
            }

            textInput.classList.toggle('is-invalid', value !== '' && !isValid);
            const swatch = wrapper.querySelector(`.${APPID}-color-swatch`);
            if (swatch) {
                swatch.querySelector(`.${APPID}-color-swatch-value`).style.backgroundColor = (value === '' || isValid) ?
                    value : 'transparent';
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
            if (!textInput) return;

            let pickerRoot;
            const popupWrapper = h(`div.${APPID}-color-picker-popup`, [
                pickerRoot = h('div')
            ]);
            this.container.appendChild(popupWrapper);

            const picker = new CustomColorPicker(pickerRoot, {
                initialColor: textInput.value || 'rgb(128 128 128 / 1)',
                cssPrefix: `${APPID}-ccp`
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
            swatch.querySelector(`.${APPID}-color-swatch-value`).style.backgroundColor = initialColor;
            textInput.classList.remove('is-invalid');
            this._isSyncing = false;
            // Picker -> Text Input: This remains crucial for updating the text when the user drags the picker.
            picker.rootElement.addEventListener('color-change', e => {
                if (this._isSyncing) return;
                this._isSyncing = true;
                textInput.value = e.detail.color;
                swatch.querySelector(`.${APPID}-color-swatch-value`).style.backgroundColor = e.detail.color;
                textInput.classList.remove('is-invalid');
                this._isSyncing = false;
            });
        }

        _positionPicker(popupWrapper, swatchElement) {
            const dialogRect = this.container.getBoundingClientRect();
            const swatchRect = swatchElement.getBoundingClientRect();
            const pickerHeight = popupWrapper.offsetHeight;
            const pickerWidth = popupWrapper.offsetWidth;
            const margin = 4;
            let top = swatchRect.bottom - dialogRect.top + margin;
            let left = swatchRect.left - dialogRect.left;
            if (swatchRect.bottom + pickerHeight + margin > dialogRect.bottom) {
                top = (swatchRect.top - dialogRect.top) - pickerHeight - margin;
            }
            if (swatchRect.left + pickerWidth > dialogRect.right) {
                left = (swatchRect.right - dialogRect.left) - pickerWidth;
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
         * @param {HTMLElement} rootElement The DOM element to render the picker into.
         * @param {object} [options]
         * @param {string} [options.initialColor='rgb(255 0 0 / 1)'] The initial color to display.
         * @param {string} [options.cssPrefix='ccp'] A prefix for all CSS classes to avoid conflicts.
         */
        constructor(rootElement, options = {}) {
            this.rootElement = rootElement;
            this.options = {
                initialColor: 'rgb(255 0 0 / 1)',
                cssPrefix: 'ccp',
                ...options
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
            const f = (h / 60) - i, p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
            switch (i % 6) {
                case 0: { r = v; g = t; b = p; break; }
                case 1: { r = q; g = v; b = p; break; }
                case 2: { r = p; g = v; b = t; break; }
                case 3: { r = p; g = q; b = v; break; }
                case 4: { r = t; g = p; b = v; break; }
                case 5: { r = v; g = p; b = q; break; }
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
            g /= 255; b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s, v = max;
            const d = max - min;
            s = max === 0 ? 0 : d / max;
            if (max === min) { h = 0; }
            else {
                switch (max) {
                    case r: { h = (g - b) / d + (g < b ? 6 : 0); break; }
                    case g: { h = (b - r) / d + 2; break; }
                    case b: { h = (r - g) / d + 4; break; }
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
         * @param {number} [a=1] - Alpha (0-1)
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
                    a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1
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
                svPlane = h(`div.${p}-sv-plane`, {
                    role: 'slider',
                    tabIndex: 0,
                    'aria-label': 'Saturation and Value'
                }, [
                    h(`div.${p}-gradient-white`),
                    h(`div.${p}-gradient-black`),
                    svThumb = h(`div.${p}-sv-thumb`)
                ]),
                h(`div.${p}-slider-group.${p}-hue-slider`, [
                    h(`div.${p}-slider-track.${p}-hue-track`),
                    hueSlider = h('input', {
                        type: 'range',
                        min: '0',
                        max: '360',
                        step: '1',
                        'aria-label': 'Hue'
                    })
                ]),
                h(`div.${p}-slider-group.${p}-alpha-slider`, [
                    h(`div.${p}-alpha-checkerboard`),
                    alphaTrack = h(`div.${p}-slider-track`),
                    alphaSlider = h('input', {
                        type: 'range',
                        min: '0',
                        max: '1',
                        step: '0.01',
                        'aria-label': 'Alpha'
                    })
                ])
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
                    case 'ArrowLeft': { this.state.s = Math.max(0, this.state.s - sStep); break; }
                    case 'ArrowRight': { this.state.s = Math.min(100, this.state.s + sStep); break; }
                    case 'ArrowUp': { this.state.v = Math.min(100, this.state.v + vStep); break; }
                    case 'ArrowDown': { this.state.v = Math.max(0, this.state.v - vStep); break; }
                }
                this._requestUpdate();
            });
            hueSlider.addEventListener('input', () => { this.state.h = parseInt(hueSlider.value, 10); this._requestUpdate(); });
            alphaSlider.addEventListener('input', () => { this.state.a = parseFloat(alphaSlider.value); this._requestUpdate(); });
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
                this.rootElement.dispatchEvent(new CustomEvent('color-change', {
                    detail: {
                        color: this.getColor()
                    },
                    bubbles: true
                }));
            }
        }
    }

    /**
     * @class CustomModal
     * @description A reusable, promise-based modal component. It provides a flexible
     * structure with header, content, and footer sections, and manages its own
     * lifecycle and styles.
     */
    class CustomModal {
        /**
         * @param {object} [options]
         * @param {string} [options.title=''] - The title displayed in the modal header.
         * @param {string} [options.width='500px'] - The width of the modal.
         * @param {string} [options.cssPrefix='cm'] - A prefix for all CSS classes.
         * @param {boolean} [options.closeOnBackdropClick=true] - Whether to close the modal when clicking the backdrop.
         * @param {Array<object>} [options.buttons=[]] - An array of button definitions for the footer.
         * @param {function(): void} [options.onDestroy] - A callback function executed when the modal is destroyed.
         * @param {{text: string, id: string, className: string, onClick: function(modalInstance, event): void}} options.buttons[]
         */
        constructor(options = {}) {
            this.options = {
                title: '',
                width: '500px',
                cssPrefix: 'cm',
                closeOnBackdropClick: true,
                buttons: [],
                onDestroy: null,
                ...options
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
                    background: var(--${p}-bg, #fff);
                    color: var(--${p}-text, #000);
                    border: 1px solid var(--${p}-border-color, #888);
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
                    border-bottom: 1px solid var(--${p}-border-color, #888);
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
                    border-top: 1px solid var(--${p}-border-color, #888);
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
                    background: var(--${p}-btn-bg, #efefef);
                    color: var(--${p}-btn-text, #000);
                    border: 1px solid var(--${p}-btn-border-color, #ccc);
                    border-radius: 5px;
                    padding: 5px 16px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: background 0.12s;
                }
                .${p}-button:hover {
                    background: var(--${p}-btn-hover-bg, #e0e0e0);
                }
            `;
            document.head.appendChild(style);
        }

        _createModalElement() {
            const p = this.options.cssPrefix;
            // Define variables to hold references to key elements.
            let header, content, footer, modalBox, footerMessage;
            // Create footer buttons declaratively using map and h().
            const buttons = this.options.buttons.map(btnDef => {
                const fullClassName = [`${p}-button`, btnDef.className].filter(Boolean).join(' ');
                return h('button', {
                    id: btnDef.id,
                    className: fullClassName,
                    onclick: (e) => btnDef.onClick(this, e)
                }, btnDef.text);
            });

            const buttonGroup = h(`div.${p}-button-group`, buttons);

            // Create the entire modal structure using h().
            this.element = h(`dialog.${p}-dialog`,
                             modalBox = h(`div.${p}-box`, { style: { width: this.options.width } }, [
                header = h(`div.${p}-header`, this.options.title),
                content = h(`div.${p}-content`),
                footer = h(`div.${p}-footer`, [
                    footerMessage = h(`div.${p}-footer-message`),
                    buttonGroup
                ])
            ])
                            );
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
                    let top = btnRect.bottom + 4;

                    if (left + modalWidth > window.innerWidth - margin) {
                        left = window.innerWidth - modalWidth - margin;
                    }

                    Object.assign(this.element.style, {
                        position: 'absolute',
                        left: `${Math.max(left, margin)}px`,
                        top: `${Math.max(top, margin)}px`,
                        margin: '0',
                        transform: 'none'
                    });
                } else {
                    // DEFAULT CENTERING
                    Object.assign(this.element.style, {
                        position: 'fixed',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        margin: '0'
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

        setContent(element) {
            this.dom.content.textContent = '';
            this.dom.content.appendChild(element);
        }

        setHeader(element) {
            this.dom.header.textContent = '';
            this.dom.header.appendChild(element);
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
         * @param {function} callbacks.onClick - Called when the button is clicked.
         * @param {object} options - Configuration for the button's appearance and behavior.
         * @param {string} options.id - The DOM ID for the button element.
         * @param {string} options.textContent - The text or emoji to display inside the button.
         * @param {string} options.title - The tooltip text for the button.
         * @param {number|string} options.zIndex - The z-index for the button.
         * @param {{top?: string, right?: string, bottom?: string, left?: string}} options.position - The fixed position of the button.
         * @param {{background: string, borderColor: string, backgroundHover: string, borderColorHover: string}} options.siteStyles - CSS variables for theming.
         */
        constructor(callbacks, options) {
            super(callbacks);
            this.options = options;
            this.id = this.options.id;
            this.styleId = `${this.id}-style`;
        }

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
                }
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
            `
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
            this.debouncedSave = debounce(async () => {
                const newConfig = await this._collectDataFromForm();
                this.callbacks.onSave?.(newConfig);
            }, 300);
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
            await this.populateForm();
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
        _createPanelContent() { throw new Error("Subclass must implement _createPanelContent()"); }
        _injectStyles() { throw new Error("Subclass must implement _injectStyles()"); }
        populateForm() { throw new Error("Subclass must implement populateForm()"); }
        _collectDataFromForm() { throw new Error("Subclass must implement _collectDataFromForm()"); }
        _setupEventListeners() { throw new Error("Subclass must implement _setupEventListeners()"); }
    }

    /**
     * Manages the settings panel/submenu.
     */
    class SettingsPanelComponent extends SettingsPanelBase {
        constructor(callbacks) {
            super(callbacks);
            this.activeThemeSet = null;
        }

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
            const widthConfig = CONSTANTS.SLIDER_CONFIGS.CHAT_WIDTH;
            const createToggle = (id) => {
                return h(`label.${APPID}-toggle-switch`, [
                    h('input', { type: 'checkbox', id: id }),
                    h(`span.${APPID}-toggle-slider`)
                ]);
            };

            return h('div', [ // Return a fragment or a wrapper div
                h(`fieldset.${APPID}-submenu-fieldset`, [
                    h('legend', 'Applied Theme'),
                    h(`button#${APPID}-applied-theme-name.${APPID}-modal-button`, {
                        title: 'Click to edit this theme',
                        style: { width: '100%' },
                        onclick: () => {
                            if (this.activeThemeSet) {
                                const themeKey = this.activeThemeSet.metadata?.id || 'defaultSet';
                                this.callbacks.onShowThemeModal?.(themeKey);
                                this.hide();
                            }
                        }
                    }, 'Loading...')
                ]),
                h(`div.${APPID}-submenu-top-row`, [
                    h(`fieldset.${APPID}-submenu-fieldset`, [
                        h('legend', 'Themes'),
                        h(`button#${APPID}-submenu-edit-themes-btn.${APPID}-modal-button`, {
                            style: { width: '100%' },
                            title: 'Open the theme editor to create and modify themes.'
                        }, 'Edit Themes...')
                    ]),
                    h(`fieldset.${APPID}-submenu-fieldset`, [
                        h('legend', 'JSON'),
                        h(`button#${APPID}-submenu-json-btn.${APPID}-modal-button`, {
                            style: { width: '100%' },
                            title: 'Opens the advanced settings modal to directly edit, import, or export the entire configuration in JSON format.'
                        }, 'JSON...')
                    ])
                ]),
                h(`fieldset.${APPID}-submenu-fieldset`, [
                    h('legend', 'Options'),
                    h(`div.${APPID}-submenu-row.${APPID}-submenu-row-stacked`, [
                        h('label', { htmlFor: `${APPID}-opt-icon-size-slider`, title: 'Specifies the size of the chat icons in pixels.' }, 'Icon size:'),
                        h(`div.${APPID}-slider-container`, [
                            h(`input#${APPID}-opt-icon-size-slider`, { type: 'range', min: '0', max: CONSTANTS.ICON_SIZE_VALUES.length - 1, step: '1' }),
                            h(`span#${APPID}-opt-icon-size-display.${APPID}-slider-display`)
                        ])
                    ]),
                    h(`div.${APPID}-submenu-row.${APPID}-submenu-row-stacked`, [
                        h('label', {
                            htmlFor: `${APPID}-opt-chat-max-width-slider`,
                            title: `Adjusts the maximum width of the chat content.\nMove slider to the far left for default.\nRange: ${widthConfig.NULL_THRESHOLD}vw to ${widthConfig.MAX}vw.`
                        }, 'Chat content max width:'),
                        h(`div.${APPID}-slider-container`, [
                            h(`input#${APPID}-opt-chat-max-width-slider`, { type: 'range', min: widthConfig.MIN, max: widthConfig.MAX, step: '1' }),
                            h(`span#${APPID}-opt-chat-max-width-display.${APPID}-slider-display`)
                        ])
                    ]),
                    h(`div.${APPID}-submenu-separator`),
                    h(`div.${APPID}-submenu-row`, [
                        h('label', {
                            htmlFor: `${APPID}-opt-respect-avatar-space`,
                            title: 'When enabled, adjusts the standing image area to not overlap the avatar icon.\nWhen disabled, the standing image is maximized but may overlap the icon.'
                        }, 'Prevent image/avatar overlap:'),
                        createToggle(`${APPID}-opt-respect-avatar-space`)
                    ])
                ]),
                h(`fieldset.${APPID}-submenu-fieldset`, [
                    h('legend', 'Features'),
                    h(`div.${APPID}-feature-group`, [
                        h(`div.${APPID}-submenu-row`, [
                            h('label', { htmlFor: `${APPID}-feat-collapsible-enabled`, title: 'Enables a button to collapse large message bubbles.' }, 'Collapsible button'),
                            createToggle(`${APPID}-feat-collapsible-enabled`)
                        ])
                    ]),
                    h(`div.${APPID}-feature-group`, [
                        h(`div.${APPID}-submenu-row`, [
                            h('label', { htmlFor: `${APPID}-feat-scroll-top-enabled`, title: 'Enables a button to scroll to the top of a message.' }, 'Scroll to top button'),
                            createToggle(`${APPID}-feat-scroll-top-enabled`)
                        ])
                    ]),
                    h(`div.${APPID}-feature-group`, [
                        h(`div.${APPID}-submenu-row`, [
                            h('label', { htmlFor: `${APPID}-feat-seq-nav-enabled`, title: 'Enables buttons to jump to the previous/next message.' }, 'Sequential nav buttons'),
                            createToggle(`${APPID}-feat-seq-nav-enabled`)
                        ])
                    ]),
                    h(`div.${APPID}-feature-group`, [
                        h(`div.${APPID}-submenu-row`, [
                            h('label', { htmlFor: `${APPID}-feat-fixed-nav-enabled`, title: 'When enabled, a navigation console with message counters will be displayed next to the text input area.' }, 'Navigation console'),
                            createToggle(`${APPID}-feat-fixed-nav-enabled`)
                        ])
                    ])
                ])
            ]);
        }

        async populateForm() {
            const config = await this.callbacks.getCurrentConfig();
            if (!config) return;

            // Options
            this.element.querySelector(`#${APPID}-opt-icon-size-slider`).value = CONSTANTS.ICON_SIZE_VALUES.indexOf(config.options.icon_size || CONSTANTS.ICON_SIZE);
            this.element.querySelector(`#${APPID}-opt-respect-avatar-space`).checked = config.options.respect_avatar_space;

            const widthValueRaw = config.options.chat_content_max_width;
            const widthConfig = CONSTANTS.SLIDER_CONFIGS.CHAT_WIDTH;
            const widthSlider = this.element.querySelector(`#${APPID}-opt-chat-max-width-slider`);
            if (widthValueRaw === null) {
                widthSlider.value = widthConfig.MIN;
            } else {
                widthSlider.value = parseInt(widthValueRaw, 10);
            }
            this._updateSliderDisplays();
            // Features
            const features = config.features;
            this.element.querySelector(`#${APPID}-feat-collapsible-enabled`).checked = features.collapsible_button.enabled;
            this.element.querySelector(`#${APPID}-feat-scroll-top-enabled`).checked = features.scroll_to_top_button.enabled;
            this.element.querySelector(`#${APPID}-feat-seq-nav-enabled`).checked = features.sequential_nav_buttons.enabled;
            this.element.querySelector(`#${APPID}-feat-fixed-nav-enabled`).checked = features.fixed_nav_console.enabled;
        }

        _updateSliderDisplays() {
            const iconSizeSlider = this.element.querySelector(`#${APPID}-opt-icon-size-slider`);
            const iconSizeDisplay = this.element.querySelector(`#${APPID}-opt-icon-size-display`);
            iconSizeDisplay.textContent = `${CONSTANTS.ICON_SIZE_VALUES[iconSizeSlider.value]}px`;

            const widthSlider = this.element.querySelector(`#${APPID}-opt-chat-max-width-slider`);
            const widthDisplay = this.element.querySelector(`#${APPID}-opt-chat-max-width-display`);
            const sliderContainer = widthSlider.parentElement;
            const widthConfig = CONSTANTS.SLIDER_CONFIGS.CHAT_WIDTH;
            const sliderValue = parseInt(widthSlider.value, 10);
            if (sliderValue < widthConfig.NULL_THRESHOLD) {
                widthDisplay.textContent = '(default)';
                sliderContainer.classList.add('is-default');
            } else {
                widthDisplay.textContent = `${sliderValue}vw`;
                sliderContainer.classList.remove('is-default');
            }
        }

        async _collectDataFromForm() {
            const currentConfig = await this.callbacks.getCurrentConfig();
            const newConfig = JSON.parse(JSON.stringify(currentConfig));

            // Options
            const iconSizeIndex = parseInt(this.element.querySelector(`#${APPID}-opt-icon-size-slider`).value, 10);
            newConfig.options.icon_size = CONSTANTS.ICON_SIZE_VALUES[iconSizeIndex] || CONSTANTS.ICON_SIZE;

            const widthSlider = this.element.querySelector(`#${APPID}-opt-chat-max-width-slider`);
            const sliderValue = parseInt(widthSlider.value, 10);
            const widthConfig = CONSTANTS.SLIDER_CONFIGS.CHAT_WIDTH;
            if (sliderValue < widthConfig.NULL_THRESHOLD) {
                newConfig.options.chat_content_max_width = null;
            } else {
                newConfig.options.chat_content_max_width = `${sliderValue}vw`;
            }
            newConfig.options.respect_avatar_space = this.element.querySelector(`#${APPID}-opt-respect-avatar-space`).checked;
            // Features
            newConfig.features.collapsible_button.enabled = this.element.querySelector(`#${APPID}-feat-collapsible-enabled`).checked;
            newConfig.features.scroll_to_top_button.enabled = this.element.querySelector(`#${APPID}-feat-scroll-top-enabled`).checked;
            newConfig.features.sequential_nav_buttons.enabled = this.element.querySelector(`#${APPID}-feat-seq-nav-enabled`).checked;
            newConfig.features.fixed_nav_console.enabled = this.element.querySelector(`#${APPID}-feat-fixed-nav-enabled`).checked;

            return newConfig;
        }

        _setupEventListeners() {
            // Modal Buttons
            this.element.querySelector(`#${APPID}-submenu-json-btn`).addEventListener('click', () => {
                this.callbacks.onShowJsonModal?.();
                this.hide();
            });
            this.element.querySelector(`#${APPID}-submenu-edit-themes-btn`).addEventListener('click', () => {
                this.callbacks.onShowThemeModal?.();
                this.hide();
            });
            // Sliders & Toggles
            this.element.querySelector(`#${APPID}-opt-icon-size-slider`).addEventListener('input', () => {
                this._updateSliderDisplays();
                this.debouncedSave();
            });
            this.element.querySelector(`#${APPID}-opt-chat-max-width-slider`).addEventListener('input', () => {
                this._updateSliderDisplays();
                const sliderValue = parseInt(this.element.querySelector(`#${APPID}-opt-chat-max-width-slider`).value, 10);
                const widthConfig = CONSTANTS.SLIDER_CONFIGS.CHAT_WIDTH;
                const newWidthValue = sliderValue < widthConfig.NULL_THRESHOLD ? null : `${sliderValue}vw`;
                EventBus.publish(`${APPID}:widthPreview`, newWidthValue);
                this.debouncedSave();
            });
            this.element.querySelector(`#${APPID}-opt-respect-avatar-space`).addEventListener('change', this.debouncedSave);
            this.element.querySelector(`#${APPID}-feat-collapsible-enabled`).addEventListener('change', this.debouncedSave);
            this.element.querySelector(`#${APPID}-feat-scroll-top-enabled`).addEventListener('change', this.debouncedSave);
            this.element.querySelector(`#${APPID}-feat-seq-nav-enabled`).addEventListener('change', this.debouncedSave);
            this.element.querySelector(`#${APPID}-feat-fixed-nav-enabled`).addEventListener('change', this.debouncedSave);
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
            `
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

        render() {
            // This method is now obsolete as the modal is created on demand in open().
            return;
        }

        async open(anchorElement) {
            if (this.modal) return;
            this.callbacks.onModalOpenStateChange?.(true);

            const p = APPID;
            this.modal = new CustomModal({
                title: `${APPNAME} Settings`,
                width: `${CONSTANTS.MODAL.WIDTH}px`,
                cssPrefix: `${p}-modal-shell`,
                buttons: [
                    { text: 'Export', id: `${p}-json-modal-export-btn`, onClick: () => this._handleExport() },
                    { text: 'Import', id: `${p}-json-modal-import-btn`, onClick: () => this._handleImport() },
                    { text: 'Save', id: `${p}-json-modal-save-btn`, onClick: () => this._handleSave() },
                    { text: 'Cancel', id: `${p}-json-modal-cancel-btn`, onClick: () => this.close() },
                ],
                onDestroy: () => {
                    this.callbacks.onModalOpenStateChange?.(false);
                    this.modal = null;
                }
            });
            // Apply App specific theme to the generic modal
            this._applyTheme();
            const contentContainer = this.modal.getContentContainer();
            this._createContent(contentContainer);

            this.callbacks.onModalOpen?.(); // Notify UIManager to check for warnings

            const config = await this.callbacks.getCurrentConfig();
            const textarea = contentContainer.querySelector('textarea');
            textarea.value = JSON.stringify(config, null, 2);

            this.modal.show(anchorElement);
            // Set focus and move cursor to the start of the textarea.
            textarea.focus();
            textarea.scrollTop = 0;
            textarea.selectionStart = 0;
            textarea.selectionEnd = 0;
        }

        close() {
            if (this.modal) {
                this.modal.close();
            }
        }

        _applyTheme() {
            this._injectStyles();
            const modalBox = this.modal.dom.modalBox;
            const p = this.modal.options.cssPrefix;
            const styles = this.callbacks.siteStyles;

            modalBox.style.setProperty(`--${p}-bg`, styles.bg);
            modalBox.style.setProperty(`--${p}-text`, styles.text);
            modalBox.style.setProperty(`--${p}-border-color`, styles.border);
            const footer = this.modal.dom.footer;
            const buttons = footer.querySelectorAll(`.${p}-button`);
            buttons.forEach(button => {
                button.classList.add(`${APPID}-modal-button`);
                button.style.background = styles.btn_bg;
                button.style.color = styles.btn_text;
                button.style.border = `1px solid ${styles.btn_border}`;
                button.addEventListener('mouseover', () => { button.style.background = styles.btn_hover_bg;});
                button.addEventListener('mouseout', () => { button.style.background = styles.btn_bg;});
            });
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
                }
            });
            const msgDiv = h(`div.${APPID}-modal-msg`, {
                style: {
                    color: styles.msg_error_text,
                    marginTop: '4px',
                    fontSize: '0.9em'
                }
            });
            parent.append(textarea, msgDiv);
        }

        async _handleSave() {
            const textarea = this.modal.getContentContainer().querySelector('textarea');
            const msgDiv = this.modal.getContentContainer().querySelector(`.${APPID}-modal-msg`);
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
            try {
                // Clear previous messages before starting.
                msgDiv.textContent = '';

                const config = await this.callbacks.getCurrentConfig();
                const jsonString = JSON.stringify(config, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = h('a', {
                    href: url,
                    download: `${APPID}_config.json`
                });
                a.click();

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
            const textarea = this.modal.getContentContainer().querySelector('textarea');
            const msgDiv = this.modal.getContentContainer().querySelector(`.${APPID}-modal-msg`);
            const fileInput = h('input', {
                type: 'file',
                accept: 'application/json',
                onchange: (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const importedConfig = JSON.parse(e.target.result);
                                textarea.value = JSON.stringify(importedConfig, null, 2);
                                msgDiv.textContent = 'Import successful. Click "Save" to apply.';
                                msgDiv.style.color = this.callbacks.siteStyles.msg_success_text;
                            } catch (err) {
                                msgDiv.textContent = `Import failed: ${err.message}`;
                                msgDiv.style.color = this.callbacks.siteStyles.msg_error_text;
                            }
                        };
                        reader.readAsText(file);
                    }
                }
            });
            fileInput.click();
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
        constructor(callbacks) {
            super(callbacks);
            this.activeThemeKey = null;
            this.colorPickerManager = null;
            this.pendingDeletionKey = null;
            this.modal = null;
            this.dataConverter = callbacks.dataConverter;
            this.debouncedUpdatePreview = debounce(() => this._updateAllPreviews(), 50);
            this.renameState = {
                type: null,
                isActive: false,
            };
        }

        render() {
            this._injectStyles();
        }

        async open(selectThemeKey) {
            this.renameState = { type: null, isActive: false };
            this.pendingDeletionKey = null;
            if (this.modal) return;
            this.callbacks.onModalOpenStateChange?.(true);
            if (!this.callbacks.getCurrentConfig) return;
            this.modal = new CustomModal({
                title: `${APPNAME} - Theme settings`,
                width: '880px',
                cssPrefix: `${APPID}-theme-modal-shell`,
                closeOnBackdropClick: false,
                buttons: [
                    { text: 'Apply', id: `${APPID}-theme-modal-apply-btn`, className: `${APPID}-modal-button`, title: 'Save changes and keep the modal open.', onClick: () => this._handleThemeAction(false) },
                    { text: 'Save', id: `${APPID}-theme-modal-save-btn`, className: `${APPID}-modal-button`, title: 'Save changes and close the modal.', onClick: () => this._handleThemeAction(true) },
                    { text: 'Cancel', id: `${APPID}-theme-modal-cancel-btn`, className: `${APPID}-modal-button`, title: 'Discard changes and close the modal.', onClick: () => this.close() },
                ],
                onDestroy: () => {
                    this.callbacks.onModalOpenStateChange?.(false);
                    this.colorPickerManager?.destroy();
                    this.colorPickerManager = null;
                    this.modal = null;
                    this._exitDeleteConfirmationMode(false);
                }
            });
            this._applyThemeToModal();
            const headerControls = this._createHeaderControls();
            const mainContent = this._createMainContent();
            this.modal.dom.header.appendChild(headerControls);
            this.modal.setContent(mainContent);

            this._setupEventListeners();
            this.colorPickerManager = new ColorPickerPopupManager(this.modal.element);
            this.colorPickerManager.init();

            this.callbacks.onModalOpen?.(); // Notify UIManager to check for warnings

            const config = await this.callbacks.getCurrentConfig();
            if (config) {
                const keyToSelect = selectThemeKey ||
                    this.activeThemeKey || 'defaultSet';
                this.activeThemeKey = keyToSelect;
                await this._refreshModalState();
            }

            this.modal.show();
            requestAnimationFrame(() => {
                const scrollableArea = this.modal.element.querySelector(`.${APPID}-theme-scrollable-area`);
                if (scrollableArea) {
                    scrollableArea.scrollTop = 0;
                }
            });
        }

        close() {
            this.modal?.close();
        }

        async _refreshModalState() {
            if (!this.modal) return;
            const config = await this.callbacks.getCurrentConfig();
            if (!config) return;

            const isAnyRenaming = this.renameState.isActive;
            const isAnyDeleting = !!this.pendingDeletionKey;

            const headerRow = this.modal.element.querySelector(`.${APPID}-header-row`);
            const generalSettingsArea = this.modal.element.querySelector(`.${APPID}-theme-general-settings`);
            const scrollArea = this.modal.element.querySelector(`.${APPID}-theme-scrollable-area`);

            const isRenamingThis = isAnyRenaming && this.renameState.type === 'theme';
            const isDeletingThis = this.pendingDeletionKey === this.activeThemeKey;

            const select = headerRow.querySelector('select');
            const renameInput = headerRow.querySelector('input[type="text"]');
            const mainActions = headerRow.querySelector(`#${APPID}-theme-main-actions`);
            const renameActions = headerRow.querySelector(`#${APPID}-theme-rename-actions`);
            const deleteConfirmGroup = headerRow.querySelector(`#${APPID}-theme-delete-confirm-group`);

            const showMainActions = !isRenamingThis && !isDeletingThis;
            select.style.display = isRenamingThis ? 'none' : 'block';
            renameInput.style.display = isRenamingThis ? 'block' : 'none';
            mainActions.style.visibility = showMainActions ? 'visible' : 'hidden';
            renameActions.style.display = isRenamingThis ? 'flex' : 'none';
            deleteConfirmGroup.style.display = isDeletingThis ? 'flex' : 'none';

            if (!isRenamingThis) {
                const scroll = select.scrollTop;
                select.textContent = '';
                const defaultOption = h('option', { value: 'defaultSet' }, 'Default Settings');
                select.appendChild(defaultOption);
                config.themeSets.forEach((theme, index) => {
                    const themeName = (typeof theme.metadata?.name === 'string' && theme.metadata.name.trim() !== '') ? theme.metadata.name : `Theme ${index + 1}`;
                    const option = h('option', { value: theme.metadata.id }, themeName);
                    select.appendChild(option);
                });
                select.value = this.activeThemeKey;
                if (!select.value) {
                    select.value = 'defaultSet';
                    this.activeThemeKey = 'defaultSet';
                }
                select.scrollTop = scroll;
            } else {
                const theme = this.activeThemeKey === 'defaultSet' ? { metadata: { name: 'Default Settings' } } : config.themeSets.find(t => t.metadata.id === this.activeThemeKey);
                renameInput.value = theme?.metadata?.name || '';
            }

            const isAnyActionInProgress = isAnyRenaming || isAnyDeleting;
            const isDefault = this.activeThemeKey === 'defaultSet';
            const index = config.themeSets.findIndex(t => t.metadata.id === this.activeThemeKey);

            headerRow.querySelector(`#${APPID}-theme-up-btn`).disabled = isAnyActionInProgress || isDefault || (index <= 0);
            headerRow.querySelector(`#${APPID}-theme-down-btn`).disabled = isAnyActionInProgress || isDefault || (index >= config.themeSets.length - 1);
            headerRow.querySelector(`#${APPID}-theme-delete-btn`).disabled = isAnyActionInProgress || isDefault;
            headerRow.querySelector(`#${APPID}-theme-new-btn`).disabled = isAnyActionInProgress;
            headerRow.querySelector(`#${APPID}-theme-copy-btn`).disabled = isAnyActionInProgress;
            headerRow.querySelector(`#${APPID}-theme-rename-btn`).disabled = isAnyActionInProgress || isDefault;

            if (generalSettingsArea) generalSettingsArea.classList.toggle('is-disabled', isAnyActionInProgress);
            scrollArea.classList.toggle('is-disabled', isAnyActionInProgress);
            this.modal.element.querySelector(`#${APPID}-theme-modal-apply-btn`).disabled = isAnyActionInProgress;
            this.modal.element.querySelector(`#${APPID}-theme-modal-save-btn`).disabled = isAnyActionInProgress;
            this.modal.element.querySelector(`#${APPID}-theme-modal-cancel-btn`).disabled = isAnyActionInProgress;

            if (!isAnyActionInProgress) {
                await this._populateFormWithThemeData(this.activeThemeKey);
            }
        }

        _applyThemeToModal() {
            if (!this.modal) return;
            const modalBox = this.modal.dom.modalBox;
            const p = this.modal.options.cssPrefix;
            const styles = SITE_STYLES.THEME_MODAL;
            modalBox.style.setProperty(`--${p}-bg`, styles.modal_bg);
            modalBox.style.setProperty(`--${p}-text`, styles.modal_text);
            modalBox.style.setProperty(`--${p}-border-color`, styles.modal_border);
            Object.assign(this.modal.dom.header.style, {
                borderBottom: `1px solid ${styles.modal_border}`,
                paddingBottom: '12px', display: 'flex', flexDirection: 'column',
                alignItems: 'stretch', gap: '12px'
            });
            Object.assign(this.modal.dom.footer.style, {
                borderTop: `1px solid ${styles.modal_border}`,
                paddingTop: '16px'
            });
            const buttons = this.modal.dom.footer.querySelectorAll(`.${p}-button`);
            buttons.forEach(button => {
                Object.assign(button.style, {
                    background: styles.btn_bg,
                    color: styles.btn_text,
                    border: `1px solid ${styles.btn_border}`,
                    borderRadius: `var(--radius-md, ${CONSTANTS.MODAL.BTN_RADIUS}px)`,
                    padding: CONSTANTS.MODAL.BTN_PADDING,
                    fontSize: `${CONSTANTS.MODAL.BTN_FONT_SIZE}px`,
                });
                button.addEventListener('mouseover', () => { button.style.background = styles.btn_hover_bg; });
                button.addEventListener('mouseout', () => { button.style.background = styles.btn_bg; });
            });
        }

        _createHeaderControls() {
            const styles = this.callbacks.siteStyles;
            const type = 'theme';
            return h(`div.${APPID}-theme-modal-header-controls`, [
                h(`div.${APPID}-header-row`, { 'data-type': type }, [
                    h('label', { htmlFor: `${APPID}-${type}-select` }, 'Theme:'),
                    h(`div.${APPID}-rename-area`, [
                        h(`select#${APPID}-${type}-select`),
                        h('input', { type: 'text', id: `${APPID}-${type}-rename-input`, style: { display: 'none' } }),
                    ]),
                    h(`div.${APPID}-action-area`, [
                        h(`div#${APPID}-${type}-main-actions`, [
                            h(`button#${APPID}-${type}-rename-btn.${APPID}-modal-button`, 'Rename'),
                            h(`button#${APPID}-${type}-up-btn.${APPID}-modal-button.${APPID}-move-btn`, [createIconFromDef(styles.upIconDef)]),
                            h(`button#${APPID}-${type}-down-btn.${APPID}-modal-button.${APPID}-move-btn`, [createIconFromDef(styles.downIconDef)]),
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
                    ])
                ])
            ]);
        }

        _createMainContent() {
            const styles = this.callbacks.siteStyles;
            const createTextField = (label, id, tooltip = '', fieldType = 'text') => {
                const isImageField = ['image', 'icon'].includes(fieldType);
                const inputWrapperChildren = [h('input', { type: 'text', id: `${APPID}-form-${id}` })];
                if (isImageField) {
                    inputWrapperChildren.push(h(`button.${APPID}-local-file-btn`, { type: 'button', 'data-target-id': id, title: 'Select local file' }, [createIconFromDef(styles.folderIconDef)]));
                }
                const fieldChildren = [
                    h('label', { htmlFor: `${APPID}-form-${id}`, title: tooltip }, label),
                    h(`div.${APPID}-input-wrapper`, inputWrapperChildren)
                ];
                if (['image', 'icon', 'name', 'patterns'].includes(fieldType)) {
                    fieldChildren.push(h(`div.${APPID}-form-error-msg`, { 'data-error-for': id.replace(/\./g, '-') }));
                }
                return h(`div.${APPID}-form-field`, fieldChildren);
            };
            const createColorField = (label, id, tooltip = '') => {
                const hint = 'Click the swatch to open the color picker.\nAccepts any valid CSS color string.';
                const fullTooltip = tooltip ? `${tooltip}\n---\n${hint}` : hint;
                return h(`div.${APPID}-form-field`, [
                    h('label', { htmlFor: `${APPID}-form-${id}`, title: fullTooltip }, label),
                    h(`div.${APPID}-color-field-wrapper`, [
                        h('input', { type: 'text', id: `${APPID}-form-${id}`, autocomplete: 'off' }),
                        h(`button.${APPID}-color-swatch`, { type: 'button', 'data-controls-color': id, title: 'Open color picker' }, [
                            h(`span.${APPID}-color-swatch-checkerboard`),
                            h(`span.${APPID}-color-swatch-value`)
                        ])
                    ])
                ]);
            };
            const createSelectField = (label, id, options, tooltip = '') =>
            h(`div.${APPID}-form-field`, [
                h('label', { htmlFor: `${APPID}-form-${id}`, title: tooltip }, label),
                h('select', { id: `${APPID}-form-${id}` }, [
                    h('option', { value: '' }, '(not set)'), ...options.map(o => h('option', { value: o }, o))
                ])
            ]);
            const createSliderField = (containerClass, label, id, min, max, step, tooltip = '', isPercent = false, nullThreshold = -1) =>
            h(`div`, { className: containerClass }, [
                h('label', { htmlFor: `${APPID}-form-${id}-slider`, title: tooltip }, label),
                h(`div.${APPID}-slider-subgroup-control`, [
                    h('input', {
                        type: 'range', id: `${APPID}-form-${id}-slider`, min, max, step,
                        dataset: { sliderFor: id, isPercent, nullThreshold }
                    }),
                    h('span', { 'data-slider-display-for': id })
                ])
            ]);
            const createPaddingSliders = (actor) => {
                const createSubgroup = (name, id, min, max, step) =>
                h(`div.${APPID}-slider-subgroup`, [
                    h('label', { htmlFor: id }, name),
                    h(`div.${APPID}-slider-subgroup-control`, [
                        h('input', { type: 'range', id, min, max, step, dataset: { sliderFor: id, nullThreshold: 0 } }),
                        h('span', { 'data-slider-display-for': id })
                    ])
                ]);
                return h(`div.${APPID}-form-field`, [
                    h(`div.${APPID}-compound-slider-container`, [
                        createSubgroup('Padding Top/Bottom:', `${APPID}-form-${actor}-bubblePadding-tb`, -1, 30, 1),
                        createSubgroup('Padding Left/Right:', `${APPID}-form-${actor}-bubblePadding-lr`, -1, 30, 1)
                    ])
                ]);
            };
            const createPreview = (actor) => {
                const wrapperClass = `${APPID}-preview-bubble-wrapper ${actor === 'user' ? 'user-preview' : ''}`;
                return h(`div.${APPID}-preview-container`, [
                    h('label', 'Preview:'),
                    h('div', { className: wrapperClass }, [
                        h(`div.${APPID}-preview-bubble`, { 'data-preview-for': actor }, [h('span', 'Sample Text')])
                    ])
                ]);
            };
            return h(`div.${APPID}-theme-modal-content`, [
                h(`div.${APPID}-theme-general-settings`, [
                    h(`div.${APPID}-form-field`, [
                        h('label', { htmlFor: `${APPID}-form-metadata-matchPatterns`, title: 'Enter one RegEx pattern per line to automatically apply this theme (e.g., /My Project/i).' }, 'Patterns (one per line):'),
                        h(`textarea`, { id: `${APPID}-form-metadata-matchPatterns`, rows: 3 }),
                        h(`div.${APPID}-form-error-msg`, { 'data-error-for': 'metadata-matchPatterns' })
                    ])
                ]),
                h(`hr.${APPID}-theme-separator`, { tabIndex: -1 }),
                h(`div.${APPID}-theme-scrollable-area`, [
                    h(`div.${APPID}-theme-grid`, [
                        h('fieldset', [
                            h('legend', 'Assistant'),
                            createTextField('Name:', 'assistant-name', 'The name displayed for the assistant.', 'name'),
                            createTextField('Icon:', 'assistant-icon', "URL, Data URI, or <svg> for the assistant's icon.", 'icon'),
                            createTextField('Standing image:', 'assistant-standingImageUrl', "URL or Data URI for the character's standing image.", 'image'),
                            h('fieldset', [
                                h('legend', 'Bubble Settings'),
                                createColorField('Background color:', 'assistant-bubbleBackgroundColor', 'Background color of the message bubble.'),
                                createColorField('Text color:', 'assistant-textColor', 'Color of the text inside the bubble.'),
                                createTextField('Font:', 'assistant-font', 'Font family for the text.\nFont names with spaces must be quoted (e.g., "Times New Roman").'),
                                createPaddingSliders('assistant'),
                                h(`div.${APPID}-compound-slider-container`, [
                                    createSliderField(`${APPID}-slider-subgroup`, 'Radius:', 'assistant-bubbleBorderRadius', -1, 50, 1, 'Corner roundness of the bubble (e.g., 10px).\nSet to the far left for (auto).', false, 0),
                                    createSliderField(`${APPID}-slider-subgroup`, 'max Width:', 'assistant-bubbleMaxWidth', 29, 100, 1, 'Maximum width of the bubble.\nSet to the far left for (auto).', true, 30)
                                ]),
                                h(`hr.${APPID}-theme-separator`),

                                createPreview('assistant')
                            ])
                        ]),
                        h('fieldset', [
                            h('legend', 'User'),
                            createTextField('Name:', 'user-name', 'The name displayed for the user.', 'name'),
                            createTextField('Icon:', 'user-icon', "URL, Data URI, or <svg> for the user's icon.", 'icon'),
                            createTextField('Standing image:', 'user-standingImageUrl', "URL or Data URI for the character's standing image.", 'image'),
                            h('fieldset', [
                                h('legend', 'Bubble Settings'),
                                createColorField('Background color:', 'user-bubbleBackgroundColor', 'Background color of the message bubble.'),
                                createColorField('Text color:', 'user-textColor', 'Color of the text inside the bubble.'),
                                createTextField('Font:', 'user-font', 'Font family for the text.\nFont names with spaces must be quoted (e.g., "Times New Roman").'), createPaddingSliders('user'),
                                h(`div.${APPID}-compound-slider-container`, [
                                    createSliderField(`${APPID}-slider-subgroup`, 'Radius:', 'user-bubbleBorderRadius', -1, 50, 1, 'Corner roundness of the bubble (e.g., 10px).\nSet to the far left for (auto).', false, 0),
                                    createSliderField(`${APPID}-slider-subgroup`, 'max Width:', 'user-bubbleMaxWidth', 29, 100, 1, 'Maximum width of the bubble.\nSet to the far left for (auto).', true, 30)
                                ]),
                                h(`hr.${APPID}-theme-separator`),
                                createPreview('user')
                            ])
                        ]),
                        h('fieldset', [
                            h('legend', 'Background'),
                            createColorField('Background color:', 'window-backgroundColor', 'Main background color of the chat window.'),
                            createTextField('Background image:', 'window-backgroundImageUrl', 'URL or Data URI for the main background image.', 'image'),
                            h(`div.${APPID}-compound-form-field-container`, [
                                createSelectField('Size:', 'window-backgroundSize', ['auto', 'cover', 'contain'], 'How the background image is sized.'),
                                createSelectField('Position:', 'window-backgroundPosition', [
                                    'top left', 'top center', 'top right',
                                    'center left', 'center center', 'center right',
                                    'bottom left', 'bottom center', 'bottom right'
                                ], 'Position of the background image.')
                            ]),
                            h(`div.${APPID}-compound-form-field-container`, [
                                createSelectField('Repeat:', 'window-backgroundRepeat', ['no-repeat', 'repeat'], 'How the background image is repeated.'),
                            ])
                        ]),
                        h('fieldset', [
                            h('legend', 'Input area'),
                            createColorField('Background color:', 'inputArea-backgroundColor', 'Background color of the text input area.'),
                            createColorField('Text color:', 'inputArea-textColor', 'Color of the text you type.'),
                            h(`hr.${APPID}-theme-separator`),
                            h(`div.${APPID}-preview-container`, [

                                h('label', 'Preview:'),
                                h(`div.${APPID}-preview-bubble-wrapper`, [
                                    h(`div.${APPID}-preview-input-area`, { 'data-preview-for': 'inputArea' }, [
                                        h('span', 'Sample input text')
                                    ])
                                ])
                            ])
                        ])
                    ])
                ])
            ]);
        }

        _updateAllPreviews() {
            this._updatePreview('user');
            this._updatePreview('assistant');
            this._updateInputAreaPreview();
        }

        async _updatePreview(actor) {
            if (!this.modal) return;
            const config = await this.callbacks.getCurrentConfig();
            if (!config) return;

            const isEditingDefaultSet = this.activeThemeKey === 'defaultSet';
            const defaultActorSet = config.defaultSet[actor] || {};
            // When editing the defaultSet, the fallback should be empty, not the set's own old values.
            const fallbackActorSet = isEditingDefaultSet ? {} : defaultActorSet;

            requestAnimationFrame(() => {
                const previewBubble = this.modal.element.querySelector(`[data-preview-for="${actor}"]`);
                if (!previewBubble) return;

                const form = this.modal.element;
                const getVal = (id) => form.querySelector(`#${APPID}-form-${id}`)?.value.trim() || null;

                // Apply fallback logic (current theme -> defaultSet -> hardcoded default) to all properties.
                previewBubble.style.color = getVal(`${actor}-textColor`) ?? fallbackActorSet.textColor ?? '';
                previewBubble.style.fontFamily = getVal(`${actor}-font`) ?? fallbackActorSet.font ?? '';
                previewBubble.style.backgroundColor = getVal(`${actor}-bubbleBackgroundColor`) ?? fallbackActorSet.bubbleBackgroundColor ?? '#888';

                // Padding
                const paddingTBSlider = form.querySelector(`#${APPID}-form-${actor}-bubblePadding-tb`);
                const paddingLRSlider = form.querySelector(`#${APPID}-form-${actor}-bubblePadding-lr`);
                let tbVal = (paddingTBSlider && paddingTBSlider.value < 0) ? null : paddingTBSlider?.value;
                let lrVal = (paddingLRSlider && paddingLRSlider.value < 0) ? null : paddingLRSlider?.value;

                const defaultSetValue = fallbackActorSet.bubblePadding;
                if (tbVal === null && lrVal === null && defaultSetValue === null) {
                    previewBubble.style.padding = ''; // No value in current theme or defaultSet.
                } else {
                    const defaultPaddingParts = (defaultSetValue || "6px 10px").split(' ');
                    const defaultTB = parseInt(defaultPaddingParts[0], 10);
                    const defaultLR = parseInt(defaultPaddingParts[1] || defaultPaddingParts[0], 10);
                    const finalTB = (tbVal !== null) ? tbVal : defaultTB;
                    const finalLR = (lrVal !== null) ? lrVal : defaultLR;
                    previewBubble.style.padding = `${finalTB}px ${finalLR}px`;
                }

                // Radius
                const radiusSlider = form.querySelector(`#${APPID}-form-${actor}-bubbleBorderRadius-slider`);
                if (radiusSlider) {
                    const radiusVal = parseInt(radiusSlider.value, 10);
                    const nullThreshold = parseInt(radiusSlider.dataset.nullThreshold, 10);
                    const currentRadius = (!isNaN(nullThreshold) && radiusVal < nullThreshold) ? null : `${radiusVal}px`;
                    previewBubble.style.borderRadius = currentRadius ?? fallbackActorSet.bubbleBorderRadius ?? '';
                }

                // Max Width
                const widthSlider = form.querySelector(`#${APPID}-form-${actor}-bubbleMaxWidth-slider`);
                if (widthSlider) {
                    const widthVal = parseInt(widthSlider.value, 10);
                    const nullThreshold = parseInt(widthSlider.dataset.nullThreshold, 10);
                    const currentWidth = (!isNaN(nullThreshold) && widthVal < nullThreshold) ? null : `${widthVal}%`;
                    const finalWidth = currentWidth ?? fallbackActorSet.bubbleMaxWidth ?? (actor === 'user' ? '50%' : '90%');
                    previewBubble.style.width = finalWidth;
                    previewBubble.style.maxWidth = finalWidth;
                }
            });
        }

        async _updateInputAreaPreview() {
            if (!this.modal) return;
            const config = await this.callbacks.getCurrentConfig();
            if (!config) return;

            const isEditingDefaultSet = this.activeThemeKey === 'defaultSet';
            const defaultInputSet = config.defaultSet.inputArea || {};
            // When editing the defaultSet, the fallback should be empty, not the set's own old values.
            const fallbackInputSet = isEditingDefaultSet ? {} : defaultInputSet;

            requestAnimationFrame(() => {
                const preview = this.modal.element.querySelector('[data-preview-for="inputArea"]');
                if (!preview) return;

                const form = this.modal.element;
                const getVal = (id) => form.querySelector(`#${APPID}-form-${id}`)?.value.trim() || null;

                // Apply fallback logic (current theme -> defaultSet -> hardcoded default).
                preview.style.backgroundColor = getVal('inputArea-backgroundColor') ?? fallbackInputSet.backgroundColor ?? '#888';
                preview.style.color = getVal('inputArea-textColor') ?? fallbackInputSet.textColor ?? '';
            });
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
            this.modal.element.querySelectorAll(`.${APPID}-form-error-msg`).forEach(el => {
                el.textContent = '';
            });
            this.modal.element.querySelectorAll('.is-invalid').forEach(el => {
                el.classList.remove('is-invalid');
            });
        }

        _enterDeleteConfirmationMode() {
            if (!this.modal || this.renameState.isActive) return;
            this.pendingDeletionKey = this.activeThemeKey;
            if (!this.pendingDeletionKey) return;
            this._refreshModalState();
        }

        _exitDeleteConfirmationMode(resetKey = true) {
            if (resetKey) {
                this.pendingDeletionKey = null;
            }
            if (this.modal) {
                this._refreshModalState();
            }
        }

        /**
         * Determines the resize options for an image based on the input field's ID.
         * @param {string} targetId The ID of the target input field.
         * @returns {object} The options object for imageToOptimizedDataUrl.
         */
        _getImageOptions(targetId) {
            if (targetId.includes('backgroundImageUrl')) {
                return { maxWidth: 1920, quality: 0.85 };
            }
            if (targetId.includes('standingImageUrl')) {
                return { maxHeight: 1080, quality: 0.85 };
            }
            // For icons, no resizing is applied, but still convert to WebP for size reduction.
            if (targetId.includes('icon')) {
                return { quality: 0.85 };
            }
            return { quality: 0.85 };
            // Default
        }

        /**
         * Handles the local file selection process.
         * @param {HTMLElement} button The clicked file selection button.
         */
        async _handleLocalFileSelect(button) {
            const targetId = button.dataset.targetId;
            const targetInput = document.getElementById(`${APPID}-form-${targetId}`);
            if (!targetInput) return;

            const fileInput = h('input', { type: 'file', accept: 'image/*' });
            fileInput.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const errorField = this.modal.element.querySelector(`[data-error-for="${targetId.replace(/\./g, '-')}"]`);
                try {
                    // Clear any previous error and show a neutral "Processing..." message.
                    if (errorField) {
                        errorField.textContent = 'Processing...';
                        errorField.style.color = SITE_STYLES.JSON_MODAL.msg_success_text;
                    }

                    const options = this._getImageOptions(targetId);
                    const dataUrl = await this.dataConverter.imageToOptimizedDataUrl(file, options);
                    targetInput.value = dataUrl;
                    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                    // Trigger preview update

                    // Clear the "Processing..." message on success.
                    if (errorField) {
                        errorField.textContent = '';
                        errorField.style.color = ''; // Reset color to inherit from CSS
                    }
                } catch (error) {
                    Logger.error('Image processing failed:', error);
                    // Show a proper error message with the error color on failure.
                    if (errorField) {
                        errorField.textContent = `Error: ${error.message}`;
                        errorField.style.color = SITE_STYLES.THEME_MODAL.error_text;
                    }
                }
            };
            fileInput.click();
        }

        _setupEventListeners() {
            if (!this.modal) return;
            const modalElement = this.modal.element;

            // Listen for custom color picker events
            modalElement.addEventListener('color-change', () => {
                this.debouncedUpdatePreview();
            });
            modalElement.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;

                // Handle local file selection button
                const fileBtn = target.closest(`.${APPID}-local-file-btn`);
                if (fileBtn) {

                    this._handleLocalFileSelect(fileBtn);
                    return;
                }

                const actionMap = {
                    [`${APPID}-theme-new-btn`]: () => this._handleThemeNew(),
                    [`${APPID}-theme-copy-btn`]: () => this._handleThemeCopy(),
                    [`${APPID}-theme-delete-btn`]: () => this._enterDeleteConfirmationMode(),
                    [`${APPID}-theme-delete-confirm-btn`]: () => this._handleThemeDelete(),
                    [`${APPID}-theme-delete-cancel-btn`]: () => this._exitDeleteConfirmationMode(),
                    [`${APPID}-theme-up-btn`]: () => this._handleThemeMove(-1),

                    [`${APPID}-theme-down-btn`]: () => this._handleThemeMove(1),
                    [`${APPID}-theme-rename-btn`]: () => this._enterRenameMode('theme'),
                    [`${APPID}-theme-rename-ok-btn`]: () => this._handleRenameConfirm('theme'),
                    [`${APPID}-theme-rename-cancel-btn`]: () => this._exitRenameMode(true),
                };
                const action = actionMap[target.id];
                if (action) action();
            });
            modalElement.addEventListener('change', async (e) => {
                if (e.target.matches(`#${APPID}-theme-select`)) {
                    // Add a guard clause to prevent infinite loops.
                    if (this.activeThemeKey === e.target.value) return;
                    this.activeThemeKey = e.target.value;
                    await this._refreshModalState();
                }
            });
            modalElement.addEventListener('input', (e) => {
                const target = e.target;
                const id = target.id || '';

                // Trigger preview for text-based inputs
                const isTextPreviewable = id.includes('textColor') || id.includes('font') ||

                      id.includes('bubbleBackgroundColor') ||
                      id.includes('inputArea-backgroundColor') || id.includes('inputArea-textColor');
                if (isTextPreviewable) {
                    this.debouncedUpdatePreview();
                }

                // Handle all range sliders consistently
                if (target.matches('input[type="range"]')) {
                    this._updateSliderDisplay(target);
                    // Always trigger a preview update when any slider is changed.
                    this.debouncedUpdatePreview();

                }
            });
            modalElement.addEventListener('mouseover', e => {
                if (e.target.matches('input[type="text"], textarea') && (e.target.offsetWidth < e.target.scrollWidth || e.target.offsetHeight < e.target.scrollHeight)) {
                    e.target.title = e.target.value;
                }
            });
            modalElement.addEventListener('mouseout', e => {
                if (e.target.matches('input[type="text"], textarea')) {
                    e.target.title = '';
                }
            });
            modalElement.addEventListener('keydown', (e) => {
                if(e.target.matches(`#${APPID}-theme-rename-input`)) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this._handleRenameConfirm('theme');
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        this._exitRenameMode(true);
                    }
                }
            });
        }

        _updateSliderDisplay(slider) {
            const displayId = slider.dataset.sliderFor || slider.id;
            const display = this.modal.element.querySelector(`[data-slider-display-for="${displayId}"]`);
            if (!display) return;

            const nullThreshold = parseInt(slider.dataset.nullThreshold, 10);
            const currentValue = parseInt(slider.value, 10);
            if (!isNaN(nullThreshold) && currentValue < nullThreshold) {
                display.textContent = '-';
            } else if (slider.dataset.isPercent === 'true') {
                display.textContent = `${currentValue}%`;
            } else {
                display.textContent = `${currentValue}px`;
            }
        }

        async _populateFormWithThemeData(themeKey) {
            if (!this.modal) return;
            const modalElement = this.modal.element;
            this.activeThemeKey = themeKey;

            const scrollableArea = modalElement.querySelector(`.${APPID}-theme-scrollable-area`);
            if (scrollableArea) scrollableArea.style.visibility = 'hidden';

            this._clearAllFieldErrors();

            const config = await this.callbacks.getCurrentConfig();
            if (!config) {
                if (scrollableArea) scrollableArea.style.visibility = 'visible';
                return;
            }

            const isDefault = themeKey === 'defaultSet';
            const theme = isDefault ? config.defaultSet : config.themeSets.find(t => t.metadata.id === themeKey);
            if (!theme) {
                if (scrollableArea) scrollableArea.style.visibility = 'visible';
                return;
            }
            const setVal = (id, value) => {
                const el = modalElement.querySelector(`#${APPID}-form-${id}`);
                if (el) el.value = value ?? '';
            };
            const setSliderVal = (id, value) => {
                const slider = modalElement.querySelector(`#${APPID}-form-${id}-slider`);
                if (!slider) return;
                const nullThreshold = parseInt(slider.dataset.nullThreshold, 10);
                const numVal = parseInt(value, 10);
                slider.value = (value === null || isNaN(numVal)) ? (nullThreshold - 1) : numVal;
                this._updateSliderDisplay(slider);
            };
            const setPaddingSliders = (actor, value) => {
                const tbSlider = modalElement.querySelector(`#${APPID}-form-${actor}-bubblePadding-tb`);
                const lrSlider = modalElement.querySelector(`#${APPID}-form-${actor}-bubblePadding-lr`);
                if (!tbSlider || !lrSlider) return;

                if (value === null) {
                    tbSlider.value = -1;
                    lrSlider.value = -1;
                } else {
                    const parts = String(value).replace(/px/g, '').trim().split(/\s+/).map(p => parseInt(p, 10));
                    if (parts.length === 1 && !isNaN(parts[0])) {
                        tbSlider.value = lrSlider.value = parts[0];
                    } else if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        tbSlider.value = parts[0];
                        lrSlider.value = parts[1];
                    } else {
                        tbSlider.value = -1;
                        lrSlider.value = -1; // Fallback to default
                    }
                }
                this._updateSliderDisplay(tbSlider);
                this._updateSliderDisplay(lrSlider);
            };
            // Populate metadata fields
            if (!isDefault) {
                setVal('metadata-name', theme.metadata.name);
                setVal('metadata-matchPatterns', Array.isArray(theme.metadata.matchPatterns) ? theme.metadata.matchPatterns.join('\n') : '');
            }

            // Populate actor fields
            ['user', 'assistant'].forEach(actor => {
                const actorConf = theme[actor] || {};
                setVal(`${actor}-name`, actorConf.name);
                setVal(`${actor}-icon`, actorConf.icon);
                setVal(`${actor}-standingImageUrl`, actorConf.standingImageUrl);
                setVal(`${actor}-textColor`, actorConf.textColor);
                setVal(`${actor}-font`, actorConf.font);
                setVal(`${actor}-bubbleBackgroundColor`, actorConf.bubbleBackgroundColor);
                setPaddingSliders(actor, actorConf.bubblePadding);
                setSliderVal(`${actor}-bubbleBorderRadius`, actorConf.bubbleBorderRadius);
                setSliderVal(`${actor}-bubbleMaxWidth`, actorConf.bubbleMaxWidth);
            });
            // Populate window fields
            const windowConf = theme.window || {};
            setVal('window-backgroundColor', windowConf.backgroundColor);
            setVal('window-backgroundImageUrl', windowConf.backgroundImageUrl);
            setVal('window-backgroundSize', windowConf.backgroundSize);
            setVal('window-backgroundPosition', windowConf.backgroundPosition);
            setVal('window-backgroundRepeat', windowConf.backgroundRepeat);
            // Populate input area fields
            const inputConf = theme.inputArea || {};
            setVal('inputArea-backgroundColor', inputConf.backgroundColor);
            setVal('inputArea-textColor', inputConf.textColor);

            // Update all color swatches based on the new text values
            modalElement.querySelectorAll(`.${APPID}-color-swatch-value`).forEach(swatchValue => {
                const swatch = swatchValue.closest(`.${APPID}-color-swatch`);
                const targetId = swatch.dataset.controlsColor;
                const textInput = modalElement.querySelector(`#${APPID}-form-${targetId}`);

                if (textInput) {
                    swatchValue.style.backgroundColor = textInput.value || 'transparent';
                }
            });
            const generalSettingsEl = modalElement.querySelector(`.${APPID}-theme-general-settings`);
            const separatorEl = modalElement.querySelector(`.${APPID}-theme-separator`);

            if (isDefault) {
                generalSettingsEl.style.display = 'none';
                separatorEl.style.display = 'none';
            } else {
                generalSettingsEl.style.display = 'grid';
                separatorEl.style.display = 'block';
            }
            this._updateAllPreviews();

            if (scrollableArea) {
                scrollableArea.style.visibility = 'visible';
            }
        }

        _collectThemeDataFromForm() {
            if (!this.modal) return null;
            const modalElement = this.modal.element;
            const getVal = (id) => modalElement.querySelector(`#${APPID}-form-${id}`)?.value.trim() || null;
            const getSliderVal = (id) => {
                const slider = modalElement.querySelector(`#${APPID}-form-${id}-slider`);
                if (!slider) return null;
                const value = parseInt(slider.value, 10);
                const nullThreshold = parseInt(slider.dataset.nullThreshold, 10);
                if (!isNaN(nullThreshold) && value < nullThreshold) {
                    return null;
                }
                return slider.dataset.isPercent === 'true' ? `${value}%` : `${value}px`;
            };
            const getPaddingVal = (actor) => {
                const tb = modalElement.querySelector(`#${APPID}-form-${actor}-bubblePadding-tb`);
                const lr = modalElement.querySelector(`#${APPID}-form-${actor}-bubblePadding-lr`);
                if (!tb || !lr) return null;
                if (tb.value < 0 || lr.value < 0) return null;
                return `${tb.value}px ${lr.value}px`;
            };

            // Collect metadata
            const themeData = { metadata: {}, user: {}, assistant: {}, window: {}, inputArea: {} };
            themeData.metadata.matchPatterns = modalElement.querySelector(`#${APPID}-form-metadata-matchPatterns`).value.split('\n').map(p => p.trim()).filter(p => p);
            // Collect actor data
            ['user', 'assistant'].forEach(actor => {
                themeData[actor].name = getVal(`${actor}-name`);
                themeData[actor].icon = getVal(`${actor}-icon`);
                themeData[actor].standingImageUrl = getVal(`${actor}-standingImageUrl`);
                themeData[actor].textColor = getVal(`${actor}-textColor`);
                themeData[actor].font = getVal(`${actor}-font`);
                themeData[actor].bubbleBackgroundColor = getVal(`${actor}-bubbleBackgroundColor`);
                themeData[actor].bubblePadding = getPaddingVal(actor);
                themeData[actor].bubbleBorderRadius = getSliderVal(`${actor}-bubbleBorderRadius`);
                themeData[actor].bubbleMaxWidth = getSliderVal(`${actor}-bubbleMaxWidth`);
            });
            // Collect window data
            themeData.window.backgroundColor = getVal('window-backgroundColor');
            themeData.window.backgroundImageUrl = getVal('window-backgroundImageUrl');
            themeData.window.backgroundSize = getVal('window-backgroundSize');
            themeData.window.backgroundPosition = getVal('window-backgroundPosition');
            themeData.window.backgroundRepeat = getVal('window-backgroundRepeat');
            // Collect input area data
            themeData.inputArea.backgroundColor = getVal('inputArea-backgroundColor');
            themeData.inputArea.textColor = getVal('inputArea-textColor');

            return themeData;
        }

        async _handleThemeAction(shouldClose) {
            this._clearAllFieldErrors();
            // Clear the global footer message on a new action
            if (this.modal?.dom?.footerMessage) {
                this.modal.dom.footerMessage.textContent = '';
            }

            const config = await this.callbacks.getCurrentConfig();
            const newConfig = JSON.parse(JSON.stringify(config));
            const themeData = this._collectThemeDataFromForm();
            if (!themeData) return;
            let isFormValid = true;
            const validateField = (id, value, type, name) => {
                const result = validateImageString(value, type);
                if (!result.isValid) {
                    this._setFieldError(id.replace(/\./g, '-'), `${name}: ${result.message}`);
                    isFormValid = false;
                }
            };

            validateField('user.icon', themeData.user.icon, 'icon', 'Icon');
            validateField('assistant.icon', themeData.assistant.icon, 'icon', 'Icon');
            validateField('user.standingImageUrl', themeData.user.standingImageUrl, 'image', 'Standing image');
            validateField('assistant.standingImageUrl', themeData.assistant.standingImageUrl, 'image', 'Standing image');
            validateField('window.backgroundImageUrl', themeData.window.backgroundImageUrl, 'image', 'Background image');
            const isDefault = this.activeThemeKey === 'defaultSet';
            if (!isDefault) {
                for (const p of themeData.metadata.matchPatterns) {
                    if (!/^\/.*\/[gimsuy]*$/.test(p)) {
                        this._setFieldError('metadata-matchPatterns', `Invalid format: "${p}". Must be /pattern/flags.`);
                        isFormValid = false;
                    }
                    try {
                        const lastSlash = p.lastIndexOf('/');
                        new RegExp(p.slice(1, lastSlash), p.slice(lastSlash + 1));
                    } catch (e) {
                        this._setFieldError('metadata-matchPatterns', `Invalid RegExp: "${p}". ${e.message}`);
                        isFormValid = false;
                    }
                }
            }

            if (!isFormValid) return;
            if (isDefault) {
                newConfig.defaultSet.user = themeData.user;
                newConfig.defaultSet.assistant = themeData.assistant;
                newConfig.defaultSet.window = themeData.window;
                newConfig.defaultSet.inputArea = themeData.inputArea;
            } else {
                const index = newConfig.themeSets.findIndex(t => t.metadata.id === this.activeThemeKey);
                if (index !== -1) {
                    // Preserve existing metadata not edited in this form (like name and id)
                    const existingMetadata = newConfig.themeSets[index].metadata;
                    newConfig.themeSets[index] = { ...themeData, metadata: existingMetadata };
                    newConfig.themeSets[index].metadata.matchPatterns = themeData.metadata.matchPatterns;
                }
            }

            try {
                await this.callbacks.onSave(newConfig);
                if (shouldClose) {
                    this.close();
                } else {
                    await this._refreshModalState();
                }
            } catch (e) {
                if (this.modal?.dom?.footerMessage) {
                    const footerMsg = this.modal.dom.footerMessage;
                    footerMsg.textContent = e.message;
                    footerMsg.style.color = SITE_STYLES.THEME_MODAL.error_text;
                }
            }
        }

        async _handleThemeNew() {
            const config = await this.callbacks.getCurrentConfig();
            const existingNames = new Set(config.themeSets.map(t => t.metadata.name?.trim().toLowerCase()));
            const newName = proposeUniqueName('New Theme', existingNames);
            const newTheme = {
                metadata: { id: generateUniqueId(), name: newName, matchPatterns: [] },
                user: {}, assistant: {}, window: {}, inputArea: {}
            };
            const newConfig = JSON.parse(JSON.stringify(config));
            newConfig.themeSets.push(newTheme);
            try {
            await this.callbacks.onSave(newConfig);

            this.activeThemeKey = newTheme.metadata.id;
            await this._refreshModalState();
            this._enterRenameMode('theme');
            } catch (e) {
                if (this.modal?.dom?.footerMessage) {
                    const footerMsg = this.modal.dom.footerMessage;
                    footerMsg.textContent = e.message;
                    footerMsg.style.color = this.callbacks.siteStyles.error_text;
                }
            }
        }

        async _handleThemeCopy() {
            const config = await this.callbacks.getCurrentConfig();
            const isDefault = this.activeThemeKey === 'defaultSet';
            let themeToCopy;
            if (isDefault) {
                themeToCopy = { metadata: { name: 'Default' }, ...config.defaultSet };
            } else {
                themeToCopy = config.themeSets.find(t => t.metadata.id === this.activeThemeKey);
            }
            if (!themeToCopy) return;

            const originalName = themeToCopy.metadata.name || 'Theme';
            const baseName = `${originalName} Copy`;
            const existingNames = new Set(config.themeSets.map(t => t.metadata.name?.trim().toLowerCase()));
            const newName = proposeUniqueName(baseName, existingNames);
            const newTheme = JSON.parse(JSON.stringify(themeToCopy));

            if (!newTheme.metadata) newTheme.metadata = {};
            newTheme.metadata.id = generateUniqueId();
            newTheme.metadata.name = newName;
            if (isDefault) {
                newTheme.metadata.matchPatterns = [];
            }

            const newConfig = JSON.parse(JSON.stringify(config));
            newConfig.themeSets.push(newTheme);
            try {
            await this.callbacks.onSave(newConfig);
            this.activeThemeKey = newTheme.metadata.id;
            await this._refreshModalState();
            } catch (e) {
                if (this.modal?.dom?.footerMessage) {
                    const footerMsg = this.modal.dom.footerMessage;
                    footerMsg.textContent = e.message;
                    footerMsg.style.color = this.callbacks.siteStyles.error_text;
                }
            }
        }

        async _handleThemeDelete() {
            const themeKey = this.pendingDeletionKey;
            if (themeKey === 'defaultSet' || !themeKey) {
                this._exitDeleteConfirmationMode();
                return;
            }

            const config = await this.callbacks.getCurrentConfig();
            const newConfig = JSON.parse(JSON.stringify(config));
            newConfig.themeSets = newConfig.themeSets.filter(t => t.metadata.id !== themeKey);
            try {
            await this.callbacks.onSave(newConfig);

            this.activeThemeKey = 'defaultSet';
            this._exitDeleteConfirmationMode();
            await this._refreshModalState();
            } catch (e) {
                if (this.modal?.dom?.footerMessage) {
                    const footerMsg = this.modal.dom.footerMessage;
                    footerMsg.textContent = e.message;
                    footerMsg.style.color = this.callbacks.siteStyles.error_text;
                }
            }
        }

        async _handleThemeMove(direction) {
            const themeKey = this.activeThemeKey;
            if (themeKey === 'defaultSet') return;

            const config = await this.callbacks.getCurrentConfig();
            const currentIndex = config.themeSets.findIndex(t => t.metadata.id === themeKey);
            if (currentIndex === -1) return;

            const newIndex = currentIndex + direction;
            if (newIndex < 0 || newIndex >= config.themeSets.length) return;
            const newConfig = JSON.parse(JSON.stringify(config));
            const item = newConfig.themeSets.splice(currentIndex, 1)[0];
            newConfig.themeSets.splice(newIndex, 0, item);

            try {
            await this.callbacks.onSave(newConfig);
            await this._refreshModalState();
            } catch (e) {
                if (this.modal?.dom?.footerMessage) {
                    const footerMsg = this.modal.dom.footerMessage;
                    footerMsg.textContent = e.message;
                    footerMsg.style.color = this.callbacks.siteStyles.error_text;
                }
            }
        }

        async _enterRenameMode(type) {
            if (this.renameState.isActive) return;
            this.renameState = {
                type: type,
                isActive: true
            };
            await this._refreshModalState();

            const input = this.modal.element.querySelector(`#${APPID}-${type}-rename-input`);
            if (input) {
                input.focus();
                input.select();
            }
        }

        async _exitRenameMode(refresh = false) {
            if (!this.renameState.isActive) return;
            const type = this.renameState.type;
            this.renameState = { type: null, isActive: false };

            if (this.modal) {
                const input = this.modal.element.querySelector(`#${APPID}-${type}-rename-input`);
                if (input) input.classList.remove('is-invalid');

                const footerMessage = this.modal.dom.footerMessage;
                if (footerMessage) footerMessage.textContent = '';
                if(refresh) await this._refreshModalState();
            }
        }

        async _handleRenameConfirm(type) {
            const footerMessage = this.modal?.dom?.footerMessage;
            if (footerMessage) footerMessage.textContent = '';

            const input = this.modal.element.querySelector(`#${APPID}-${type}-rename-input`);
            const newName = input.value.trim();
            const config = await this.callbacks.getCurrentConfig();
            const oldTheme = this.activeThemeKey === 'defaultSet' ?
                  { metadata: { name: 'Default Settings' } } :
            config.themeSets.find(t => t.metadata.id === this.activeThemeKey);
            const oldName = oldTheme?.metadata?.name || '';

            // Validation
            if (!newName) {
                if (footerMessage) {
                    footerMessage.textContent = `Theme name cannot be empty.`;
                    footerMessage.style.color = this.callbacks.siteStyles.error_text;
                }
                input.classList.add('is-invalid');
                return;
            }

            const existingKeys = config.themeSets.map(t => t.metadata.name);

            if (newName.toLowerCase() !== oldName.toLowerCase() && existingKeys.some(k => k.toLowerCase() === newName.toLowerCase())) {
                if (footerMessage) {
                    footerMessage.textContent = `Name "${newName}" is already in use.`;
                    footerMessage.style.color = this.callbacks.siteStyles.error_text;
                }
                input.classList.add('is-invalid');
                return;
            }

            // Config Update
            const newConfig = JSON.parse(JSON.stringify(config));
            const themeToUpdate = newConfig.themeSets.find(t => t.metadata.id === this.activeThemeKey);
            if(themeToUpdate){
                themeToUpdate.metadata.name = newName;
            } else {
                if (footerMessage) {
                    footerMessage.textContent = `Error: Could not find theme to update.`;
                    footerMessage.style.color = this.callbacks.siteStyles.error_text;
                }
                return;
            }

            try {
                await this.callbacks.onSave(newConfig);
                await this._exitRenameMode(true);
            } catch (e) {
                if (footerMessage) {
                    footerMessage.textContent = `Save failed: ${e.message}`;
                    footerMessage.style.color = this.callbacks.siteStyles.error_text;
                }
            }
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

        getContextForReopen() {
            return { type: 'theme', key: this.activeThemeKey };
        }

    }

    class UIManager {
        /** * @param {(config: AppConfig) => Promise<void>} onSaveCallback
         * @param {() => Promise<AppConfig>} getCurrentConfigCallback
         * @param {DataConverter} dataConverter
         * @param {() => void} onModalClose
         * @param {object} siteStyles
         */
        constructor(appInstance, onSaveCallback, getCurrentConfigCallback, dataConverter, onModalClose, siteStyles, getCurrentThemeSetCallback) {
            this.app = appInstance; // Store reference to main controller
            this.onSave = onSaveCallback;
            this.getCurrentConfig = getCurrentConfigCallback;
            this.dataConverter = dataConverter;
            this.onModalClose = onModalClose;
            this.siteStyles = siteStyles;
            this.isModalOpen = false;
            const modalCallbacks = {
                onSave: (newConfig) => this.onSave(newConfig),
                getCurrentConfig: () => this.getCurrentConfig(),
                onModalOpenStateChange: (isOpen) => this.setModalState(isOpen)
            };
            this.settingsButton = new CustomSettingsButton(
                { // Callbacks
                    onClick: () => this.settingsPanel.toggle()
                },
                { // Options
                    id: `${APPID}-settings-button`,
                    title: `Settings (${APPNAME})`,
                    zIndex: CONSTANTS.Z_INDICES.SETTINGS_BUTTON,
                    position: { top: '10px', right: '320px' },
                    siteStyles: this.siteStyles.SETTINGS_BUTTON
                }
            );
            this.settingsPanel = new SettingsPanelComponent({
                onSave: (newConfig) => this.onSave(newConfig),
                onShowJsonModal: () => this.jsonModal.open(this.settingsButton.element),
                onShowThemeModal: (themeKey) => this.themeModal.open(themeKey),
                getCurrentConfig: () => this.getCurrentConfig(),
                getAnchorElement: () => this.settingsButton.element,
                siteStyles: this.siteStyles.SETTINGS_PANEL,
                onShow: () => this.displayConfigWarning(),
                getCurrentThemeSet: getCurrentThemeSetCallback // Pass callback directly
            });
            this.jsonModal = new JsonModalComponent({
                ...modalCallbacks,
                siteStyles: this.siteStyles.JSON_MODAL,
                onModalOpen: () => this.displayConfigWarning()
            });
            this.themeModal = new ThemeModalComponent({
                ...modalCallbacks,
                dataConverter: this.dataConverter,
                siteStyles: this.siteStyles.THEME_MODAL,
                onModalOpen: () => this.displayConfigWarning()
            });
        }

        init() {
            this.settingsButton.render();
            this.settingsPanel.render();
            this.jsonModal.render();
            this.themeModal.render();
            EventBus.subscribe(`${APPID}:reOpenModal`, ({ type, key }) => {
                if (type === 'json') {
                    this.jsonModal.open(this.settingsButton.element);
                } else if (type === 'theme') {
                    this.themeModal.open(key);
                }
            });
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

        setModalState(isOpen) {
            this.isModalOpen = isOpen;
            if (!isOpen) {
                this.onModalClose?.();
            }
        }

        _createWarningBanner() {
            return h(`div.${APPID}-config-warning-banner`, {
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
                }
            }, this.app.configWarningMessage);
        }

        displayConfigWarning() {
            const components = [this.settingsPanel, this.jsonModal, this.themeModal];
            // First, remove any existing banners from all components
            components.forEach(component => {
                const modalElement = component?.modal?.element || component?.element;
                if (modalElement) {
                    modalElement.querySelector(`.${APPID}-config-warning-banner`)?.remove();
                }
            });

            if (this.app.isConfigSizeExceeded) {
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
            this.isBordersVisible = (forceState === undefined) ? !this.isBordersVisible : forceState;
            const styleId = `${APPID}-debug-style`;
            const existingStyle = document.getElementById(styleId);
            if (this.isBordersVisible) {
                // Already visible
                if (existingStyle) return;
                const debugStyle = h('style', {
                    id: styleId,
                    textContent: `
                    /* --- DEBUG BORDERS --- */
                    ${CONSTANTS.SELECTORS.DEBUG_CONTAINER_TURN} { border: 1px dashed blue !important; }
                    ${CONSTANTS.SELECTORS.DEBUG_CONTAINER_ASSISTANT} { border: 1px dashed black !important; }
                    ${CONSTANTS.SELECTORS.DEBUG_CONTAINER_USER} { border: 1px solid orange !important; }
                `
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
            console.group(LOG_PREFIX, "Debug Commands");
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
     */
    class Sentinel {
        constructor(prefix = 'my-project') {
            window.__global_sentinel_instances__ = window.__global_sentinel_instances__ || {};
            if (window.__global_sentinel_instances__[prefix]) {
                return window.__global_sentinel_instances__[prefix];
            }

            // Use a unique, prefixed animation name shared by all scripts in a project.
            this.animationName = `${prefix}-global-sentinel-animation`;
            this.styleId = `${prefix}-sentinel-global-keyframes`;
            this.ruleClassName = `${prefix}-sentinel-rule`;
            this.listeners = new Map();
            this._injectKeyframes();
            document.addEventListener('animationstart', this._handleAnimationStart.bind(this), true);

            window.__global_sentinel_instances__[prefix] = this;
        }

        _injectKeyframes() {
            // Ensure the keyframes are injected only once per project prefix.
            if (document.getElementById(this.styleId)) return;

            const style = h('style', {
                id: this.styleId,
                textContent: `@keyframes ${this.animationName} { from { transform: none; } to { transform: none; } }`
            });
            document.head.appendChild(style);
        }

        _handleAnimationStart(event) {
            // Check if the animation is the one we're listening for.
            if (event.animationName !== this.animationName) return;
            const target = event.target;
            if (!target) return;
            // Check if the target element matches any of this instance's selectors.
            for (const [selector, callbacks] of this.listeners.entries()) {
                if (target.matches(selector)) {
                    callbacks.forEach(cb => cb(target));
                }
            }
        }

        on(selector, callback) {
            if (!this.listeners.has(selector)) {
                this.listeners.set(selector, []);
                // Each script still injects its own rule to target its specific element.
                // All rules will point to the same, shared animation name.
                const style = h('style', {
                    className: this.ruleClassName,
                    textContent: `${selector} { animation-duration: 0.001s; animation-name: ${this.animationName}; }`
                });
                document.head.appendChild(style);
            }
            this.listeners.get(selector).push(callback);
        }
    }

    class ThemeAutomator {
        constructor() {
            this.dataConverter = new DataConverter();
            this.configManager = new ConfigManager(this.dataConverter);
            this.imageDataManager = new ImageDataManager();
            this.uiManager = null;
            // Initialized in init
            this.observerManager = new ObserverManager();
            this.debugManager = new DebugManager(this);

            // Create the central message cache manager first
            this.messageCacheManager = new MessageCacheManager();
            this.avatarManager = new AvatarManager(this.configManager);
            this.standingImageManager = new StandingImageManager(this.configManager);
            this.themeManager = new ThemeManager(this.configManager, this.imageDataManager, this.standingImageManager);
            this.collapsibleBubbleManager = new CollapsibleBubbleManager(this.configManager, this.messageCacheManager);
            this.scrollToTopManager = new ScrollToTopManager(this.configManager, this.messageCacheManager);
            // Inject the cache manager into components that need it
            this.sequentialNavManager = new SequentialNavManager(this.configManager, this.messageCacheManager);
            this.fixedNavManager = null;
            this.bulkCollapseManager = new BulkCollapseManager(this.configManager);
            this.syncManager = null;
            this.isConfigSizeExceeded = false;
            this.configWarningMessage = '';
        }

        async init() {
            await this.configManager.load();
            this._ensureUniqueThemeIds(this.configManager.get());

            this.uiManager = new UIManager(
                this, // Pass the app instance
                (newConfig) => this.handleSave(newConfig),
                () => Promise.resolve(this.configManager.get()),
                this.dataConverter,
                () => this.syncManager.onModalClose(),
                SITE_STYLES,
                () => this.themeManager.getThemeSet() // Pass the callback directly
            );
            // Initialize the cache manager after config is loaded
            this.messageCacheManager.init();
            this.avatarManager.init();
            this.standingImageManager.init();
            this.collapsibleBubbleManager.init();
            this.scrollToTopManager.init();
            this.sequentialNavManager.init();
            this.uiManager.init();
            if (this.configManager.get().features.fixed_nav_console.enabled) {
                // Inject the cache manager
                this.fixedNavManager = new FixedNavigationManager(this.messageCacheManager);
                await this.fixedNavManager.init();
                // Provide the nav manager instance to the bulk collapse manager
                this.bulkCollapseManager.setFixedNavManager(this.fixedNavManager);
            }
            this.bulkCollapseManager.init();

            this.observerManager.start();
            this.themeManager.updateTheme();
            this.syncManager = new SyncManager(this);
            this.syncManager.init();

            EventBus.subscribe(`${APPID}:configSizeExceeded`, ({ message }) => {
                this.isConfigSizeExceeded = true;
                this.configWarningMessage = message;
                this.uiManager.displayConfigWarning();
            });
            EventBus.subscribe(`${APPID}:configSaveSuccess`, () => {
                this.isConfigSizeExceeded = false;
                this.configWarningMessage = '';
                this.uiManager.displayConfigWarning();
            });
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

        // Method required by the SyncManager's interface
        getAppId() {
            return APPID;
        }

        // Getter required by the SyncManager's interface
        get configKey() {
            return CONSTANTS.CONFIG_KEY;
        }

        _processConfig(newConfig) {
            const currentConfig = this.configManager.get();
            const themeChanged = JSON.stringify(currentConfig.themeSets) !== JSON.stringify(newConfig.themeSets) ||
                  JSON.stringify(currentConfig.defaultSet) !== JSON.stringify(newConfig.defaultSet);
            // Create a complete config object by merging the incoming data with defaults.
            const completeConfig = deepMerge(
                JSON.parse(JSON.stringify(DEFAULT_THEME_CONFIG)),
                newConfig
            );
            // Ensure all theme IDs are unique before proceeding to validation and saving.
            this._ensureUniqueThemeIds(completeConfig);
            // Validate the configuration object before processing.
            this.configManager.validateThemeMatchPatterns(completeConfig);

            // Sanitize global options
            if (completeConfig && completeConfig.options) {
                // Sanitize icon_size
                if (!CONSTANTS.ICON_SIZE_VALUES.includes(completeConfig.options.icon_size)) {
                    completeConfig.options.icon_size = CONSTANTS.ICON_SIZE;
                }

                // Sanitize chat_content_max_width
                let width = completeConfig.options.chat_content_max_width;
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
                    completeConfig.options.chat_content_max_width = defaultValue;
                }
            }

            // Sanitize all theme sets to ensure slider values are valid
            if (Array.isArray(completeConfig.themeSets)) {
                completeConfig.themeSets.forEach(theme => {
                    const validate = (value, type) => {
                        const result = validateImageString(value, type);
                        if (!result.isValid) throw new Error(`Theme "${theme.metadata.name}": ${result.message}`);
                    };
                    validate(theme.user.icon, 'icon');
                    validate(theme.user.standingImageUrl, 'image');
                    validate(theme.assistant.icon, 'icon');
                    validate(theme.assistant.standingImageUrl, 'image');
                    validate(theme.window.backgroundImageUrl, 'image');

                    ['user', 'assistant'].forEach(actor => {
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
                });
            }
            return { completeConfig, themeChanged };
        }

        async _applyUiUpdates(completeConfig, themeChanged) {
            this.avatarManager.updateIconSizeCss();
            this.collapsibleBubbleManager.updateAll();
            this.scrollToTopManager.updateAll();
            this.sequentialNavManager.updateAll();
            this.bulkCollapseManager.updateVisibility();

            // Repopulate the settings panel form if it is currently open
            if (this.uiManager.settingsPanel?.isOpen()) {
                await this.uiManager.settingsPanel.populateForm();
            }

            // Only trigger a full theme update if theme-related data has changed.
            if (themeChanged) {
                this.themeManager.cachedThemeSet = null;
                this.themeManager.updateTheme();
            } else {
                // Otherwise, just apply the layout-specific changes.
                this.themeManager.applyChatContentMaxWidth();
            }

            const navConsoleEnabled = completeConfig.features.fixed_nav_console.enabled;
            if (navConsoleEnabled && !this.fixedNavManager) {
                this.fixedNavManager = new FixedNavigationManager(this.messageCacheManager);
                await this.fixedNavManager.init();
                // Explicitly notify the new instance with the current cache state
                this.messageCacheManager.notify();
                // Provide the new instance to the bulk collapse manager
                this.bulkCollapseManager.setFixedNavManager(this.fixedNavManager);
            } else if (!navConsoleEnabled && this.fixedNavManager) {
                this.fixedNavManager.destroy();
                this.fixedNavManager = null;
                // Clear the instance from the bulk collapse manager
                this.bulkCollapseManager.setFixedNavManager(null);
            }
        }

        /** @param {AppConfig} newConfig */
        async handleSave(newConfig) {
            try {
                const { completeConfig, themeChanged } = this._processConfig(newConfig);
                await this.configManager.save(completeConfig);
                this.syncManager.onSave(); // Notify SyncManager of the successful save
                await this._applyUiUpdates(completeConfig, themeChanged);
            } catch (e) {
                Logger.error('Configuration save failed:', e.message);
                throw e; // Re-throw the error for the UI layer to catch
            }
        }

        /**
         * Ensures all themes have a unique themeId, assigning one if missing or duplicated.
         * This method operates directly on the provided config object.
         * @param {AppConfig} config The configuration object to sanitize.
         * @private
         */
        _ensureUniqueThemeIds(config) {
            if (!config || !Array.isArray(config.themeSets)) return;
            const seenIds = new Set();
            config.themeSets.forEach(theme => {
                const id = theme.metadata?.id;
                if (typeof id !== 'string' || id.trim() === '' || seenIds.has(id)) {
                    if (!theme.metadata) theme.metadata = {};
                    theme.metadata.id = generateUniqueId();
                }
                seenIds.add(theme.metadata.id);
            });
        }

        /**
         * @private
         * @param {string |* null} value The value to sanitize.
         * @param {object} rule The validation rule from THEME_VALIDATION_RULES.
         * @param {string |* null} defaultValue The fallback value.
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
        }

        /**
         * @description Checks if all CSS selectors defined in the CONSTANTS.SELECTORS object are valid and exist in the current DOM.
         * @returns {boolean} True if all selectors are valid, otherwise false.
         */
        checkSelectors() {
            // Automatically create the checklist from the CONSTANTS.SELECTORS object.
            const selectorsToCheck = Object.entries(CONSTANTS.SELECTORS).map(([key, selector]) => {
                // Create a description from the key name.
                const desc = key.replace(/_/g, ' ').toLowerCase().replace(/ \w/g, L => L.toUpperCase());
                return {
                    selector,
                    desc
                };
            });
            let allOK = true;
            console.groupCollapsed(LOG_PREFIX, "CSS Selector Check");
            for (const {
                selector,
                desc
            } of selectorsToCheck) {
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
                Logger.log("🎉 All essential selectors are currently valid!");
            } else {
                Logger.warn("⚠ One or more essential selectors are NOT found or invalid. The script might not function correctly.");
            }
            console.groupEnd();
            return allOK;
        }

    }

    // ---- Script Entry Point ----
    const automator = new ThemeAutomator();
    const sentinel = new Sentinel(OWNERID);

    // Use the text input area as a reliable signal that the UI is fully interactive.
    const ANCHOR_SELECTOR = CONSTANTS.SELECTORS.INPUT_TEXT_FIELD_TARGET;
    let isInitialized = false;

    // Use the Sentinel to wait for the main UI container to appear.
    sentinel.on(ANCHOR_SELECTOR, () => {
        // Run the full initialization only once.
        if (isInitialized) return;
        isInitialized = true;

        Logger.log('Anchor element detected. Initializing the script...');
        automator.init().then(() => {
            PlatformAdapter.applyFixes(automator);
        });
    });

    // ---- Debugging ----
    // Description: Exposes a debug object to the console.
    try {
        const debugApi = {};
        if (automator.debugManager) {
            const proto = Object.getPrototypeOf(automator.debugManager);
            const methodNames = Object.getOwnPropertyNames(proto)
            .filter(key =>
                    typeof automator.debugManager[key] === 'function' &&
                    key !== 'constructor' &&
                    !key.startsWith('_')
                   );

            for (const key of methodNames) {
                debugApi[key] = automator.debugManager[key].bind(automator.debugManager);
            }
        }

        if (typeof automator.checkSelectors === "function") {
            debugApi.checkSelectors = automator.checkSelectors.bind(automator);
        }

        // fallback help if not defined
        if (typeof debugApi.help !== "function") {
            debugApi.help = () => {
                console.table(Object.keys(debugApi));
                Logger.log("All available debug commands listed above.");
            };
            Logger.warn("debugManager.help not found, fallback help() defined.");
        }

        if (typeof exportFunction === 'function') {
            exportFunction(debugApi, unsafeWindow, { defineAs: `${APPID}Debug` });
        } else if (typeof unsafeWindow !== 'undefined') {
            unsafeWindow[`${APPID}Debug`] = debugApi;
        }

        Logger.log(`Debug tools are available. Use \`${APPID}Debug.help()\` in the console for a list of commands.`);
    } catch (e) {
        Logger.error("Could not expose debug object to console.", e);
    }

})();