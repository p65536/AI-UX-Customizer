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
declare function GM_unregisterMenuCommand(menuCommandId: number | string): void;
declare function GM_download(details: { url: string; name?: string; onload?: () => void }): { abort: () => void };
declare function GM_addStyle(css: string): HTMLStyleElement;

// --- GM Namespace (Async) ---
declare const GM: {
    setValue(key: string, value: unknown): Promise<void>;
    getValue<T>(key: string, defaultValue?: T): Promise<T>;
    deleteValue(key: string): Promise<void>;
    listValues(): Promise<string[]>;
    xmlHttpRequest<T = unknown>(details: GMXMLHttpRequestDetails<T>): { abort: () => void };
    registerMenuCommand(caption: string, onClick: (event: MouseEvent | KeyboardEvent) => void, options?: string | { title?: string; accessKey?: string }): Promise<number | string>;
    unregisterMenuCommand(menuCommandId: number | string): Promise<void>;
};

// --- Globals ---
declare const unsafeWindow: Window & typeof globalThis;
declare function exportFunction(fn: Function, target: object, options?: { defineAs: string }): void;
declare function cloneInto<T>(obj: T, target: object, options?: { cloneFunctions?: boolean }): T;

// --- Utility Types ---
type AppDisposableFn = () => void;
type AppDisposableObj = { dispose: () => void };
type AppDisconnectableObj = { disconnect: () => void };
type AppAbortableObj = { abort: () => void };
type AppDestructibleObj = { destroy: () => void };
type AppDisposable = AppDisposableFn | AppDisposableObj | AppDisconnectableObj | AppAbortableObj | AppDestructibleObj;
