import { RequirePermission } from '@/app/guards';
import { UsersPage } from '@/features/admin/users/UsersPage';

/**
 * Point d'entrée chargé à la demande (amélioration A5) : ce code n'est téléchargé
 * que lorsqu'un administrateur ouvre le module. L'API vérifie de son côté chaque requête.
 */
export function Component() {
    return (
        <RequirePermission permission="users.manage">
            <UsersPage />
        </RequirePermission>
    );
}
