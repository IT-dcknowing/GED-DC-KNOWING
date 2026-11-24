<?php

namespace Database\Seeders;

use App\Enums\PermissionName;
use App\Enums\RoleName;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Données de référence (pas des données de démonstration) : rôles et permissions.
 * Idempotent : peut être relancé après chaque modification de la matrice dans RoleName.
 */
class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (PermissionName::cases() as $permission) {
            Permission::findOrCreate($permission->value, 'web');
        }

        foreach (RoleName::cases() as $roleName) {
            Role::findOrCreate($roleName->value, 'web')->syncPermissions(
                array_map(fn (PermissionName $p) => $p->value, $roleName->permissions()),
            );
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
