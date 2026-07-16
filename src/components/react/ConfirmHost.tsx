import { useEffect, useState } from 'react';
import { subscribeConfirm } from '../../lib/confirm';

type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (value: boolean) => void;
};

export function ConfirmHost() {
  const [pending, setPending] = useState<ConfirmRequest | null>(null);

  useEffect(() => subscribeConfirm(setPending), []);

  useEffect(() => {
    if (!pending) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') pending.resolve(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [pending]);

  if (!pending) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={() => pending.resolve(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="card w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-dialog-title" className="font-heading text-2xl font-semibold">
          {pending.title}
        </h2>
        <p className="text-sm text-muted">{pending.message}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => pending.resolve(false)}
            className="btn-secondary min-h-11 px-4"
          >
            {pending.cancelLabel ?? 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={() => pending.resolve(true)}
            className={
              pending.danger
                ? 'min-h-11 rounded-md border border-danger bg-danger px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-transparent hover:text-danger'
                : 'btn-primary min-h-11 px-4'
            }
          >
            {pending.confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
