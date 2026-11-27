import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';

import { forgotPassword } from '@/api/auth';
import { FormAlert } from '@/components/form/FormAlert';
import { IconInput } from '@/components/form/IconInput';
import { Button } from '@/components/ui/Button';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { applyServerErrors } from '@/lib/serverErrors';

const schema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'Saisissez votre adresse e-mail.')
        .pipe(z.email('Cette adresse e-mail n\'est pas valide.')),
});

type FormValues = z.infer<typeof schema>;

const backLink = (
    <Link
        to="/connexion"
        className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-or-brun hover:underline"
    >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Retour à la connexion
    </Link>
);

/** AUTH-02 : demande de réinitialisation du mot de passe. */
export function ForgotPasswordPage() {
    const mutation = useMutation({ mutationFn: forgotPassword });
    const [serverError, setServerError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

    const onSubmit = handleSubmit((values) => {
        setServerError(null);
        mutation.mutate(values.email, {
            onError: (error) => setServerError(applyServerErrors(error, setError, ['email'])),
        });
    });

    if (mutation.isSuccess) {
        return (
            <AuthLayout title="Demande envoyée" subtitle="Consultez votre messagerie professionnelle.">
                <FormAlert tone="success">{mutation.data}</FormAlert>
                <p className="text-[13px] leading-relaxed text-ink-2">
                    Pensez à vérifier le dossier des courriers indésirables. Sans message, vérifiez l'adresse saisie ou
                    contactez l'administrateur de la GED.
                </p>
                {backLink}
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Mot de passe oublié"
            subtitle="Saisissez votre adresse e-mail professionnelle : vous recevrez un lien pour choisir un nouveau mot de passe."
        >
            {serverError && <FormAlert tone="error">{serverError}</FormAlert>}

            <form onSubmit={onSubmit} noValidate>
                <IconInput
                    label="Adresse e-mail professionnelle"
                    icon={Mail}
                    type="email"
                    autoComplete="username"
                    placeholder="prenom.nom@…"
                    autoFocus
                    error={errors.email?.message}
                    {...register('email')}
                />

                <Button
                    type="submit"
                    size="lg"
                    className="mt-1 w-full"
                    loading={mutation.isPending}
                    icon={<Send aria-hidden="true" className="size-4" />}
                >
                    {mutation.isPending ? 'Envoi en cours' : 'Envoyer le lien'}
                </Button>
            </form>
            {backLink}
        </AuthLayout>
    );
}
