import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { adminLogin } from '@/lib/api/apiClient';
import { isApiDataSource } from '@/lib/data/tournamentRepository';
import { credentialsMatch, readIsAdmin, setAdminSession } from '@/lib/adminAuth';

const inputBase =
  'w-full rounded-md bg-white dark:bg-gray-800 border border-gray-200/90 dark:border-gray-600 text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none transition-all px-4 py-3.5 text-sm';

export default function AdminLoginScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const apiMode = isApiDataSource();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (readIsAdmin()) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const s = searchParams.get('sesion');
    if (s === 'expirada') {
      setInfo('Tu sesión expiró o el servidor rechazó el acceso. Iniciá sesión de nuevo.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (apiMode) {
      setSubmitting(true);
      try {
        const res = await adminLogin(username.trim() || 'admin', password);
        if (!res.token) {
          setError('El servidor no devolvió un token. Revisá la configuración.');
          return;
        }
        navigate('/admin/dashboard', { replace: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo iniciar sesión.';
        setError(msg);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (credentialsMatch(username.trim(), password)) {
      setAdminSession();
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    setError('Usuario o contraseña incorrectos.');
  };

  return (
    <div className="app-page-canvas flex min-h-screen flex-col">
      <div className="app-page-content flex w-full flex-1 flex-col items-center justify-center py-12">
        <div className="container-admin flex flex-col items-center">
          <div className="w-full max-w-[400px]">
            <div className="text-center mb-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-500 mb-2">
                Administración
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-[#111318] dark:text-white tracking-tight font-display">
                Iniciar sesión
              </h1>
              <p className="text-sm text-[#616f89] dark:text-gray-400 mt-2">
                {apiMode
                  ? 'Usuario y contraseña configurados en la API.'
                  : 'Acceso al panel de carga de resultados (modo local).'}
              </p>
            </div>

            <section className="app-glass-panel overflow-hidden rounded-xl shadow-sport-card dark:shadow-sport-card-dark">
              <form onSubmit={(ev) => void handleSubmit(ev)} className="p-6 md:p-8 flex flex-col gap-5">
                {info ? (
                  <p
                    role="status"
                    className="text-sm font-medium text-amber-800 dark:text-amber-200 rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 px-3 py-2"
                  >
                    {info}
                  </p>
                ) : null}
                {error ? (
                  <p
                    role="alert"
                    className="text-sm font-medium text-red-700 dark:text-red-400 rounded-md border border-red-500/40 bg-red-50 dark:bg-red-950/40 px-3 py-2"
                  >
                    {error}
                  </p>
                ) : null}

                <div>
                  <label htmlFor="admin-username" className="block text-sm font-semibold text-[#111318] dark:text-white mb-1.5">
                    Usuario
                  </label>
                  <input
                    id="admin-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(ev) => setUsername(ev.target.value)}
                    className={inputBase}
                    required={!apiMode}
                    placeholder={apiMode ? 'admin' : undefined}
                  />
                </div>

                <div>
                  <label htmlFor="admin-password" className="block text-sm font-semibold text-[#111318] dark:text-white mb-1.5">
                    Contraseña
                  </label>
                  <input
                    id="admin-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    className={inputBase}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md px-4 py-3.5 text-sm font-bold bg-primary text-white border border-primary hover:opacity-95 transition-opacity shadow-sport-card dark:shadow-sport-card-dark disabled:opacity-60"
                >
                  {submitting ? 'Entrando…' : 'Entrar'}
                </button>

                {import.meta.env.DEV && import.meta.env.VITE_ADMIN_TOKEN?.trim() ? (
                  <p className="text-[11px] text-[#616f89] dark:text-gray-500 leading-relaxed">
                    Modo desarrollo: también podés usar <code className="font-mono">VITE_ADMIN_TOKEN</code> en el cliente
                    para llamadas admin sin pasar por este formulario.
                  </p>
                ) : null}
              </form>
            </section>

            <p className="text-center mt-8">
              <Link to="/" className="text-sm font-semibold text-primary hover:underline">
                Volver al sitio
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
