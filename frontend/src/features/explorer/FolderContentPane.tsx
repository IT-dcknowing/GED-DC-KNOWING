import {
    ChevronRight,
    Download,
    Edit3,
    FileText,
    Folder,
    FolderPlus,
    Info,
    Loader2,
    PanelRightOpen,
    Search,
    ShieldAlert,
    Trash2,
    UploadCloud,
} from 'lucide-react';
import { useState } from 'react';
import type { DocumentItem } from '@/api/documents';
import type { FolderBreadcrumb, FolderItem } from '@/api/folders';
import { formatDateTime } from '@/lib/format';

type Props = {
    spaceTitle: string;
    currentFolder: FolderItem | null;
    subfolders: FolderItem[];
    documents: DocumentItem[];
    isDocumentsLoading?: boolean;
    breadcrumbs: FolderBreadcrumb[];
    onSelectFolder: (folder: FolderItem) => void;
    onNavigateBreadcrumb: (item: FolderBreadcrumb) => void;
    onOpenNewFolder: () => void;
    onOpenUploadPreview: (droppedFile?: File | null) => void;
    onOpenRename: (folder: FolderItem) => void;
    onDeleteFolder: (folder: FolderItem) => void;
    onDownloadDocument: (doc: DocumentItem) => void;
    onDeleteDocument: (doc: DocumentItem) => void;
    onToggleDetails: () => void;
    isDetailsOpen: boolean;
};

function formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
    }
    return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export function FolderContentPane({
    spaceTitle,
    currentFolder,
    subfolders,
    documents,
    isDocumentsLoading = false,
    breadcrumbs,
    onSelectFolder,
    onNavigateBreadcrumb,
    onOpenNewFolder,
    onOpenUploadPreview,
    onOpenRename,
    onDeleteFolder,
    onDownloadDocument,
    onDeleteDocument,
    onToggleDetails,
    isDetailsOpen,
}: Props) {
    const [search, setSearch] = useState('');
    const [dragOver, setDragOver] = useState(false);

    const searchLower = search.trim().toLowerCase();
    const filteredSubfolders = subfolders.filter((f) =>
        f.name.toLowerCase().includes(searchLower) ||
        (f.description && f.description.toLowerCase().includes(searchLower))
    );
    const filteredDocuments = documents.filter((d) =>
        d.normalized_name.toLowerCase().includes(searchLower) ||
        d.original_name.toLowerCase().includes(searchLower) ||
        d.subject.toLowerCase().includes(searchLower) ||
        d.doc_type.toLowerCase().includes(searchLower) ||
        d.status_suffix.toLowerCase().includes(searchLower)
    );

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (!currentFolder?.can_upload) {
            return;
        }
        const file = e.dataTransfer.files?.[0] ?? null;
        onOpenUploadPreview(file);
    };

    const isEmptyCustom = currentFolder && !currentFolder.is_locked && subfolders.length === 0 && documents.length === 0;

    return (
        <main className="flex-1 min-w-0 bg-naturel/40 flex flex-col h-full overflow-y-auto px-6 py-4">
            {/* Fil d'Ariane (.crumbs de la maquette) */}
            <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1 text-[12.5px] text-ink-2 mb-1.5">
                <button
                    type="button"
                    onClick={() => onNavigateBreadcrumb({ id: 0, name: spaceTitle, path: '/', depth: 0 })}
                    className="px-1.5 py-0.5 rounded hover:bg-sable hover:text-or-brun transition-colors font-medium"
                >
                    {spaceTitle}
                </button>
                {breadcrumbs.map((crumb, idx) => (
                    <span key={crumb.id} className="flex items-center gap-1">
                        <ChevronRight className="h-3.5 w-3.5 text-contour" />
                        <button
                            type="button"
                            onClick={() => onNavigateBreadcrumb(crumb)}
                            className={`px-1.5 py-0.5 rounded transition-colors ${idx === breadcrumbs.length - 1
                                    ? 'text-ebene font-bold'
                                    : 'hover:bg-sable hover:text-or-brun'
                                }`}
                        >
                            {crumb.name}
                        </button>
                    </span>
                ))}
            </nav>

            {/* Titre principal et boutons d'action (.title-row de la maquette) */}
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <div>
                    <h1 className="font-display text-[21px] font-extrabold tracking-[-0.01em] text-ebene">
                        {currentFolder ? currentFolder.name : spaceTitle}
                    </h1>
                    <div className="text-[13px] text-ink-2 mt-0.5 flex items-center gap-2">
                        <span>{filteredSubfolders.length} sous-dossier(s)</span>
                        <span>·</span>
                        <span>{filteredDocuments.length} document(s)</span>
                        {currentFolder && (
                            <>
                                <span>·</span>
                                <span className="text-or-brun font-medium">{currentFolder.nature_label}</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Recherche locale rapide */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-3" />
                        <input
                            type="text"
                            placeholder="Filtrer ce dossier…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-[34px] w-44 rounded-lg border border-line bg-white pl-8 pr-3 text-[12.5px] text-ink placeholder-ink-3 focus:border-or focus:outline-none"
                        />
                    </div>

                    {isEmptyCustom && currentFolder?.can_delete && (
                        <button
                            type="button"
                            onClick={() => onDeleteFolder(currentFolder)}
                            className="inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-danger/30 bg-white text-danger text-[13px] font-semibold hover:bg-danger-bg transition-colors"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Supprimer
                        </button>
                    )}

                    {currentFolder?.can_rename && (
                        <button
                            type="button"
                            onClick={() => onOpenRename(currentFolder)}
                            className="inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-line bg-white text-ink text-[13px] font-semibold hover:bg-sable hover:border-contour transition-colors"
                        >
                            <Edit3 className="h-3.5 w-3.5 text-or-brun" />
                            Renommer
                        </button>
                    )}

                    {currentFolder?.can_have_custom_subfolders && (
                        <button
                            type="button"
                            onClick={onOpenNewFolder}
                            className="inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-line bg-white text-ink text-[13px] font-semibold hover:bg-sable hover:border-contour transition-colors"
                        >
                            <FolderPlus className="h-4 w-4 text-or-brun" />
                            Nouveau dossier
                        </button>
                    )}

                    {currentFolder?.can_upload && (
                        <button
                            type="button"
                            onClick={() => onOpenUploadPreview(null)}
                            className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-lg bg-or text-ebene text-[13px] font-bold shadow-xs hover:bg-[#b8921f] transition-colors"
                        >
                            <UploadCloud className="h-4 w-4" />
                            Déposer
                        </button>
                    )}

                    {!isDetailsOpen && (
                        <button
                            type="button"
                            onClick={onToggleDetails}
                            className="inline-flex items-center gap-1.5 h-[34px] px-2.5 rounded-lg border border-line bg-white text-ink-2 text-[12.5px] font-semibold hover:bg-sable hover:text-or-brun transition-colors"
                            title="Afficher les détails"
                        >
                            <PanelRightOpen className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Bannières contextuelles (.banner de la maquette avec palette officielle) */}
            {currentFolder?.is_restricted && (
                <div className="flex items-start gap-2.5 rounded-[10px] bg-danger-bg border border-danger/25 px-3.5 py-2.5 text-[13px] text-danger mb-3.5">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                        <b>Accès restreint :</b> visible uniquement par les profils habilités (Direction, Super Admin, Responsable GED). Chaque consultation est journalisée.
                    </span>
                </div>
            )}

            {currentFolder && !currentFolder.is_locked && (
                <div className="flex items-start gap-2.5 rounded-[10px] bg-sable border border-contour px-3.5 py-2.5 text-[13px] text-[#6e5610] mb-3.5">
                    <Info className="h-4 w-4 shrink-0 mt-0.5 text-or-brun" />
                    <span>
                        Sous-dossier libre créé par le cabinet. Il hérite de la visibilité et des règles d'accès de son dossier parent.
                    </span>
                </div>
            )}

            {/* Grille des sous-dossiers (.grid-folders de la maquette) */}
            {(filteredSubfolders.length > 0 || currentFolder?.can_have_custom_subfolders) && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5 mb-4">
                    {filteredSubfolders.map((folder) => (
                        <div
                            key={folder.id}
                            onClick={() => onSelectFolder(folder)}
                            className="group relative flex items-center gap-2.5 p-3 rounded-[10px] border border-line bg-white text-left cursor-pointer hover:border-or hover:shadow-[0_1px_0_var(--color-or)] transition-all"
                        >
                            <Folder className="h-[22px] w-[22px] text-or fill-or/20 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="font-semibold text-[13px] leading-tight text-ebene truncate group-hover:text-or-brun">
                                    {folder.name}
                                </div>
                                <div className="text-[11.5px] text-ink-3 flex items-center gap-1.5 mt-1 flex-wrap">
                                    <span>{folder.children_count ?? folder.children?.length ?? 0} élément(s)</span>
                                    {folder.is_restricted && (
                                        <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-bold bg-danger-bg text-danger">
                                            Restreint
                                        </span>
                                    )}
                                    {!folder.is_locked && (
                                        <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-bold bg-sable text-or-brun border border-contour/50">
                                            Libre
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions rapides au survol si dossier libre */}
                            {(folder.can_rename || folder.can_delete) && (
                                <div
                                    className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {folder.can_rename && (
                                        <button
                                            type="button"
                                            onClick={() => onOpenRename(folder)}
                                            className="p-1 rounded hover:bg-sable text-ink-3 hover:text-or-brun"
                                            title="Renommer"
                                        >
                                            <Edit3 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    {folder.can_delete && (
                                        <button
                                            type="button"
                                            onClick={() => onDeleteFolder(folder)}
                                            className="p-1 rounded hover:bg-danger-bg text-ink-3 hover:text-danger"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Carte en pointillés "+ Nouveau sous-dossier" directement dans la grille comme sur la maquette */}
                    {currentFolder?.can_have_custom_subfolders && (
                        <button
                            type="button"
                            onClick={onOpenNewFolder}
                            className="flex items-center justify-center gap-2 p-3 rounded-[10px] border border-dashed border-contour bg-white/60 text-ink-2 text-[13px] font-medium hover:border-or hover:bg-sable/50 hover:text-or-brun transition-all"
                        >
                            <FolderPlus className="h-4 w-4" />
                            <span>Nouveau sous-dossier</span>
                        </button>
                    )}
                </div>
            )}

            {/* Zone de dépôt glisser-déposer (.drop de la maquette) */}
            {currentFolder?.can_upload && (
                <div
                    onClick={() => onOpenUploadPreview(null)}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`cursor-pointer rounded-[10px] border-[1.5px] border-dashed p-3.5 text-center text-[13px] mb-4 transition-all ${dragOver
                            ? 'border-or bg-sable text-or-brun'
                            : 'border-contour bg-white/80 text-ink-2 hover:border-or hover:bg-sable/40'
                        }`}
                >
                    <UploadCloud className="inline-block h-4 w-4 mr-1.5 -mt-0.5 text-or-brun" />
                    <b className="text-ebene">Glissez vos fichiers ici</b> ou cliquez pour déposer dans « {currentFolder.name} ». Prévisualisation automatique du nommage.
                </div>
            )}

            {/* Zone documents */}
            {isDocumentsLoading ? (
                <div className="rounded-[10px] border border-line bg-white p-8 text-center text-ink-2 text-[13px] flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-or-brun" />
                    <span>Chargement des documents…</span>
                </div>
            ) : filteredDocuments.length === 0 ? (
                <div className="rounded-[10px] border border-line bg-white p-8 text-center text-ink-3 text-[13px]">
                    {documents.length === 0
                        ? 'Aucun document classé dans ce dossier pour le moment.'
                        : 'Aucun document ne correspond à votre recherche.'}
                </div>
            ) : (
                <div className="rounded-[10px] border border-line bg-white overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-line-soft bg-naturel/60 text-[11.5px] font-bold uppercase tracking-wider text-ink-2 flex items-center justify-between">
                        <span>Documents ({filteredDocuments.length})</span>
                    </div>
                    <div className="divide-y divide-line-soft">
                        {filteredDocuments.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-sable/30 transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sable border border-contour/60 text-or-brun">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-[13px] text-ebene truncate">
                                                {doc.normalized_name}
                                            </span>
                                            <span className="rounded bg-ebene px-1.5 py-0.5 text-[10px] font-bold uppercase text-or-clair">
                                                {doc.extension}
                                            </span>
                                            <span className="rounded-full bg-sable border border-contour/60 px-2 py-0.5 text-[10px] font-bold text-or-brun">
                                                {doc.doc_type} · {doc.status_suffix}
                                            </span>
                                        </div>
                                        <div className="text-[11.5px] text-ink-3 mt-0.5 flex items-center gap-2 flex-wrap">
                                            <span>{formatFileSize(doc.size_bytes)}</span>
                                            {doc.uploaded_by && (
                                                <>
                                                    <span>·</span>
                                                    <span>Par {doc.uploaded_by.name}</span>
                                                </>
                                            )}
                                            {doc.created_at && (
                                                <>
                                                    <span>·</span>
                                                    <span>{formatDateTime(doc.created_at)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    {doc.can_download && (
                                        <button
                                            type="button"
                                            onClick={() => onDownloadDocument(doc)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-sable hover:border-contour transition-colors"
                                            title="Télécharger"
                                        >
                                            <Download className="h-3.5 w-3.5 text-or-brun" />
                                            <span className="hidden sm:inline">Télécharger</span>
                                        </button>
                                    )}
                                    {doc.can_delete && (
                                        <button
                                            type="button"
                                            onClick={() => onDeleteDocument(doc)}
                                            className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-bg hover:text-danger transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </main>
    );
}
