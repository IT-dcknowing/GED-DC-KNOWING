import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchCurrentUser, type CurrentUser } from '@/api/auth';
import {
    createDepartment,
    getDepartment,
    listDepartmentsOverview,
    setDepartmentActive,
    updateDepartment,
    type Department,
} from '@/api/departments';
import { renderApp } from '@/test/renderWithRouter';

vi.mock('@/api/auth', () => ({
    fetchCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
}));

// Les appels réseau sont simulés ; la règle d'accès (canViewDepartments) reste la vraie.
vi.mock('@/api/departments', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/api/departments')>()),
    listDepartmentsOverview: vi.fn(),
    getDepartment: vi.fn(),
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    setDepartmentActive: vi.fn(),
}));

const PATH = '/departements';
const LAZY = { timeout: 10000 };

const ADMIN: CurrentUser = {
    id: 1,
    name: 'Admin Principal',
    email: 'admin@exemple.test',
    role: { key: 'super_admin', label: 'Super Administrateur' },
    permissions: ['users.manage', 'departments.manage'],
    department: null,
    must_change_password: false,
    last_login_at: null,
};

const DIRECTOR: CurrentUser = { ...ADMIN, id: 2, name: 'Directeur Test', role: { key: 'directeur', label: 'Directeur du Cabinet' }, permissions: ['journal.view'] };

const COLLABORATOR: CurrentUser = { ...ADMIN, id: 5, name: 'Collaborateur Test', role: { key: 'collaborateur', label: 'Collaborateur' }, permissions: ['documents.upload'] };

const COMPTA: Department = {
    id: 1,
    code: 'DEP-01',
    name: 'Comptabilité',
    is_active: true,
    manager: null,
    active_members_count: 2,
    created_at: '2026-11-25T09:00:00+00:00',
};

const FISCAL: Department = { ...COMPTA, id: 2, code: 'DEP-02', name: 'Fiscalité', manager: { id: 9, name: 'Ibrahim Koné' }, active_members_count: 1 };

const COMPTA_DETAIL: Department = {
    ...COMPTA,
    created_by: { id: 1, name: 'Admin Principal' },
    members: [
        { id: 7, name: 'Awa Traoré', role: { key: 'resp_dept', label: 'Responsable de Département' }, is_active: true, is_manager: false },
        { id: 8, name: 'Bakary Touré', role: { key: 'collaborateur', label: 'Collaborateur' }, is_active: true, is_manager: false },
        { id: 10, name: 'Chantal Aka', role: { key: 'resp_dept', label: 'Responsable de Département' }, is_active: false, is_manager: false },
    ],
};

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

beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(ADMIN);
    vi.mocked(listDepartmentsOverview).mockReset().mockResolvedValue([COMPTA, FISCAL]);
    vi.mocked(getDepartment).mockReset().mockResolvedValue(COMPTA_DETAIL);
    vi.mocked(createDepartment).mockReset();
    vi.mocked(updateDepartment).mockReset();
    vi.mocked(setDepartmentActive).mockReset();
});

describe('accès au module (D1)', () => {
    it('refuse l’accès et masque le menu pour un collaborateur', async () => {
        vi.mocked(fetchCurrentUser).mockResolvedValue(COLLABORATOR);
        renderApp(PATH);

        expect(await screen.findByRole('heading', { name: 'Accès refusé' }, LAZY)).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Départements' })).not.toBeInTheDocument();
        expect(listDepartmentsOverview).not.toHaveBeenCalled();
    }, 15000);

    it('montre les départements en consultation seule au Directeur', async () => {
        vi.mocked(fetchCurrentUser).mockResolvedValue(DIRECTOR);
        renderApp(PATH);

        expect(await screen.findByRole('heading', { level: 1, name: 'Départements' }, LAZY)).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: 'Départements' })[0]).toHaveAttribute('href', PATH);
        expect(screen.queryByRole('button', { name: 'Nouveau département' })).not.toBeInTheDocument();

        const compta = await screen.findByRole('button', { name: 'Détail du département Comptabilité' });
        expect(within(compta).getByText('Aucun responsable désigné')).toBeInTheDocument();
        expect(within(compta).getByText('collaborateurs actifs')).toBeInTheDocument();
        expect(within(screen.getByRole('button', { name: 'Détail du département Fiscalité' })).getByText('Responsable : Ibrahim Koné')).toBeInTheDocument();

        await userEvent.click(compta);
        const dialog = await screen.findByRole('dialog', { name: 'Comptabilité' });
        const members = await within(dialog).findByRole('list', { name: 'Collaborateurs rattachés' });
        expect(within(members).getAllByRole('listitem')).toHaveLength(3);
        expect(within(dialog).getByText('Par Admin Principal')).toBeInTheDocument();
        expect(within(dialog).queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
        expect(within(dialog).queryByRole('button', { name: 'Désactiver' })).not.toBeInTheDocument();
    }, 15000);
});

