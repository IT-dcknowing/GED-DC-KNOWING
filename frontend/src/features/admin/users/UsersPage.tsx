import { Plus, Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { AdminUser, UserFilters } from '@/api/admin';
import { apiErrorMessage } from '@/api/client';
import { FormAlert } from '@/components/form/FormAlert';
import { Select } from '@/components/form/SelectField';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { RoleCards } from '@/features/admin/users/RoleCards';
import { TemporaryPasswordDialog } from '@/features/admin/users/TemporaryPasswordDialog';
import { UserDetailsDialog } from '@/features/admin/users/UserDetailsDialog';
import { UserFormDialog } from '@/features/admin/users/UserFormDialog';
import { UsersTable } from '@/features/admin/users/UsersTable';
import { useResetUserPassword, useRoles, useSetUserActive, useUnlockUser, useUsers } from '@/features/admin/users/useUsersAdmin';
import { useCurrentUser } from '@/features/auth/useAuth';

type TemporaryPassword = { name: string; email: string; password: string; context: 'created' | 'reset' };

/** Module « Utilisateurs et rôles » (maquette : vUsers), réservé à la permission users.manage. */
export function UsersPage() {
    const toast = useToast();
    const { data: me } = useCurrentUser();
    const currentUserId = me?.id ?? 0;

    const [searchInput, setSearchInput] = useState('');
    const [filters, setFilters] = useState<UserFilters>({ search: '', role: '', status: '', page: 1 });
    const users = useUsers(filters);
    const roles = useRoles();

    // Fenêtres : undefined = fermée.
    const [formUser, setFormUser] = useState<AdminUser | null | undefined>(undefined);
    const [detailsId, setDetailsId] = useState<number | null>(null);
    const [temporary, setTemporary] = useState<TemporaryPassword | null>(null);
    const [toDeactivate, setToDeactivate] = useState<AdminUser | null>(null);
    const [toReset, setToReset] = useState<AdminUser | null>(null);

    const setActive = useSetUserActive();
    const resetPassword = useResetUserPassword();
    const unlock = useUnlockUser();

    // Recherche appliquée 300 ms après la dernière frappe.
    useEffect(() => {
        const timer = setTimeout(() => setFilters((f) => (f.search === searchInput.trim() ? f : { ...f, search: searchInput.trim(), page: 1 })), 300);

        return () => clearTimeout(timer);
    }, [searchInput]);

    const showError = (title: string, error: unknown) => toast({ tone: 'error', title, message: apiErrorMessage(error) });

    const toggleActive = (user: AdminUser, active: boolean) => {
        if (!active) {
            setToDeactivate(user);
            return;
        }
        setActive.mutate(
            { id: user.id, active: true },
            {
                onSuccess: () => toast({ tone: 'success', title: 'Compte activé', message: `${user.name} peut de nouveau se connecter.` }),
                onError: (error) => showError('Activation impossible', error),
            },
        );
    };

    const confirmDeactivate = () => {
        if (!toDeactivate) return;
        const user = toDeactivate;
        setActive.mutate(
            { id: user.id, active: false },
            {
                onSuccess: () => toast({ tone: 'success', title: 'Compte désactivé', message: `${user.name} ne peut plus se connecter ; ses sessions ont été fermées.` }),
                onError: (error) => showError('Désactivation impossible', error),
                onSettled: () => setToDeactivate(null),
            },
        );
    };

    const confirmReset = () => {
        if (!toReset) return;
        const user = toReset;
        resetPassword.mutate(user.id, {
            onSuccess: (password) => {
                setDetailsId(null);
                setTemporary({ name: user.name, email: user.email, password, context: 'reset' });
            },
            onError: (error) => showError('Réinitialisation impossible', error),
            onSettled: () => setToReset(null),
        });
    };

    const doUnlock = (user: AdminUser) =>
        unlock.mutate(user.id, {
            onSuccess: (message) => toast({ tone: 'success', title: 'Compte déverrouillé', message }),
            onError: (error) => showError('Déverrouillage impossible', error),
        });

    const meta = users.data?.meta;

    return (
        <div>
            <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-[-0.2px]">Utilisateurs et rôles</h1>
                    <p className="mt-[3px] max-w-[640px] text-[13px] text-ink-2">
                        Comptes des personnes ayant accès à la GED, leur rôle et leur département.
                    </p>
                </div>
                <Button onClick={() => setFormUser(null)} icon={<Plus aria-hidden="true" className="size-[15px]" />}>
                    Ajouter un utilisateur
                </Button>
            </div>

            <section aria-label="Comptes" className="rounded-xl border border-line-soft bg-white shadow-[0_1px_2px_rgba(26,26,26,0.05),0_2px_8px_-4px_rgba(26,26,26,0.08)]">
                <div className="flex flex-wrap gap-2.5 border-b border-line-soft px-3.5 py-3">
                    <div className="relative min-w-[220px] flex-1">
                        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-[11px] size-[14px] -translate-y-1/2 text-ink-3" />
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Rechercher par nom ou adresse e-mail"
                            aria-label="Rechercher un compte"
                            className="h-[38px] w-full rounded-[9px] border border-line bg-white pr-3 pl-[34px] text-[13.5px] placeholder:text-ink-3 focus:border-or focus:shadow-[0_0_0_3px_rgba(201,162,39,0.14)] focus:outline-none"
                        />
                    </div>
                    <Select
                        aria-label="Filtrer par rôle"
                        className="w-full sm:w-56"
                        value={filters.role}
                        onChange={(event) => setFilters((f) => ({ ...f, role: event.target.value, page: 1 }))}
                    >
                        <option value="">Tous les rôles</option>
                        {roles.data?.roles.map((role) => (
                            <option key={role.key} value={role.key}>
                                {role.label}
                            </option>
                        ))}
                    </Select>
                    <Select
                        aria-label="Filtrer par état du compte"
                        className="w-full sm:w-44"
                        value={filters.status}
                        onChange={(event) => setFilters((f) => ({ ...f, status: event.target.value as UserFilters['status'], page: 1 }))}
                    >
                        <option value="">Tous les comptes</option>
                        <option value="active">Actifs</option>
                        <option value="inactive">Désactivés</option>
                    </Select>
                </div>

                {users.isError && (
                    <div className="p-4">
                        <FormAlert tone="error">{apiErrorMessage(users.error)}</FormAlert>
                        <Button variant="secondary" onClick={() => void users.refetch()}>
                            Réessayer
                        </Button>
                    </div>
                )}

                {users.isPending && (
                    <p className="px-4 py-10 text-center text-sm text-ink-3" role="status">
                        Chargement des comptes
                    </p>
                )}

                {users.data && users.data.data.length === 0 && (
                    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                        <span className="mb-2 flex size-16 items-center justify-center rounded-[18px] border border-dashed border-contour bg-linear-135 from-sable to-naturel text-or">
                            <Users aria-hidden="true" className="size-7" />
                        </span>
                        <h2 className="text-[15px] font-bold">Aucun compte trouvé</h2>
                        <p className="max-w-[380px] text-[12.5px] text-ink-2">Aucun compte ne correspond à la recherche ou aux filtres choisis.</p>
                    </div>
                )}

                {users.data && users.data.data.length > 0 && (
                    <UsersTable
                        users={users.data.data}
                        currentUserId={currentUserId}
                        onOpen={(user) => setDetailsId(user.id)}
                        onEdit={setFormUser}
                        onToggleActive={toggleActive}
                    />
                )}

                {meta && (
                    <Pagination
                        page={meta.current_page}
                        lastPage={meta.last_page}
                        total={meta.total}
                        from={meta.from}
                        to={meta.to}
                        itemsLabel={meta.total > 1 ? 'comptes' : 'compte'}
                        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
                    />
                )}
            </section>

            <RoleCards />

            <UserFormDialog
                user={formUser}
                currentUserId={currentUserId}
                onClose={() => setFormUser(undefined)}
                onCreated={(user, password) => {
                    setFormUser(undefined);
                    setTemporary({ name: user.name, email: user.email, password, context: 'created' });
                }}
                onUpdated={(user) => {
                    setFormUser(undefined);
                    toast({ tone: 'success', title: 'Compte modifié', message: user.name });
                }}
            />

            <UserDetailsDialog
                userId={detailsId}
                onClose={() => setDetailsId(null)}
                onEdit={(user) => {
                    setDetailsId(null);
                    setFormUser(user);
                }}
                onResetPassword={setToReset}
                onUnlock={doUnlock}
                unlocking={unlock.isPending}
            />

            <TemporaryPasswordDialog data={temporary} onClose={() => setTemporary(null)} />

            <ConfirmDialog
                open={toDeactivate !== null}
                danger
                title="Désactiver ce compte ?"
                subtitle={toDeactivate ? `${toDeactivate.name} · ${toDeactivate.email}` : undefined}
                confirmLabel="Désactiver"
                loading={setActive.isPending}
                onConfirm={confirmDeactivate}
                onCancel={() => setToDeactivate(null)}
            >
                La personne ne pourra plus se connecter et <strong>toutes ses sessions ouvertes seront fermées</strong>. Le compte et
                son historique sont conservés : vous pourrez le réactiver à tout moment.
            </ConfirmDialog>

            <ConfirmDialog
                open={toReset !== null}
                title="Générer un nouveau mot de passe temporaire ?"
                subtitle={toReset ? `${toReset.name} · ${toReset.email}` : undefined}
                confirmLabel="Générer"
                loading={resetPassword.isPending}
                onConfirm={confirmReset}
                onCancel={() => setToReset(null)}
            >
                L'ancien mot de passe ne fonctionnera plus, <strong>toutes les sessions de ce compte seront fermées</strong> et un
                éventuel verrouillage sera levé. La personne devra choisir un nouveau mot de passe à sa prochaine connexion.
            </ConfirmDialog>
        </div>
    );
}
