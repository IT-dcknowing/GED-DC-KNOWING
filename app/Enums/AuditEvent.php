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
    case DepartmentCreated = 'admin.department.created';
    case DepartmentUpdated = 'admin.department.updated';
    case DepartmentDeactivated = 'admin.department.deactivated';
    case DepartmentActivated = 'admin.department.activated';
    case DepartmentManagerRemoved = 'admin.department.manager_removed';
    case ClientCreated = 'admin.client.created';
    case ClientUpdated = 'admin.client.updated';
    case FolderCreated = 'folder.created';
    case FolderRenamed = 'folder.renamed';
    case FolderDeleted = 'folder.deleted';
    case FolderAccessDenied = 'folder.access_denied';
    case DocumentUploaded = 'document.uploaded';
    case DocumentDownloaded = 'document.downloaded';
    case DocumentDeleted = 'document.deleted';

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
            self::DepartmentCreated => 'Création de département',
            self::DepartmentUpdated => 'Modification de département',
            self::DepartmentDeactivated => 'Désactivation de département',
            self::DepartmentActivated => 'Activation de département',
            self::DepartmentManagerRemoved => 'Retrait automatique du responsable de département',
            self::ClientCreated => 'Création de client',
            self::ClientUpdated => 'Modification de client',
            self::FolderCreated => 'Création de dossier',
            self::FolderRenamed => 'Renommage de dossier',
            self::FolderDeleted => 'Suppression de dossier',
            self::FolderAccessDenied => 'Accès dossier refusé',
            self::DocumentUploaded => 'Dépôt de document',
            self::DocumentDownloaded => 'Téléchargement de document',
            self::DocumentDeleted => 'Suppression de document',
        };
    }
}
