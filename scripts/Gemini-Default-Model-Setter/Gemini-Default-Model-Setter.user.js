// ==UserScript==
// @name         Gemini Default Model Setter
// @namespace    https://github.com/p65536
// @version      1.4.0
// @license      MIT
// @description  Automatically selects a specific model and its additional settings for Gemini upon page load, URL change, or tab return. The target patterns and script state can be easily configured via the extension menu.
// @icon         https://cdn.jsdelivr.net/gh/p65536/p65536@main/images/icons/gdms.svg
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

  // --- Temporal API Polyfill ---
  // Lightweight fallback for outdated browsers that do not support the Temporal API yet.
  const globalObj = typeof globalThis !== 'undefined' ? globalThis : window;
  if (typeof globalObj.Temporal === 'undefined') {
    /** @type {any} */ (globalObj).Temporal = {
      Now: {
        instant: () => ({
          epochMilliseconds: Date.now(),
        }),
        timeZoneId: () => {
          try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
          } catch {
            return 'UTC';
          }
        },
      },
      Instant: {
        fromEpochMilliseconds: (ms) => ({
          toZonedDateTimeISO: () => {
            const d = new Date(ms);
            return {
              year: d.getFullYear(),
              month: d.getMonth() + 1,
              day: d.getDate(),
              hour: d.getHours(),
              minute: d.getMinutes(),
              second: d.getSeconds(),
            };
          },
        }),
      },
    };
  }

  const SHARED_CONSTANTS = {
    FOCUS_TARGETS: {
      MODEL: 'model',
      THINKING: 'thinking',
    },
    TIMING: {
      MENU_POLL_INTERVAL_MS: 120,
      MENU_POLL_MAX_ATTEMPTS: 15,
      FOCUS_POLL_INTERVAL_MS: 60,
      FOCUS_POLL_MAX_ATTEMPTS: 20,
      DOM_STABILIZATION_DEBOUNCE_MS: 200,
      DOM_STABILIZATION_TIMEOUT_MS: 10000,
      SWITCH_POLL_INTERVAL_MS: 30,
      SWITCH_POLL_MAX_ATTEMPTS: 15,
      SITE_AUTO_OVERRIDE_EXPIRY_MS: 1000,
      SPA_NAVIGATION_DELAY_MS: 400,
      INITIAL_LOAD_DELAY_MS: 800,
    },
    NAV_PURPOSE: {
      LIFECYCLE: 'lifecycle',
    },
    RESOURCE_KEYS: {
      MENU_TARGET: 'menu_target',
      MENU_THINKING: 'menu_thinking',
      MENU_VISIBILITY: 'menu_visibility',
      MENU_KEEP_THINKING: 'menu_keep_thinking',
      DOM_OBSERVER: 'dom_observer',
      MODEL_SWITCH_OBSERVER: 'model_switch_observer',
      OBSERVER_TIMEOUT: 'observer_timeout',
      OBSERVER_DEBOUNCE: 'observer_debounce',
      APPLY_SIGNAL: 'apply_signal',
      SWITCH_POLL_TIMEOUT: 'switch_poll_timeout',
      SETTING_MODAL: 'setting_modal',
      NAV_DELAY_TIMEOUT: 'nav_delay_timeout',
      INITIAL_DELAY_TIMEOUT: 'initial_delay_timeout',
    },
  };

  // --- Basic Platform Definitions ---
  const PLATFORM_DEFS = {
    GEMINI: { NAME: 'Gemini', HOST: 'gemini.google.com' },
  };

  /**
   * Identifies the current platform based on the hostname.
   * @returns {string | null}
   */
  function identifyPlatform() {
    const hostname = window.location.hostname;
    if (hostname.endsWith(PLATFORM_DEFS.GEMINI.HOST)) return PLATFORM_DEFS.GEMINI.NAME;
    return null;
  }

  const detectedPlatform = identifyPlatform();
  if (!detectedPlatform) {
    console.warn(`${LOG_PREFIX} Unsupported platform. Script execution stopped.`);
    return;
  }

  /** @type {string} */
  const PLATFORM = detectedPlatform;

  // =================================================================================
  // SECTION: Event-Driven Architecture (Pub/Sub)
  // Description: An event bus for decoupled communication between classes.
  // =================================================================================

  const EventBus = {
    events: {},
    uiWorkQueue: [],
    isUiWorkScheduled: false,
    logPrefix: '[EventBus]',
    debug: false,
    _logAggregation: {},
    _aggregatedEvents: new Set(),
    _aggregationDelay: 500, // ms

    /**
     * Sets the log prefix for this EventBus instance.
     * @param {string} prefix The log prefix string.
     */
    setLogPrefix(prefix) {
      this.logPrefix = prefix;
    },

    /**
     * Sets the debug mode for this EventBus instance.
     * @param {boolean} enabled Whether debug mode is enabled.
     */
    setDebug(enabled) {
      this.debug = enabled;
    },

    setAggregatedEvents(eventsIterable) {
      this._aggregatedEvents = new Set(eventsIterable);
    },

    /**
     * Subscribes a listener to an event using a unique key.
     * If a subscription with the same event and key already exists, it will be overwritten.
     * @param {string} event The event name.
     * @param {Function} listener The callback function.
     * @param {string} key A unique key for this subscription (e.g., 'ClassName.methodName').
     */
    subscribe(event, listener, key) {
      if (!key) {
        console.error(`${this.logPrefix} [EventBus] EventBus.subscribe requires a unique key.`);
        return;
      }
      this.events[event] ??= new Map();
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
        console.error(`${this.logPrefix} [EventBus] EventBus.once requires a unique key.`);
        return;
      }
      const onceListener = (...args) => {
        this.unsubscribe(event, key);
        return listener(...args);
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
     * @param {...unknown} args The data to pass to the listeners.
     */
    publish(event, ...args) {
      if (!this.events[event]) {
        return;
      }

      if (this.debug) {
        // --- Aggregation logic START ---
        if (this._aggregatedEvents.has(event)) {
          this._logAggregation[event] ??= { timer: null, count: 0 };
          const aggregation = this._logAggregation[event];
          aggregation.count++;

          clearTimeout(aggregation.timer);
          aggregation.timer = setTimeout(() => {
            const finalCount = this._logAggregation[event]?.count ?? 0;
            if (finalCount > 0) {
              console.debug(`${this.logPrefix} [EventBus] Event Published: ${event} (x${finalCount})`);
            }
            delete this._logAggregation[event];
          }, this._aggregationDelay);

          // Execute subscribers for the aggregated event, but without the verbose individual logs.
          [...this.events[event].values()].forEach((listener) => {
            try {
              const result = listener(...args);
              if (result instanceof Promise) {
                result.catch((e) => {
                  console.error(`${this.logPrefix} [EventBus] EventBus async error in listener for event "${event}":`, e);
                });
              }
            } catch (e) {
              console.error(`${this.logPrefix} [EventBus] EventBus error in listener for event "${event}":`, e);
            }
          });
          return; // End execution here for aggregated events in debug mode.
        }
        // --- Aggregation logic END ---

        // In debug mode, provide detailed logging for NON-aggregated events.
        const subscriberKeys = [...this.events[event].keys()];

        console.groupCollapsed(`${this.logPrefix} [EventBus] Event Published: ${event}`);

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
        for (const [key, listener] of [...this.events[event].entries()]) {
          try {
            // Log which specific subscriber is being executed
            console.debug(`${this.logPrefix} [EventBus] -> Executing: ${key}`);
            const result = listener(...args);
            if (result instanceof Promise) {
              result.catch((e) => {
                console.error(`${this.logPrefix} [LISTENER ERROR] Async listener "${key}" failed for event "${event}":`, e);
              });
            }
          } catch (e) {
            // Enhance error logging with the specific subscriber key
            console.error(`${this.logPrefix} [LISTENER ERROR] Listener "${key}" failed for event "${event}":`, e);
          }
        }

        console.groupEnd();
      } else {
        // Iterate over a copy of the values in case a listener unsubscribes itself.
        [...this.events[event].values()].forEach((listener) => {
          try {
            const result = listener(...args);
            if (result instanceof Promise) {
              result.catch((e) => {
                console.error(`${this.logPrefix} [LISTENER ERROR] Async listener failed for event "${event}":`, e);
              });
            }
          } catch (e) {
            console.error(`${this.logPrefix} [LISTENER ERROR] Listener failed for event "${event}":`, e);
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
          const result = work();
          if (result instanceof Promise) {
            result.catch((e) => {
              console.error(`${this.logPrefix} [UI QUEUE ERROR] Async error in queued UI work:`, e);
            });
          }
        } catch (e) {
          console.error(`${this.logPrefix} [UI QUEUE ERROR] Error in queued UI work:`, e);
        }
      }

      // Check if new work was added during processing (e.g., from trailing edge handlers)
      if (this.uiWorkQueue.length > 0) {
        requestAnimationFrame(this._processUIWorkQueue.bind(this));
      } else {
        this.isUiWorkScheduled = false;
      }
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

  /**
   * Creates a unique consistent subscriber key for NavigationMonitor.
   * @param {string} purpose - The purpose identifier from CONSTANTS.NAV_PURPOSE.
   * @returns {string} A key in the format '${APPID}-purpose'.
   */
  function createSubscriberKey(purpose) {
    return `${APPID}-${purpose}`;
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
    const FALLBACK_DELAY_MS = 1;
    const SIMULATED_TIME_REMAINING_MS = 50;

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(callback, { timeout });
      return () => window.cancelIdleCallback(id);
    } else {
      // Fallback: Execute almost immediately to avoid blocking.
      // This satisfies the "run by timeout" contract trivially.
      const id = setTimeout(() => {
        // [DO NOT REFACTOR] Duck Typing for API Compatibility
        // Provide a minimal IdleDeadline-like object.
        // Do not simplify or remove this object structure, as callers expect the `timeRemaining` method.
        callback({
          didTimeout: false,
          timeRemaining: () => SIMULATED_TIME_REMAINING_MS,
        });
      }, FALLBACK_DELAY_MS);

      return () => clearTimeout(id);
    }
  }

  /**
   * @param {Function} func
   * @param {number} delay
   * @param {boolean} useIdle
   * @returns {((...args: unknown[]) => void) & { cancel: () => void }}
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

    // [DO NOT REFACTOR] Must remain a standard function, not an arrow function.
    // This ensures the dynamic `this` context from the caller is correctly captured
    // and propagated to the target function via `func.apply(this, args)`.
    /** @this {any} */
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

  // =================================================================================
  // SECTION: Base Manager
  // Description: Provides common lifecycle and event subscription management.
  // =================================================================================

  /**
   * @class BaseManager
   * @description Provides common lifecycle and event subscription management capabilities.
   * Implements the Template Method pattern for init/destroy cycles.
   * Manages all resources in a unified Set to ensure strict LIFO disposal and prevent memory leaks.
   */
  class BaseManager {
    constructor() {
      /**
       * @type {Set<AppDisposable>}
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
     * @param {AppDisposable} disposable A function or object with dispose/disconnect/abort/destroy method.
     * @returns {() => void} A function to dispose of the resource early.
     */
    addDisposable(disposable) {
      return this._registerDisposable(disposable);
    }

    /**
     * Initializes the manager.
     * Prevents double initialization and supports async hooks.
     * @param {...unknown} args Arguments to pass to the hook method.
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
        console.error('BaseManager', '', 'Error in _onDestroy:', e);
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
     * @param {AppDisposable | null} resource The new resource. Pass null to remove existing without replacing.
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
     * @template {AppDisposable} T
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
     * @param {...unknown} args
     * @returns {void | Promise<void>}
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
        return listener(...args);
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
        return listener(...args);
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
        return guardedListener(...args);
      };

      EventBus.once(event, wrappedListener, key);

      return disposeFn;
    }

    /**
     * Internal helper to register a resource into the Set and return a safe dispose function.
     * @private
     * @param {AppDisposable} resource
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
     * @param {AppDisposable} disposable
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
        console.warn('BaseManager', '', 'Error disposing resource type:', e);
      }
    }

    // --- Type Guards ---

    /**
     * @param {unknown} obj
     * @returns {obj is AppDestructibleObj}
     */
    _isDestructibleObj(obj) {
      return typeof obj === 'object' && obj !== null && 'destroy' in obj && typeof (/** @type {{ destroy: unknown }} */ (obj).destroy) === 'function';
    }

    /**
     * @param {unknown} obj
     * @returns {obj is AppDisposableObj}
     */
    _isDisposableObj(obj) {
      return typeof obj === 'object' && obj !== null && 'dispose' in obj && typeof (/** @type {{ dispose: unknown }} */ (obj).dispose) === 'function';
    }

    /**
     * @param {unknown} obj
     * @returns {obj is AppDisconnectableObj}
     */
    _isDisconnectableObj(obj) {
      return typeof obj === 'object' && obj !== null && 'disconnect' in obj && typeof (/** @type {{ disconnect: unknown }} */ (obj).disconnect) === 'function';
    }

    /**
     * @param {unknown} obj
     * @returns {obj is AppAbortableObj}
     */
    _isAbortableObj(obj) {
      return typeof obj === 'object' && obj !== null && 'abort' in obj && typeof (/** @type {{ abort: unknown }} */ (obj).abort) === 'function';
    }
  }

  /**
   * @class NavigationMonitor
   * @description A shared, safe History API wrapper to detect SPA navigations. Prevents infinite nesting and conflicts across multiple userscripts.
   * * [USAGE NOTES]
   * - **Singleton Coordination**: This class acts as a centralized Singleton coordinator per `ownerId` to multiplex navigation events across multiple script instances seamlessly.
   * - **Subscriber-Based Idempotency**: Subscriptions are uniquely identified via a `subscriberId`. Registering a subscriber with an existing ID will safely cancel its pending debounced execution and overwrite it with the new configuration.
   * - **Persistent Hooking**: For cross-script stability, this coordinator does not implement a `destroy` or history restoration mechanism. The History API hooks remain active permanently.
   * - **Listener Lifecycle**: Invoke the unsubscription token function returned by the `on()` method to safely remove the script's listeners from the shared coordinator.
   */
  class NavigationMonitor {
    static POST_NAVIGATION_DOM_SETTLE = 200;

    /**
     * @param {string} ownerId - Unique identifier to share the hook ecosystem.
     */
    constructor(ownerId) {
      this.ownerId = ownerId;

      /** @type {Window & { __global_nav_coordinators__?: Record<string, any> }} */
      const globalScope = window;
      globalScope.__global_nav_coordinators__ ??= {};
      if (globalScope.__global_nav_coordinators__[ownerId]) {
        return globalScope.__global_nav_coordinators__[ownerId];
      }

      this.listeners = new Map();
      this.originalHistoryMethods = { pushState: null, replaceState: null };
      this.isHooked = false;
      this._boundHandlePopState = null;
      this._boundHandleCustomNavEvent = null;
      this.lastPath = null;

      globalScope.__global_nav_coordinators__[ownerId] = this;
    }

    /**
     * @param {string} subscriberId - Unique key to identify the subscriber and prevent duplicates.
     * @param {Function} onNavStart
     * @param {Function} onNavSettled
     * @param {Object} options - Configuration parameters for the navigation subscription.
     * @param {boolean} options.trackHash - Specifies whether the subscriber triggers on location.hash modifications.
     * @returns {() => void} A function to unsubscribe this listener pair.
     */
    on(subscriberId, onNavStart, onNavSettled, options) {
      /** @type {Window & { __global_nav_coordinators__?: Record<string, any> }} */
      const globalScope = window;
      const coordinator = globalScope.__global_nav_coordinators__[this.ownerId];
      if (!coordinator) return () => {};

      // If a subscriber with the same subscriberId already exists, cancel its debounce and overwrite it safely.
      if (coordinator.listeners.has(subscriberId)) {
        const existingPair = coordinator.listeners.get(subscriberId);
        existingPair.debouncedNavigation.cancel();
        coordinator.listeners.delete(subscriberId);
      }

      // Configure hash-tracking behavior based on the explicit subscription option.
      const trackHash = options.trackHash;
      const initialPath = trackHash ? location.pathname + location.search + location.hash : location.pathname + location.search;

      // Bundle the start callback and its corresponding debounced settled callback.
      const listenerPair = {
        onNavStart,
        debouncedNavigation: debounce(onNavSettled, NavigationMonitor.POST_NAVIGATION_DOM_SETTLE, true),
        trackHash,
        lastPath: initialPath,
      };

      coordinator.listeners.set(subscriberId, listenerPair);

      if (!coordinator.isHooked) {
        coordinator.lastPath = location.pathname + location.search + location.hash;

        coordinator._boundHandleCustomNavEvent = () => {
          const fullPath = location.pathname + location.search + location.hash;
          if (fullPath === coordinator.lastPath) return;
          coordinator.lastPath = fullPath;

          for (const pair of coordinator.listeners.values()) {
            const currentPath = pair.trackHash ? fullPath : location.pathname + location.search;

            if (currentPath !== pair.lastPath) {
              pair.lastPath = currentPath;
              pair.onNavStart();
              pair.debouncedNavigation();
            }
          }
        };

        coordinator._boundHandlePopState = () => {
          globalScope.dispatchEvent(new CustomEvent(`${this.ownerId}:locationchange`));
        };

        this._hookHistory(coordinator);
        globalScope.addEventListener(`${this.ownerId}:locationchange`, coordinator._boundHandleCustomNavEvent);
        globalScope.addEventListener('popstate', coordinator._boundHandlePopState);
        globalScope.addEventListener('hashchange', coordinator._boundHandlePopState);
      }

      // Return the unsubscription token closure directly.
      return () => {
        listenerPair.debouncedNavigation.cancel();
        // Only remove from coordinator if this specific listener instance is still active
        if (coordinator.listeners.get(subscriberId) === listenerPair) {
          coordinator.listeners.delete(subscriberId);
        }
      };
    }

    /**
     * @private
     * @param {Object} coordinator
     */
    _hookHistory(coordinator) {
      const hookFlag = `__${this.ownerId}_HISTORY_HOOKED__`;
      /** @type {Window & { __global_nav_coordinators__?: Record<string, any> }} */
      const globalScope = window;

      if (!coordinator.isHooked && !globalScope[hookFlag]) {
        globalScope[hookFlag] = true;
        coordinator.isHooked = true;
        const ownerId = this.ownerId;

        for (const m of ['pushState', 'replaceState']) {
          const orig = history[m];
          coordinator.originalHistoryMethods[m] = orig;

          // [DO NOT REFACTOR] `wrapper` must remain a standard function to safely capture the execution-time `this`.
          /** @this {History} */
          const wrapper = function (...args) {
            try {
              return orig.apply(this, args);
            } finally {
              // Always dispatch the event via 'finally' to ensure navigation state changes
              // are broadcasted, even if the native history method or another hooked wrapper throws an error.
              globalScope.dispatchEvent(new CustomEvent(`${ownerId}:locationchange`));
            }
          };

          history[m] = wrapper;
        }
      }
    }
  }

  /**
   * @class BaseModelSetterAdapter
   * @description Abstract base class for platform-specific interactions.
   */
  class BaseModelSetterAdapter {
    /**
     * Gets the text of the currently selected model.
     * @returns {string | undefined}
     */
    getCurrentModelText() {
      throw new Error('Not implemented');
    }

    /**
     * Gets the text of the current sub-setting (e.g., thinking level).
     * @returns {string}
     */
    getCurrentSubSettingText() {
      return '';
    }

    /**
     * Executes the platform-specific model and settings application flow.
     * @param {Object} context
     * @param {string} context.targetText
     * @param {string} context.targetThinkingText
     * @param {function(string): boolean} context.isMatch
     * @param {function(string): boolean} context.isThinkingMatch
     * @param {boolean} context.isSettled
     * @param {boolean} context.isThinkingSettled
     * @param {AbortSignal} signal
     * @returns {Promise<{ isSettled: boolean, isThinkingSettled: boolean, setFailed: boolean }>}
     */
    async executeApplicationFlow(context, signal) {
      throw new Error('Not implemented');
    }

    /**
     * Focuses the text input field.
     * @param {AbortSignal} signal
     * @returns {Promise<void>}
     */
    async focusInput(signal) {
      throw new Error('Not implemented');
    }

    /**
     * Gets the selector for the target button element.
     * @returns {string}
     */
    getButtonSelector() {
      throw new Error('Not implemented');
    }
  }

  function defineGeminiValues() {
    const CONSTANTS = {
      ...SHARED_CONSTANTS,
      TARGET_TEXT: 'Flash$',
      TARGET_THINKING_TEXT: '',
      MODEL_NAME: 'Model',
      MODEL_EXAMPLES: 'e.g., Flash, Pro',
      SUB_SETTING_NAME: 'Thinking Level',
      SUB_SETTING_EXAMPLES: 'Leave blank to use site default. (e.g., Standard, Extended)',
      SELECTORS: {
        CURRENT_MODE_LABEL: '[data-test-id="logo-pill-label-container"]',
        MENU_BUTTON: '[data-test-id="bard-mode-menu-button"]',
        MENU_ITEMS: '[data-test-id^="bard-mode-option-"]',
        THINKING_MENU_ITEM: '[value="thinking_level"]',
        ITEM_LABEL: '.label',
        THINKING_SUBLABEL: '.sublabel',
        INPUT_TEXT_FIELD_TARGET: 'rich-textarea .ql-editor',
        DISABLED_STATE: ':disabled, [aria-disabled="true"], [class*="disabled"]',
        BUTTON_TAG: 'button',
        MENU_ITEM_TAG: 'gem-menu-item',
        PICKER_PRIMARY_TEXT: '.picker-primary-text',
        PICKER_SECONDARY_TEXT: '.picker-secondary-text',
      },
      ATTRIBUTES: {
        ARIA_EXPANDED: 'aria-expanded',
        ARIA_CONTROLS: 'aria-controls',
        TRUE: 'true',
      },
    };

    const PALETTE = {
      bg: 'var(--gem-sys-color--surface-container-highest)',
      input_bg: 'var(--gem-sys-color--surface-container-low)',
      text_primary: 'var(--gem-sys-color--on-surface)',
      text_secondary: 'var(--gem-sys-color--on-surface-variant)',
      border: 'var(--gem-sys-color--outline)',
      btn_bg: 'var(--gem-sys-color--surface-container-high)',
      btn_hover_bg: 'var(--gem-sys-color--surface-container-higher)',
      btn_text: 'var(--gem-sys-color--on-surface-variant)',
      danger_text: 'rgb(217 48 37)',
      accent_text: 'var(--gem-sys-color--primary, rgb(26 115 232))',
      success_text: 'rgb(24 128 56)',
    };

    class GeminiModelSetterAdapter extends BaseModelSetterAdapter {
      getCurrentModelText() {
        const el = document.querySelector(CONSTANTS.SELECTORS.PICKER_PRIMARY_TEXT);
        return el ? el.textContent?.trim() : document.querySelector(CONSTANTS.SELECTORS.CURRENT_MODE_LABEL)?.textContent?.trim();
      }

      getCurrentSubSettingText() {
        return document.querySelector(CONSTANTS.SELECTORS.PICKER_SECONDARY_TEXT)?.textContent?.trim() || '';
      }

      openMenu() {
        const menuButton = document.querySelector(CONSTANTS.SELECTORS.MENU_BUTTON);
        if (menuButton instanceof HTMLElement && menuButton.getAttribute(CONSTANTS.ATTRIBUTES.ARIA_EXPANDED) !== CONSTANTS.ATTRIBUTES.TRUE) {
          menuButton.click();
        }
      }

      getMenuItems() {
        return /** @type {HTMLElement[]} */ (Array.from(document.querySelectorAll(CONSTANTS.SELECTORS.MENU_ITEMS)).filter((el) => el instanceof HTMLElement && el.offsetParent !== null));
      }

      findTargetMenuItem(items, isMatch) {
        return items.find((el) => {
          const labelEl = el.querySelector(CONSTANTS.SELECTORS.ITEM_LABEL);
          const textToMatch = labelEl ? labelEl.textContent : el.textContent;
          return isMatch(textToMatch.trim());
        });
      }

      isTargetSelected(btn) {
        return btn.matches(CONSTANTS.SELECTORS.DISABLED_STATE);
      }

      closeMenu() {
        const menuButton = document.querySelector(CONSTANTS.SELECTORS.MENU_BUTTON);
        if (menuButton instanceof HTMLElement && menuButton.getAttribute(CONSTANTS.ATTRIBUTES.ARIA_EXPANDED) === CONSTANTS.ATTRIBUTES.TRUE) {
          // Click only when the menu is actually open to prevent accidental re-opening
          menuButton.click();
        }
      }

      async applyModelSettings(isMatch, signal) {
        this.openMenu();
        let items = [];
        const maxAttempts = CONSTANTS.TIMING.MENU_POLL_MAX_ATTEMPTS;
        const intervalMs = CONSTANTS.TIMING.MENU_POLL_INTERVAL_MS;
        for (let i = 0; i < maxAttempts; i++) {
          if (signal.aborted) return { success: false, changed: false };
          items = this.getMenuItems();
          if (items.length > 0) break;
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }

        const targetBtn = this.findTargetMenuItem(items, isMatch);
        if (!(targetBtn instanceof HTMLElement)) {
          this.closeMenu();
          return { success: false, changed: false };
        }

        const buttonTagSelector = this.getButtonSelector();
        const btn = targetBtn.closest(buttonTagSelector) ?? targetBtn;

        let changed = false;
        if (btn instanceof HTMLElement && !this.isTargetSelected(btn)) {
          btn.click();
          await this.focusInput(signal);
          changed = true;
        } else {
          // Explicitly close the menu only if no target switch occurs to avoid race conditions
          this.closeMenu();
        }

        return { success: true, changed };
      }

      /**
       * Executes the platform-specific model and settings application flow.
       * @param {Object} context
       * @param {string} context.targetText
       * @param {string} context.targetThinkingText
       * @param {function(string): boolean} context.isMatch
       * @param {function(string): boolean} context.isThinkingMatch
       * @param {boolean} context.isSettled
       * @param {boolean} context.isThinkingSettled
       * @param {AbortSignal} signal
       * @returns {Promise<{ isSettled: boolean, isThinkingSettled: boolean, setFailed: boolean, thinkingFailed: boolean, modelChanged: boolean }>}
       */
      async executeApplicationFlow(context, signal) {
        let isSettled = context.isSettled;
        let isThinkingSettled = context.isThinkingSettled;
        const setFailed = false;
        let thinkingFailed = false;

        // --- Step 1: Model check and enforce ---
        if (!isSettled) {
          const result = await this.applyModelSettings(context.isMatch, signal);
          if (!result.success) {
            console.warn(`${LOG_PREFIX} Target model matching pattern "${context.targetText}" not found in menu.`);
            return { isSettled: false, isThinkingSettled: false, setFailed: true, thinkingFailed: false, modelChanged: false };
          }

          if (result.changed) {
            // Early return to let the MutationObserver handle DOM updates after model switch.
            // Pass modelChanged: true to synchronize the script's own interaction timestamp.
            return { isSettled: true, isThinkingSettled: false, setFailed: false, thinkingFailed: false, modelChanged: true };
          }
          isSettled = true;
        }

        // --- Step 2: Thinking Level check and enforce ---
        if (context.targetThinkingText && !isThinkingSettled) {
          const result = await this.applyAdditionalSettings(signal, context.targetThinkingText, context.isThinkingMatch);
          if (result.success) {
            isThinkingSettled = true;
          } else if (result.fatal) {
            thinkingFailed = true;
          }
        }

        return { isSettled, isThinkingSettled, setFailed, thinkingFailed, modelChanged: false };
      }

      async focusInput(signal) {
        const inputField = await waitForElement(CONSTANTS.SELECTORS.INPUT_TEXT_FIELD_TARGET, CONSTANTS.TIMING.FOCUS_POLL_INTERVAL_MS, CONSTANTS.TIMING.FOCUS_POLL_MAX_ATTEMPTS, signal);
        if (inputField instanceof HTMLElement && inputField.offsetParent !== null && !signal.aborted) {
          inputField.focus();
        }
      }

      getButtonSelector() {
        return CONSTANTS.SELECTORS.BUTTON_TAG;
      }

      /**
       * Applies the preferred thinking level settings from the sub-menu.
       * @param {AbortSignal} signal
       * @param {string} targetThinkingText
       * @param {function(string): boolean} isThinkingMatch
       * @returns {Promise<{ success: boolean, fatal: boolean }>} Resolves with status indicating success and fatality.
       */
      async applyAdditionalSettings(signal, targetThinkingText, isThinkingMatch) {
        const menuButton = document.querySelector(CONSTANTS.SELECTORS.MENU_BUTTON);
        if (!(menuButton instanceof HTMLElement)) return { success: false, fatal: false };

        const isMenuOpen = (btn) => btn?.getAttribute(CONSTANTS.ATTRIBUTES.ARIA_EXPANDED) === CONSTANTS.ATTRIBUTES.TRUE;
        if (!isMenuOpen(menuButton)) {
          menuButton.click();
        }

        let thinkingItem = null;
        for (let i = 0; i < CONSTANTS.TIMING.MENU_POLL_MAX_ATTEMPTS; i++) {
          if (signal.aborted) return { success: false, fatal: false };
          thinkingItem = document.querySelector(CONSTANTS.SELECTORS.THINKING_MENU_ITEM);
          if (thinkingItem instanceof HTMLElement && thinkingItem.offsetParent !== null) break;
          // Shortcut: If menu items are loaded but thinking option is missing, it's an unsupported model
          if (document.querySelector(CONSTANTS.SELECTORS.MENU_ITEMS) !== null) {
            if (isMenuOpen(menuButton)) {
              menuButton.click();
            }
            return { success: false, fatal: true };
          }
          await new Promise((resolve) => setTimeout(resolve, CONSTANTS.TIMING.MENU_POLL_INTERVAL_MS));
        }

        if (!(thinkingItem instanceof HTMLElement)) {
          if (isMenuOpen(menuButton)) {
            menuButton.click();
          }
          return { success: false, fatal: false };
        }

        const sublabel = thinkingItem.querySelector(CONSTANTS.SELECTORS.THINKING_SUBLABEL);
        const currentThinking = sublabel ? sublabel.textContent.trim() : '';

        if (isThinkingMatch(currentThinking)) {
          if (isMenuOpen(menuButton)) {
            menuButton.click();
          }
          return { success: true, fatal: false };
        } else {
          thinkingItem.click();

          let subItems = [];
          let isSubMenuLoaded = false;
          for (let i = 0; i < CONSTANTS.TIMING.MENU_POLL_MAX_ATTEMPTS; i++) {
            if (signal.aborted) return { success: false, fatal: false };
            const targetMenuId = thinkingItem.getAttribute(CONSTANTS.ATTRIBUTES.ARIA_CONTROLS);
            const subMenuContainer = targetMenuId ? document.getElementById(targetMenuId) : null;
            if (subMenuContainer instanceof HTMLElement) {
              isSubMenuLoaded = true; // Mark container as successfully encountered
              subItems = Array.from(subMenuContainer.querySelectorAll(CONSTANTS.SELECTORS.MENU_ITEM_TAG)).filter((el) => {
                if (!(el instanceof HTMLElement) || el.offsetParent === null) return false;
                const labelEl = el.querySelector(CONSTANTS.SELECTORS.ITEM_LABEL);
                const textToMatch = labelEl ? labelEl.textContent.trim() : el.textContent.trim();
                return isThinkingMatch(textToMatch);
              });
            }

            if (subItems.length > 0) break;
            await new Promise((resolve) => setTimeout(resolve, CONSTANTS.TIMING.MENU_POLL_INTERVAL_MS));
          }

          if (subItems.length > 0) {
            const targetSubBtn = subItems[0].closest(this.getButtonSelector()) ?? subItems[0];
            if (targetSubBtn instanceof HTMLElement) {
              targetSubBtn.click();
              const inputField = await waitForElement(CONSTANTS.SELECTORS.INPUT_TEXT_FIELD_TARGET, CONSTANTS.TIMING.FOCUS_POLL_INTERVAL_MS, CONSTANTS.TIMING.FOCUS_POLL_MAX_ATTEMPTS, signal);
              if (inputField instanceof HTMLElement && inputField.offsetParent !== null && !signal.aborted) {
                inputField.focus();
              }
              return { success: true, fatal: false };
            }
          }

          // If the sub-menu container was successfully inspected but no match found, it's an invalid configuration (fatal).
          // If the container never loaded within the timeout, treat it as a transient rendering delay (non-fatal).
          const isFatal = isSubMenuLoaded;
          if (isFatal) {
            console.warn(`${LOG_PREFIX} Target thinking level matching pattern "${targetThinkingText}" not found in sub-menu.`);
          }
          if (isMenuOpen(menuButton)) {
            menuButton.click();
          }
          return { success: false, fatal: isFatal };
        }
      }
    }

    return { CONSTANTS, PALETTE, PlatformAdapter: new GeminiModelSetterAdapter() };
  }

  class AppController extends BaseManager {
    #isSetting = false;
    #lastManualMenuInteraction = 0;
    #isVisibilityCheckEnabled = false;
    #isKeepThinkingEnabled = false;
    #setFailedForCurrentContext = false;
    #isSettledForCurrentContext = false;
    #isThinkingSettledForCurrentContext = false;
    #isThinkingApplyFailedForCurrentContext = false;
    #targetText = '';
    #targetThinkingText = '';
    #adapter = null;
    #constants = null;
    #palette = null;
    #navigationMonitor = null;

    constructor(platformDefinition) {
      super();
      this.#constants = platformDefinition.CONSTANTS;
      this.#palette = platformDefinition.PALETTE;
      this.#adapter = platformDefinition.PlatformAdapter;
    }

    get #visibilityCheckKey() {
      return `${APPID}-${PLATFORM}-visibility-check-state`;
    }
    get #keepThinkingCheckKey() {
      return `${APPID}-${PLATFORM}-keep-thinking-check-state`;
    }
    get #targetTextKey() {
      return `${APPID}-${PLATFORM}-target-text-state`;
    }
    get #targetThinkingTextKey() {
      return `${APPID}-${PLATFORM}-target-thinking-text-state`;
    }

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
     * Checks if the given text matches the target thinking level regex pattern (case-insensitive).
     * @param {string} text
     * @returns {boolean}
     */
    #isThinkingMatch(text) {
      if (!this.#targetThinkingText) return true;
      try {
        const rx = new RegExp(this.#targetThinkingText, 'i');
        return rx.test(text);
      } catch {
        return false;
      }
    }

    /**
     * Starts a transient MutationObserver to detect DOM stabilization.
     * Automatically disconnects once the state is settled or after a timeout.
     */
    #startObserver() {
      this.#setFailedForCurrentContext = false;

      if (this._keyedDisposables.has(this.#constants.RESOURCE_KEYS.DOM_OBSERVER)) {
        console.debug(`${LOG_PREFIX} [Observer] Cleared previous active monitoring before restart.`);
        this.manageResource(this.#constants.RESOURCE_KEYS.DOM_OBSERVER, null);
      }
      this.manageResource(this.#constants.RESOURCE_KEYS.OBSERVER_TIMEOUT, null);
      this.manageResource(this.#constants.RESOURCE_KEYS.OBSERVER_DEBOUNCE, null);

      if (this.signal.aborted) return;

      this.#checkAndEnforce();

      if (this.#isSettledForCurrentContext && this.#isThinkingSettledForCurrentContext) {
        console.debug(`${LOG_PREFIX} [Observer] Active state already settled. Skipping DOM monitoring.`);
        return;
      }

      console.debug(`${LOG_PREFIX} [Observer] Started DOM monitoring (Max timeout: ${this.#constants.TIMING.DOM_STABILIZATION_TIMEOUT_MS}ms).`);

      const observer = new MutationObserver(() => {
        this.manageResource(this.#constants.RESOURCE_KEYS.OBSERVER_DEBOUNCE, null);
        const debounceId = setTimeout(() => {
          this.#checkAndEnforce();
        }, this.#constants.TIMING.DOM_STABILIZATION_DEBOUNCE_MS);
        this.manageResource(this.#constants.RESOURCE_KEYS.OBSERVER_DEBOUNCE, () => clearTimeout(debounceId));
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      this.manageResource(this.#constants.RESOURCE_KEYS.DOM_OBSERVER, observer);

      const timeoutId = setTimeout(() => {
        if (this._keyedDisposables.has(this.#constants.RESOURCE_KEYS.DOM_OBSERVER)) {
          console.warn(`${LOG_PREFIX} [Observer] DOM did not stabilize within timeout. Forcing disconnect.`);
          this.manageResource(this.#constants.RESOURCE_KEYS.DOM_OBSERVER, null);
          this.#checkAndEnforce();
        }
        this.manageResource(this.#constants.RESOURCE_KEYS.OBSERVER_DEBOUNCE, null);
      }, this.#constants.TIMING.DOM_STABILIZATION_TIMEOUT_MS);
      this.manageResource(this.#constants.RESOURCE_KEYS.OBSERVER_TIMEOUT, () => clearTimeout(timeoutId));
    }

    /**
     * Initialize the setter state and set up event-driven observation.
     * Uses Sentinel (CSS Animation) for new elements and NavigationMonitor for SPA navigation detection.
     * @protected
     * @override
     */
    async _onInit() {
      super._onInit();
      EventBus.setLogPrefix(LOG_PREFIX);

      this.#isVisibilityCheckEnabled = await GM.getValue(this.#visibilityCheckKey, false);
      this.#isKeepThinkingEnabled = await GM.getValue(this.#keepThinkingCheckKey, false);
      this.#targetText = await GM.getValue(this.#targetTextKey, this.#constants.TARGET_TEXT);
      this.#targetThinkingText = await GM.getValue(this.#targetThinkingTextKey, this.#constants.TARGET_THINKING_TEXT);

      await this.#updateMenuCommand();

      // Track manual user interactions to distinguish between user actions and site auto-overrides
      const interactionListener = (e) => {
        if (e.isTrusted && e.target instanceof Element) {
          // Limit the interaction monitoring scope strictly to the model picker UI and menu items
          if (e.target.closest(this.#constants.SELECTORS.MENU_BUTTON) || e.target.closest(this.#constants.SELECTORS.MENU_ITEMS) || e.target.closest(this.#constants.SELECTORS.MENU_ITEM_TAG)) {
            this.#lastManualMenuInteraction = Temporal.Now.instant().epochMilliseconds;
          }
        }
      };
      // Use capture phase to ensure we catch interactions before they might be stopped by site scripts
      document.addEventListener('click', interactionListener, true);
      document.addEventListener('keydown', interactionListener, true);
      this.addDisposable(() => {
        document.removeEventListener('click', interactionListener, true);
        document.removeEventListener('keydown', interactionListener, true);
      });
      // Initialize navigation monitor to safely detect SPA URL/history changes
      this.#navigationMonitor = new NavigationMonitor(OWNERID);
      const onNavStart = () => {
        this.#isSettledForCurrentContext = false;
        this.#isThinkingSettledForCurrentContext = false;
        this.#isThinkingApplyFailedForCurrentContext = false;
        this.manageResource(this.#constants.RESOURCE_KEYS.APPLY_SIGNAL, null);
        this.manageResource(this.#constants.RESOURCE_KEYS.MODEL_SWITCH_OBSERVER, null);
        this.manageResource(this.#constants.RESOURCE_KEYS.SWITCH_POLL_TIMEOUT, null);
        this.manageResource(this.#constants.RESOURCE_KEYS.NAV_DELAY_TIMEOUT, null);
      };
      const onNavSettled = () => {
        // Delay the initial observer start to allow site's async history fetch to complete
        const delayId = setTimeout(() => {
          this.#startObserver();
        }, this.#constants.TIMING.SPA_NAVIGATION_DELAY_MS);
        this.manageResource(this.#constants.RESOURCE_KEYS.NAV_DELAY_TIMEOUT, () => clearTimeout(delayId));
      };

      this.addDisposable(this.#navigationMonitor.on(createSubscriberKey(this.#constants.NAV_PURPOSE.LIFECYCLE), onNavStart, onNavSettled, { trackHash: false }));
      const visibilityListener = () => {
        if (document.visibilityState === 'visible' && this.#isVisibilityCheckEnabled) {
          console.debug(`${LOG_PREFIX} Tab became visible, verifying state...`);
          this.#isSettledForCurrentContext = false;
          this.#isThinkingSettledForCurrentContext = false;
          this.#startObserver();
        }
      };
      document.addEventListener('visibilitychange', visibilityListener);
      this.addDisposable(() => document.removeEventListener('visibilitychange', visibilityListener));
      // Delay the initial observer start to allow the site's hydration and async history fetch to complete
      const initDelayId = setTimeout(() => {
        this.#startObserver();
      }, this.#constants.TIMING.INITIAL_LOAD_DELAY_MS);
      this.manageResource(this.#constants.RESOURCE_KEYS.INITIAL_DELAY_TIMEOUT, () => clearTimeout(initDelayId));
    }

    /**
     * Lifecycle hook for cleanup.
     * @protected
     * @override
     */
    _onDestroy() {
      super._onDestroy();
    }

    /**
     * Update the Tampermonkey menu command label based on the current state
     */
    async #updateMenuCommand() {
      // Clear all existing menu commands first to guarantee sequential re-registration order
      this.manageResource(this.#constants.RESOURCE_KEYS.MENU_TARGET, null);
      this.manageResource(this.#constants.RESOURCE_KEYS.MENU_THINKING, null);
      this.manageResource(this.#constants.RESOURCE_KEYS.MENU_KEEP_THINKING, null);
      this.manageResource(this.#constants.RESOURCE_KEYS.MENU_VISIBILITY, null);

      const visibilityStateText = this.#isVisibilityCheckEnabled ? `🟢 Auto-Check on Re-focus: ON` : `🔴 Auto-Check on Re-focus: OFF`;
      const visibilityTooltipText = this.#isVisibilityCheckEnabled ? 'Click to disable checking the model when returning to this page' : 'Click to enable checking the model when returning to this page';

      const menuPromises = [
        GM.registerMenuCommand(`⚙️ Set Target ${this.#constants.MODEL_NAME} Name: ${this.#targetText}`, () => this.#showSettingsModal(this.#constants.FOCUS_TARGETS.MODEL), {
          title: `Set the target ${this.#constants.MODEL_NAME.toLowerCase()} name to fix`,
        }),
        GM.registerMenuCommand(`⚙️ Set Target ${this.#constants.SUB_SETTING_NAME}: ${this.#targetThinkingText || '(None)'}`, () => this.#showSettingsModal(this.#constants.FOCUS_TARGETS.THINKING), {
          title: `Set the target ${this.#constants.SUB_SETTING_NAME.toLowerCase()} to fix`,
        }),
      ];

      let keepThinkingIdx = -1;
      // Only register keepThinking menu if targetThinkingText is not empty
      if (this.#targetThinkingText) {
        const keepThinkingStateText = this.#isKeepThinkingEnabled ? `🟢 Set Thinking Level on Model Switch: ON` : `🔴 Set Thinking Level on Model Switch: OFF`;
        const keepThinkingTooltipText = this.#isKeepThinkingEnabled ? 'Click to disable setting the thinking level when manually switching models' : 'Click to enable setting the thinking level when manually switching models';

        keepThinkingIdx = menuPromises.length;
        menuPromises.push(
          GM.registerMenuCommand(
            keepThinkingStateText,
            async () => {
              this.#isKeepThinkingEnabled = !this.#isKeepThinkingEnabled;
              await GM.setValue(this.#keepThinkingCheckKey, this.#isKeepThinkingEnabled);
              console.info(`${LOG_PREFIX} Keep thinking level state changed: ${this.#isKeepThinkingEnabled ? 'ON' : 'OFF'}`);
              await this.#updateMenuCommand();
              this.#manageModelSwitchObserver();
            },
            { title: keepThinkingTooltipText }
          )
        );
      }

      const visibilityIdx = menuPromises.length;
      menuPromises.push(
        GM.registerMenuCommand(
          visibilityStateText,
          async () => {
            this.#isVisibilityCheckEnabled = !this.#isVisibilityCheckEnabled;
            await GM.setValue(this.#visibilityCheckKey, this.#isVisibilityCheckEnabled);
            console.info(`${LOG_PREFIX} Visibility check state changed: ${this.#isVisibilityCheckEnabled ? 'ON' : 'OFF'}`);
            await this.#updateMenuCommand();
          },
          { title: visibilityTooltipText }
        )
      );

      const registeredIds = await Promise.all(menuPromises);

      // Manage menu command registrations dynamically using the resource manager to ensure proper unregistration.
      this.manageResource(this.#constants.RESOURCE_KEYS.MENU_TARGET, () => GM.unregisterMenuCommand(registeredIds[0]));
      this.manageResource(this.#constants.RESOURCE_KEYS.MENU_THINKING, () => GM.unregisterMenuCommand(registeredIds[1]));
      this.manageResource(this.#constants.RESOURCE_KEYS.MENU_VISIBILITY, () => GM.unregisterMenuCommand(registeredIds[visibilityIdx]));

      if (keepThinkingIdx !== -1) {
        this.manageResource(this.#constants.RESOURCE_KEYS.MENU_KEEP_THINKING, () => GM.unregisterMenuCommand(registeredIds[keepThinkingIdx]));
      }
    }

    /**
     * Check current state and enforce target model and thinking level if necessary.
     * Implements dynamic real-time auditing against the outer DOM text to safely catch
     * and overwrite delayed site history auto-overrides during initial loads or SPA navigations.
     */
    async #checkAndEnforce() {
      if (this.#isSetting || this.#setFailedForCurrentContext) return;
      const currentText = this.#adapter.getCurrentModelText();
      if (!currentText) return;

      let needsModelChange = false;
      let needsThinkingChange = false;

      // --- Check model state (Real-time Audit) ---
      if (this.#isMatch(currentText)) {
        this.#isSettledForCurrentContext = true;
      } else {
        // If the current DOM text doesn't match the target, we must differentiate between
        // a genuine manual user change and a delayed asynchronous site auto-override.
        const timeSinceLastInteraction = Temporal.Now.instant().epochMilliseconds - this.#lastManualMenuInteraction;
        const isSiteAutoOverride = timeSinceLastInteraction > this.#constants.TIMING.SITE_AUTO_OVERRIDE_EXPIRY_MS;

        if (isSiteAutoOverride) {
          // A delayed site override occurred (e.g., during SPA history loading).
          // Forcefully drop the settled flag to trigger a re-enforcement rewrite.
          this.#isSettledForCurrentContext = false;
          needsModelChange = true;
        } else {
          // A genuine manual model switch took place. Respect it and treat it as settled
          // within this main context to prevent the script from overriding user intent.
          this.#isSettledForCurrentContext = true;
        }
      }

      // --- Check thinking level state ---
      if (this.#targetThinkingText && !this.#isThinkingSettledForCurrentContext) {
        if (this.#isThinkingApplyFailedForCurrentContext) {
          // Treated as settled to stop retrying the invalid configuration, keeping the main flow unblocked
          this.#isThinkingSettledForCurrentContext = true;
        } else {
          const currentSubText = this.#adapter.getCurrentSubSettingText();
          if (this.#isThinkingMatch(currentSubText)) {
            this.#isThinkingSettledForCurrentContext = true;
          } else {
            needsThinkingChange = true;
          }
        }
      } else {
        this.#isThinkingSettledForCurrentContext = true;
      }

      if (needsModelChange || needsThinkingChange) {
        await this.#applyTargetModel();
      }

      // Only disconnect observer when both are settled
      if (this.#isSettledForCurrentContext && this.#isThinkingSettledForCurrentContext) {
        if (this._keyedDisposables.has(this.#constants.RESOURCE_KEYS.DOM_OBSERVER)) {
          console.debug(`${LOG_PREFIX} [Observer] Target setup verified/settled. Disconnected monitoring.`);
          this.manageResource(this.#constants.RESOURCE_KEYS.DOM_OBSERVER, null);
        }
        this.manageResource(this.#constants.RESOURCE_KEYS.OBSERVER_TIMEOUT, null);
        this.manageResource(this.#constants.RESOURCE_KEYS.OBSERVER_DEBOUNCE, null);
        this.#manageModelSwitchObserver();
      }
    }

    /**
     * Manages the lightweight observer that detects manual model switching.
     * Starts only if Keep Thinking Level is enabled; otherwise stops completely.
     */
    #manageModelSwitchObserver() {
      // Always clear the previous observer first to ensure we re-bind to the latest DOM element
      // upon subsequent manual switches or SPA URL navigations.
      this.manageResource(this.#constants.RESOURCE_KEYS.MODEL_SWITCH_OBSERVER, null);
      // Cancel any ongoing menu close polling to prevent conflicting observer triggers.
      this.manageResource(this.#constants.RESOURCE_KEYS.SWITCH_POLL_TIMEOUT, null);

      const targetNode = document.querySelector(this.#constants.SELECTORS.CURRENT_MODE_LABEL);
      if (!targetNode) return;

      const primaryEl = targetNode.querySelector(this.#constants.SELECTORS.PICKER_PRIMARY_TEXT);
      const secondaryEl = targetNode.querySelector(this.#constants.SELECTORS.PICKER_SECONDARY_TEXT);
      let lastPrimaryText = primaryEl ? primaryEl.textContent?.trim() || '' : targetNode.textContent?.trim() || '';
      let lastSecondaryText = secondaryEl ? secondaryEl.textContent?.trim() || '' : '';

      const observer = new MutationObserver(() => {
        if (this.#isSetting) return;

        // Re-evaluate the node dynamically from the DOM to handle potential node replacements safely
        const currentTargetNode = document.querySelector(this.#constants.SELECTORS.CURRENT_MODE_LABEL);
        if (!currentTargetNode) return;

        const currPrimaryEl = currentTargetNode.querySelector(this.#constants.SELECTORS.PICKER_PRIMARY_TEXT);
        const currSecondaryEl = currentTargetNode.querySelector(this.#constants.SELECTORS.PICKER_SECONDARY_TEXT);

        // Prevent evaluation and protect baseline drift if the primary element is missing
        if (!currPrimaryEl) {
          console.warn(`${LOG_PREFIX} [Observer] Primary element not found. Skipping evaluation until it recovers.`);
          if (currSecondaryEl) {
            lastSecondaryText = currSecondaryEl.textContent?.trim() || '';
          }
          return;
        }

        const currentPrimary = currPrimaryEl.textContent?.trim() || '';
        const currentSecondary = currSecondaryEl ? currSecondaryEl.textContent?.trim() || '' : '';

        const modelChanged = currentPrimary !== lastPrimaryText;
        const thinkingChanged = currentSecondary !== lastSecondaryText;

        if (modelChanged || thinkingChanged) {
          const timeSinceLastInteraction = Temporal.Now.instant().epochMilliseconds - this.#lastManualMenuInteraction;
          // Consider it a site auto-override if there has been no manual interaction within the configured expiry time
          const isSiteAutoOverride = timeSinceLastInteraction > this.#constants.TIMING.SITE_AUTO_OVERRIDE_EXPIRY_MS;
          if (isSiteAutoOverride) {
            console.debug(`${LOG_PREFIX} [Observer] Detected automatic site override. Initiating self-healing...`);
            this.#isSettledForCurrentContext = false;
            this.#isThinkingSettledForCurrentContext = false;
            this.#isThinkingApplyFailedForCurrentContext = false;
            // Clear current observer immediately to avoid conflicting triggers before restarting the main flow
            this.manageResource(this.#constants.RESOURCE_KEYS.MODEL_SWITCH_OBSERVER, null);
            this.#startObserver();
          } else if (this.#isKeepThinkingEnabled && this.#targetThinkingText) {
            // Pattern 1: Manual model switch detected and current thinking level does not match target setting. Enforce it.
            // Pattern 2 & 3: Model changed but already matches setting, or only thinking level changed. Do nothing.
            if (modelChanged && !this.#isThinkingMatch(currentSecondary)) {
              console.debug(`${LOG_PREFIX} [Observer] Manual model switch detected and thinking level needs enforcement. Waiting for menu items to disappear...`);
              // Disconnect immediately to prevent multiple triggers during the menu closing transition
              this.manageResource(this.#constants.RESOURCE_KEYS.MODEL_SWITCH_OBSERVER, null);
              this.#isSettledForCurrentContext = true;
              // Lock model to maintain manual change
              this.#isThinkingSettledForCurrentContext = false;
              let attempts = 0;
              const checkMenuClosed = () => {
                if (this.isDestroyed) return;
                // Check if menu options are completely removed from the DOM to ensure the closing transition has fully settled
                const hasMenuItems = document.querySelector(this.#constants.SELECTORS.MENU_ITEMS) !== null;
                attempts++;

                if (!hasMenuItems || attempts > this.#constants.TIMING.SWITCH_POLL_MAX_ATTEMPTS) {
                  // Poll up to ~450ms then fallback safely
                  this.manageResource(this.#constants.RESOURCE_KEYS.SWITCH_POLL_TIMEOUT, null);
                  this.#startObserver();
                } else {
                  const timeoutId = setTimeout(checkMenuClosed, this.#constants.TIMING.SWITCH_POLL_INTERVAL_MS);
                  // Track the polling timer to allow disposal during navigation or state changes.
                  this.manageResource(this.#constants.RESOURCE_KEYS.SWITCH_POLL_TIMEOUT, () => clearTimeout(timeoutId));
                }
              };
              checkMenuClosed();
            }
          }
          lastPrimaryText = currentPrimary;
          lastSecondaryText = currentSecondary;
        }
      });
      // Observe the parent element to catch replacement or detachment of the target label node itself
      observer.observe(targetNode.parentElement ?? targetNode, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      this.manageResource(this.#constants.RESOURCE_KEYS.MODEL_SWITCH_OBSERVER, observer);
      console.debug(`${LOG_PREFIX} [Observer] Started lightweight model switch monitoring.`);
    }

    /**
     * Shows a modal to configure the target model name.
     */
    #showSettingsModal(focusTarget) {
      // Safely destroy any existing modal via the manager
      this.manageResource(this.#constants.RESOURCE_KEYS.SETTING_MODAL, null);
      const dialog = document.createElement('dialog');
      const style = document.createElement('style');
      style.textContent = `
.${APPID}-modal-btn {
background: ${this.#palette.btn_bg};
color: ${this.#palette.btn_text};
border: 1px solid ${this.#palette.border};
border-radius: 20px;
padding: 8px 16px;
cursor: pointer;
font-family: inherit;
font-size: 14px;
transition: background 0.2s;
flex: 1;
}
.${APPID}-modal-btn:hover:not(:disabled) {
background: ${this.#palette.btn_hover_bg};
}
.${APPID}-modal-btn:disabled {
opacity: 0.5;
cursor: not-allowed;
}
.${APPID}-modal-input {
width: 100%;
box-sizing: border-box;
padding: 10px;
border: 1px solid ${this.#palette.border};
border-radius: 8px;
background: ${this.#palette.input_bg};
color: ${this.#palette.text_primary};
font-size: 14px;
font-family: inherit;
margin-bottom: 8px;
}
.${APPID}-modal-input:focus {
outline: 2px solid ${this.#palette.accent_text};
outline-offset: -1px;
}
.${APPID}-modal-text-small {
font-size: 15px;
line-height: 1.5;
white-space: pre-wrap;
color: ${this.#palette.text_secondary};
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
border: 1px solid ${this.#palette.border};
border-radius: 12px;
box-shadow: 0 4px 6px rgb(0 0 0 / 0.1);
font-family: sans-serif;
background: ${this.#palette.bg};
color: ${this.#palette.text_primary};
width: 380px;
position: fixed !important;
top: 50% !important;
left: 50% !important;
transform: translate(-50%, -50%) !important;
margin: 0 !important;
`;

      const title = document.createElement('h3');
      title.textContent = `${APPNAME}`;
      title.style.margin = '0 0 8px 0';
      dialog.appendChild(title);

      const desc = document.createElement('span');
      desc.className = `${APPID}-modal-text-small`;
      desc.textContent = 'Use Regular Expression (case-insensitive).\nJust enter the pattern itself (do not enclose in "/").';
      dialog.appendChild(desc);

      const patternLabel = document.createElement('label');
      patternLabel.textContent = `${this.#constants.MODEL_NAME}:`;
      patternLabel.style.cssText = 'display:block; font-size:13px; margin-bottom:4px; font-weight:bold;';
      dialog.appendChild(patternLabel);

      const modelDesc = document.createElement('span');
      modelDesc.className = `${APPID}-modal-text-small`;
      modelDesc.style.cssText = 'font-size: 13px; margin-bottom: 8px; display: block;';
      modelDesc.textContent = this.#constants.MODEL_EXAMPLES;
      dialog.appendChild(modelDesc);

      const input = document.createElement('input');
      input.type = 'text';
      input.value = this.#targetText;
      input.className = `${APPID}-modal-input`;
      dialog.appendChild(input);

      const thinkingPatternLabel = document.createElement('label');
      thinkingPatternLabel.textContent = `${this.#constants.SUB_SETTING_NAME}:`;
      thinkingPatternLabel.style.cssText = 'display:block; font-size:13px; margin-bottom:4px; font-weight:bold; margin-top:12px;';
      dialog.appendChild(thinkingPatternLabel);

      const thinkingDesc = document.createElement('span');
      thinkingDesc.className = `${APPID}-modal-text-small`;
      thinkingDesc.style.cssText = 'font-size: 13px; margin-bottom: 8px; display: block;';
      thinkingDesc.textContent = this.#constants.SUB_SETTING_EXAMPLES;
      dialog.appendChild(thinkingDesc);

      const thinkingInput = document.createElement('input');
      thinkingInput.type = 'text';
      thinkingInput.value = this.#targetThinkingText;
      thinkingInput.className = `${APPID}-modal-input`;
      dialog.appendChild(thinkingInput);

      const keepThinkingLabel = document.createElement('label');
      keepThinkingLabel.style.cssText = 'display:flex; align-items:center; font-size:13px; margin-bottom:16px; margin-top:8px; transition: opacity 0.2s;';
      const keepThinkingCheckbox = document.createElement('input');
      keepThinkingCheckbox.type = 'checkbox';
      keepThinkingCheckbox.checked = this.#isKeepThinkingEnabled;
      keepThinkingCheckbox.style.marginRight = '8px';
      keepThinkingLabel.appendChild(keepThinkingCheckbox);
      keepThinkingLabel.appendChild(document.createTextNode('Set Thinking Level on Model Switch'));
      dialog.appendChild(keepThinkingLabel);

      const statusDisplay = document.createElement('div');
      statusDisplay.className = `${APPID}-modal-status`;
      dialog.appendChild(statusDisplay);
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; gap: 8px;';
      // Register to manager and obtain a self-disposing function
      const disposeDialog = this.manageResource(this.#constants.RESOURCE_KEYS.SETTING_MODAL, () => {
        if (dialog.open) {
          dialog.close();
        }
        if (dialog.parentNode) {
          dialog.remove();
        }
      });
      const defaultBtn = document.createElement('button');
      defaultBtn.textContent = 'Default';
      defaultBtn.className = `${APPID}-modal-btn`;
      defaultBtn.onclick = () => {
        input.value = this.#constants.TARGET_TEXT;
        thinkingInput.value = this.#constants.TARGET_THINKING_TEXT;
        keepThinkingCheckbox.checked = false;
        updateStatus();
      };

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.className = `${APPID}-modal-btn`;
      cancelBtn.onclick = () => {
        disposeDialog();
      };

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.className = `${APPID}-modal-btn`;

      const updateStatus = () => {
        const pattern = input.value;
        const thinkingPattern = thinkingInput.value;

        // Disable checkbox if target thinking level is empty
        keepThinkingCheckbox.disabled = !thinkingPattern.trim();
        // Adjust label style based on disabled state to reflect it visually
        keepThinkingLabel.style.opacity = keepThinkingCheckbox.disabled ? '0.5' : '1';
        keepThinkingLabel.style.cursor = keepThinkingCheckbox.disabled ? 'not-allowed' : 'pointer';
        // Uncheck if the checkbox becomes disabled to prevent inconsistent states
        if (keepThinkingCheckbox.disabled) {
          keepThinkingCheckbox.checked = false;
        }
        if (pattern.includes('/') || thinkingPattern.includes('/')) {
          statusDisplay.textContent = '⚠️ Do not use "/"';
          statusDisplay.style.color = this.#palette.danger_text;
          saveBtn.disabled = true;
          return;
        }
        if (!this.#isValidRegex(pattern) || (thinkingPattern && !this.#isValidRegex(thinkingPattern))) {
          statusDisplay.textContent = '⚠️ Invalid Regex';
          statusDisplay.style.color = this.#palette.danger_text;
          saveBtn.disabled = true;
          return;
        }

        saveBtn.disabled = false;
        statusDisplay.textContent = '✅ Valid format';
        statusDisplay.style.color = this.#palette.success_text;
      };

      input.addEventListener('input', updateStatus);
      thinkingInput.addEventListener('input', updateStatus);
      saveBtn.onclick = async () => {
        const newVal = input.value.trim();
        const newThinkingVal = thinkingInput.value.trim();
        const newKeepThinkingVal = keepThinkingCheckbox.checked;

        if (newVal && this.#isValidRegex(newVal) && (!newThinkingVal || this.#isValidRegex(newThinkingVal))) {
          // Guard against multiple non-atomic invocations via rapid clicks
          saveBtn.disabled = true;
          this.#targetText = newVal;
          this.#targetThinkingText = newThinkingVal;
          this.#isKeepThinkingEnabled = newKeepThinkingVal;

          await GM.setValue(this.#targetTextKey, newVal);
          await GM.setValue(this.#targetThinkingTextKey, newThinkingVal);
          await GM.setValue(this.#keepThinkingCheckKey, newKeepThinkingVal);
          console.info(`${LOG_PREFIX} Target ${this.#constants.MODEL_NAME.toLowerCase()} name updated to: ${newVal}, ${this.#constants.SUB_SETTING_NAME} to: ${newThinkingVal || '(None)'}`);
          this.#setFailedForCurrentContext = false;
          this.#isSettledForCurrentContext = false;
          this.#isThinkingSettledForCurrentContext = false;
          this.#isThinkingApplyFailedForCurrentContext = false;

          await this.#updateMenuCommand();
          this.#manageModelSwitchObserver();
          this.#checkAndEnforce();
          disposeDialog();
        }
      };

      updateStatus();
      buttonContainer.appendChild(defaultBtn);
      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(saveBtn);
      dialog.appendChild(buttonContainer);
      document.body.appendChild(dialog);

      // Catch native hide events (e.g., Esc key) and link to manager's resource release
      dialog.addEventListener('close', () => {
        disposeDialog();
      });
      dialog.showModal();

      if (focusTarget === this.#constants.FOCUS_TARGETS.THINKING) {
        thinkingInput.focus();
        thinkingInput.select();
      } else {
        input.focus();
        input.select();
      }
    }

    /**
     * Open the menu, select the target model, and handle exceptions/refocus.
     * Enforces menu state checks to prevent toggling conflicts and logs missing elements.
     * @returns {Promise<void>}
     */
    async #applyTargetModel() {
      if (this.#isSetting) return;
      this.#isSetting = true;
      const controller = new AbortController();
      this.manageResource(this.#constants.RESOURCE_KEYS.APPLY_SIGNAL, controller);
      const signal = controller.signal;
      try {
        const result = await this.#adapter.executeApplicationFlow(
          {
            targetText: this.#targetText,
            targetThinkingText: this.#targetThinkingText,
            isMatch: (text) => this.#isMatch(text),
            isThinkingMatch: (text) => this.#isThinkingMatch(text),
            isSettled: this.#isSettledForCurrentContext,
            isThinkingSettled: this.#isThinkingSettledForCurrentContext,
          },
          signal
        );
        if (result) {
          this.#isSettledForCurrentContext = result.isSettled;
          this.#isThinkingSettledForCurrentContext = result.isThinkingSettled;
          this.#setFailedForCurrentContext = result.setFailed;
          this.#isThinkingApplyFailedForCurrentContext = result.thinkingFailed;
        }
      } catch (e) {
        // Log the failure but allow future retries upon subsequent DOM mutations to ensure self-healing
        console.error(`${LOG_PREFIX} Failed to apply target model or settings:`, e);
      } finally {
        // Cleanup: Always release the fixing lock (#isFixing) and clear the AbortController,
        // regardless of whether the operation succeeded, failed, or threw an exception, to allow future executions.
        this.#isSetting = false;
        this.manageResource(this.#constants.RESOURCE_KEYS.APPLY_SIGNAL, null);
      }
    }
  }

  // --- Entry Point ---
  let selectedDefinition = null;
  switch (PLATFORM) {
    case PLATFORM_DEFS.GEMINI.NAME:
      selectedDefinition = defineGeminiValues();
      break;
  }

  if (selectedDefinition) {
    const setter = new AppController(selectedDefinition);
    setter.init();
  } else {
    console.error(`${LOG_PREFIX} Failed to load definitions for platform: ${PLATFORM}`);
  }
})();
