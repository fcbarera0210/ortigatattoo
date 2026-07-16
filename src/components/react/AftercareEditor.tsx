import { useEffect, useState } from 'react';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { toast } from '../../lib/toast';

export function AftercareEditor() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const { run, isLoading } = useAsyncAction();

  useEffect(() => {
    fetch('/api/business')
      .then((r) => r.json())
      .then((d) => setContent(d.business?.aftercareContent ?? ''))
      .catch(() => toast.error('Error al cargar los cuidados'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await run('save', async () => {
      const res = await fetch('/api/aftercare', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aftercareContent: content }),
      });
      if (!res.ok) {
        toast.error('Error al guardar los cuidados');
        return;
      }
      toast.success('Cuidados guardados correctamente');
    });
  }

  if (loading) return <p className="text-muted">Cargando...</p>;

  return (
    <form onSubmit={handleSave} className="card space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold">Indicaciones de cuidado</h2>
        <p className="mt-1 text-sm text-muted">
          Este texto se muestra tal cual en la página de cuidados. Los saltos de línea se respetan.
        </p>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="input-field min-h-[320px]"
        placeholder="Escribí acá las indicaciones para el cuidado del tatuaje..."
      />
      <button type="submit" disabled={isLoading('save')} className="btn-primary">
        {isLoading('save') ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  );
}
