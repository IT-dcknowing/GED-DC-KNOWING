import { KeyRound, LockOpen, Pencil, User as UserIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { AdminUser } from '@/api/admin';
import { apiErrorMessage } from '@/api/client';
import { FormAlert } from '@/components/form/FormAlert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useUser } from '@/features/admin/users/useUsersAdmin';
import { formatDateTime } from '@/lib/format';

type UserDetailsDialogProps = {
    userId: number | null;
    onClose: () => void;
    onEdit: (user: AdminUser) => void;
    onResetPassword: (user: AdminUser) => void;
    onUnlock: (user: AdminUser) => void;
    unlocking: boolean;
};

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="border-b border-line-soft py-2">
            <dt className="text-[10.5px] font-bold tracking-[1px] text-ink-3 uppercase">{label}</dt>
            <dd className="mt-0.5 text-[13px] font-semibold break-words text-ebene">{children}</dd>
        </div>
    );
}

/** Fiche d'un compte, avec les informations de création (amélioration A4). */
export function UserDetailsDialog({ userId, onClose, onEdit, onResetPassword, onUnlock, unlocking }: UserDetailsDialogProps) {
    const { data: user, isPending, isError, error } = useUser(userId);

    return (
        <Modal
            open={userId !== null}
            onClose={onClose}
            icon={UserIcon}
            title={user ? user.name : 'Fiche du compte'}
            subtitle={user?.email}
            size="lg"
            footer={
                user && (
                    <>
                        {user.locked_until && (
                            <Button variant="secondary" onClick={() => onUnlock(user)} loading={unlocking} icon={<LockOpen aria-hidden="true" className="size-4" />}>
                                Déverrouiller
                            </Button>
                        )}
                        <Button variant="secondary" onClick={() => onResetPassword(user)} icon={<KeyRound aria-hidden="true" className="size-4" />}>
                            Nouveau mot de passe temporaire
                        </Button>
                        <Button onClick={() => onEdit(user)} icon={<Pencil aria-hidden="true" className="size-4" />}>
                            Modifier
                        </Button>
                    </>
                )
            }
        >
            {isPending && (
                <p className="text-sm text-ink-3" role="status">
                    Chargement de la fiche
                </p>
            )}
            {isError && <FormAlert tone="error">{apiErrorMessage(error)}</FormAlert>}
            {user && (
                <dl className="grid gap-x-[18px] sm:grid-cols-2">
                    <Row label="Rôle">{user.role?.label ?? 'Aucun rôle'}</Row>
                    <Row label="Département">{user.department?.name ?? 'Transverse (aucun département)'}</Row>
                    <Row label="État du compte">
                        <span className="flex flex-wrap gap-1.5">
                            {user.is_active ? <Badge tone="green">Actif</Badge> : <Badge tone="grey">Désactivé</Badge>}
                            {user.locked_until && <Badge tone="red">Verrouillé jusqu'au {formatDateTime(user.locked_until)}</Badge>}
                        </span>
                    </Row>
                    <Row label="Mot de passe">
                        {user.must_change_password
                            ? 'Temporaire : à changer à la prochaine connexion'
                            : user.password_changed_at
                              ? `Modifié le ${formatDateTime(user.password_changed_at)}`
                              : 'Non renseigné'}
                    </Row>
                    <Row label="Dernière connexion">{user.last_login_at ? formatDateTime(user.last_login_at) : 'Jamais connecté'}</Row>
                    <Row label="Création du compte">
                        {user.created_at ? `Le ${formatDateTime(user.created_at)}` : 'Date inconnue'}
                        <span className="block text-xs font-normal text-ink-2">
                            {user.created_by
                                ? `Par ${user.created_by.name}`
                                : "Hors de l'interface d'administration (installation ou ligne de commande)"}
                        </span>
                    </Row>
                </dl>
            )}
        </Modal>
    );
}
