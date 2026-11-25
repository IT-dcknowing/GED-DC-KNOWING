import { X, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Tone = 'dark' | 'gold' | 'danger';

type ModalProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    tone?: Tone;
    size?: 'md' | 'lg';
    /** Pied de fenêtre (boutons). */
    footer?: ReactNode;
    /** Note discrète à gauche du pied de fenêtre. */
    note?: ReactNode;
    children: ReactNode;
};

const ICON_TONES: Record<Tone, string> = {
    dark: 'bg-ebene text-or-clair',
    gold: 'bg-or text-ebene',
    danger: 'bg-danger text-white',
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Fenêtre modale de la maquette (.modal) : en-tête sable, icône, corps, pied beige.
 * Accessible : rôle dialog, focus placé dans la fenêtre et maintenu, fermeture par Échap.
 */
export function Modal({ open, onClose, title, subtitle, icon: Icon, tone = 'dark', size = 'md', footer, note, children }: ModalProps) {
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!open) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;
        const panel = panelRef.current;
        const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
        first?.focus();

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (event.key !== 'Tab' || !panel) return;
            const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (items.length === 0) return;
            const firstItem = items[0]!;
            const lastItem = items[items.length - 1]!;
            if (event.shiftKey && document.activeElement === firstItem) {
                event.preventDefault();
                lastItem.focus();
            } else if (!event.shiftKey && document.activeElement === lastItem) {
                event.preventDefault();
                firstItem.focus();
            }
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, [open]);

    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ebene/45 p-2.5 backdrop-blur-sm sm:p-6"
            onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={`flex max-h-[calc(100vh-20px)] w-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-20px_rgba(26,26,26,0.35)] sm:max-h-[calc(100vh-48px)] ${size === 'lg' ? 'max-w-[760px]' : 'max-w-[560px]'}`}
            >
                <div className="flex items-center gap-3 border-b border-line-soft bg-linear-to-b from-sable to-white px-5 py-4">
                    <span className={`inline-flex size-[38px] shrink-0 items-center justify-center rounded-[11px] ${ICON_TONES[tone]}`}>
                        <Icon aria-hidden="true" className="size-[19px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 id={titleId} className="text-base font-bold">
                            {title}
                        </h2>
                        {subtitle && <p className="mt-px truncate text-xs text-ink-2">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fermer la fenêtre"
                        className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-transparent text-ink-2 hover:border-line hover:bg-sable hover:text-or-brun"
                    >
                        <X aria-hidden="true" className="size-4" />
                    </button>
                </div>

                <div className="overflow-auto px-5 py-[18px]">{children}</div>

                {(footer || note) && (
                    <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line-soft bg-naturel px-5 py-3.5">
                        {note && <p className="mr-auto min-w-0 flex-1 basis-48 text-[11.5px] text-ink-3">{note}</p>}
                        {footer && <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-2.5">{footer}</div>}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
