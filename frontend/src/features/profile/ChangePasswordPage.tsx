import { KeyRound } from 'lucide-react';
import { useState } from 'react';

import { FormAlert } from '@/components/form/FormAlert';
import { ChangePasswordForm } from '@/features/auth/ChangePasswordForm';

/** AUTH-05 : modification du mot de passe depuis le profil (règles C5, C6). */
export function ChangePasswordPage() {
    const [saved, setSaved] = useState(false);

    return (
        <div className="max-w-xl">
            <div className="mb-[18px]">
                <h1 className="text-[21px] font-extrabold tracking-[-0.2px]">Modifier mon mot de passe</h1>
                <p className="mt-[3px] text-[13px] text-ink-2">
                    Après la modification, vos sessions ouvertes sur d'autres appareils seront fermées.
                </p>
            </div>

            <section
                aria-labelledby="mot-de-passe-titre"
                className="rounded-xl border border-line-soft bg-white shadow-[0_1px_2px_rgba(26,26,26,0.05),0_2px_8px_-4px_rgba(26,26,26,0.08)]"
            >
                <h2
                    id="mot-de-passe-titre"
                    className="flex items-center gap-2 border-b border-line-soft px-4 py-3.5 text-[14.5px] font-bold"
                >
                    <KeyRound aria-hidden="true" className="size-4 text-or-brun" />
                    Mot de passe
                </h2>
                <div className="p-4">
                    {saved && (
                        <FormAlert tone="success">
                            Votre mot de passe a été modifié. Vos autres sessions ont été fermées.
                        </FormAlert>
                    )}
                    <ChangePasswordForm
                        currentLabel="Mot de passe actuel"
                        submitLabel="Enregistrer le nouveau mot de passe"
                        onSuccess={() => setSaved(true)}
                    />
                </div>
            </section>
        </div>
    );
}
