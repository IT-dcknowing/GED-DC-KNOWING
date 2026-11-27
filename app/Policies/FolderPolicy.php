<?php

namespace App\Policies;

use App\Enums\PermissionName;
use App\Enums\RoleName;
use App\Models\Folder;
use App\Models\User;

/**
 * Rôles et autorisations sur l'arborescence documentaire (Lot 2.2).
 */
class FolderPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Folder $folder): bool
    {
        // 1. Les rôles transverses (Direction, SuperAdmin, Resp. GED, Auditeur) ont visibilité cabinet
        if ($this->seesAll($user)) {
            return true;
        }

        // 2. Si le dossier est restreint (00_DIRECTION, 03_RH_CABINET, 99_ARCHIVES), seuls les transverses y accèdent
        if ($folder->is_restricted) {
            return false;
        }

        // 3. Si le dossier appartient à un client spécifique
        if ($folder->client_id !== null) {
            $client = $folder->client;
            if (! $client) {
                return false;
            }

            // Un collaborateur ou responsable de département ne voit que les clients de son département
            return $user->department_id !== null
                && $client->departments()->whereKey($user->department_id)->exists();
        }

        // 4. Les autres espaces communs ouverts (01_CLIENTS, 02_FORMATION, etc.) sont consultables
        return true;
    }

    public function create(User $user, Folder $parent): bool
    {
        // On ne peut créer un sous-dossier que si on a accès au parent
        if (! $this->view($user, $parent)) {
            return false;
        }

        // Le parent doit autoriser les sous-dossiers
        if (! $parent->canHaveCustomSubfolders()) {
            return false;
        }

        // Droit d'écriture : gestion des clients/dossiers ou rôle opérationnel sur le client
        if ($user->hasPermissionTo(PermissionName::ClientsManage->value)) {
            return true;
        }

        if ($parent->client_id !== null) {
            return in_array($user->roleName(), [RoleName::DepartmentManager, RoleName::Collaborator], true);
        }

        return false;
    }

    public function update(User $user, Folder $folder): bool
    {
        if (! $folder->canBeRenamed()) {
            return false;
        }

        if ($user->hasPermissionTo(PermissionName::ClientsManage->value)) {
            return true;
        }

        // Le créateur du dossier ou le manager du département
        if ($folder->created_by === $user->id) {
            return true;
        }

        return $user->roleName() === RoleName::DepartmentManager;
    }

    public function delete(User $user, Folder $folder): bool
    {
        if (! $folder->canBeDeleted()) {
            return false;
        }

        if ($user->hasPermissionTo(PermissionName::ClientsManage->value)) {
            return true;
        }

        if ($folder->created_by === $user->id) {
            return true;
        }

        return $user->roleName() === RoleName::DepartmentManager;
    }

    public function seesAll(User $user): bool
    {
        return $user->roleName()?->hasCabinetWideScope() ?? false;
    }
}
