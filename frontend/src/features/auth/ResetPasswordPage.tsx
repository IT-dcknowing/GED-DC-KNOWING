import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { z } from 'zod';

import { resetPassword } from '@/api/auth';
import { FormAlert } from '@/components/form/FormAlert';
import { PasswordInput } from '@/components/form/PasswordInput';
import { PasswordRequirements } from '@/components/form/PasswordRequirements';
import { Button } from '@/components/ui/Button';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { CURRENT_USER_KEY } from '@/features/auth/useAuth';
import { passwordPairSchema } from '@/lib/passwordPolicy';
import { applyServerErrors } from '@/lib/serverErrors';

type FormValues = z.infer<typeof passwordPairSchema>;

const newRequestLink = (
    <Link to="/mot-de-passe-oublie" className="font-semibold underline">
        Faire une nouvelle demande
    </Link>
);

/** AUTH-03 : choix d'un nouveau mot de passe depuis le lien reçu par e-mail. */
export function ResetPasswordPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get('token') ?? '';
    const email = params.get('email') ?? '';

    const queryClient = useQueryClient();
    const mutation = useMutation({ mutationFn: resetPassword });
    const [serverError, setServerError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        setError,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(passwordPairSchema),
        defaultValues: { password: '', password_confirmation: '' },
    });

    if (!token || !email) {
        return (
            <AuthLayout title="Lien incomplet" subtitle="Ce lien de réinitialisation ne peut pas être utilisé.">
                <FormAlert tone="error">
                    Utilisez le lien complet reçu par e-mail. Si vous ne l'avez plus : {newRequestLink}.
                </FormAlert>
            </AuthLayout>
        );
    }

    const onSubmit = handleSubmit((values) => {
        setServerError(null);
        mutation.mutate(
            { token, email, ...values },
            {
                onSuccess: (message) => {
                    // Toutes les sessions du compte ont été fermées côté serveur (règle D6).
                    queryClient.clear();
                    queryClient.setQueryData(CURRENT_USER_KEY, null);
                    navigate('/connexion', { replace: true, state: { success: message } });
                },
                onError: (error) =>
                    setServerError(applyServerErrors(error, setError, ['password', 'password_confirmation'])),
            },
        );
    });

    const linkInvalid = serverError?.includes('invalide ou a expiré');

    return (
        <AuthLayout title="Nouveau mot de passe" subtitle={`Choisissez le nouveau mot de passe du compte ${email}.`}>
            {serverError && (
                <FormAlert tone="error">
                    {serverError} {linkInvalid && newRequestLink}
                </FormAlert>
            )}

            <form onSubmit={onSubmit} noValidate>
                <PasswordInput
                    label="Nouveau mot de passe"
                    autoComplete="new-password"
                    autoFocus
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
                    {mutation.isPending ? 'Enregistrement en cours' : 'Enregistrer le nouveau mot de passe'}
                </Button>
            </form>
        </AuthLayout>
    );
}
