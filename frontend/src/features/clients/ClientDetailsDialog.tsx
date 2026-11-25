import { Building2, CalendarDays, FileText, Layers, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

import { apiErrorMessage } from '@/api/client';
import type { Client } from '@/api/clients';
import { FormAlert } from '@/components/form/FormAlert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useClient } from '@/features/clients/useClientsModule';
import { formatDate, formatDateTime } from '@/lib/format';

type ClientDetailsDialogProps = {
    clientId: number | null;
    canManage: boolean;
    onClose: () => void;
    onEdit: (client: Client) => void;
};

function Row({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
    return (
        <div className={`border-b border-line-soft py-2${wide ? ' sm:col-span-2' : ''}`}>
            <dt className="text-[10.5px] font-bold tracking-[1px] text-ink-3 uppercase">{label}</dt>
            <dd className="mt-0.5 text-[13px] font-semibold break-words text-ebene">{children}</dd>
        </div>
    );
}

function Empty({ children }: { children: ReactNode }) {
    return <p className="rounded-[10px] border border-dashed border-line bg-naturel/60 px-3 py-2.5 text-[12.5px] text-ink-2">{children}</p>;
}

/** Fiche d'un client (maquette : openClientDrawer, lot 2.1). */
export function ClientDetailsDialog({ clientId, canManage, onClose, onEdit }: ClientDetailsDialogProps) {
    const { data: client, isPending, isError, error } = useClient(clientId);

    const since = client?.started_on ? formatDate(client.started_on) : null;

    return (
        <Modal
            open={clientId !== null}
            onClose={onClose}
            icon={Building2}
            tone="gold"
            size="lg"
            title={client ? client.name : 'Client'}
            subtitle={
                client
                    ? `${client.code} · ${client.sector ?? 'Secteur non renseigné'}${since ? ` · client depuis le ${since}` : ''}`
                    : undefined
            }
            footer={
                canManage && client ? (
                    <Button onClick={() => onEdit(client)} icon={<Pencil aria-hidden="true" className="size-4" />}>
                        Modifier
                    </Button>
                ) : undefined
            }
        >
            {isPending && (
                <p className="text-sm text-ink-3" role="status">
                    Chargement du client
                </p>
            )}
            {isError && <FormAlert tone="error">{apiErrorMessage(error)}</FormAlert>}

            {client && (
                <>
                    <dl className="grid gap-x-[18px] sm:grid-cols-2">
                        <Row label="Forme juridique">{client.legal_form ?? 'Non renseignée'}</Row>
                        <Row label="Régime fiscal">{client.tax_regime ?? 'Non renseigné'}</Row>
                        <Row label="RCCM">{client.rccm ?? 'Non renseigné'}</Row>
                        <Row label="Numéro DFÉ">{client.dfe ?? 'Non renseigné'}</Row>
                        <Row label="Adresse" wide>
                            {client.address ?? 'Non renseignée'}
                        </Row>
                        <Row label="Téléphone">{client.phone ?? 'Non renseigné'}</Row>
                        <Row label="E-mail">
                            {client.email ? (
                                <a href={`mailto:${client.email}`} className="text-or-brun underline-offset-2 hover:underline">
                                    {client.email}
                                </a>
                            ) : (
                                'Non renseigné'
                            )}
                        </Row>
                        <Row label="Contact dirigeant">{client.contact_name ?? 'Non renseigné'}</Row>
                        <Row label="Documents">
                            {client.documents_count ?? '—'}
                            {client.documents_count === null && (
                                <span className="block text-xs font-normal text-ink-3">Disponible avec le module Documents</span>
                            )}
                        </Row>
                        <Row label="Création">
                            {client.created_at ? formatDateTime(client.created_at) : 'Date inconnue'}
                            <span className="block text-xs font-normal text-ink-2">
                                {client.created_by ? `Par ${client.created_by.name}` : 'Hors de l’interface'}
                            </span>
                        </Row>
                    </dl>

                    <h3 className="mt-5 mb-2 flex items-center gap-2 text-[11px] font-extrabold tracking-[1px] text-ebene uppercase">
                        <Building2 aria-hidden="true" className="size-[13px] text-or-brun" />
                        Départements associés (dossier partagé)
                    </h3>
                    {(client.departments ?? []).length === 0 ? (
                        <Empty>Aucun département n’est associé à ce client.</Empty>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {client.departments?.map((department) => (
                                <Badge key={department.id} tone="sable" title={department.code}>
                                    {department.name}
                                </Badge>
                            ))}
                        </div>
                    )}

                    <h3 className="mt-5 mb-2 flex items-center gap-2 text-[11px] font-extrabold tracking-[1px] text-ebene uppercase">
                        <Layers aria-hidden="true" className="size-[13px] text-or-brun" />
                        Exercices annuels
                    </h3>
                    <Empty>
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays aria-hidden="true" className="size-3.5 text-or-brun" />
                            Les exercices annuels seront gérés avec le module Exercices.
                        </span>
                    </Empty>

                    <h3 className="mt-5 mb-2 flex items-center gap-2 text-[11px] font-extrabold tracking-[1px] text-ebene uppercase">
                        <FileText aria-hidden="true" className="size-[13px] text-or-brun" />
                        Derniers documents
                    </h3>
                    <Empty>Les documents de ce client apparaîtront ici avec le module Documents.</Empty>
                </>
            )}
        </Modal>
    );
}
