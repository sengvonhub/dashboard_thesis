"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastVariant = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

const ToastContext = createContext<{
  push: (message: unknown, variant?: ToastVariant) => void;
} | null>(null);

// FastAPI validation errors (422) send `detail` as an array of
// {type, loc, msg, input} objects instead of a string — and some error
// paths pass the whole error object through. Toasts render `message`
// directly as a React child, so anything non-string must be flattened to
// text here rather than at every call site.
function toDisplayMessage(message: unknown): string {
  if (typeof message === "string") return message;
  if (Array.isArray(message)) {
    return message
      .map((item) => (item && typeof item === "object" && "msg" in item ? String((item as Record<string, unknown>).msg) : String(item)))
      .join("; ");
  }
  if (message && typeof message === "object" && "msg" in message) {
    return String((message as Record<string, unknown>).msg);
  }
  return "Something went wrong";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: unknown, variant: ToastVariant = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message: toDisplayMessage(message), variant }]);
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-md px-4 py-3 text-sm shadow-lg text-white animate-in slide-in-from-top-2 ${
              t.variant === "success"
                ? "bg-emerald-600"
                : t.variant === "error"
                ? "bg-red-600"
                : "bg-gray-800"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return {
    success: (msg: unknown) => ctx.push(msg, "success"),
    error: (msg: unknown) => ctx.push(msg, "error"),
    info: (msg: unknown) => ctx.push(msg, "info"),
  };
}