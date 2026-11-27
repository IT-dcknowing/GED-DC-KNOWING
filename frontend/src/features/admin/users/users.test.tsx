import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    createUser,
    getUser,
    listDepartments,
    listRoles,
    listUsers,
    setUserActive,
    unlockUser,
    updateUser,
    type AdminUser,
    type RolesCatalog,
} from '@/api/admin';
import { fetchCurrentUser, type CurrentUser } from '@/api/auth';
import { PROVISIONAL_NOTICE } from '@/features/admin/users/RoleCards';
import { renderApp } from '@/test/renderWithRouter';

vi.mock('@/api/auth', () => ({
    fetchCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
}));

vi.mock('@/api/admin', () => ({
    listUsers: vi.fn(),
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    setUserActive: vi.fn(),
    resetUserPassword: vi.fn(),
    unlockUser: vi.fn(),
    listRoles: vi.fn(),
    listDepartments: vi.fn(),
}));

const PATH = '/administration/utilisateurs';

const ADMIN: CurrentUser = {
    id: 1,
    name: 'Admin Principal',
    email: 'admin@exemple.test',
    role: { key: 'super_admin', label: 'Super Administrateur' },
    permissions: ['users.manage', 'journal.view'],
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
};

const ADMIN_ROW: AdminUser = {
    id: 1,
    name: 'Admin Principal',
    email: 'admin@exemple.test',
    role: { key: 'super_admin', label: 'Super Administrateur' },
    department: null,
    is_active: true,
    must_change_password: false,
    locked_until: null,
    last_login_at: '2026-11-25T08:00:00+00:00',
    password_changed_at: '2026-11-24T10:00:00+00:00',
    created_at: '2026-11-24T10:00:00+00:00',
    created_by: null,
};

const FATOU: AdminUser = {
    id: 2,
    name: 'Fatou Bamba',
    email: 'f.bamba@exemple.test',
    role: { key: 'collaborateur', label: 'Collaborateur' },
    department: { id: 1, code: 'DEP-TEST', name: 'Département de test' },
    is_active: true,
    must_change_password: true,
    locked_until: '2099-01-01T10:15:00+00:00',
    last_login_at: null,
    password_changed_at: '2026-11-24T11:00:00+00:00',
    created_at: '2026-11-24T11:00:00+00:00',
    created_by: { id: 1, name: 'Admin Principal' },
};

const CATALOG: RolesCatalog = {
    roles: [
        {
            key: 'super_admin',
            label: 'Super Administrateur',
            description: 'Paramétrage global, comptes, rôles, référentiels et supervision technique.',
            users_count: 1,
            permissions: [
                { key: 'documents.download', label: 'Télécharger des documents' },
                { key: 'users.manage', label: 'Gérer les comptes utilisateurs' },
            ],
        },
        {
            key: 'auditeur',
            label: 'Auditeur / Lecteur',
            description: 'Consultation seule des espaces et documents explicitement ouverts à son profil.',
            users_count: 1,
            permissions: [{ key: 'documents.download', label: 'Télécharger des documents' }],
        },
    ],
    permissions: [
        { key: 'documents.download', label: 'Télécharger des documents' },
        { key: 'users.manage', label: 'Gérer les comptes utilisateurs' },
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
    vi.mocked(listUsers).mockReset().mockResolvedValue({
        data: [ADMIN_ROW, FATOU],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 2, from: 1, to: 2 },
    });
    vi.mocked(listRoles).mockReset().mockResolvedValue(CATALOG);
    vi.mocked(listDepartments).mockReset().mockResolvedValue([{ id: 1, code: 'DEP-TEST', name: 'Département de test' }]);
    vi.mocked(getUser).mockReset().mockResolvedValue(FATOU);
    vi.mocked(createUser).mockReset();
    vi.mocked(updateUser).mockReset();
    vi.mocked(setUserActive).mockReset();
    vi.mocked(unlockUser).mockReset();
});

