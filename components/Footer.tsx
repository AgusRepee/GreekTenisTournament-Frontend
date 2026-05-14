import React, { useMemo } from 'react';
import { Instagram, Mail, MessageCircle } from 'lucide-react';
import { whatsAppUrl } from '../src/lib/whatsapp';
import { getClubAddressLinesFromSettings, resolveContactEmail, useSiteSettings } from '../src/lib/siteSettings';

interface FooterProps {
  setScreen?: (screen: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setScreen }) => {
  const settings = useSiteSettings();
  const addressLines = useMemo(() => getClubAddressLinesFromSettings(settings.club), [settings.club]);
  const contactEmail = resolveContactEmail(settings.club.contactEmail);
  const socialLinks = useMemo(() => {
    const wa = {
      id: 'whatsapp' as const,
      label: 'WhatsApp',
      icon: MessageCircle,
      href: whatsAppUrl('Hola, quisiera más información.', settings.club.whatsappDigits),
    };
    const email = {
      id: 'email' as const,
      label: 'Email',
      icon: Mail,
      href: `mailto:${contactEmail}`,
    };
    const igHandle = settings.club.instagramHandle.trim().replace(/^@/, '');
    if (!igHandle) return [wa, email];
    return [
      wa,
      email,
      {
        id: 'instagram' as const,
        label: 'Instagram',
        icon: Instagram,
        href: `https://www.instagram.com/${igHandle}/`,
      },
    ];
  }, [settings.club.whatsappDigits, settings.club.instagramHandle, contactEmail]);

  const handleNav = (screen: string) => {
    setScreen?.(screen);
  };

  const brandTitle = settings.club.circuitName.trim() || 'Greek Tenis';
  const tagline = settings.club.tagline.trim() || 'Circuito amateur de tenis con torneos, rankings y estadísticas';

  return (
    <footer className="app-glass-panel app-glass-panel--bar mt-auto border-t border-gray-200/90 dark:border-gray-600/50">
      {/* 4 columns */}
      <div className="max-w-[1440px] mx-auto py-12 md:py-14 px-4 md:px-8 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 text-center md:text-left">
          {/* 1. Brand */}
          <div className="flex flex-col gap-3 items-center md:items-start">
            <h3 className="text-lg font-bold text-[#111318] dark:text-white tracking-tight">{brandTitle}</h3>
            <p className="text-sm text-[#616f89] dark:text-gray-400 leading-relaxed max-w-[260px] text-center md:text-left">{tagline}</p>
          </div>

          {/* 2. Sedes */}
          <div className="flex flex-col gap-3 items-center md:items-start">
            <h3 className="text-[11px] font-bold text-[#111318] dark:text-white uppercase tracking-[0.14em]">Sede</h3>
            <ul className="space-y-1 text-sm text-[#616f89] dark:text-gray-400">
              {addressLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          {/* 3. Navigation */}
          <div className="flex flex-col gap-3 items-center md:items-start">
            <h3 className="text-[11px] font-bold text-[#111318] dark:text-white uppercase tracking-[0.14em]">Navegación</h3>
            <nav className="flex flex-col gap-2 items-center md:items-start">
              {setScreen ? (
                <>
                  <button type="button" onClick={() => handleNav('news')} className="text-sm text-[#616f89] dark:text-gray-400 hover:text-primary transition-colors">Novedades</button>
                  <button type="button" onClick={() => handleNav('directory')} className="text-sm text-[#616f89] dark:text-gray-400 hover:text-primary transition-colors">Torneos</button>
                  <button type="button" onClick={() => handleNav('rankings')} className="text-sm text-[#616f89] dark:text-gray-400 hover:text-primary transition-colors">Ranking</button>
                  <button type="button" onClick={() => handleNav('players')} className="text-sm text-[#616f89] dark:text-gray-400 hover:text-primary transition-colors">Jugadores</button>
                </>
              ) : (
                <>
                  <a href="#" className="text-sm text-[#616f89] dark:text-gray-400 hover:text-primary transition-colors">Torneos</a>
                  <a href="#" className="text-sm text-[#616f89] dark:text-gray-400 hover:text-primary transition-colors">Ranking</a>
                  <a href="#" className="text-sm text-[#616f89] dark:text-gray-400 hover:text-primary transition-colors">Jugadores</a>
                </>
              )}
            </nav>
          </div>

          {/* 4. Social */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[11px] font-bold text-[#111318] dark:text-white uppercase tracking-[0.14em]">Contacto</h3>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              {socialLinks.map(({ id, label, icon: Icon, href }) => (
                <a
                  key={id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center size-10 rounded-none bg-gray-100 dark:bg-gray-700/80 text-[#616f89] dark:text-gray-400 border border-gray-200/80 dark:border-gray-600 hover:bg-primary hover:text-white hover:border-primary dark:hover:bg-primary dark:hover:border-primary transition-colors"
                  aria-label={label}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="border-t border-gray-200/90 bg-white/20 py-5 dark:border-gray-600/50 dark:bg-white/[0.04] px-4 md:px-8 lg:px-10">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-center sm:text-left">
          <p className="text-xs text-[#616f89] dark:text-gray-500">
            © 2026 {brandTitle} – Todos los derechos reservados
          </p>
          <p className="text-xs text-[#616f89] dark:text-gray-500">
            Desarrollado por Agustin Repecka
          </p>
        </div>
      </div>
    </footer>
  );
};
