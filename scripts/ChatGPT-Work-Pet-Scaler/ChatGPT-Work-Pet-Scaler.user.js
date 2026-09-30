// ==UserScript==
// @name         ChatGPT Work Pet Scaler
// @namespace    https://github.com/p65536
// @version      1.0.0
// @license      MIT
// @description  Enlarges ChatGPT Work pets while reserving matching layout space for the activity display.
// @icon         data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20enable-background%3D%22new%200%200%2024%2024%22%20height%3D%2224px%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%2224px%22%20fill%3D%22%235985E1%22%3E%3Cg%3E%3Cpath%20d%3D%22M0%2C0h24v24H0V0z%22%20fill%3D%22none%22%2F%3E%3C%2Fg%3E%3Cg%3E%3Cg%3E%3Crect%20height%3D%222%22%20width%3D%2216%22%20x%3D%224%22%20y%3D%2220%22%2F%3E%3Crect%20height%3D%222%22%20width%3D%2216%22%20x%3D%224%22%20y%3D%222%22%2F%3E%3Cpolygon%20points%3D%229.41%2C13.59%208%2C15%2012%2C19%2016%2C15%2014.59%2C13.59%2013%2C15.17%2013%2C8.83%2014.59%2C10.41%2016%2C9%2012%2C5%208%2C9%209.41%2C10.41%2011%2C8.83%2011%2C15.17%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E
// @author       p65536
// @match        https://chatgpt.com/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @grant        GM.unregisterMenuCommand
// @run-at       document-idle
// @noframes
// ==/UserScript==

