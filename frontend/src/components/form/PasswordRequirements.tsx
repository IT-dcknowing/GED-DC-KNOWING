import { Check, Circle } from 'lucide-react';

import { PASSWORD_RULES } from '@/lib/passwordPolicy';

/** Exigences du mot de passe, cochées au fil de la saisie (règles C1, C2, C4). */
export function PasswordRequirements({ value, id }: { value: string; id?: string }) {
    return (
        <div id={id} className="mt-2 rounded-[9px] border border-line-soft bg-naturel px-3 py-2.5">
            <p className="mb-1.5 text-[11px] font-semibold text-ink-2">Le nouveau mot de passe doit contenir :</p>
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(value);

                    return (
                        <li key={rule.id} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-ok' : 'text-ink-3'}`}>
                            {ok ? (
                                <Check aria-hidden="true" className="size-3.5 shrink-0" />
                            ) : (
                                <Circle aria-hidden="true" className="size-3 shrink-0" />
                            )}
                            <span>
                                {rule.label}
                                <span className="sr-only">{ok ? ' : respecté' : ' : non respecté'}</span>
                            </span>
                        </li>
                    );
                })}
            </ul>
            <p className="mt-1.5 text-[11px] text-ink-3">
                Il doit aussi être différent de vos 3 derniers mots de passe (vérifié à l'enregistrement).
            </p>
        </div>
    );
}
