<?php

namespace App\Enums;

/**
 * Actions protégées de la GED (ce que l'on peut faire).
 * Le périmètre (où on peut le faire : département, client, dossier) est géré séparément.
 */
enum PermissionName: string
{
    case DocumentsUpload = 'documents.upload';
    case DocumentsEdit = 'documents.edit';
    case DocumentsDelete = 'documents.delete';
    case DocumentsSubmit = 'documents.submit';
    case DocumentsValidate = 'documents.validate';
    case DocumentsDownload = 'documents.download';
    case FoldersCreate = 'folders.create';
    case ClientsManage = 'clients.manage';
    case DepartmentsManage = 'departments.manage';
    case ArchivesPropose = 'archives.propose';
    case ArchivesConfirm = 'archives.confirm';
    case ArchivesReopen = 'archives.reopen';
    case JournalView = 'journal.view';
    case UsersManage = 'users.manage';
    case AccessGrantsManage = 'access-grants.manage';
    case SettingsManage = 'settings.manage';
    case SettingsDocumentary = 'settings.documentary';

    public function label(): string
    {
        return match ($this) {
            self::DocumentsUpload => 'Déposer des documents',
            self::DocumentsEdit => 'Modifier des documents',
            self::DocumentsDelete => 'Supprimer des documents',
            self::DocumentsSubmit => 'Soumettre des documents à validation',
            self::DocumentsValidate => 'Valider ou rejeter des documents',
            self::DocumentsDownload => 'Télécharger des documents',
            self::FoldersCreate => 'Créer des dossiers',
            self::ClientsManage => 'Gérer les clients',
            self::DepartmentsManage => 'Gérer les départements',
            self::ArchivesPropose => 'Proposer un archivage',
            self::ArchivesConfirm => 'Confirmer un archivage',
            self::ArchivesReopen => 'Rouvrir un dossier archivé',
            self::JournalView => 'Consulter le journal d\'activité',
            self::UsersManage => 'Gérer les comptes utilisateurs',
            self::AccessGrantsManage => 'Attribuer des accès exceptionnels',
            self::SettingsManage => 'Gérer tous les paramètres',
            self::SettingsDocumentary => 'Gérer les paramètres documentaires',
        };
    }
}
