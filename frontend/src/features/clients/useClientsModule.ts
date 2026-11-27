import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    createClient,
    getClient,
    listClients,
    updateClient,
    type ClientFilters,
    type ClientPayload,
} from '@/api/clients';

const KEYS = {
    all: ['clients'] as const,
    list: (filters: ClientFilters) => ['clients', 'list', filters] as const,
    detail: (id: number) => ['clients', 'detail', id] as const,
};

export function useClients(filters: ClientFilters) {
    return useQuery({ queryKey: KEYS.list(filters), queryFn: () => listClients(filters) });
}

export function useClient(id: number | null) {
    return useQuery({
        queryKey: KEYS.detail(id ?? 0),
        queryFn: () => getClient(id as number),
        enabled: id !== null,
    });
}

function useInvalidate() {
    const queryClient = useQueryClient();

    return () => queryClient.invalidateQueries({ queryKey: KEYS.all });
}

export function useCreateClient() {
    const invalidate = useInvalidate();

    return useMutation({ mutationFn: (payload: ClientPayload) => createClient(payload), onSuccess: invalidate });
}

export function useUpdateClient() {
    const invalidate = useInvalidate();

    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<ClientPayload> }) => updateClient(id, payload),
        onSuccess: invalidate,
    });
}
