// --- GM_xmlhttpRequest Types ---
interface GMXMLHttpRequestResponse<T = unknown> {
    finalUrl: string;
    readyState: number;
    status: number;
    statusText: string;
    responseHeaders: string;
    response: T;
    responseText: string;
    responseXML: Document | null;
    context: unknown;
}

interface GMXMLHttpRequestDetails<T = unknown> {
    method?: "GET" | "POST" | "HEAD" | "PUT" | "DELETE" | "OPTIONS" | "PATCH";
    url: string;
    headers?: { [header: string]: string };
    data?: string | FormData | Blob | File | ArrayBuffer | ArrayBufferView | URLSearchParams;
    cookie?: string;
    binary?: boolean;
    nocache?: boolean;
    revalidate?: boolean;
    timeout?: number;
    context?: unknown;
    responseType?: "text" | "json" | "blob" | "arraybuffer" | "document" | "stream";
    overrideMimeType?: string;
    anonymous?: boolean;
    fetch?: boolean;
    user?: string;
    password?: string;
    onload?: (response: GMXMLHttpRequestResponse<T>) => void;
    onloadend?: (response: GMXMLHttpRequestResponse<T>) => void;
    onloadstart?: (response: GMXMLHttpRequestResponse<T>) => void;
    onprogress?: (response: GMXMLHttpRequestResponse<T>) => void;
    onreadystatechange?: (response: GMXMLHttpRequestResponse<T>) => void;
    ontimeout?: (response: GMXMLHttpRequestResponse<T>) => void;
    onabort?: (response: GMXMLHttpRequestResponse<T>) => void;
    onerror?: (response: GMXMLHttpRequestResponse<T>) => void;
}

// --- GM Functions ---
// Note: GM_* functions (Sync)
declare function GM_addValueChangeListener(key: string, listener: (name: string, oldValue: unknown, newValue: unknown, remote: boolean) => void): number | string;
declare function GM_removeValueChangeListener(listenerId: number | string): void;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_getValue<T>(key: string, defaultValue?: T): T;
declare function GM_deleteValue(key: string): void;
declare function GM_listValues(): string[];
declare function GM_xmlhttpRequest<T = unknown>(details: GMXMLHttpRequestDetails<T>): { abort: () => void };
declare function GM_registerMenuCommand(caption: string, onClick: (event: MouseEvent | KeyboardEvent) => void, accessKey?: string): number | string;
declare function GM_download(details: { url: string; name?: string; onload?: () => void }): { abort: () => void };
declare function GM_addStyle(css: string): HTMLStyleElement;

// --- GM Namespace (Async) ---
declare const GM: {
    setValue(key: string, value: unknown): Promise<void>;
    getValue<T>(key: string, defaultValue?: T): Promise<T>;
    deleteValue(key: string): Promise<void>;
    listValues(): Promise<string[]>;
    xmlHttpRequest<T = unknown>(details: GMXMLHttpRequestDetails<T>): { abort: () => void };
};

// --- Globals ---
declare const unsafeWindow: Window & typeof globalThis;
declare function exportFunction(fn: Function, target: object, options?: { defineAs: string }): void;
declare function cloneInto<T>(obj: T, target: object, options?: { cloneFunctions?: boolean }): T;

// --- Data Structures ---

interface ActorConfig {
    name: string | null;
    icon: string | null;
    textColor: string | null;
    font: string | null;
    bubbleBackgroundColor: string | null;
    bubblePadding: number | null;
    bubbleBorderRadius: number | null;
    bubbleMaxWidth: number | null;
    standingImageUrl: string | null;
}

interface StyleHandle {
    id: string;
    prefix: string;
    classes: Record<string, string>;
    vars: Record<string, string>;
    rootId: string | null;
}

interface StyleDefinition {
    key: string;
    classes: Record<string, string>;
    vars: Record<string, string>;
    rootId: string | null;
    generator: ((cls: Record<string, string>, activeVars?: Set<string>) => string) | (() => string);
}

