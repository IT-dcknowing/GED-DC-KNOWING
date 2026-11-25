import { api } from '@/api/client';

/*
| Appels aux routes d'administration des comptes déjà existantes (/api/v1/admin/...).
| Aucune règle métier ici : le serveur décide (permissions, protections G1, G2 et A1).
*/

export type Ref = { id: number; name: string };

export type AdminUser = {
    id: number;
    name: string;
    email: string;
    role: { key: string; label: string } | null;
    department: { id: number; code: string; name: string } | null;
    is_active: boolean;
    must_change_password: boolean;
    locked_until: string | null;
    last_login_at: string | null;
    password_changed_at: string | null;
    created_at: string | null;
    created_by: Ref | null;
};

export type Paginated<T> = {
    data: T[];
    meta: { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null };
};

export type PermissionInfo = { key: string; label: string };

export type RoleInfo = {
    key: string;
    label: string;
    description: string;
    users_count: number;
    permissions: PermissionInfo[];
};

export type RolesCatalog = { roles: RoleInfo[]; permissions: PermissionInfo[] };

export type DepartmentRef = { id: number; code: string; name: string };

export type UserFilters = { search?: string; role?: string; status?: '' | 'active' | 'inactive'; page?: number };

export type UserPayload = { name: string; email: string; role: string; department_id: number | null };

export async function listUsers(filters: UserFilters): Promise<Paginated<AdminUser>> {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined));
    const { data } = await api.get<Paginated<AdminUser>>('/admin/users', { params });

    return data;
}

export async function getUser(id: number): Promise<AdminUser> {
    const { data } = await api.get<{ data: AdminUser }>(`/admin/users/${id}`);

    return data.data;
}

/** Le mot de passe temporaire n'est renvoyé qu'une seule fois, ici. */
export async function createUser(payload: UserPayload): Promise<{ user: AdminUser; temporaryPassword: string }> {
    const { data } = await api.post<{ data: AdminUser; temporary_password: string }>('/admin/users', payload);

    return { user: data.data, temporaryPassword: data.temporary_password };
}

export async function updateUser(id: number, payload: Partial<UserPayload>): Promise<AdminUser> {
    const { data } = await api.patch<{ data: AdminUser }>(`/admin/users/${id}`, payload);

    return data.data;
}

export async function setUserActive(id: number, active: boolean): Promise<AdminUser> {
    const { data } = await api.post<{ data: AdminUser }>(`/admin/users/${id}/${active ? 'activate' : 'deactivate'}`);

    return data.data;
}

export async function resetUserPassword(id: number): Promise<string> {
    const { data } = await api.post<{ temporary_password: string }>(`/admin/users/${id}/reset-password`);

    return data.temporary_password;
}

export async function unlockUser(id: number): Promise<string> {
    const { data } = await api.post<{ message: string }>(`/admin/users/${id}/unlock`);

    return data.message;
}

export async function listRoles(): Promise<RolesCatalog> {
    const { data } = await api.get<{ data: RoleInfo[]; meta: { permissions: PermissionInfo[] } }>('/admin/roles');

    return { roles: data.data, permissions: data.meta.permissions };
}

export async function listDepartments(): Promise<DepartmentRef[]> {
    const { data } = await api.get<{ data: DepartmentRef[] }>('/admin/departments');

    return data.data;
}
