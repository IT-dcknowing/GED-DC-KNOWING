import type { LucideIcon } from 'lucide-react';
import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

type IconInputProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    icon: LucideIcon;
    error?: string;
    /** Élément placé à droite dans le champ (ex. bouton afficher / masquer). */
    trailing?: ReactNode;
    /** Contenu affiché sous le champ (ex. liste d'exigences). */
    after?: ReactNode;
    ref?: Ref<HTMLInputElement>;
};

/**
 * Champ de saisie avec icône (maquette : .field + .input-ic) : 38 px de haut,
 * coins de 9 px, focus or avec halo.
 */
export function IconInput({ label, icon: Icon, error, trailing, after, id, ref, ...props }: IconInputProps) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-erreur`;

    return (
        <div className="mb-3.5">
            <label htmlFor={inputId} className="mb-[5px] block text-xs font-semibold tracking-[0.2px] text-ink-2">
                {label}
            </label>
            <div className="relative">
                <Icon
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-ink-3"
                />
                <input
                    id={inputId}
                    ref={ref}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={`h-[38px] w-full rounded-[9px] border border-line bg-white pl-[34px] text-[13.5px] text-ink transition-[border-color,box-shadow] placeholder:text-ink-3 focus:border-or focus:shadow-[0_0_0_3px_rgba(201,162,39,0.14)] focus:outline-none aria-invalid:border-danger ${trailing ? 'pr-11' : 'pr-3'}`}
                    {...props}
                />
                {trailing}
            </div>
            {error && (
                <p id={errorId} className="mt-1 text-xs text-danger">
                    {error}
                </p>
            )}
            {after}
        </div>
    );
}
