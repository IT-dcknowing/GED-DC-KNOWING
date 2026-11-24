import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'error' | 'success' | 'info';

const TONES: Record<Tone, { box: string; icon: ReactNode }> = {
    error: {
        box: 'border-danger/35 bg-danger-bg text-danger',
        icon: <CircleAlert aria-hidden="true" className="mt-px size-[15px] shrink-0" />,
    },
    success: {
        box: 'border-ok/30 bg-ok-bg text-ok',
        icon: <CircleCheck aria-hidden="true" className="mt-px size-[15px] shrink-0" />,
    },
    info: {
        box: 'border-contour bg-sable text-[#6e5610]',
        icon: <Info aria-hidden="true" className="mt-px size-[15px] shrink-0" />,
    },
};

/** Bandeau de message de la maquette (.login-error, .notice). Les erreurs sont annoncées aux lecteurs d'écran. */
export function FormAlert({ tone, children }: { tone: Tone; children: ReactNode }) {
    const { box, icon } = TONES[tone];

    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={`mb-3.5 flex items-start gap-[9px] rounded-[10px] border px-[13px] py-2.5 text-[12.5px] leading-relaxed ${box}`}
        >
            {icon}
            <div className="min-w-0">{children}</div>
        </div>
    );
}
