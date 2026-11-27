import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    changePassword,
    fetchCurrentUser,
    forgotPassword,
    login,
    logout,
    resetPassword,
    type CurrentUser,
} from '@/api/auth';
import { emitAuthEvent } from '@/app/authEvents';
import { RequirePermission } from '@/app/guards';
import { renderApp } from '@/test/renderWithRouter';

vi.mock('@/api/auth', () => ({
    fetchCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
}));

const USER: CurrentUser = {
    id: 1,
    name: 'Utilisateur Test',
    email: 'test@exemple.test',
    role: { key: 'collaborateur', label: 'Collaborateur' },
    permissions: ['documents.upload'],
    department: { id: 1, code: 'DEP-TEST', name: 'Département de test' },
    must_change_password: false,
    last_login_at: null,
};

const NEW_USER: CurrentUser = { ...USER, must_change_password: true };

function validationError(field: string, message: string) {
    const headers = new AxiosHeaders();

    return new AxiosError('422', 'ERR_BAD_REQUEST', { headers }, null, {
        status: 422,
        statusText: 'Unprocessable Content',
        headers: {},
        config: { headers },
        data: { message, errors: { [field]: [message] } },
    });
}

async function fill(label: string | RegExp, value: string) {
    await userEvent.type(await screen.findByLabelText(label), value);
}

