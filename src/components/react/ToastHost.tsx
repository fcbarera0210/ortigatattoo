import { useEffect, useState } from 'react';
import { toast } from '../../lib/toast';

type ToastKind = 'success' | 'error' | 'info';

type ToastPayload = {
  id: string;
  kind: ToastKind;
  message: string;
};

function ToastIcon({ kind }: { kind: ToastKind }) {
  if (kind === 'success') return <span aria-hidden>✓</span>;
  if (kind === 'error') return <span aria-hidden>!</span>;
  return <span aria-hidden>i</span>;
}

export function ToastHost() {
  const [items, setItems] = useState<ToastPayload[]>([]);

  useEffect(() => toast.subscribe(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="toast-host" aria-live="polite" aria-atomic="true">
      {items.map((item) => (
        <div key={item.id} className={`toast toast-${item.kind}`} role="status">
          <span className="toast-icon">
            <ToastIcon kind={item.kind} />
          </span>
          <p className="toast-message">{item.message}</p>
        </div>
      ))}
    </div>
  );
}