interface ThemeSet {
    metadata: {
        id: string;
        name: string;
        matchPatterns: string[];
        urlPatterns: string[];
    };
    user: ActorConfig;
    assistant: ActorConfig;
    window: {
        backgroundColor: string | null;
        backgroundImageUrl: string | null;
        backgroundSize: string | null;
        backgroundPosition: string | null;
        backgroundRepeat: string | null;
    };
    inputArea: {
        backgroundColor: string | null;
        textColor: string | null;
    };
}

interface PlatformSettings {
    options: {
        icon_size: number;
        chat_content_max_width: number | null;
        respect_avatar_space: boolean;
    };
    features: {
        load_full_history_on_chat_load?: { enabled: boolean };
        timestamp: { enabled: boolean };
        collapsible_button: {
            enabled: boolean;
            auto_collapse_user_message: { enabled: boolean };
        };
        bubble_nav_buttons: { enabled: boolean };
        fixed_nav_console: {
            enabled: boolean;
            position?: string;
            keyboard_shortcuts: { enabled: boolean };
        };
    };
    defaultSet: Omit<ThemeSet, 'metadata'>;
}

interface AppConfig {
    platforms: {
        [key: string]: PlatformSettings;
    };
    developer: {
        logger_level: string;
    };
    themeSets: ThemeSet[];
}

interface StorageManifest {
    schemaVersion: number;
    updatedAt: number; // Timestamp for sync detection
    config: Omit<AppConfig, 'themeSets'>; // All settings excluding themes
    themeIndex: string[]; // List of stored theme IDs
}

interface StorageThemeData extends ThemeSet {
}

interface AppEvents {
    // Theme & Style
    /**
     * @description Fired when the chat title changes, signaling a potential theme change.
     */
    TITLE_CHANGED: 'aiuxc:TITLE_CHANGED';
    /**
     * @description Requests a re-evaluation and application of the current theme.
     */
    THEME_UPDATE: 'aiuxc:THEME_UPDATE';
    /**
     * @description Fired after all theme styles, including asynchronous images, have been fully applied.
     */
    THEME_APPLIED: 'aiuxc:THEME_APPLIED';
    /**
     * @description Fired when a width-related slider in the settings panel is changed, to preview the new width.
     */
    WIDTH_PREVIEW: 'aiuxc:WIDTH_PREVIEW';

    // UI & Layout
    /**
     * @description Fired by ThemeManager after it has applied a new chat content width.
     */
    CHAT_CONTENT_WIDTH_UPDATED: 'aiuxc:CHAT_CONTENT_WIDTH_UPDATED';
    /**
     * @description Fired when the main window is resized.
     */
    WINDOW_RESIZED: 'aiuxc:WINDOW_RESIZED';
    /**
     * @description Fired when the sidebar's layout (width or visibility) changes.
     */
    SIDEBAR_LAYOUT_CHANGED: 'aiuxc:SIDEBAR_LAYOUT_CHANGED';
    /**
     * @description Requests a re-check of visibility-dependent UI elements (e.g., standing images when a panel appears).
     */
    VISIBILITY_RECHECK: 'aiuxc:VISIBILITY_RECHECK';
    /**
     * @description Requests a check to ensure UI elements are correctly placed within their target containers.
     */
    UI_REPOSITION: 'aiuxc:UI_REPOSITION';
    /**
     * @description Fired when the chat input area is resized.
     */
    INPUT_AREA_RESIZED: 'aiuxc:INPUT_AREA_RESIZED';

    // Navigation & Cache
    /**
     * @description Fired when a page navigation is about to start.
     */
    NAVIGATION_START: 'aiuxc:NAVIGATION_START';
    /**
     * @description Fired after a page navigation has completed and the UI is stable.
     */
    NAVIGATION_END: 'aiuxc:NAVIGATION_END';
    /**
     * @description Fired when a page navigation (URL change) is detected. Used to reset manager states.
     */
    NAVIGATION: 'aiuxc:NAVIGATION';
    /**
     * @description Fired to request an update of the message cache, typically after a DOM mutation.
     */
    CACHE_UPDATE_REQUEST: 'aiuxc:CACHE_UPDATE_REQUEST';
    /**
     * @description Fired after the MessageCacheManager has finished rebuilding its cache.
     */
    CACHE_UPDATED: 'aiuxc:CACHE_UPDATED';
    /**
     * @description Requests that a specific message element be highlighted by the navigation system.
     */
    NAV_HIGHLIGHT_MESSAGE: 'aiuxc:NAV_HIGHLIGHT_MESSAGE';

