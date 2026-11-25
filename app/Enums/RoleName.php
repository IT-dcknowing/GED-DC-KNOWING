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
     * Responsabilités du rôle, reprises du cahier des charges (section 6).
     */
    public function description(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Paramétrage global, comptes, rôles, référentiels et supervision technique.',
            self::Director => 'Vision transversale, supervision des départements et clients, consultation des indicateurs et arbitrages.',
            self::GedManager => 'Organisation documentaire, contrôle du classement, suivi des anomalies et administration des archives.',
            self::DepartmentManager => 'Gestion des collaborateurs de son département, suivi des clients affectés et validation des documents de son périmètre.',
            self::Collaborator => 'Dépôt, consultation et modification des documents autorisés dans les espaces qui lui sont affectés.',
            self::Intern => 'Accès limité aux dossiers et actions explicitement autorisés ; pas de validation ni d\'administration par défaut.',
            self::Auditor => 'Consultation seule des espaces et documents explicitement ouverts à son profil.',
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
