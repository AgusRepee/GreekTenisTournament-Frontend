/**
 * Avatar por defecto (logo del club) cuando el jugador no tiene foto de perfil.
 */

export const DEFAULT_PLAYER_AVATAR_URL: string = (() => {
  try {
    return new URL('../../img/logo.webp', import.meta.url).href;
  } catch {
    return '';
  }
})();
