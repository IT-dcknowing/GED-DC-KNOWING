import { canViewDepartments } from '@/api/departments';
import { FullPageStatus } from '@/components/ui/FullPageStatus';
import { useCurrentUser } from '@/features/auth/useAuth';
import { DepartmentsPage } from '@/features/departments/DepartmentsPage';
import { AccessDeniedPage } from '@/features/errors/AccessDeniedPage';

/**
 * Route chargée à la demande. Accès selon le rôle (décision D1), sans permission dédiée :
 * le serveur applique la même règle à chaque requête.
 */
export function Component() {
    const { data: user, isPending } = useCurrentUser();

    if (isPending) return <FullPageStatus />;

    return canViewDepartments(user) ? <DepartmentsPage /> : <AccessDeniedPage />;
}
