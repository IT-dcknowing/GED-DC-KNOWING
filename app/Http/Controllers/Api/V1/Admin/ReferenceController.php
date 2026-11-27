<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\PermissionName;
use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

/**
 * Listes de référence pour l'administration des comptes.
 */
class ReferenceController extends Controller
{
    /**
     * Les 7 rôles avec leur description, leurs permissions (lues en base, donc celles réellement
     * appliquées) et leur nombre de comptes. La répartition des permissions est provisoire
     * (en attente de validation par la Direction) mais pleinement en vigueur.
     */
    public function roles(): JsonResponse
    {
        $stored = Role::query()
            ->where('guard_name', 'web')
            ->with('permissions:id,name')
            ->get()
            ->keyBy('name');

        // Nombre de comptes par rôle, lu directement dans la table de liaison de spatie/laravel-permission.
        $counts = DB::table(config('permission.table_names.model_has_roles'))
            ->where('model_type', (new User)->getMorphClass())
            ->selectRaw('role_id, count(*) as total')
            ->groupBy('role_id')
            ->pluck('total', 'role_id');

        $permissionLabel = fn (string $name) => PermissionName::tryFrom($name)?->label() ?? $name;

        return response()->json([
            'data' => array_map(function (RoleName $role) use ($stored, $counts, $permissionLabel) {
                $record = $stored->get($role->value);
                $granted = $record ? $record->permissions->pluck('name')->sort()->values() : collect();

                return [
                    'key' => $role->value,
                    'label' => $role->label(),
                    'description' => $role->description(),
                    'users_count' => $record ? (int) ($counts[$record->id] ?? 0) : 0,
                    'permissions' => $granted->map(fn (string $name) => [
                        'key' => $name,
                        'label' => $permissionLabel($name),
                    ])->all(),
                ];
            }, RoleName::cases()),
            'meta' => [
                'permissions' => array_map(
                    fn (PermissionName $p) => ['key' => $p->value, 'label' => $p->label()],
                    PermissionName::cases(),
                ),
            ],
        ]);
    }

    public function departments(): JsonResponse
    {
        return response()->json([
            'data' => Department::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'code', 'name']),
        ]);
    }
}
