import { useQuery } from '@tanstack/react-query';
import { CircleCheck, CircleX, LoaderCircle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { fetchHealth } from '@/api/health';

type CheckState = 'loading' | 'ok' | 'failed';

/**
 * Page technique provisoire : vérifie la liaison entre l'interface React,
 * l'API Laravel et la base MySQL. Elle sera remplacée par l'écran de connexion.
 */
export function EnvironmentStatusPage() {
    const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth });

    const apiState: CheckState = health.isPending ? 'loading' : health.isError ? 'failed' : 'ok';
    const databaseState: CheckState = health.isPending
        ? 'loading'
        : health.data?.database === 'ok'
          ? 'ok'
          : 'failed';

    return (
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
            <div className="w-full max-w-md rounded-xl border border-line-soft bg-white p-6 shadow-sm">
                <h1 className="text-xl font-extrabold">GED DC-KNOWING</h1>
                <p className="mt-1 text-sm text-ink-2">
                    Page technique provisoire. Elle vérifie que l'interface communique avec l'API et la base de
                    données.
                </p>

                <ul className="mt-5 divide-y divide-line-soft border-y border-line-soft" aria-live="polite">
                    <CheckRow label="API Laravel" state={apiState} />
                    <CheckRow label="Base de données" state={databaseState} />
                </ul>

                {health.isError && (
                    <p className="mt-4 text-sm text-danger" role="alert">
                        L'API ne répond pas. Vérifiez que le serveur Laravel est démarré sur le port 8004.
                    </p>
                )}

                <button
                    type="button"
                    onClick={() => void health.refetch()}
                    disabled={health.isFetching}
                    className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-sm font-semibold text-ink hover:border-contour hover:bg-sable disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <RefreshCw aria-hidden="true" className="size-4" />
                    Relancer la vérification
                </button>
            </div>
        </main>
    );
}

const STATE_LABEL: Record<CheckState, string> = {
    loading: 'Vérification en cours',
    ok: 'Opérationnelle',
    failed: 'Indisponible',
};

const STATE_ICON: Record<CheckState, ReactNode> = {
    loading: <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-ink-3" />,
    ok: <CircleCheck aria-hidden="true" className="size-4 text-ok" />,
    failed: <CircleX aria-hidden="true" className="size-4 text-danger" />,
};

function CheckRow({ label, state }: { label: string; state: CheckState }) {
    return (
        <li className="flex items-center justify-between gap-4 py-3 text-sm">
            <span className="font-medium text-ebene">{label}</span>
            <span className="inline-flex items-center gap-2 text-ink-2">
                {STATE_ICON[state]}
                {STATE_LABEL[state]}
            </span>
        </li>
    );
}
