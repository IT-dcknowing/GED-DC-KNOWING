import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    createUser,
    getUser,
    listDepartments,
    listRoles,
    listUsers,
    resetUserPassword,
    setUserActive,
    unlockUser,
    updateUser,
    type UserFilters,
    type UserPayload,
} from '@/api/admin';

const KEYS = {
    users: ['admin', 'users'] as const,
    user: (id: number) => ['admin', 'users', 'detail', id] as const,
    roles: ['admin', 'roles'] as const,
    departments: ['admin', 'departments'] as const,
};

export function useUsers(filters: UserFilters) {
    return useQuery({
        queryKey: [...KEYS.users, 'list', filters],
        queryFn: () => listUsers(filters),
        placeholderData: keepPreviousData,
    });
}

export function useUser(id: number | null) {
    return useQuery({
        queryKey: KEYS.user(id ?? 0),
        queryFn: () => getUser(id as number),
        enabled: id !== null,
    });
}

export function useRoles() {
    return useQuery({ queryKey: KEYS.roles, queryFn: listRoles, staleTime: 5 * 60 * 1000 });
}

export function useDepartments() {
    return useQuery({ queryKey: KEYS.departments, queryFn: listDepartments, staleTime: 5 * 60 * 1000 });
}

/** Après chaque action : la liste, les fiches et le nombre de comptes par rôle sont rechargés. */
function useInvalidate() {
    const queryClient = useQueryClient();

    return () => Promise.all([
        queryClient.invalidateQueries({ queryKey: KEYS.users }),
        queryClient.invalidateQueries({ queryKey: KEYS.roles }),
    ]);
}

export function useCreateUser() {
    const invalidate = useInvalidate();

    return useMutation({ mutationFn: createUser, onSuccess: invalidate });
}

export function useUpdateUser() {
    const invalidate = useInvalidate();

    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<UserPayload> }) => updateUser(id, payload),
        onSuccess: invalidate,
    });
}

export function useSetUserActive() {
    const invalidate = useInvalidate();

    return useMutation({
        mutationFn: ({ id, active }: { id: number; active: boolean }) => setUserActive(id, active),
        onSuccess: invalidate,
    });
}

export function useResetUserPassword() {
    const invalidate = useInvalidate();

    return useMutation({ mutationFn: resetUserPassword, onSuccess: invalidate });
}

export function useUnlockUser() {
    const invalidate = useInvalidate();

    return useMutation({ mutationFn: unlockUser, onSuccess: invalidate });
}