describe('accès au module', () => {
    it('affiche « Accès refusé » et masque le menu sans la permission users.manage', async () => {
        vi.mocked(fetchCurrentUser).mockResolvedValue(COLLABORATOR);
        renderApp(PATH);

        // Premier chargement du module à la demande : la transformation du code peut dépasser 1 s.
        expect(await screen.findByRole('heading', { name: 'Accès refusé' }, { timeout: 10000 })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Utilisateurs et rôles' })).not.toBeInTheDocument();
        expect(listUsers).not.toHaveBeenCalled();
    }, 15000);

    it('affiche le menu Administration et la liste des comptes au Super Administrateur', async () => {
        renderApp(PATH);

        expect(await screen.findByRole('heading', { level: 1, name: 'Utilisateurs et rôles' })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: 'Utilisateurs et rôles' })[0]).toHaveAttribute('href', PATH);

        const row = (await screen.findByRole('button', { name: 'Fatou Bamba' })).closest('tr') as HTMLElement;
        expect(within(row).getByText('Département de test')).toBeInTheDocument();
        expect(within(row).getByText('Mot de passe à changer')).toBeInTheDocument();
        expect(within(row).getByText(/Verrouillé jusqu'à/)).toBeInTheDocument();
        expect(within(row).getByText('Jamais')).toBeInTheDocument();
        expect(screen.getByText('Transverse')).toBeInTheDocument();
    });
});

describe('recherche et filtres', () => {
    it('transmet la recherche et le filtre de rôle à l’API', async () => {
        const user = userEvent.setup();
        renderApp(PATH);

        await user.type(await screen.findByRole('searchbox', { name: 'Rechercher un compte' }), 'fat');
        await waitFor(() => expect(listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'fat', page: 1 })));

        await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrer par rôle' }), 'auditeur');
        await waitFor(() => expect(listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'auditeur', page: 1 })));
    });
});

describe('création d’un compte', () => {
    it('crée le compte puis affiche le mot de passe temporaire une seule fois', async () => {
        const user = userEvent.setup();
        vi.mocked(createUser).mockResolvedValue({ user: { ...FATOU, id: 9, name: 'Claire Mensah', email: 'c.mensah@exemple.test' }, temporaryPassword: 'Tmp7kQ9xWz2Lmn' });
        const writeText = vi.spyOn(navigator.clipboard, 'writeText');
        renderApp(PATH);

        await user.click(await screen.findByRole('button', { name: 'Ajouter un utilisateur' }));
        const dialog = await screen.findByRole('dialog', { name: 'Nouveau compte' });
        await user.type(within(dialog).getByLabelText('Nom complet'), 'Claire Mensah');
        await user.type(within(dialog).getByLabelText('Adresse e-mail professionnelle'), 'c.mensah@exemple.test');
        await user.selectOptions(within(dialog).getByLabelText('Rôle'), 'auditeur');
        await user.click(within(dialog).getByRole('button', { name: 'Créer le compte' }));

        const passwordDialog = await screen.findByRole('dialog', { name: 'Compte créé' });
        expect(vi.mocked(createUser).mock.calls[0]?.[0]).toEqual({
            name: 'Claire Mensah',
            email: 'c.mensah@exemple.test',
            role: 'auditeur',
            department_id: null,
        });
        expect(within(passwordDialog).getByLabelText('Mot de passe temporaire')).toHaveTextContent('Tmp7kQ9xWz2Lmn');
        expect(within(passwordDialog).getByText(/ne sera plus jamais affiché/)).toBeInTheDocument();

        await user.click(within(passwordDialog).getByRole('button', { name: 'Copier' }));
        expect(writeText).toHaveBeenCalledWith('Tmp7kQ9xWz2Lmn');
        expect(within(passwordDialog).getByRole('button', { name: 'Copié' })).toBeInTheDocument();

        await user.click(within(passwordDialog).getByRole('button', { name: "J'ai transmis le mot de passe" }));
        await waitFor(() => expect(screen.queryByText('Tmp7kQ9xWz2Lmn')).not.toBeInTheDocument());
    });

    it('affiche sur le bon champ l’erreur renvoyée par le serveur', async () => {
        const user = userEvent.setup();
        vi.mocked(createUser).mockRejectedValue(validationError('email', 'Un compte existe déjà avec cette adresse e-mail.'));
        renderApp(PATH);

        await user.click(await screen.findByRole('button', { name: 'Ajouter un utilisateur' }));
        const dialog = await screen.findByRole('dialog', { name: 'Nouveau compte' });
        await user.type(within(dialog).getByLabelText('Nom complet'), 'Doublon');
        await user.type(within(dialog).getByLabelText('Adresse e-mail professionnelle'), 'admin@exemple.test');
        await user.selectOptions(within(dialog).getByLabelText('Rôle'), 'auditeur');
        await user.click(within(dialog).getByRole('button', { name: 'Créer le compte' }));

        expect(await within(dialog).findByText('Un compte existe déjà avec cette adresse e-mail.')).toBeInTheDocument();
        expect(within(dialog).getByLabelText('Adresse e-mail professionnelle')).toHaveAttribute('aria-invalid', 'true');
    });
});

