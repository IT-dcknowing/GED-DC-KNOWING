import { api } from '@/api/client';

export type FolderBreadcrumb = {
    id: number;
    name: string;
    path: string;
    depth: number;
};

export type FolderItem = {
    id: number;
    parent_id: number | null;
    client_id: number | null;
    client?: { id: number; code: string; name: string } | null;
    name: string;
    slug: string;
    description: string | null;
    path: string;
    depth: number;
    sort_order: number;
    nature: string;
    nature_label: string;
    is_locked: boolean;
    is_restricted: boolean;
    is_readonly: boolean;
    can_upload: boolean;
    can_have_custom_subfolders: boolean;
    can_rename: boolean;
    can_delete: boolean;
    breadcrumbs: FolderBreadcrumb[];
    children_count?: number;
    children?: FolderItem[];
    created_by?: string | null;
    created_at: string | null;
    updated_at: string | null;
};

export type CreateFolderPayload = {
    parent_id: number;
    name: string;
    description?: string;
};

export type UpdateFolderPayload = {
    name: string;
    description?: string;
};

export async function fetchFolderTree(clientId?: number): Promise<FolderItem[]> {
    const params = clientId ? { client_id: clientId } : undefined;
    const { data } = await api.get<{ data: FolderItem[] }>('/folders/tree', { params });
    return data.data;
}

export async function fetchFolders(parentId?: number | null, clientId?: number): Promise<FolderItem[]> {
    const params: Record<string, any> = {};
    if (parentId !== undefined && parentId !== null) {
        params.parent_id = parentId;
    }
    if (clientId !== undefined && clientId !== null) {
        params.client_id = clientId;
    }

    const { data } = await api.get<{ data: FolderItem[] }>('/folders', { params });
    return data.data;
}

export async function fetchFolderDetails(id: number): Promise<FolderItem> {
    const { data } = await api.get<{ data: FolderItem }>(`/folders/${id}`);
    return data.data;
}

export async function createFolder(payload: CreateFolderPayload): Promise<FolderItem> {
    const { data } = await api.post<{ data: FolderItem }>('/folders', payload);
    return data.data;
}

export async function updateFolder(id: number, payload: UpdateFolderPayload): Promise<FolderItem> {
    const { data } = await api.patch<{ data: FolderItem }>(`/folders/${id}`, payload);
    return data.data;
}

export async function deleteFolder(id: number): Promise<void> {
    await api.delete(`/folders/${id}`);
}
