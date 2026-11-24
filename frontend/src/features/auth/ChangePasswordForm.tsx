import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { CurrentUser } from '@/api/auth';
import { FormAlert } from '@/components/form/FormAlert';
import { PasswordInput } from '@/components/form/PasswordInput';
import { PasswordRequirements } from '@/components/form/PasswordRequirements';
import { Button } from '@/components/ui/Button';
import { useChangePassword } from '@/features/auth/useAuth';
import { newPasswordSchema } from '@/lib/passwordPolicy';
import { applyServerErrors } from '@/lib/serverErrors';

type ChangePasswordFormProps = {
    /** Libellé du premier champ : « Mot de passe temporaire » à la première connexion. */
    currentLabel: string;
    submitLabel: string;
    onSuccess: (user: CurrentUser) => void;
};

const FIELDS = ['current_password', 'password', 'password_confirmation'] as const;

/**
 * Changement de mot de passe avec vérification du mot de passe actuel (règles B3, C5).
 * Utilisé à la première connexion et depuis le profil (AUTH-05).
 */
export function ChangePasswordForm({ currentLabel, submitLabel, onSuccess }: ChangePasswordFormProps) {
    const mutation = useChangePassword();
    const [serverError, setServerError] = useState<string | null>(null);

    const schema = z
        .object({
            current_password: z.string().min(1, `Saisissez votre ${currentLabel.toLowerCase()}.`),
            password: newPasswordSchema,
            password_confirmation: z.string().min(1, 'Confirmez le nouveau mot de passe.'),
        })
        .refine((v) => v.password === v.password_confirmation, {
            path: ['password_confirmation'],
            message: 'La confirmation ne correspond pas au nouveau mot de passe.',
        });

    type FormValues = z.infer<typeof schema>;

    const {
        register,
        handleSubmit,
        setError,
        watch,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { current_password: '', password: '', password_confirmation: '' },
    });

    const onSubmit = handleSubmit((values) => {
        setServerError(null);
        mutation.mutate(values, {
            onSuccess: (user) => {
                reset();
                onSuccess(user);
            },
            onError: (error) => setServerError(applyServerErrors(error, setError, FIELDS)),
        });
    });

    return (
        <form onSubmit={onSubmit} noValidate>
            {serverError && <FormAlert tone="error">{serverError}</FormAlert>}

            <PasswordInput
                label={currentLabel}
                autoComplete="current-password"
                autoFocus
                error={errors.current_password?.message}
                {...register('current_password')}
            />
            <PasswordInput
                label="Nouveau mot de passe"
                autoComplete="new-password"
                error={errors.password?.message}
                after={<PasswordRequirements value={watch('password')} />}
                {...register('password')}
            />
            <PasswordInput
                label="Confirmation du nouveau mot de passe"
                autoComplete="new-password"
                error={errors.password_confirmation?.message}
                {...register('password_confirmation')}
            />

            <Button
                type="submit"
                size="lg"
                className="mt-1 w-full"
                loading={mutation.isPending}
                icon={<KeyRound aria-hidden="true" className="size-4" />}
            >
                {mutation.isPending ? 'Enregistrement en cours' : submitLabel}
            </Button>
        </form>
    );
}
