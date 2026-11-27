/**
 * Monogramme de la maquette (« logo-mark ») : dégradé or, initiales DC.
 * À remplacer par le logo officiel de DC-KNOWING dès qu'il sera fourni (question Q-19 du rapport d'audit).
 */
export function BrandMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
    const box = size === 'lg' ? 'size-[46px] rounded-[13px] text-[17px]' : 'size-[38px] rounded-[10px] text-[15px]';

    return (
        <span
            aria-hidden="true"
            className={`inline-flex shrink-0 items-center justify-center bg-linear-135 from-or to-or-clair font-display font-extrabold tracking-[0.5px] text-ebene shadow-[inset_0_0_0_1px_rgba(26,26,26,0.25),0_4px_12px_-4px_rgba(201,162,39,0.55)] ${box}`}
        >
            DC
        </span>
    );
}
