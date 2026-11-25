import { ChevronDown } from 'lucide-react';
import { useId, type ReactNode, type Ref, type SelectHTMLAttributes } from 'react';

/** Classe des listes déroulantes de la maquette (.select), utilisable seule dans une barre d'outils. */
export const selectClass =
    'h-[38px] w-full appearance-none rounded-[9px] border border-line bg-white pr-[30px] pl-3 text-[13.5px] text-ink transition-[border-color,box-shadow] focus:border-or focus:shadow-[0_0_0_3px_rgba(201,162,39,0.14)] focus:outline-none disabled:cursor-not-allowed disabled:bg-naturel disabled:text-ink-3 aria-invalid:border-danger';

/** Liste déroulante avec son chevron. */
export function Select({ className = '', ref, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
    return (
        <div className={`relative ${className}`}>
            <select ref={ref} className={selectClass} {...props} />
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-ink-3" />
        </div>
    );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
    label: string;
    error?: string;
    /** Texte d'aide affiché sous le champ. */
    hint?: ReactNode;
    ref?: Ref<HTMLSelectElement>;
};

/** Champ de formulaire avec libellé (maquette : .field + .select). */
export function SelectField({ label, error, hint, id, ref, children, ...props }: SelectFieldProps) {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const describedBy = [error ? `${selectId}-erreur` : null, hint ? `${selectId}-aide` : null].filter(Boolean).join(' ') || undefined;

    return (
        <div className="mb-3.5">
            <label htmlFor={selectId} className="mb-[5px] block text-xs font-semibold tracking-[0.2px] text-ink-2">
                {label}
            </label>
            <Select ref={ref} id={selectId} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props}>
                {children}
            </Select>
            {hint && (
                <p id={`${selectId}-aide`} className="mt-1 text-[11.5px] text-ink-3">
                    {hint}
                </p>
            )}
            {error && (
                <p id={`${selectId}-erreur`} className="mt-1 text-xs text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}
