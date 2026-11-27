import { Building2, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiErrorMessage } from '@/api/client';
import { canManageClients, type Client, type ClientFilters } from '@/api/clients';
import { FormAlert } from '@/components/form/FormAlert';
import { Select } from '@/components/form/SelectField';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { useCurrentUser } from '@/features/auth/useAuth';
import { ClientDetailsDialog } from '@/features/clients/ClientDetailsDialog';
import { ClientFormDialog } from '@/features/clients/ClientFormDialog';
import { ClientsTable } from '@/features/clients/ClientsTable';
import { useClients } from '@/features/clients/useClientsModule';

/** Module « Clients » (maquette : vClients, lot 2.1). */
export function ClientsPage() {
    const toast = useToast();
    const { data: me } = useCurrentUser();
    const canManage = canManageClients(me);

    const [searchInput, setSearchInput] = useState('');
    const [filters, setFilters] = useState<ClientFilters>({ search: '', department: '', page: 1 });
    const clients = useClients(filters);

    // Fenêtres : undefined = fermée.
    const [detailsId, setDetailsId] = useState<number | null>(null);
    const [formClient, setFormClient] = useState<Client | null | undefined>(undefined);

    // Recherche appliquée 300 ms après la dernière frappe.
    useEffect(() => {
        const timer = setTimeout(
            () => setFilters((current) => (current.search === searchInput.trim() ? current : { ...current, search: searchInput.trim(), page: 1 })),
            300,
        );

        return () => clearTimeout(timer);
    }, [searchInput]);

    const rows = clients.data?.data ?? [];
    const meta = clients.data?.meta;
    const departments = clients.data?.departments ?? [];
    const restrictedProfile = me?.role?.key === 'stagiaire' || me?.role?.key === 'auditeur';
    const filtered = filters.search !== '' || filters.department !== '';

    return (
        <div>
            <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-[-0.2px]">Clients</h1>
                    <p className="mt-[3px] max-w-[680px] text-[13px] text-ink-2">
                        Un seul dossier principal par client (RG-03), partagé entre les départements autorisés (RG-07).
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {meta && <Badge tone="sable">{`${meta.total} client${meta.total > 1 ? 's' : ''} au total`}</Badge>}
                    {canManage && (
                        <Button onClick={() => setFormClient(null)} icon={<Plus aria-hidden="true" className="size-[15px]" />}>
                            Ajouter un client
                        </Button>
                    )}
                </div>
            </div>

            <section
                aria-label="Référentiel clients"
                className="rounded-xl border border-line-soft bg-white shadow-[0_1px_2px_rgba(26,26,26,0.05),0_2px_8px_-4px_rgba(26,26,26,0.08)]"
            >
                <div className="flex flex-wrap gap-2.5 border-b border-line-soft px-3.5 py-3">
                    <div className="relative min-w-[220px] flex-1">
                        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-[11px] size-[14px] -translate-y-1/2 text-ink-3" />
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Rechercher un client (nom, code, secteur, contact)"
                            aria-label="Rechercher un client"
                            className="h-[38px] w-full rounded-[9px] border border-line bg-white pr-3 pl-[34px] text-[13.5px] placeholder:text-ink-3 focus:border-or focus:shadow-[0_0_0_3px_rgba(201,162,39,0.14)] focus:outline-none"
                        />
                    </div>
                    <Select
                        aria-label="Filtrer par département"
                        className="w-full sm:w-60"
                        value={filters.department ?? ''}
                        onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value, page: 1 }))}
                    >
                        <option value="">Tous les départements</option>
                        {departments.map((department) => (
                            <option key={department.id} value={String(department.id)}>
                                {department.name}
                            </option>
                        ))}
                    </Select>
                </div>

                {clients.isError && (
                    <div className="p-4">
                        <FormAlert tone="error">{apiErrorMessage(clients.error)}</FormAlert>
                        <Button variant="secondary" onClick={() => void clients.refetch()}>
                            Réessayer
                        </Button>
                    </div>
                )}

                {clients.isPending && (
                    <p className="px-4 py-10 text-center text-sm text-ink-3" role="status">
                        Chargement des clients
                    </p>
                )}

                {clients.data && rows.length === 0 && (
                    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                        <span className="mb-2 flex size-16 items-center justify-center rounded-[18px] border border-dashed border-contour bg-linear-135 from-sable to-naturel text-or">
                            <Building2 aria-hidden="true" className="size-7" />
                        </span>
                        <h2 className="text-[15px] font-bold">Aucun client</h2>
                        <p className="max-w-[440px] text-[12.5px] text-ink-2">
                            {restrictedProfile
                                ? 'Votre profil ne donne pas encore accès au référentiel clients. Les autorisations seront gérées dans un prochain lot.'
                                : filtered
                                  ? 'Aucun client ne correspond à votre recherche ou aux filtres choisis.'
                                  : canManage
                                    ? 'Aucun client n’a encore été créé. Ajoutez le premier client et ses départements de suivi.'
                                    : 'Aucun client n’est encore enregistré dans votre périmètre.'}
                        </p>
                    </div>
                )}

                {rows.length > 0 && (
                    <>
                        <ClientsTable
                            clients={rows}
                            canManage={canManage}
                            onOpen={(client) => setDetailsId(client.id)}
                            onEdit={(client) => setFormClient(client)}
                        />
                        {meta && (
                            <Pagination
                                page={meta.current_page}
                                lastPage={meta.last_page}
                                total={meta.total}
                                from={meta.from}
                                to={meta.to}
                                itemsLabel="clients"
                                onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
                            />
                        )}
                    </>
                )}
            </section>

            <div className="mt-3.5 flex gap-2 rounded-xl border border-contour/60 bg-sable px-3.5 py-2.5 text-[12.5px] text-ink-2">
                <span>
                    <strong className="font-semibold text-ebene">Dossier documentaire :</strong> la création d’un client générera son
                    dossier à partir du modèle <span className="font-mono text-[11.5px]">_MODELE_DOSSIER_CLIENT</span> (A_PERMANENT et
                    B_EXERCICES), avec le module Documents.
                </span>
            </div>

            <ClientDetailsDialog
                clientId={detailsId}
                canManage={canManage}
                onClose={() => setDetailsId(null)}
                onEdit={(client) => {
                    setDetailsId(null);
                    setFormClient(client);
                }}
            />

            <ClientFormDialog
                client={formClient}
                departments={departments}
                onClose={() => setFormClient(undefined)}
                onSaved={(client, created) => {
                    setFormClient(undefined);
                    toast({
                        tone: 'success',
                        title: created ? 'Client créé' : 'Client modifié',
                        message: created ? `${client.code} · ${client.name}` : client.name,
                    });
                }}
            />
        </div>
    );
}
