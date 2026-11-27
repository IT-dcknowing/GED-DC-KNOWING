import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchCurrentUser, type CurrentUser } from '@/api/auth';
import {
    createClient,
    getClient,
    listClients,
    updateClient,
    type Client,
    type ClientListResponse,
} from '@/api/clients';
import { renderApp } from '@/test/renderWithRouter';

vi.mock('@/api/auth', () => ({
    fetchCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
}));

// Les appels réseau sont simulés ; les constantes et canManageClients restent réels.
vi.mock('@/api/clients', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/api/clients')>()),
    listClients: vi.fn(),
    getClient: vi.fn(),
    createClient: vi.fn(),
    updateClient: vi.fn(),
}));

const PATH = '/clients';
const LAZY = { timeout: 10000 };

const ADMIN: CurrentUser = {
    id: 1,
    name: 'Admin Principal',
    email: 'admin@exemple.test',
    role: { key: 'super_admin', label: 'Super Administrateur' },
    permissions: ['clients.manage', 'users.manage'],
    department: null,
    must_change_password: false,
    last_login_at: null,
};

const COLLABORATOR: CurrentUser = {
    ...ADMIN,
    id: 5,
    name: 'Collaborateur Test',
    role: { key: 'collaborateur', label: 'Collaborateur' },
    permissions: ['documents.upload'],
    department: { id: 1, code: 'DEP-01', name: 'Comptabilité' },
};

const INTERN: CurrentUser = {
    ...ADMIN,
    id: 8,
    name: 'Stagiaire Test',
    role: { key: 'stagiaire', label: 'Stagiaire' },
    permissions: [],
    department: { id: 1, code: 'DEP-01', name: 'Comptabilité' },
};

const COMPTA = { id: 1, code: 'DEP-01', name: 'Comptabilité' };
const FISCAL = { id: 2, code: 'DEP-02', name: 'Fiscalité' };

const IVOIRE: Client = {
    id: 1,
    code: 'CLI-0001',
    name: 'IVOIRE DISTRIBUTION',
    legal_form: 'SARL',
    sector: 'Commerce de gros',
    tax_regime: 'Réel normal',
    rccm: 'CI-ABJ-2026-B-00001',
    dfe: '1234567 A 1',
    address: 'Cocody Riviera 3, Abidjan',
    phone: '+225 27 22 00 11 01',
    email: 'contact@ivoire.test',
    contact_name: 'Adama KONE',
    started_on: '2026-01-15',
    is_active: true,
    radiated_at: null,
    departments: [COMPTA],
    created_at: '2026-01-15T09:00:00+00:00',
    created_by: { id: 1, name: 'Admin Principal' },
    documents_count: null,
    last_activity_at: null,
};

const BATIR: Client = {
    ...IVOIRE,
    id: 2,
    code: 'CLI-0002',
    name: 'BÂTIR PLUS IMMOBILIER',
    sector: 'Immobilier',
    legal_form: 'SA',
    email: 'contact@batir.test',
    departments: [FISCAL],
};

function listResponse(data: Client[]): ClientListResponse {
    return {
        data,
        meta: {
            current_page: 1,
            last_page: 1,
            per_page: 25,
            total: data.length,
            from: data.length > 0 ? 1 : null,
            to: data.length > 0 ? data.length : null,
        },
        departments: [COMPTA, FISCAL],
    };
}

beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(ADMIN);
    vi.mocked(listClients).mockReset().mockResolvedValue(listResponse([IVOIRE, BATIR]));
    vi.mocked(getClient).mockReset().mockResolvedValue(IVOIRE);
    vi.mocked(createClient).mockReset();
    vi.mocked(updateClient).mockReset();
});

describe('consultation du référentiel', () => {
    it('affiche les clients du périmètre et masque la gestion au collaborateur', async () => {
        vi.mocked(fetchCurrentUser).mockResolvedValue(COLLABORATOR);
        renderApp(PATH);

        expect(await screen.findByRole('heading', { level: 1, name: 'Clients' }, LAZY)).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: 'Clients' })[0]).toHaveAttribute('href', PATH);
        expect(await screen.findByRole('button', { name: 'IVOIRE DISTRIBUTION' })).toBeInTheDocument();
        expect(screen.getByText('CLI-0001')).toBeInTheDocument();
        expect(screen.getByText('Commerce de gros · SARL · client depuis 2026')).toBeInTheDocument();
        expect(screen.getAllByText('Comptabilité').length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', { name: 'Ajouter un client' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Modifier IVOIRE DISTRIBUTION' })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'IVOIRE DISTRIBUTION' }));
        const dialog = await screen.findByRole('dialog', { name: 'IVOIRE DISTRIBUTION' });
        expect(within(dialog).getByText('Cocody Riviera 3, Abidjan')).toBeInTheDocument();
        expect(within(dialog).getByText('Adama KONE')).toBeInTheDocument();
        expect(within(dialog).getByText('Les exercices annuels seront gérés avec le module Exercices.')).toBeInTheDocument();
        expect(within(dialog).queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
        expect(getClient).toHaveBeenCalledWith(1);
    }, 15000);

    it('explique à un profil sans périmètre que l’accès viendra plus tard', async () => {
        vi.mocked(fetchCurrentUser).mockResolvedValue(INTERN);
        vi.mocked(listClients).mockResolvedValue(listResponse([]));
        renderApp(PATH);

        expect(await screen.findByRole('heading', { level: 1, name: 'Clients' }, LAZY)).toBeInTheDocument();
        expect(
            await screen.findByText('Votre profil ne donne pas encore accès au référentiel clients. Les autorisations seront gérées dans un prochain lot.'),
        ).toBeInTheDocument();
    }, 15000);
});

