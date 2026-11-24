<?php

namespace App\Enums;

/**
 * Événements enregistrés dans le journal d'audit (table audit_logs).
 */
enum AuditEvent: string
{
    case LoginSucceeded = 'auth.login.succeeded';
    case LoginFailed = 'auth.login.failed';
    case AccountLocked = 'auth.account.locked';
    case Logout = 'auth.logout';
    case PasswordChanged = 'auth.password.changed';
    case PasswordResetRequested = 'auth.password.reset.requested';
    case PasswordResetCompleted = 'auth.password.reset.completed';
    case PasswordResetFailed = 'auth.password.reset.failed';
    case UserCreated = 'admin.user.created';
    case UserUpdated = 'admin.user.updated';
    case UserDeactivated = 'admin.user.deactivated';
    case UserActivated = 'admin.user.activated';
    case UserPasswordReset = 'admin.user.password_reset';
    case UserUnlocked = 'admin.user.unlocked';

    public function label(): string
    {
        return match ($this) {
            self::LoginSucceeded => 'Connexion réussie',
            self::LoginFailed => 'Connexion échouée',
            self::AccountLocked => 'Verrouillage de compte',
            self::Logout => 'Déconnexion',
            self::PasswordChanged => 'Modification du mot de passe',
            self::PasswordResetRequested => 'Demande de réinitialisation du mot de passe',
            self::PasswordResetCompleted => 'Réinitialisation du mot de passe',
            self::PasswordResetFailed => 'Réinitialisation du mot de passe refusée',
            self::UserCreated => 'Création de compte',
            self::UserUpdated => 'Modification de compte',
            self::UserDeactivated => 'Désactivation de compte',
            self::UserActivated => 'Activation de compte',
            self::UserPasswordReset => 'Mot de passe temporaire régénéré',
            self::UserUnlocked => 'Déverrouillage de compte',
        };
    }
}