    // Message Lifecycle
    /**
     * @description Fired by Sentinel when a new message bubble's core content is added to the DOM.
     */
    RAW_MESSAGE_ADDED: 'aiuxc:RAW_MESSAGE_ADDED';
    /**
     * @description Fired to request the injection of an avatar into a specific message element.
     */
    AVATAR_INJECT: 'aiuxc:AVATAR_INJECT';
    /**
     * @description Fired when a message container has been identified and is ready for further processing, such as the injection of UI addons (e.g., navigation buttons).
     */
    MESSAGE_COMPLETE: 'aiuxc:MESSAGE_COMPLETE';
    /**
     * @description Fired when an entire conversation turn (user query and assistant response) is complete, including streaming.
     */
    TURN_COMPLETE: 'aiuxc:TURN_COMPLETE';
    /**
     * @description Fired when an assistant response starts streaming.
     */
    STREAMING_START: 'aiuxc:STREAMING_START';
    /**
     * @description Fired when an assistant response finishes streaming.
     */
    STREAMING_END: 'aiuxc:STREAMING_END';
    /**
     * @description Fired after streaming ends to trigger deferred layout updates.
     */
    DEFERRED_LAYOUT_UPDATE: 'aiuxc:DEFERRED_LAYOUT_UPDATE';
    /**
     * @description (ChatGPT-only) Fired when historical timestamps are loaded from the API.
     */
    TIMESTAMPS_LOADED: 'aiuxc:TIMESTAMPS_LOADED';
    /**
     * @description Fired when a new timestamp for a realtime message is recorded.
     */
    TIMESTAMP_ADDED: 'aiuxc:TIMESTAMP_ADDED';

    // System & Config
    /**
     * @description Fired when a remote configuration change is detected from another tab/window.
     */
    REMOTE_CONFIG_CHANGED: 'aiuxc:REMOTE_CONFIG_CHANGED';
    /**
     * @description Requests the temporary suspension of all major DOM observers (MutationObserver, Sentinel).
     */
    SUSPEND_OBSERVERS: 'aiuxc:SUSPEND_OBSERVERS';
    /**
     * @description Requests the resumption of suspended observers.
     */
    RESUME_OBSERVERS: 'aiuxc:RESUME_OBSERVERS';
    /**
     * @description Fired when the configuration size exceeds the storage limit.
     */
    CONFIG_SIZE_EXCEEDED: 'aiuxc:CONFIG_SIZE_EXCEEDED';
    /**
     * @description Fired to update the display state of a configuration-related warning.
     */
    CONFIG_WARNING_UPDATE: 'aiuxc:CONFIG_WARNING_UPDATE';
    /**
     * @description Fired when the configuration is successfully saved.
     */
    CONFIG_SAVE_SUCCESS: 'aiuxc:CONFIG_SAVE_SUCCESS';
    /**
     * @description Fired when the configuration has been updated, signaling UI components to refresh.
     */
    CONFIG_UPDATED: 'aiuxc:CONFIG_UPDATED';

    // Platform Specific
    /**
     * @description (ChatGPT-only) Fired by the polling scanner when it detects new messages.
     */
    INTEGRITY_SCAN_MESSAGES_FOUND: 'aiuxc:INTEGRITY_SCAN_MESSAGES_FOUND';
    /**
     * @description (Gemini-only) Requests the start of the auto-scroll process to load full chat history.
     */
    AUTO_SCROLL_REQUEST: 'aiuxc:AUTO_SCROLL_REQUEST';
    /**
     * @description (Gemini-only) Requests the cancellation of an in-progress auto-scroll.
     */
    AUTO_SCROLL_CANCEL_REQUEST: 'aiuxc:AUTO_SCROLL_CANCEL_REQUEST';
    /**
     * @description (Gemini-only) Fired when the auto-scroll process has actively started (i.e., progress bar detected).
     */
    AUTO_SCROLL_START: 'aiuxc:AUTO_SCROLL_START';
    /**
     * @description (Gemini-only) Fired when the auto-scroll process has completed or been cancelled.
     */
    AUTO_SCROLL_COMPLETE: 'aiuxc:AUTO_SCROLL_COMPLETE';
}

