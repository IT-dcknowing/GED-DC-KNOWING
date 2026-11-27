import { Eye, EyeOff, Lock } from 'lucide-react';
import { useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

import { IconInput } from '@/components/form/IconInput';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    label: string;
    error?: string;
    after?: ReactNode;
    ref?: Ref<HTMLInputElement>;
};

/** Champ mot de passe de la maquette : icône cadenas et bouton afficher / masquer. */
export function PasswordInput(props: PasswordInputProps) {
    const [visible, setVisible] = useState(false);

    return (
        <IconInput
            {...props}
            type={visible ? 'text' : 'password'}
            icon={Lock}
            trailing={
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? `Masquer : ${props.label}` : `Afficher : ${props.label}`}
                    aria-pressed={visible}
                    className="absolute top-1/2 right-1.5 inline-flex size-[30px] -translate-y-1/2 items-center justify-center rounded-lg border border-transparent text-ink-2 hover:border-line hover:bg-sable hover:text-or-brun"
                >
                    {visible ? <EyeOff aria-hidden="true" className="size-[15px]" /> : <Eye aria-hidden="true" className="size-[15px]" />}
                </button>
            }
        />
    );
}
