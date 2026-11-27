import { ChevronRight, FolderClosed, FolderOpen, Unlock } from 'lucide-react';
import { useState } from 'react';
import type { FolderItem } from '@/api/folders';

type Props = {
    title: string;
    subtitle: string;
    folders: FolderItem[];
    activeFolderId: number | null;
    onSelectFolder: (folder: FolderItem) => void;
};

export function FolderTreePane({ title, subtitle, folders, activeFolderId, onSelectFolder }: Props) {
    return (
        <section className="w-[290px] shrink-0 bg-[#fbfaf6] border-r border-line flex flex-col h-full overflow-hidden">
            {/* En-tête de l'arbre (.tree-head de la maquette) */}
            <div className="px-3.5 pt-3.5 pb-2.5 border-b border-line-soft bg-gradient-to-b from-[#fffefa] to-naturel/60">
                <div className="font-display font-bold text-[14px] leading-snug text-ebene truncate" title={title}>
                    {title}
                </div>
                <div className="text-[12px] text-ink-3 truncate mt-0.5">{subtitle}</div>
            </div>

            <div className="flex-1 overflow-y-auto px-1.5 py-2 space-y-0.5">
                {folders.map((folder) => (
                    <TreeItem
                        key={folder.id}
                        folder={folder}
                        activeFolderId={activeFolderId}
                        onSelectFolder={onSelectFolder}
                        level={0}
                    />
                ))}
            </div>
        </section>
    );
}

function TreeItem({
    folder,
    activeFolderId,
    onSelectFolder,
    level,
}: {
    folder: FolderItem;
    activeFolderId: number | null;
    onSelectFolder: (folder: FolderItem) => void;
    level: number;
}) {
    const [isOpen, setIsOpen] = useState(level < 1 || folder.name.includes('PERMANENT') || folder.name.includes('EXERCICES'));
    const isSelected = activeFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
        <div>
            <button
                type="button"
                onClick={() => onSelectFolder(folder)}
                className={`group flex items-center gap-1.5 w-full rounded-md py-1.5 pr-2 text-left text-[13px] transition-colors ${isSelected
                        ? 'bg-sable text-ebene font-semibold shadow-[inset_3px_0_0_var(--color-or)]'
                        : 'text-ink-2 hover:bg-[#f0e9d6]/50 hover:text-ebene'
                    }`}
                style={{ paddingLeft: `${Math.max(0.4, level * 0.9 + 0.4)}rem` }}
            >
                {hasChildren ? (
                    <span
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                        className="w-3.5 h-3.5 flex items-center justify-center text-ink-3 hover:text-or-brun transition-transform"
                    >
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
                    </span>
                ) : (
                    <span className="w-3.5 shrink-0" />
                )}

                {isSelected || isOpen ? (
                    <FolderOpen className="h-3.5 w-3.5 text-or shrink-0" />
                ) : (
                    <FolderClosed className="h-3.5 w-3.5 text-or-brun/80 shrink-0" />
                )}

                <span className={`truncate flex-1 ${!folder.is_locked ? 'italic' : ''}`} title={folder.name}>
                    {folder.name}
                </span>

                {folder.is_restricted && (
                    <span className="inline-flex items-center rounded-full bg-danger-bg px-1.5 py-0.5 text-[9.5px] font-bold text-danger shrink-0">
                        Restreint
                    </span>
                )}

                {!folder.is_locked && (
                    <span title="Sous-dossier libre">
                        <Unlock className="h-2.5 w-2.5 text-ok shrink-0" />
                    </span>
                )}

                {typeof folder.children_count === 'number' && folder.children_count > 0 && (
                    <span className="text-[11px] text-ink-3 font-medium shrink-0">
                        {folder.children_count}
                    </span>
                )}
            </button>

            {hasChildren && isOpen && (
                <div className="space-y-0.5">
                    {folder.children!.map((child) => (
                        <TreeItem
                            key={child.id}
                            folder={child}
                            activeFolderId={activeFolderId}
                            onSelectFolder={onSelectFolder}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
