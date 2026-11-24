import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { changePassword, fetchCurrentUser, login, logout, type CurrentUser } from '@/api/auth';

export const CURRENT_USER_KEY = ['auth', 'me'] as const;

export function useCurrentUser() {
    return useQuery({
        queryKey: CURRENT_USER_KEY,
        queryFn: fetchCurrentUser,
        staleTime: 5 * 60 * 1000,
    });
}

export function useLogin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: login,
        onSuccess: (user) => {
            queryClient.setQueryData<CurrentUser | null>(CURRENT_USER_KEY, user);
        },
    });
}

export function useLogout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: logout,
        onSettled: () => {
            // Quel que soit le résultat, on efface toutes les données mises en cache côté navigateur.
            queryClient.clear();
            queryClient.setQueryData<CurrentUser | null>(CURRENT_USER_KEY, null);
        },
    });
}

export function useChangePassword() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: changePassword,
        onSuccess: (user) => {
            queryClient.setQueryData<CurrentUser | null>(CURRENT_USER_KEY, user);
        },
    });
}

export function hasPermission(user: CurrentUser | null | undefined, permission: string): boolean {
    return !!user?.permissions.includes(permission);
}

/** Page d'arrivée après identification (règle A7). Commune à tous les rôles tant que les modules ne sont pas livrés. */
export function landingPath(user: CurrentUser, requested?: string | null): string {
    if (user.must_change_password) {
        return '/premiere-connexion';
    }

    const safe = requested && requested.startsWith('/') && !requested.startsWith('//') ? requested : null;

    return safe && !safe.startsWith('/connexion') && !safe.startsWith('/premiere-connexion') ? safe : '/';
}
