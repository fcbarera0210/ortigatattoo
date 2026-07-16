type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmRequest = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type Listener = (request: ConfirmRequest | null) => void;

let current: ConfirmRequest | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(current);
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    current = {
      ...options,
      resolve: (value) => {
        current = null;
        emit();
        resolve(value);
      },
    };
    emit();
  });
}

export function subscribeConfirm(listener: Listener) {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}
