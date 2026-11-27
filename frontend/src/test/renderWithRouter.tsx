import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { routes } from '@/app/router';
import { ToastProvider } from '@/components/ui/Toast';

/** Affiche l'application complète (routes réelles) à l'adresse donnée. */
export function renderApp(initialPath = '/') {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const router = createMemoryRouter(routes, { initialEntries: [initialPath] });

    const result = render(
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <RouterProvider router={router} />
            </ToastProvider>
        </QueryClientProvider>,
    );

    return { ...result, router, queryClient };
}
