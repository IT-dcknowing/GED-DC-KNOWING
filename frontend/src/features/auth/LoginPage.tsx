import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';

import { apiErrorMessage } from '@/api/client';
import { FormAlert } from '@/components/form/FormAlert';
import { IconInput } from '@/components/form/IconInput';
import { PasswordInput } from '@/components/form/PasswordInput';
import { Button } from '@/components/ui/Button';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { landingPath, useLogin } from '@/features/auth/useAuth';

const schema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'Saisissez votre adresse e-mail.')
        .pipe(z.email('Cette adresse e-mail n\'est pas valide.')),
    password: z.string().min(1, 'Saisissez votre mot de passe.'),
});

type FormValues = z.infer<typeof schema>;

/** Raisons d'arrivée sur la page, transmises dans l'adresse (?raison=…). */
const REASONS: Record<string, { tone: 'info' | 'error'; text: string }> = {
    'session-expiree': {
        tone: 'info',
        text: 'Votre session a expiré après une période d\'inactivité. Reconnectez-vous pour continuer.',
    },
    'compte-desactive': {
        tone: 'error',
        text: 'Votre compte a été désactivé. Contactez l\'administrateur de la GED.',
    },
};

/** AUTH-01 : connexion (maquette : page Login). */
export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [params] = useSearchParams();
    const loginMutation = useLogin();

    const state = location.state as { from?: string; success?: string } | null;
    const reason = REASONS[params.get('raison') ?? ''];

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { email: '', password: '' },
    });

    const onSubmit = handleSubmit((values) => {
        loginMutation.mutate(values, {
            onSuccess: (user) => navigate(landingPath(user, state?.from), { replace: true }),
        });
    });

    return (
        <AuthLayout title="Connexion sécurisée" subtitle="Accédez à votre espace documentaire DC-KNOWING.">
            {loginMutation.isError ? (
                <FormAlert tone="error">{apiErrorMessage(loginMutation.error)}</FormAlert>
            ) : state?.success ? (
                <FormAlert tone="success">{state.success}</FormAlert>
            ) : reason ? (
                <FormAlert tone={reason.tone}>{reason.text}</FormAlert>
            ) : null}

            <form onSubmit={onSubmit} noValidate>
                <IconInput
                    label="Adresse e-mail professionnelle"
                    icon={User}
                    type="email"
                    autoComplete="username"
                    placeholder="prenom.nom@…"
                    autoFocus
                    error={errors.email?.message}
                    {...register('email')}
                />

                <PasswordInput
                    label="Mot de passe"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    error={errors.password?.message}
                    {...register('password')}
                />

                <div className="mt-0.5 mb-4 flex items-center justify-end">
                    <Link to="/mot-de-passe-oublie" className="text-[13px] font-medium text-or-brun hover:underline">
                        Mot de passe oublié ?
                    </Link>
                </div>

                <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    loading={loginMutation.isPending}
                    icon={<LogIn aria-hidden="true" className="size-4" />}
                >
                    {loginMutation.isPending ? 'Connexion en cours' : 'Se connecter'}
                </Button>
            </form>
        </AuthLayout>
    );
}
