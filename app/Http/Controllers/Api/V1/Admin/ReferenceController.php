<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\JsonResponse;

/**
 * Listes de référence pour les formulaires d'administration des comptes.
 */
class ReferenceController extends Controller
{
    public function roles(): JsonResponse
    {
        return response()->json([
            'data' => array_map(
                fn (RoleName $role) => ['key' => $role->value, 'label' => $role->label()],
                RoleName::cases(),
            ),
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
