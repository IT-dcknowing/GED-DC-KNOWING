import { createBrowserRouter } from 'react-router';

import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { EnvironmentStatusPage } from '@/features/system/EnvironmentStatusPage';

export const router = createBrowserRouter([
    {
        path: '/',
        // Page technique provisoire : sera remplacée par l'écran de connexion en phase 1.
        element: <EnvironmentStatusPage />,
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);
