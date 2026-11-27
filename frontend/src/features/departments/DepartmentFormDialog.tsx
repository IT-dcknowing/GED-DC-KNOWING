import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Hash, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { DEPARTMENT_MANAGER_ROLE, type Department } from '@/api/departments';
import { FormAlert } from '@/components/form/FormAlert';
import { IconInput } from '@/components/form/IconInput';
import { SelectField } from '@/components/form/SelectField';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useCreateDepartment, useUpdateDepartment } from '@/features/departments/useDepartmentsModule';
import { applyServerErrors } from '@/lib/serverErrors';

// Décision D7 : 2 à 20 caractères, lettres majuscules, chiffres et tirets. Le serveur contrôle aussi.
const schema = z.object({
    code: z
        .string()
        .trim()
        .transform((value) => value.toUpperCase())
        .pipe(
            z
                .string()
                .min(2, 'Le code doit contenir au moins 2 caractères.')
                .max(20, 'Le code ne peut pas dépasser 20 caractères.')
                .regex(/^[A-Z0-9-]+$/, 'Lettres majuscules, chiffres et tirets uniquement (ex. DEP-01).'),
        ),
    name: z.string().trim().min(2, 'Saisissez le nom du département (2 caractères minimum).').max(120, 'Nom trop long (120 caractères maximum).'),
    manager_id: z.string(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const FIELDS = ['code', 'name', 'manager_id'] as const;

type DepartmentFormDialogProps = {
    /** undefined : fenêtre fermée ; null : création ; département (avec ses membres) : modification. */
    department: Department | null | undefined;
    onClose: () => void;
    onSaved: (department: Department, created: boolean) => void;
};

/** Création (code et nom) ou modification (nom et responsable) d'un département. */
export function DepartmentFormDialog({ department, onClose, onSaved }: DepartmentFormDialogProps) {
    const open = department !== undefined;
    const editing = department ?? null;

    const createMutation = useCreateDepartment();
    const updateMutation = useUpdateDepartment();
    const [serverError, setServerError] = useState<string | null>(null);

    // D4 : seuls les comptes actifs, de rôle Responsable de Département, rattachés à ce département.
    const candidates = (editing?.members ?? []).filter((member) => member.is_active && member.role?.key === DEPARTMENT_MANAGER_ROLE);

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
            code: editing?.code ?? '',
            name: editing?.name ?? '',
            manager_id: editing?.manager ? String(editing.manager.id) : '',
        });
    }, [open, editing, reset]);

    const pending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = handleSubmit((values) => {
        setServerError(null);
        const onError = (error: unknown) => setServerError(applyServerErrors(error, setError, FIELDS));

        if (editing) {
            updateMutation.mutate(
                { id: editing.id, payload: { name: values.name, manager_id: values.manager_id ? Number(values.manager_id) : null } },
                { onSuccess: (saved) => onSaved(saved, false), onError },
            );
        } else {
            createMutation.mutate({ code: values.code, name: values.name }, { onSuccess: (saved) => onSaved(saved, true), onError });
        }
    });

    return (
        <Modal
            open={open}
            onClose={onClose}
            icon={Briefcase}
            tone="gold"
            title={editing ? 'Modifier le département' : 'Nouveau département'}
            subtitle={editing ? `Département ${editing.code}` : 'Le département sera créé actif'}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={pending}>
                        Annuler
                    </Button>
                    <Button type="submit" form="department-form" loading={pending} icon={<Save aria-hidden="true" className="size-4" />}>
                        {editing ? 'Enregistrer' : 'Créer le département'}
                    </Button>
                </>
            }
        >
            <form id="department-form" onSubmit={onSubmit} noValidate>
                {serverError && <FormAlert tone="error">{serverError}</FormAlert>}
                {!editing && (
                    <FormAlert tone="info">
                        Le code ne pourra plus être modifié après la création. Le responsable se désigne ensuite, une fois qu'il est
                        rattaché au département dans « Utilisateurs et rôles ».
                    </FormAlert>
                )}

                <div className="grid gap-x-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
                    <IconInput
                        label="Code"
                        icon={Hash}
                        autoComplete="off"
                        placeholder="DEP-01"
                        readOnly={!!editing}
                        aria-readonly={editing ? true : undefined}
                        data-autofocus={editing ? undefined : true}
                        error={errors.code?.message}
                        {...register('code')}
                    />
                    <IconInput label="Nom du département" icon={Briefcase} autoComplete="off" data-autofocus={editing ? true : undefined} error={errors.name?.message} {...register('name')} />
                </div>
                {editing && <p className="-mt-2 mb-3.5 text-[11.5px] text-ink-3">Le code d'un département n'est pas modifiable.</p>}

                {editing && (
                    <SelectField
                        label="Responsable"
                        error={errors.manager_id?.message}
                        hint={
                            candidates.length === 0
                                ? "Aucun compte actif « Responsable de Département » n'est rattaché à ce département. Rattachez-le d'abord dans « Utilisateurs et rôles »."
                                : 'Seuls les comptes actifs de rôle « Responsable de Département » rattachés à ce département peuvent être désignés.'
                        }
                        {...register('manager_id')}
                    >
                        <option value="">Aucun responsable désigné</option>
                        {candidates.map((member) => (
                            <option key={member.id} value={String(member.id)}>
                                {member.name}
                            </option>
                        ))}
                    </SelectField>
                )}
            </form>
        </Modal>
    );
}
