import { CircleCheck, CircleX, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Tone = 'success' | 'error' | 'info';
type ToastInput = { tone: Tone; title: string; message?: string };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<(toast: ToastInput) => void>(() => undefined);

const DURATION_MS = 4600;

const TONES: Record<Tone, { border: string; icon: ReactNode }> = {
    success: { border: 'border-l-[#7db98a]', icon: <CircleCheck aria-hidden="true" className="mt-px size-[18px] shrink-0 text-[#7db98a]" /> },
    error: { border: 'border-l-[#e08573]', icon: <CircleX aria-hidden="true" className="mt-px size-[18px] shrink-0 text-[#e08573]" /> },
    info: { border: 'border-l-or-clair', icon: <Info aria-hidden="true" className="mt-px size-[18px] shrink-0 text-or-clair" /> },
};

/** Notifications temporaires de la maquette (#toast-root) : en haut à droite, fond ébène. */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([]);
    const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

    const dismiss = useCallback((id: number) => {
        setItems((current) => current.filter((item) => item.id !== id));
        clearTimeout(timers.current.get(id));
        timers.current.delete(id);
    }, []);

    const push = useCallback(
        (toast: ToastInput) => {
            const id = Date.now() + Math.random();
            setItems((current) => [...current, { ...toast, id }]);
            timers.current.set(id, setTimeout(() => dismiss(id), DURATION_MS));
        },
        [dismiss],
    );

    useEffect(() => {
        const pending = timers.current;

        return () => pending.forEach(clearTimeout);
    }, []);

    return (
        <ToastContext.Provider value={push}>
            {children}
            <div aria-live="polite" className="pointer-events-none fixed top-[70px] right-4 z-[200] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2.5">
                {items.map((item) => (
                    <div
                        key={item.id}
                        role={item.tone === 'error' ? 'alert' : 'status'}
                        className={`pointer-events-auto flex items-start gap-[11px] rounded-[13px] border border-l-[3px] border-contour/25 bg-ebene/95 px-3.5 py-3 text-[#f1e9d2] shadow-[0_24px_60px_-20px_rgba(26,26,26,0.35)] ${TONES[item.tone].border}`}
                    >
                        {TONES[item.tone].icon}
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-bold text-[#f8f1dc]">{item.title}</p>
                            {item.message && <p className="mt-px text-xs leading-snug text-[#cbc2ab]">{item.message}</p>}
                        </div>
                        <button
                            type="button"
                            onClick={() => dismiss(item.id)}
                            aria-label="Fermer la notification"
                            className="text-[#cbc2ab] hover:text-white"
                        >
                            <X aria-hidden="true" className="size-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
