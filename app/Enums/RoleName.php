<?php

namespace App\Enums;

use App\Enums\PermissionName as P;

/**
 * Les sept profils du cahier des charges (section 6).
 *
 * La matrice des permissions est PROVISOIRE : elle reprend la maquette v1.1 et reste
 * à confirmer par DC-KNOWING (cahier des charges, section 15). Après modification,
 * relancer : php artisan db:seed --class=RolesAndPermissionsSeeder
 */
enum RoleName: string
{
    case SuperAdmin = 'super_admin';
    case Director = 'directeur';
    case GedManager = 'resp_ged';
    case DepartmentManager = 'resp_dept';
    case Collaborator = 'collaborateur';
    case Intern = 'stagiaire';
    case Auditor = 'auditeur';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super Administrateur',
            self::Director => 'Directeur du Cabinet',
            self::GedManager => 'Responsable GED',
            self::DepartmentManager => 'Responsable de Département',
            self::Collaborator => 'Collaborateur',
            self::Intern => 'Stagiaire',
            self::Auditor => 'Auditeur / Lecteur',
        };
    }

    /**
     * Rôles qui voient tout le cabinet sans restriction de département.
     */
    public function hasCabinetWideScope(): bool
    {
        return in_array($this, [self::SuperAdmin, self::Director, self::GedManager], true);
    }

    /**
     * @return list<P>
     */
    public function permissions(): array
    {
        return match ($this) {
            self::SuperAdmin => P::cases(),
            self::Director => [
                P::DocumentsValidate, P::DocumentsDownload,
                P::ArchivesConfirm, P::ArchivesReopen,
                P::JournalView,
            ],
            self::GedManager => [
                P::DocumentsUpload, P::DocumentsEdit, P::DocumentsDelete, P::DocumentsSubmit, P::DocumentsDownload,
                P::FoldersCreate, P::ClientsManage,
                P::ArchivesPropose, P::ArchivesConfirm, P::ArchivesReopen,
                P::JournalView, P::SettingsDocumentary,
            ],
            self::DepartmentManager => [
                P::DocumentsUpload, P::DocumentsEdit, P::DocumentsDelete, P::DocumentsSubmit,
                P::DocumentsValidate, P::DocumentsDownload,
                P::FoldersCreate,
            ],
            self::Collaborator => [
                P::DocumentsUpload, P::DocumentsEdit, P::DocumentsSubmit, P::DocumentsDownload,
            ],
            self::Intern => [
                P::DocumentsUpload, P::DocumentsSubmit, P::DocumentsDownload,
            ],
            self::Auditor => [
                P::DocumentsDownload,
            ],
        };
    }
}