describe('gestion par le Super Administrateur', () => {
    it('crée un département avec un code mis en majuscules', async () => {
        vi.mocked(createDepartment).mockResolvedValue({ ...COMPTA, id: 3, code: 'DEP-03', name: 'Social et Paie' });
        renderApp(PATH);

        await userEvent.click(await screen.findByRole('button', { name: 'Nouveau département' }, LAZY));
        const dialog = await screen.findByRole('dialog', { name: 'Nouveau département' });
        await userEvent.type(within(dialog).getByLabelText('Code'), 'dep-03');
        await userEvent.type(within(dialog).getByLabelText('Nom du département'), 'Social et Paie');
        expect(within(dialog).queryByLabelText('Responsable')).not.toBeInTheDocument();
        await userEvent.click(within(dialog).getByRole('button', { name: 'Créer le département' }));

        await waitFor(() => expect(createDepartment).toHaveBeenCalledWith({ code: 'DEP-03', name: 'Social et Paie' }));
        expect(await screen.findByText('Département créé')).toBeInTheDocument();
    }, 15000);

    it('refuse un code mal formé sans appeler le serveur (D7)', async () => {
        renderApp(PATH);

        await userEvent.click(await screen.findByRole('button', { name: 'Nouveau département' }, LAZY));
        const dialog = await screen.findByRole('dialog', { name: 'Nouveau département' });
        await userEvent.type(within(dialog).getByLabelText('Code'), 'DEP_03');
        await userEvent.type(within(dialog).getByLabelText('Nom du département'), 'Social');
        await userEvent.click(within(dialog).getByRole('button', { name: 'Créer le département' }));

        expect(await within(dialog).findByText('Lettres majuscules, chiffres et tirets uniquement (ex. DEP-01).')).toBeInTheDocument();
        expect(createDepartment).not.toHaveBeenCalled();
    }, 15000);

    it('ne propose comme responsable que les comptes éligibles (D4)', async () => {
        vi.mocked(updateDepartment).mockResolvedValue({ ...COMPTA_DETAIL, manager: { id: 7, name: 'Awa Traoré' } });
        renderApp(PATH);

        await userEvent.click(await screen.findByRole('button', { name: 'Détail du département Comptabilité' }, LAZY));
        const details = await screen.findByRole('dialog', { name: 'Comptabilité' });
        await userEvent.click(await within(details).findByRole('button', { name: 'Modifier' }));

        const form = await screen.findByRole('dialog', { name: 'Modifier le département' });
        expect(within(form).getByLabelText('Code')).toHaveAttribute('readonly');
        const select = within(form).getByLabelText('Responsable');
        expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['Aucun responsable désigné', 'Awa Traoré']);

        await userEvent.selectOptions(select, '7');
        await userEvent.click(within(form).getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => expect(updateDepartment).toHaveBeenCalledWith(1, { name: 'Comptabilité', manager_id: 7 }));
        expect(await screen.findByText('Département modifié')).toBeInTheDocument();
    }, 15000);

    it('affiche le refus du serveur quand des comptes actifs sont rattachés (D6)', async () => {
        const message = 'Impossible de désactiver ce département : 2 comptes actifs y sont encore rattachés.';
        vi.mocked(setDepartmentActive).mockRejectedValue(validationError('department', message));
        renderApp(PATH);

        await userEvent.click(await screen.findByRole('button', { name: 'Détail du département Comptabilité' }, LAZY));
        const details = await screen.findByRole('dialog', { name: 'Comptabilité' });
        await userEvent.click(await within(details).findByRole('button', { name: 'Désactiver' }));

        const confirm = await screen.findByRole('dialog', { name: 'Désactiver ce département ?' });
        await userEvent.click(within(confirm).getByRole('button', { name: 'Désactiver' }));

        await waitFor(() => expect(setDepartmentActive).toHaveBeenCalledWith(1, false));
        expect(await screen.findByText(message)).toBeInTheDocument();
    }, 15000);
});
