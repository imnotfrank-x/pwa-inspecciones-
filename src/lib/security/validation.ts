// Límites del contrato local; no sustituyen autenticación ni validación del servidor.
export const MAX_SNAPSHOT_CHARACTERS = 4 * 1024 * 1024;

export function isBoundedText(value: unknown, maximum: number): value is string {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) return false;
  // Permitir saltos de línea/tabulaciones del textarea, rechazar controles invisibles.
  return !Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127;
  });
}

export function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return false;
  const [, y, m, d, h, minute, second, zone] = match;
  const year = Number(y), month = Number(m), day = Number(d);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] &&
    Number(h) < 24 && Number(minute) < 60 && Number(second) < 60 &&
    (zone === "Z" || (Number(zone.slice(1, 3)) <= 23 && Number(zone.slice(4)) < 60)) &&
    Number.isFinite(Date.parse(value));
}

export function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}
