import { Briefcase, Pencil, Power, PowerOff, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { apiErrorMessage } from '@/api/client';
import type { Department } from '@/api/departments';
import { FormAlert } from '@/components/form/FormAlert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useDepartment } from '@/features/departments/useDepartmentsModule';
import { formatDateTime, initials } from '@/lib/format';

type DepartmentDetailsDialogProps = {
    departmentId: number | null;
    canManage: boolean;
    canManageUsers: boolean;
    onClose: () => void;
    onEdit: (department: Department) => void;
    onToggleActive: (department: Department) => void;
    toggling: boolean;
};

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="border-b border-line-soft py-2">
            <dt className="text-[10.5px] font-bold tracking-[1px] text-ink-3 uppercase">{label}</dt>
            <dd className="mt-0.5 text-[13px] font-semibold break-words text-ebene">{children}</dd>
        </div>
    );
}

/** Détail d'un département : informations, responsable et collaborateurs (consultation seule, D5). */
export function DepartmentDetailsDialog({ departmentId, canManage, canManageUsers, onClose, onEdit, onToggleActive, toggling }: DepartmentDetailsDialogProps) {
    const { data: department, isPending, isError, error } = useDepartment(departmentId);
    const members = department?.members ?? [];

    return (
        <Modal
            open={departmentId !== null}
            onClose={onClose}
            icon={Briefcase}
            tone="gold"
            size="lg"
            title={department ? department.name : 'Département'}
            subtitle={department ? `Département ${department.code}` : undefined}
            footer={
                canManage && department ? (
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => onToggleActive(department)}
                            loading={toggling}
                            icon={department.is_active ? <PowerOff aria-hidden="true" className="size-4" /> : <Power aria-hidden="true" className="size-4" />}
                        >
                            {department.is_active ? 'Désactiver' : 'Réactiver'}
                        </Button>
                        <Button onClick={() => onEdit(department)} icon={<Pencil aria-hidden="true" className="size-4" />}>
                            Modifier
                        </Button>
                    </>
                ) : undefined
            }
        >
            {isPending && (
                <p className="text-sm text-ink-3" role="status">
                    Chargement du département
                </p>
            )}
            {isError && <FormAlert tone="error">{apiErrorMessage(error)}</FormAlert>}

            {department && (
                <>
                    <dl className="grid gap-x-[18px] sm:grid-cols-2">
                        <Row label="Responsable">{department.manager?.name ?? 'Aucun responsable désigné'}</Row>
                        <Row label="État">{department.is_active ? <Badge tone="green">Actif</Badge> : <Badge tone="grey">Désactivé</Badge>}</Row>
                        <Row label="Collaborateurs actifs">{department.active_members_count}</Row>
                        <Row label="Création">
                            {department.created_at ? `Le ${formatDateTime(department.created_at)}` : 'Date inconnue'}
                            <span className="block text-xs font-normal text-ink-2">
                                {department.created_by
                                    ? `Par ${department.created_by.name}`
                                    : "Hors de l'interface (installation ou ligne de commande)"}
                            </span>
                        </Row>
                    </dl>

                    <h3 className="mt-5 mb-2 flex items-center gap-2 text-[11px] font-extrabold tracking-[1px] text-ebene uppercase">
                        <Users aria-hidden="true" className="size-[13px] text-or-brun" />
                        Collaborateurs rattachés
                    </h3>

                    {members.length === 0 ? (
                        <p className="text-[12.5px] text-ink-2">Aucun compte n'est rattaché à ce département.</p>
                    ) : (
                        <ul aria-label="Collaborateurs rattachés" className="divide-y divide-line-soft rounded-[10px] border border-line-soft">
                            {members.map((member) => (
                                <li key={member.id} className="flex flex-wrap items-center gap-2.5 px-3 py-2">
                                    <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-contour bg-sable text-[11px] font-bold text-or-brun">
                                        {initials(member.name)}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[13px] font-semibold text-ebene">{member.name}</span>
                                        <span className="block text-[11.5px] text-ink-3">{member.role?.label ?? 'Aucun rôle'}</span>
                                    </span>
                                    <span className="flex flex-wrap gap-1.5">
                                        {member.is_manager && <Badge tone="gold">Responsable</Badge>}
                                        {member.is_active ? <Badge tone="green">Actif</Badge> : <Badge tone="grey">Désactivé</Badge>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <p className="mt-3 text-[12px] text-ink-3">
                        Le rattachement des collaborateurs à un département se fait dans la fiche de chaque compte
                        {canManageUsers ? (
                            <>
                                {' '}
                                (
                                <Link to="/administration/utilisateurs" className="font-semibold text-or-brun underline-offset-2 hover:underline">
                                    Utilisateurs et rôles
                                </Link>
                                ).
                            </>
                        ) : (
                            ', par le Super Administrateur.'
                        )}
                    </p>
                </>
            )}
        </Modal>
    );
}
