<?php

namespace App\Http\Resources;

use App\Models\Department;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Département tel que présenté par le module Départements (lot 1.3).
 * Les membres ne sont inclus que dans le détail d'un département.
 *
 * @mixin Department
 */
class DepartmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'is_active' => $this->is_active,
            'manager' => $this->manager ? ['id' => $this->manager->id, 'name' => $this->manager->name] : null,
            'active_members_count' => $this->whenCounted('active_members_count'),
            'created_at' => $this->created_at?->toIso8601String(),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name] : null),
            'members' => $this->whenLoaded('users', fn () => $this->users->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => ($role = $user->roleName()) ? ['key' => $role->value, 'label' => $role->label()] : null,
                'is_active' => $user->is_active,
                'is_manager' => (int) $user->id === (int) $this->manager_id,
            ])->values()),
        ];
    }
}