describe('AUTH-01 connexion', () => {
    beforeEach(() => {
        vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(null);
        vi.mocked(login).mockReset();
    });

    it('redirige vers la connexion quand aucune session n’est ouverte', async () => {
        const { router } = renderApp('/');

        expect(await screen.findByRole('heading', { name: 'Connexion sécurisée' })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/connexion');
    });

    it('reprend les éléments de la maquette, sans accès de démonstration ni « se souvenir de moi »', async () => {
        renderApp('/connexion');

        expect(await screen.findByText('Accédez à votre espace documentaire DC-KNOWING.')).toBeInTheDocument();
        expect(screen.getByLabelText('Adresse e-mail professionnelle')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Mot de passe oublié ?' })).toHaveAttribute('href', '/mot-de-passe-oublie');
        expect(screen.getByText('Arborescence normalisée')).toBeInTheDocument();
        expect(screen.getByText('Validations tracées')).toBeInTheDocument();
        expect(screen.getByText('Archives contrôlées')).toBeInTheDocument();
        expect(screen.queryByText(/se souvenir/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/démonstration|demo1234/i)).not.toBeInTheDocument();
    });

    it('permet d’afficher et de masquer le mot de passe', async () => {
        renderApp('/connexion');
        const input = await screen.findByLabelText('Mot de passe');

        expect(input).toHaveAttribute('type', 'password');
        await userEvent.click(screen.getByRole('button', { name: 'Afficher : Mot de passe' }));
        expect(input).toHaveAttribute('type', 'text');
    });

    it('signale les champs obligatoires sans appeler l’API', async () => {
        renderApp('/connexion');

        await userEvent.click(await screen.findByRole('button', { name: /se connecter/i }));

        expect(await screen.findByText('Saisissez votre adresse e-mail.')).toBeInTheDocument();
        expect(screen.getByText('Saisissez votre mot de passe.')).toBeInTheDocument();
        expect(login).not.toHaveBeenCalled();
    });

    it('affiche le message renvoyé par le serveur en cas d’échec', async () => {
        vi.mocked(login).mockRejectedValue(validationError('email', 'Adresse e-mail ou mot de passe incorrect.'));
        renderApp('/connexion');

        await fill('Adresse e-mail professionnelle', 'test@exemple.test');
        await fill('Mot de passe', 'mauvais');
        await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Adresse e-mail ou mot de passe incorrect.');
    });

    it('ouvre l’accueil après une connexion réussie (A7)', async () => {
        vi.mocked(login).mockResolvedValue(USER);
        const { router } = renderApp('/connexion');

        await fill('Adresse e-mail professionnelle', 'test@exemple.test');
        await fill('Mot de passe', 'MotDePasse2026');
        await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

        expect(await screen.findByRole('heading', { name: 'Bonjour, Utilisateur Test' })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/');
        expect(vi.mocked(login).mock.calls[0]?.[0]).toEqual({ email: 'test@exemple.test', password: 'MotDePasse2026' });
    });

    it('envoie vers le changement obligatoire quand le mot de passe est temporaire (B3)', async () => {
        vi.mocked(login).mockResolvedValue(NEW_USER);
        const { router } = renderApp('/connexion');

        await fill('Adresse e-mail professionnelle', 'test@exemple.test');
        await fill('Mot de passe', 'Temporaire2026');
        await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

        expect(await screen.findByRole('heading', { name: 'Choisissez votre mot de passe' })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/premiere-connexion');
    });
});

describe('première connexion', () => {
    beforeEach(() => {
        vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(NEW_USER);
        vi.mocked(changePassword).mockReset();
    });

    it('bloque l’accès aux pages tant que le mot de passe temporaire n’est pas changé (B4)', async () => {
        const { router } = renderApp('/profil/mot-de-passe');

        expect(await screen.findByRole('heading', { name: 'Choisissez votre mot de passe' })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/premiere-connexion');
    });

    it('enregistre le nouveau mot de passe puis ouvre l’application', async () => {
        vi.mocked(changePassword).mockResolvedValue(USER);
        const { router } = renderApp('/premiere-connexion');

        await fill('Mot de passe temporaire', 'Temporaire2026');
        await fill('Nouveau mot de passe', 'NouveauSecret2026');
        await fill('Confirmation du nouveau mot de passe', 'NouveauSecret2026');
        await userEvent.click(screen.getByRole('button', { name: 'Enregistrer et accéder à la GED' }));

        await waitFor(() => expect(router.state.location.pathname).toBe('/'));
        expect(vi.mocked(changePassword).mock.calls[0]?.[0]).toEqual({
            current_password: 'Temporaire2026',
            password: 'NouveauSecret2026',
            password_confirmation: 'NouveauSecret2026',
        });
    });

    it('coche les exigences au fil de la saisie et refuse un mot de passe non conforme', async () => {
        renderApp('/premiere-connexion');

        await fill('Nouveau mot de passe', 'abc');
        expect(screen.getByText('Une lettre minuscule')).toHaveTextContent('respecté');
        expect(screen.getByText('Une lettre majuscule')).toHaveTextContent('non respecté');

        await fill('Mot de passe temporaire', 'Temporaire2026');
        await fill('Confirmation du nouveau mot de passe', 'abc');
        await userEvent.click(screen.getByRole('button', { name: 'Enregistrer et accéder à la GED' }));

        expect(await screen.findByText('Le mot de passe doit contenir au moins 10 caractères.')).toBeInTheDocument();
        expect(changePassword).not.toHaveBeenCalled();
    });
});

describe('AUTH-02 et AUTH-03 mot de passe oublié', () => {
    beforeEach(() => {
        vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(null);
        vi.mocked(forgotPassword).mockReset();
        vi.mocked(resetPassword).mockReset();
    });

    it('affiche la confirmation renvoyée par le serveur', async () => {
        vi.mocked(forgotPassword).mockResolvedValue('Si un compte actif correspond à cette adresse, un e-mail a été envoyé.');
        renderApp('/mot-de-passe-oublie');

        await fill('Adresse e-mail professionnelle', 'test@exemple.test');
        await userEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }));

        expect(await screen.findByRole('heading', { name: 'Demande envoyée' })).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('Si un compte actif correspond');
        expect(vi.mocked(forgotPassword).mock.calls[0]?.[0]).toBe('test@exemple.test');
    });

    it('signale un lien incomplet', async () => {
        renderApp('/reinitialisation');

        expect(await screen.findByRole('heading', { name: 'Lien incomplet' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Faire une nouvelle demande' })).toBeInTheDocument();
    });

    it('vérifie la confirmation puis renvoie vers la connexion après la réinitialisation', async () => {
        vi.mocked(resetPassword).mockResolvedValue('Votre mot de passe a été réinitialisé. Vous pouvez vous connecter.');
        const { router } = renderApp('/reinitialisation?token=abc123&email=test%40exemple.test');

        expect(await screen.findByText(/test@exemple\.test/)).toBeInTheDocument();
        await fill('Nouveau mot de passe', 'NouveauSecret2026');
        await fill('Confirmation du nouveau mot de passe', 'Different2026x');
        await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' }));
        expect(await screen.findByText('La confirmation ne correspond pas au nouveau mot de passe.')).toBeInTheDocument();
        expect(resetPassword).not.toHaveBeenCalled();

        await userEvent.clear(screen.getByLabelText('Confirmation du nouveau mot de passe'));
        await fill('Confirmation du nouveau mot de passe', 'NouveauSecret2026');
        await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' }));

        expect(await screen.findByRole('heading', { name: 'Connexion sécurisée' })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe('/connexion');
        expect(screen.getByRole('status')).toHaveTextContent('Votre mot de passe a été réinitialisé.');
        expect(vi.mocked(resetPassword).mock.calls[0]?.[0]).toEqual({
            token: 'abc123',
            email: 'test@exemple.test',
            password: 'NouveauSecret2026',
            password_confirmation: 'NouveauSecret2026',
        });
    });

    it('propose une nouvelle demande quand le lien est invalide ou expiré', async () => {
        vi.mocked(resetPassword).mockRejectedValue(
            validationError('token', 'Ce lien de réinitialisation est invalide ou a expiré. Faites une nouvelle demande.'),
        );
        renderApp('/reinitialisation?token=ancien&email=test%40exemple.test');

        await fill('Nouveau mot de passe', 'NouveauSecret2026');
        await fill('Confirmation du nouveau mot de passe', 'NouveauSecret2026');
        await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' }));

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('invalide ou a expiré');
        expect(within(alert).getByRole('link', { name: 'Faire une nouvelle demande' })).toBeInTheDocument();
    });
});

describe('AUTH-05 modification du mot de passe et session', () => {
    beforeEach(() => {
        vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(USER);
        vi.mocked(changePassword).mockReset();
        vi.mocked(logout).mockReset();
    });

    it('modifie le mot de passe depuis le profil et le confirme', async () => {
        vi.mocked(changePassword).mockResolvedValue(USER);
        renderApp('/profil/mot-de-passe');

        await fill('Mot de passe actuel', 'Actuel2026Secret');
        await fill('Nouveau mot de passe', 'NouveauSecret2026');
        await fill('Confirmation du nouveau mot de passe', 'NouveauSecret2026');
        await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' }));

        expect(await screen.findByRole('status')).toHaveTextContent('Vos autres sessions ont été fermées.');
    });

    it('affiche sur le bon champ l’erreur « mot de passe actuel incorrect »', async () => {
        vi.mocked(changePassword).mockRejectedValue(validationError('current_password', 'Le mot de passe actuel est incorrect.'));
        renderApp('/profil/mot-de-passe');

        await fill('Mot de passe actuel', 'Faux2026Secret');
        await fill('Nouveau mot de passe', 'NouveauSecret2026');
        await fill('Confirmation du nouveau mot de passe', 'NouveauSecret2026');
        await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' }));

        expect(await screen.findByText('Le mot de passe actuel est incorrect.')).toBeInTheDocument();
        expect(screen.getByLabelText('Mot de passe actuel')).toHaveAttribute('aria-invalid', 'true');
    });

    it('déconnecte depuis le menu du profil', async () => {
        vi.mocked(logout).mockResolvedValue();
        const { router } = renderApp('/');

        await userEvent.click(await screen.findByRole('button', { name: 'Menu du profil de Utilisateur Test' }));
        await userEvent.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }));

        await waitFor(() => expect(router.state.location.pathname).toBe('/connexion'));
        expect(logout).toHaveBeenCalledOnce();
    });

    it('renvoie vers la connexion avec un message quand la session expire (E1)', async () => {
        const { router } = renderApp('/');
        await screen.findByRole('heading', { name: 'Bonjour, Utilisateur Test' });
        vi.mocked(fetchCurrentUser).mockResolvedValue(null);

        act(() => emitAuthEvent('session-expired'));

        expect(await screen.findByRole('status')).toHaveTextContent('Votre session a expiré');
        expect(router.state.location.pathname).toBe('/connexion');
    });

    it('signale un compte désactivé pendant la session (E3)', async () => {
        renderApp('/');
        await screen.findByRole('heading', { name: 'Bonjour, Utilisateur Test' });
        vi.mocked(fetchCurrentUser).mockResolvedValue(null);

        act(() => emitAuthEvent('account-disabled'));

        expect(await screen.findByRole('alert')).toHaveTextContent('Votre compte a été désactivé.');
    });

    it('affiche une page 404 pour une adresse inconnue', async () => {
        renderApp('/adresse-inexistante');

        expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
    });
});

describe('AUTH-04 accès refusé', () => {
    it('affiche l’écran « Accès refusé » quand la permission manque', async () => {
        vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(USER);
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const router = createMemoryRouter([
            {
                path: '/',
                element: (
                    <RequirePermission permission="journal.view">
                        <p>Contenu protégé</p>
                    </RequirePermission>
                ),
            },
        ]);

        render(
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
            </QueryClientProvider>,
        );

        expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument();
        expect(screen.getByText(/Collaborateur/)).toBeInTheDocument();
        expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
    });
});
