import { create } from "zustand";

export type ToastTone = "error" | "success" | "info";

export type Toast = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  duration: number;
};

type ToastState = {
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, "id" | "duration"> & { duration?: number }) => number;
  dismissToast: (id: number) => void;
  clear: () => void;
};

let counter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  pushToast: ({ title, description, tone, duration = 3500 }) => {
    counter += 1;
    const id = counter;
    set((state) => ({ toasts: [...state.toasts, { id, title, description, tone, duration }] }));
    if (duration > 0) {
      window.setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }
    return id;
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export function showError(title: string, description?: string) {
  return useToastStore.getState().pushToast({ title, description, tone: "error" });
}

export function showSuccess(title: string, description?: string) {
  return useToastStore.getState().pushToast({ title, description, tone: "success" });
}

export function showInfo(title: string, description?: string) {
  return useToastStore.getState().pushToast({ title, description, tone: "info" });
}
