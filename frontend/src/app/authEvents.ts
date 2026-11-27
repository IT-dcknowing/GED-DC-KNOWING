/**
 * Événements d'authentification détectés dans les réponses de l'API (client Axios)
 * et traités par l'interface (redirections), sans dépendance entre les deux.
 */
export type AuthEvent = 'session-expired' | 'account-disabled' | 'password-change-required';

type Listener = (event: AuthEvent) => void;

const listeners = new Set<Listener>();

export function onAuthEvent(listener: Listener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function emitAuthEvent(event: AuthEvent): void {
    listeners.forEach((listener) => listener(event));
}
