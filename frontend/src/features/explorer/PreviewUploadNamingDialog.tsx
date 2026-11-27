import { AlertCircle, CheckCircle2, Info, Sparkles, UploadCloud, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { FolderItem } from '@/api/folders';

type Props = {
    folder: FolderItem;
    isOpen: boolean;
    initialFile?: File | null;
    onClose: () => void;
};

const DOC_TYPES = [
    { code: 'STATUTS', label: 'Statuts constitutifs ou modifiés' },
    { code: 'PV_AG', label: 'Procès-verbal d\'Assemblée Générale' },
    { code: 'RCCM', label: 'Registre du Commerce (RCCM)' },
    { code: 'DFE', label: 'Déclaration Fiscale d\'Existence (DFE)' },
    { code: 'CONTRAT', label: 'Contrat commercial ou bail' },
    { code: 'LDM', label: 'Lettre de Mission cabinet' },
    { code: 'RIB', label: 'Relevé d\'Identité Bancaire' },
    { code: 'CNI', label: 'Pièce d\'identité dirigeant' },
    { code: 'FAC_ACH', label: 'Facture d\'achat' },
    { code: 'FAC_VTE', label: 'Facture de vente' },
    { code: 'RELEVE_BQ', label: 'Relevé bancaire' },
    { code: 'DECL_TVA', label: 'Déclaration TVA / Acompte' },
    { code: 'LIASSE_FISC', label: 'Liasse fiscale / DSF' },
    { code: 'BULLETIN_PAIE', label: 'Bulletin de paie' },
    { code: 'ETAT_CNPS', label: 'Déclaration sociale CNPS' },
    { code: 'RAPPORT_GEST', label: 'Rapport de gestion' },
    { code: 'MEMO', label: 'Note de cadrage ou mémo' },
];

const STATUS_SUFFIXES = [
    { code: 'SIGNE', label: 'Signé / Définitif' },
    { code: 'PROJET', label: 'Projet / En cours' },
    { code: 'VALIDE', label: 'Validé cabinet' },
    { code: 'ARCHIVE', label: 'Archivé' },
];

export function PreviewUploadNamingDialog({ folder, isOpen, initialFile, onClose }: Props) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const clientCode = folder.client?.code || 'CABINET';

    const initialExt = initialFile ? (initialFile.name.split('.').pop() || 'pdf') : 'pdf';
    const initialSubject = initialFile
        ? initialFile.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)
        : 'Constitution_Societe';

    const [docType, setDocType] = useState('STATUTS');
    const [subject, setSubject] = useState(initialSubject);
    const [statusSuffix, setStatusSuffix] = useState('SIGNE');
    const [extension, setExtension] = useState(initialExt);
    const [dragActive, setDragActive] = useState(false);
    const [simulatedFile, setSimulatedFile] = useState<string | null>(initialFile ? initialFile.name : null);
    const [fileSizeLabel, setFileSizeLabel] = useState<string | null>(
        initialFile ? `${(initialFile.size / (1024 * 1024)).toFixed(2)} Mo` : null
    );
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const generatedFilename = useMemo(() => {
        const cleanSubject = subject.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Document';
        return `${today}_${clientCode}_${docType}_${cleanSubject}_${statusSuffix}.${extension.toLowerCase()}`;
    }, [today, clientCode, docType, subject, statusSuffix, extension]);

    if (!isOpen) return null;

    const applySelectedFile = (file: File) => {
        const maxBytes = 25 * 1024 * 1024;
        if (file.size > maxBytes) {
            setFileError('Le fichier dépasse la taille maximale autorisée de 25 Mo.');
            return;
        }
        setFileError(null);
        setSimulatedFile(file.name);
        setFileSizeLabel(
            file.size >= 1024 * 1024
                ? `${(file.size / (1024 * 1024)).toFixed(2)} Mo`
                : `${Math.max(1, Math.round(file.size / 1024))} Ko`
        );
        const ext = file.name.split('.').pop() || 'pdf';
        setExtension(ext);
        const base = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        if (base) {
            setSubject(base.slice(0, 30));
        }
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            applySelectedFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            applySelectedFile(file);
        }
        e.target.value = '';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ebene/45 backdrop-blur-xs">
            <div className="w-full max-w-xl rounded-2xl bg-white border border-line shadow-2xl overflow-hidden text-ink">
                <div className="flex items-center justify-between border-b border-line-soft bg-gradient-to-b from-sable to-white px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-or text-ebene">
                            <UploadCloud className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-[16px] font-bold text-ebene font-display">Déposer un document</h2>
                                <span className="rounded-full bg-sable border border-contour px-2 py-0.5 text-[10px] font-bold text-or-brun uppercase tracking-wider">
                                    Lot 2.2 · Prévisualisation
                                </span>
                            </div>
                            <p className="text-xs text-ink-2 truncate max-w-[340px]">
                                Destination : {folder.path}
                            </p>
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

                <div className="p-6 space-y-5">
                    {/* Zone de drop cliquable et glisser-déposer */}
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                            onChange={handleFileInputChange}
                            className="hidden"
                        />
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    fileInputRef.current?.click();
                                }
                            }}
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleFileDrop}
                            className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all ${dragActive
                                ? 'border-or bg-sable'
                                : simulatedFile
                                    ? 'border-ok bg-ok-bg/40'
                                    : 'border-contour bg-gradient-to-b from-sable/60 to-naturel hover:border-or'
                                }`}
                        >
                            <UploadCloud className={`mx-auto h-7 w-7 mb-2 ${simulatedFile ? 'text-ok' : 'text-or-brun'}`} />
                            {simulatedFile ? (
                                <div>
                                    <p className="text-xs font-semibold text-ok">
                                        Fichier sélectionné : {simulatedFile} {fileSizeLabel ? `(${fileSizeLabel})` : ''}
                                    </p>
                                    <p className="text-[11px] text-ink-2 mt-1">
                                        Cliquez ou glissez un autre fichier pour remplacer
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-[13px] font-semibold text-ebene">
                                        Glissez un document ici ou cliquez pour parcourir
                                    </p>
                                    <p className="text-[11px] text-ink-2 mt-1">PDF, DOCX, XLSX, PNG, JPG (max 25 Mo)</p>
                                </div>
                            )}
                        </div>
                        {fileError && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-danger">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>{fileError}</span>
                            </div>
                        )}
                    </div>

                    {/* Paramètres de normalisation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block text-xs font-semibold text-ink-2 mb-1">
                                Type de document <span className="text-danger">*</span>
                            </label>
                            <select
                                value={docType}
                                onChange={(e) => setDocType(e.target.value)}
                                className="w-full h-[38px] rounded-lg border border-line bg-white px-3 text-xs text-ink focus:border-or focus:outline-none"
                            >
                                {DOC_TYPES.map((t) => (
                                    <option key={t.code} value={t.code}>
                                        {t.code} — {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-ink-2 mb-1">
                                Statut de la pièce <span className="text-danger">*</span>
                            </label>
                            <select
                                value={statusSuffix}
                                onChange={(e) => setStatusSuffix(e.target.value)}
                                className="w-full h-[38px] rounded-lg border border-line bg-white px-3 text-xs text-ink focus:border-or focus:outline-none"
                            >
                                {STATUS_SUFFIXES.map((s) => (
                                    <option key={s.code} value={s.code}>
                                        {s.code} ({s.label})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-ink-2 mb-1">
                                Objet succinct du document <span className="text-danger">*</span>
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="ex: Statuts_modifies_AG_extraordinaire"
                                className="w-full h-[38px] rounded-lg border border-line bg-white px-3 text-xs text-ink placeholder-ink-3 focus:border-or focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Aperçu interactif du nommage normalisé (style official ebene + or-clair) */}
                    <div className="rounded-xl border border-contour bg-sable/60 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-or-brun">
                            <Sparkles className="h-4 w-4" />
                            <span>Nommage normalisé automatique (Convention DC-KNOWING) :</span>
                        </div>
                        <div className="rounded-lg bg-ebene p-3 font-mono text-xs text-or-clair break-all select-all flex items-center justify-between">
                            <span>{generatedFilename}</span>
                            <span className="rounded bg-or text-ebene px-2 py-0.5 text-[10px] font-bold uppercase ml-2 shrink-0">
                                {extension.toUpperCase()}
                            </span>
                        </div>
                        <p className="text-[11px] text-ink-2 leading-relaxed">
                            Format standard : <code className="text-or-brun font-mono font-bold">AAAAMMJJ_CodeClient_TypeDoc_Objet_Statut.ext</code>
                        </p>
                    </div>

                    {/* Note informative Lot 2.2 vs Lot 3.2 */}
                    <div className="flex items-start gap-2.5 rounded-xl border border-line bg-naturel p-3 text-xs text-ink-2 leading-relaxed">
                        <Info className="h-4 w-4 shrink-0 text-or-brun mt-0.5" />
                        <div>
                            <span className="font-semibold text-ebene">Phase 2.2 active :</span> La structure de classement et la prévisualisation du nommage sont opérationnelles. L'enregistrement physique des fichiers sera branché au <strong>Lot 3.2</strong>.
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-line-soft">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-line bg-white px-4 py-2 text-xs font-semibold text-ink hover:bg-sable transition-colors"
                        >
                            Fermer
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex items-center gap-2 rounded-lg bg-or px-4 py-2 text-xs font-bold text-ebene shadow-sm hover:bg-[#b8921f] transition-all"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Valider l'aperçu
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
