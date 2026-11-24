import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

import { apiErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { FullPageStatus } from '@/components/ui/FullPageStatus';
import { AccessDeniedPage } from '@/features/errors/AccessDeniedPage';
import { hasPermission, useCurrentUser } from '@/features/auth/useAuth';

/*
| Gardes de navigation. Elles améliorent l'expérience mais ne protègent rien à elles seules :
| chaque requête est contrôlée par l'API Laravel (règle E4).
*/

function ServerUnreachable({ error, retry }: { error: unknown; retry: () => void }) {
    return (
        <FullPageStatus title="Connexion au serveur impossible">
            <p>{apiErrorMessage(error)}</p>
            <Button variant="secondary" className="mt-5" onClick={retry}>
                Réessayer
            </Button>
        </FullPageStatus>
    );
}

/** Pages de l'application : session ouverte et mot de passe à jour (règle B4). */
export function RequireAuth() {
    const location = useLocation();
    const { data: user, isPending, isError, error, refetch } = useCurrentUser();

    if (isPending) return <FullPageStatus />;
    if (isError) return <ServerUnreachable error={error} retry={() => void refetch()} />;

    if (!user) {
        return <Navigate to="/connexion" replace state={{ from: location.pathname + location.search }} />;
    }

    if (user.must_change_password) {
        return <Navigate to="/premiere-connexion" replace />;
    }

    return <Outlet />;
}

/** Première connexion : uniquement pour un compte dont le mot de passe temporaire n'a pas été changé. */
export function RequirePasswordChange() {
    const { data: user, isPending, isError, error, refetch } = useCurrentUser();

    if (isPending) return <FullPageStatus />;
    if (isError) return <ServerUnreachable error={error} retry={() => void refetch()} />;
    if (!user) return <Navigate to="/connexion" replace />;
    if (!user.must_change_password) return <Navigate to="/" replace />;

    return <Outlet />;
}

/** Connexion et mot de passe oublié : un utilisateur déjà connecté est renvoyé vers son espace. */
export function GuestOnly() {
    const { data: user, isPending } = useCurrentUser();

    if (isPending) return <FullPageStatus />;
    if (user) return <Navigate to={user.must_change_password ? '/premiere-connexion' : '/'} replace />;

    return <Outlet />;
}

/** AUTH-04 : affiche « Accès refusé » si le profil n'a pas la permission requise. */
export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
    const { data: user, isPending } = useCurrentUser();

    // Pas de verdict tant que le profil n'est pas chargé : évite d'afficher un refus à tort.
    if (isPending) return <FullPageStatus />;

    return hasPermission(user, permission) ? children : <AccessDeniedPage />;
}
