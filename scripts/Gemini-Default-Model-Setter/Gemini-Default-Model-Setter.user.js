// ==UserScript==
// @name         Gemini Default Model Setter
// @namespace    https://github.com/p65536
// @version      1.2.6
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
      FALLBACK_DELAYS_MS: [300, 800, 1500, 3000],
    },
    NAV_PURPOSE: {
      LIFECYCLE: 'lifecycle',
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
      this._historyWrappers = {};
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

          coordinator._historyWrappers[m] = wrapper;
          history[m] = wrapper;
        }
      }
    }
  }

  /**
   * @class Sentinel
   * @description Detects DOM node insertion using a shared, prefixed CSS animation trick.
   * Designed as a persistent singleton per project prefix.
   * This class does not support explicit lifecycle destruction (no destroy method), as instances are intended to live indefinitely to ensure continuous DOM monitoring across scripts.
   * @property {Map<string, Set<(element: Element) => void>>} listeners
   * @property {Set<string>} rules
   * @property {HTMLElement | null} styleElement
   * @property {CSSStyleSheet | null} sheet
   * @property {WeakMap<CSSRule, string>} ruleSelectors
   */
  class Sentinel {
    static MAX_POLLS = 60;
    static POLL_INTERVAL = 50;

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
      this.isSuspended = false;

      // Use a unique, prefixed animation name shared by all scripts in a project.
      this.animationName = `${prefix}-global-sentinel-animation`;
      this.styleId = `${prefix}-sentinel-global-rules`; // A single, unified style element
      this.listeners = new Map();
      this.rules = new Set(); // Tracks all active selectors
      this.styleElement = null; // Holds the reference to the single style element
      this.sheet = null; // Cache the CSSStyleSheet reference
      /** @type {WeakMap<CSSRule, string>} */
      this.ruleSelectors = new WeakMap(); // Tracks selector strings associated with CSSRule objects
      /** @type {Map<string, string>} */
      this.normalizedSelectors = new Map(); // Maps original selectors to browser-normalized selectors

      this._boundHandleAnimationStart = this._handleAnimationStart.bind(this);

      this._injectStyleElement();
      document.addEventListener('animationstart', this._boundHandleAnimationStart, true);

      globalScope.__global_sentinel_instances__[prefix] = this;
    }

    _injectStyleElement() {
      // Ensure the style element is injected only once per project prefix.
      this.styleElement = document.getElementById(this.styleId);

      if (this.styleElement instanceof HTMLStyleElement) {
        this.styleElement.disabled = this.isSuspended;
        this._waitForStylesheet();
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

      if (target) {
        target.appendChild(this.styleElement);
        this._waitForStylesheet();
      } else {
        const initObserver = new MutationObserver(() => {
          const retryTarget = document.head || document.documentElement;
          if (retryTarget) {
            initObserver.disconnect();

            retryTarget.appendChild(this.styleElement);
            this._waitForStylesheet();
          }
        });
        initObserver.observe(document, { childList: true });
      }
    }

    /**
     * Ensures the style element is connected to the DOM and restores rules if it was removed.
     */
    _ensureStyleGuard() {
      // Lazy Recovery: If the style element is connected but the stylesheet reference (this.sheet) was missed due to a timeout caused by a long task, recover it immediately here.
      if (this.styleElement instanceof HTMLStyleElement && this.styleElement.isConnected && !this.sheet && this.styleElement.sheet) {
        this._syncStylesheetRules();
      }

      if (this.styleElement && !this.styleElement.isConnected) {
        const target = document.head || document.documentElement;
        if (target) {
          this.sheet = null; // Clear stale stylesheet reference before reconnecting
          target.appendChild(this.styleElement);
          this._waitForStylesheet();
        }
      }
    }

    /**
     * Periodically checks for stylesheet availability and triggers full synchronization.
     * @private
     */
    _waitForStylesheet() {
      if (!(this.styleElement instanceof HTMLStyleElement) || !this.styleElement.isConnected) return;

      const styleNode = this.styleElement;
      let pollCount = 0;

      const poll = () => {
        if (!styleNode.isConnected) return;
        if (styleNode.sheet) {
          this._syncStylesheetRules();
        } else if (pollCount < Sentinel.MAX_POLLS) {
          pollCount++;
          console.debug(`[Sentinel] Polling sheet (Attempt ${pollCount}/${Sentinel.MAX_POLLS}). requestAnimationFrame check was insufficient.`);
          setTimeout(poll, Sentinel.POLL_INTERVAL);
        } else {
          // Calculate timeout in seconds dynamically based on constants
          const timeoutSeconds = (Sentinel.MAX_POLLS * Sentinel.POLL_INTERVAL) / 1000;
          console.error(`[Sentinel] Polling sheet timed out after ${timeoutSeconds} seconds.`);
        }
      };

      if (styleNode.sheet) {
        this._syncStylesheetRules();
      } else {
        requestAnimationFrame(() => {
          if (!styleNode.isConnected) return;
          if (styleNode.sheet) {
            this._syncStylesheetRules();
          } else {
            setTimeout(poll, Sentinel.POLL_INTERVAL);
          }
        });
      }
    }

    /**
     * Synchronizes all active rules directly onto the connected stylesheet.
     * @private
     */
    _syncStylesheetRules() {
      if (!(this.styleElement instanceof HTMLStyleElement) || !this.styleElement.isConnected || !this.styleElement.sheet) return;

      this.styleElement.disabled = this.isSuspended;
      this.sheet = this.styleElement.sheet;

      try {
        // Non-destructive cleanup: scan and remove only rules belonging to this instance's active selectors
        for (let i = this.sheet.cssRules.length - 1; i >= 0; i--) {
          const rule = this.sheet.cssRules[i];
          const recordedSelector = this.ruleSelectors.get(rule);
          if (this.rules.has(recordedSelector) || (rule instanceof CSSStyleRule && (this.rules.has(rule.selectorText) || [...this.rules].some((sel) => rule.selectorText === this.normalizedSelectors.get(sel))))) {
            this.sheet.deleteRule(i);
          }
        }

        // Non-destructive keyframes validation
        this._ensureKeyframesRule();
      } catch (e) {
        console.error('[Sentinel] Failed to clear or restore base rules:', e);
      }

      this.rules.forEach((selector) => {
        const success = this._insertRule(selector);
        if (!success) {
          // Rollback invalid selector to prevent infinite error loops on subsequent syncs
          this.rules.delete(selector);
          this.listeners.delete(selector);
        }
      });
    }

    /**
     * Ensures the shared keyframes rule exists in the stylesheet.
     */
    _ensureKeyframesRule() {
      let hasKeyframes = false;
      for (let i = 0; i < this.sheet.cssRules.length; i++) {
        const rule = this.sheet.cssRules[i];
        if (rule instanceof CSSKeyframesRule && rule.name === this.animationName) {
          hasKeyframes = true;
          break;
        }
      }
      if (!hasKeyframes) {
        const keyframes = `@keyframes ${this.animationName} { from { outline: 1px solid transparent; } to { outline: 0px solid transparent; } }`;
        this.sheet.insertRule(keyframes, 0);
      }
    }

    /**
     * Helper to insert a single rule into the stylesheet
     * @param {string} selector
     * @returns {boolean} True if insertion was successful, false otherwise
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
          if (insertedRule instanceof CSSStyleRule) {
            this.normalizedSelectors.set(selector, insertedRule.selectorText);
          }
        }
        return true;
      } catch (e) {
        console.error(`[Sentinel] Rule insertion failed for selector "${selector}". The listener has been rejected and removed:`, e);
        return false;
      }
    }

    _handleAnimationStart(event) {
      if (this.isSuspended) return;

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
              console.error(`[Sentinel] Listener error for selector "${selector}":`, e);
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
        const success = this._insertRule(selector);
        if (!success) {
          // Rollback on immediate insertion failure
          this.listeners.delete(selector);
          this.rules.delete(selector);
        }
      }
    }

    /**
     * @param {string} selector
     * @param {(element: Element) => void} callback
     */
    off(selector, callback) {
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
        this.normalizedSelectors.delete(selector);

        if (this.sheet) {
          // Iterate backwards to avoid index shifting issues during deletion
          for (let i = this.sheet.cssRules.length - 1; i >= 0; i--) {
            const rule = this.sheet.cssRules[i];
            // Check for recorded selector via WeakMap or fallback to selectorText match
            const recordedSelector = this.ruleSelectors.get(rule);
            if (recordedSelector === selector || (rule instanceof CSSStyleRule && (rule.selectorText === selector || rule.selectorText === this.normalizedSelectors.get(selector)))) {
              try {
                this.sheet.deleteRule(i);
              } catch (e) {
                console.error(`[Sentinel] Failed to delete rule for selector "${selector}":`, e);
              }
              // We assume one rule per selector, so we can break after deletion
              break;
            }
          }
        }
      }
    }

    suspend() {
      if (this.isSuspended) return;
      this.isSuspended = true;
      if (this.styleElement instanceof HTMLStyleElement) {
        this.styleElement.disabled = true;
      }
      console.debug('[Sentinel] Suspended.');
    }

    resume() {
      if (!this.isSuspended) return;
      this.isSuspended = false;
      if (this.styleElement instanceof HTMLStyleElement) {
        this.styleElement.disabled = false;
      }
      console.debug('[Sentinel] Resumed.');
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
     * Gets the selector for the trigger element to monitor DOM insertion via Sentinel.
     * @returns {string | null}
     */
    getSentinelSelector() {
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
      SUB_SETTING_EXAMPLES: 'Leave blank to keep current. (e.g., Standard, Extended)',
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
      danger_text: '#d93025',
      accent_text: 'var(--gem-sys-color--primary, #1a73e8)',
      success_text: '#188038',
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

      closeMenu(btn) {
        btn.click();
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
          return { success: false, changed: false };
        }

        const buttonTagSelector = this.getButtonSelector();
        const btn = targetBtn.closest(buttonTagSelector) ?? targetBtn;

        let changed = false;
        if (btn instanceof HTMLElement && !this.isTargetSelected(btn)) {
          btn.click();
          await this.focusInput(signal);
          changed = true;
        } else if (btn instanceof HTMLElement) {
          this.closeMenu(btn);
        }

        return { success: true, changed };
      }

      async executeApplicationFlow(context, signal) {
        let isSettled = context.isSettled;
        let isThinkingSettled = context.isThinkingSettled;
        const setFailed = false;

        // --- Step 1: Model check and enforce ---
        if (!isSettled) {
          const result = await this.applyModelSettings(context.isMatch, signal);

          if (!result.success) {
            console.warn(`${LOG_PREFIX} Target model matching pattern "${context.targetText}" not found in menu.`);
            return { isSettled: false, isThinkingSettled: false, setFailed: false };
          }

          if (result.changed) {
            isThinkingSettled = false;
          }
          isSettled = true;
        }

        // --- Step 2: Thinking Level check and enforce ---
        if (context.targetThinkingText && !isThinkingSettled) {
          const isApplied = await this.applyAdditionalSettings(signal, context.targetThinkingText, context.isThinkingMatch);
          if (isApplied) {
            isThinkingSettled = true;
          }
        }

        return { isSettled, isThinkingSettled, setFailed };
      }

      async focusInput(signal) {
        const inputField = await waitForElement(CONSTANTS.SELECTORS.INPUT_TEXT_FIELD_TARGET, CONSTANTS.TIMING.FOCUS_POLL_INTERVAL_MS, CONSTANTS.TIMING.FOCUS_POLL_MAX_ATTEMPTS, signal);
        if (inputField instanceof HTMLElement && inputField.offsetParent !== null && !signal.aborted) {
          inputField.focus();
        }
      }

      getSentinelSelector() {
        return CONSTANTS.SELECTORS.CURRENT_MODE_LABEL;
      }

      getButtonSelector() {
        return CONSTANTS.SELECTORS.BUTTON_TAG;
      }

      async applyAdditionalSettings(signal, targetThinkingText, isThinkingMatch) {
        const menuButton = document.querySelector(CONSTANTS.SELECTORS.MENU_BUTTON);
        if (!(menuButton instanceof HTMLElement)) return false;

        const isMenuOpen = (btn) => btn?.getAttribute(CONSTANTS.ATTRIBUTES.ARIA_EXPANDED) === CONSTANTS.ATTRIBUTES.TRUE;

        if (!isMenuOpen(menuButton)) {
          menuButton.click();
        }

        let thinkingItem = null;
        for (let i = 0; i < CONSTANTS.TIMING.MENU_POLL_MAX_ATTEMPTS; i++) {
          if (signal.aborted) return false;
          thinkingItem = document.querySelector(CONSTANTS.SELECTORS.THINKING_MENU_ITEM);
          if (thinkingItem instanceof HTMLElement && thinkingItem.offsetParent !== null) break;
          await new Promise((resolve) => setTimeout(resolve, CONSTANTS.TIMING.MENU_POLL_INTERVAL_MS));
        }

        if (thinkingItem instanceof HTMLElement) {
          const sublabel = thinkingItem.querySelector(CONSTANTS.SELECTORS.THINKING_SUBLABEL);
          const currentThinking = sublabel ? sublabel.textContent.trim() : '';

          if (isThinkingMatch(currentThinking)) {
            if (isMenuOpen(menuButton)) {
              menuButton.click();
            }
            return true;
          } else {
            thinkingItem.click();

            let subItems = [];
            for (let i = 0; i < CONSTANTS.TIMING.MENU_POLL_MAX_ATTEMPTS; i++) {
              if (signal.aborted) return false;
              subItems = Array.from(document.querySelectorAll(`${CONSTANTS.SELECTORS.MENU_ITEM_TAG}:not(${CONSTANTS.SELECTORS.THINKING_MENU_ITEM})`)).filter((el) => {
                if (!(el instanceof HTMLElement) || el.offsetParent === null) return false;
                const labelEl = el.querySelector(CONSTANTS.SELECTORS.ITEM_LABEL);
                const textToMatch = labelEl ? labelEl.textContent.trim() : el.textContent.trim();
                return isThinkingMatch(textToMatch);
              });
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
                return true;
              }
            } else {
              console.warn(`${LOG_PREFIX} Target thinking level matching pattern "${targetThinkingText}" not found in sub-menu.`);
              if (isMenuOpen(menuButton)) {
                menuButton.click();
              }
              return false;
            }
          }
        }
        return false;
      }
    }

    return { CONSTANTS, PALETTE, PlatformAdapter: new GeminiModelSetterAdapter() };
  }

  class AppController extends BaseManager {
    #isSetting = false;
    #isVisibilityCheckEnabled = false;
    #setFailedForCurrentContext = false;
    #isSettledForCurrentContext = false;
    #isThinkingSettledForCurrentContext = false;
    #targetText = '';
    #targetThinkingText = '';
    #abortController = null;
    #sentinel = null;
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
     * Schedules fallback state checks to handle delayed DOM updates in SPAs.
     */
    #scheduleFallbackChecks() {
      this.#setFailedForCurrentContext = false;
      const delays = this.#constants.TIMING.FALLBACK_DELAYS_MS;
      delays.forEach((delay) => {
        setTimeout(() => {
          if (this.signal.aborted) return;
          this.#checkAndEnforce();
        }, delay);
      });
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
      this.#targetText = await GM.getValue(this.#targetTextKey, this.#constants.TARGET_TEXT);
      this.#targetThinkingText = await GM.getValue(this.#targetThinkingTextKey, this.#constants.TARGET_THINKING_TEXT);

      await this.#updateMenuCommand();

      this.#sentinel = new Sentinel(OWNERID);

      const sentinelSelector = this.#adapter.getSentinelSelector();
      if (sentinelSelector) {
        const callback = () => {
          console.debug(`${LOG_PREFIX} Element detected via Sentinel, checking state...`);
          this.#checkAndEnforce();
        };
        this.#sentinel.on(sentinelSelector, callback);
        this.addDisposable(() => this.#sentinel.off(sentinelSelector, callback));
      }

      // Initialize navigation monitor to safely detect SPA URL/history changes
      this.#navigationMonitor = new NavigationMonitor(OWNERID);

      const onNavStart = () => {
        this.#isSettledForCurrentContext = false;
        this.#isThinkingSettledForCurrentContext = false;
        this.#abortController?.abort();
      };
      const onNavSettled = () => {
        this.#scheduleFallbackChecks();
      };

      this.addDisposable(this.#navigationMonitor.on(createSubscriberKey(this.#constants.NAV_PURPOSE.LIFECYCLE), onNavStart, onNavSettled, { trackHash: false }));

      const visibilityListener = () => {
        if (document.visibilityState === 'visible' && this.#isVisibilityCheckEnabled) {
          console.debug(`${LOG_PREFIX} Tab became visible, verifying state...`);
          this.#isSettledForCurrentContext = false;
          this.#isThinkingSettledForCurrentContext = false;
          this.#scheduleFallbackChecks();
        }
      };
      document.addEventListener('visibilitychange', visibilityListener);
      this.addDisposable(() => document.removeEventListener('visibilitychange', visibilityListener));

      this.#checkAndEnforce();
      this.#scheduleFallbackChecks();
    }

    /**
     * Lifecycle hook for cleanup.
     * @protected
     * @override
     */
    _onDestroy() {
      // Abort any ongoing asynchronous model selection flows immediately to prevent memory leaks.
      this.#abortController?.abort();
      super._onDestroy();
    }

    /**
     * Update the Tampermonkey menu command label based on the current state
     */
    async #updateMenuCommand() {
      const visibilityStateText = this.#isVisibilityCheckEnabled ? `🟢 Auto-Check on Re-focus: ON` : `🔴 Auto-Check on Re-focus: OFF`;
      const visibilityTooltipText = this.#isVisibilityCheckEnabled ? 'Click to disable checking the model when returning to this page' : 'Click to enable checking the model when returning to this page';

      const [targetId, thinkingId, visibilityId] = await Promise.all([
        GM.registerMenuCommand(`⚙️ Set Target ${this.#constants.MODEL_NAME} Name: ${this.#targetText}`, () => this.#showSettingsModal(this.#constants.FOCUS_TARGETS.MODEL), {
          title: `Set the target ${this.#constants.MODEL_NAME.toLowerCase()} name to fix`,
        }),
        GM.registerMenuCommand(`⚙️ Set Target ${this.#constants.SUB_SETTING_NAME} Name: ${this.#targetThinkingText || '(None)'}`, () => this.#showSettingsModal(this.#constants.FOCUS_TARGETS.THINKING), {
          title: `Set the target ${this.#constants.SUB_SETTING_NAME.toLowerCase()} to fix`,
        }),
        GM.registerMenuCommand(
          visibilityStateText,
          async () => {
            this.#isVisibilityCheckEnabled = !this.#isVisibilityCheckEnabled;
            await GM.setValue(this.#visibilityCheckKey, this.#isVisibilityCheckEnabled);
            console.info(`${LOG_PREFIX} Visibility check state changed: ${this.#isVisibilityCheckEnabled ? 'ON' : 'OFF'}`);
            await this.#updateMenuCommand();
          },
          { title: visibilityTooltipText }
        ),
      ]);

      // Manage menu command registrations dynamically using the resource manager to ensure proper unregistration.
      this.manageResource('menu_target', () => GM.unregisterMenuCommand(targetId));
      this.manageResource('menu_thinking', () => GM.unregisterMenuCommand(thinkingId));
      this.manageResource('menu_visibility', () => GM.unregisterMenuCommand(visibilityId));
    }

    /**
     * Check current state and enforce Pro mode if necessary
     */
    async #checkAndEnforce() {
      if (this.#isSetting || this.#setFailedForCurrentContext) return;

      const currentText = this.#adapter.getCurrentModelText();
      if (!currentText) return;

      let needsModelChange = false;
      if (!this.#isSettledForCurrentContext) {
        if (this.#isMatch(currentText)) {
          this.#isSettledForCurrentContext = true;
        } else {
          needsModelChange = true;
        }
      }

      let needsThinkingChange = false;
      if (this.#targetThinkingText && !this.#isThinkingSettledForCurrentContext) {
        // Pre-check the sub-setting text from the outer DOM to prevent opening the menu unnecessarily
        const currentSubText = this.#adapter.getCurrentSubSettingText();
        if (this.#isThinkingMatch(currentSubText)) {
          this.#isThinkingSettledForCurrentContext = true;
        } else {
          needsThinkingChange = true;
        }
      } else {
        this.#isThinkingSettledForCurrentContext = true;
      }

      if (needsModelChange || needsThinkingChange) {
        await this.#applyTargetModel();
      }
    }

    /**
     * Shows a modal to configure the target model name.
     */
    #showSettingsModal(focusTarget) {
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

      const statusDisplay = document.createElement('div');
      statusDisplay.className = `${APPID}-modal-status`;
      dialog.appendChild(statusDisplay);

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; gap: 8px;';

      const defaultBtn = document.createElement('button');
      defaultBtn.textContent = 'Default';
      defaultBtn.className = `${APPID}-modal-btn`;
      defaultBtn.onclick = () => {
        input.value = this.#constants.TARGET_TEXT;
        thinkingInput.value = this.#constants.TARGET_THINKING_TEXT;
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
        const thinkingPattern = thinkingInput.value;

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

        if (newVal && this.#isValidRegex(newVal) && (!newThinkingVal || this.#isValidRegex(newThinkingVal))) {
          this.#targetText = newVal;
          this.#targetThinkingText = newThinkingVal;

          await GM.setValue(this.#targetTextKey, newVal);
          await GM.setValue(this.#targetThinkingTextKey, newThinkingVal);

          console.info(`${LOG_PREFIX} Target ${this.#constants.MODEL_NAME.toLowerCase()} name updated to: ${newVal}, ${this.#constants.SUB_SETTING_NAME} to: ${newThinkingVal || '(None)'}`);
          this.#setFailedForCurrentContext = false;
          this.#isSettledForCurrentContext = false;
          this.#isThinkingSettledForCurrentContext = false;

          await this.#updateMenuCommand();
          this.#checkAndEnforce();
          dialog.close();
          dialog.remove();
        }
      };

      updateStatus();
      buttonContainer.appendChild(defaultBtn);
      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(saveBtn);
      dialog.appendChild(buttonContainer);
      document.body.appendChild(dialog);
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
      this.#abortController = new AbortController();
      const signal = this.#abortController.signal;

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
        }
      } finally {
        // Cleanup: Always release the fixing lock (#isFixing) and clear the AbortController,
        // regardless of whether the operation succeeded, failed, or threw an exception, to allow future executions.
        this.#isSetting = false;
        this.#abortController = null;
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
