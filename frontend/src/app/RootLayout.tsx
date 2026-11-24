import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';

import type { CurrentUser } from '@/api/auth';
import { onAuthEvent } from '@/app/authEvents';
import { CURRENT_USER_KEY } from '@/features/auth/useAuth';

/**
 * Racine de toutes les pages : traduit les signaux de l'API en redirections.
 * - session expirée (30 minutes d'inactivité, règle E1) ou compte désactivé (règle E3) :
 *   données effacées du navigateur, retour à la connexion avec un message ;
 * - mot de passe temporaire non changé (règle B4) : écran de première connexion.
 */
export function RootLayout() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useEffect(
        () =>
            onAuthEvent((event) => {
                if (event === 'password-change-required') {
                    queryClient.setQueryData<CurrentUser | null>(CURRENT_USER_KEY, (user) =>
                        user ? { ...user, must_change_password: true } : user,
                    );
                    navigate('/premiere-connexion', { replace: true });

                    return;
                }

                queryClient.clear();
                queryClient.setQueryData<CurrentUser | null>(CURRENT_USER_KEY, null);
                navigate(`/connexion?raison=${event === 'account-disabled' ? 'compte-desactive' : 'session-expiree'}`, {
                    replace: true,
                });
            }),
        [navigate, queryClient],
    );

    return <Outlet />;
}
