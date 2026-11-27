import { CircleAlert, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    subtitle?: string;
    children: ReactNode;
    confirmLabel: string;
    danger?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

/** Demande de confirmation avant une action importante (maquette : confirmDialog). */
export function ConfirmDialog({ open, title, subtitle, children, confirmLabel, danger = false, loading = false, onConfirm, onCancel }: ConfirmDialogProps) {
    return (
        <Modal
            open={open}
            onClose={onCancel}
            title={title}
            subtitle={subtitle}
            icon={danger ? TriangleAlert : CircleAlert}
            tone={danger ? 'danger' : 'gold'}
            footer={
                <>
                    <Button variant="secondary" onClick={onCancel} disabled={loading}>
                        Annuler
                    </Button>
                    <Button
                        variant={danger ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        loading={loading}
                        data-autofocus
                    >
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <div className="text-[13.5px] leading-relaxed text-ink-2">{children}</div>
        </Modal>
    );
}
