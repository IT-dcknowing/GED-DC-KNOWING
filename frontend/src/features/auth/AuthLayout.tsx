import { Archive, FolderTree, Stamp, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { BrandMark } from '@/components/ui/BrandMark';

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
    {
        icon: FolderTree,
        title: 'Arborescence normalisée',
        text: 'Espaces cabinet et clients, dossiers permanents et exercices annuels.',
    },
    {
        icon: Stamp,
        title: 'Validations tracées',
        text: 'Dépôt, vérification, approbation ou rejet motivé, historique conservé.',
    },
    {
        icon: Archive,
        title: 'Archives contrôlées',
        text: 'Proposition, confirmation manuelle, lecture seule et réouverture motivée.',
    },
];

type AuthLayoutProps = {
    title: string;
    subtitle: string;
    children: ReactNode;
};

/**
 * Mise en page des écrans d'authentification, reprise de la page de connexion de la maquette
 * (.login-wrap) : panneau ébène à gauche (1,06 fr), carte blanche sur fond beige à droite (1 fr),
 * colonnes empilées sous 940 px.
 */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
    return (
        // Sous 940 px : le panneau de marque garde sa hauteur naturelle, le formulaire prend le reste.
        <div className="grid min-h-screen grid-cols-1 grid-rows-[auto_1fr] min-[941px]:grid-cols-[1.06fr_1fr] min-[941px]:grid-rows-1">
            {/* Panneau de marque (.login-brand) */}
            <section
                aria-label="DC-KNOWING, gestion électronique des documents"
                className="bg-wood relative flex flex-col overflow-hidden px-[26px] pt-[30px] pb-[34px] min-[941px]:px-[54px] min-[941px]:py-[46px]"
            >
                {/* Cercle doré (repris de l'arborescence de référence) */}
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-[120px] -right-[120px] size-[420px] rounded-full border border-or/22 shadow-[0_0_0_40px_rgba(201,162,39,0.05),0_0_0_90px_rgba(201,162,39,0.03)]"
                />

                <div className="relative z-10 flex items-center gap-[13px]">
                    <BrandMark size="lg" />
                    <div className="min-w-0">
                        <p className="font-display text-[19px] font-extrabold tracking-[0.4px] whitespace-nowrap text-[#f6efdd]">
                            DC-KNOWING
                        </p>
                        <p className="text-[10.5px] tracking-[1.6px] whitespace-nowrap text-contour uppercase">GED · CGA</p>
                    </div>
                </div>

                <div className="relative z-10 my-[26px] mb-2.5 max-w-[480px] min-[941px]:my-auto">
                    <h1 className="font-display text-2xl leading-[1.2] font-extrabold tracking-[-0.4px] text-[#f8f1dc] min-[941px]:text-[32px]">
                        Gestion Électronique
                        <br />
                        des Documents
                        <br />
                        <em className="text-or-clair not-italic">édition cabinet</em>
                    </h1>
                    <p className="mt-3 text-[14.5px] leading-[1.65] text-[#b7ad92]">
                        Centraliser, classer, contrôler et archiver les documents du cabinet et de ses clients, dans une
                        arborescence unique et sécurisée.
                    </p>

                    <ul className="mt-[30px] hidden flex-col gap-3.5 min-[941px]:flex">
                        {FEATURES.map(({ icon: Icon, title: featureTitle, text }) => (
                            <li key={featureTitle} className="flex items-start gap-[13px]">
                                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-or/30 bg-or/13 text-or-clair">
                                    <Icon aria-hidden="true" className="size-4" />
                                </span>
                                <div>
                                    <p className="text-[13.5px] font-semibold text-[#efe7d0]">{featureTitle}</p>
                                    <p className="text-xs text-[#a79d83]">{text}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative z-10 text-[11.5px] text-[#8d8468]">
                    DC-KNOWING CGA · Accès réservé aux personnes autorisées
                </p>
            </section>

            {/* Formulaire (.login-form-side) */}
            <main className="flex items-center justify-center bg-naturel px-6 py-10">
                <div className="w-full max-w-[420px]">
                    <div className="rounded-[18px] border border-line-soft bg-white px-7 pt-[30px] pb-[26px] shadow-[0_1px_2px_rgba(26,26,26,0.05),0_2px_8px_-4px_rgba(26,26,26,0.08)]">
                        <h2 className="text-xl font-extrabold">{title}</h2>
                        <p className="mt-1.5 mb-[22px] text-[13px] text-ink-2">{subtitle}</p>
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
