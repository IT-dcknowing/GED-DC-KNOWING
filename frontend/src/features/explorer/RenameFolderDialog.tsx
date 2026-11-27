import { AlertCircle, Edit3, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { FolderItem } from '@/api/folders';

type Props = {
    folder: FolderItem;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (newName: string) => Promise<void>;
};

export function RenameFolderDialog({ folder, isOpen, onClose, onSubmit }: Props) {
    const [name, setName] = useState(folder.name);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            setError('Veuillez saisir un nom pour le dossier.');
            return;
        }
        if (/[/\\:*?"<>|]/.test(trimmed)) {
            setError('Le nom contient des caractères interdits (/ \\ : * ? " < > |).');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit(trimmed);
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Erreur lors du renommage.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ebene/45 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white border border-line shadow-2xl overflow-hidden text-ink">
                <div className="flex items-center justify-between border-b border-line-soft bg-gradient-to-b from-sable to-white px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-or text-ebene">
                            <Edit3 className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-[16px] font-bold text-ebene font-display">Renommer le dossier</h2>
                            <p className="text-xs text-ink-2 truncate max-w-[260px]">{folder.name}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-ink-2 hover:bg-sable hover:text-or-brun transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {error && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-bg p-3 text-xs text-danger">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-ink-2 mb-1.5">
                            Nouveau nom <span className="text-danger">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-[38px] rounded-lg border border-line bg-white px-3 text-[13.5px] text-ink placeholder-ink-3 focus:border-or focus:outline-none focus:ring-2 focus:ring-or/15"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line-soft">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-line bg-white px-4 py-2 text-xs font-semibold text-ink hover:bg-sable transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 rounded-lg bg-or px-4 py-2 text-xs font-bold text-ebene shadow-sm hover:bg-[#b8921f] disabled:opacity-50 transition-all"
                        >
                            <Edit3 className="h-4 w-4" />
                            {isSubmitting ? 'Enregistrement...' : 'Renommer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
