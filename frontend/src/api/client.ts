import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios';

import { emitAuthEvent } from '@/app/authEvents';

/**
 * Client HTTP unique vers l'API Laravel.
 * Authentification Sanctum par cookie de session : le jeton CSRF (cookie XSRF-TOKEN)
 * est renvoyé automatiquement par Axios dans l'en-tête X-XSRF-TOKEN.
 */
export const api = axios.create({
    baseURL: '/api/v1',
    withCredentials: true,
    withXSRFToken: true,
    headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
});

/** Obtient le cookie CSRF de Sanctum, à appeler avant les requêtes d'authentification. */
export async function ensureCsrfCookie(): Promise<void> {
    await api.get('/sanctum/csrf-cookie', { baseURL: '' });
}

type LaravelErrorBody = {
    message?: string;
    code?: string;
    errors?: Record<string, string[]>;
};

type RetriableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean };

/** Routes dont la réponse 401 est attendue et traitée sur place (pas de redirection globale). */
const SELF_HANDLED_401 = ['/auth/me', '/auth/login', '/auth/logout'];

api.interceptors.response.use(undefined, async (error: unknown) => {
    if (!isAxiosError<LaravelErrorBody>(error) || !error.response || !error.config) {
        throw error;
    }

    const config = error.config as RetriableConfig;
    const { status, data } = error.response;
    const url = config.url ?? '';

    // Jeton CSRF expiré : on en obtient un nouveau et on rejoue la requête une seule fois.
    if (status === 419 && !config._csrfRetried) {
        config._csrfRetried = true;
        await ensureCsrfCookie();

        return api.request(config);
    }

    if (status === 401 && data?.code === 'ACCOUNT_DISABLED') {
        emitAuthEvent('account-disabled');
    } else if (status === 401 && !SELF_HANDLED_401.some((path) => url.startsWith(path))) {
        emitAuthEvent('session-expired');
    } else if (status === 403 && data?.code === 'PASSWORD_CHANGE_REQUIRED') {
        emitAuthEvent('password-change-required');
    }

    throw error;
});

/** Message lisible par l'utilisateur à partir d'une erreur d'appel à l'API. */
export function apiErrorMessage(error: unknown): string {
    if (!isAxiosError<LaravelErrorBody>(error)) {
        return 'Une erreur inattendue est survenue.';
    }

    if (!error.response) {
        return 'Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.';
    }

    const { status, data } = error.response;
    const firstFieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;

    if (firstFieldError) {
        return firstFieldError;
    }

    if (status === 419) {
        return 'Votre session a expiré. Réessayez.';
    }

    if (status >= 500) {
        return 'Le serveur a rencontré une erreur. Réessayez dans quelques instants.';
    }

    return data?.message ?? 'Une erreur inattendue est survenue.';
}
