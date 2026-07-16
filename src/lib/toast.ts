type ToastKind = 'success' | 'error' | 'info';

type ToastPayload = {
  id: string;
  kind: ToastKind;
  message: string;
};

type Listener = (toasts: ToastPayload[]) => void;

let toasts: ToastPayload[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener([...toasts]);
}

function push(kind: ToastKind, message: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  toasts = [...toasts, { id, kind, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 4000);
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    listener([...toasts]);
    return () => listeners.delete(listener);
  },
};
