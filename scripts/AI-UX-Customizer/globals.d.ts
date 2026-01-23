// --- GM_xmlhttpRequest Types ---
interface GMXMLHttpRequestResponse<T = any> {
    finalUrl: string;
    readyState: number;
    status: number;
    statusText: string;
    responseHeaders: string;
    response: T;
    responseText: string;
    responseXML: Document | null;
    context: any;
}

interface GMXMLHttpRequestDetails<T = any> {
    method?: "GET" | "POST" | "HEAD" | "PUT" | "DELETE" | "OPTIONS" | "PATCH";
    url: string;
    headers?: { [header: string]: string };
    data?: string | FormData | Blob | File | ArrayBuffer | ArrayBufferView | URLSearchParams;
    cookie?: string;
    binary?: boolean;
    nocache?: boolean;
    revalidate?: boolean;
    timeout?: number;
    context?: any;
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
declare function GM_addValueChangeListener(key: string, listener: (name: string, oldValue: any, newValue: any, remote: boolean) => void): number | string;
declare function GM_removeValueChangeListener(listenerId: number | string): void;
declare function GM_setValue(key: string, value: any): void;
declare function GM_getValue<T>(key: string, defaultValue?: T): T;
declare function GM_deleteValue(key: string): void;
declare function GM_listValues(): string[];
declare function GM_xmlhttpRequest<T = any>(details: GMXMLHttpRequestDetails<T>): { abort: () => void };
declare function GM_registerMenuCommand(caption: string, onClick: (event: MouseEvent | KeyboardEvent) => void, accessKey?: string): number | string;
declare function GM_download(details: { url: string; name?: string; onload?: () => void }): { abort: () => void };
declare function GM_addStyle(css: string): HTMLStyleElement;

// --- GM Namespace (Async) ---
declare const GM: {
    setValue(key: string, value: any): Promise<void>;
    getValue<T>(key: string, defaultValue?: T): Promise<T>;
    deleteValue(key: string): Promise<void>;
    listValues(): Promise<string[]>;
    xmlHttpRequest<T = any>(details: GMXMLHttpRequestDetails<T>): { abort: () => void };
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
    bubblePadding: string | null;
    bubbleBorderRadius: string | null;
    bubbleMaxWidth: string | null;
    standingImageUrl: string | null;
}

interface StyleHandle {
    id: string;
    prefix: string;
    classes: Record<string, string>;
    vars: Record<string, string>;
}

interface StyleDefinition {
    key: string;
    classes: Record<string, string>;
    vars: Record<string, string>;
    generator: (cls: Record<string, string>) => string;
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
        chat_content_max_width: string | null;
        respect_avatar_space: boolean;
    };
    features: {
        collapsible_button: { enabled: boolean };
        scroll_to_top_button: { enabled: boolean };
        sequential_nav_buttons: { enabled: boolean };
        fixed_nav_console: { enabled: boolean; position?: string };
        load_full_history_on_chat_load?: { enabled: boolean };
        timestamp: { enabled: boolean };
        auto_collapse_user_message: { enabled: boolean };
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

interface AppEventMap {
    // Theme & Style
    'aiuxc:titleChanged': null;
    'aiuxc:themeUpdate': null;
    'aiuxc:themeApplied': { theme: ThemeSet; config: AppConfig };
    'aiuxc:widthPreview': string | null;

    // UI & Layout
    'aiuxc:chatContentWidthUpdated': null;
    'aiuxc:windowResized': null;
    'aiuxc:sidebarLayoutChanged': null;
    'aiuxc:visibilityRecheck': null;
    'aiuxc:uiReposition': null;
    'aiuxc:inputAreaResized': null;
    'aiuxc:reOpenModal': { type: 'json' | 'theme'; key?: string };

    // Navigation & Cache
    'aiuxc:navigationStart': null;
    'aiuxc:navigationEnd': null;
    'aiuxc:navigation': null;
    'aiuxc:cacheUpdateRequest': null;
    'aiuxc:cacheUpdated': null;
    'aiuxc:nav:highlightMessage': HTMLElement;

    // Message Lifecycle
    'aiuxc:rawMessageAdded': HTMLElement;
    'aiuxc:avatarInject': HTMLElement;
    'aiuxc:messageComplete': HTMLElement;
    'aiuxc:turnComplete': HTMLElement;
    'aiuxc:streamingStart': null;
    'aiuxc:streamingEnd': null;
    'aiuxc:deferredLayoutUpdate': null;
    'aiuxc:timestampsLoaded': { chatId: string; timestamps: Map<string, Date> };
    'aiuxc:timestampAdded': { messageId: string; timestamp: Date };

    // System & Config
    'aiuxc:remoteConfigChanged': null; // Payload removed as we reload from storage
    'aiuxc:suspendObservers': null;
    'aiuxc:resumeObserversAndRefresh': null;
    'aiuxc:configSizeExceeded': { message: string };
    'aiuxc:configWarningUpdate': { show: boolean; message: string };
    'aiuxc:configSaveSuccess': null;
    'aiuxc:configUpdated': AppConfig;
    'aiuxc:appShutdown': null;

    // Platform Specific
    'aiuxc:pollingMessagesFound': null;
    'aiuxc:autoScrollRequest': null;
    'aiuxc:autoScrollCancelRequest': null;
    'aiuxc:autoScrollStart': null;
    'aiuxc:autoScrollComplete': null;
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
    startPollingScan(): void;
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
    applyChatContentMaxWidth(forcedWidth?: string | null): void;
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
    static ICONS: Record<string, any>;
    static COMMON_CLASSES: Record<string, string>;
    static getCommon(): StyleDefinition;
    static getStaticBase(): StyleDefinition;
    static getDynamicRules(): StyleDefinition;
    static getModal(): StyleDefinition;
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
    initializeSentinel(callback: (element: HTMLElement) => void): void;
    performInitialScan(lifecycleManager: IMessageLifecycleManager): number;
    onNavigationEnd(lifecycleManager: IMessageLifecycleManager): void;
    scrollTo(element: HTMLElement, options?: { offset?: number; smooth?: boolean }): void;
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
    getSequentialNavInfo(messageElement: HTMLElement): object | null;
    getScrollToTopInfo(messageElement: HTMLElement): object | null;
}

interface ToastAdapter {
    getAutoScrollMessage(): string;
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
        processedClass: string
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
        type: string;
        configKey: string;
        label: string;
        title?: string;
        tooltip?: string;
        className?: string;
        visibleIf?: (data: any) => boolean;
        disabledIf?: (data: any) => boolean;
        onChange?: (value: any, data: any) => void;
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
    init(): void;
    cleanup(): void;
    hasTimestampLogic(): boolean;
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
        POLLING_SCAN_LIMIT: number;
    };
    IMAGE_PROCESSING: {
        QUALITY: number;
        MAX_WIDTH_BG: number;
        MAX_HEIGHT_STANDING: number;
    };
    TIMING: {
        DEBOUNCE_DELAYS: Record<string, number>;
        TIMEOUTS: Record<string, number>;
        ANIMATIONS: Record<string, number>;
        POLLING: {
            MESSAGE_DISCOVERY_MS: number;
            STREAM_COMPLETION_CHECK_MS: number;
            IDLE_INDEXING_MS: number;
        };
        PERF_MONITOR_THROTTLE: number;
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
    SLIDER_CONFIGS: {
        CHAT_WIDTH: {
            MIN: number;
            MAX: number;
            NULL_THRESHOLD: number;
            DEFAULT: string | null;
        };
        BUBBLE_MAX_WIDTH: {
            MIN: number;
            MAX: number;
            NULL_THRESHOLD: number;
        };
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
    CLASSES: {
        PROCESSED: string;
        COMPLETE_FIRED: string;
    },
    DATA_KEYS: {
        AVATAR_INJECT_ATTEMPTS: string;
        AVATAR_INJECT_FAILED: string;
        UNIQUE_ID: string;
        NAV_CMD: string;
        NAV_ROLE: string;
        ORIGINAL_TITLE: string;
        CONFIG_KEY: string;
        STATE: string;
        FILTERED_INDEX: string;
        MESSAGE_INDEX: string;
        PREVIEW_FOR: string;
        FORM_ERROR_FOR: string;
        TARGET_CONFIG_KEY: string;
    };
    STORE_KEYS: {
        SYSTEM_ROOT: string;
        SYSTEM_WARNING: string;
        WARNING_PATH: string;
        WARNING_MSG_PATH: string;
        WARNING_SHOW_PATH: string;
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
        MAIN_OBSERVER: string;
        LAYOUT_RESIZE_OBSERVER: string;
        POLLING_SCAN: string;
        BATCH_TASK: string;
        STREAM_CHECK: string;
        ZERO_MSG_TIMER: string;
        NAVIGATION_MONITOR: string;
        APP_CONTROLLER: string;
        ANCHOR_LISTENER: string;
        JUMP_LIST: string;

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
    Z_INDICES: Record<string, any>;
    CSS_IMPORTANT_FLAG: string;
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
