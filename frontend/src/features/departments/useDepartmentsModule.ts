import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    createDepartment,
    getDepartment,
    listDepartmentsOverview,
    setDepartmentActive,
    updateDepartment,
    type DepartmentCreatePayload,
    type DepartmentUpdatePayload,
} from '@/api/departments';

const KEYS = {
    all: ['departments'] as const,
    detail: (id: number) => ['departments', 'detail', id] as const,
};

export function useDepartmentsOverview() {
    return useQuery({ queryKey: [...KEYS.all, 'list'], queryFn: listDepartmentsOverview });
}

export function useDepartment(id: number | null) {
    return useQuery({
        queryKey: KEYS.detail(id ?? 0),
        queryFn: () => getDepartment(id as number),
        enabled: id !== null,
    });
}

/**
 * Après chaque action : la liste et les détails des départements sont rechargés, ainsi que les données
 * du module « Utilisateurs et rôles » (liste des départements actifs du formulaire des comptes).
 */
function useInvalidate() {
    const queryClient = useQueryClient();

    return () => Promise.all([
        queryClient.invalidateQueries({ queryKey: KEYS.all }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    ]);
}

export function useCreateDepartment() {
    const invalidate = useInvalidate();

    return useMutation({ mutationFn: (payload: DepartmentCreatePayload) => createDepartment(payload), onSuccess: invalidate });
}

export function useUpdateDepartment() {
    const invalidate = useInvalidate();

    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: DepartmentUpdatePayload }) => updateDepartment(id, payload),
        onSuccess: invalidate,
    });
}

export function useSetDepartmentActive() {
    const invalidate = useInvalidate();

    return useMutation({
        mutationFn: ({ id, active }: { id: number; active: boolean }) => setDepartmentActive(id, active),
        onSuccess: invalidate,
    });
}
