import { Eye, Pencil } from 'lucide-react';

import type { Client } from '@/api/clients';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/format';

type ClientsTableProps = {
    clients: Client[];
    canManage: boolean;
    onOpen: (client: Client) => void;
    onEdit: (client: Client) => void;
};

const headerClass =
    'sticky top-0 border-b border-line bg-linear-to-b from-[#fffefa] to-naturel px-3 py-2.5 text-left text-[10.5px] font-bold tracking-[1.2px] whitespace-nowrap text-ink-3 uppercase';
const iconButton =
    'inline-flex size-[30px] items-center justify-center rounded-lg border border-transparent text-ink-2 hover:border-line hover:bg-sable hover:text-or-brun';

/** « Client depuis 2026 », à partir de la date de démarrage ou, à défaut, de création. */
function clientSince(client: Client): string | null {
    const iso = client.started_on ?? client.created_at;
    return iso ? iso.slice(0, 4) : null;
}

/** Tableau des clients (maquette : vClients, lot 2.1). */
export function ClientsTable({ clients, canManage, onOpen, onEdit }: ClientsTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
                <thead>
                    <tr>
                        <th scope="col" className={headerClass}>
                            Code
                        </th>
                        <th scope="col" className={headerClass}>
                            Client
                        </th>
                        <th scope="col" className={headerClass}>
                            Départements associés
                        </th>
                        <th scope="col" className={`${headerClass} text-right`}>
                            Documents
                        </th>
                        <th scope="col" className={`${headerClass} text-right`}>
                            Dernière activité
                        </th>
                        <th scope="col" className={`${headerClass} text-right`}>
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {clients.map((client) => {
                        const since = clientSince(client);
                        const details = [client.sector, client.legal_form, since ? `client depuis ${since}` : null].filter(Boolean);

                        return (
                            <tr key={client.id} className="border-b border-line-soft last:border-b-0 hover:bg-sable/45">
                                <td className="px-3 py-2.5 align-top whitespace-nowrap">
                                    <span className="inline-flex rounded-[7px] border border-contour/70 bg-sable px-2 py-[3px] font-mono text-[11.5px] font-bold tracking-[0.3px] text-or-brun">
                                        {client.code}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 align-top">
                                    <button
                                        type="button"
                                        onClick={() => onOpen(client)}
                                        className="text-left text-[13.5px] font-semibold text-ebene underline-offset-2 hover:text-or-brun hover:underline"
                                    >
                                        {client.name}
                                    </button>
                                    {details.length > 0 && <span className="mt-0.5 block text-[11.5px] text-ink-3">{details.join(' · ')}</span>}
                                    {client.email && <span className="mt-0.5 block text-[11.5px] text-ink-3">{client.email}</span>}
                                </td>
                                <td className="px-3 py-2.5 align-top">
                                    <span className="flex flex-wrap gap-1">
                                        {(client.departments ?? []).length === 0 ? (
                                            <span className="text-[12px] text-ink-3">Aucun département</span>
                                        ) : (
                                            client.departments?.map((department) => (
                                                <Badge key={department.id} tone="sable" title={department.code}>
                                                    {department.name}
                                                </Badge>
                                            ))
                                        )}
                                    </span>
                                </td>
                                <td
                                    className="px-3 py-2.5 text-right align-top text-[12.5px] text-ink-2 tabular-nums"
                                    title={client.documents_count === null ? 'Disponible avec le module Documents' : undefined}
                                >
                                    {client.documents_count ?? '—'}
                                </td>
                                <td
                                    className="px-3 py-2.5 text-right align-top text-[12px] whitespace-nowrap text-ink-2"
                                    title={client.last_activity_at === null ? 'Disponible avec le module Documents' : undefined}
                                >
                                    {client.last_activity_at ? formatDateTime(client.last_activity_at) : '—'}
                                </td>
                                <td className="px-3 py-2.5 text-right align-top whitespace-nowrap">
                                    <span className="inline-flex items-center gap-0.5">
                                        <button
                                            type="button"
                                            onClick={() => onOpen(client)}
                                            aria-label={`Ouvrir la fiche de ${client.name}`}
                                            title="Fiche client"
                                            className={iconButton}
                                        >
                                            <Eye aria-hidden="true" className="size-[15px]" />
                                        </button>
                                        {canManage && (
                                            <button
                                                type="button"
                                                onClick={() => onEdit(client)}
                                                aria-label={`Modifier ${client.name}`}
                                                title="Modifier"
                                                className={iconButton}
                                            >
                                                <Pencil aria-hidden="true" className="size-[15px]" />
                                            </button>
                                        )}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
