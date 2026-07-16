import { useState } from 'react';
import { toast } from '../../lib/toast';
import { signOutAdmin } from '../../lib/auth-client';

export function AdminSignOut() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    if (loading) return;
    setLoading(true);
    try {
      await signOutAdmin();
      toast.success('Sesión cerrada');
      window.location.href = '/admin/login';
    } catch {
      toast.error('No se pudo cerrar sesión. Intenta de nuevo.');
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="admin-nav-link text-danger disabled:opacity-50"
    >
      {loading ? 'Saliendo...' : 'Salir'}
    </button>
  );
}
