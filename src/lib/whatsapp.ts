/** WhatsApp number in international format (no + or spaces). */
export const WHATSAPP_PHONE = '5491166459100';

function normalizeWaDigits(input: string | undefined | null): string {
  if (input == null || !String(input).trim()) return WHATSAPP_PHONE;
  const d = String(input).replace(/\D/g, '');
  return d.length >= 8 ? d : WHATSAPP_PHONE;
}

/**
 * Builds a WhatsApp wa.me link that opens in a new tab with a pre-filled message.
 * @param phoneDigits Opcional: solo dígitos (p. ej. desde configuración del sitio).
 */
export function whatsAppUrl(message: string, phoneDigits?: string | null): string {
  return `https://wa.me/${normalizeWaDigits(phoneDigits ?? undefined)}?text=${encodeURIComponent(message)}`;
}

export const whatsAppMessages = {
  tournamentRegistration: (tournamentName: string) =>
    `Hola, quiero anotarme al torneo ${tournamentName}`,
  tournamentInfo: (tournamentName: string) =>
    `Hola, quiero consultar información sobre el torneo ${tournamentName}`,
  tenisClasses: () =>
    'Hola, quiero consultar sobre clases de tenis',
  moreInfoAboutUs: () =>
    'Hola, quiero más información sobre el club',
};
