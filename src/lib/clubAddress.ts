/**
 * Dirección principal del club (para footer, contacto, etc.).
 */

export const CLUB_MAIN_SITE = {
  /** Nombre del predio / edificio */
  venue: 'DFI',
  /** Calle y número */
  street: 'Ing. Luis Silveyra 3647',
  locality: 'Carapachay',
  postalCode: 'B1606',
  province: 'Provincia de Buenos Aires',
} as const;

/** Líneas listas para mostrar: calle, localidad (con CPA), provincia */
export function getClubAddressLines(): readonly string[] {
  const { venue, street, locality, postalCode, province } = CLUB_MAIN_SITE;
  return [`${venue}, ${street}`, `${postalCode} ${locality}`, province];
}

/** Una sola línea (ej. para meta o compartir): DFI, Ing. Luis Silveyra 3647, B1606 Carapachay, Provincia de Buenos Aires */
export function getClubAddressOneLine(): string {
  const { venue, street, locality, postalCode, province } = CLUB_MAIN_SITE;
  return `${venue}, ${street}, ${postalCode} ${locality}, ${province}`;
}

/** Coordenadas del punto en Google Maps (sede / predio). */
export const CLUB_GOOGLE_MAPS_COORDS = { lat: -34.528381901487776, lng: -58.54282870985001 } as const;

/** Abrir en Google Maps en el mismo punto (app y web). */
export function getClubGoogleMapsSearchUrl(): string {
  const { lat, lng } = CLUB_GOOGLE_MAPS_COORDS;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
