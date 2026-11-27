import { Check, Info, Shield, X } from 'lucide-react';

import { apiErrorMessage } from '@/api/client';
import { FormAlert } from '@/components/form/FormAlert';
import { roleIcon } from '@/features/admin/users/roleIcons';
import { useRoles } from '@/features/admin/users/useUsersAdmin';

export const PROVISIONAL_NOTICE = 'Répartition provisoire des permissions, en attente de validation par la Direction de DC-KNOWING.';

/**
 * Les 7 rôles, leur description et les permissions réellement appliquées par l'application
 * (lecture seule). La mention « provisoire » est informative : ces droits sont en vigueur.
 */
export function RoleCards() {
    const { data, isPending, isError, error } = useRoles();

    return (
        <section aria-labelledby="roles-titre" className="mt-6">
            <h2 id="roles-titre" className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold tracking-[1px] text-ebene uppercase after:h-px after:flex-1 after:bg-line-soft">
                <Shield aria-hidden="true" className="size-[13px] text-or-brun" />
                Les sept rôles et leurs permissions
            </h2>

            <div className="mb-3.5 flex items-start gap-2.5 rounded-[11px] border border-contour bg-sable px-3.5 py-[11px] text-[12.5px] text-[#6e5610]">
                <Info aria-hidden="true" className="mt-px size-4 shrink-0" />
                <p>
                    <strong>{PROVISIONAL_NOTICE}</strong> Les droits présentés ci-dessous sont ceux actuellement appliqués par
                    l'application.
                </p>
            </div>

            {isPending && <p className="text-sm text-ink-3">Chargement des rôles</p>}
            {isError && <FormAlert tone="error">{apiErrorMessage(error)}</FormAlert>}

            {data && (
                <ul className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                    {data.roles.map((role) => {
                        const Icon = roleIcon(role.key);
                        const granted = new Set(role.permissions.map((p) => p.key));
                        const notGranted = data.permissions.filter((p) => !granted.has(p.key));

                        return (
                            <li key={role.key} className="rounded-xl border border-line-soft bg-white p-4 shadow-[0_1px_2px_rgba(26,26,26,0.05),0_2px_8px_-4px_rgba(26,26,26,0.08)]">
                                <div className="mb-2 flex items-center gap-[11px]">
                                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-ebene text-or-clair">
                                        <Icon aria-hidden="true" className="size-[17px]" />
                                    </span>
                                    <div className="min-w-0">
                                        <h3 className="text-[13.5px] font-bold">{role.label}</h3>
                                        <p className="text-[11px] text-ink-3">
                                            {role.users_count} compte{role.users_count > 1 ? 's' : ''} · {role.permissions.length} permission
                                            {role.permissions.length > 1 ? 's' : ''} sur {data.permissions.length}
                                        </p>
                                    </div>
                                </div>
                                <p className="mb-2.5 text-xs leading-relaxed text-ink-2">{role.description}</p>

                                <ul aria-label={`Permissions accordées : ${role.label}`} className="space-y-1">
                                    {role.permissions.map((permission) => (
                                        <li key={permission.key} className="flex items-start gap-2 text-xs text-ink">
                                            <Check aria-hidden="true" className="mt-px size-3.5 shrink-0 text-ok" />
                                            {permission.label}
                                        </li>
                                    ))}
                                </ul>

                                {notGranted.length > 0 && (
                                    <details className="mt-2.5 text-xs">
                                        <summary className="cursor-pointer font-semibold text-ink-3 hover:text-or-brun">
                                            Non accordées ({notGranted.length})
                                        </summary>
                                        <ul className="mt-1.5 space-y-1">
                                            {notGranted.map((permission) => (
                                                <li key={permission.key} className="flex items-start gap-2 text-ink-3">
                                                    <X aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                                                    {permission.label}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