(async function () {
  'use strict';

  const APPID = 'cwps';
  const APPNAME = 'ChatGPT Work Pet Scaler';
  const LOG_PREFIX = `[${APPID.toUpperCase()}]`;

  const SETTINGS = {
    STORAGE_KEY: `${APPID}.petScale`,
    DEFAULT_SCALE: 7,
    MIN_SCALE: 1,
    // x10+ can extend behind the current Work toolbar, so keep the pet fully visible.
    MAX_SCALE: 9,
  };

  const PET_ATTRIBUTE = `data-${APPID}-pet`;
  const BASE_WIDTH_ATTRIBUTE = `data-${APPID}-base-width`;
  const BASE_HEIGHT_ATTRIBUTE = `data-${APPID}-base-height`;
  const STYLE_ID = `${APPID}-style`;
  const WORKSPACE_ROOT_SELECTOR = '[data-app-shell-workspace-row="true"]';
  const MAIN_AREA_SELECTOR = '[data-app-shell-focus-area="main"]';
  // Legacy ChatGPT portion of AIUXC's MAIN_APP_CONTAINER selector.
  const LEGACY_CHAT_ROOT_SELECTOR = ':is(div[data-scroll-root], div:has(> main#main):not(div[data-scroll-root] *))';
  // Keep target-route classification aligned with AIUXC.
  const ALLOWED_ROUTES = [/^\/$/, /^\/c\//, /^\/g\//, /^\/share\//];
  const OBSERVER_TIMING = {
    NAVIGATION_SETTLE_MS: 250,
    NAVIGATION_VERIFY_MS: 1000,
    FALLBACK_GRACE_MS: 3000,
    HEALTH_CHECK_MS: 5000,
  };
  const SUPPORTED_BACKGROUND_SIZES = new Set(['800% 900%', '800% 1100%']);

  let petScale = normalizeScale(await GM.getValue(SETTINGS.STORAGE_KEY, SETTINGS.DEFAULT_SCALE));
  let menuCommandId = null;
  let settingsOverlay = null;
  let observerRoot = null;
  let observerMode = 'idle';
  let activeMainArea = null;
  let fallbackTimerId = null;
  let healthCheckTimerId = null;
  let selectorWarningTimerId = null;
  let navigationTimerId = null;
  let navigationVerifyTimerId = null;
  let selectorWarningActive = false;
  let lastLocation = location.href;

  /**
   * Returns a valid pet scale or the default value.
   * @param {unknown} value Candidate scale value.
   * @returns {number}
   */
  function normalizeScale(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < SETTINGS.MIN_SCALE || numericValue > SETTINGS.MAX_SCALE) {
      return SETTINGS.DEFAULT_SCALE;
    }
    return Math.round(numericValue * 100) / 100;
  }

  /**
   * Normalizes computed background-size whitespace for comparison.
   * @param {string} value Computed background-size value.
   * @returns {string}
   */
  function normalizeBackgroundSize(value) {
    return value.trim().replace(/\s+/g, ' ');
  }

  /**
   * Tests whether an element currently participates in layout.
   * @param {Element | null} element Candidate element.
   * @returns {element is HTMLElement}
   */
  function isRenderedElement(element) {
    return element instanceof HTMLElement && (element.offsetParent !== null || element.getClientRects().length > 0);
  }

  /**
   * Returns the first matching element that currently participates in layout.
   * ChatGPT can keep stale SPA route trees connected after navigation, so plain
   * querySelector() may return an inactive element.
   * @param {string} selector CSS selector to query.
   * @param {ParentNode} [root=document] Root node to search within.
   * @returns {HTMLElement | null}
   */
  function queryRenderedElement(selector, root = document) {
    const elements = root.querySelectorAll(selector);

    for (const element of elements) {
      if (isRenderedElement(element)) {
        return element;
      }
    }

    return null;
  }

  /**
   * Tests whether an element is a supported ChatGPT pet sprite.
   * ChatGPT pet sheets use eight columns and either nine (v1) or eleven (v2) rows.
   * @param {Element | null} element Candidate sprite element.
   * @returns {element is HTMLElement}
   */
  function isPetSprite(element) {
    if (!(element instanceof HTMLElement)) return false;

    const style = getComputedStyle(element);
    if (style.backgroundImage === 'none') return false;

    return SUPPORTED_BACKGROUND_SIZES.has(normalizeBackgroundSize(style.backgroundSize));
  }

  /**
   * Applies the active scale to one detected pet button.
   * @param {HTMLButtonElement} button Pet button.
   * @returns {void}
   */
  function applyScale(button) {
    const baseWidth = Number(button.getAttribute(BASE_WIDTH_ATTRIBUTE));
    const baseHeight = Number(button.getAttribute(BASE_HEIGHT_ATTRIBUTE));
    if (!Number.isFinite(baseWidth) || !Number.isFinite(baseHeight)) return;

    button.style.setProperty(`--${APPID}-pet-width`, `${baseWidth * petScale}px`);
    button.style.setProperty(`--${APPID}-pet-height`, `${baseHeight * petScale}px`);
  }

  /**
   * Detects and marks one pet button using only sprite structure and grid geometry.
   * @param {Element} element Candidate element.
   * @returns {boolean} Whether a pet button was detected.
   */
  function detectPetButton(element) {
    if (!(element instanceof HTMLButtonElement)) return false;
    if (element.hasAttribute(PET_ATTRIBUTE)) {
      applyScale(element);
      return true;
    }

    const sprite = element.firstElementChild;
    if (!isPetSprite(sprite)) return false;

    const bounds = sprite.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return false;

    element.setAttribute(BASE_WIDTH_ATTRIBUTE, String(bounds.width));
    element.setAttribute(BASE_HEIGHT_ATTRIBUTE, String(bounds.height));
    element.setAttribute(PET_ATTRIBUTE, '');
    applyScale(element);

    console.info(`${LOG_PREFIX} Work pet detected. Base size: ${bounds.width} x ${bounds.height}px.`);
    return true;
  }

  /**
   * Scans an added subtree and its nearest button ancestor.
   * @param {Element} node Added subtree or initial document element.
   * @returns {void}
   */
  function scanNode(node) {
    if (!(node instanceof Element)) return;

    if (node.matches('button')) detectPetButton(node);

    const ancestorButton = node.closest('button');
    if (ancestorButton) detectPetButton(ancestorButton);

    node.querySelectorAll('button').forEach((button) => detectPetButton(button));
  }

  /**
   * Updates every currently detected pet.
   * @returns {void}
   */
  function updateDetectedPets() {
    document.querySelectorAll(`button[${PET_ATTRIBUTE}]`).forEach((button) => {
      if (button instanceof HTMLButtonElement) applyScale(button);
    });
  }

  /**
   * Closes the settings modal and refreshes the menu label.
   * @returns {Promise<void>}
   */
  async function closeSettingsModal() {
    if (!settingsOverlay) return;

    document.removeEventListener('keydown', handleSettingsKeyDown);
    settingsOverlay.remove();
    settingsOverlay = null;
    await registerMenuCommand();
  }

  /**
   * Handles keyboard shortcuts while the settings modal is open.
   * @param {KeyboardEvent} event Keyboard event.
   * @returns {void}
   */
  function handleSettingsKeyDown(event) {
    if (event.key === 'Escape') {
      void closeSettingsModal();
    }
  }

  /**
   * Opens the lightweight Work pet scale settings modal.
   * Slider changes are applied and persisted immediately.
   * @returns {void}
   */
  function openSettingsModal() {
    if (settingsOverlay) return;

    const overlay = document.createElement('div');
    overlay.className = `${APPID}-modal-overlay`;

    const modal = document.createElement('div');
    modal.className = `${APPID}-modal-box`;

    const header = document.createElement('div');
    header.className = `${APPID}-modal-header`;

    const title = document.createElement('span');
    title.textContent = `${APPNAME} Settings`;

    const closeButton = document.createElement('button');
    closeButton.className = `${APPID}-close-btn`;
    closeButton.type = 'button';
    closeButton.title = 'Close';
    closeButton.setAttribute('aria-label', 'Close settings');
    closeButton.textContent = '✕';
    closeButton.addEventListener('click', () => {
      void closeSettingsModal();
    });

    header.append(title, closeButton);

    const content = document.createElement('div');
    content.className = `${APPID}-modal-content`;

    const label = document.createElement('label');
    label.htmlFor = `${APPID}-scale-slider`;
    label.textContent = 'Pet scale';

    const sliderWrapper = document.createElement('div');
    sliderWrapper.className = `${APPID}-slider-wrapper`;

    const slider = document.createElement('input');
    slider.id = `${APPID}-scale-slider`;
    slider.type = 'range';
    slider.min = String(SETTINGS.MIN_SCALE);
    slider.max = String(SETTINGS.MAX_SCALE);
    slider.step = '0.1';
    slider.value = String(petScale);

    const valueDisplay = document.createElement('span');
    valueDisplay.className = `${APPID}-slider-value`;
    valueDisplay.textContent = `x${petScale}`;

    slider.addEventListener('input', async () => {
      petScale = normalizeScale(slider.value);
      valueDisplay.textContent = `x${petScale}`;
      updateDetectedPets();
      await GM.setValue(SETTINGS.STORAGE_KEY, petScale);
    });

    sliderWrapper.append(slider, valueDisplay);
    content.append(label, sliderWrapper);
    modal.append(header, content);
    overlay.appendChild(modal);

    settingsOverlay = overlay;
    document.body.appendChild(overlay);
    slider.focus();
    document.addEventListener('keydown', handleSettingsKeyDown);
  }

  /**
   * Registers the userscript menu command for opening settings.
   * @returns {Promise<void>}
   */
  async function registerMenuCommand() {
    if (menuCommandId !== null) {
      await GM.unregisterMenuCommand(menuCommandId);
    }

    menuCommandId = await GM.registerMenuCommand(
      `Open Work pet settings: x${petScale}`,
      openSettingsModal,
      { title: `Current Work pet scale: x${petScale}` }
    );
  }

  const existingStyle = document.getElementById(STYLE_ID);
  existingStyle?.remove();

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${APPID}-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgb(0 0 0 / 0.45);
    }

    .${APPID}-modal-box {
      width: 360px;
      max-width: 90vw;
      color: var(--text-primary, CanvasText);
      background: var(--main-surface-primary, Canvas);
      border: 1px solid var(--border-light, rgb(128 128 128 / 0.35));
      border-radius: 12px;
      box-shadow: 0 4px 16px rgb(0 0 0 / 0.3);
      font-family: inherit;
      font-size: 14px;
    }

    .${APPID}-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-light, rgb(128 128 128 / 0.35));
      font-size: 1.1em;
      font-weight: 600;
    }

    .${APPID}-close-btn {
      padding: 0 4px;
      color: var(--text-secondary, currentColor);
      background: none;
      border: none;
      cursor: pointer;
      font: inherit;
      font-size: 18px;
    }

    .${APPID}-close-btn:hover {
      color: var(--text-primary, currentColor);
    }

    .${APPID}-modal-content {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 16px;
    }

    .${APPID}-slider-wrapper {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    #${APPID}-scale-slider {
      flex: 1;
      /* Restore native range styling overridden by ChatGPT so accent-color remains visible. */
      -webkit-appearance: auto !important;
      appearance: auto !important;
      accent-color: var(--app-color-text-accent, var(--text-accent, #2c67c5));
    }

    .${APPID}-slider-value {
      min-width: 42px;
      color: var(--text-secondary, currentColor);
      font-weight: 500;
      text-align: right;
    }

    button[${PET_ATTRIBUTE}] {
      width: var(--${APPID}-pet-width) !important;
      min-width: var(--${APPID}-pet-width) !important;
      height: var(--${APPID}-pet-height) !important;
      min-height: var(--${APPID}-pet-height) !important;
      flex: 0 0 auto !important;
      /* Anchor enlarged pets to the bottom of ChatGPT's absolute-positioned wrapper. */
      align-self: flex-end !important;
      align-items: flex-start !important;
      justify-content: flex-start !important;
    }

    button[${PET_ATTRIBUTE}] > :first-child {
      width: var(--${APPID}-pet-width) !important;
      height: var(--${APPID}-pet-height) !important;
      scale: none !important;
    }

    button[${PET_ATTRIBUTE}] + * {
      align-self: flex-end !important;
    }
  `;
  document.head.appendChild(style);

  await registerMenuCommand();

  /*
   * Observer strategy:
   * - Target routes intentionally match AIUXC: /, /c/, /g/, and /share/.
   * - New UI normally observes the stable workspace shell, but pet scans are restricted
   *   to its rendered main area so sidebar mutations are ignored.
   * - Legacy UI normally observes the legacy chat root used by AIUXC.
   * - If a stable UI root is unavailable, CWPS falls back to a rendered main area.
   * - If no known root exists, document.body is observed for at most FALLBACK_GRACE_MS.
   *   After that, full-page observation stops and only selector checks run every
   *   HEALTH_CHECK_MS until a supported root returns.
   * - URL changes trigger immediate re-resolution after a short settle delay, while
   *   the periodic health check also repairs root replacement that occurs without
   *   a URL change.
   * - Selector warnings are emitted only on target chat routes and only once until
   *   a healthy observer root is restored.
   */

  const pendingNodes = new Set();
  let scanScheduled = false;

  /**
   * Returns whether the current path is one of ChatGPT's supported chat routes.
   * This intentionally mirrors AIUXC rather than trying to classify every ChatGPT page.
   * @returns {boolean}
   */
  function isTargetChatRoute() {
    return ALLOWED_ROUTES.some((pattern) => pattern.test(location.pathname));
  }

  /**
   * Clears one scheduled timeout.
   * @param {number | null} timerId Timeout identifier.
   * @returns {null}
   */
  function clearScheduledTimeout(timerId) {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    return null;
  }

  /**
   * Batches pet scans into one animation frame so rapid chat updates stay cheap.
   * @param {Node} node Added DOM node.
   * @returns {void}
   */
  function scheduleScan(node) {
    if (!(node instanceof Element)) return;

    pendingNodes.add(node);
    if (scanScheduled) return;

    scanScheduled = true;
    requestAnimationFrame(() => {
      scanScheduled = false;
      pendingNodes.forEach((pendingNode) => {
        if (pendingNode.isConnected) {
          scanNode(pendingNode);
        }
      });
      pendingNodes.clear();
    });
  }

  /**
   * Resolves the preferred currently rendered observer root.
   * New UI prefers the stable workspace shell; legacy UI uses the established
   * AIUXC legacy chat root. A rendered main area is the final narrow fallback.
   * @returns {{ root: HTMLElement, mode: 'workspace' | 'legacy' | 'main', main: HTMLElement | null } | null}
   */
  function resolvePreferredObserverRoot() {
    const workspaceRoot = queryRenderedElement(WORKSPACE_ROOT_SELECTOR);
    if (workspaceRoot) {
      return {
        root: workspaceRoot,
        mode: 'workspace',
        main: queryRenderedElement(MAIN_AREA_SELECTOR, workspaceRoot),
      };
    }

    const legacyRoot = queryRenderedElement(LEGACY_CHAT_ROOT_SELECTOR);
    if (legacyRoot) {
      return {
        root: legacyRoot,
        mode: 'legacy',
        main: null,
      };
    }

    const mainArea = queryRenderedElement(MAIN_AREA_SELECTOR);
    if (mainArea) {
      return {
        root: mainArea,
        mode: 'main',
        main: mainArea,
      };
    }

    return null;
  }

  /**
   * Returns whether the current observer state is a supported normal configuration.
   * @returns {boolean}
   */
  function isHealthyObserverState() {
    if (observerMode === 'workspace') {
      return isRenderedElement(observerRoot) && isRenderedElement(activeMainArea);
    }

    if (observerMode === 'legacy') {
      return isRenderedElement(observerRoot);
    }

    return false;
  }

  /**
   * Schedules one delayed warning for a degraded selector state.
   * Transient route changes are given time to settle, and an existing warning is
   * not repeated until a healthy observer root has recovered.
   * @returns {void}
   */
  function scheduleSelectorWarning() {
    if (selectorWarningActive || selectorWarningTimerId !== null) return;

    const scheduledUrl = location.href;
    selectorWarningTimerId = setTimeout(() => {
      selectorWarningTimerId = null;
      if (selectorWarningActive || scheduledUrl !== location.href || !isTargetChatRoute() || isHealthyObserverState()) {
        return;
      }

      if (observerMode === 'main') {
        selectorWarningActive = true;
        console.warn(
          `${LOG_PREFIX} Stable ChatGPT observer roots remain unavailable; using main-area fallback. ChatGPT DOM may have changed.`,
          {
            workspace: WORKSPACE_ROOT_SELECTOR,
            legacy: LEGACY_CHAT_ROOT_SELECTOR,
            url: location.href,
          }
        );
      } else if (observerMode === 'workspace' && !activeMainArea) {
        selectorWarningActive = true;
        console.warn(
          `${LOG_PREFIX} Main-area selector remains unavailable; scanning the workspace fallback. ChatGPT DOM may have changed.`,
          {
            main: MAIN_AREA_SELECTOR,
            url: location.href,
          }
        );
      }
    }, OBSERVER_TIMING.FALLBACK_GRACE_MS);
  }

  /**
   * Records recovery after a previously reported selector failure.
   * @returns {void}
   */
  function reportSelectorRecovery() {
    if (!selectorWarningActive) return;

    selectorWarningActive = false;
    console.info(`${LOG_PREFIX} Expected ChatGPT observer selectors recovered.`);
  }

  /**
   * Observes one resolved root and performs its initial pet scan.
   * @param {HTMLElement | null} root Observer root.
   * @param {'workspace' | 'legacy' | 'main' | 'body' | 'idle'} mode Observer mode.
   * @param {HTMLElement | null} mainArea Rendered main area, if known.
   * @returns {void}
   */
  function bindObserver(root, mode, mainArea = null) {
    if (root === observerRoot && mode === observerMode && mainArea === activeMainArea) {
      if (isHealthyObserverState()) {
        selectorWarningTimerId = clearScheduledTimeout(selectorWarningTimerId);
        reportSelectorRecovery();
      } else if (observerMode === 'main' || (observerMode === 'workspace' && !activeMainArea)) {
        scheduleSelectorWarning();
      }
      return;
    }

    domObserver.disconnect();
    pendingNodes.clear();

    observerRoot = root;
    observerMode = mode;
    activeMainArea = mainArea;
    selectorWarningTimerId = clearScheduledTimeout(selectorWarningTimerId);

    if (!observerRoot) return;

    if (activeMainArea) {
      scanNode(activeMainArea);
    } else {
      scanNode(observerRoot);
    }

    domObserver.observe(observerRoot, {
      childList: true,
      subtree: true,
    });

    if (isHealthyObserverState()) {
      reportSelectorRecovery();
      return;
    }

    if (observerMode === 'main' || (observerMode === 'workspace' && !activeMainArea)) {
      scheduleSelectorWarning();
    }
  }

  /**
   * Attempts to bind the preferred supported observer root currently available.
   * @returns {boolean} Whether a supported root was found.
   */
  function bindPreferredObserverRoot() {
    const resolved = resolvePreferredObserverRoot();
    if (!resolved) return false;

    fallbackTimerId = clearScheduledTimeout(fallbackTimerId);
    bindObserver(resolved.root, resolved.mode, resolved.main);
    return true;
  }

  /**
   * Stops temporary full-page observation if expected selectors do not recover.
   * The periodic health check continues selector-only recovery without keeping
   * document.body under subtree observation.
   * @returns {void}
   */
  function stopBodyFallback() {
    if (observerMode !== 'body') return;
    if (bindPreferredObserverRoot()) return;

    bindObserver(null, 'idle');

    if (isTargetChatRoute() && !selectorWarningActive) {
      selectorWarningActive = true;
      console.warn(
        `${LOG_PREFIX} Expected ChatGPT observer selectors remain unavailable. Full-page observation was stopped to avoid sustained document.body monitoring; ChatGPT DOM may have changed.`,
        {
          workspace: WORKSPACE_ROOT_SELECTOR,
          legacy: LEGACY_CHAT_ROOT_SELECTOR,
          main: MAIN_AREA_SELECTOR,
          url: location.href,
        }
      );
    }
  }

  /**
   * Starts temporary full-page observation while waiting for a supported chat root.
   * This is intentionally time-limited by FALLBACK_GRACE_MS.
   * @returns {void}
   */
  function startBodyFallback() {
    if (!isTargetChatRoute()) {
      bindObserver(null, 'idle');
      return;
    }

    bindObserver(document.body, 'body');
    fallbackTimerId = clearScheduledTimeout(fallbackTimerId);
    fallbackTimerId = setTimeout(() => {
      fallbackTimerId = null;
      stopBodyFallback();
    }, OBSERVER_TIMING.FALLBACK_GRACE_MS);
  }

  /**
   * Resolves observer state after initial load or URL navigation.
   * Non-chat routes remain idle instead of entering full-page fallback.
   * @returns {void}
   */
  function resolveObserverAfterNavigation() {
    fallbackTimerId = clearScheduledTimeout(fallbackTimerId);
    selectorWarningTimerId = clearScheduledTimeout(selectorWarningTimerId);

    if (!isTargetChatRoute()) {
      bindObserver(null, 'idle');
      return;
    }

    if (bindPreferredObserverRoot()) return;
    startBodyFallback();
  }

  /**
   * Handles mutations according to the active observer mode.
   * Workspace mode filters scans to the rendered main area; legacy/main modes
   * already observe chat-only roots, while body mode is a short recovery fallback.
   * @param {MutationRecord[]} records Mutation records.
   * @returns {void}
   */
  function handleObservedMutations(records) {
    if (observerMode === 'workspace') {
      if (activeMainArea && isRenderedElement(activeMainArea)) {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node instanceof Element && activeMainArea.contains(node)) {
              scheduleScan(node);
            }
          }
        }
        return;
      }

      const nextMainArea = observerRoot ? queryRenderedElement(MAIN_AREA_SELECTOR, observerRoot) : null;
      if (nextMainArea) {
        activeMainArea = nextMainArea;
        selectorWarningTimerId = clearScheduledTimeout(selectorWarningTimerId);
        scanNode(activeMainArea);
        reportSelectorRecovery();
        return;
      }

      activeMainArea = null;
      scheduleSelectorWarning();

      // Preserve functionality while only the stable workspace shell is available.
      for (const record of records) {
        for (const node of record.addedNodes) {
          scheduleScan(node);
        }
      }
      return;
    }

    if (observerMode === 'legacy' || observerMode === 'main') {
      for (const record of records) {
        for (const node of record.addedNodes) {
          scheduleScan(node);
        }
      }
      return;
    }

    if (observerMode === 'body') {
      if (bindPreferredObserverRoot()) return;

      for (const record of records) {
        for (const node of record.addedNodes) {
          scheduleScan(node);
        }
      }
    }
  }

  const domObserver = new MutationObserver(handleObservedMutations);

  /**
   * Checks observer integrity and selector recovery without requiring a URL change.
   * A missing normal root gets one temporary body-fallback attempt; once body
   * fallback expires into idle mode, later health checks perform selector lookup
   * only and do not repeatedly restart full-page observation.
   * @returns {void}
   */
  function checkObserverHealth() {
    if (!isTargetChatRoute()) return;

    const resolved = resolvePreferredObserverRoot();
    if (resolved) {
      bindObserver(resolved.root, resolved.mode, resolved.main);
      return;
    }

    if (observerMode !== 'idle' && observerMode !== 'body') {
      startBodyFallback();
    }
  }

  /**
   * Keeps low-frequency observer integrity checks active for root replacement and recovery.
   * @returns {void}
   */
  function scheduleObserverHealthCheck() {
    healthCheckTimerId = clearScheduledTimeout(healthCheckTimerId);
    healthCheckTimerId = setTimeout(() => {
      healthCheckTimerId = null;
      checkObserverHealth();
      scheduleObserverHealthCheck();
    }, OBSERVER_TIMING.HEALTH_CHECK_MS);
  }

  /**
   * Schedules observer rebinding after a URL change and verifies it once more
   * after the route has had additional time to settle.
   * @returns {void}
   */
  function handleLocationChange() {
    const currentLocation = location.href;
    if (currentLocation === lastLocation) return;
    lastLocation = currentLocation;

    navigationTimerId = clearScheduledTimeout(navigationTimerId);
    navigationVerifyTimerId = clearScheduledTimeout(navigationVerifyTimerId);

    navigationTimerId = setTimeout(() => {
      navigationTimerId = null;
      resolveObserverAfterNavigation();
    }, OBSERVER_TIMING.NAVIGATION_SETTLE_MS);

    navigationVerifyTimerId = setTimeout(() => {
      navigationVerifyTimerId = null;
      if (isTargetChatRoute()) {
        bindPreferredObserverRoot();
      }
    }, OBSERVER_TIMING.NAVIGATION_VERIFY_MS);
  }

  /**
   * Hooks History API navigation so SPA route changes can re-evaluate observer roots.
   * @returns {void}
   */
  function installNavigationHooks() {
    for (const methodName of ['pushState', 'replaceState']) {
      const originalMethod = history[methodName];

      // Keep a standard function so History receives the execution-time this value.
      history[methodName] = function (...args) {
        try {
          return originalMethod.apply(this, args);
        } finally {
          handleLocationChange();
        }
      };
    }

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
  }

  installNavigationHooks();
  resolveObserverAfterNavigation();
  scheduleObserverHealthCheck();
})();
