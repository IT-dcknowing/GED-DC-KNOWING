import { isRouteErrorResponse, useRouteError } from 'react-router';

import { Button } from '@/components/ui/Button';
import { FullPageStatus } from '@/components/ui/FullPageStatus';
import { NotFoundPage } from '@/features/errors/NotFoundPage';

/** Affiché quand une page plante ou n'existe pas, au lieu d'un écran blanc. */
export function RouteErrorPage() {
    const error = useRouteError();

    if (isRouteErrorResponse(error) && error.status === 404) {
        return <NotFoundPage />;
    }

    if (import.meta.env.DEV) {
        console.error(error);
    }

    return (
        <FullPageStatus title="Une erreur est survenue">
            <p>La page n'a pas pu s'afficher. Rechargez-la ; si le problème persiste, contactez l'administrateur de la GED.</p>
            <Button variant="secondary" className="mt-5" onClick={() => window.location.reload()}>
                Recharger la page
            </Button>
        </FullPageStatus>
    );
}
