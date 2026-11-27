import { Link } from 'react-router';

export function NotFoundPage() {
    return (
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
            <div className="w-full max-w-md text-center">
                <p className="text-sm font-semibold text-or-brun">Erreur 404</p>
                <h1 className="mt-2 text-xl font-extrabold">Page introuvable</h1>
                <p className="mt-2 text-sm text-ink-2">
                    L'adresse demandée ne correspond à aucune page de l'application.
                </p>
                <Link
                    to="/"
                    className="mt-6 inline-flex h-9 items-center rounded-lg bg-or px-4 text-sm font-semibold text-ebene hover:bg-[#b8921f]"
                >
                    Retour à l'accueil
                </Link>
            </div>
        </main>
    );
}
