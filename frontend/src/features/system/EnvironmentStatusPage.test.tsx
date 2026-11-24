import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchHealth } from '@/api/health';
import { EnvironmentStatusPage } from '@/features/system/EnvironmentStatusPage';

vi.mock('@/api/health', () => ({ fetchHealth: vi.fn() }));

function renderPage() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={client}>
            <EnvironmentStatusPage />
        </QueryClientProvider>,
    );
}

describe('EnvironmentStatusPage', () => {
    beforeEach(() => {
        vi.mocked(fetchHealth).mockReset();
    });

    it('affiche les deux vérifications comme opérationnelles quand tout répond', async () => {
        vi.mocked(fetchHealth).mockResolvedValue({ status: 'ok', database: 'ok' });

        renderPage();

        expect(await screen.findAllByText('Opérationnelle')).toHaveLength(2);
    });

    it('signale la base de données indisponible sans masquer que l’API répond', async () => {
        vi.mocked(fetchHealth).mockResolvedValue({ status: 'degraded', database: 'unavailable' });

        renderPage();

        expect(await screen.findByText('Indisponible')).toBeInTheDocument();
        expect(screen.getByText('Opérationnelle')).toBeInTheDocument();
    });

    it('affiche un message d’erreur quand l’API ne répond pas', async () => {
        vi.mocked(fetchHealth).mockRejectedValue(new Error('réseau'));

        renderPage();

        expect(await screen.findByRole('alert')).toHaveTextContent('L\'API ne répond pas');
        expect(screen.getAllByText('Indisponible')).toHaveLength(2);
    });
});
