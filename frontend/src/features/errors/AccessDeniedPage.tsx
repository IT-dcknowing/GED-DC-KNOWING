import { Lock } from 'lucide-react';
import { Link } from 'react-router';

import { useCurrentUser } from '@/features/auth/useAuth';

/**
 * AUTH-04 : accès refusé. Affiché quand le profil ne dispose pas de la permission requise.
 * Le serveur refuse de son côté toute requête non autorisée (règle E4) : cet écran n'est qu'une information.
 */
export function AccessDeniedPage() {
    const { data: user } = useCurrentUser();

    return (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-[52px] text-center">
            <span className="mb-2 flex size-16 items-center justify-center rounded-[18px] border border-dashed border-contour bg-linear-135 from-sable to-naturel text-or">
                <Lock aria-hidden="true" className="size-7" />
            </span>
            <p className="text-sm font-semibold text-or-brun">Erreur 403</p>
            <h1 className="text-xl font-extrabold">Accès refusé</h1>
            <p className="max-w-[420px] text-[13px] leading-relaxed text-ink-2">
                Votre profil{user?.role ? ` (${user.role.label})` : ''} ne dispose pas des autorisations nécessaires pour
                accéder à cette page. Si vous pensez qu'il s'agit d'une erreur, contactez l'administrateur de la GED.
            </p>
            <Link
                to="/"
                className="mt-2.5 inline-flex h-9 items-center rounded-[10px] bg-or px-3.5 text-[13px] font-semibold text-ebene shadow-[0_2px_10px_-4px_rgba(201,162,39,0.7)] hover:bg-[#b8921f]"
            >
                Retour à l'accueil
            </Link>
        </div>
    );
}
