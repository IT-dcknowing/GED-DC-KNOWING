import { api } from '@/api/client';

export type DocumentItem = {
    id: number;
    folder_id: number;
    client_id: number | null;
    doc_type: string;
    status_suffix: string;
    subject: string;
    original_name: string;
    normalized_name: string;
    extension: string;
    mime_type: string;
    size_bytes: number;
    uploaded_by: { id: number; name: string } | null;
    can_download: boolean;
    can_delete: boolean;
    created_at: string | null;
    updated_at: string | null;
};

export type UploadDocumentPayload = {
    folder_id: number;
    file: File;
    doc_type: string;
    status_suffix: string;
    subject: string;
};

export async function fetchDocuments(folderId: number): Promise<DocumentItem[]> {
    const { data } = await api.get<{ data: DocumentItem[] }>('/documents', {
        params: { folder_id: folderId },
    });
    return data.data;
}

export async function uploadDocument(payload: UploadDocumentPayload): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('folder_id', String(payload.folder_id));
    formData.append('file', payload.file);
    formData.append('doc_type', payload.doc_type);
    formData.append('status_suffix', payload.status_suffix);
    formData.append('subject', payload.subject);

    const { data } = await api.post<{ data: DocumentItem }>('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
}

export async function downloadDocument(doc: DocumentItem): Promise<void> {
    const response = await api.get<Blob>(`/documents/${doc.id}/download`, {
        responseType: 'blob',
    });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.normalized_name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

export async function deleteDocument(id: number): Promise<void> {
    await api.delete(`/documents/${id}`);
}
