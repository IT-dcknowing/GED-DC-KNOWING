type SwitchProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** Nom accessible, lu par les lecteurs d'écran. */
    label: string;
    disabled?: boolean;
    /** Explication affichée au survol (ex. raison d'une désactivation). */
    title?: string;
};

/** Interrupteur de la maquette (.switch) : 38 × 21 px, or quand il est actif. */
export function Switch({ checked, onChange, label, disabled = false, title }: SwitchProps) {
    return (
        <label className={`relative inline-flex h-[21px] w-[38px] shrink-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`} title={title}>
            <input
                type="checkbox"
                role="switch"
                className="peer sr-only"
                checked={checked}
                disabled={disabled}
                aria-label={label}
                onChange={(event) => onChange(event.target.checked)}
            />
            <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border border-or-brun/30 bg-[#d6cba6] transition-colors peer-checked:bg-or peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-or peer-disabled:opacity-50"
            />
            <span
                aria-hidden="true"
                className="absolute top-[2px] left-[2px] size-[15px] rounded-full bg-white shadow-[0_1px_3px_rgba(26,26,26,0.3)] transition-transform peer-checked:translate-x-[17px]"
            />
        </label>
    );
}
