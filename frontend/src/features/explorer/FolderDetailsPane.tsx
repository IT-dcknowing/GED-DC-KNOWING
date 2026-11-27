import { Building, Clock, Folder, Hash, Lock, PanelRight, PanelRightClose, ShieldCheck, Tag, Unlock, User } from 'lucide-react';
import type { FolderItem } from '@/api/folders';

type Props = {
    folder: FolderItem | null;
    isOpen: boolean;
    onClose: () => void;
};

export function FolderDetailsPane({ folder, isOpen, onClose }: Props) {
    if (!isOpen || !folder) return null;

    return (
        <aside className="w-80 shrink-0 rounded-xl border border-line-soft bg-white shadow-sm flex flex-col h-full overflow-hidden">
            {/* En-tête Panneau Détails */}
            <div className="flex items-center justify-between border-b border-line-soft bg-gradient-to-b from-[#fffefa] to-naturel px-4 py-3">
                <div className="flex items-center gap-2 font-display text-[13px] font-extrabold text-ebene">
                    <PanelRight className="h-4 w-4 text-or-brun" />
                    <span>Panneau détails</span>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1 text-ink-2 hover:bg-sable hover:text-or-brun transition-colors"
                    title="Masquer le panneau détails"
                >
                    <PanelRightClose className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* Miniature visuelle officielle */}
                <div className="h-24 rounded-xl bg-gradient-to-br from-sable to-naturel border border-contour/50 flex items-center justify-center text-or-brun relative overflow-hidden">
                    <Folder className="h-9 w-9 text-or fill-or/20" />
                </div>

                {/* Titre et chemin */}
                <div className="space-y-1">
                    <h4 className="font-bold text-ebene text-[14px] leading-snug break-words font-display">
                        {folder.name}
                    </h4>
                    <p className="font-mono text-[10.5px] text-ink-3 break-all">
                        {folder.path}
                    </p>
                    {folder.description && (
                        <p className="text-ink-2 text-[11.5px] leading-relaxed pt-1">
                            {folder.description}
                        </p>
                    )}
                </div>

                {/* Badges de statut */}
                <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-sable px-2.5 py-0.5 text-[11px] font-semibold text-or-brun border border-contour/50">
                        <Tag className="h-3 w-3" />
                        {folder.nature_label}
                    </span>
                    {folder.is_locked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f1ede2] px-2.5 py-0.5 text-[11px] font-semibold text-[#6e675a]">
                            <Lock className="h-3 w-3" />
                            Protégé
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ok-bg px-2.5 py-0.5 text-[11px] font-semibold text-ok">
                            <Unlock className="h-3 w-3" />
                            Libre
                        </span>
                    )}
                    {folder.is_restricted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2.5 py-0.5 text-[11px] font-semibold text-danger">
                            <ShieldCheck className="h-3 w-3" />
                            Accès restreint
                        </span>
                    )}
                </div>

                {/* Liste des métadonnées */}
                <dl className="border-t border-line-soft divide-y divide-line-soft text-[12px]">
                    <div className="flex gap-2 py-2">
                        <dt className="text-ink-3 w-28 shrink-0">Profondeur</dt>
                        <dd className="text-ink font-medium flex items-center gap-1">
                            <Hash className="h-3.5 w-3.5 text-or-brun" />
                            Niveau {folder.depth}
                        </dd>
                    </div>
                    <div className="flex gap-2 py-2">
                        <dt className="text-ink-3 w-28 shrink-0">Sous-dossiers</dt>
                        <dd className="text-ink font-medium">
                            {folder.children_count ?? folder.children?.length ?? 0} dossier(s)
                        </dd>
                    </div>
                    {folder.client && (
                        <div className="flex gap-2 py-2">
                            <dt className="text-ink-3 w-28 shrink-0">Client</dt>
                            <dd className="text-ink font-semibold flex items-center gap-1">
                                <Building className="h-3.5 w-3.5 text-or-brun shrink-0" />
                                <span className="truncate">{folder.client.code}</span>
                            </dd>
                        </div>
                    )}
                    <div className="flex gap-2 py-2">
                        <dt className="text-ink-3 w-28 shrink-0">Dépôt direct</dt>
                        <dd className={folder.can_upload ? 'text-ok font-semibold' : 'text-or-brun font-semibold'}>
                            {folder.can_upload ? 'Autorisé' : 'Sous-rubrique requise'}
                        </dd>
                    </div>
                    <div className="flex gap-2 py-2">
                        <dt className="text-ink-3 w-28 shrink-0">Sous-dossiers libres</dt>
                        <dd className={folder.can_have_custom_subfolders ? 'text-ok font-semibold' : 'text-ink-3'}>
                            {folder.can_have_custom_subfolders ? 'Autorisés' : 'Non autorisé'}
                        </dd>
                    </div>
                    {folder.created_by && (
                        <div className="flex gap-2 py-2">
                            <dt className="text-ink-3 w-28 shrink-0">Créé par</dt>
                            <dd className="text-ink font-medium flex items-center gap-1">
                                <User className="h-3.5 w-3.5 text-ink-3" />
                                {folder.created_by}
                            </dd>
                        </div>
                    )}
                    {folder.created_at && (
                        <div className="flex gap-2 py-2">
                            <dt className="text-ink-3 w-28 shrink-0">Création</dt>
                            <dd className="text-ink font-medium flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-ink-3" />
                                {new Date(folder.created_at).toLocaleDateString('fr-FR')}
                            </dd>
                        </div>
                    )}
                </dl>
            </div>
        </aside>
    );
}
