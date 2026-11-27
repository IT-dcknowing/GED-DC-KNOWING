<?php

namespace App\Http\Resources;

use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Compte tel que vu par l'administration. N'expose jamais le mot de passe ni son historique.
 *
 * @mixin User
 */
class AdminUserResource extends JsonResource
{
    /**
     * @param  CarbonInterface|null  $lockedUntil  fin du verrouillage de connexion, calculée par l'appelant
     */
    public function __construct($resource, private readonly ?CarbonInterface $lockedUntil = null)
    {
        parent::__construct($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $role = $this->roleName();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $role ? ['key' => $role->value, 'label' => $role->label()] : null,
            'department' => $this->department ? [
                'id' => $this->department->id,
                'code' => $this->department->code,
                'name' => $this->department->name,
            ] : null,
            'is_active' => (bool) $this->is_active,
            'must_change_password' => (bool) $this->must_change_password,
            'locked_until' => $this->lockedUntil?->toIso8601String(),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'password_changed_at' => $this->password_changed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            // Administrateur à l'origine du compte ; null pour un compte créé en ligne de commande.
            'created_by' => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name] : null,
        ];
    }
}
