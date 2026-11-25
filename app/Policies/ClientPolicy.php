<?php

namespace App\Policies;

use App\Enums\PermissionName;
use App\Enums\RoleName;
use App\Models\Client;
use App\Models\User;

/**
 * Droits sur les clients (lot 2.1, décisions C1 à C4).
 *
 * Consultation : les rôles transverses voient tout le cabinet ; le Responsable de
 * Département et le Collaborateur voient les clients de leur département (réglage
 * provisoire Q-14, en attendant les autorisations du lot 2.4). Le Stagiaire et
 * l'Auditeur ne voient aucun client avant ce lot.
 *
 * Écriture : permission clients.manage (Super Administrateur et Responsable GED).
 */
class ClientPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Client $client): bool
    {
        if ($this->seesAll($user)) {
            return true;
        }

        return $this->seesDepartmentScope($user)
            && $user->department_id !== null
            && $client->departments()->whereKey($user->department_id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo(PermissionName::ClientsManage->value);
    }

    public function update(User $user, Client $client): bool
    {
        return $user->hasPermissionTo(PermissionName::ClientsManage->value);
    }

    /**
     * Vrai si le compte voit tous les clients du cabinet.
     */
    public function seesAll(User $user): bool
    {
        return $user->roleName()?->hasCabinetWideScope() ?? false;
    }

    /**
     * Vrai si le compte est limité aux clients de son département (Q-14 provisoire).
     */
    public function seesDepartmentScope(User $user): bool
    {
        return in_array($user->roleName(), [RoleName::DepartmentManager, RoleName::Collaborator], true);
    }
}
