<?php

namespace App\Policies;

use App\Enums\PermissionName;
use App\Enums\RoleName;
use App\Models\Department;
use App\Models\User;

/**
 * Droits sur les départements (lot 1.3).
 *
 * D1 : consultation selon le rôle. Super Administrateur, Directeur et Responsable GED voient
 * tous les départements ; le Responsable de Département ne voit que le sien ; les autres rôles, aucun.
 * D2 : création, modification, activation et désactivation avec la permission departments.manage.
 */
class DepartmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->seesAll($user) || $user->roleName() === RoleName::DepartmentManager;
    }

    public function view(User $user, Department $department): bool
    {
        if ($this->seesAll($user)) {
            return true;
        }

        return $user->roleName() === RoleName::DepartmentManager
            && $user->department_id !== null
            && (int) $user->department_id === (int) $department->id;
    }

    public function create(User $user): bool
    {
        return $this->manages($user);
    }

    public function update(User $user, Department $department): bool
    {
        return $this->manages($user);
    }

    /**
     * Vrai si le compte voit tous les départements du cabinet.
     */
    public function seesAll(User $user): bool
    {
        return $this->manages($user) || ($user->roleName()?->hasCabinetWideScope() ?? false);
    }

    private function manages(User $user): bool
    {
        return $user->hasPermissionTo(PermissionName::DepartmentsManage->value);
    }
}
