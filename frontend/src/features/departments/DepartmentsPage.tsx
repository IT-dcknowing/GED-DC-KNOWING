import { Briefcase, Plus } from 'lucide-react';
import { useState } from 'react';

import { apiErrorMessage } from '@/api/client';
import type { Department } from '@/api/departments';
import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { hasPermission, useCurrentUser } from '@/features/auth/useAuth';
import { DepartmentCards } from '@/features/departments/DepartmentCards';
import { DepartmentDetailsDialog } from '@/features/departments/DepartmentDetailsDialog';
import { DepartmentFormDialog } from '@/features/departments/DepartmentFormDialog';
import { useDepartmentsOverview, useSetDepartmentActive } from '@/features/departments/useDepartmentsModule';

/** Module « Départements » (maquette : vDepartments, lot 1.3). */
export function DepartmentsPage() {
    const toast = useToast();
    const { data: me } = useCurrentUser();
    const canManage = hasPermission(me, 'departments.manage');
    const canManageUsers = hasPermission(me, 'users.manage');

    const departments = useDepartmentsOverview();
    const setActive = useSetDepartmentActive();

    // Fenêtres : undefined = fermée.
    const [detailsId, setDetailsId] = useState<number | null>(null);
    const [formDepartment, setFormDepartment] = useState<Department | null | undefined>(undefined);
    const [toDeactivate, setToDeactivate] = useState<Department | null>(null);

    const toggleActive = (department: Department) => {
        if (department.is_active) {
            setToDeactivate(department);
            return;
        }
        setActive.mutate(
            { id: department.id, active: true },
            {
                onSuccess: () => toast({ tone: 'success', title: 'Département réactivé', message: department.name }),
                onError: (error) => toast({ tone: 'error', title: 'Réactivation impossible', message: apiErrorMessage(error) }),
            },
        );
    };

    const confirmDeactivate = () => {
        if (!toDeactivate) return;
        const department = toDeactivate;
        setActive.mutate(
            { id: department.id, active: false },
            {
                onSuccess: () => toast({ tone: 'success', title: 'Département désactivé', message: department.name }),
                // D6 : le serveur refuse tant que des comptes actifs sont rattachés ; son message l'explique.
                onError: (error) => toast({ tone: 'error', title: 'Désactivation impossible', message: apiErrorMessage(error) }),
                onSettled: () => setToDeactivate(null),
            },
        );
    };

    const list = departments.data ?? [];

    return (
        <div>
            <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-[-0.2px]">Départements</h1>
                    <p className="mt-[3px] max-w-[640px] text-[13px] text-ink-2">
                        Départements du cabinet, leur responsable et leurs collaborateurs (RG-01).
                    </p>
                </div>
                {canManage && (
                    <Button onClick={() => setFormDepartment(null)} icon={<Plus aria-hidden="true" className="size-[15px]" />}>
                        Nouveau département
                    </Button>
                )}
            </div>

            {departments.isError && (
                <div>
                    <FormAlert tone="error">{apiErrorMessage(departments.error)}</FormAlert>
                    <Button variant="secondary" onClick={() => void departments.refetch()}>
                        Réessayer
                    </Button>
                </div>
            )}

            {departments.isPending && (
                <p className="px-4 py-10 text-center text-sm text-ink-3" role="status">
                    Chargement des départements
                </p>
            )}

            {departments.data && list.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-line-soft bg-white px-6 py-12 text-center">
                    <span className="mb-2 flex size-16 items-center justify-center rounded-[18px] border border-dashed border-contour bg-linear-135 from-sable to-naturel text-or">
                        <Briefcase aria-hidden="true" className="size-7" />
                    </span>
                    <h2 className="text-[15px] font-bold">Aucun département</h2>
                    <p className="max-w-[420px] text-[12.5px] text-ink-2">
                        {canManage
                            ? 'Aucun département n’a encore été créé. Créez-les avec leurs intitulés définitifs.'
                            : 'Vous n’êtes rattaché à aucun département pour le moment.'}
                    </p>
                </div>
            )}

            {list.length > 0 && <DepartmentCards departments={list} onOpen={(department) => setDetailsId(department.id)} />}

            <DepartmentDetailsDialog
                departmentId={detailsId}
                canManage={canManage}
                canManageUsers={canManageUsers}
                onClose={() => setDetailsId(null)}
                onEdit={(department) => {
                    setDetailsId(null);
                    setFormDepartment(department);
                }}
                onToggleActive={toggleActive}
                toggling={setActive.isPending}
            />

            <DepartmentFormDialog
                department={formDepartment}
                onClose={() => setFormDepartment(undefined)}
                onSaved={(department, created) => {
                    setFormDepartment(undefined);
                    toast({
                        tone: 'success',
                        title: created ? 'Département créé' : 'Département modifié',
                        message: department.name,
                    });
                }}
            />

            <ConfirmDialog
                open={toDeactivate !== null}
                danger
                title="Désactiver ce département ?"
                subtitle={toDeactivate ? `${toDeactivate.name} · ${toDeactivate.code}` : undefined}
                confirmLabel="Désactiver"
                loading={setActive.isPending}
                onConfirm={confirmDeactivate}
                onCancel={() => setToDeactivate(null)}
            >
                Aucun compte ne pourra plus y être rattaché. La désactivation n'est possible que si aucun compte actif n'y est encore
                rattaché. Le département et son historique sont conservés : vous pourrez le réactiver à tout moment.
            </ConfirmDialog>
        </div>
    );
}
