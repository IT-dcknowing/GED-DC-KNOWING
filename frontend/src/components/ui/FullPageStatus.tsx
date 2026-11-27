import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

/** Écran plein (chargement initial, erreur bloquante). */
export function FullPageStatus({ title, children }: { title?: string; children?: ReactNode }) {
    return (
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
            <div className="w-full max-w-md text-center">
                {title ? (
                    <>
                        <h1 className="text-xl font-extrabold">{title}</h1>
                        <div className="mt-3 text-sm text-ink-2">{children}</div>
                    </>
                ) : (
                    <p className="inline-flex items-center gap-2 text-sm text-ink-2" role="status">
                        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                        Chargement
                    </p>
                )}
            </div>
        </main>
    );
}
