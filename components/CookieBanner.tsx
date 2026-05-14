import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'greek-tenis-cookie-consent';

export const CookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== 'accepted') setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const handleConfigure = () => {
    // Optional: could open a modal or link to privacy page
    handleAccept();
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4 bg-white dark:bg-[#1a202c] border-t border-gray-300 dark:border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
      role="dialog"
      aria-label="Aviso de cookies"
    >
      <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-[#111318] dark:text-gray-300 text-center sm:text-left flex-1">
          Usamos cookies para mejorar la experiencia del usuario.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleConfigure}
            className="px-4 py-2 rounded-md text-sm font-semibold text-[#616f89] dark:text-gray-400 hover:text-[#111318] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Configurar
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="px-5 py-2.5 rounded-md text-sm font-bold uppercase tracking-wide bg-primary hover:bg-primary-hover text-white transition-colors min-h-[2.5rem]"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
