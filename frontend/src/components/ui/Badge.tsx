import type { ReactNode } from 'react';

type Tone = 'gold' | 'ebene' | 'red' | 'green' | 'grey' | 'sable';

// Pastilles d'information de la maquette (.chip, .chip-*) ; jamais cliquables.
const TONES: Record<Tone, string> = {
    gold: 'border-contour/55 bg-sable text-or-brun',
    ebene: 'border-transparent bg-ebene text-or-clair',
    red: 'border-danger/25 bg-danger-bg text-danger',
    green: 'border-ok/25 bg-ok-bg text-ok',
    grey: 'border-transparent bg-[#f1ede2] text-[#5f5949]',
    sable: 'border-contour bg-sable text-ink',
};

export function Badge({ tone = 'grey', icon, children, title }: { tone?: Tone; icon?: ReactNode; children: ReactNode; title?: string }) {
    return (
        <span
            title={title}
            className={`inline-flex h-6 items-center gap-[5px] rounded-full border px-[9px] text-[11.5px] font-semibold whitespace-nowrap ${TONES[tone]}`}
        >
            {icon}
            {children}
        </span>
    );
}