interface AppEventMap {
    'aiuxc:TITLE_CHANGED': null;
    'aiuxc:THEME_UPDATE': null;
    'aiuxc:THEME_APPLIED': { theme: ThemeSet; config: AppConfig };
    'aiuxc:WIDTH_PREVIEW': string | null;
    'aiuxc:CHAT_CONTENT_WIDTH_UPDATED': null;
    'aiuxc:WINDOW_RESIZED': null;
    'aiuxc:SIDEBAR_LAYOUT_CHANGED': null;
    'aiuxc:VISIBILITY_RECHECK': null;
    'aiuxc:UI_REPOSITION': null;
    'aiuxc:INPUT_AREA_RESIZED': null;
    'aiuxc:NAVIGATION_START': null;
    'aiuxc:NAVIGATION_END': null;
    'aiuxc:NAVIGATION': null;
    'aiuxc:CACHE_UPDATE_REQUEST': null;
    'aiuxc:CACHE_UPDATED': null;
    'aiuxc:NAV_HIGHLIGHT_MESSAGE': HTMLElement;
    'aiuxc:RAW_MESSAGE_ADDED': HTMLElement;
    'aiuxc:AVATAR_INJECT': HTMLElement;
    'aiuxc:MESSAGE_COMPLETE': HTMLElement;
    'aiuxc:TURN_COMPLETE': HTMLElement;
    'aiuxc:STREAMING_START': null;
    'aiuxc:STREAMING_END': null;
    'aiuxc:DEFERRED_LAYOUT_UPDATE': null;
    'aiuxc:TIMESTAMPS_LOADED': { chatId: string; timestamps: Map<string, Date> };
    'aiuxc:TIMESTAMP_ADDED': { messageId: string; timestamp: Date };
    'aiuxc:REMOTE_CONFIG_CHANGED': null;
    'aiuxc:SUSPEND_OBSERVERS': null;
    'aiuxc:RESUME_OBSERVERS': null;
    'aiuxc:CONFIG_SIZE_EXCEEDED': { message: string };
    'aiuxc:CONFIG_WARNING_UPDATE': { show: boolean; message: string };
    'aiuxc:CONFIG_SAVE_SUCCESS': null;
    'aiuxc:CONFIG_UPDATED': AppConfig;
    'aiuxc:INTEGRITY_SCAN_MESSAGES_FOUND': null;
    'aiuxc:AUTO_SCROLL_REQUEST': null;
    'aiuxc:AUTO_SCROLL_CANCEL_REQUEST': null;
    'aiuxc:AUTO_SCROLL_START': null;
    'aiuxc:AUTO_SCROLL_COMPLETE': null;
}

interface IEventBus {
    // Internal properties
    events: { [key: string]: Map<string, Function> };
    uiWorkQueue: Function[];
    isUiWorkScheduled: boolean;
    _logAggregation: { [key: string]: { timer: number | null; count: number } };
    _aggregatedEvents: Set<string>;
    _aggregationDelay: number;
    _processUIWorkQueue(): void;

    // Public API
    subscribe<K extends keyof AppEventMap>(
        event: K,
        listener: (payload: AppEventMap[K]) => void,
        key: string
    ): void;
    once<K extends keyof AppEventMap>(
        event: K,
        listener: (payload: AppEventMap[K]) => void,
        key: string
    ): void;
    unsubscribe(event: keyof AppEventMap, key: string): void;
    publish<K extends keyof AppEventMap>(
        event: K,
        payload: AppEventMap[K]
    ): void;
    queueUIWork(workFunction: () => void): void;
}

