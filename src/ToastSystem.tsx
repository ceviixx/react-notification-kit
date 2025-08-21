'use client'

import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------- Types ----------------
export type ToastType = "default" | "success" | "error" | "warning" | "info";
export type ToastPosition =
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";

export type ToastAction = { label: string; onClick: () => void };

export type ToastInput = {
    id?: string;
    title?: string;
    description?: string;
    type?: ToastType;
    duration?: number; // ms; 0 = sticky
    action?: ToastAction;
    dismissible?: boolean;
};

export type ToastObject = Required<Omit<ToastInput, "id">> & {
    id: string;
    createdAt: number;
};

// ---------------- Store (simple event bus) ----------------

type Listener = (list: ToastObject[]) => void;
const listeners = new Set<Listener>();
let list: ToastObject[] = [];

function notify() {
    listeners.forEach((l) => l(list));
}

function push(t: ToastObject, maxVisible: number) {
    if (list.length < maxVisible) {
        list = [t, ...list];
    } else {
        // drop oldest when full
        list = [t, ...list.slice(0, maxVisible - 1)];
    }
    notify();
}

function remove(id?: string) {
    if (!id) {
        // remove last (oldest on screen is at end)
        list = list.slice(0, -1);
    } else {
        list = list.filter((t) => t.id !== id);
    }
    notify();
}

function update(id: string, patch: Partial<ToastObject>) {
    list = list.map((t) => (t.id === id ? { ...t, ...patch } : t));
    notify();
}

function exists(id: string) {
    return list.some((t) => t.id === id);
}

// ---------------- Public API ----------------

function genId() {
    return Math.random().toString(36).slice(2, 9);
}

function normalize(input: ToastInput, defaults: { duration: number }): ToastObject {
    return {
        id: input.id ?? genId(),
        title: input.title ?? "",
        description: input.description ?? "",
        type: input.type ?? "default",
        duration: typeof input.duration === "number" ? input.duration : defaults.duration,
        action: input.action as any,
        dismissible: input.dismissible ?? true,
        createdAt: Date.now(),
    };
}

export const toast = {
    show(
        input: ToastInput,
        opts?: { maxVisible?: number; defaultDuration?: number }
    ) {
        const maxVisible = opts?.maxVisible ?? Toaster.defaults.maxVisible;
        const defDur = opts?.defaultDuration ?? Toaster.defaults.defaultDuration;

        // Replace existing toast with same ID (reset timer)
        if (input.id && exists(input.id)) {
            remove(input.id);
        }

        const obj = normalize(input, { duration: defDur });
        push(obj, maxVisible);
        return obj.id;
    },

    dismiss(id?: string) {
        remove(id);
    },

    remove(id?: string) {
        remove(id);
    },

    success(msg: string | ToastInput) {
        return toast.show(
            typeof msg === "string" ? { title: msg, type: "success" } : { ...msg, type: "success" }
        );
    },

    error(msg: string | ToastInput) {
        return toast.show(
            typeof msg === "string" ? { title: msg, type: "error" } : { ...msg, type: "error" }
        );
    },

    warning(msg: string | ToastInput) {
        return toast.show(
            typeof msg === "string" ? { title: msg, type: "warning" } : { ...msg, type: "warning" }
        );
    },

    info(msg: string | ToastInput) {
        return toast.show(
            typeof msg === "string" ? { title: msg, type: "info" } : { ...msg, type: "info" }
        );
    },

    async promise<T>(
        p: Promise<T>,
        messages: {
            loading: ToastInput | string;
            success: ((v: T) => ToastInput | string) | (ToastInput | string);
            error: ((e: any) => ToastInput | string) | (ToastInput | string);
        }
    ) {
        const loading = typeof messages.loading === "string" ? { title: messages.loading } : messages.loading;
        const id = toast.show({ ...loading, duration: 0 });
        try {
            const res = await p;
            const ok = typeof messages.success === "function" ? messages.success(res) : messages.success;
            const normalized = typeof ok === "string" ? { title: ok } : ok;
            update(
                id,
                normalize({ ...normalized, type: normalized.type ?? "success" }, { duration: Toaster.defaults.defaultDuration })
            );
            return res;
        } catch (err) {
            const er = typeof messages.error === "function" ? messages.error(err) : messages.error;
            const normalized = typeof er === "string" ? { title: er } : er;
            update(
                id,
                normalize({ ...normalized, type: normalized.type ?? "error" }, { duration: Toaster.defaults.defaultDuration })
            );
            throw err;
        }
    },
};

// ---------------- Toaster component ----------------

type ToasterProps = {
    position?: ToastPosition;
    maxVisible?: number; // default 3
    defaultDuration?: number; // default 4000
    container?: HTMLElement | null; // default document.body
};

