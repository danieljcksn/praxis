import { create } from "zustand";
import { createId } from "./id";

export type ToastTone = "default" | "success" | "error";

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastStore {
  toasts: Toast[];
  push: (input: { message: string; tone?: ToastTone }) => string;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  push: ({ message, tone = "default" }) => {
    const id = createId();
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Fire-and-forget helpers usable from anywhere (event handlers, actions). */
export const toast = {
  show: (message: string) => useToasts.getState().push({ message }),
  success: (message: string) => useToasts.getState().push({ message, tone: "success" }),
  error: (message: string) => useToasts.getState().push({ message, tone: "error" }),
};