// --- Internal Class Interfaces ---

interface IConfigManager {
    get(): AppConfig;
    config: AppConfig | null;
}

interface IMessageCacheManager {
    getTotalMessages(): HTMLElement[];
    getUserMessages(): HTMLElement[];
    getAssistantMessages(): HTMLElement[];
    debouncedRebuildCache(): void;
    findMessageIndex(element: HTMLElement): { role: string; index: number; totalIndex: number } | null;
    notify(): void;
}

interface IMessageLifecycleManager {
    scanForUnprocessedMessages(): number;
    scheduleIntegrityScan(): void;
    processRawMessage(element: HTMLElement): void;
}

interface IAutoScrollManager {
    enable(): void;
    disable(): void;
    isLayoutScanComplete: boolean;
}

interface IFixedNavigationManager {
    messageCacheManager: IMessageCacheManager;
    messageLifecycleManager: IMessageLifecycleManager;
    setHighlightAndIndices(element: HTMLElement): void;
    updateUI(): void;
    registerPlatformListenerOnce(event: string, listener: Function): void;
}

interface IThemeManager {
    getChatTitleAndCache(): string | null;
    cachedThemeSet: ThemeSet | null;
    getThemeSet(): ThemeSet;
    lastAppliedThemeSet: ThemeSet | null;
    updateTheme(force: boolean): void;
    applyChatContentMaxWidth(): void;
}

interface IStandingImageManager {
    style: StyleHandle | null;
    configManager: IConfigManager;
    themeManager: IThemeManager;
    scheduleUpdate(): void;
    registerPlatformListener(event: string, listener: Function): void;
}

interface ICustomSettingsButton {
    element: HTMLElement | null;
}

interface IAppController {
    configManager: IConfigManager;
    messageCacheManager: IMessageCacheManager;
    messageLifecycleManager: IMessageLifecycleManager;
    autoScrollManager: IAutoScrollManager | null;
    fixedNavManager: IFixedNavigationManager | null;
}

declare class ThemeService {
    static create(config: AppConfig): { config: AppConfig; newThemeId: string };
    static copy(config: AppConfig, sourceId: string): { config: AppConfig; newThemeId: string } | null;
    static delete(config: AppConfig, themeId: string): { config: AppConfig; nextActiveId: string };
    static move(config: AppConfig, themeId: string, direction: number): AppConfig | null;
    static rename(config: AppConfig, themeId: string, newName: string): AppConfig;
}

declare class StyleDefinitions {
    static ICONS: Record<string, unknown>;
    static COMMON_CLASSES: Record<string, string>;
    static MODAL_CLASSES: Record<string, string>;
    static ROOT_IDS: Record<string, string>;
    static getStaticBase(): StyleDefinition;
    static getDynamicRules(): StyleDefinition;
    static getSettingsButton(): StyleDefinition;
    static getSettingsPanel(): StyleDefinition;
    static getJsonModal(): StyleDefinition;
    static getThemeModal(): StyleDefinition;
    static getColorPicker(): StyleDefinition;
    static getToast(): StyleDefinition;
    static getFixedNav(): StyleDefinition;
    static getJumpList(): StyleDefinition;
    static getTimestamp(): StyleDefinition;
    static getMessageNumber(): StyleDefinition;
    static getStandingImage(): StyleDefinition;
    static getBubbleUI(): StyleDefinition;
    static getAvatar(): StyleDefinition;
}

declare class StyleManager {
    static remove(defProvider: () => StyleDefinition): void;
    static request(defProvider: () => StyleDefinition): StyleHandle;
}

// --- Utility Types for ReactiveStore ---
type Depth = [never, 0, 1, 2, 3, 4, 5];

type Path<T, D extends number = 5> = [D] extends [never] ? never : T extends object ?
    { [K in keyof T]-?: K extends string | number ?
        `${K}` | (Path<T[K], Depth[D]> extends infer R ? R extends never ? never : `${K}.${R & string}` : never)
        : never
    }[keyof T] : never;

