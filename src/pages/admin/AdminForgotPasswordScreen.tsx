import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { requestAdminPasswordReset } from '@/lib/api/apiClient';

const inputBase =
  'w-full rounded-md bg-white dark:bg-gray-800 border border-gray-200/90 dark:border-gray-600 text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none transition-all px-4 py-3.5 text-sm';

export default function AdminForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSubmitting(true);
    try {
      const res = await requestAdminPasswordReset(email.trim());
      setMessage(res.message ?? 'Si el email existe, enviamos un enlace para recuperar la contraseña.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el email de recuperación.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-page-canvas flex min-h-screen flex-col">
      <div className="app-page-content flex w-full flex-1 flex-col items-center justify-center py-12">
        <div className="container-admin flex flex-col items-center">
          <div className="w-full max-w-[420px]">
            <div className="mb-8 text-center">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-500">
                Administración
              </p>
              <h1 className="font-display text-2xl font-bold tracking-tight text-[#111318] dark:text-white md:text-3xl">
                Recuperar contraseña
              </h1>
              <p className="mt-2 text-sm text-[#616f89] dark:text-gray-400">
                Te enviamos un enlace seguro al email admin configurado.
              </p>
            </div>

            <section className="app-glass-panel overflow-hidden rounded-xl shadow-sport-card dark:shadow-sport-card-dark">
              <form onSubmit={(ev) => void handleSubmit(ev)} className="flex flex-col gap-5 p-6 md:p-8">
                {message ? (
                  <p className="rounded-md border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {message}
                  </p>
                ) : null}
                {error ? (
                  <p className="rounded-md border border-red-500/40 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    {error}
                  </p>
                ) : null}

                <div>
                  <label htmlFor="admin-reset-email" className="mb-1.5 block text-sm font-semibold text-[#111318] dark:text-white">
                    Email
                  </label>
                  <input
                    id="admin-reset-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    className={inputBase}
                    placeholder="agustinrepecka@gmail.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md border border-primary bg-primary px-4 py-3.5 text-sm font-bold text-white shadow-sport-card transition-opacity hover:opacity-95 disabled:opacity-60 dark:shadow-sport-card-dark"
                >
                  {submitting ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>
            </section>

            <p className="mt-8 text-center">
              <Link to="/login" className="text-sm font-semibold text-primary hover:underline">
                Volver al login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
