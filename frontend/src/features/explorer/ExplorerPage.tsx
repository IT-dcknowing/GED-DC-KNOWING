import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import {
    deleteDocument,
    downloadDocument,
    fetchDocuments,
    type DocumentItem,
} from '@/api/documents';
import {
    createFolder,
    deleteFolder,
    fetchFolderDetails,
    fetchFolders,
    fetchFolderTree,
    updateFolder,
    type FolderBreadcrumb,
    type FolderItem,
} from '@/api/folders';
import { useToast } from '@/components/ui/Toast';
import { ClientSpaceSidebar } from './ClientSpaceSidebar';
import { FolderContentPane } from './FolderContentPane';
import { FolderDetailsPane } from './FolderDetailsPane';
import { FolderTreePane } from './FolderTreePane';
import { NewFolderDialog } from './NewFolderDialog';
import { PreviewUploadNamingDialog } from './PreviewUploadNamingDialog';
import { RenameFolderDialog } from './RenameFolderDialog';

export function ExplorerPage() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const folderParam = searchParams.get('folder');
    const clientParam = searchParams.get('client_id');

    const [activeFolderId, setActiveFolderId] = useState<number | null>(
        folderParam ? Number(folderParam) : null
    );
    const [selectedSpaceKey, setSelectedSpaceKey] = useState<string>('cabinet');
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Dialogues
    const [newFolderParent, setNewFolderParent] = useState<FolderItem | null>(null);
    const [uploadPreviewState, setUploadPreviewState] = useState<{ open: boolean; file: File | null }>({
        open: false,
        file: null,
    });
    const [renameFolderTarget, setRenameFolderTarget] = useState<FolderItem | null>(null);

    // 1. Arbre global
    const treeQuery = useQuery({
        queryKey: ['folders', 'tree'],
        queryFn: () => fetchFolderTree(),
    });

    // Extraire 01_CLIENTS (clients + modèle) et les autres espaces (Gestion interne)
    const { clientFolders, modelFolder, cabinetSpaces } = useMemo(() => {
        const roots = treeQuery.data || [];
        const clientsRoot = roots.find((r) => r.slug === '01-clients' || r.name === '01_CLIENTS');
        const children = clientsRoot?.children || [];

        const model = children.find((c) => c.nature === 'model' || c.name === '_MODELE_DOSSIER_CLIENT') || null;
        const clients = children.filter((c) => c.nature === 'client_root' && c.id !== model?.id);
        const cabinet = roots.filter((r) => r.id !== clientsRoot?.id);

        return { clientFolders: clients, modelFolder: model, cabinetSpaces: cabinet };
    }, [treeQuery.data]);

    // 2. Détails du dossier actif
    const folderDetailsQuery = useQuery({
        queryKey: ['folders', 'details', activeFolderId],
        queryFn: () => (activeFolderId ? fetchFolderDetails(activeFolderId) : null),
        enabled: activeFolderId !== null,
    });

    // 3. Sous-dossiers de l'emplacement courant
    const subfoldersQuery = useQuery({
        queryKey: ['folders', 'children', activeFolderId],
        queryFn: () => fetchFolders(activeFolderId),
        enabled: activeFolderId !== null,
    });

    // 4. Documents de l'emplacement courant
    const documentsQuery = useQuery({
        queryKey: ['documents', activeFolderId],
        queryFn: () => fetchDocuments(activeFolderId!),
        enabled: activeFolderId !== null,
    });

    // Initialisation automatique depuis URL (?client_id=... ou ?folder=...) ou par défaut
    useEffect(() => {
        if (!treeQuery.data || treeQuery.data.length === 0) return;

        if (clientParam) {
            const targetClient = clientFolders.find((c) => c.client_id === Number(clientParam));
            if (targetClient) {
                setSelectedSpaceKey(`client-${targetClient.id}`);
                setActiveFolderId(targetClient.id);
                setSearchParams({ folder: String(targetClient.id) }, { replace: true });
                return;
            }
        }

        if (!activeFolderId) {
            const firstClient = clientFolders[0];
            const firstCabinet = cabinetSpaces[0];
            if (firstClient) {
                setSelectedSpaceKey(`client-${firstClient.id}`);
                setActiveFolderId(firstClient.id);
                setSearchParams({ folder: String(firstClient.id) }, { replace: true });
            } else if (firstCabinet) {
                setSelectedSpaceKey('cabinet');
                setActiveFolderId(firstCabinet.id);
                setSearchParams({ folder: String(firstCabinet.id) }, { replace: true });
            }
        }
    }, [treeQuery.data, clientFolders, cabinetSpaces, clientParam, activeFolderId, setSearchParams]);

    // Déterminer l'arbre à afficher dans la Colonne 2 selon l'espace sélectionné
    const activeClientFolder = useMemo(() => {
        if (selectedSpaceKey.startsWith('client-')) {
            const id = Number(selectedSpaceKey.replace('client-', ''));
            return clientFolders.find((c) => c.id === id) || null;
        }
        return null;
    }, [selectedSpaceKey, clientFolders]);

    const treePaneData = useMemo(() => {
        if (selectedSpaceKey === 'model' && modelFolder) {
            return {
                title: 'Modèle Dossier Client',
                subtitle: '_MODELE_DOSSIER_CLIENT · Lecture seule',
                folders: modelFolder.children || [],
            };
        }
        if (activeClientFolder) {
            return {
                title: activeClientFolder.client?.name || activeClientFolder.name,
                subtitle: `${activeClientFolder.client?.code || 'CLIENT'} · Dossier client`,
                folders: activeClientFolder.children || [],
            };
        }
        return {
            title: 'Espace Cabinet',
            subtitle: 'Gestion interne du cabinet',
            folders: cabinetSpaces,
        };
    }, [selectedSpaceKey, modelFolder, activeClientFolder, cabinetSpaces]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: { parentId: number; name: string; description?: string }) => {
            return createFolder({ parent_id: data.parentId, name: data.name, description: data.description });
        },
        onSuccess: (newFolder) => {
            toast({ tone: 'success', title: 'Dossier créé', message: `Le dossier "${newFolder.name}" a été créé.` });
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        },
        onError: (err: any) => {
            toast({
                tone: 'error',
                title: 'Erreur',
                message: err?.response?.data?.message || 'Erreur lors de la création du sous-dossier.',
            });
        },
    });

    const renameMutation = useMutation({
        mutationFn: ({ id, name }: { id: number; name: string }) => updateFolder(id, { name }),
        onSuccess: (updated) => {
            toast({ tone: 'success', title: 'Dossier renommé', message: `Dossier renommé en "${updated.name}".` });
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        },
        onError: (err: any) => {
            toast({
                tone: 'error',
                title: 'Erreur',
                message: err?.response?.data?.message || 'Erreur lors du renommage.',
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteFolder(id),
        onSuccess: () => {
            toast({ tone: 'success', title: 'Dossier supprimé', message: 'Le sous-dossier a été supprimé.' });
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        },
        onError: (err: any) => {
            toast({
                tone: 'error',
                title: 'Erreur',
                message: err?.response?.data?.message || 'Erreur lors de la suppression.',
            });
        },
    });

    const deleteDocumentMutation = useMutation({
        mutationFn: (doc: DocumentItem) => deleteDocument(doc.id),
        onSuccess: () => {
            toast({ tone: 'success', title: 'Document supprimé', message: 'Le document a été supprimé.' });
            queryClient.invalidateQueries({ queryKey: ['documents', activeFolderId] });
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        },
        onError: (err: any) => {
            toast({
                tone: 'error',
                title: 'Erreur',
                message: err?.response?.data?.message || 'Erreur lors de la suppression du document.',
            });
        },
    });

    const handleDownloadDocument = async (doc: DocumentItem) => {
        try {
            await downloadDocument(doc);
        } catch (err: any) {
            toast({
                tone: 'error',
                title: 'Erreur de téléchargement',
                message: err?.response?.data?.message || 'Impossible de télécharger ce document.',
            });
        }
    };

    const handleDeleteDocument = (doc: DocumentItem) => {
        if (confirm(`Êtes-vous sûr de vouloir supprimer le document "${doc.normalized_name}" ?`)) {
            deleteDocumentMutation.mutate(doc);
        }
    };

    const handleSelectFolder = (folder: FolderItem) => {
        setActiveFolderId(folder.id);
        setSearchParams({ folder: String(folder.id) });
    };

    const handleSelectClient = (clientFolder: FolderItem) => {
        setSelectedSpaceKey(`client-${clientFolder.id}`);
        handleSelectFolder(clientFolder);
    };

    const handleSelectCabinet = () => {
        setSelectedSpaceKey('cabinet');
        const firstCabinet = cabinetSpaces[0];
        if (firstCabinet) {
            handleSelectFolder(firstCabinet);
        }
    };

    const handleCreateInClient = (clientFolder: FolderItem) => {
        setSelectedSpaceKey(`client-${clientFolder.id}`);
        handleSelectFolder(clientFolder);
        setNewFolderParent(clientFolder);
    };

    const handleCreateInCabinet = () => {
        setSelectedSpaceKey('cabinet');
        const target =
            (selectedSpaceKey === 'cabinet' && currentFolder?.can_have_custom_subfolders ? currentFolder : null) ||
            cabinetSpaces.find((s) => s.can_have_custom_subfolders) ||
            cabinetSpaces[0];
        if (target) {
            handleSelectFolder(target);
            setNewFolderParent(target);
        }
    };

    const handleSelectModel = (model: FolderItem) => {
        setSelectedSpaceKey('model');
        handleSelectFolder(model);
    };

    const handleNavigateBreadcrumb = (crumb: FolderBreadcrumb) => {
        if (crumb.id === 0) {
            const firstCabinet = cabinetSpaces[0];
            if (activeClientFolder) handleSelectFolder(activeClientFolder);
            else if (selectedSpaceKey === 'model' && modelFolder) handleSelectFolder(modelFolder);
            else if (firstCabinet) handleSelectFolder(firstCabinet);
        } else {
            setActiveFolderId(crumb.id);
            setSearchParams({ folder: String(crumb.id) });
        }
    };

    const handleDelete = (folder: FolderItem) => {
        if (confirm(`Êtes-vous sûr de vouloir supprimer le sous-dossier "${folder.name}" ?`)) {
            deleteMutation.mutate(folder.id);
        }
    };

    const currentFolder = folderDetailsQuery.data || null;
    // Filtrer le fil d'Ariane pour ne pas répéter "01_CLIENTS" si on est dans un espace client
    const rawBreadcrumbs = currentFolder?.breadcrumbs || [];
    const breadcrumbs = activeClientFolder
        ? rawBreadcrumbs.filter((b) => b.name !== '01_CLIENTS' && b.id !== activeClientFolder.id)
        : rawBreadcrumbs;
    const subfolders = subfoldersQuery.data || [];

    if (treeQuery.isLoading && !treeQuery.data) {
        return (
            <div className="flex h-[75vh] items-center justify-center">
                <div className="flex items-center gap-3 text-or-brun">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm font-semibold">Chargement de l'Explorateur...</span>
                </div>
            </div>
        );
    }

    if (treeQuery.isError) {
        return (
            <div className="rounded-xl border border-danger/30 bg-danger-bg p-6 text-center text-danger">
                <AlertCircle className="mx-auto h-8 w-8 text-danger mb-2" />
                <h3 className="font-bold text-sm">Impossible de charger l'Explorateur de dossiers</h3>
                <p className="text-xs text-danger/80 mt-1">Vérifiez vos permissions d'accès au cabinet.</p>
                <button
                    type="button"
                    onClick={() => treeQuery.refetch()}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-or px-4 py-2 text-xs font-bold text-ebene hover:bg-[#b8921f]"
                >
                    <RefreshCw className="h-4 w-4" /> Réessayer
                </button>
            </div>
        );
    }

    return (
        <div className="-mx-4 -my-6 sm:-mx-6 h-[calc(100vh-64px)] flex overflow-hidden border-t border-line bg-white">
            {/* Colonne 1 : Sélecteur d'Espaces / Clients (245px) */}
            <ClientSpaceSidebar
                clientFolders={clientFolders}
                modelFolder={modelFolder}
                cabinetSpaces={cabinetSpaces}
                selectedSpaceKey={selectedSpaceKey}
                onSelectClient={handleSelectClient}
                onSelectCabinet={handleSelectCabinet}
                onSelectModel={handleSelectModel}
                onCreateInClient={handleCreateInClient}
                onCreateInCabinet={handleCreateInCabinet}
            />

            {/* Colonne 2 : Arborescence du Client ou de l'Espace Cabinet (290px) */}
            <FolderTreePane
                title={treePaneData.title}
                subtitle={treePaneData.subtitle}
                folders={treePaneData.folders}
                activeFolderId={activeFolderId}
                onSelectFolder={handleSelectFolder}
            />

            {/* Colonne 3 : Zone principale (Contenu + Cartes + Dropzone) */}
            <FolderContentPane
                spaceTitle={treePaneData.title}
                currentFolder={currentFolder}
                subfolders={subfolders}
                documents={documentsQuery.data || []}
                isDocumentsLoading={documentsQuery.isLoading}
                breadcrumbs={breadcrumbs}
                onSelectFolder={handleSelectFolder}
                onNavigateBreadcrumb={handleNavigateBreadcrumb}
                onOpenNewFolder={() => currentFolder && setNewFolderParent(currentFolder)}
                onOpenUploadPreview={(file) => setUploadPreviewState({ open: true, file: file || null })}
                onOpenRename={(f) => setRenameFolderTarget(f)}
                onDeleteFolder={handleDelete}
                onDownloadDocument={handleDownloadDocument}
                onDeleteDocument={handleDeleteDocument}
                onToggleDetails={() => setIsDetailsOpen(!isDetailsOpen)}
                isDetailsOpen={isDetailsOpen}
            />

            {/* Colonne 4 optionnelle : Détails du dossier (masquée par défaut comme sur la maquette, ouvrable au clic) */}
            <FolderDetailsPane
                folder={currentFolder}
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
            />

            {/* Dialogues */}
            {newFolderParent && (
                <NewFolderDialog
                    parentFolder={newFolderParent}
                    isOpen={Boolean(newFolderParent)}
                    onClose={() => setNewFolderParent(null)}
                    onSubmit={async (name, desc) => {
                        await createMutation.mutateAsync({ parentId: newFolderParent.id, name, description: desc });
                    }}
                />
            )}

            {currentFolder && uploadPreviewState.open && (
                <PreviewUploadNamingDialog
                    folder={currentFolder}
                    isOpen={uploadPreviewState.open}
                    initialFile={uploadPreviewState.file}
                    onClose={() => setUploadPreviewState({ open: false, file: null })}
                />
            )}

            {renameFolderTarget && (
                <RenameFolderDialog
                    folder={renameFolderTarget}
                    isOpen={Boolean(renameFolderTarget)}
                    onClose={() => setRenameFolderTarget(null)}
                    onSubmit={async (newName) => {
                        await renameMutation.mutateAsync({ id: renameFolderTarget.id, name: newName });
                    }}
                />
            )}
        </div>
    );
}