describe('gestion par les profils autorisés', () => {
    it('crée un client avec un code généré et ses départements', async () => {
        vi.mocked(createClient).mockResolvedValue({
            ...IVOIRE,
            id: 3,
            code: 'CLI-0003',
            name: 'NOUVELLE AFFAIRE SAS',
            sector: 'Industrie',
            legal_form: 'SAS',
            email: 'contact@affaire.test',
            departments: [COMPTA],
        });
        renderApp(PATH);

        await userEvent.click(await screen.findByRole('button', { name: 'Ajouter un client' }, LAZY));
        const dialog = await screen.findByRole('dialog', { name: 'Nouveau client' });
        expect(within(dialog).getByText(/Le code sera généré par le serveur \(CLI-0001\)/)).toBeInTheDocument();

        await userEvent.type(within(dialog).getByLabelText('Dénomination *'), 'nouvelle affaire sas');
        await userEvent.selectOptions(within(dialog).getByLabelText('Forme juridique'), 'SAS');
        await userEvent.type(within(dialog).getByLabelText('Secteur d’activité'), 'Industrie');
        await userEvent.type(within(dialog).getByLabelText('E-mail'), 'contact@affaire.test');
        await userEvent.click(within(dialog).getByRole('checkbox', { name: /Comptabilité/ }));
        await userEvent.click(within(dialog).getByRole('button', { name: 'Créer le client' }));

        await waitFor(() =>
            expect(createClient).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'NOUVELLE AFFAIRE SAS',
                    legal_form: 'SAS',
                    sector: 'Industrie',
                    tax_regime: 'Réel normal',
                    email: 'contact@affaire.test',
                    department_ids: [1],
                }),
            ),
        );
        expect(await screen.findByText('Client créé')).toBeInTheDocument();
        expect(await screen.findByText('CLI-0003 · NOUVELLE AFFAIRE SAS')).toBeInTheDocument();
    }, 15000);

    it('refuse une dénomination trop courte et l’absence de département (C1)', async () => {
        renderApp(PATH);

        await userEvent.click(await screen.findByRole('button', { name: 'Ajouter un client' }, LAZY));
        const dialog = await screen.findByRole('dialog', { name: 'Nouveau client' });
        await userEvent.type(within(dialog).getByLabelText('Dénomination *'), 'AB');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Créer le client' }));

        expect(await within(dialog).findByText('Saisissez la dénomination du client (3 caractères minimum).')).toBeInTheDocument();
        expect(within(dialog).getByText('Sélectionnez au moins un département de suivi (RG-02).')).toBeInTheDocument();
        expect(createClient).not.toHaveBeenCalled();
    }, 15000);

    it('modifie un client sans jamais envoyer son code (C4)', async () => {
        vi.mocked(updateClient).mockResolvedValue({ ...IVOIRE, name: 'IVOIRE DISTRIBUTION PLUS' });
        renderApp(PATH);

        await userEvent.click(await screen.findByRole('button', { name: 'Modifier IVOIRE DISTRIBUTION' }, LAZY));
        const dialog = await screen.findByRole('dialog', { name: 'Modifier le client' });
        expect(within(dialog).getByText(/Le code du client n'est pas modifiable/)).toBeInTheDocument();
        expect(within(dialog).getByLabelText('Dénomination *')).toHaveValue('IVOIRE DISTRIBUTION');

        await userEvent.clear(within(dialog).getByLabelText('Dénomination *'));
        await userEvent.type(within(dialog).getByLabelText('Dénomination *'), 'ivoire distribution plus');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => expect(updateClient).toHaveBeenCalledTimes(1));
        const call = vi.mocked(updateClient).mock.calls[0];
        expect(call).toBeDefined();
        const [id, payload] = call!;
        expect(id).toBe(1);
        expect(payload).toEqual(expect.objectContaining({ name: 'IVOIRE DISTRIBUTION PLUS', department_ids: [1] }));
        expect(payload).not.toHaveProperty('code');
        expect(await screen.findByText('Client modifié')).toBeInTheDocument();
    }, 15000);
});

describe('recherche et filtre', () => {
    it('applique la recherche puis le filtre département', async () => {
        renderApp(PATH);

        const search = await screen.findByLabelText('Rechercher un client', undefined, LAZY);
        await userEvent.type(search, 'bâtir');

        await waitFor(() => expect(listClients).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'bâtir' })));

        await userEvent.selectOptions(screen.getByLabelText('Filtrer par département'), '2');

        await waitFor(() =>
            expect(listClients).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'bâtir', department: '2', page: 1 })),
        );
    }, 15000);
});
