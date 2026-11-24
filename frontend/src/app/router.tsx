import { createBrowserRouter, type RouteObject } from 'react-router';

import { GuestOnly, RequireAuth, RequirePasswordChange } from '@/app/guards';
import { AppLayout } from '@/app/layout/AppLayout';
import { RootLayout } from '@/app/RootLayout';
import { FirstLoginPage } from '@/features/auth/FirstLoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { AccessDeniedPage } from '@/features/errors/AccessDeniedPage';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { RouteErrorPage } from '@/features/errors/RouteErrorPage';
import { HomePage } from '@/features/home/HomePage';
import { ChangePasswordPage } from '@/features/profile/ChangePasswordPage';

export const routes: RouteObject[] = [
    {
        element: <RootLayout />,
        errorElement: <RouteErrorPage />,
        children: [
            {
                element: <GuestOnly />,
                children: [
                    { path: '/connexion', element: <LoginPage /> },
                    { path: '/mot-de-passe-oublie', element: <ForgotPasswordPage /> },
                ],
            },
            // Accessible avec ou sans session : le lien arrive par e-mail.
            { path: '/reinitialisation', element: <ResetPasswordPage /> },
            {
                element: <RequirePasswordChange />,
                children: [{ path: '/premiere-connexion', element: <FirstLoginPage /> }],
            },
            {
                element: <RequireAuth />,
                children: [
                    {
                        element: <AppLayout />,
                        children: [
                            { path: '/', element: <HomePage /> },
                            { path: '/profil/mot-de-passe', element: <ChangePasswordPage /> },
                            { path: '/acces-refuse', element: <AccessDeniedPage /> },
                        ],
                    },
                ],
            },
            { path: '*', element: <NotFoundPage /> },
        ],
    },
];

export const router = createBrowserRouter(routes);
