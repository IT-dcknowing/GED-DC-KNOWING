import { Check, Copy, KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';

import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

type TemporaryPasswordDialogProps = {
    /** null : fenêtre fermée. Le mot de passe n'est conservé que le temps de l'affichage. */
    data: { name: string; email: string; password: string; context: 'created' | 'reset' } | null;
    onClose: () => void;
};

/** Affichage unique du mot de passe temporaire (règle B2). */
export function TemporaryPasswordDialog({ data, onClose }: TemporaryPasswordDialogProps) {
    const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');

    useEffect(() => {
        setCopied('idle');
    }, [data]);

    const copy = async () => {
        if (!data) return;
        try {
            await navigator.clipboard.writeText(data.password);
            setCopied('done');
        } catch {
            setCopied('failed');
        }
    };

    return (
        <Modal
            open={data !== null}
            onClose={onClose}
            icon={KeyRound}
            tone="gold"
            title={data?.context === 'reset' ? 'Nouveau mot de passe temporaire' : 'Compte créé'}
            subtitle={data ? `${data.name} · ${data.email}` : undefined}
            footer={
                <Button onClick={onClose} data-autofocus>
                    J'ai transmis le mot de passe
                </Button>
            }
        >
            {data && (
                <>
                    <FormAlert tone="info">
                        Ce mot de passe ne sera plus jamais affiché. Transmettez-le à la personne par un moyen sûr : elle devra le
                        remplacer dès sa première connexion.
                        {data.context === 'reset' && ' Toutes ses sessions ouvertes ont été fermées.'}
                    </FormAlert>

                    <p className="mb-1.5 text-xs font-semibold text-ink-2">Mot de passe temporaire</p>
                    <div className="flex flex-wrap items-center gap-2.5">
                        <code
                            aria-label="Mot de passe temporaire"
                            className="min-w-0 flex-1 rounded-[10px] bg-ebene px-3.5 py-3 font-mono text-[15px] tracking-[1.5px] break-all text-or-clair select-all"
                        >
                            {data.password}
                        </code>
                        <Button
                            variant="secondary"
                            onClick={() => void copy()}
                            icon={copied === 'done' ? <Check aria-hidden="true" className="size-4 text-ok" /> : <Copy aria-hidden="true" className="size-4" />}
                        >
                            {copied === 'done' ? 'Copié' : 'Copier'}
                        </Button>
                    </div>
                    {copied === 'failed' && (
                        <p className="mt-2 text-xs text-danger" role="alert">
                            La copie automatique n'est pas disponible : sélectionnez le mot de passe et copiez-le manuellement.
                        </p>
                    )}
                </>
            )}
        </Modal>
    );
}
