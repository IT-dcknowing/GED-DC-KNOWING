import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/Button';

type PaginationProps = {
    page: number;
    lastPage: number;
    total: number;
    from: number | null;
    to: number | null;
    /** Nom des éléments au pluriel, ex. « comptes ». */
    itemsLabel: string;
    onPageChange: (page: number) => void;
};

export function Pagination({ page, lastPage, total, from, to, itemsLabel, onPageChange }: PaginationProps) {
    return (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-3">
            <p className="text-xs text-ink-3">
                {total === 0 ? `Aucun élément` : `${from ?? 0} à ${to ?? 0} sur ${total} ${itemsLabel}`}
            </p>
            {lastPage > 1 && (
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                        icon={<ChevronLeft aria-hidden="true" className="size-3.5" />}
                    >
                        Précédente
                    </Button>
                    <span className="text-xs text-ink-2" aria-current="page">
                        Page {page} sur {lastPage}
                    </span>
                    <Button variant="secondary" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= lastPage}>
                        Suivante
                        <ChevronRight aria-hidden="true" className="size-3.5" />
                    </Button>
                </div>
            )}
        </nav>
    );
}
