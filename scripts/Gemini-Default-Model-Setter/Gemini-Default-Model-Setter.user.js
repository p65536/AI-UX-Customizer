// ==UserScript==
// @name         Gemini Default Model Setter
// @namespace    https://github.com/p65536
// @version      1.0.1
// @license      MIT
// @description  Automatically selects a specific model (e.g., "Pro") for Gemini upon page load, URL change, or tab return. The target model name and script state can be easily configured via the extension menu.
// @icon         https://raw.githubusercontent.com/p65536/p65536/main/images/icons/gdms.svg
// @author       p65536
// @match        https://gemini.google.com/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @grant        GM.unregisterMenuCommand
// @run-at       document-idle
// @noframes
// ==/UserScript==

(async function () {
  'use strict';

  // --- Common Script Definitions ---
  const OWNERID = 'p65536';
  const APPID = 'gdms';
  const APPNAME = 'Gemini Default Model Setter';
  const LOG_PREFIX = `[${APPID.toUpperCase()}]`;

  /**
   * @constant CONSTANTS
   * @description Common configuration constants to eliminate magic numbers.
   */
  const CONSTANTS = {
    STORAGE: {
      SUSPEND_KEY: `${APPID}-suspended-state`,
      VISIBILITY_CHECK_KEY: `${APPID}-visibility-check-state`,
      TARGET_TEXT_KEY: `${APPID}-target-text-state`,
    },
    SELECTORS: {
      CURRENT_MODE_LABEL: '[data-test-id="logo-pill-label-container"]',
      MENU_BUTTON: '[data-test-id="bard-mode-menu-button"]',
      MENU_ITEMS: '[data-test-id^="bard-mode-option-"]',
      INPUT_TEXT_FIELD_TARGET: 'rich-textarea .ql-editor',
      DISABLED_STATE: ':disabled, [aria-disabled="true"], [class*="disabled"]',
      BUTTON_TAG: 'button',
    },
    ATTRIBUTES: {
      ARIA_EXPANDED: 'aria-expanded',
      TRUE: 'true',
    },
    TIMING: {
      MENU_POLL_INTERVAL_MS: 120,
      MENU_POLL_MAX_ATTEMPTS: 15,
      FOCUS_POLL_INTERVAL_MS: 60,
      FOCUS_POLL_MAX_ATTEMPTS: 20,
      FALLBACK_DELAYS_MS: [300, 800, 1500],
    },
    TARGET_TEXT: 'Pro',
  };

  /**
   * @constant PALETTE
   * @description UI colors using Gemini system variables for consistent styling.
   */
  const PALETTE = {
    bg: 'var(--gem-sys-color--surface-container-highest)',
    input_bg: 'var(--gem-sys-color--surface-container-low)',
    text_primary: 'var(--gem-sys-color--on-surface)',
    text_secondary: 'var(--gem-sys-color--on-surface-variant)',
    border: 'var(--gem-sys-color--outline)',
    btn_bg: 'var(--gem-sys-color--surface-container-high)',
    btn_hover_bg: 'var(--gem-sys-color--surface-container-higher)',
    btn_text: 'var(--gem-sys-color--on-surface-variant)',
    danger_text: '#d93025',
    accent_text: 'var(--gem-sys-color--primary, #1a73e8)',
    success_text: '#188038',
  };

  /**
   * Wait for an element to appear in the DOM using Promise.withResolvers.
   * @param {string} selector - CSS selector to find the element.
   * @param {number} intervalMs - Polling interval in milliseconds.
   * @param {number} maxAttempts - Maximum number of polling attempts.
   * @param {AbortSignal} signal - Signal to abort the waiting process safely.
   * @returns {Promise<Element|null>} Resolves with the element, or null if timed out or aborted.
   */
  async function waitForElement(selector, intervalMs, maxAttempts, signal) {
    const { promise, resolve } = Promise.withResolvers();
    let attempts = 0;
    let timer = null;

    const cleanup = () => {
      if (timer) clearInterval(timer);
      // [DO NOT REFACTOR] Early Garbage Collection (GC)
      // Even though the listener is registered with { once: true }, manually removing it here
      // ensures that any closures (e.g., DOM references) are released to the GC immediately
      // when the element is found, rather than waiting for the abort signal to potentially fire later.
      signal.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      console.debug(`${LOG_PREFIX} waitForElement aborted for selector: ${selector}`);
      resolve(null);
    };

    if (signal.aborted) {
      console.debug(`${LOG_PREFIX} waitForElement immediately aborted for selector: ${selector}`);
      return null;
    }

    signal.addEventListener('abort', onAbort, { once: true });

    timer = setInterval(() => {
      attempts++;
      const el = document.querySelector(selector);

      if (el) {
        cleanup();
        resolve(el);
      } else if (attempts > maxAttempts) {
        cleanup();
        console.warn(`${LOG_PREFIX} waitForElement timeout for selector: ${selector}`);
        resolve(null);
      }
    }, intervalMs);

    return promise;
  }

  /**
   * @class Sentinel
   * @description Detects DOM node insertion using a shared, prefixed CSS animation trick.
   * @property {Map<string, Set<(element: Element) => void>>} listeners
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

      // Validate prefix for CSS compatibility
      // 1. Must contain only alphanumeric characters, hyphens, or underscores.
      // 2. Cannot start with a digit.
      // 3. Cannot start with a hyphen followed by a digit.
      if (!/^[a-zA-Z0-9_-]+$/.test(prefix) || /^[0-9]|^-[0-9]/.test(prefix)) {
        throw new Error(`[Sentinel] Prefix "${prefix}" is invalid. It must contain only alphanumeric characters, hyphens, or underscores, and cannot start with a digit or a hyphen followed by a digit.`);
      }

      /** @type {Window & { __global_sentinel_instances__?: Record<string, Sentinel> }} */
      const globalScope = window;
      globalScope.__global_sentinel_instances__ ??= {};
      if (globalScope.__global_sentinel_instances__[prefix]) {
        return globalScope.__global_sentinel_instances__[prefix];
      }

      this.prefix = prefix;
      this.isDestroyed = false;
      this.isSuspended = false;
      this._initObserver = null;

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

      this._boundHandleAnimationStart = this._handleAnimationStart.bind(this);

      this._injectStyleElement();
      document.addEventListener('animationstart', this._boundHandleAnimationStart, true);

      globalScope.__global_sentinel_instances__[prefix] = this;
    }

    destroy() {
      if (this.isDestroyed) return;
      this.isDestroyed = true;

      document.removeEventListener('animationstart', this._boundHandleAnimationStart, true);

      if (this._initObserver) {
        this._initObserver.disconnect();
        this._initObserver = null;
      }

      if (this.styleElement) {
        this.styleElement.remove();
        this.styleElement = null;
      }

      this.sheet = null;
      this.listeners.clear();
      this.rules.clear();
      this.pendingRules = [];

      /** @type {Window & { __global_sentinel_instances__?: Record<string, Sentinel> }} */
      const globalScope = window;
      if (globalScope.__global_sentinel_instances__) {
        delete globalScope.__global_sentinel_instances__[this.prefix];
      }
    }

    _injectStyleElement() {
      // Ensure the style element is injected only once per project prefix.
      this.styleElement = document.getElementById(this.styleId);

      if (this.styleElement instanceof HTMLStyleElement) {
        this.styleElement.disabled = this.isSuspended;

        /** @type {HTMLStyleElement} */
        const styleNode = this.styleElement;
        const pollExisting = () => {
          if (this.isDestroyed) return;
          if (styleNode.sheet) {
            this.sheet = styleNode.sheet;
            this._flushPendingRules();
          } else {
            // Poll infinitely until sheet is ready
            setTimeout(pollExisting, 50);
          }
        };
        pollExisting();
        return;
      }

      // Create empty style element
      this.styleElement = document.createElement('style');
      this.styleElement.id = this.styleId;

      // CSP Fix: Try to fetch a valid nonce from existing scripts/styles
      // "nonce" property exists on HTMLScriptElement/HTMLStyleElement, not basic Element.
      let nonce;

      // 1. Try to get nonce from scripts collection
      const scripts = document.scripts;
      for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].nonce) {
          nonce = scripts[i].nonce;
          break;
        }
      }

      // 2. Fallback: Using querySelector (content attribute)
      if (!nonce) {
        const style = document.querySelector('style[nonce]');
        const script = document.querySelector('script[nonce]');

        if (style instanceof HTMLStyleElement && style.nonce) {
          nonce = style.nonce;
        } else if (script instanceof HTMLScriptElement && script.nonce) {
          nonce = script.nonce;
        }
      }

      if (nonce) {
        this.styleElement.nonce = nonce;
      }

      if (this.styleElement instanceof HTMLStyleElement) {
        this.styleElement.disabled = this.isSuspended;
      }

      // Try to inject immediately.
      // If the document is not yet ready (e.g. extremely early document-start), wait for the root element.
      const target = document.head || document.documentElement;

      const initSheet = () => {
        if (this.isDestroyed) return;
        if (this.styleElement instanceof HTMLStyleElement) {
          /** @type {HTMLStyleElement} */
          const styleNode = this.styleElement;
          if (styleNode.sheet) {
            this.sheet = styleNode.sheet;
            // Insert the shared keyframes rule at index 0.
            try {
              const keyframes = `@keyframes ${this.animationName} { from { outline: 1px solid transparent;} to { outline: 0px solid transparent; } }`;
              this.sheet.insertRule(keyframes, 0);
            } catch (e) {
              console.error(`${LOG_PREFIX} [Sentinel] Failed to insert keyframes rule:`, e);
            }
            this._flushPendingRules();
          } else {
            // Poll infinitely until sheet is ready
            setTimeout(initSheet, 50);
          }
        }
      };

      if (target) {
        target.appendChild(this.styleElement);
        initSheet();
      } else {
        this._initObserver = new MutationObserver(() => {
          if (this.isDestroyed) return;
          const retryTarget = document.head || document.documentElement;
          if (retryTarget) {
            this._initObserver.disconnect();
            this._initObserver = null;

            retryTarget.appendChild(this.styleElement);
            initSheet();
          }
        });
        this._initObserver.observe(document, { childList: true });
      }
    }

    /**
     * Ensures the style element is connected to the DOM and restores rules if it was removed.
     */
    _ensureStyleGuard() {
      if (this.styleElement && !this.styleElement.isConnected) {
        const target = document.head || document.documentElement;
        if (target) {
          target.appendChild(this.styleElement);
          if (this.styleElement instanceof HTMLStyleElement && this.styleElement.sheet) {
            this.styleElement.disabled = this.isSuspended;
            this.sheet = this.styleElement.sheet;

            try {
              while (this.sheet.cssRules.length > 0) {
                this.sheet.deleteRule(0);
              }
              const keyframes = `@keyframes ${this.animationName} { from { outline: 1px solid transparent; } to { outline: 0px solid transparent; } }`;
              this.sheet.insertRule(keyframes, 0);
            } catch (e) {
              console.error(`${LOG_PREFIX} [Sentinel] Failed to clear or restore base rules:`, e);
            }

            this.pendingRules = [];

            this.rules.forEach((selector) => {
              this._insertRule(selector);
            });
          }
        }
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
        console.error(`${LOG_PREFIX} [Sentinel] Failed to insert rule for selector "${selector}":`, e);
      }
    }

    _handleAnimationStart(event) {
      if (this.isDestroyed) return;

      // Check if the animation is the one we're listening for.
      if (event.animationName !== this.animationName) return;

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      // Check if the target element matches any of this instance's selectors.
      for (const [selector, callbacks] of this.listeners.entries()) {
        if (target.matches(selector)) {
          // Use a copy of the callbacks Set in case a callback removes itself.
          [...callbacks].forEach((cb) => {
            try {
              cb(target);
            } catch (e) {
              console.error(`${LOG_PREFIX} [Sentinel] Listener error for selector "${selector}":`, e);
            }
          });
        }
      }
    }

    /**
     * @param {string} selector
     * @param {(element: Element) => void} callback
     */
    on(selector, callback) {
      if (this.isDestroyed) return;
      this._ensureStyleGuard();

      // Add callback to listeners

      if (!this.listeners.has(selector)) {
        this.listeners.set(selector, new Set());
      }
      this.listeners.get(selector).add(callback);
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
      if (this.isDestroyed) return;
      const callbacks = this.listeners.get(selector);
      if (!callbacks) return;

      const wasDeleted = callbacks.delete(callback);
      if (!wasDeleted) {
        return;
        // Callback not found, do nothing.
      }

      if (callbacks.size === 0) {
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
              try {
                this.sheet.deleteRule(i);
              } catch (e) {
                console.error(`${LOG_PREFIX} [Sentinel] Failed to delete rule for selector "${selector}":`, e);
              }
              // We assume one rule per selector, so we can break after deletion
              break;
            }
          }
        }
      }
    }

    suspend() {
      if (this.isDestroyed) return;
      this.isSuspended = true;
      if (this.styleElement instanceof HTMLStyleElement) {
        this.styleElement.disabled = true;
      }
      console.debug(`${LOG_PREFIX} [Sentinel] Suspended.`);
    }

    resume() {
      if (this.isDestroyed) return;
      this.isSuspended = false;
      if (this.styleElement instanceof HTMLStyleElement) {
        this.styleElement.disabled = false;
      }
      console.debug(`${LOG_PREFIX} [Sentinel] Resumed.`);
    }
  }

  /**
   * @class AppController
   * @description Encapsulates global state and logic to enforce the target model.
   */
  class AppController {
    #isSetting = false;
    #isSuspended = false;
    #isVisibilityCheckEnabled = false;
    #setFailedForCurrentContext = false;
    #isSettledForCurrentContext = false;
    #targetText = CONSTANTS.TARGET_TEXT;
    #menuCommandId = null;
    #visibilityMenuCommandId = null;
    #targetMenuCommandId = null;
    #abortController = null;
    #sentinel = null;

    /**
     * Validates if a given string is a valid regular expression.
     * @param {string} pattern
     * @returns {boolean}
     */
    #isValidRegex(pattern) {
      try {
        new RegExp(pattern);
        return true;
      } catch {
        return false;
      }
    }

    /**
     * Checks if the given text matches the target regex pattern (case-insensitive).
     * @param {string} text
     * @returns {boolean}
     */
    #isMatch(text) {
      try {
        const rx = new RegExp(this.#targetText, 'i');
        return rx.test(text);
      } catch {
        return false;
      }
    }

    /**
     * Schedules fallback state checks to handle delayed DOM updates in SPAs.
     */
    #scheduleFallbackChecks() {
      this.#setFailedForCurrentContext = false;
      CONSTANTS.TIMING.FALLBACK_DELAYS_MS.forEach((delay) => {
        setTimeout(() => this.#checkAndEnforce(), delay);
      });
    }

    /**
     * Initialize the setter state and set up event-driven observation.
     * Uses Sentinel (CSS Animation) for new elements and Navigation API for URL changes.
     */
    async init() {
      this.#isSuspended = await GM.getValue(CONSTANTS.STORAGE.SUSPEND_KEY, false);
      this.#isVisibilityCheckEnabled = await GM.getValue(CONSTANTS.STORAGE.VISIBILITY_CHECK_KEY, false);
      this.#targetText = await GM.getValue(CONSTANTS.STORAGE.TARGET_TEXT_KEY, CONSTANTS.TARGET_TEXT);

      await this.#updateMenuCommand();

      // Initialize Sentinel for DOM insertion detection
      this.#sentinel = new Sentinel(OWNERID);

      if (this.#isSuspended) {
        this.#sentinel.suspend();
      }

      // Trigger check whenever the mode label is freshly inserted into the DOM
      this.#sentinel.on(CONSTANTS.SELECTORS.CURRENT_MODE_LABEL, () => {
        if (!this.#isSuspended) {
          console.debug(`${LOG_PREFIX} Element detected via Sentinel, checking state...`);
          this.#checkAndEnforce();
        }
      });

      // Monitor URL changes
      const originalPushState = history.pushState;
      history.pushState = function (...args) {
        originalPushState.apply(this, args);
        window.dispatchEvent(new Event('locationchange'));
      };

      const originalReplaceState = history.replaceState;
      history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        window.dispatchEvent(new Event('locationchange'));
      };

      window.addEventListener('popstate', () => {
        window.dispatchEvent(new Event('locationchange'));
      });

      let currentPath = window.location.pathname;

      window.addEventListener('locationchange', () => {
        if (!this.#isSuspended) {
          const newPath = window.location.pathname;
          // Reset settled state and re-check only if the URL path actually changed
          if (newPath !== currentPath) {
            currentPath = newPath;
            this.#isSettledForCurrentContext = false;
            this.#scheduleFallbackChecks();
          }
        }
      });

      // Fail-safe: Re-check state when the page is re-focused or becomes visible.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !this.#isSuspended && this.#isVisibilityCheckEnabled) {
          console.debug(`${LOG_PREFIX} Tab became visible, verifying state...`);
          this.#isSettledForCurrentContext = false;
          this.#scheduleFallbackChecks();
        }
      });

      if (!this.#isSuspended) {
        this.#checkAndEnforce();
      }
    }

    /**
     * Update the Tampermonkey menu command label based on the current state
     */
    async #updateMenuCommand() {
      // 1. Main ON/OFF command
      if (this.#menuCommandId !== null) {
        await GM.unregisterMenuCommand(this.#menuCommandId);
      }

      const stateText = this.#isSuspended ? `🔴 Disabled` : `🟢 Enabled`;
      const tooltipText = this.#isSuspended ? 'Click to enable the function' : 'Click to disable the function';

      this.#menuCommandId = await GM.registerMenuCommand(
        stateText,
        async () => {
          this.#isSuspended = !this.#isSuspended;
          await GM.setValue(CONSTANTS.STORAGE.SUSPEND_KEY, this.#isSuspended);

          console.info(`${LOG_PREFIX} State changed: ${this.#isSuspended ? 'OFF (Suspended)' : 'ON (Active)'}`);

          await this.#updateMenuCommand();

          if (!this.#isSuspended) {
            this.#sentinel?.resume();
            this.#checkAndEnforce();
          } else {
            this.#sentinel?.suspend();
            if (this.#abortController) {
              this.#abortController.abort();
            }
          }
        },
        { title: tooltipText }
      );

      // 2. Target Text settings command
      if (this.#targetMenuCommandId !== null) {
        await GM.unregisterMenuCommand(this.#targetMenuCommandId);
      }

      this.#targetMenuCommandId = await GM.registerMenuCommand(
        `⚙️ Set Target Model Name: ${this.#targetText}`,
        () => {
          this.#showSettingsModal();
        },
        { title: 'Set the target model name to fix' }
      );

      // 3. Visibility check ON/OFF command
      if (this.#visibilityMenuCommandId !== null) {
        await GM.unregisterMenuCommand(this.#visibilityMenuCommandId);
      }

      const visibilityStateText = this.#isVisibilityCheckEnabled ? `🟢 Auto-Check on Re-focus: ON` : `🔴 Auto-Check on Re-focus: OFF`;
      const visibilityTooltipText = this.#isVisibilityCheckEnabled ? 'Click to disable checking the model when returning to this page' : 'Click to enable checking the model when returning to this page';

      this.#visibilityMenuCommandId = await GM.registerMenuCommand(
        visibilityStateText,
        async () => {
          this.#isVisibilityCheckEnabled = !this.#isVisibilityCheckEnabled;
          await GM.setValue(CONSTANTS.STORAGE.VISIBILITY_CHECK_KEY, this.#isVisibilityCheckEnabled);

          console.info(`${LOG_PREFIX} Visibility check state changed: ${this.#isVisibilityCheckEnabled ? 'ON' : 'OFF'}`);

          await this.#updateMenuCommand();
        },
        { title: visibilityTooltipText }
      );
    }

    /**
     * Check current state and enforce Pro mode if necessary
     */
    async #checkAndEnforce() {
      if (this.#isSetting || this.#isSuspended || this.#setFailedForCurrentContext || this.#isSettledForCurrentContext) return;

      const currentText = document.querySelector(CONSTANTS.SELECTORS.CURRENT_MODE_LABEL)?.textContent?.trim();

      if (!currentText) return;

      if (this.#isMatch(currentText)) {
        this.#isSettledForCurrentContext = true;
        return;
      }

      await this.#applyTargetModel();
    }

    /**
     * Shows a modal to configure the target model name.
     */
    #showSettingsModal() {
      const dialog = document.createElement('dialog');
      const style = document.createElement('style');
      style.textContent = `
.${APPID}-modal-btn {
background: ${PALETTE.btn_bg};
color: ${PALETTE.btn_text};
border: 1px solid ${PALETTE.border};
border-radius: 20px;
padding: 8px 16px;
cursor: pointer;
font-family: inherit;
font-size: 14px;
transition: background 0.2s;
}
.${APPID}-modal-btn:hover:not(:disabled) {
background: ${PALETTE.btn_hover_bg};
}
.${APPID}-modal-btn:disabled {
opacity: 0.5;
cursor: not-allowed;
}
.${APPID}-modal-input {
width: 100%;
box-sizing: border-box;
padding: 10px;
border: 1px solid ${PALETTE.border};
border-radius: 8px;
background: ${PALETTE.input_bg};
color: ${PALETTE.text_primary};
font-size: 14px;
font-family: inherit;
margin-bottom: 8px;
}
.${APPID}-modal-input:focus {
outline: 2px solid ${PALETTE.accent_text};
outline-offset: -1px;
}
.${APPID}-modal-text-small {
font-size: 15px;
line-height: 1.5;
white-space: pre-wrap;
color: ${PALETTE.text_secondary};
margin-bottom: 16px;
display: block;
}
.${APPID}-modal-status {
font-size: 13px;
font-weight: bold;
margin-bottom: 24px;
min-height: 18px;
}
`;
      dialog.appendChild(style);

      dialog.style.cssText = `
padding: 24px;
border: 1px solid ${PALETTE.border};
border-radius: 12px;
box-shadow: 0 4px 6px rgb(0 0 0 / 0.1);
font-family: sans-serif;
background: ${PALETTE.bg};
color: ${PALETTE.text_primary};
width: 360px;
`;

      const title = document.createElement('h3');
      title.textContent = `${APPNAME}`;
      title.style.margin = '0 0 8px 0';
      dialog.appendChild(title);

      const desc = document.createElement('span');
      desc.className = `${APPID}-modal-text-small`;
      desc.textContent = 'Use Regular Expression (case-insensitive).\nJust enter the pattern itself (do not enclose in "/").\nE.g., "Pro" (partial), "^Pro$" (exact).';
      dialog.appendChild(desc);

      const patternLabel = document.createElement('label');
      patternLabel.textContent = 'Target Pattern:';
      patternLabel.style.cssText = 'display:block; font-size:13px; margin-bottom:4px; font-weight:bold;';
      dialog.appendChild(patternLabel);

      const input = document.createElement('input');
      input.type = 'text';
      input.value = this.#targetText;
      input.className = `${APPID}-modal-input`;
      dialog.appendChild(input);

      const testLabel = document.createElement('label');
      testLabel.textContent = 'Test String (Optional):';
      testLabel.style.cssText = 'display:block; font-size:13px; margin-bottom:4px; font-weight:bold; margin-top:12px;';
      dialog.appendChild(testLabel);

      const testInput = document.createElement('input');
      testInput.type = 'text';
      testInput.placeholder = 'e.g., Gemini Advanced';
      testInput.className = `${APPID}-modal-input`;
      dialog.appendChild(testInput);

      const statusDisplay = document.createElement('div');
      statusDisplay.className = `${APPID}-modal-status`;
      dialog.appendChild(statusDisplay);

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
display: flex;
justify-content: space-between;
align-items: center;
`;

      const leftGroup = document.createElement('div');
      const rightGroup = document.createElement('div');
      rightGroup.style.cssText = `
display: flex;
gap: 8px;
`;

      const defaultBtn = document.createElement('button');
      defaultBtn.textContent = 'Default';
      defaultBtn.className = `${APPID}-modal-btn`;
      defaultBtn.onclick = () => {
        input.value = CONSTANTS.TARGET_TEXT;
        updateStatus();
      };

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.className = `${APPID}-modal-btn`;
      cancelBtn.onclick = () => {
        dialog.close();
        dialog.remove();
      };

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.className = `${APPID}-modal-btn`;

      const updateStatus = () => {
        const pattern = input.value;
        const testStr = testInput.value;

        if (pattern.includes('/')) {
          statusDisplay.textContent = '⚠️ Do not use "/"';
          statusDisplay.style.color = PALETTE.danger_text;
          saveBtn.disabled = true;
          return;
        }

        if (!this.#isValidRegex(pattern)) {
          statusDisplay.textContent = '⚠️ Invalid Regex';
          statusDisplay.style.color = PALETTE.danger_text;
          saveBtn.disabled = true;
          return;
        }

        saveBtn.disabled = false;

        if (testStr.trim() === '') {
          statusDisplay.textContent = ' ';
          return;
        }

        try {
          const rx = new RegExp(pattern, 'i');
          if (rx.test(testStr)) {
            statusDisplay.textContent = '✅ Match';
            statusDisplay.style.color = PALETTE.success_text;
          } else {
            statusDisplay.textContent = '❌ No Match';
            statusDisplay.style.color = PALETTE.danger_text;
          }
        } catch {
          statusDisplay.textContent = '⚠️ Error';
        }
      };

      input.addEventListener('input', updateStatus);
      testInput.addEventListener('input', updateStatus);

      saveBtn.onclick = async () => {
        const newVal = input.value.trim();
        if (newVal && this.#isValidRegex(newVal)) {
          this.#targetText = newVal;
          await GM.setValue(CONSTANTS.STORAGE.TARGET_TEXT_KEY, newVal);
          console.info(`${LOG_PREFIX} Target model name updated to: ${newVal}`);
          this.#setFailedForCurrentContext = false;
          this.#isSettledForCurrentContext = false;
          await this.#updateMenuCommand();
          if (!this.#isSuspended) {
            this.#checkAndEnforce();
          }
          dialog.close();
          dialog.remove();
        }
      };

      updateStatus();

      leftGroup.appendChild(defaultBtn);
      rightGroup.appendChild(cancelBtn);
      rightGroup.appendChild(saveBtn);

      buttonContainer.appendChild(leftGroup);
      buttonContainer.appendChild(rightGroup);
      dialog.appendChild(buttonContainer);

      document.body.appendChild(dialog);
      dialog.showModal();
    }

    /**
     * Open the menu, select the target model, and handle exceptions/refocus.
     * Enforces menu state checks to prevent toggling conflicts and logs missing elements.
     * @returns {Promise<void>}
     */
    async #applyTargetModel() {
      if (this.#isSetting) return;

      this.#isSetting = true;
      this.#abortController = new AbortController();
      const signal = this.#abortController.signal;

      const getMenuButton = () => document.querySelector(CONSTANTS.SELECTORS.MENU_BUTTON);
      const isMenuOpen = (btn) => btn?.getAttribute(CONSTANTS.ATTRIBUTES.ARIA_EXPANDED) === CONSTANTS.ATTRIBUTES.TRUE;

      try {
        const menuButton = getMenuButton();
        if (!(menuButton instanceof HTMLElement)) {
          console.debug(`${LOG_PREFIX} Menu button not found or not an HTMLElement.`);
          return;
        }

        // Open menu only if it's currently closed
        if (!isMenuOpen(menuButton)) {
          menuButton.click();
        }

        // Wait for the menu to render ANY items (lazy rendering detection)
        let items = [];
        for (let i = 0; i < CONSTANTS.TIMING.MENU_POLL_MAX_ATTEMPTS; i++) {
          if (signal.aborted) return;
          // Ensure we only collect items that are physically visible on the DOM
          items = Array.from(document.querySelectorAll(CONSTANTS.SELECTORS.MENU_ITEMS)).filter((el) => el instanceof HTMLElement && el.offsetParent !== null);
          if (items.length > 0) break; // Menu has rendered
          await new Promise((resolve) => setTimeout(resolve, CONSTANTS.TIMING.MENU_POLL_INTERVAL_MS));
        }

        // Search for the target model among the rendered items using Regex
        const targetBtn = items.find((el) => {
          const labelEl = el.querySelector('.label');
          const textToMatch = labelEl ? labelEl.textContent : el.textContent;
          return this.#isMatch(textToMatch.trim());
        });

        // Fail-safe: If the target model button is not found (either menu didn't render or model doesn't exist),
        // abort and intentionally leave the menu open as a visual indicator of an invalid target.
        if (!(targetBtn instanceof HTMLElement)) {
          console.warn(`${LOG_PREFIX} Target model matching pattern "${this.#targetText}" not found in menu.`);
          this.#setFailedForCurrentContext = true;
          this.#isSettledForCurrentContext = true;
          return;
        }

        const btn = targetBtn.closest(CONSTANTS.SELECTORS.BUTTON_TAG) ?? targetBtn;

        // Skip operation: If the target model button is already disabled (indicating the target mode is currently active),
        // safely close the menu to prevent unnecessary actions.
        if (btn instanceof HTMLElement && btn.matches(CONSTANTS.SELECTORS.DISABLED_STATE)) {
          console.debug(`${LOG_PREFIX} Target model button is disabled.`);
          // Re-click itself (the currently selected model) to close via the normal flow.
          btn.click();
        } else if (btn instanceof HTMLElement) {
          btn.click();
        }

        // Wait for the input field to become focusable
        const inputField = await waitForElement(CONSTANTS.SELECTORS.INPUT_TEXT_FIELD_TARGET, CONSTANTS.TIMING.FOCUS_POLL_INTERVAL_MS, CONSTANTS.TIMING.FOCUS_POLL_MAX_ATTEMPTS, signal);

        // Ensure safe focus: Verify the input field is successfully found, physically visible on the DOM (offsetParent !== null),
        // and no abort signal was triggered during the wait before applying focus.
        if (inputField instanceof HTMLElement && inputField.offsetParent !== null && !signal.aborted) {
          inputField.focus();
        } else {
          console.warn(`${LOG_PREFIX} Input text field not focusable or not found.`);
        }

        // Mark as settled to avoid infinite loops on manual DOM changes
        this.#isSettledForCurrentContext = true;
      } finally {
        // Cleanup: Always release the fixing lock (#isFixing) and clear the AbortController,
        // regardless of whether the operation succeeded, failed, or threw an exception, to allow future executions.
        this.#isSetting = false;
        this.#abortController = null;
      }
    }
  }

  // --- Entry Point ---
  const setter = new AppController();
  setter.init();
})();