type PathValue<T, P extends Path<T>> =
    P extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T
    ? Rest extends Path<T[Key]>
    ? PathValue<T[Key], Rest>
    : never
    : never
    : P extends keyof T ? T[P] : never;

declare class ReactiveStore<T> {
    constructor(initialState: T);
    get<P extends Path<T>>(path: P): PathValue<T, P>;
    set<P extends Path<T>>(path: P, value: PathValue<T, P>): void;
    subscribe(callback: (state: T, changedPath: string) => void): () => void;
    getData(): T;
    replaceState(newState: T): void;
}

// --- Adapter Interfaces ---

interface GeneralAdapter {
    isCanvasModeActive(): boolean;
    isExcludedPage(): boolean;
    isFilePanelActive(): boolean;
    isNewChatPage(): boolean;
    isChatPage(): boolean;
    getMessagesRoot(): HTMLElement | null;
    getMessageId(element: Element | null): string | null;
    getMessageRole(element: Element): string | null;
    getChatTitle(): string | null;
    getJumpListDisplayText(element: HTMLElement): string;
    findMessageElement(element: Element): HTMLElement | null;
    filterMessage(element: Element): boolean;
    ensureMessageContainerForImage(element: HTMLElement): HTMLElement | null;
    initializeSentinel(callback: (element: HTMLElement) => void): () => void;
    performInitialScan(lifecycleManager: IMessageLifecycleManager): number;
    onNavigationEnd(lifecycleManager: IMessageLifecycleManager): void;
    scrollTo(element: HTMLElement): void;
}

interface StyleManagerAdapter {
    getStaticCss(cls: Record<string, string>): string;
    getBubbleCss(cls: Record<string, string>): string;
}

interface ThemeManagerAdapter {
    shouldDeferInitialTheme(manager: IThemeManager): boolean;
    selectThemeForUpdate(manager: IThemeManager, config: AppConfig, urlChanged: boolean, titleChanged: boolean): ThemeSet | null;
    getStyleOverrides(): Record<string, string>;
}

interface BubbleUIAdapter {
    getNavPositioningParent(messageElement: HTMLElement): HTMLElement | null;
    getCollapsibleInfo(messageElement: HTMLElement): { msgWrapper: HTMLElement, bubbleElement: HTMLElement, positioningParent: HTMLElement } | null;
    getBubbleNavButtonsInfo(messageElement: HTMLElement): object | null;
}

interface ToastAdapter {
    getAutoScrollMessage(): string;
    getToastPositionX(): number | null;
}

interface AppControllerAdapter {
    initializePlatformManagers(controller: IAppController): void;
    applyPlatformSpecificUiUpdates(controller: IAppController, newConfig: AppConfig): void;
}

interface AvatarMeasurement {
    shouldInject: boolean;
    targetElement: HTMLElement | null;
    processedTarget: HTMLElement | null;
    exclusionKey: HTMLElement | null;
    originalElement: HTMLElement;
}

interface AvatarAdapter {
    getCss(): string;
    measureAvatarTarget(msgElem: HTMLElement): AvatarMeasurement | null;
    injectAvatar(
        measurement: AvatarMeasurement,
        avatarContainer: HTMLElement | null,
    ): void;
}

interface StandingImageAdapter {
    recalculateLayout(instance: IStandingImageManager): Promise<void>;
    updateVisibility(instance: IStandingImageManager): void;
    setupEventListeners(instance: IStandingImageManager): void;
}

interface ObserverDependencies {
    observeElement(element: Element, type: string): void;
    unobserveElement(element: Element): void;
    startGenericPanelObserver(config: GenericPanelObserverConfig): () => void;
    startGenericInputAreaObserver(config: GenericInputAreaObserverConfig): () => void;
}

interface GenericPanelObserverConfig {
    triggerSelector: string;
    observerType: string;
    targetResolver: (el: HTMLElement) => HTMLElement | null;
    immediateCallback?: () => void;
}

interface GenericInputAreaObserverConfig {
    triggerSelector: string;
    resizeTargetSelector: string;
}

