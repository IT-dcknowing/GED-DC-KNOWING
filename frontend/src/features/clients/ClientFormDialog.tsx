import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Building2, FileText, Hash, Mail, MapPin, Phone, Save, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
    LEGAL_FORMS,
    TAX_REGIMES,
    type Client,
    type ClientDepartment,
    type ClientPayload,
} from '@/api/clients';
import { FormAlert } from '@/components/form/FormAlert';
import { IconInput } from '@/components/form/IconInput';
import { SelectField } from '@/components/form/SelectField';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useCreateClient, useUpdateClient } from '@/features/clients/useClientsModule';
import { applyServerErrors } from '@/lib/serverErrors';

// C1 : dénomination (3 caractères minimum) et au moins un département. Les autres champs restent facultatifs.
const schema = z.object({
    name: z
        .string()
        .trim()
        .min(3, 'Saisissez la dénomination du client (3 caractères minimum).')
        .max(160, 'La dénomination ne peut pas dépasser 160 caractères.')
        .transform((value) => value.toUpperCase()),
    legal_form: z.string().max(30, 'Forme juridique trop longue.'),
    sector: z.string().trim().max(120, 'Secteur trop long (120 caractères maximum).'),
    tax_regime: z.string().max(40, 'Régime fiscal trop long.'),
    rccm: z.string().trim().max(60, 'RCCM trop long (60 caractères maximum).'),
    dfe: z.string().trim().max(60, 'Numéro DFÉ trop long (60 caractères maximum).'),
    address: z.string().trim().max(255, 'Adresse trop longue (255 caractères maximum).'),
    phone: z.string().trim().max(40, 'Téléphone trop long (40 caractères maximum).'),
    email: z.union([z.literal(''), z.string().trim().pipe(z.email('Cette adresse e-mail n’est pas valide.'))]),
    contact_name: z.string().trim().max(120, 'Nom du contact trop long (120 caractères maximum).'),
    department_ids: z.array(z.string()).min(1, 'Sélectionnez au moins un département de suivi (RG-02).'),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const FIELDS = [
    'name',
    'legal_form',
    'sector',
    'tax_regime',
    'rccm',
    'dfe',
    'address',
    'phone',
    'email',
    'contact_name',
    'department_ids',
] as const;

type ClientFormDialogProps = {
    /** undefined : fenêtre fermée ; null : création ; client : modification. */
    client: Client | null | undefined;
    /** Départements proposés (actifs et visibles par le compte). */
    departments: ClientDepartment[];
    onClose: () => void;
    onSaved: (client: Client, created: boolean) => void;
};

function blankToNull(value: string): string | null {
    return value.trim() === '' ? null : value.trim();
}

/** Création ou modification d'un client (maquette : openClientModal, lot 2.1). */
export function ClientFormDialog({ client, departments, onClose, onSaved }: ClientFormDialogProps) {
    const open = client !== undefined;
    const editing = client ?? null;

    const createMutation = useCreateClient();
    const updateMutation = useUpdateClient();
    const [serverError, setServerError] = useState<string | null>(null);

    // Les départements déjà associés mais sortis de la liste visible restent proposés : aucune association n'est perdue en silence.
    const options = [
        ...departments,
        ...(editing?.departments ?? []).filter((current) => !departments.some((department) => department.id === current.id)),
    ];

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(schema) });

    useEffect(() => {
        if (!open) return;
        setServerError(null);
        reset({
            name: editing?.name ?? '',
            legal_form: editing ? (editing.legal_form ?? '') : 'SARL',
            sector: editing?.sector ?? '',
            tax_regime: editing ? (editing.tax_regime ?? '') : 'Réel normal',
            rccm: editing?.rccm ?? '',
            dfe: editing?.dfe ?? '',
            address: editing?.address ?? '',
            phone: editing?.phone ?? '',
            email: editing?.email ?? '',
            contact_name: editing?.contact_name ?? '',
            department_ids: (editing?.departments ?? []).map((department) => String(department.id)),
        });
    }, [open, editing, reset]);

    const pending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = handleSubmit((values) => {
        setServerError(null);
        const payload: ClientPayload = {
            name: values.name,
            legal_form: blankToNull(values.legal_form),
            sector: blankToNull(values.sector),
            tax_regime: blankToNull(values.tax_regime),
            rccm: blankToNull(values.rccm),
            dfe: blankToNull(values.dfe),
            address: blankToNull(values.address),
            phone: blankToNull(values.phone),
            email: blankToNull(values.email),
            contact_name: blankToNull(values.contact_name),
            department_ids: values.department_ids.map(Number),
        };
        const onError = (error: unknown) => setServerError(applyServerErrors(error, setError, FIELDS));

        if (editing) {
            updateMutation.mutate({ id: editing.id, payload }, { onSuccess: (saved) => onSaved(saved, false), onError });
        } else {
            createMutation.mutate(payload, { onSuccess: (saved) => onSaved(saved, true), onError });
        }
    });

    return (
        <Modal
            open={open}
            onClose={onClose}
            icon={Building2}
            tone="gold"
            size="lg"
            title={editing ? 'Modifier le client' : 'Nouveau client'}
            subtitle={editing ? `${editing.code} · ${editing.name}` : 'Le code client sera généré automatiquement'}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={pending}>
                        Annuler
                    </Button>
                    <Button type="submit" form="client-form" loading={pending} icon={<Save aria-hidden="true" className="size-4" />}>
                        {editing ? 'Enregistrer' : 'Créer le client'}
                    </Button>
                </>
            }
        >
            <form id="client-form" onSubmit={onSubmit} noValidate>
                {serverError && <FormAlert tone="error">{serverError}</FormAlert>}

                <FormAlert tone="info">
                    {editing
                        ? "Le code du client n'est pas modifiable. Les départements associés partagent le même dossier (RG-07)."
                        : 'Le code sera généré par le serveur (CLI-0001). Le dossier documentaire sera créé avec le module Documents.'}
                </FormAlert>

                <div className="grid gap-x-3 sm:grid-cols-2">
                    <IconInput
                        label="Dénomination *"
                        icon={Building2}
                        autoComplete="organization"
                        placeholder="Ex. NOUVELLE AFFAIRE SARL"
                        style={{ textTransform: 'uppercase' }}
                        data-autofocus
                        error={errors.name?.message}
                        {...register('name')}
                    />
                    <SelectField label="Forme juridique" error={errors.legal_form?.message} {...register('legal_form')}>
                        <option value="">Non renseignée</option>
                        {LEGAL_FORMS.map((form) => (
                            <option key={form} value={form}>
                                {form}
                            </option>
                        ))}
                    </SelectField>
                </div>

                <div className="grid gap-x-3 sm:grid-cols-2">
                    <IconInput
                        label="Secteur d’activité"
                        icon={Briefcase}
                        placeholder="Ex. Commerce de gros"
                        error={errors.sector?.message}
                        {...register('sector')}
                    />
                    <SelectField label="Régime fiscal" error={errors.tax_regime?.message} {...register('tax_regime')}>
                        <option value="">Non renseigné</option>
                        {TAX_REGIMES.map((regime) => (
                            <option key={regime} value={regime}>
                                {regime}
                            </option>
                        ))}
                    </SelectField>
                </div>

                <div className="grid gap-x-3 sm:grid-cols-2">
                    <IconInput
                        label="RCCM"
                        icon={FileText}
                        autoComplete="off"
                        placeholder="CI-ABJ-2026-B-00000"
                        error={errors.rccm?.message}
                        {...register('rccm')}
                    />
                    <IconInput
                        label="Numéro DFÉ"
                        icon={Hash}
                        autoComplete="off"
                        placeholder="0000000 X 0"
                        error={errors.dfe?.message}
                        {...register('dfe')}
                    />
                </div>

                <IconInput
                    label="Adresse"
                    icon={MapPin}
                    autoComplete="street-address"
                    placeholder="Commune, quartier, Abidjan"
                    error={errors.address?.message}
                    {...register('address')}
                />

                <div className="grid gap-x-3 sm:grid-cols-2">
                    <IconInput
                        label="Téléphone"
                        icon={Phone}
                        type="tel"
                        autoComplete="tel"
                        error={errors.phone?.message}
                        {...register('phone')}
                    />
                    <IconInput
                        label="E-mail"
                        icon={Mail}
                        type="email"
                        autoComplete="email"
                        error={errors.email?.message}
                        {...register('email')}
                    />
                </div>

                <IconInput
                    label="Contact dirigeant"
                    icon={UserRound}
                    autoComplete="name"
                    error={errors.contact_name?.message}
                    {...register('contact_name')}
                />

                <fieldset
                    aria-describedby={errors.department_ids ? 'client-departments-erreur' : 'client-departments-aide'}
                    className="mb-1"
                >
                    <legend className="mb-[6px] block text-xs font-semibold tracking-[0.2px] text-ink-2">
                        Départements associés *
                    </legend>
                    <p id="client-departments-aide" className="mb-2 text-[11.5px] text-ink-3">
                        Le même dossier est partagé entre les départements cochés (RG-02, RG-07).
                    </p>
                    {options.length === 0 ? (
                        <p className="text-[12.5px] text-ink-2">
                            Aucun département actif n’est disponible. Créez-en un dans « Départements » avant d’ajouter un client.
                        </p>
                    ) : (
                        <div className="grid gap-x-4 sm:grid-cols-2">
                            {options.map((department) => (
                                <label
                                    key={department.id}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1.5 text-[13px] text-ink hover:bg-sable"
                                >
                                    <input
                                        type="checkbox"
                                        value={String(department.id)}
                                        className="size-4 accent-or"
                                        {...register('department_ids')}
                                    />
                                    <span>
                                        {department.name}
                                        <span className="ml-1.5 text-[11px] text-ink-3">{department.code}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                    {errors.department_ids && (
                        <p id="client-departments-erreur" className="mt-1 text-xs text-danger">
                            {errors.department_ids.message}
                        </p>
                    )}
                </fieldset>
            </form>
        </Modal>
    );
}