describe('son propre compte (A1, G1)', () => {
    it('empêche de modifier son propre rôle et renvoie le rôle inchangé', async () => {
        const user = userEvent.setup();
        vi.mocked(updateUser).mockResolvedValue({ ...ADMIN_ROW, name: 'Admin Renommé' });
        renderApp(PATH);

        await user.click(await screen.findByRole('button', { name: 'Modifier Admin Principal' }));
        const dialog = await screen.findByRole('dialog', { name: 'Modifier le compte' });
        expect(within(dialog).getByLabelText('Rôle')).toBeDisabled();
        expect(within(dialog).getByText(/Vous ne pouvez pas modifier votre propre rôle/)).toBeInTheDocument();

        const name = within(dialog).getByLabelText('Nom complet');
        await user.clear(name);
        await user.type(name, 'Admin Renommé');
        await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => expect(updateUser).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Admin Renommé', role: 'super_admin' })));
    });

    it('ne permet pas de désactiver son propre compte depuis la liste', async () => {
        renderApp(PATH);

        expect(await screen.findByRole('switch', { name: 'Compte actif : Admin Principal' })).toBeDisabled();
    });
});

describe('activation et désactivation', () => {
    it('demande une confirmation avant de désactiver un compte', async () => {
        const user = userEvent.setup();
        vi.mocked(setUserActive).mockResolvedValue({ ...FATOU, is_active: false });
        renderApp(PATH);

        await user.click(await screen.findByRole('switch', { name: 'Compte actif : Fatou Bamba' }));
        const dialog = await screen.findByRole('dialog', { name: 'Désactiver ce compte ?' });
        expect(within(dialog).getByText(/toutes ses sessions ouvertes seront fermées/)).toBeInTheDocument();
        expect(setUserActive).not.toHaveBeenCalled();

        await user.click(within(dialog).getByRole('button', { name: 'Désactiver' }));

        await waitFor(() => expect(setUserActive).toHaveBeenCalledWith(2, false));
        expect(await screen.findByText('Compte désactivé')).toBeInTheDocument();
    });

    it('affiche le refus du serveur sans le masquer', async () => {
        const user = userEvent.setup();
        vi.mocked(setUserActive).mockRejectedValue(
            validationError('user', 'Impossible de désactiver ce compte : il doit toujours rester au moins un Super Administrateur actif.'),
        );
        renderApp(PATH);

        await user.click(await screen.findByRole('switch', { name: 'Compte actif : Fatou Bamba' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Désactiver' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('au moins un Super Administrateur actif');
    });
});

describe('fiche du compte (A4)', () => {
    it('affiche la création du compte et permet de le déverrouiller', async () => {
        const user = userEvent.setup();
        vi.mocked(unlockUser).mockResolvedValue('Le compte a été déverrouillé.');
        renderApp(PATH);

        await user.click(await screen.findByRole('button', { name: 'Fiche de Fatou Bamba' }));
        const dialog = await screen.findByRole('dialog', { name: 'Fatou Bamba' });

        expect(await within(dialog).findByText('Par Admin Principal')).toBeInTheDocument();
        expect(within(dialog).getByText(/^Le 24\/11\/2026/)).toBeInTheDocument();

        await user.click(within(dialog).getByRole('button', { name: 'Déverrouiller' }));
        await waitFor(() => expect(vi.mocked(unlockUser).mock.calls[0]?.[0]).toBe(2));
        expect(await screen.findByText('Compte déverrouillé')).toBeInTheDocument();
    });
});

describe('cartes des rôles', () => {
    it('affiche la mention provisoire, les descriptions et les permissions appliquées', async () => {
        renderApp(PATH);

        expect(await screen.findByText(PROVISIONAL_NOTICE)).toBeInTheDocument();
        expect(PROVISIONAL_NOTICE).toBe('Répartition provisoire des permissions, en attente de validation par la Direction de DC-KNOWING.');
        expect(await screen.findByText('Consultation seule des espaces et documents explicitement ouverts à son profil.')).toBeInTheDocument();

        const auditor = screen.getByRole('list', { name: 'Permissions accordées : Auditeur / Lecteur' });
        expect(within(auditor).getByText('Télécharger des documents')).toBeInTheDocument();
        expect(within(auditor).queryByText('Gérer les comptes utilisateurs')).not.toBeInTheDocument();
    });
});