interface ObserverAdapter {
    getPlatformObserverStarters(): Array<(dependencies: ObserverDependencies) => () => void>;
    isTurnComplete(turnNode: HTMLElement): boolean;
}

interface SettingsPanelAdapter {
    getPlatformSpecificFeatureToggles(): Array<{
        configKey: string;
    }>;
}

interface FixedNavAdapter {
    isHeaderPositionAvailable(navConsoleWidth?: number): boolean;
    getNavAnchorContainer(): HTMLElement | null;
    handleInfiniteScroll(manager: IFixedNavigationManager, highlightedMessage: HTMLElement | null, previousTotalMessages: number): void;
    applyAdditionalHighlight(messageElement: HTMLElement, styleHandle: StyleHandle): void;
    getPlatformSpecificButtons(manager: IFixedNavigationManager, styleHandle: StyleHandle): Element[];
    updatePlatformSpecificButtonState(btn: HTMLButtonElement, isAutoScrolling: boolean, autoScrollManager: IAutoScrollManager): void;
}

interface TimestampAdapter {
    isInitialized: boolean;
    init(): void;
    cleanup(): void;
    hasTimestampLogic(): boolean;
    isTimestampEnabledSync(defaultConfig: PlatformConfig): boolean;
    addTimestamp(id: string, date: Date): void;
    getTimestamp(id: string): Date | undefined;
}

interface UIManagerAdapter {
    ensureButtonPlacement(settingsButton: ICustomSettingsButton): void;
}

// --- Platform Definitions ---

interface PlatformConstants {
    // Storage Configuration & Limits
    STORAGE_SETTINGS: {
        ROOT_KEY: string;
        THEME_PREFIX: string;
        CONFIG_SIZE_RECOMMENDED_LIMIT_BYTES: number;
        CONFIG_SIZE_LIMIT_BYTES: number;
        CACHE_SIZE_LIMIT_BYTES: number;
    };

    // Processing & Performance Settings
    PROCESSING: {
        BATCH_SIZE: number;
    };

