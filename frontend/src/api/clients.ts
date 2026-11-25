import { api } from '@/api/client';
import type { CurrentUser } from '@/api/auth';

/*
| Module Clients (lot 2.1), routes /api/v1/clients.
| Le serveur décide de la visibilité (C3) et de la génération du code (C2).
*/

export type ClientDepartment = { id: number; code: string; name: string };

export type Client = {
    id: number;
    code: string;
    name: string;
    legal_form: string | null;
    sector: string | null;
    tax_regime: string | null;
    rccm: string | null;
    dfe: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    contact_name: string | null;
    started_on: string | null;
    is_active: boolean;
    radiated_at: string | null;
    departments?: ClientDepartment[];
    created_at: string | null;
    created_by?: { id: number; name: string } | null;
    documents_count: number | null;
    last_activity_at: string | null;
};

export type ClientMeta = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type ClientListResponse = {
    data: Client[];
    meta: ClientMeta;
    departments: ClientDepartment[];
};

export type ClientFilters = { search?: string; department?: string; page?: number };

export type ClientPayload = {
    name: string;
    legal_form?: string | null;
    sector?: string | null;
    tax_regime?: string | null;
    rccm?: string | null;
    dfe?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    contact_name?: string | null;
    started_on?: string | null;
    department_ids: number[];
};

/** Règle d'affichage : le serveur applique la même permission (clients.manage). */
export function canManageClients(user: CurrentUser | null | undefined): boolean {
    return user?.permissions.includes('clients.manage') ?? false;
}

export const LEGAL_FORMS = ['SARL', 'SA', 'SAS', 'GIE'] as const;
export const TAX_REGIMES = ['Réel normal', 'Réel simplifié'] as const;

export async function listClients(filters: ClientFilters): Promise<ClientListResponse> {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined));
    const { data } = await api.get<ClientListResponse>('/clients', { params });

    return data;
}

export async function getClient(id: number): Promise<Client> {
    const { data } = await api.get<{ data: Client }>(`/clients/${id}`);

    return data.data;
}

export async function createClient(payload: ClientPayload): Promise<Client> {
    const { data } = await api.post<{ data: Client }>('/clients', payload);

    return data.data;
}

export async function updateClient(id: number, payload: Partial<ClientPayload>): Promise<Client> {
    const { data } = await api.patch<{ data: Client }>(`/clients/${id}`, payload);

    return data.data;
}
