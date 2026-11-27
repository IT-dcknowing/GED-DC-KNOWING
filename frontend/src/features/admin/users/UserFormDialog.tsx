import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Save, User as UserIcon, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { AdminUser } from '@/api/admin';
import { FormAlert } from '@/components/form/FormAlert';
import { IconInput } from '@/components/form/IconInput';
import { SelectField } from '@/components/form/SelectField';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useCreateUser, useDepartments, useRoles, useUpdateUser } from '@/features/admin/users/useUsersAdmin';
import { applyServerErrors } from '@/lib/serverErrors';

const schema = z.object({
    name: z.string().trim().min(2, 'Saisissez le nom complet (2 caractères minimum).').max(255, 'Nom trop long.'),
    email: z.string().trim().min(1, 'Saisissez l\'adresse e-mail.').pipe(z.email('Cette adresse e-mail n\'est pas valide.')),
    role: z.string().min(1, 'Choisissez un rôle.'),
    department_id: z.string(),
});

type FormValues = z.infer<typeof schema>;

const FIELDS = ['name', 'email', 'role', 'department_id'] as const;

type UserFormDialogProps = {
    /** undefined : fenêtre fermée ; null : création ; compte : modification. */
    user: AdminUser | null | undefined;
    currentUserId: number;
    onClose: () => void;
    onCreated: (user: AdminUser, temporaryPassword: string) => void;
    onUpdated: (user: AdminUser) => void;
};

/** Création ou modification d'un compte, par les routes d'administration existantes. */
export function UserFormDialog({ user, currentUserId, onClose, onCreated, onUpdated }: UserFormDialogProps) {
    const open = user !== undefined;
    const editing = user ?? null;
    const isSelf = editing?.id === currentUserId;

    const roles = useRoles();
    const departments = useDepartments();
    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<FormValues>({ resolver: zodResolver(schema) });

    useEffect(() => {
        if (!open) return;
        setServerError(null);
        reset({
            name: editing?.name ?? '',
            email: editing?.email ?? '',
            role: editing?.role?.key ?? '',
            department_id: editing?.department ? String(editing.department.id) : '',
        });
    }, [open, editing, reset]);

    const pending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = handleSubmit((values) => {
        setServerError(null);
        const payload = { ...values, department_id: values.department_id ? Number(values.department_id) : null };
        const onError = (error: unknown) => setServerError(applyServerErrors(error, setError, FIELDS));

        if (editing) {
            updateMutation.mutate({ id: editing.id, payload }, { onSuccess: onUpdated, onError });
        } else {
            createMutation.mutate(payload, {
                onSuccess: ({ user: created, temporaryPassword }) => onCreated(created, temporaryPassword),
                onError,
            });
        }
    });

    return (
        <Modal
            open={open}
            onClose={onClose}
            icon={editing ? UserIcon : UserPlus}
            tone="gold"
            title={editing ? 'Modifier le compte' : 'Nouveau compte'}
            subtitle={editing ? editing.email : 'Le compte sera créé actif'}
            note={editing ? 'Un changement de rôle ferme les sessions de la personne.' : undefined}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={pending}>
                        Annuler
                    </Button>
                    <Button type="submit" form="user-form" loading={pending} icon={<Save aria-hidden="true" className="size-4" />}>
                        {editing ? 'Enregistrer' : 'Créer le compte'}
                    </Button>
                </>
            }
        >
            <form id="user-form" onSubmit={onSubmit} noValidate>
                {serverError && <FormAlert tone="error">{serverError}</FormAlert>}
                {!editing && (
                    <FormAlert tone="info">
                        Un mot de passe temporaire sera généré et affiché une seule fois. La personne devra le remplacer à sa
                        première connexion.
                    </FormAlert>
                )}

                <div className="grid gap-x-3 sm:grid-cols-2">
                    <IconInput label="Nom complet" icon={UserIcon} autoComplete="off" data-autofocus error={errors.name?.message} {...register('name')} />
                    <IconInput label="Adresse e-mail professionnelle" icon={Mail} type="email" autoComplete="off" error={errors.email?.message} {...register('email')} />

                    {isSelf ? (
                        // Règle A1 : le rôle est affiché mais non modifiable ; il est renvoyé inchangé.
                        <>
                            <SelectField
                                label="Rôle"
                                disabled
                                value={editing?.role?.key ?? ''}
                                hint="Vous ne pouvez pas modifier votre propre rôle. Demandez-le à un autre Super Administrateur."
                                error={errors.role?.message}
                                onChange={() => undefined}
                            >
                                <option value={editing?.role?.key ?? ''}>{editing?.role?.label ?? 'Aucun rôle'}</option>
                            </SelectField>
                            <input type="hidden" {...register('role')} />
                        </>
                    ) : (
                        <SelectField label="Rôle" disabled={roles.isPending} error={errors.role?.message} {...register('role')}>
                            <option value="">Choisir un rôle</option>
                            {roles.data?.roles.map((role) => (
                                <option key={role.key} value={role.key}>
                                    {role.label}
                                </option>
                            ))}
                        </SelectField>
                    )}

                    <SelectField label="Département" disabled={departments.isPending} error={errors.department_id?.message} {...register('department_id')}>
                        <option value="">Transverse (aucun département)</option>
                        {departments.data?.map((department) => (
                            <option key={department.id} value={String(department.id)}>
                                {department.name}
                            </option>
                        ))}
                    </SelectField>
                </div>
            </form>
        </Modal>
    );
}
