import { isAxiosError } from 'axios';

import { api, ensureCsrfCookie } from '@/api/client';

export type CurrentUser = {
    id: number;
    name: string;
    email: string;
    role: { key: string; label: string } | null;
    permissions: string[];
    department: { id: number; code: string; name: string } | null;
    must_change_password: boolean;
    last_login_at: string | null;
};

export type LoginCredentials = {
    email: string;
    password: string;
};

export type PasswordChange = {
    current_password: string;
    password: string;
    password_confirmation: string;
};

export type PasswordReset = {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
};

export async function login(credentials: LoginCredentials): Promise<CurrentUser> {
    await ensureCsrfCookie();
    const { data } = await api.post<{ data: CurrentUser }>('/auth/login', credentials);

    return data.data;
}

/** Utilisateur connecté, ou null si aucune session n'est ouverte. */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
    try {
        const { data } = await api.get<{ data: CurrentUser }>('/auth/me');

        return data.data;
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
            return null;
        }

        throw error;
    }
}

export async function logout(): Promise<void> {
    await api.post('/auth/logout');
}

export async function changePassword(payload: PasswordChange): Promise<CurrentUser> {
    const { data } = await api.put<{ data: CurrentUser }>('/auth/password', payload);

    return data.data;
}

/** La réponse est identique que l'adresse corresponde à un compte ou non (règle D3). */
export async function forgotPassword(email: string): Promise<string> {
    await ensureCsrfCookie();
    const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email });

    return data.message;
}

export async function resetPassword(payload: PasswordReset): Promise<string> {
    await ensureCsrfCookie();
    const { data } = await api.post<{ message: string }>('/auth/reset-password', payload);

    return data.message;
}