    RETRY: {
        SCROLL_OFFSET_FOR_NAV: number;
        AVATAR_INJECTION_LIMIT: number;
    };
    IMAGE_PROCESSING: {
        QUALITY: number;
        MAX_WIDTH_BG: number;
        MAX_HEIGHT_STANDING: number;
    };
    TIMING: {
        DEBOUNCE_DELAYS: Record<string, number>;
        TIMEOUTS: Record<string, number>;
        THRESHOLDS: Record<string, number>;
        ANIMATIONS: Record<string, number>;
        POLLING: {
            IDLE_INDEXING_MS: number;
            HEARTBEAT_INTERVAL_MS: number;
        };
        PERF_MONITOR_THROTTLE: number;
        KEYBOARD_THROTTLE: number;
    };
    UI_SPECS: {
        STANDING_IMAGE_MASK_THRESHOLD_PX: number;
        PREVIEW_BUBBLE_MAX_WIDTH: {
            USER: string;
            ASSISTANT: string;
        };
        MODAL_MARGIN: number;
        PANEL_MARGIN: number;
        ANCHOR_OFFSET: number;
        THEME_MODAL_HEADER_PADDING: string;
        THEME_MODAL_FOOTER_PADDING: string;
        // Avatar Specifications
        AVATAR: {
            DEFAULT_SIZE: number;
            SIZE_OPTIONS: number[];
            MARGIN: number;
        };
        // Collapsible Button Specifications
        COLLAPSIBLE: {
            HEIGHT_THRESHOLD: number;
        };
    };
    OBSERVED_ELEMENT_TYPES: {
        BODY: string;
        INPUT_AREA: string;
        SIDE_PANEL: string;
    };
    Z_INDICES: Record<string, number | string>;
    INTERNAL_ROLES: {
        USER: string;
        ASSISTANT: string;
    };
    THEME_IDS: {
        DEFAULT: string;
    };
    NAV_ROLES: {
        USER: string;
        ASSISTANT: string;
        TOTAL: string;
    };
    UI_STATES: {
        EXPANDED: string;
        COLLAPSED: string;
    };
    INPUT_MODES: {
        NORMAL: string;
        SHIFT: string;
    };
    CONSOLE_POSITIONS: {
        INPUT_TOP: string;
        HEADER: string;
    };
    DATA_KEYS: {
        ORIGINAL_TITLE: string;
        STATE: string;
        FILTERED_INDEX: string;
        MESSAGE_INDEX: string;
        PREVIEW_FOR: string;
        ICON_TYPE: string;
    };
    STORE_KEYS: {
        SYSTEM_ROOT: string;
        SYSTEM_WARNING: string;
        SYSTEM_ERRORS: string;
        SYSTEM_SIZE_EXCEEDED: string;
        WARNING_PATH: string;
        WARNING_MSG_PATH: string;
        WARNING_SHOW_PATH: string;
        ERRORS_PATH: string;
        SIZE_EXCEEDED_PATH: string;
        LOCAL_TIMESTAMP_ENABLED: string;
    };
    RESOURCE_KEYS: {
        SETTINGS_BUTTON: string;
        SETTINGS_PANEL: string;
        JSON_MODAL: string;
        THEME_MODAL: string;
        WIDGET_CONTROLLER: string;
        MODAL_COORDINATOR: string;
        THEME_MANAGER: string;
        MESSAGE_CACHE_MANAGER: string;
        SYNC_MANAGER: string;
        OBSERVER_MANAGER: string;
        UI_MANAGER: string;
        AVATAR_MANAGER: string;
        STANDING_IMAGE_MANAGER: string;
        BUBBLE_UI_MANAGER: string;
        MESSAGE_LIFECYCLE_MANAGER: string;
        TOAST_MANAGER: string;
        TIMESTAMP_MANAGER: string;
        FIXED_NAV_MANAGER: string;
        MESSAGE_NUMBER_MANAGER: string;
        AUTO_SCROLL_MANAGER: string;
        LAYOUT_RESIZE_OBSERVER: string;
        INTEGRITY_SCAN: string;
        BATCH_TASK: string;
        BATCH_TASK_SINGLE: string;
        BATCH_TASK_TURN: string;
        ZERO_MSG_TIMER: string;
        NAVIGATION_MONITOR: string;
        APP_CONTROLLER: string;
        ANCHOR_LISTENER: string;
        JUMP_LIST: string;
        BUTTON_STATE_TASK: string;
        HEARTBEAT_TIMER: string;
        SELF_HEAL_TASK: string;
    };
    // Platform specific additions
    OBSERVER_OPTIONS?: MutationObserverInit;
    ATTRIBUTES?: Record<string, string>;
    SELECTORS: Record<string, string | null>;
    URL_PATTERNS: {
        EXCLUDED: RegExp[];
    };
}

interface SiteStyles {
    PALETTE: Record<string, string>;
    Z_INDICES: Record<string, number | string>;
}

interface PlatformAdapters {
    General: GeneralAdapter;
    StyleManager: StyleManagerAdapter;
    ThemeManager: ThemeManagerAdapter;
    BubbleUI: BubbleUIAdapter;
    Toast: ToastAdapter;
    AppController: AppControllerAdapter;
    Avatar: AvatarAdapter;
    StandingImage: StandingImageAdapter;
    Observer: ObserverAdapter;
    SettingsPanel: SettingsPanelAdapter;
    FixedNav: FixedNavAdapter;
    Timestamp: TimestampAdapter;
    UIManager: UIManagerAdapter;
}

interface PlatformDefinitions {
    CONSTANTS: PlatformConstants;
    SITE_STYLES: SiteStyles;
    PlatformAdapters: PlatformAdapters;
}

// --- Utility Types ---
type AppDisposableFn = () => void;
type AppDisposableObj = { dispose: () => void };
type AppDisconnectableObj = { disconnect: () => void };
type AppAbortableObj = { abort: () => void };
type AppDestructibleObj = { destroy: () => void };
type AppDisposable = AppDisposableFn | AppDisposableObj | AppDisconnectableObj | AppAbortableObj | AppDestructibleObj;
