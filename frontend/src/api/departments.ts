import { api } from '@/api/client';
import type { CurrentUser } from '@/api/auth';

/*
| Module Départements (lot 1.3), routes /api/v1/departments.
| Le serveur décide de tout : qui voit quoi (D1), qui modifie (D2), éligibilité du responsable (D4)…
*/

export type DepartmentMember = {
    id: number;
    name: string;
    role: { key: string; label: string } | null;
    is_active: boolean;
    is_manager: boolean;
};

export type Department = {
    id: number;
    code: string;
    name: string;
    is_active: boolean;
    manager: { id: number; name: string } | null;
    active_members_count: number;
    created_at: string | null;
    /** Présents uniquement dans le détail d'un département. */
    created_by?: { id: number; name: string } | null;
    members?: DepartmentMember[];
};

export type DepartmentCreatePayload = { code: string; name: string };

export type DepartmentUpdatePayload = { name?: string; manager_id?: number | null };

/** Rôle exigé pour être responsable de département (décision D4). */
export const DEPARTMENT_MANAGER_ROLE = 'resp_dept';

const CABINET_WIDE_ROLES = ['super_admin', 'directeur', 'resp_ged'];

/**
 * Affichage du menu et de l'écran uniquement : le serveur applique la même règle (D1)
 * et refuse toute requête non autorisée.
 */
export function canViewDepartments(user: CurrentUser | null | undefined): boolean {
    if (!user) return false;
    const role = user.role?.key ?? '';

    return user.permissions.includes('departments.manage') || CABINET_WIDE_ROLES.includes(role) || role === DEPARTMENT_MANAGER_ROLE;
}

export async function listDepartmentsOverview(): Promise<Department[]> {
    const { data } = await api.get<{ data: Department[] }>('/departments');

    return data.data;
}

export async function getDepartment(id: number): Promise<Department> {
    const { data } = await api.get<{ data: Department }>(`/departments/${id}`);

    return data.data;
}

export async function createDepartment(payload: DepartmentCreatePayload): Promise<Department> {
    const { data } = await api.post<{ data: Department }>('/departments', payload);

    return data.data;
}

export async function updateDepartment(id: number, payload: DepartmentUpdatePayload): Promise<Department> {
    const { data } = await api.patch<{ data: Department }>(`/departments/${id}`, payload);

    return data.data;
}

export async function setDepartmentActive(id: number, active: boolean): Promise<Department> {
    const { data } = await api.post<{ data: Department }>(`/departments/${id}/${active ? 'activate' : 'deactivate'}`);

    return data.data;
}
