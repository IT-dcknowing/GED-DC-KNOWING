import axios from 'axios';

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
