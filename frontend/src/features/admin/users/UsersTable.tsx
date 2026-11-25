import { Eye, KeyRound, Lock, Pencil } from 'lucide-react';

import type { AdminUser } from '@/api/admin';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { roleIcon } from '@/features/admin/users/roleIcons';
import { formatDateTime, formatTime, initials } from '@/lib/format';

type UsersTableProps = {
    users: AdminUser[];
    currentUserId: number;
    onOpen: (user: AdminUser) => void;
    onEdit: (user: AdminUser) => void;
    onToggleActive: (user: AdminUser, active: boolean) => void;
};

const headerClass =
    'sticky top-0 border-b border-line bg-linear-to-b from-[#fffefa] to-naturel px-3 py-2.5 text-left text-[10.5px] font-bold tracking-[1.2px] whitespace-nowrap text-ink-3 uppercase';
const iconButton =
    'inline-flex size-[30px] items-center justify-center rounded-lg border border-transparent text-ink-2 hover:border-line hover:bg-sable hover:text-or-brun';

/** Tableau des comptes (maquette : écran « Utilisateurs et rôles »). */
export function UsersTable({ users, currentUserId, onOpen, onEdit, onToggleActive }: UsersTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-[13px]">
                <thead>
                    <tr>
                        <th scope="col" className={headerClass}>Utilisateur</th>
                        <th scope="col" className={headerClass}>Rôle</th>
                        <th scope="col" className={headerClass}>Département</th>
                        <th scope="col" className={headerClass}>Compte</th>
                        <th scope="col" className={headerClass}>Dernière connexion</th>
                        <th scope="col" className={`${headerClass} text-right`}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => {
                        const isSelf = user.id === currentUserId;
                        const RoleIcon = roleIcon(user.role?.key);

                        return (
                            <tr key={user.id} className="border-b border-line-soft transition-colors hover:bg-[#fdf9ec]">
                                <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <span
                                            aria-hidden="true"
                                            className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-[9px] border border-or-brun/35 bg-linear-135 from-sable to-contour text-[11px] font-bold text-ebene"
                                        >
                                            {initials(user.name)}
                                        </span>
                                        <div className="min-w-0">
                                            <button
                                                type="button"
                                                onClick={() => onOpen(user)}
                                                className="block max-w-[260px] truncate text-left font-semibold text-ebene hover:text-or-brun hover:underline"
                                            >
                                                {user.name}
                                                {isSelf && <span className="ml-1.5 text-[11px] font-medium text-ink-3">(vous)</span>}
                                            </button>
                                            <span className="block max-w-[260px] truncate text-[11.5px] text-ink-3">{user.email}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-2.5">
                                    {user.role ? (
                                        <Badge tone="ebene" icon={<RoleIcon aria-hidden="true" className="size-3" />}>
                                            {user.role.label}
                                        </Badge>
                                    ) : (
                                        <Badge tone="red">Aucun rôle</Badge>
                                    )}
                                </td>
                                <td className="px-3 py-2.5">
                                    {user.department ? (
                                        <span className="inline-flex items-center gap-[5px] rounded-full border border-line bg-naturel px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                                            <span aria-hidden="true" className="size-[7px] rounded-[2px] bg-or" />
                                            {user.department.name}
                                        </span>
                                    ) : (
                                        <Badge tone="grey">Transverse</Badge>
                                    )}
                                </td>
                                <td className="px-3 py-2.5">
                                    <div className="flex flex-wrap gap-1.5">
                                        {user.is_active ? <Badge tone="green">Actif</Badge> : <Badge tone="grey">Désactivé</Badge>}
                                        {user.locked_until && (
                                            <Badge tone="red" icon={<Lock aria-hidden="true" className="size-3" />} title={`Verrouillé jusqu'à ${formatDateTime(user.locked_until)}`}>
                                                Verrouillé jusqu'à {formatTime(user.locked_until)}
                                            </Badge>
                                        )}
                                        {user.must_change_password && (
                                            <Badge tone="gold" icon={<KeyRound aria-hidden="true" className="size-3" />}>
                                                Mot de passe à changer
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap text-ink-2 tabular-nums">
                                    {user.last_login_at ? formatDateTime(user.last_login_at) : <span className="text-ink-3">Jamais</span>}
                                </td>
                                <td className="px-3 py-2.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <Switch
                                            checked={user.is_active}
                                            onChange={(active) => onToggleActive(user, active)}
                                            label={`Compte actif : ${user.name}`}
                                            disabled={isSelf}
                                            title={isSelf ? 'Vous ne pouvez pas désactiver votre propre compte.' : undefined}
                                        />
                                        <button type="button" className={iconButton} onClick={() => onOpen(user)} aria-label={`Fiche de ${user.name}`}>
                                            <Eye aria-hidden="true" className="size-[15px]" />
                                        </button>
                                        <button type="button" className={iconButton} onClick={() => onEdit(user)} aria-label={`Modifier ${user.name}`}>
                                            <Pencil aria-hidden="true" className="size-[15px]" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
