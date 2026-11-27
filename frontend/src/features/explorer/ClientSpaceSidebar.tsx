import { FolderKanban, FolderPlus, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { FolderItem } from '@/api/folders';

export type SelectedSpace =
    | { type: 'client'; folder: FolderItem }
    | { type: 'cabinet'; spaces: FolderItem[] }
    | { type: 'model'; folder: FolderItem };

type Props = {
    clientFolders: FolderItem[];
    modelFolder: FolderItem | null;
    cabinetSpaces: FolderItem[];
    selectedSpaceKey: string; // 'cabinet' | 'model' | `client-${id}`
    onSelectClient: (folder: FolderItem) => void;
    onSelectCabinet: () => void;
    onSelectModel: (folder: FolderItem) => void;
    onCreateInClient?: (folder: FolderItem) => void;
    onCreateInCabinet?: () => void;
};

function getInitials(name: string): string {
    // Retire le préfixe "CLI-0001 · " si présent
    const clean = name.replace(/^CLI-\d+\s*·\s*/i, '').trim();
    const parts = clean.split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    if (first && second) {
        return (first + second).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
}

function getClientDisplayName(folder: FolderItem): string {
    if (folder.client?.name) return folder.client.name;
    return folder.name.replace(/^CLI-\d+\s*·\s*/i, '').trim();
}

function getClientCode(folder: FolderItem): string {
    if (folder.client?.code) return folder.client.code;
    const match = folder.name.match(/^(CLI-\d+)/i);
    return match?.[1] ?? 'CLIENT';
}

export function ClientSpaceSidebar({
    clientFolders,
    modelFolder,
    cabinetSpaces,
    selectedSpaceKey,
    onSelectClient,
    onSelectCabinet,
    onSelectModel,
    onCreateInClient,
    onCreateInCabinet,
}: Props) {
    const [filter, setFilter] = useState('');

    const filteredClients = clientFolders.filter((c) =>
        c.name.toLowerCase().includes(filter.toLowerCase())
    );

    const activeClientFolder = selectedSpaceKey.startsWith('client-')
        ? clientFolders.find((c) => `client-${c.id}` === selectedSpaceKey) ?? null
        : null;
    const canCreateInCabinet = cabinetSpaces.some((s) => s.can_have_custom_subfolders);

    return (
        <aside className="w-[245px] shrink-0 border-r border-line bg-white flex flex-col h-full overflow-hidden">
            {/* Section Espace Clients */}
            <div className="px-3.5 pt-3.5 pb-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-ink-3">
                    Espace Clients
                </span>
                {activeClientFolder?.can_have_custom_subfolders && onCreateInClient && (
                    <button
                        type="button"
                        onClick={() => onCreateInClient(activeClientFolder)}
                        className="inline-flex items-center gap-1 rounded-md border border-contour bg-sable/70 px-1.5 py-0.5 text-[10.5px] font-semibold text-or-brun hover:bg-sable transition-colors"
                        title={`Nouveau dossier dans ${getClientDisplayName(activeClientFolder)}`}
                    >
                        <FolderPlus className="h-3 w-3" />
                        <span>Nouveau</span>
                    </button>
                )}
            </div>

            <div className="px-3 pb-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-ink-3" />
                    <input
                        type="text"
                        placeholder="Filtrer les clients…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full h-8 rounded-lg border border-line bg-naturel/60 pl-8 pr-2.5 text-[12.5px] text-ink placeholder-ink-3 focus:border-or focus:bg-white focus:outline-none"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
                {filteredClients.length === 0 ? (
                    <div className="px-2 py-4 text-center text-xs text-ink-3">
                        Aucun client trouvé.
                    </div>
                ) : (
                    filteredClients.map((folder) => {
                        const isSelected = selectedSpaceKey === `client-${folder.id}`;
                        const displayName = getClientDisplayName(folder);
                        const code = getClientCode(folder);
                        const initials = getInitials(folder.name);

                        return (
                            <button
                                key={folder.id}
                                type="button"
                                onClick={() => onSelectClient(folder)}
                                className={`flex items-center gap-2.5 w-full rounded-lg p-2 text-left transition-colors ${
                                    isSelected
                                        ? 'bg-sable shadow-[inset_3px_0_0_var(--color-or)]'
                                        : 'hover:bg-[#fbf7ea]'
                                }`}
                            >
                                <span
                                    className={`w-[30px] h-[30px] shrink-0 rounded-lg grid place-items-center text-[11px] font-bold transition-colors ${
                                        isSelected
                                            ? 'bg-or text-ebene'
                                            : 'bg-naturel text-ink-2 border border-line-soft'
                                    }`}
                                >
                                    {initials}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className={`text-[13px] leading-tight truncate ${isSelected ? 'font-bold text-ebene' : 'font-medium text-ink'}`}>
                                        {displayName}
                                    </div>
                                    <div className="text-[11px] text-ink-3 mt-0.5 truncate">
                                        {code} · Dossier client
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}

                {/* Section Espace Cabinet */}
                <div className="px-1.5 pt-4 pb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-ink-3">
                        Espace Cabinet
                    </span>
                    {canCreateInCabinet && onCreateInCabinet && (
                        <button
                            type="button"
                            onClick={onCreateInCabinet}
                            className="inline-flex items-center gap-1 rounded-md border border-contour bg-sable/70 px-1.5 py-0.5 text-[10.5px] font-semibold text-or-brun hover:bg-sable transition-colors"
                            title="Nouveau dossier dans la gestion interne"
                        >
                            <FolderPlus className="h-3 w-3" />
                            <span>Nouveau</span>
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onSelectCabinet}
                    className={`flex items-center gap-2.5 w-full rounded-lg p-2 text-left transition-colors ${
                        selectedSpaceKey === 'cabinet'
                            ? 'bg-sable shadow-[inset_3px_0_0_var(--color-or)]'
                            : 'hover:bg-[#fbf7ea]'
                    }`}
                >
                    <span
                        className={`w-[30px] h-[30px] shrink-0 rounded-lg grid place-items-center text-[11px] font-bold ${
                            selectedSpaceKey === 'cabinet'
                                ? 'bg-or text-ebene'
                                : 'bg-ebene text-or-clair'
                        }`}
                    >
                        <FolderKanban className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className={`text-[13px] leading-tight truncate ${selectedSpaceKey === 'cabinet' ? 'font-bold text-ebene' : 'font-medium text-ink'}`}>
                            Gestion interne
                        </div>
                        <div className="text-[11px] text-ink-3 mt-0.5 flex items-center gap-1">
                            <span>{cabinetSpaces.length} rubriques</span>
                            <ShieldCheck className="h-3 w-3 text-or-brun" />
                        </div>
                    </div>
                </button>

                {modelFolder && (
                    <button
                        type="button"
                        onClick={() => onSelectModel(modelFolder)}
                        className={`flex items-center gap-2.5 w-full rounded-lg p-2 text-left transition-colors ${
                            selectedSpaceKey === 'model'
                                ? 'bg-sable shadow-[inset_3px_0_0_var(--color-or)]'
                                : 'hover:bg-[#fbf7ea]'
                        }`}
                    >
                        <span
                            className={`w-[30px] h-[30px] shrink-0 rounded-lg grid place-items-center text-[11px] font-bold ${
                                selectedSpaceKey === 'model'
                                    ? 'bg-or text-ebene'
                                    : 'bg-naturel text-or-brun border border-contour/50'
                            }`}
                        >
                            <Sparkles className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className={`text-[13px] leading-tight truncate ${selectedSpaceKey === 'model' ? 'font-bold text-ebene' : 'font-medium text-ink'}`}>
                                Modèle Client
                            </div>
                            <div className="text-[11px] text-ink-3 mt-0.5 truncate">
                                Structure référence
                            </div>
                        </div>
                    </button>
                )}
            </div>
        </aside>
    );
}