export function Toaster({ position = "top-right", maxVisible = 3, defaultDuration = 4000, container }: ToasterProps) {
    // expose defaults for calls that omit options
    Toaster.defaults.maxVisible = maxVisible;
    Toaster.defaults.defaultDuration = defaultDuration;

    const [items, setItems] = useState<ToastObject[]>(list);
    const regionId = useId();

    useEffect(() => {
        const handler: Listener = (nextList) => setItems(nextList);
        listeners.add(handler);
        return () => {
            listeners.delete(handler); // ensure void cleanup
        };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") toast.dismiss();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const mount = container ?? (typeof document !== "undefined" ? document.body : null);
    if (!mount) return null;

    return createPortal(
        <div aria-live="polite" aria-atomic="true" id={regionId} className="pointer-events-none fixed inset-0 z-[1000]">
            <div className={positionClass(position)}>
                <ul className="flex flex-col gap-2 p-3 w-full max-w-sm sm:max-w-md">
                    {items.map((t) => (
                        <ToastItem key={t.id} toast={t} />
                    ))}
                </ul>
            </div>
        </div>,
        mount
    );
}

Toaster.defaults = { maxVisible: 3, defaultDuration: 4000 } as { maxVisible: number; defaultDuration: number };

// ---------------- Toast Item (CSS transitions) ----------------

function ToastItem({ toast: t }: { toast: ToastObject }) {
    const [leaving, setLeaving] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);

    const intervalRef = useRef<number | null>(null);
    const startRef = useRef<number>(0);
    const endReachedRef = useRef(false);

    useEffect(() => {
        if (t.duration === 0) return; // sticky

        startRef.current = Date.now();
        endReachedRef.current = false;

        intervalRef.current = window.setInterval(() => {
            const ms = Date.now() - startRef.current;
            setElapsedMs(ms);

            if (!endReachedRef.current && ms >= t.duration) {
                endReachedRef.current = true;
                if (intervalRef.current) clearInterval(intervalRef.current);
                setLeaving(true);
                window.setTimeout(() => toast.dismiss(t.id), 160);
            }
        }, 100);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            startRef.current = 0;
            endReachedRef.current = false;
        };
    }, [t.id, t.duration]);

    const palette = paletteByType(t.type);
    const progress = t.duration === 0 ? 0 : Math.min(1, Math.max(0, elapsedMs / t.duration));

    return (
        <li>
            <div
                className={[
                    "pointer-events-auto overflow-hidden rounded-2xl shadow-lg ring-1",
                    "backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-gray-900/40",
                    "bg-white/90 dark:bg-gray-900/80 ring-gray-200/70 dark:ring-gray-800/70",
                    "transition duration-200 transform",
                    leaving ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0",
                ].join(" ")}
                role="status"
                style={{ transform: "translateZ(0)" }}
            >
                {t.duration > 0 && (
                    <div className="h-0.5 w-full bg-black/5 dark:bg-white/10">
                        <div
                            className={"h-full " + palette.bar}
                            style={{
                                width: `${(1 - progress) * 100}%`,
                                transition: "width 120ms linear",
                            }}
                        />
                    </div>
                )}

                <div className="p-3 sm:p-3.5">
                    <div className="flex items-start gap-3">
                        <div
                            className={[
                                "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-xs",
                                palette.icon,
                            ].join(" ")}
                            aria-hidden
                        >
                            {iconByType(t.type)}
                        </div>

                        <div className="min-w-0 flex-1">
                            {t.title && (
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{t.title}</p>
                            )}
                            {t.description && (
                                <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-300 leading-snug">{t.description}</p>
                            )}
                            {t.action && (
                                <button
                                    className="mt-2 inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset text-gray-900 ring-gray-300/70 hover:bg-gray-50 dark:text-white dark:ring-gray-700/70 dark:hover:bg-gray-800/60"
                                    onClick={t.action.onClick}
                                >
                                    {t.action.label}
                                </button>
                            )}
                        </div>

                        {t.dismissible && (
                            <button
                                onClick={() => {
                                    setLeaving(true);
                                    window.setTimeout(() => toast.dismiss(t.id), 150);
                                }}
                                className="ml-1 rounded-lg p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
                                aria-label="Dismiss"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </li>
    );
}

// ---------------- Helpers ----------------

function positionClass(pos: ToastPosition) {
    const base = "absolute flex w-full";
    switch (pos) {
        case "top-right": return `${base} top-0 right-0 justify-end`;
        case "top-left": return `${base} top-0 left-0 justify-start`;
        case "bottom-right": return `${base} bottom-0 right-0 justify-end items-end`;
        case "bottom-left": return `${base} bottom-0 left-0 justify-start items-end`;
        case "top-center": return `${base} top-0 left-1/2 -translate-x-1/2 justify-center`;
        case "bottom-center": return `${base} bottom-0 left-1/2 -translate-x-1/2 justify-center items-end`;
    }
}

function iconByType(t: ToastType) {
    switch (t) {
        case "success": return "✓";
        case "error": return "!";
        case "warning": return "⚠";
        case "info": return "i";
        default: return "•";
    }
}

function paletteByType(t: ToastType) {
    switch (t) {
        case "success": return { icon: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", bar: "bg-green-600" };
        case "error": return { icon: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", bar: "bg-red-600" };
        case "warning": return { icon: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300", bar: "bg-yellow-500" };
        case "info": return { icon: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", bar: "bg-sky-600" };
        default: return { icon: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", bar: "bg-gray-400" };
    }
}
