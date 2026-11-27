const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

function toDate(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const date = new Date(iso);

    return Number.isNaN(date.getTime()) ? null : date;
}

/** « 24/11/2026 », ou chaîne vide. */
export function formatDate(iso: string | null | undefined): string {
    const date = toDate(iso);

    return date ? dateFormat.format(date) : '';
}

/** « 24/11/2026 à 15:10 », ou chaîne vide. */
export function formatDateTime(iso: string | null | undefined): string {
    const date = toDate(iso);

    return date ? `${dateFormat.format(date)} à ${timeFormat.format(date)}` : '';
}

/** « 15:10 », ou chaîne vide. */
export function formatTime(iso: string | null | undefined): string {
    const date = toDate(iso);

    return date ? timeFormat.format(date) : '';
}

/** Initiales d'un nom (avatar). */
export function initials(name: string): string {
    const words = name.trim().split(/\s+/);

    return ((words[0]?.charAt(0) ?? '?') + (words[1]?.charAt(0) ?? '')).toUpperCase();
}
