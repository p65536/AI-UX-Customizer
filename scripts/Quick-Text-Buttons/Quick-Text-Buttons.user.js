// ==UserScript==
// @name         Quick-Text-Buttons
// @namespace    https://github.com/p65536
// @version      1.2.0
// @license      MIT
// @description  Adds customizable buttons to paste predefined text into the input field on ChatGPT/Gemini.
// @icon         https://raw.githubusercontent.com/p65536/p65536/main/images/qtb.ico
// @author       p65536
// @match        https://chatgpt.com/*
// @match        https://gemini.google.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @run-at       document-idle
// @noframes
// ==/UserScript==

(() => {
    'use strict';

    // =================================================================================
    // SECTION: Script-Specific Definitions (DO NOT COPY TO OTHER PLATFORM)
    // =================================================================================

    const OWNERID = 'p65536';
    const APPID = 'qtbux';
    const APPNAME = 'Quick Text Buttons';
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
    // SECTION: Platform-Specific Adapter
    // Description: Centralizes all platform-specific logic, such as selectors and
    //              DOM manipulation strategies.
    // =================================================================================

    const PlatformAdapters = {
        General: {
            getPlatformDetails() {
                const { host } = location;
                if (host.includes('chatgpt.com')) {
                    return {
                        platformId: 'chatgpt',
                        selectors: {
                            ANCHOR_ELEMENT: 'div.ProseMirror#prompt-textarea',
                            CANVAS_CONTAINER: 'section.popover header h2',
                        },
                    };
                }
                if (host.includes('gemini.google.com')) {
                    return {
                        platformId: 'gemini',
                        selectors: {
                            ANCHOR_ELEMENT: 'rich-textarea .ql-editor',
                            CANVAS_CONTAINER: 'immersive-panel',
                        },
                    };
                }
                return null;
            },

            /**
             * Finds the editor element and delegates the text insertion task to the EditorController.
             * @param {string} text The text to insert.
             * @param {object} options The insertion options.
             */
            insertText(text, options = {}) {
                const platform = this.getPlatformDetails();
                if (!platform) {
                    Logger.error('Platform details not found.');
                    return;
                }

                const editor = document.querySelector(platform.selectors.ANCHOR_ELEMENT);
                if (!editor) {
                    Logger.error('Input element not found via selector:', platform.selectors.ANCHOR_ELEMENT);
                    return;
                }

                // Delegate the complex insertion logic to the specialized controller.
                EditorController.insertText(text, editor, options, platform.platformId);
            },
        },

        UI: {
            repositionButtons(uiManager) {
                const platform = PlatformAdapters.General.getPlatformDetails();
                if (!platform || !uiManager) return;

                // --- No-op for Gemini ---
                if (platform.platformId === 'gemini') {
                    return;
                }

                // --- ChatGPT Logic ---
                if (platform.platformId === 'chatgpt') {
                    const { settingsBtn, insertBtn } = uiManager.components;
                    if (!settingsBtn?.element || !insertBtn?.element) return;

                    const canvasTitle = document.querySelector(platform.selectors.CANVAS_CONTAINER);

                    if (canvasTitle) {
                        const canvasPanel = canvasTitle.closest('section.popover');
                        if (canvasPanel) {
                            const canvasRect = canvasPanel.getBoundingClientRect();
                            const offset = CONSTANTS.POSITIONING.GPT_CANVAS_OFFSET_PX;
                            const gap = CONSTANTS.POSITIONING.GPT_BUTTON_GAP_PX;

                            // Position Settings Button to the left of the canvas
                            settingsBtn.element.style.right = '';
                            settingsBtn.element.style.left = `${canvasRect.left - offset}px`;

                            // Position Insert Button to the left of the Settings Button
                            const settingsBtnWidth = settingsBtn.element.offsetWidth;
                            insertBtn.element.style.right = '';
                            insertBtn.element.style.left = `${canvasRect.left - offset - settingsBtnWidth - gap}px`;
                            return;
                        }
                    }

                    // --- Fallback / Revert to default position ---
                    settingsBtn.element.style.left = '';
                    settingsBtn.element.style.right = settingsBtn.options.position.right;

                    insertBtn.element.style.left = '';
                    insertBtn.element.style.right = insertBtn.options.position.right;
                }
            },
        },

        Observer: {
            /**
             * Returns an array of platform-specific observer initialization functions.
             * @returns {Function[]} An array of functions to be called by ObserverManager.
             */
            getInitializers() {
                return [this.startCanvasObserver];
            },

            /**
             * @private
             * @description Starts an observer for ChatGPT's Canvas panel resizing.
             * This method is called by ObserverManager, with the manager instance bound to `this`.
             */
            startCanvasObserver() {
                const platform = PlatformAdapters.General.getPlatformDetails();
                if (!platform || platform.platformId !== 'chatgpt') return;

                let canvasResizeObserver = null;
                let lastCanvasState = false;

                const checkCanvasState = () => {
                    const canvasPanel = document.querySelector(platform.selectors.CANVAS_CONTAINER)?.closest('section.popover');
                    const isCanvasActive = !!canvasPanel;

                    if (isCanvasActive === lastCanvasState) return;
                    lastCanvasState = isCanvasActive;

                    // Disconnect any previous observer to prevent memory leaks
                    canvasResizeObserver?.disconnect();
                    canvasResizeObserver = null;

                    if (isCanvasActive) {
                        // Canvas appeared, attach resize observer specifically to the canvas panel
                        canvasResizeObserver = new ResizeObserver(this.debouncedCanvasResized);
                        canvasResizeObserver.observe(canvasPanel);
                    }
                    // Always trigger a state change event when the canvas appears or disappears
                    this.debouncedCanvasStateChanged();
                };

                const debouncedStateCheck = debounce(checkCanvasState, CONSTANTS.POSITIONING.RECALC_DEBOUNCE_MS);
                const canvasDetectionObserver = new MutationObserver(debouncedStateCheck);
                canvasDetectionObserver.observe(document.body, { childList: true, subtree: true });

                // Initial check on load
                checkCanvasState();
            },
        },
    };

    // =================================================================================
    // SECTION: Editor Controller
    // Description: Handles all direct DOM manipulation and logic for rich text editors.
    // =================================================================================

    class EditorController {
        /**
         * Inserts text for rich text editors (ChatGPT/Gemini) using a full replacement strategy.
         * @param {string} text The text to insert.
         * @param {HTMLElement} editor The target editor element.
         * @param {object} options The insertion options.
         * @param {string} platformId The ID of the current platform ('chatgpt' or 'gemini').
         */
        static insertText(text, editor, options, platformId) {
            setTimeout(() => {
                editor.focus();

                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) {
                    Logger.error('Could not get selection or range.');
                    return;
                }
                const range = selection.getRangeAt(0);

                // 1. Get existing text, handling ChatGPT's restored state
                let existingText;
                const paragraphs = Array.from(editor.childNodes).filter((n) => n.nodeName === 'P');
                // A restored state in ChatGPT is characterized by a single <p> containing newlines.
                const isRestoredState = platformId === 'chatgpt' && paragraphs.length === 1 && paragraphs[0].textContent.includes('\n');

                if (isRestoredState) {
                    // For the restored state, get text content directly from the single paragraph.
                    existingText = paragraphs[0].textContent;
                } else {
                    // For the normal multi-<p> state, use the standard parsing logic.
                    existingText = this._getTextFromEditor(editor, platformId);
                }

                let cursorPos = 0;
                const isEditorFocused = editor.contains(selection.anchorNode);

                if (options.insertion_position === 'cursor' && isEditorFocused) {
                    cursorPos = this._getCursorPositionInText(editor, platformId);
                } else if (options.insertion_position === 'start') {
                    cursorPos = 0;
                } else {
                    // 'end' or 'cursor' but not focused
                    cursorPos = existingText.length;
                }

                // 2. Prepare the text to be inserted
                let textToInsert = text;
                if (options.insert_before_newline) textToInsert = '\n' + textToInsert;
                if (options.insert_after_newline) textToInsert += '\n';

                // 3. Construct the final, complete text and new cursor position
                const finalText = existingText.slice(0, cursorPos) + textToInsert + existingText.slice(cursorPos);
                const newCursorPos = cursorPos + textToInsert.length;

                // 4. Build a single DOM fragment for the entire new content
                const finalFragment = this._createTextFragmentForEditor(finalText, platformId);

                // 5. Replace editor content safely using Range API
                range.selectNodeContents(editor);
                range.deleteContents();
                range.insertNode(finalFragment);

                // 6. Set the cursor to the end of the inserted text
                this._setCursorPositionByOffset(editor, newCursorPos);

                // 7. Platform-specific cleanup
                if (platformId === 'gemini') {
                    editor.classList.remove('ql-blank');
                }

                // 8. Dispatch events to notify the editor of the change
                editor.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
                editor.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
            }, 100);
        }

        /**
         * Retrieves the plain text content from the editor (ChatGPT or Gemini).
         * @param {HTMLElement} editor The target editor element.
         * @param {string} platformId The ID of the current platform.
         * @returns {string} The plain text content.
         * @private
         */
        static _getTextFromEditor(editor, platformId) {
            if (platformId === 'chatgpt' && editor.querySelector('p.placeholder')) {
                return '';
            }
            // Gemini's initial state is <p><br></p>, which should be treated as empty.
            if (platformId === 'gemini' && editor.childNodes.length === 1 && editor.firstChild.nodeName === 'P' && editor.firstChild.innerHTML === '<br>') {
                return '';
            }

            const lines = [];

            for (const p of editor.childNodes) {
                if (p.nodeName !== 'P') continue;

                const isStructuralEmptyLine = p.childNodes.length === 1 && p.firstChild.nodeName === 'BR';
                let isEmptyLine = false;

                if (isStructuralEmptyLine) {
                    if (platformId === 'chatgpt') {
                        // For ChatGPT, the class must also match for it to be a true empty line paragraph.
                        isEmptyLine = p.firstChild.className === 'ProseMirror-trailingBreak';
                    } else {
                        // For Gemini, the structure alone is sufficient.
                        isEmptyLine = true;
                    }
                }

                if (isEmptyLine) {
                    lines.push('');
                } else {
                    lines.push(p.textContent);
                }
            }
            return lines.join('\n');
        }

        /**
         * Calculates the cursor's character offset within the plain text representation of the editor.
         * @param {HTMLElement} editor The editor element.
         * @param {string} platformId The ID of the current platform.
         * @returns {number} The character offset of the cursor.
         * @private
         */
        static _getCursorPositionInText(editor, platformId) {
            const selection = window.getSelection();
            if (!selection.rangeCount) return 0;

            const range = selection.getRangeAt(0);
            if (!editor.contains(range.startContainer)) return 0;

            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(editor);
            preCaretRange.setEnd(range.startContainer, range.startOffset);

            const tempDiv = document.createElement('div');
            tempDiv.appendChild(preCaretRange.cloneContents());

            const textBeforeCursor = this._getTextFromEditor(tempDiv, platformId);
            return textBeforeCursor.length;
        }

        /**
         * Creates a DocumentFragment based on the editor's expected <p> structure.
         * @param {string} text The plain text to convert, with newlines as \n.
         * @param {string} platformId The ID of the current platform.
         * @returns {DocumentFragment} The constructed fragment.
         * @private
         */
        static _createTextFragmentForEditor(text, platformId) {
            const fragment = document.createDocumentFragment();
            const lines = text.split('\n');

            lines.forEach((line) => {
                const p = document.createElement('p');
                if (line === '') {
                    const br = document.createElement('br');
                    if (platformId === 'chatgpt') {
                        br.className = 'ProseMirror-trailingBreak';
                    }
                    p.appendChild(br);
                } else {
                    p.appendChild(document.createTextNode(line));
                }
                fragment.appendChild(p);
            });
            return fragment;
        }

        /**
         * Sets the cursor position within the editor based on a character offset.
         * @param {HTMLElement} editor The editor element.
         * @param {number} offset The target character offset from a plain text representation (with \n).
         * @private
         */
        static _setCursorPositionByOffset(editor, offset) {
            const selection = window.getSelection();
            if (!selection) return;

            const range = document.createRange();
            let charCount = 0;
            let lastNode = editor; // Fallback node

            const paragraphs = Array.from(editor.childNodes).filter((n) => n.nodeName === 'P');

            for (let i = 0; i < paragraphs.length; i++) {
                const p = paragraphs[i];
                lastNode = p;
                const treeWalker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null, false);
                let textNode = null;

                while ((textNode = treeWalker.nextNode())) {
                    lastNode = textNode;
                    const nodeLength = textNode.textContent.length;
                    if (charCount + nodeLength >= offset) {
                        range.setStart(textNode, offset - charCount);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        return; // Position found and set.
                    }
                    charCount += nodeLength;
                }

                // After processing a paragraph, account for the newline character,
                // but only if it's not the last paragraph.
                if (i < paragraphs.length - 1) {
                    if (charCount === offset) {
                        // This case handles when the cursor position is exactly at the newline.
                        // We place the cursor at the end of the current paragraph.
                        range.selectNodeContents(p);
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        return;
                    }
                    charCount++; // Increment for the newline
                }
            }

            // If the offset is beyond all text, place cursor at the end of the last node.
            range.selectNodeContents(lastNode);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    // =================================================================================
    // SECTION: Configuration and Constants
    // Description: Defines default settings, global constants, and CSS selectors.
    // =================================================================================

    const CONSTANTS = {
        CONFIG_KEY: `${APPID}_config`,
        CONFIG_SIZE_LIMIT_BYTES: 5033164, // 4.8MB
        ID_PREFIX: `${APPID}-id-`,
        TEXT_LIST_WIDTH: 500,
        HIDE_DELAY_MS: 250,
        MODAL: {
            WIDTH: 440,
            PADDING: 16,
            RADIUS: 8,
            BTN_RADIUS: 5,
            BTN_FONT_SIZE: 13,
            BTN_PADDING: '5px 16px',
            TITLE_MARGIN_BOTTOM: 8,
            BTN_GROUP_GAP: 8,
            TEXTAREA_HEIGHT: 200,
        },
        POSITIONING: {
            RECALC_DEBOUNCE_MS: 150,
            GPT_CANVAS_OFFSET_PX: 136,
            GPT_BUTTON_GAP_PX: 8,
        },
        UI_DEFAULTS: {
            SETTINGS_BUTTON_POSITION: { top: '10px', right: '360px' },
            INSERT_BUTTON_POSITION: { top: '10px', right: '400px' },
        },
    };

    // ---- Site-specific Style Variables ----
    const SITE_STYLES = {
        chatgpt: {
            SETTINGS_BUTTON: {
                background: 'var(--interactive-bg-secondary-default)',
                borderColor: 'var(--interactive-border-secondary-default)',
                backgroundHover: 'var(--interactive-bg-secondary-hover)',
                borderRadius: 'var(--radius-md, 4px)',
                iconDef: {
                    tag: 'svg',
                    props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' },
                    children: [
                        {
                            tag: 'path',
                            props: {
                                d: 'M270-80q-45 0-77.5-30.5T160-186v-558q0-38 23.5-68t61.5-38l395-78v640l-379 76q-9 2-15 9.5t-6 16.5q0 11 9 18.5t21 7.5h450v-640h80v720H270Zm90-233 200-39v-478l-200 39v478Zm-80 16v-478l-15 3q-11 2-18 9.5t-7 18.5v457q5-2 10.5-3.5T261-293l19-4Zm-40-472v482-482Z',
                            },
                        },
                    ],
                },
            },
            INSERT_BUTTON: {
                background: 'var(--interactive-bg-secondary-default)',
                borderColor: 'var(--interactive-border-secondary-default)',
                backgroundHover: 'var(--interactive-bg-secondary-hover)',
                borderRadius: 'var(--radius-md, 4px)',
                iconDef: {
                    tag: 'svg',
                    props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 0 24 24', width: '24px', fill: 'currentColor' },
                    children: [
                        { tag: 'path', props: { d: 'M0 0h24v24H0V0z', fill: 'none' } },
                        {
                            tag: 'path',
                            props: { d: 'M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z' },
                        },
                    ],
                },
            },
            SETTINGS_PANEL: {
                bg: 'var(--sidebar-surface-primary)',
                text_primary: 'var(--text-primary)',
                text_secondary: 'var(--text-secondary)',
                border_medium: 'var(--border-medium)',
                border_default: 'var(--border-default)',
                border_light: 'var(--border-light)',
                accent_color: 'var(--text-accent)',
                input_bg: 'var(--bg-primary)',
                input_text: 'var(--text-primary)',
                input_border: 'var(--border-default)',
                toggle_bg_off: 'var(--bg-primary)',
                toggle_bg_on: 'var(--text-accent)',
                toggle_knob: 'var(--text-primary)',
            },
            JSON_MODAL: {
                bg: 'var(--main-surface-primary)',
                text: 'var(--text-primary)',
                border: 'var(--border-default)',
                btn_bg: 'var(--interactive-bg-tertiary-default)',
                btn_hover_bg: 'var(--interactive-bg-secondary-hover)',
                btn_text: 'var(--text-primary)',
                btn_border: 'var(--border-default)',
                textarea_bg: 'var(--bg-primary)',
                textarea_text: 'var(--text-primary)',
                textarea_border: 'var(--border-default)',
                msg_error_text: 'var(--text-danger)',
                msg_success_text: 'var(--text-accent)',
            },
            THEME_MODAL: {
                modal_bg: 'var(--main-surface-primary)',
                modal_text: 'var(--text-primary)',
                modal_border: 'var(--border-default)',
                btn_bg: 'var(--interactive-bg-tertiary-default)',
                btn_hover_bg: 'var(--interactive-bg-secondary-hover)',
                btn_text: 'var(--text-primary)',
                btn_border: 'var(--border-default)',
                error_text: 'var(--text-danger)',
                delete_confirm_label_text: 'var(--text-danger)',
                delete_confirm_btn_text: 'var(--interactive-label-danger-secondary-default)',
                delete_confirm_btn_bg: 'var(--interactive-bg-danger-secondary-default)',
                delete_confirm_btn_hover_text: 'var(--interactive-label-danger-secondary-hover)',
                delete_confirm_btn_hover_bg: 'var(--interactive-bg-danger-secondary-hover)',
                fieldset_border: 'var(--border-medium)',
                legend_text: 'var(--text-secondary)',
                label_text: 'var(--text-secondary)',
                input_bg: 'var(--bg-primary)',
                input_text: 'var(--text-primary)',
                input_border: 'var(--border-default)',
                slider_display_text: 'var(--text-secondary)',
                popup_bg: 'var(--main-surface-primary)',
                popup_border: 'var(--border-default)',
                dnd_indicator_color: 'var(--text-accent)',
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
                deleteIconDef: {
                    tag: 'svg',
                    props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' },
                    children: [{ tag: 'path', props: { d: 'm256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z' } }],
                },
            },
            TEXT_LIST: {
                bg: 'var(--main-surface-primary)',
                text: 'var(--text-primary)',
                border: 'var(--border-light)',
                shadow: 'var(--drop-shadow-md, 0 3px 3px #0000001f)',
                separator_bg: 'var(--border-default)',
                tab_bg: 'var(--interactive-bg-tertiary-default)',
                tab_text: 'var(--text-primary)',
                tab_border: 'var(--border-light)',
                tab_hover_bg: 'var(--interactive-bg-secondary-hover)',
                tab_active_bg: 'var(--interactive-bg-secondary-hover)',
                tab_active_border: 'var(--border-default)',
                tab_active_outline: 'var(--border-default)',
                option_bg: 'var(--interactive-bg-tertiary-default)',
                option_text: 'var(--text-primary)',
                option_border: 'var(--border-default)',
                option_hover_bg: 'var(--interactive-bg-secondary-hover)',
                option_hover_border: 'var(--border-default)',
                option_hover_outline: 'var(--border-default)',
            },
        },
        gemini: {
            SETTINGS_BUTTON: {
                background: 'var(--gem-sys-color--surface-container-high)',
                borderColor: 'var(--gem-sys-color--outline)',
                backgroundHover: 'var(--gem-sys-color--surface-container-higher)',
                borderRadius: 'var(--radius-md, 4px)',
                iconDef: {
                    tag: 'svg',
                    props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' },
                    children: [
                        {
                            tag: 'path',
                            props: {
                                d: 'M270-80q-45 0-77.5-30.5T160-186v-558q0-38 23.5-68t61.5-38l395-78v640l-379 76q-9 2-15 9.5t-6 16.5q0 11 9 18.5t21 7.5h450v-640h80v720H270Zm90-233 200-39v-478l-200 39v478Zm-80 16v-478l-15 3q-11 2-18 9.5t-7 18.5v457q5-2 10.5-3.5T261-293l19-4Zm-40-472v482-482Z',
                            },
                        },
                    ],
                },
            },
            INSERT_BUTTON: {
                background: 'var(--gem-sys-color--surface-container-high)',
                borderColor: 'var(--gem-sys-color--outline)',
                backgroundHover: 'var(--gem-sys-color--surface-container-higher)',
                borderRadius: 'var(--radius-md, 4px)',
                iconDef: {
                    tag: 'svg',
                    props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 0 24 24', width: '24px', fill: 'currentColor' },
                    children: [
                        { tag: 'path', props: { d: 'M0 0h24v24H0V0z', fill: 'none' } },
                        {
                            tag: 'path',
                            props: { d: 'M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z' },
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
                accent_color: 'var(--gem-sys-color--primary)',
                input_bg: 'var(--gem-sys-color--surface-container-low)',
                input_text: 'var(--gem-sys-color--on-surface)',
                input_border: 'var(--gem-sys-color--outline)',
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
                deleteIconDef: {
                    tag: 'svg',
                    props: { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' },
                    children: [{ tag: 'path', props: { d: 'm256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z' } }],
                },
            },
            TEXT_LIST: {
                bg: 'var(--gem-sys-color--surface-container-high)',
                text: 'var(--gem-sys-color--on-surface)',
                border: 'var(--gem-sys-color--outline)',
                shadow: '0 4px 12px rgba(0,0,0,0.25)',
                separator_bg: 'var(--gem-sys-color--outline-variant)',
                tab_bg: 'var(--gem-sys-color--surface-container)',
                tab_text: 'var(--gem-sys-color--on-surface-variant)',
                tab_border: 'var(--gem-sys-color--outline)',
                tab_hover_bg: 'var(--gem-sys-color--surface-container-higher)',
                tab_active_bg: 'var(--gem-sys-color--surface-container-higher)',
                tab_active_border: 'var(--gem-sys-color--primary)',
                tab_active_outline: 'var(--gem-sys-color--primary)',
                option_bg: 'var(--gem-sys-color--surface-container)',
                option_text: 'var(--gem-sys-color--on-surface-variant)',
                option_border: 'var(--gem-sys-color--outline)',
                option_hover_bg: 'var(--gem-sys-color--surface-container-higher)',
                option_hover_border: 'var(--gem-sys-color--outline)',
                option_hover_outline: 'var(--gem-sys-color--primary)',
            },
        },
    };

    const DEFAULT_CONFIG = {
        options: {
            insert_before_newline: false,
            insert_after_newline: false,
            insertion_position: 'cursor', // 'cursor', 'start', 'end'
            activeProfileName: 'Default',
        },
        texts: {
            Default: {
                Test: [
                    '[TEST MESSAGE] You can ignore this message.',
                    'Tell me something interesting.',
                    'Based on all of our previous conversations, generate an image of me as you imagine. Make it super-realistic. Please feel free to fill in any missing information with your own imagination. Do not ask follow-up questions; generate the image immediately.',
                    'Based on all of our previous conversations, generate an image of my ideal partner (opposite sex) as you imagine. Make it super-realistic. Please feel free to fill in any missing information with your own imagination. Do not ask follow-up questions; generate the image immediately.',
                    'Based on all of our previous conversations, generate an image of a person who is the exact opposite of my ideal partner. Make it super-realistic. Please feel free to fill in any missing information with your own imagination. Do not ask follow-up questions; generate the image immediately.',
                ],
                Images: [
                    'For each generated image, include an "image number" (e.g., Image 1, Image 2, ...), a title, and an image description.\n\n',
                    'Refer to the body shape and illustration style in the attached images, and draw the same person. Pay special attention to maintaining character consistency.\n\n',
                    'Feel free to illustrate a scene from everyday life. You can choose the composition or situation. If you are depicting consecutive scenes (a story), make sure to keep everything consistent (e.g., do not change clothing for no reason).\n\n',
                ],
                Coding: [
                    '### Code Editing Rules (Apply to the entire chat)\nStrictly follow these rules for all code suggestions, changes, optimizations, and Canvas reflection:\n1. **Do not modify any part of the code that is not being edited.**\n   * This includes blank lines, comments, variable names, order, etc. **Strictly keep all unmodified parts as is.**\n2. **Always leave concise, meaningful comments.**\n   * Limit comments to content that aids understanding or future maintenance. Do not include formal or duplicate notes.\n3. **When proposing or changing code, clearly state the intent and scope.**\n   * Example: "Improve performance of this function," "Simplify this conditional branch," etc.\n4. **Apply the above rules even for Canvas reflection.**\n   * Do not reformat, remove, or reorder content on the GPT side.\n5. **Preserve the overall style of the code (indentation, newlines, etc.).**\n   * Only edited parts should stand out clearly as differences.\n\n',
                    'Optimize the following script according to modern design guidelines.\nWhile maintaining its purpose and function, improve the structure, readability, and extensibility.\nIf there are improvements, clearly indicate them in the code comments and compare Before→After.\n\n```\n```\n\n',
                ],
                Summary: [
                    'STEP 1: For this chat log, do not summarize, but clearly show the structure of the content. Please output in the following format:\n\n- 🔹 List of topics (each topic heading and its starting point)\n- 🧷 List of technical terms / keywords / commands / proper nouns\n- 📌 Key statements marking turning points in the discussion (quotes allowed)\n\n[NOTE]\nThe goal is not to summarize, but to "enumerate and organize the topics."\nGive priority to extracting important elements while maintaining context.\n',
                    'STEP 2: For this chat log, enumerate the content as it is, without summarizing or restructuring.\n\nSample output format:\n1. [Start] Consulted about PowerShell script character encoding error\n2. [Proposal] Suggested UTF-8 with BOM save\n3. [Clarification] Clarified misunderstanding about Shift-JIS (e.g., cp932)\n4. [Conclusion] Decided on UTF-8-only approach with PowerShell\n\n[NOTE]\nMaintain the original order of topics. The goal is not to summarize, but to list "what was discussed" and "what conclusions were drawn."',
                    "STEP 3: Provide a mid-level summary for each topic in this chat log.\nCompression ratio can be low. Do not omit topics, and keep granularity somewhat fine.\n\nSample output format:\n## Chat title (or date)\n\n### Topic 1: About XXXXX\n- Overview:\n- Main discussion points:\n- Tentative conclusion or direction:\n\n### Topic 2: About YYYYY\n- ...\n\n[NOTE]\nIt's okay to be verbose. Ensure important details are not omitted so that a human can organize them later.",
                    'STEP 4: For each topic in this chat log, add the following indicators:\n\n- [Importance]: High / Medium / Low\n- [Reference recommended]: Yes / No (Is it worth reusing/repurposing?)\n- [Reference keywords]: About 3 search keywords\n\nThe purpose is to provide criteria for organizing or deleting this record in the future.',
                ],
                Memory: [
                    '[Memory list output] Please display all currently stored model set context (memory list) for me.\nSeparate by category, output concisely and accurately.',
                    '[Add to memory] Please add the following content to the model set context:\n\n[Category] (e.g., PowerShell)\n[Content]\n- Always unify the log output folder for PowerShell scripts to a "logs" subfolder.\n- Internal comments in scripts should be written in Japanese.\n\nPlease consistently refer to this information as context and policy in future conversations.',
                    '[Edit memory] Please edit the following memory content:\n\n[Target category] PowerShell\n[Current text to be edited] The default encoding for PowerShell scripts is "UTF-8 with BOM."\n[New text] The default encoding for PowerShell scripts is "UTF-8 without BOM."\n\nBe sure to discard the old information and replace it with the new information.',
                    '[Delete memory] Please completely delete the following memory content:\n\n[Target category] Image generation (Haruna)\n[Text to be deleted]\n- Always include an image number and situation description (caption) when generating images.\n\nEnsure that this information is completely removed and will not affect future conversations.',
                    'Summarize everything you have learned about our conversation and commit it to the memory update.',
                ],
            },
        },
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
            this.events[event] = this.events[event].filter((l) => l !== listener);

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
            [...this.events[event]].forEach((listener) => {
                try {
                    listener(...args);
                } catch (e) {
                    Logger.error(`EventBus error in listener for event "${event}":`, e);
                }
            });
        },
    };

    // =================================================================================
    // SECTION: Utility Functions
    // =================================================================================

    /**
     * @param {Function} func
     * @param {number} delay
     * @returns {Function}
     */
    function debounce(func, delay) {
        let timeout;
        return function (...args) {
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
        const el = isSVG ? document.createElementNS(SVG_NS, tagName) : document.createElement(tagName);

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
        const children = def.children ? def.children.map((child) => createIconFromDef(child)) : [];
        return h(def.tag, def.props, children);
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
                throw new Error('configKey and defaultConfig must be provided.');
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
                defaultConfig: DEFAULT_CONFIG,
            });
        }

        /**
         * @override
         * Loads the configuration from storage, merges it with defaults, and sanitizes it.
         * The final, complete configuration is stored in `this.config`.
         */
        async load() {
            const raw = await GM_getValue(this.CONFIG_KEY);
            let userConfig = null;
            if (raw) {
                try {
                    userConfig = JSON.parse(raw);
                } catch (e) {
                    Logger.error('Failed to parse configuration. Using default settings.', e);
                    userConfig = null;
                }
            }
            this.config = this._processAndSanitize(userConfig);
        }

        /**
         * @override
         * Processes, sanitizes, and saves the configuration object to storage.
         * @param {object} obj The configuration object to save.
         */
        async save(obj) {
            const completeConfig = this._processAndSanitize(obj);
            const jsonString = JSON.stringify(completeConfig);
            const configSize = new Blob([jsonString]).size;

            if (configSize > CONSTANTS.CONFIG_SIZE_LIMIT_BYTES) {
                const sizeInMB = (configSize / 1024 / 1024).toFixed(2);
                const limitInMB = (CONSTANTS.CONFIG_SIZE_LIMIT_BYTES / 1024 / 1024).toFixed(1);
                const errorMsg = `Configuration size (${sizeInMB} MB) exceeds the ${limitInMB} MB limit.\nChanges are not saved.`;

                EventBus.publish(`${APPID}:configSizeExceeded`, { message: errorMsg });
                throw new Error(errorMsg);
            }

            this.config = completeConfig;
            await GM_setValue(this.CONFIG_KEY, jsonString);
            EventBus.publish(`${APPID}:configSaveSuccess`);
        }

        /**
         * Merges a user configuration with defaults and sanitizes the data structure.
         * @private
         * @param {object | null} userConfig The user configuration object, which may be partial or null.
         * @returns {object} A complete and sanitized configuration object.
         */
        _processAndSanitize(userConfig) {
            const completeConfig = JSON.parse(JSON.stringify(this.DEFAULT_CONFIG));

            if (userConfig) {
                if (isObject(userConfig.texts)) {
                    completeConfig.texts = userConfig.texts;
                }
                if (isObject(userConfig.options)) {
                    completeConfig.options = { ...completeConfig.options, ...userConfig.options };
                }
            }

            const sanitizeTextsObject = (texts) => {
                if (!isObject(texts)) return {};
                for (const profileName in texts) {
                    const profile = texts[profileName];
                    if (!isObject(profile)) {
                        Logger.warn(`Sanitizing invalid profile entry: "${profileName}" was not an object.`);
                        delete texts[profileName];
                        continue;
                    }
                    if (Object.keys(profile).length === 0) {
                        Logger.warn(`Profile "${profileName}" has no categories. Adding a default category.`);
                        profile['New Category'] = [];
                    }
                    for (const categoryName in profile) {
                        const category = profile[categoryName];
                        if (!Array.isArray(category)) {
                            Logger.warn(`Sanitizing invalid category entry: "${categoryName}" in profile "${profileName}" was not an array.`);
                            delete profile[categoryName];
                            continue;
                        }
                        profile[categoryName] = category.map((text, i) => {
                            if (typeof text !== 'string') {
                                Logger.warn(`Sanitizing invalid text entry: Item at index ${i} in category "${categoryName}" was not a string.`);
                                return String(text);
                            }
                            return text;
                        });
                    }
                }
                return texts;
            };

            completeConfig.texts = sanitizeTextsObject(completeConfig.texts);

            if (!completeConfig.texts || Object.keys(completeConfig.texts).length === 0) {
                completeConfig.texts = JSON.parse(JSON.stringify(this.DEFAULT_CONFIG.texts));
                Logger.warn('Configuration resulted in no profiles. Restoring default texts to prevent errors.');
            }

            const profileKeys = Object.keys(completeConfig.texts);
            const activeProfileName = completeConfig.options.activeProfileName;
            if (!Object.prototype.hasOwnProperty.call(completeConfig.texts, activeProfileName)) {
                Logger.log(`Active profile "${activeProfileName}" not found. Setting the first available profile as active.`);
                completeConfig.options.activeProfileName = profileKeys[0];
            }

            return completeConfig;
        }

        /**
         * Decodes a raw string from storage into a user configuration object.
         * @param {string | null} rawValue The raw string from GM_getValue.
         * @returns {Promise<object | null>} The parsed user configuration object, or null if parsing fails.
         */
        async decode(rawValue) {
            if (!rawValue) return null;
            try {
                const parsed = JSON.parse(rawValue);
                if (isObject(parsed)) {
                    return parsed;
                }
                return null;
            } catch (e) {
                Logger.error(`Failed to parse raw value. Error: ${e.message}`);
                return null;
            }
        }

        /**
         * @override
         * @protected
         */
        _validateAndSanitizeOptions() {
            // This logic is now part of _processAndSanitize.
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
            throw new Error('Component must implement render method.');
        }

        destroy() {
            this.element?.remove();
            this.element = null;
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
            const buttons = this.options.buttons.map((btnDef) => {
                const fullClassName = [`${p}-button`, btnDef.className].filter(Boolean).join(' ');
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
            this.element = h(
                `dialog.${p}-dialog`,
                (modalBox = h(`div.${p}-box`, { style: { width: this.options.width } }, [
                    (header = h(`div.${p}-header`, this.options.title)),
                    (content = h(`div.${p}-content`)),
                    (footer = h(`div.${p}-footer`, [(footerMessage = h(`div.${p}-footer-message`)), buttonGroup])),
                ]))
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
            this.debouncedSave = debounce(this._handleDebouncedSave.bind(this), 300);
            this._handleDocumentClick = this._handleDocumentClick.bind(this);
            this._handleDocumentKeydown = this._handleDocumentKeydown.bind(this);
        }

        /**
         * @private
         * Collects data and calls the onSave callback. Designed to be debounced.
         */
        async _handleDebouncedSave() {
            const newConfig = await this._collectDataFromForm();
            this.callbacks.onSave?.(newConfig);
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
        _createPanelContent() {
            throw new Error('Subclass must implement _createPanelContent()');
        }
        _injectStyles() {
            throw new Error('Subclass must implement _injectStyles()');
        }
        populateForm() {
            throw new Error('Subclass must implement populateForm()');
        }
        _collectDataFromForm() {
            throw new Error('Subclass must implement _collectDataFromForm()');
        }
        _setupEventListeners() {
            throw new Error('Subclass must implement _setupEventListeners()');
        }
    }

    class SettingsPanelComponent extends SettingsPanelBase {
        _createPanelContent() {
            const createToggle = (id, title) => {
                return h(`label.${APPID}-toggle-switch`, { title }, [h('input', { type: 'checkbox', id: id }), h(`span.${APPID}-toggle-slider`)]);
            };
            return h('div', [
                h(`fieldset.${APPID}-submenu-fieldset`, [
                    h('legend', 'Profile'),
                    h(`select#${APPID}-profile-select`, {
                        title: 'Select the active profile.',
                    }),
                ]),
                h(`div.${APPID}-submenu-top-row`, [
                    h(`fieldset.${APPID}-submenu-fieldset`, [
                        h('legend', 'Texts'),
                        h(
                            `button#${APPID}-submenu-edit-texts-btn.${APPID}-modal-button`,
                            {
                                style: { width: '100%' },
                                title: 'Open the text editor.',
                            },
                            'Edit Texts...'
                        ),
                    ]),
                    h(`fieldset.${APPID}-submenu-fieldset`, [
                        h('legend', 'JSON'),
                        h(
                            `button#${APPID}-submenu-json-btn.${APPID}-modal-button`,
                            {
                                style: { width: '100%' },
                                title: 'Opens the advanced settings modal to directly edit, import, or export the entire configuration in JSON format.',
                            },
                            'JSON...'
                        ),
                    ]),
                ]),
                h(`fieldset.${APPID}-submenu-fieldset`, [
                    h('legend', 'Options'),
                    h(`div.${APPID}-submenu-row`, [h('label', { htmlFor: `${APPID}-opt-insert-before-newline` }, 'Insert newline before text'), createToggle(`${APPID}-opt-insert-before-newline`, 'Adds a newline character before the inserted text.')]),
                    h(`div.${APPID}-submenu-row`, [h('label', { htmlFor: `${APPID}-opt-insert-after-newline` }, 'Insert newline after text'), createToggle(`${APPID}-opt-insert-after-newline`, 'Adds a newline character after the inserted text.')]),
                    h(`div.${APPID}-submenu-separator`),
                    h(`div.${APPID}-submenu-row-stacked`, [
                        h('label', { htmlFor: `${APPID}-insertion-pos-slider`, title: 'Determines where the text is inserted in the input field.' }, 'Insertion position'),
                        h(`div.${APPID}-slider-wrapper`, [
                            h('input', {
                                type: 'range',
                                id: `${APPID}-insertion-pos-slider`,
                                min: '0',
                                max: '2',
                                step: '1',
                            }),
                            h(`span#${APPID}-slider-value-display`),
                        ]),
                    ]),
                    h(`div.${APPID}-settings-note`, `Note: Option behavior may depend on the input field’s state (focus and existing content). For consistent results, click an insert button while the input field is focused.`),
                ]),
            ]);
        }

        async populateForm() {
            const config = await this.callbacks.getCurrentConfig();
            if (!config || !config.options) return;

            const profileSelect = this.element.querySelector(`#${APPID}-profile-select`);
            profileSelect.textContent = '';
            const profileNames = Object.keys(config.texts);
            profileNames.forEach((name) => {
                const option = h('option', { value: name }, name);
                profileSelect.appendChild(option);
            });
            profileSelect.value = config.options.activeProfileName || profileNames[0] || '';

            this.element.querySelector(`#${APPID}-opt-insert-before-newline`).checked = config.options.insert_before_newline;
            this.element.querySelector(`#${APPID}-opt-insert-after-newline`).checked = config.options.insert_after_newline;
            const positionMap = { start: '0', cursor: '1', end: '2' };
            const positionValue = config.options.insertion_position || 'cursor';
            const sliderValue = positionMap[positionValue];

            const slider = this.element.querySelector(`#${APPID}-insertion-pos-slider`);
            slider.value = sliderValue;
            this._updateSliderAppearance(slider);
        }

        async _collectDataFromForm() {
            const currentConfig = await this.callbacks.getCurrentConfig();
            const newConfig = JSON.parse(JSON.stringify(currentConfig));

            if (!newConfig.options) newConfig.options = {};

            const profileSelect = this.element.querySelector(`#${APPID}-profile-select`);
            newConfig.options.activeProfileName = profileSelect.value;

            newConfig.options.insert_before_newline = this.element.querySelector(`#${APPID}-opt-insert-before-newline`).checked;
            newConfig.options.insert_after_newline = this.element.querySelector(`#${APPID}-opt-insert-after-newline`).checked;
            const valueMap = { 0: 'start', 1: 'cursor', 2: 'end' };
            const slider = this.element.querySelector(`#${APPID}-insertion-pos-slider`);
            newConfig.options.insertion_position = valueMap[slider.value] || 'cursor';
            return newConfig;
        }

        _setupEventListeners() {
            this.element.querySelector(`#${APPID}-submenu-edit-texts-btn`).addEventListener('click', () => {
                this.callbacks.onShowTextEditorModal?.();
                this.hide();
            });
            this.element.querySelector(`#${APPID}-submenu-json-btn`).addEventListener('click', () => {
                this.callbacks.onShowJsonModal?.();
                this.hide();
            });
            this.element.querySelector(`#${APPID}-profile-select`).addEventListener('change', this.debouncedSave);

            this.element.querySelector(`#${APPID}-opt-insert-before-newline`).addEventListener('change', this.debouncedSave);
            this.element.querySelector(`#${APPID}-opt-insert-after-newline`).addEventListener('change', this.debouncedSave);

            const slider = this.element.querySelector(`#${APPID}-insertion-pos-slider`);
            slider.addEventListener('input', () => this._updateSliderAppearance(slider));
            slider.addEventListener('change', this.debouncedSave);
        }

        _updateSliderAppearance(slider) {
            const display = this.element.querySelector(`#${APPID}-slider-value-display`);
            const displayMap = { 0: 'Start', 1: 'Cursor', 2: 'End' };
            const value = slider.value;
            display.textContent = displayMap[value];
            slider.dataset.value = value;
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
                    z-index: 11000;
                    border: 1px solid ${styles.border_medium};
                    font-size: 0.9em;
                }
                .${APPID}-submenu-top-row {
                    display: flex; gap: 12px;
                }
                .${APPID}-submenu-top-row .${APPID}-submenu-fieldset {
                    flex: 1 1 0px;
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
                .${APPID}-submenu-fieldset select {
                    width: 100%;
                    box-sizing: border-box;
                    background: ${styles.input_bg};
                    border: 1px solid ${styles.input_border};
                    color: ${styles.input_text};
                    border-radius: 4px;
                    padding: 4px 6px;
                }
                .${APPID}-submenu-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-top: 8px;
                }
                .${APPID}-submenu-row-stacked {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 4px;
                    margin-top: 8px;
                }
                .${APPID}-submenu-separator {
                    border-top: 1px solid ${styles.border_light};
                    margin: 12px 0;
                }
                .${APPID}-settings-note {
                    font-size: 0.85em;
                    color: ${styles.text_secondary};
                    text-align: left;
                    margin-top: 8px;
                    padding: 0 4px;
                }
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
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: ${styles.toggle_bg_off};
                    transition: .3s;
                    border-radius: 22px;
                    border: 1px solid ${styles.input_border};
                }
                .${APPID}-toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 2px;
                    bottom: 2px;
                    background-color: ${styles.toggle_knob};
                    transition: .3s;
                    border-radius: 50%;
                }
                .${APPID}-toggle-switch input:checked + .${APPID}-toggle-slider {
                    background-color: ${styles.toggle_bg_on};
                    border-color: ${styles.toggle_bg_on};
                }
                .${APPID}-toggle-switch input:checked + .${APPID}-toggle-slider:before {
                    background-color: #fff;
                    transform: translateX(18px);
                }
                .${APPID}-slider-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-top: 4px;
                }
                #${APPID}-insertion-pos-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 100%;
                    flex-grow: 1;
                    height: 8px;
                    border-radius: 5px;
                    outline: none;
                    background: linear-gradient(to right, ${styles.input_bg} 0%, ${styles.input_bg} 100%);
                }
                #${APPID}-insertion-pos-slider[data-value="0"] {
                    background: linear-gradient(to right, ${styles.accent_color} 0%, ${styles.accent_color} 33.3%, ${styles.input_bg} 33.3%, ${styles.input_bg} 100%);
                }
                #${APPID}-insertion-pos-slider[data-value="1"] {
                    background: linear-gradient(to right, ${styles.input_bg} 0%, ${styles.input_bg} 33.3%, ${styles.accent_color} 33.3%, ${styles.accent_color} 66.6%, ${styles.input_bg} 66.6%, ${styles.input_bg} 100%);
                }
                #${APPID}-insertion-pos-slider[data-value="2"] {
                    background: linear-gradient(to right, ${styles.input_bg} 0%, ${styles.input_bg} 66.6%, ${styles.accent_color} 66.6%, ${styles.accent_color} 100%);
                }
                #${APPID}-insertion-pos-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    background: ${styles.accent_color};
                    cursor: pointer;
                    border-radius: 50%;
                    margin-top: -5px;
                }
                #${APPID}-insertion-pos-slider::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    background: ${styles.accent_color};
                    cursor: pointer;
                    border-radius: 50%;
                    border: none;
                }
                #${APPID}-slider-value-display {
                    font-weight: 500;
                    min-width: 50px;
                    text-align: right;
                    color: ${styles.text_secondary};
                }
            `,
            });
            document.head.appendChild(style);
        }
    }

    /**
     * Manages the Text Settings modal by leveraging the CustomModal component.
     */
    class TextEditorModalComponent extends UIComponentBase {
        constructor(callbacks) {
            super(callbacks);
            this.activeProfileKey = null;
            this.activeCategoryKey = null;
            this.pendingDeletion = null;
            this.modal = null;
            this.draggedIndex = null;
            this.renameState = {
                type: null,
                isActive: false,
            };
        }

        render() {
            this._injectStyles();
        }

        async open(anchorElement) {
            // Reset all local UI states every time the modal is opened.
            // This is the simplest and most robust way to ensure a clean state.
            this.renameState = { type: null, isActive: false };
            this.pendingDeletion = null;

            if (this.modal) return;

            this.callbacks.onModalOpenStateChange?.(true);
            this.modal = new CustomModal({
                title: `${APPNAME} - Settings`,
                width: '880px',
                cssPrefix: `${APPID}-editor-modal-shell`,
                closeOnBackdropClick: false,
                buttons: [
                    { text: 'Apply', id: `${APPID}-editor-modal-apply-btn`, className: `${APPID}-modal-button`, title: 'Save changes and keep the modal open.', onClick: () => this._handleSaveAction(false) },
                    { text: 'Save', id: `${APPID}-editor-modal-save-btn`, className: `${APPID}-modal-button`, title: 'Save changes and close the modal.', onClick: () => this._handleSaveAction(true) },
                    { text: 'Cancel', id: `${APPID}-editor-modal-cancel-btn`, className: `${APPID}-modal-button`, title: 'Discard changes and close the modal.', onClick: () => this.close() },
                ],
                onDestroy: () => {
                    this.callbacks.onModalOpenStateChange?.(false);
                    this.modal = null;
                },
            });

            this._applyThemeToModal();
            const headerControls = this._createHeaderControls();
            const mainContent = this._createMainContent();
            this.modal.dom.header.appendChild(headerControls);
            this.modal.setContent(mainContent);

            this._setupEventListeners();

            const config = await this.callbacks.getCurrentConfig();
            if (config) {
                this.activeProfileKey = config.options.activeProfileName || Object.keys(config.texts)[0];
                const activeProfile = config.texts[this.activeProfileKey] || {};
                this.activeCategoryKey = Object.keys(activeProfile)[0] || null;
                await this._refreshModalState();
            }

            this.modal.show(anchorElement);
            requestAnimationFrame(() => {
                const scrollableArea = this.modal.element.querySelector(`.${APPID}-editor-scrollable-area`);
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

            const profileKeys = Object.keys(config.texts);
            const activeProfile = config.texts[this.activeProfileKey] || {};
            const categoryKeys = Object.keys(activeProfile);
            const isAnyRenaming = this.renameState.isActive;
            const isAnyDeleting = !!this.pendingDeletion;

            const profileRow = this.modal.element.querySelector(`.${APPID}-header-row[data-type="profile"]`);
            const categoryRow = this.modal.element.querySelector(`.${APPID}-header-row[data-type="category"]`);
            const scrollArea = this.modal.element.querySelector(`.${APPID}-editor-scrollable-area`);

            const isProfileDisabled = (isAnyRenaming && this.renameState.type !== 'profile') || (isAnyDeleting && this.pendingDeletion?.type !== 'profile');
            const isCategoryDisabled = (isAnyRenaming && this.renameState.type !== 'category') || (isAnyDeleting && this.pendingDeletion?.type !== 'category');
            profileRow.classList.toggle('is-disabled', isProfileDisabled);
            categoryRow.classList.toggle('is-disabled', isCategoryDisabled);

            const updateRow = (row, type, keys, activeKey) => {
                const isRenamingThis = isAnyRenaming && this.renameState.type === type;
                const isDeletingThis = this.pendingDeletion?.type === type;

                const select = row.querySelector('select');
                const renameInput = row.querySelector('input[type="text"]');
                const mainActions = row.querySelector(`.${APPID}-main-actions`);
                const renameActions = row.querySelector(`.${APPID}-rename-actions`);
                const deleteConfirmGroup = row.querySelector(`.${APPID}-delete-confirm-group`);

                const showMainActions = !isRenamingThis && !isDeletingThis;
                select.style.display = isRenamingThis ? 'none' : 'block';
                renameInput.style.display = isRenamingThis ? 'block' : 'none';
                mainActions.style.visibility = showMainActions ? 'visible' : 'hidden';
                renameActions.style.display = isRenamingThis ? 'flex' : 'none';
                deleteConfirmGroup.style.display = isDeletingThis ? 'flex' : 'none';

                if (!isRenamingThis) {
                    const scroll = select.scrollTop;
                    select.textContent = '';
                    keys.forEach((key) => select.appendChild(h('option', { value: key }, key)));
                    select.value = activeKey;
                    select.scrollTop = scroll;
                } else {
                    renameInput.value = activeKey;
                }

                const isAnyActionInProgress = isAnyRenaming || isAnyDeleting;
                const upBtn = row.querySelector(`#${APPID}-${type}-up-btn`);
                const downBtn = row.querySelector(`#${APPID}-${type}-down-btn`);
                const deleteBtn = row.querySelector(`#${APPID}-${type}-delete-btn`);
                const newBtn = row.querySelector(`#${APPID}-${type}-new-btn`);
                const copyBtn = row.querySelector(`#${APPID}-${type}-copy-btn`);
                const renameBtn = row.querySelector(`#${APPID}-${type}-rename-btn`);
                const index = keys.indexOf(activeKey);

                if (upBtn) upBtn.disabled = isAnyActionInProgress || index <= 0;
                if (downBtn) downBtn.disabled = isAnyActionInProgress || index >= keys.length - 1;
                if (deleteBtn) deleteBtn.disabled = isAnyActionInProgress || keys.length <= 1;
                if (newBtn) newBtn.disabled = isAnyActionInProgress;
                if (copyBtn) copyBtn.disabled = isAnyActionInProgress;
                if (renameBtn) renameBtn.disabled = isAnyActionInProgress;
            };

            updateRow(profileRow, 'profile', profileKeys, this.activeProfileKey);
            updateRow(categoryRow, 'category', categoryKeys, this.activeCategoryKey);

            const isAnyActionInProgress = isAnyRenaming || isAnyDeleting;
            scrollArea.classList.toggle('is-disabled', isAnyActionInProgress);
            this.modal.element.querySelector(`#${APPID}-text-new-btn`).disabled = isAnyActionInProgress;
            this.modal.element.querySelector(`#${APPID}-editor-modal-apply-btn`).disabled = isAnyActionInProgress;
            this.modal.element.querySelector(`#${APPID}-editor-modal-save-btn`).disabled = isAnyActionInProgress;
            this.modal.element.querySelector(`#${APPID}-editor-modal-cancel-btn`).disabled = isAnyActionInProgress;

            if (!isAnyActionInProgress) {
                const texts = activeProfile[this.activeCategoryKey] || [];
                this._renderTextList(texts);
            }
        }

        _applyThemeToModal() {
            if (!this.modal) return;
            const modalBox = this.modal.dom.modalBox;
            const p = this.modal.options.cssPrefix;
            const styles = this.callbacks.siteStyles;

            modalBox.style.setProperty(`--${p}-bg`, styles.modal_bg);
            modalBox.style.setProperty(`--${p}-text`, styles.modal_text);
            modalBox.style.setProperty(`--${p}-border-color`, styles.modal_border);
            Object.assign(this.modal.dom.header.style, {
                borderBottom: `1px solid ${styles.modal_border}`,
                paddingBottom: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '12px',
            });
            Object.assign(this.modal.dom.footer.style, {
                borderTop: `1px solid ${styles.modal_border}`,
                paddingTop: '16px',
            });
            const buttons = this.modal.dom.footer.querySelectorAll(`.${p}-button`);
            buttons.forEach((button) => {
                Object.assign(button.style, {
                    background: styles.btn_bg,
                    color: styles.btn_text,
                    border: `1px solid ${styles.btn_border}`,
                    borderRadius: `var(--radius-md, ${CONSTANTS.MODAL.BTN_RADIUS}px)`,
                    padding: CONSTANTS.MODAL.BTN_PADDING,
                    fontSize: `${CONSTANTS.MODAL.BTN_FONT_SIZE}px`,
                });
                button.addEventListener('mouseover', () => {
                    button.style.background = styles.btn_hover_bg;
                });
                button.addEventListener('mouseout', () => {
                    button.style.background = styles.btn_bg;
                });
            });
        }

        _createHeaderControls() {
            const styles = this.callbacks.siteStyles;

            const createControlRow = (type, label) => {
                return h(`div.${APPID}-header-row`, { 'data-type': type }, [
                    // Container 1: Label
                    h('label', { htmlFor: `${APPID}-${type}-select` }, label),

                    // Container 2: Select / Input
                    h(`div.${APPID}-rename-area`, [h(`select#${APPID}-${type}-select`), h('input', { type: 'text', id: `${APPID}-${type}-rename-input`, style: { display: 'none' } })]),

                    // Container 3: Action Buttons
                    h(`div.${APPID}-action-area`, [
                        h(`div.${APPID}-main-actions`, [
                            h(`button#${APPID}-${type}-rename-btn.${APPID}-modal-button`, 'Rename'),
                            h(`button#${APPID}-${type}-up-btn.${APPID}-modal-button.${APPID}-move-btn`, [createIconFromDef(styles.upIconDef)]),
                            h(`button#${APPID}-${type}-down-btn.${APPID}-modal-button.${APPID}-move-btn`, [createIconFromDef(styles.downIconDef)]),
                            h(`button#${APPID}-${type}-new-btn.${APPID}-modal-button`, 'New'),
                            h(`button#${APPID}-${type}-copy-btn.${APPID}-modal-button`, 'Copy'),
                            h(`button#${APPID}-${type}-delete-btn.${APPID}-modal-button`, 'Delete'),
                        ]),
                        h(`div.${APPID}-rename-actions`, { style: { display: 'none' } }, [h(`button#${APPID}-${type}-rename-ok-btn.${APPID}-modal-button`, 'OK'), h(`button#${APPID}-${type}-rename-cancel-btn.${APPID}-modal-button`, 'Cancel')]),
                        h(`div.${APPID}-delete-confirm-group`, { style: { display: 'none' } }, [
                            h(`span.${APPID}-delete-confirm-label`, 'Are you sure?'),
                            h(`button#${APPID}-${type}-delete-confirm-btn.${APPID}-modal-button.${APPID}-delete-confirm-btn-yes`, 'Confirm'),
                            h(`button#${APPID}-${type}-delete-cancel-btn.${APPID}-modal-button`, 'Cancel'),
                        ]),
                    ]),
                ]);
            };

            return h(`div.${APPID}-editor-modal-header-controls`, [createControlRow('profile', 'Profile:'), createControlRow('category', 'Category:')]);
        }

        _createMainContent() {
            // Remove the old fieldsets for profile/category names
            return h(`div.${APPID}-editor-modal-content`, [h(`div.${APPID}-editor-scrollable-area`), h(`button#${APPID}-text-new-btn.${APPID}-modal-button`, 'Add New Text')]);
        }

        /**
         * @private
         * @param {'profile' | 'category'} itemType The type of item to enter delete confirmation mode for.
         */
        _enterDeleteConfirmationMode(itemType) {
            if (!this.modal || this.renameState.isActive) return;

            const keyToDelete = itemType === 'profile' ? this.activeProfileKey : this.activeCategoryKey;
            if (!keyToDelete) return;

            this.pendingDeletion = { key: keyToDelete, type: itemType };
            this._refreshModalState();
        }

        _exitDeleteConfirmationMode() {
            this.pendingDeletion = null;
            if (this.modal) {
                this._refreshModalState();
            }
        }

        _setupEventListeners() {
            if (!this.modal) return;
            const modalElement = this.modal.element;
            const scrollArea = modalElement.querySelector(`.${APPID}-editor-scrollable-area`);

            // The 'cancel' event is no longer needed as state is reset in open()

            modalElement.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;

                const textItemControls = target.closest(`.${APPID}-text-item-controls`);
                if (textItemControls) {
                    const textItem = textItemControls.closest(`.${APPID}-text-item`);
                    const textarea = textItem.querySelector('textarea');
                    const index = parseInt(textarea.dataset.index, 10);

                    if (target.classList.contains('move-up-btn')) this._handleTextMove(index, -1);
                    if (target.classList.contains('move-down-btn')) this._handleTextMove(index, 1);
                    if (target.classList.contains('delete-btn')) this._handleTextDelete(index);
                    return;
                }

                const actionMap = {
                    // Profile Actions
                    [`${APPID}-profile-new-btn`]: () => this._handleItemNew('profile'),
                    [`${APPID}-profile-copy-btn`]: () => this._handleItemCopy('profile'),
                    [`${APPID}-profile-delete-btn`]: () => this._enterDeleteConfirmationMode('profile'),
                    [`${APPID}-profile-delete-confirm-btn`]: () => this._handleItemDelete(),
                    [`${APPID}-profile-delete-cancel-btn`]: () => this._exitDeleteConfirmationMode(),
                    [`${APPID}-profile-up-btn`]: () => this._handleItemMove('profile', -1),
                    [`${APPID}-profile-down-btn`]: () => this._handleItemMove('profile', 1),
                    [`${APPID}-profile-rename-btn`]: () => this._enterRenameMode('profile'),
                    [`${APPID}-profile-rename-ok-btn`]: () => this._handleRenameConfirm('profile'),
                    [`${APPID}-profile-rename-cancel-btn`]: () => this._exitRenameMode(true),
                    // Category Actions
                    [`${APPID}-category-new-btn`]: () => this._handleItemNew('category'),
                    [`${APPID}-category-copy-btn`]: () => this._handleItemCopy('category'),
                    [`${APPID}-category-delete-btn`]: () => this._enterDeleteConfirmationMode('category'),
                    [`${APPID}-category-delete-confirm-btn`]: () => this._handleItemDelete(),
                    [`${APPID}-category-delete-cancel-btn`]: () => this._exitDeleteConfirmationMode(),
                    [`${APPID}-category-up-btn`]: () => this._handleItemMove('category', -1),
                    [`${APPID}-category-down-btn`]: () => this._handleItemMove('category', 1),
                    [`${APPID}-category-rename-btn`]: () => this._enterRenameMode('category'),
                    [`${APPID}-category-rename-ok-btn`]: () => this._handleRenameConfirm('category'),
                    [`${APPID}-category-rename-cancel-btn`]: () => this._exitRenameMode(true),
                    // Text Actions
                    [`${APPID}-text-new-btn`]: () => this._handleTextNew(),
                };
                const action = actionMap[target.id];
                if (action) action();
            });
            modalElement.addEventListener('change', async (e) => {
                if (e.target.matches(`#${APPID}-profile-select`)) {
                    this.activeProfileKey = e.target.value;
                    const config = await this.callbacks.getCurrentConfig();
                    const activeProfile = config.texts[this.activeProfileKey] || {};
                    this.activeCategoryKey = Object.keys(activeProfile)[0] || null;
                    await this._refreshModalState();
                } else if (e.target.matches(`#${APPID}-category-select`)) {
                    this.activeCategoryKey = e.target.value;
                    await this._refreshModalState();
                }
            });
            modalElement.addEventListener('input', (e) => {
                const target = e.target;
                if (target.matches('textarea')) {
                    target.classList.toggle('is-invalid', target.value.trim() === '');
                    const footerMessage = this.modal?.dom?.footerMessage;
                    if (footerMessage && footerMessage.textContent) {
                        footerMessage.textContent = '';
                    }
                    this._autoResizeTextarea(target);
                }
                if (target.matches('input[type="text"]')) {
                    target.classList.remove('is-invalid');
                    const footerMessage = this.modal?.dom?.footerMessage;
                    if (footerMessage && footerMessage.textContent) {
                        footerMessage.textContent = '';
                    }
                }
            });
            modalElement.addEventListener('keydown', (e) => {
                if (e.target.matches('input[type="text"]')) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const type = e.target.id.includes('profile') ? 'profile' : 'category';
                        this._handleRenameConfirm(type);
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        this._exitRenameMode(true);
                    }
                }
            });
            modalElement.addEventListener('dragstart', (e) => {
                const handle = e.target.closest(`.${APPID}-drag-handle`);
                if (handle) {
                    const target = handle.closest(`.${APPID}-text-item`);
                    if (target && scrollArea.contains(target)) {
                        this.draggedIndex = parseInt(target.dataset.index, 10);
                        setTimeout(() => target.classList.add('dragging'), 0);
                    }
                }
            });
            modalElement.addEventListener('dragend', () => {
                if (this.draggedIndex === null) return;
                const draggingElement = scrollArea.querySelector('.dragging');
                if (draggingElement) draggingElement.classList.remove('dragging');
                this.draggedIndex = null;
            });
            scrollArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingElement = scrollArea.querySelector('.dragging');
                if (!draggingElement) return;

                scrollArea.querySelectorAll(`.${APPID}-text-item`).forEach((el) => {
                    el.classList.remove('drag-over-top', 'drag-over-bottom');
                });

                const target = e.target.closest(`.${APPID}-text-item`);
                if (target && target !== draggingElement) {
                    const box = target.getBoundingClientRect();
                    const isAfter = e.clientY > box.top + box.height / 2;
                    target.classList.toggle('drag-over-bottom', isAfter);
                    target.classList.toggle('drag-over-top', !isAfter);
                } else if (!target) {
                    const lastElement = scrollArea.querySelector(`.${APPID}-text-item:last-child:not(.dragging)`);
                    if (lastElement) {
                        lastElement.classList.add('drag-over-bottom');
                    }
                }
            });
            scrollArea.addEventListener('drop', (e) => {
                e.preventDefault();
                if (this.draggedIndex === null) return;

                const draggingElement = scrollArea.querySelector('.dragging');
                if (!draggingElement) return;

                const dropTarget = scrollArea.querySelector('.drag-over-top, .drag-over-bottom');
                if (dropTarget) {
                    if (dropTarget.classList.contains('drag-over-bottom')) {
                        scrollArea.insertBefore(draggingElement, dropTarget.nextSibling);
                    } else {
                        scrollArea.insertBefore(draggingElement, dropTarget);
                    }
                }

                scrollArea.querySelectorAll(`.${APPID}-text-item`).forEach((el) => {
                    el.classList.remove('drag-over-top', 'drag-over-bottom');
                });
                this._updateTextItemsUI();
            });
        }

        async _exitRenameMode(refresh = false) {
            if (!this.renameState.isActive) return;

            const type = this.renameState.type;
            this.renameState = { type: null, isActive: false };

            // If the modal still exists, clear validation state
            if (this.modal) {
                const input = this.modal.element.querySelector(`#${APPID}-${type}-rename-input`);
                if (input) input.classList.remove('is-invalid');

                const footerMessage = this.modal.dom.footerMessage;
                if (footerMessage) footerMessage.textContent = '';

                // Refresh the UI if requested (e.g., by Cancel button)
                if (refresh) await this._refreshModalState();
            }
        }

        _getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll(`.${APPID}-text-item:not(.dragging)`)];
            return draggableElements.reduce(
                (closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = y - box.top - box.height / 2;
                    if (offset < 0 && offset > closest.offset) {
                        return { offset: offset, element: child };
                    } else {
                        return closest;
                    }
                },
                { offset: Number.NEGATIVE_INFINITY }
            ).element;
        }

        _renderTextList(texts, indexToFocus = -1) {
            const styles = this.callbacks.siteStyles;
            const scrollArea = this.modal.element.querySelector(`.${APPID}-editor-scrollable-area`);
            scrollArea.textContent = '';

            texts.forEach((text, index) => {
                const textItem = h(
                    `div.${APPID}-text-item`,
                    {
                        'data-index': index,
                    },
                    [
                        h(`div.${APPID}-drag-handle`, { title: 'Drag to reorder', draggable: 'true' }, [
                            h('svg', { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' }, [
                                h('path', {
                                    d: 'M349.85-524.85q-14.52 0-24.68-10.16-10.17-10.17-10.17-24.69t10.17-24.68q10.16-10.17 24.68-10.17t24.69 10.17q10.16 10.16 10.16 24.68t-10.16 24.69q-10.17 10.16-24.69 10.16Zm260.3,0q-14.52 0-24.68-10.16-10.17-10.17-10.17-24.69t10.17-24.68q10.16-10.17 24.68-10.17t24.69 10.17q10.16 10.16 10.16 24.68t-10.16 24.69q-10.17 10.16-24.69 10.16Zm-260.3-170q-14.52 0-24.68-10.17-10.17-10.16-10.17-24.68t10.17-24.69q10.16-10.16 24.68-10.16t24.69 10.16q10.16 10.17 10.16 24.69t-10.16 24.68q-10.17 10.17-24.69 10.17Zm260.3,0q-14.52 0-24.68-10.17-10.17-10.16-10.17-24.68t10.17-24.69q10.16-10.16 24.68-10.16t24.69 10.16q10.16 10.17 10.16 24.69t-10.16 24.68q-10.17 10.17-24.69 10.17Zm-260.3,340q-14.52 0-24.68-10.17-10.17-10.16-10.17-24.68t10.17-24.69q10.16-10.16 24.68-10.16t24.69 10.16q10.16 10.17 10.16 24.69t-10.16 24.68q-10.17 10.17-24.69 10.17Zm260.3,0q-14.52 0-24.68-10.17-10.17-10.16-10.17-24.68t10.17-24.69q10.16-10.16 24.68-10.16t24.69 10.16q10.16 10.17 10.16 24.69t-10.16 24.68q-10.17 10.17-24.69 10.17Z',
                                }),
                            ]),
                        ]),
                        h(
                            'textarea',
                            {
                                'data-index': index,
                                rows: 3,
                                ref: (el) => {
                                    if (index === indexToFocus) {
                                        requestAnimationFrame(() => el.focus());
                                    }
                                },
                            },
                            text
                        ),
                        h(`div.${APPID}-text-item-controls`, [
                            h(`button.${APPID}-modal-button.${APPID}-move-btn.move-up-btn`, { title: 'Move up', disabled: index === 0 }, [createIconFromDef(styles.upIconDef)]),
                            h(`button.${APPID}-modal-button.${APPID}-move-btn.move-down-btn`, { title: 'Move down', disabled: index === texts.length - 1 }, [createIconFromDef(styles.downIconDef)]),
                            h(`button.${APPID}-modal-button.${APPID}-delete-btn.delete-btn`, { title: 'Delete' }, [createIconFromDef(styles.deleteIconDef)]),
                        ]),
                    ]
                );
                scrollArea.appendChild(textItem);
            });

            // Call auto-resize for all textareas after they have been added to the DOM.
            scrollArea.querySelectorAll('textarea').forEach((ta) => this._autoResizeTextarea(ta));
        }

        _collectAllDataFromForm() {
            if (!this.modal) return null;
            const scrollArea = this.modal.element.querySelector(`.${APPID}-editor-scrollable-area`);
            const textareas = scrollArea.querySelectorAll('textarea');
            const texts = Array.from(textareas).map((ta) => ta.value);

            return { texts, textareas };
        }

        _updateTextItemsUI() {
            const scrollArea = this.modal.element.querySelector(`.${APPID}-editor-scrollable-area`);
            const items = scrollArea.querySelectorAll(`.${APPID}-text-item`);

            items.forEach((item, index) => {
                item.dataset.index = index;
                const textarea = item.querySelector('textarea');
                if (textarea) textarea.dataset.index = index;

                const upBtn = item.querySelector('.move-up-btn');
                const downBtn = item.querySelector('.move-down-btn');
                if (upBtn) upBtn.disabled = index === 0;
                if (downBtn) downBtn.disabled = index === items.length - 1;
            });
        }

        _autoResizeTextarea(textarea) {
            if (!textarea) return;
            // Temporarily set height to auto to allow the textarea to shrink if text is deleted.
            textarea.style.height = 'auto';
            // Set the height to its scrollHeight to fit the content.
            textarea.style.height = `${textarea.scrollHeight}px`;
        }

        _handleTextNew() {
            const styles = this.callbacks.siteStyles;
            const scrollArea = this.modal.element.querySelector(`.${APPID}-editor-scrollable-area`);
            const items = scrollArea.querySelectorAll(`.${APPID}-text-item`);
            const newIndex = items.length;
            const newItem = h(
                `div.${APPID}-text-item`,
                {
                    'data-index': newIndex,
                },
                [
                    h(`div.${APPID}-drag-handle`, { title: 'Drag to reorder', draggable: 'true' }, [
                        h('svg', { xmlns: 'http://www.w3.org/2000/svg', height: '24px', viewBox: '0 -960 960 960', width: '24px', fill: 'currentColor' }, [
                            h('path', {
                                d: 'M349.85-524.85q-14.52 0-24.68-10.16-10.17-10.17-10.17-24.69t10.17-24.68q10.16-10.17 24.68-10.17t24.69 10.17q10.16 10.16 10.16 24.68t-10.16 24.69q-10.17 10.16-24.69 10.16Zm260.3,0q-14.52 0-24.68-10.16-10.17-10.17-10.17-24.69t10.17-24.68q10.16-10.17 24.68-10.17t24.69 10.17q10.16 10.16 10.16 24.68t-10.16 24.69q-10.17 10.16-24.69 10.16Zm-260.3-170q-14.52 0-24.68-10.17-10.17-10.16-10.17-24.68t10.17-24.69q10.16-10.16 24.68-10.16t24.69 10.16q10.16 10.17 10.16 24.69t-10.16 24.68q-10.17 10.17-24.69 10.17Zm260.3,0q-14.52 0-24.68-10.17-10.17-10.16-10.17-24.68t10.17-24.69q10.16-10.16 24.68-10.16t24.69 10.16q10.16 10.17 10.16 24.69t-10.16 24.68q-10.17 10.17-24.69 10.17Zm-260.3,340q-14.52 0-24.68-10.17-10.17-10.16-10.17-24.68t10.17-24.69q10.16-10.16 24.68-10.16t24.69 10.16q10.16 10.17 10.16 24.69t-10.16 24.68q-10.17 10.17-24.69 10.17Zm260.3,0q-14.52 0-24.68-10.17-10.17-10.16-10.17-24.68t10.17-24.69q10.16-10.16 24.68-10.16t24.69 10.16q10.16 10.17 10.16 24.69t-10.16 24.68q-10.17 10.17-24.69 10.17Z',
                            }),
                        ]),
                    ]),
                    h('textarea', {
                        'data-index': newIndex,
                        rows: 3,
                    }),
                    h(`div.${APPID}-text-item-controls`, [
                        h(`button.${APPID}-modal-button.${APPID}-move-btn.move-up-btn`, { title: 'Move up' }, [createIconFromDef(styles.upIconDef)]),
                        h(`button.${APPID}-modal-button.${APPID}-move-btn.move-down-btn`, { title: 'Move down' }, [createIconFromDef(styles.downIconDef)]),
                        h(`button.${APPID}-modal-button.${APPID}-delete-btn.delete-btn`, { title: 'Delete' }, [createIconFromDef(styles.deleteIconDef)]),
                    ]),
                ]
            );

            scrollArea.appendChild(newItem);
            this._updateTextItemsUI();

            const newTextarea = newItem.querySelector('textarea');
            if (newTextarea) {
                this._autoResizeTextarea(newTextarea);
                newTextarea.focus();
            }
        }

        _handleTextDelete(index) {
            const scrollArea = this.modal.element.querySelector(`.${APPID}-editor-scrollable-area`);
            const itemToDelete = scrollArea.querySelector(`.${APPID}-text-item[data-index="${index}"]`);
            if (itemToDelete) {
                itemToDelete.remove();
                this._updateTextItemsUI();
            }
        }

        _handleTextMove(index, direction) {
            const scrollArea = this.modal.element.querySelector(`.${APPID}-editor-scrollable-area`);
            const items = Array.from(scrollArea.querySelectorAll(`.${APPID}-text-item`));
            const newIndex = index + direction;

            if (newIndex < 0 || newIndex >= items.length) return;
            const currentItem = items[index];
            const targetItem = items[newIndex];

            if (direction === -1) {
                // Move up
                scrollArea.insertBefore(currentItem, targetItem);
            } else {
                // Move down
                scrollArea.insertBefore(currentItem, targetItem.nextSibling);
            }

            this._updateTextItemsUI();
        }

        /**
         * @private
         * @param {'profile' | 'category'} itemType The type of item to create.
         */
        async _handleItemNew(itemType) {
            const config = await this.callbacks.getCurrentConfig();
            const newConfig = JSON.parse(JSON.stringify(config));

            if (itemType === 'profile') {
                const existingKeys = Object.keys(newConfig.texts);
                const newName = proposeUniqueName('New Profile', existingKeys);
                newConfig.texts[newName] = { 'New Category': [] };
                await this.callbacks.onSave(newConfig);

                this.activeProfileKey = newName;
                this.activeCategoryKey = 'New Category';
            } else {
                // category
                if (!this.activeProfileKey) return;
                const activeProfile = newConfig.texts[this.activeProfileKey] || {};
                const existingKeys = Object.keys(activeProfile);
                const newName = proposeUniqueName('New Category', existingKeys);
                newConfig.texts[this.activeProfileKey][newName] = [];
                await this.callbacks.onSave(newConfig);

                this.activeCategoryKey = newName;
            }

            await this._refreshModalState();
            this._enterRenameMode(itemType);
        }

        /**
         * @private
         * @param {'profile' | 'category'} itemType The type of item to copy.
         */
        async _handleItemCopy(itemType) {
            const config = await this.callbacks.getCurrentConfig();
            const newConfig = JSON.parse(JSON.stringify(config));

            if (itemType === 'profile') {
                if (!this.activeProfileKey) return;
                const itemToCopy = JSON.parse(JSON.stringify(newConfig.texts[this.activeProfileKey]));
                const existingKeys = Object.keys(newConfig.texts);
                const newName = proposeUniqueName(`${this.activeProfileKey} Copy`, existingKeys);

                const keys = Object.keys(newConfig.texts);
                const insertIndex = keys.indexOf(this.activeProfileKey) + 1;
                const reorderedItems = {};
                keys.slice(0, insertIndex).forEach((key) => (reorderedItems[key] = newConfig.texts[key]));
                reorderedItems[newName] = itemToCopy;
                keys.slice(insertIndex).forEach((key) => (reorderedItems[key] = newConfig.texts[key]));
                newConfig.texts = reorderedItems;

                this.activeProfileKey = newName;
                this.activeCategoryKey = Object.keys(itemToCopy)[0] || null;
            } else {
                // category
                if (!this.activeProfileKey || !this.activeCategoryKey) return;
                const activeProfile = newConfig.texts[this.activeProfileKey];
                const itemToCopy = JSON.parse(JSON.stringify(activeProfile[this.activeCategoryKey]));
                const existingKeys = Object.keys(activeProfile);
                const newName = proposeUniqueName(`${this.activeCategoryKey} Copy`, existingKeys);

                const keys = Object.keys(activeProfile);
                const insertIndex = keys.indexOf(this.activeCategoryKey) + 1;
                const reorderedItems = {};
                keys.slice(0, insertIndex).forEach((key) => (reorderedItems[key] = activeProfile[key]));
                reorderedItems[newName] = itemToCopy;
                keys.slice(insertIndex).forEach((key) => (reorderedItems[key] = activeProfile[key]));
                newConfig.texts[this.activeProfileKey] = reorderedItems;

                this.activeCategoryKey = newName;
            }

            await this.callbacks.onSave(newConfig);
            await this._refreshModalState();
        }

        /**
         * @private
         */
        async _handleItemDelete() {
            const { key: keyToDelete, type: itemType } = this.pendingDeletion;
            if (!keyToDelete) {
                this._exitDeleteConfirmationMode();
                return;
            }

            const config = await this.callbacks.getCurrentConfig();
            const newConfig = JSON.parse(JSON.stringify(config));

            if (itemType === 'profile') {
                const keys = Object.keys(newConfig.texts);
                const currentIndex = keys.indexOf(keyToDelete);
                delete newConfig.texts[keyToDelete];

                if (newConfig.options.activeProfileName === keyToDelete) {
                    const latestKeys = Object.keys(newConfig.texts);
                    const nextIndex = Math.max(0, currentIndex - 1);
                    newConfig.options.activeProfileName = latestKeys[nextIndex] || (latestKeys.length > 0 ? latestKeys[0] : null);
                }

                this.activeProfileKey = newConfig.options.activeProfileName;
                const activeProfile = newConfig.texts[this.activeProfileKey] || {};
                this.activeCategoryKey = Object.keys(activeProfile)[0] || null;
            } else {
                // category
                if (!this.activeProfileKey) return;
                const activeProfile = newConfig.texts[this.activeProfileKey];
                const keys = Object.keys(activeProfile);
                const currentIndex = keys.indexOf(keyToDelete);
                delete newConfig.texts[this.activeProfileKey][keyToDelete];

                const latestKeys = Object.keys(newConfig.texts[this.activeProfileKey]);
                const nextIndex = Math.max(0, currentIndex - 1);
                this.activeCategoryKey = latestKeys[nextIndex] || (latestKeys.length > 0 ? latestKeys[0] : null);
            }

            await this.callbacks.onSave(newConfig);
            this._exitDeleteConfirmationMode();
            await this._refreshModalState();
        }

        /**
         * @private
         * @param {'profile' | 'category'} itemType The type of item to move.
         * @param {number} direction The direction to move (-1 for up, 1 for down).
         */
        async _handleItemMove(itemType, direction) {
            const config = await this.callbacks.getCurrentConfig();
            const newConfig = JSON.parse(JSON.stringify(config));
            let keys, dataContext, activeKey;

            if (itemType === 'profile') {
                if (!this.activeProfileKey) return;
                keys = Object.keys(newConfig.texts);
                dataContext = newConfig.texts;
                activeKey = this.activeProfileKey;
            } else {
                // category
                if (!this.activeProfileKey || !this.activeCategoryKey) return;
                dataContext = newConfig.texts[this.activeProfileKey];
                if (!dataContext) return;
                keys = Object.keys(dataContext);
                activeKey = this.activeCategoryKey;
            }

            const currentIndex = keys.indexOf(activeKey);
            const newIndex = currentIndex + direction;
            if (newIndex < 0 || newIndex >= keys.length) return;

            [keys[currentIndex], keys[newIndex]] = [keys[newIndex], keys[currentIndex]];
            const reorderedItems = {};
            keys.forEach((key) => {
                reorderedItems[key] = dataContext[key];
            });

            if (itemType === 'profile') {
                newConfig.texts = reorderedItems;
            } else {
                newConfig.texts[this.activeProfileKey] = reorderedItems;
            }

            await this.callbacks.onSave(newConfig);
            await this._refreshModalState();
        }

        async _handleSaveAction(shouldClose) {
            const footerMessage = this.modal?.dom?.footerMessage;
            if (footerMessage) {
                footerMessage.textContent = '';
                footerMessage.style.color = this.callbacks.siteStyles.error_text;
            }
            this.modal.element.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));

            // Collect only text area data
            const formData = this._collectAllDataFromForm();
            let isFormValid = true;

            // --- Validation (only for text areas) ---
            formData.textareas.forEach((ta) => {
                if (ta.value.trim() === '') {
                    ta.classList.add('is-invalid');
                    isFormValid = false;
                }
            });
            if (!isFormValid) {
                if (footerMessage) footerMessage.textContent = 'Text fields cannot be empty.';
                return;
            }

            // --- Config Update (only for text areas) ---
            const { texts } = formData;
            const config = await this.callbacks.getCurrentConfig();
            let newConfig = JSON.parse(JSON.stringify(config));

            // Check if the active profile and category still exist
            if (newConfig.texts[this.activeProfileKey] && Object.prototype.hasOwnProperty.call(newConfig.texts[this.activeProfileKey], this.activeCategoryKey)) {
                newConfig.texts[this.activeProfileKey][this.activeCategoryKey] = texts;
            } else {
                // This case should ideally not happen in normal flow
                Logger.warn('Could not save texts because the active profile or category was not found.');
                if (footerMessage) footerMessage.textContent = 'Error: Active profile or category not found.';
                return;
            }

            // --- Final Save and UI Update ---
            try {
                await this.callbacks.onSave(newConfig);
                if (shouldClose) {
                    this.close();
                } else {
                    // Just stay on the current view
                    await this._refreshModalState();
                }
            } catch (e) {
                if (footerMessage) footerMessage.textContent = e.message;
            }
        }

        async _enterRenameMode(type) {
            if (this.renameState.isActive) return;

            this.renameState = {
                type: type,
                isActive: true,
            };

            await this._refreshModalState();

            // Focus and select text in the new input
            const input = this.modal.element.querySelector(`#${APPID}-${type}-rename-input`);
            if (input) {
                input.focus();
                input.select();
            }
        }

        async _handleRenameConfirm(type) {
            const footerMessage = this.modal?.dom?.footerMessage;
            const input = this.modal.element.querySelector(`#${APPID}-${type}-rename-input`);
            const newName = input.value.trim();
            const oldName = type === 'profile' ? this.activeProfileKey : this.activeCategoryKey;

            // --- Validation ---
            if (!newName) {
                if (footerMessage) {
                    footerMessage.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} name cannot be empty.`;
                    footerMessage.style.color = this.callbacks.siteStyles.error_text;
                }
                input.classList.add('is-invalid');
                return;
            }

            const config = await this.callbacks.getCurrentConfig();
            let existingKeys;
            if (type === 'profile') {
                existingKeys = Object.keys(config.texts);
            } else {
                existingKeys = Object.keys(config.texts[this.activeProfileKey] || {});
            }

            if (newName.toLowerCase() !== oldName.toLowerCase() && existingKeys.some((k) => k.toLowerCase() === newName.toLowerCase())) {
                if (footerMessage) {
                    footerMessage.textContent = `Name "${newName}" is already in use.`;
                    footerMessage.style.color = this.callbacks.siteStyles.error_text;
                }
                input.classList.add('is-invalid');
                return;
            }

            // --- Config Update ---
            const newConfig = JSON.parse(JSON.stringify(config));

            if (type === 'profile') {
                const reorderedProfiles = {};
                for (const key of Object.keys(newConfig.texts)) {
                    if (key === oldName) {
                        reorderedProfiles[newName] = newConfig.texts[key];
                    } else {
                        reorderedProfiles[key] = newConfig.texts[key];
                    }
                }
                newConfig.texts = reorderedProfiles;
                newConfig.options.activeProfileName = newName;
                this.activeProfileKey = newName;
            } else {
                // type === 'category'
                const profileData = newConfig.texts[this.activeProfileKey];
                const reorderedCategories = {};
                for (const key of Object.keys(profileData)) {
                    if (key === oldName) {
                        reorderedCategories[newName] = profileData[key];
                    } else {
                        reorderedCategories[key] = profileData[key];
                    }
                }
                newConfig.texts[this.activeProfileKey] = reorderedCategories;
                this.activeCategoryKey = newName;
            }

            // --- Save and Exit ---
            try {
                await this.callbacks.onSave(newConfig);
                await this._exitRenameMode(true);
            } catch (e) {
                if (footerMessage) footerMessage.textContent = `Save failed: ${e.message}`;
            }
        }

        _injectStyles() {
            const styleId = `${APPID}-editor-modal-styles`;
            if (document.getElementById(styleId)) return;

            const styles = this.callbacks.siteStyles;
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .${APPID}-editor-modal-header-controls {
                  display: flex;
                  flex-direction: column;
                  gap: 12px;
                }
                .${APPID}-header-row {
                  display: grid;
                  /* Label | Flexible Input | Action Buttons */
                  grid-template-columns: 5.5rem 1fr auto;
                  gap: 8px;
                  align-items: center;
                }
                .${APPID}-header-row.is-disabled {
                  opacity: 0.5;
                  pointer-events: none;
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
                /* Stacking trick: place all button groups in the same cell */
                .${APPID}-action-area > * {
                    grid-area: 1 / 1;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .${APPID}-main-actions,
                .${APPID}-rename-actions {
                    justify-content: flex-start;
                }
                .${APPID}-delete-confirm-group {
                  justify-content: flex-end;
                  display: none;
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
                .${APPID}-editor-modal-content {
                  display: flex;
                  flex-direction: column;
                  gap: 12px;
                  height: 60vh;
                  min-height: 400px;
                  overflow: hidden;
                }
                .${APPID}-editor-scrollable-area {
                  flex-grow: 1;
                  overflow-y: auto;
                  padding: 4px 8px 4px 4px;
                  display: flex;
                  flex-direction: column;
                  gap: 12px;
                  border: 1px solid ${styles.input_border};
                  border-radius: 4px;
                  background: ${styles.input_bg};
                  transition: opacity 0.2s;
                }
                .${APPID}-editor-scrollable-area.is-disabled {
                  pointer-events: none;
                  opacity: 0.5;
                }
                .${APPID}-drag-handle {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 24px;
                  flex-shrink: 0;
                  align-self: center;
                  cursor: grab;
                  color: ${styles.label_text};
                  opacity: 0.6;
                }
                .${APPID}-drag-handle:hover {
                  opacity: 1;
                }
                .${APPID}-drag-handle:active {
                  cursor: grabbing;
                }
                .${APPID}-text-item {
                  display: flex;
                  align-items: flex-start;
                  gap: 8px;
                  padding: 4px;
                  border-radius: 4px;
                  border-top: 2px solid transparent;
                  border-bottom: 2px solid transparent;
                  transition: background-color 0.2s, border-color 0.1s;
                }
                .${APPID}-text-item.dragging {
                  opacity: 0.4;
                  background-color: rgba(255,255,255,0.1);
                }
                .${APPID}-text-item.drag-over-top {
                  border-top: 2px solid ${styles.dnd_indicator_color};
                }
                .${APPID}-text-item.drag-over-bottom {
                  border-bottom: 2px solid ${styles.dnd_indicator_color};
                }
                .${APPID}-text-item textarea {
                  flex-grow: 1;
                  resize: none;
                  min-height: 80px;
                  max-height: 250px;
                  overflow-y: auto;
                  font-family: monospace;
                }
                .${APPID}-text-item.dragging textarea {
                  pointer-events: none;
                }
                .${APPID}-editor-modal-shell-box .is-invalid {
                  border-color: ${styles.error_text} !important;
                }
                .${APPID}-text-item-controls {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
                }
                .${APPID}-editor-modal-shell-box input,
                .${APPID}-editor-modal-shell-box textarea,
                .${APPID}-editor-modal-shell-box select {
                  background: ${styles.input_bg};
                  border: 1px solid ${styles.input_border};
                  border-radius: 4px;
                  box-sizing: border-box;
                  color: ${styles.input_text};
                  padding: 6px 8px;
                  width: 100%;
                }
                 .${APPID}-modal-button {
                  background: ${styles.btn_bg};
                  border: 1px solid ${styles.btn_border};
                  border-radius: var(--radius-md, ${CONSTANTS.MODAL.BTN_RADIUS}px);
                  color: ${styles.btn_text};
                  cursor: pointer;
                  font-size: ${CONSTANTS.MODAL.BTN_FONT_SIZE}px;
                  padding: ${CONSTANTS.MODAL.BTN_PADDING};
                  transition: background 0.12s, color 0.12s, opacity 0.12s;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  white-space: nowrap;
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
                .${APPID}-modal-button.${APPID}-move-btn {
                  line-height: 1;
                  min-width: 24px;
                  padding: 4px;
                  height: 24px;
                  width: 24px;
                }
                 .${APPID}-modal-button.${APPID}-delete-btn {
                  line-height: 1;
                  min-width: 24px;
                  padding: 4px;
                  height: 24px;
                  width: 24px;
                  font-size: 16px;
                  color: ${styles.delete_confirm_label_text};
                }
                .${APPID}-editor-modal-shell-footer-message.${APPID}-conflict-text {
                    color: ${styles.error_text};
                    display: flex;
                    align-items: center;
                }
                #${APPID}-conflict-reload-btn {
                    border-color: ${styles.error_text};
                }
            `;
            document.head.appendChild(style);
        }

        getContextForReopen() {
            return { type: 'textEditor', key: this.activeCategoryKey };
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
                },
            });
            // Apply App specific theme to the generic modal
            this._applyTheme();
            const contentContainer = this.modal.getContentContainer();
            this._createContent(contentContainer);

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
            buttons.forEach((button) => {
                button.classList.add(`${APPID}-modal-button`);
                button.style.background = styles.btn_bg;
                button.style.color = styles.btn_text;
                button.style.border = `1px solid ${styles.btn_border}`;
                button.addEventListener('mouseover', () => {
                    button.style.background = styles.btn_hover_bg;
                });
                button.addEventListener('mouseout', () => {
                    button.style.background = styles.btn_bg;
                });
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
                    download: `${APPID}_config.json`,
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
                },
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

    class InsertButtonComponent extends UIComponentBase {
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
                    this.callbacks.onClick?.(e);
                },
                onmouseenter: (e) => this.callbacks.onMouseEnter?.(e),
                onmouseleave: (e) => this.callbacks.onMouseLeave?.(e),
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

        /** @private */
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
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                    pointer-events: auto !important;
                }
                #${this.id}:hover {
                    background: ${siteStyles.backgroundHover};
                    border-color: ${siteStyles.borderColorHover || siteStyles.borderColor};
                }
            `,
            });
            document.head.appendChild(style);
        }
    }

    class TextListComponent extends UIComponentBase {
        constructor(callbacks, options) {
            super(callbacks);
            this.options = options;
            this.id = this.options.id;
            this.styleId = `${this.id}-style`;
            this.elements = {
                tabsContainer: null,
                optionsContainer: null,
            };
        }

        render() {
            this._injectStyles();

            this.element = h(
                `div#${this.id}`,
                {
                    style: { display: 'none' },
                    onmouseenter: (e) => this.callbacks.onMouseEnter?.(e),
                    onmouseleave: (e) => this.callbacks.onMouseLeave?.(e),
                },
                [(this.elements.tabsContainer = h(`div.${APPID}-category-tabs`)), h(`div.${APPID}-category-separator`), (this.elements.optionsContainer = h(`div.${APPID}-text-options`))]
            );

            document.body.appendChild(this.element);
            return this.element;
        }

        /** @private */
        _injectStyles() {
            if (document.getElementById(this.styleId)) return;
            const styles = this.options.siteStyles;

            const style = h('style', {
                id: this.styleId,
                textContent: `
                #${this.id} {
                    position: fixed;
                    z-index: 20001;
                    display: none;
                    min-width: ${CONSTANTS.TEXT_LIST_WIDTH}px;
                    max-width: ${CONSTANTS.TEXT_LIST_WIDTH}px;
                    padding: 8px;
                    border-radius: var(--radius-md, 4px);
                    background: ${styles.bg};
                    color: ${styles.text};
                    border: 1px solid ${styles.border};
                    box-shadow: ${styles.shadow};
                }
                .${APPID}-category-tabs {
                    display: flex;
                    margin-bottom: 5px;
                }
                .${APPID}-category-separator {
                    height: 1px;
                    margin: 4px 0;
                    background: ${styles.separator_bg};
                }
                .${APPID}-category-tab {
                    flex: 1 1 0;
                    min-width: 0;
                    max-width: 90px;
                    margin-right: 4px;
                    padding: 4px 0;
                    border-radius: var(--radius-md, 4px);
                    font-size: 12px;
                    text-align: center;
                    background: ${styles.tab_bg};
                    color: ${styles.tab_text};
                    border: 1px solid ${styles.tab_border};
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .${APPID}-category-tab.active {
                    background: ${styles.tab_active_bg};
                    border-color: ${styles.tab_active_border};
                    outline: 2px solid ${styles.tab_active_outline};
                }
                .${APPID}-category-tab:hover {
                    background: ${styles.tab_hover_bg};
                }
                .${APPID}-text-options {
                    /* No specific styles needed */
                }
                .${APPID}-text-option {
                    display: block;
                    width: 100%;
                    margin: 4px 0;
                    padding: 4px;
                    font-size: 13px;
                    text-align: left;
                    border-radius: var(--radius-md, 5px);
                    background: ${styles.option_bg};
                    color: ${styles.option_text};
                    border: 1px solid ${styles.option_border};
                    cursor: pointer;
                }
                .${APPID}-text-option:hover, .${APPID}-text-option:focus {
                    background: ${styles.option_hover_bg} !important;
                    border-color: ${styles.option_hover_border} !important;
                    outline: 2px solid ${styles.option_hover_outline};
                }
            `,
            });
            document.head.appendChild(style);
        }
    }

    class UIManager {
        /** * @param {(config: AppConfig) => Promise<void>} onSaveCallback
         * @param {() => Promise<AppConfig>} getCurrentConfigCallback
         * @param {() => void} onModalClose
         * @param {object} siteStyles
         */
        constructor(config, onSave, platformDetails, siteStyles, onModalClose) {
            this.config = config;
            this.onSave = onSave;
            this.platformDetails = platformDetails;
            this.siteStyles = siteStyles;
            this.onModalClose = onModalClose;

            const activeProfileName = this.config.options.activeProfileName || Object.keys(this.config.texts)[0];
            const activeProfile = this.config.texts[activeProfileName] || {};
            this.activeCategory = Object.keys(activeProfile)[0] || null;

            this.hideTimeoutId = null;
            this.isModalOpen = false;
            this.unsubscribers = [];
            this.components = {
                settingsBtn: null,
                settingsPanel: null,
                insertBtn: null,
                textList: null,
                textEditorModal: null,
                jsonModal: null,
            };
            const modalCallbacks = {
                onSave: (newConfig) => this.onSave(newConfig),
                getCurrentConfig: () => this.config,
                onModalOpenStateChange: (isOpen) => this.setModalState(isOpen),
            };
            this.components.settingsBtn = new CustomSettingsButton(
                {
                    onClick: () => this.components.settingsPanel.toggle(),
                },
                {
                    id: `${CONSTANTS.ID_PREFIX}settings-btn`,
                    title: `Settings (${APPNAME})`,
                    zIndex: 10000,
                    position: CONSTANTS.UI_DEFAULTS.SETTINGS_BUTTON_POSITION,
                    siteStyles: this.siteStyles.SETTINGS_BUTTON,
                }
            );
            this.components.settingsPanel = new SettingsPanelComponent({
                onSave: (newConfig) => this.onSave(newConfig),
                getCurrentConfig: () => this.config,
                getAnchorElement: () => this.components.settingsBtn.element,
                onShowTextEditorModal: () => this.components.textEditorModal.open(),
                onShowJsonModal: () => {
                    this.components.settingsPanel.hide();
                    this.components.jsonModal.open(this.components.settingsBtn.element);
                },
                siteStyles: this.siteStyles.SETTINGS_PANEL,
            });
            this.components.insertBtn = new InsertButtonComponent(
                {
                    onMouseEnter: () => this._showList(),
                    onMouseLeave: () => this._startHideTimer(),
                },
                {
                    id: `${CONSTANTS.ID_PREFIX}insert-btn`,
                    title: 'Add quick text',
                    zIndex: 10000,
                    position: CONSTANTS.UI_DEFAULTS.INSERT_BUTTON_POSITION,
                    siteStyles: this.siteStyles.INSERT_BUTTON,
                }
            );
            this.components.textList = new TextListComponent(
                {
                    onMouseEnter: () => clearTimeout(this.hideTimeoutId),
                    onMouseLeave: () => this._startHideTimer(),
                },
                {
                    id: `${CONSTANTS.ID_PREFIX}text-list`,
                    siteStyles: this.siteStyles.TEXT_LIST,
                }
            );

            this.components.jsonModal = new JsonModalComponent({
                ...modalCallbacks,
                siteStyles: this.siteStyles.JSON_MODAL,
            });
            this.components.textEditorModal = new TextEditorModalComponent({
                ...modalCallbacks,
                siteStyles: this.siteStyles.THEME_MODAL,
                onShowJsonModal: () => {
                    this.components.textEditorModal.close();
                    this.components.jsonModal.open(this.components.settingsBtn.element);
                },
            });
        }

        init() {
            this._renderComponents();
            this.renderContent();
            this.unsubscribers.push(
                EventBus.subscribe(`${APPID}:reOpenModal`, ({ type, key }) => {
                    if (type === 'json') {
                        this.components.jsonModal.open(this.components.settingsBtn.element);
                    } else if (type === 'textEditor') {
                        this.components.textEditorModal.open(key);
                    }
                })
            );
            // Add event listener for dynamic UI changes
            this.unsubscribers.push(EventBus.subscribe(`${APPID}:canvasStateChanged`, () => this.repositionAllButtons()));
            this.unsubscribers.push(EventBus.subscribe(`${APPID}:canvasResized`, () => this.repositionAllButtons()));
        }

        destroy() {
            this.unsubscribers.forEach((unsub) => unsub());
            this.unsubscribers = [];
            for (const key in this.components) {
                this.components[key]?.destroy();
            }
        }

        repositionAllButtons() {
            PlatformAdapters.UI.repositionButtons(this);
        }

        getActiveModal() {
            if (this.components.jsonModal?.modal?.element?.open) {
                return this.components.jsonModal;
            }
            if (this.components.textEditorModal?.modal?.element?.open) {
                return this.components.textEditorModal;
            }
            return null;
        }

        setModalState(isOpen) {
            this.isModalOpen = isOpen;
            if (!isOpen) {
                this.onModalClose?.();
            }
        }

        updateConfig(newConfig) {
            this.config = newConfig;
            const activeProfileName = this.config.options.activeProfileName || Object.keys(this.config.texts)[0];
            const activeProfile = this.config.texts[activeProfileName] || {};
            this.activeCategory = Object.keys(activeProfile)[0] || null;
            this.renderContent();
        }

        renderContent() {
            if (!this.components.textList) return;
            const { tabsContainer, optionsContainer } = this.components.textList.elements;
            tabsContainer.textContent = '';
            optionsContainer.textContent = '';

            const activeProfileName = this.config.options.activeProfileName;
            const activeProfile = this.config.texts[activeProfileName];

            if (!activeProfile) {
                Logger.warn(`Active profile "${activeProfileName}" not found.`);
                return;
            }

            Object.keys(activeProfile).forEach((cat) => {
                const tab = h('button', {
                    className: `${APPID}-category-tab` + (cat === this.activeCategory ? ' active' : ''),
                    textContent: cat,
                    onmousedown: (e) => {
                        e.stopPropagation();
                        this.activeCategory = cat;
                        this.renderContent();
                    },
                });
                tabsContainer.appendChild(tab);
            });

            (activeProfile[this.activeCategory] || []).forEach((txt) => {
                const btn = h('button', {
                    className: `${APPID}-text-option`,
                    textContent: txt.length > 100 ? `${txt.slice(0, 100)}…` : txt,
                    title: txt,
                    onmousedown: (e) => {
                        e.stopPropagation();
                        this._insertText(txt);
                        this.components.textList.element.style.display = 'none';
                    },
                });
                optionsContainer.appendChild(btn);
            });
        }

        _renderComponents() {
            for (const key in this.components) {
                this.components[key]?.render();
            }
        }

        _insertText(text) {
            PlatformAdapters.General.insertText(text, this.config.options);
        }

        _positionList() {
            requestAnimationFrame(() => {
                const btnRect = this.components.insertBtn.element.getBoundingClientRect();
                const listElem = this.components.textList.element;
                const margin = 8;
                const listWidth = listElem.offsetWidth || CONSTANTS.TEXT_LIST_WIDTH;
                let left = btnRect.left;
                let top = btnRect.bottom + 4;

                if (left + listWidth > window.innerWidth - margin) {
                    left = window.innerWidth - listWidth - margin;
                }
                left = Math.max(left, margin);

                const listHeight = listElem.offsetHeight;
                if (listHeight > 0 && top + listHeight > window.innerHeight - margin) {
                    top = Math.max(margin, btnRect.top - listHeight - 4);
                }

                listElem.style.left = `${left}px`;
                listElem.style.top = `${top}px`;
            });
        }

        _showList() {
            clearTimeout(this.hideTimeoutId);
            const listElem = this.components.textList.element;
            listElem.style.left = '-9999px'; // Position off-screen before calculating size
            listElem.style.top = '0px';
            listElem.style.display = 'block';
            this._positionList();
        }

        _startHideTimer() {
            this.hideTimeoutId = setTimeout(() => {
                this.components.textList.element.style.display = 'none';
            }, CONSTANTS.HIDE_DELAY_MS);
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
                    onclick: () => {
                        const reopenContext = modalComponent.getContextForReopen?.();
                        modalComponent.close();
                        // onModalClose will handle applying the pending update.
                        // Request to reopen the modal after a short delay to ensure sync completion.
                        setTimeout(() => {
                            EventBus.publish(`${APPID}:reOpenModal`, reopenContext);
                        }, 100);
                    },
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
    // SECTION: DOM Observers and Event Listeners
    // =================================================================================

    class ObserverManager {
        constructor(app) {
            this.app = app; // Reference to the main app
            this.debouncedCanvasStateChanged = debounce(this._publishCanvasStateChanged.bind(this), CONSTANTS.POSITIONING.RECALC_DEBOUNCE_MS);
            this.debouncedCanvasResized = debounce(this._publishCanvasResized.bind(this), CONSTANTS.POSITIONING.RECALC_DEBOUNCE_MS);
        }

        /**
         * Starts all platform-specific observers by retrieving and executing them
         * from the PlatformAdapter.
         */
        start() {
            // Get the list of platform-specific observer initializers and run them.
            const initializers = PlatformAdapters.Observer.getInitializers();
            for (const init of initializers) {
                // Call each initializer with the ObserverManager instance as `this`.
                init.call(this);
            }
        }

        _publishCanvasStateChanged() {
            EventBus.publish(`${APPID}:canvasStateChanged`);
        }

        _publishCanvasResized() {
            EventBus.publish(`${APPID}:canvasResized`);
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
                textContent: `@keyframes ${this.animationName} { from { transform: none; } to { transform: none; } }`,
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
                    callbacks.forEach((cb) => cb(target));
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
                    textContent: `${selector} { animation-duration: 0.001s; animation-name: ${this.animationName}; }`,
                });
                document.head.appendChild(style);
            }
            this.listeners.get(selector).push(callback);
        }
    }

    // =================================================================================
    // SECTION: Core Functions
    // =================================================================================

    class QuickTextApp {
        constructor() {
            this.configManager = null;
            this.uiManager = null;
            this.platformDetails = null;
            this.syncManager = null;
            this.observerManager = new ObserverManager(this);
        }

        async init() {
            this.platformDetails = PlatformAdapters.General.getPlatformDetails();
            if (!this.platformDetails) {
                Logger.log('Not on a supported page.');
                return;
            }

            this.configManager = new ConfigManager();
            await this.configManager.load();

            this.syncManager = new SyncManager(this);

            const siteStyles = SITE_STYLES[this.platformDetails.platformId] || SITE_STYLES.chatgpt;
            this.uiManager = new UIManager(
                this.configManager.get(),
                (newConfig) => this.handleSave(newConfig),
                this.platformDetails,
                siteStyles,
                () => this.syncManager.onModalClose()
            );
            this.uiManager.init();
            this.syncManager.init();

            // Start platform-specific observers for dynamic UI changes via the adapter
            this.observerManager.start();
        }

        // Method required by the SyncManager's interface for silent updates
        applyUpdate(newConfig) {
            const completeConfig = this.configManager._processAndSanitize(newConfig);
            this.configManager.config = completeConfig;
            this.uiManager.updateConfig(completeConfig);
        }

        // Method required by the SyncManager's interface
        getAppId() {
            return APPID;
        }

        // Getter required by the SyncManager's interface
        get configKey() {
            return CONSTANTS.CONFIG_KEY;
        }

        async handleSave(newConfig) {
            try {
                await this.configManager.save(newConfig);
                this.uiManager.updateConfig(this.configManager.get());
                this.syncManager.onSave(); // Notify SyncManager of the successful save
            } catch (err) {
                Logger.error('Failed to save config:', err);
                throw err; // Re-throw the error for the UI layer to catch
            }
        }

        destroy() {
            this.uiManager?.destroy();
            // In the future, other managers can be destroyed here as well.
        }
    }

    // =================================================================================
    // SECTION: Entry Point
    // =================================================================================

    // ===============================================================
    //  Execution Guard: Prevent the script from running multiple times
    // ===============================================================
    if (ExecutionGuard.hasExecuted()) {
        // Exit if already executed
        return;
    } else {
        // Set executed flag if not executed yet
        ExecutionGuard.setExecuted();
    }
    // ===============================================================

    const platformDetails = PlatformAdapters.General.getPlatformDetails();
    if (platformDetails) {
        const sentinel = new Sentinel(OWNERID);
        let isInitialized = false;

        sentinel.on(platformDetails.selectors.ANCHOR_ELEMENT, () => {
            if (isInitialized) return;
            isInitialized = true;

            Logger.log('Anchor element detected. Initializing the script...');
            const app = new QuickTextApp();
            app.init();
        });
    }
})();
