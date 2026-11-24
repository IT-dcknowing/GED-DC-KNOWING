import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';

import { FormAlert } from '@/components/form/FormAlert';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { ChangePasswordForm } from '@/features/auth/ChangePasswordForm';
import { useCurrentUser, useLogout } from '@/features/auth/useAuth';

/**
 * Première connexion (règles B3, B4) : le mot de passe temporaire doit être remplacé
 * avant tout accès à l'application.
 */
export function FirstLoginPage() {
    const navigate = useNavigate();
    const { data: user } = useCurrentUser();
    const logoutMutation = useLogout();

    return (
        <AuthLayout
            title="Choisissez votre mot de passe"
            subtitle="Pour sécuriser votre compte, remplacez le mot de passe temporaire transmis par l'administrateur."
        >
            <FormAlert tone="info">
                Bienvenue{user ? `, ${user.name}` : ''}. L'accès à la GED sera ouvert dès que votre nouveau mot de passe
                sera enregistré.
            </FormAlert>

            <ChangePasswordForm
                currentLabel="Mot de passe temporaire"
                submitLabel="Enregistrer et accéder à la GED"
                onSuccess={() => navigate('/', { replace: true })}
            />

            <button
                type="button"
                onClick={() =>
                    logoutMutation.mutate(undefined, { onSettled: () => navigate('/connexion', { replace: true }) })
                }
                className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-or-brun hover:underline"
            >
                <LogOut aria-hidden="true" className="size-3.5" />
                Se déconnecter
            </button>
        </AuthLayout>
    );
}
