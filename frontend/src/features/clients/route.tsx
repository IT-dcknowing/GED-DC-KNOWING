import { ClientsPage } from '@/features/clients/ClientsPage';

/**
 * Point d'entrée chargé à la demande. Le serveur applique la visibilité du compte
 * (C3, Q-14 provisoire) : un profil sans périmètre reçoit une liste vide.
 */
export function Component() {
    return <ClientsPage />;
}
