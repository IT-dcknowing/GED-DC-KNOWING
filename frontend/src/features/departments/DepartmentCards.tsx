import { Briefcase } from 'lucide-react';

import type { Department } from '@/api/departments';
import { Badge } from '@/components/ui/Badge';

type DepartmentCardsProps = {
    departments: Department[];
    onOpen: (department: Department) => void;
};

/**
 * Cartes des départements (maquette : vDepartments). Chaque carte est un bouton, utilisable au clavier
 * (défaut DEF-12 de la maquette corrigé). Clients, documents et activité ne sont pas affichés tant
 * que les modules correspondants n'existent pas (décision D8).
 */
export function DepartmentCards({ departments, onOpen }: DepartmentCardsProps) {
    return (
        <ul className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {departments.map((department) => (
                <li key={department.id}>
                    <button
                        type="button"
                        onClick={() => onOpen(department)}
                        aria-label={`Détail du département ${department.name}`}
                        className="flex h-full w-full flex-col gap-3.5 rounded-xl border border-line-soft bg-white p-4 text-left shadow-[0_1px_2px_rgba(26,26,26,0.05),0_2px_8px_-4px_rgba(26,26,26,0.08)] transition-colors hover:border-contour focus-visible:border-or focus-visible:shadow-[0_0_0_3px_rgba(201,162,39,0.18)] focus-visible:outline-none"
                    >
                        <span className="flex items-start gap-[11px]">
                            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-ebene text-or-clair">
                                <Briefcase aria-hidden="true" className="size-[19px]" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[14px] font-bold text-ebene">{department.name}</span>
                                    {!department.is_active && <Badge tone="grey">Désactivé</Badge>}
                                </span>
                                <span className="mt-0.5 block font-mono text-[11px] text-ink-3">{department.code}</span>
                                <span className="mt-1 block text-[12px] text-ink-2">
                                    {department.manager ? `Responsable : ${department.manager.name}` : 'Aucun responsable désigné'}
                                </span>
                            </span>
                        </span>

                        <span className="mt-auto flex items-baseline gap-1.5 rounded-[10px] border border-line-soft bg-naturel px-3 py-2">
                            <span className="text-[18px] font-extrabold text-ebene">{department.active_members_count}</span>
                            <span className="text-[11.5px] text-ink-2">
                                collaborateur{department.active_members_count > 1 ? 's' : ''} actif{department.active_members_count > 1 ? 's' : ''}
                            </span>
                        </span>
                    </button>
                </li>
            ))}
        </ul>
    );
}
