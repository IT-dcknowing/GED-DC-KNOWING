<?php

namespace App\Models;

use App\Enums\RoleName;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Client du cabinet (lot 2.1, RG-02 à RG-04).
 *
 * Le code est généré par le serveur (C2) et n'est jamais modifié (C4). Un client
 * n'est pas supprimé : il sera radié au lot 5.2, avec conservation de son code.
 */
#[Fillable([
    'code', 'name', 'legal_form', 'sector', 'tax_regime', 'rccm', 'dfe',
    'address', 'phone', 'email', 'contact_name', 'started_on', 'is_active', 'radiated_at',
])]
class Client extends Model
{
    protected function casts(): array
    {
        return [
            'started_on' => 'date',
            'is_active' => 'boolean',
            'radiated_at' => 'datetime',
        ];
    }

    /**
     * Départements qui suivent le client (RG-02). Un même dossier est partagé (RG-07).
     *
     * @return BelongsToMany<Department, $this>
     */
    public function departments(): BelongsToMany
    {
        return $this->belongsToMany(Department::class)->withTimestamps();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Clients visibles par un compte : tout le cabinet pour les rôles transverses,
     * sinon ceux de son département (réglage provisoire Q-14, avant le lot 2.4).
     *
     * @param  Builder<Client>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        $role = $user->roleName();

        if ($role?->hasCabinetWideScope()) {
            return;
        }

        if ($user->department_id !== null && in_array($role, [RoleName::DepartmentManager, RoleName::Collaborator], true)) {
            $query->whereHas('departments', fn (Builder $q) => $q->whereKey($user->department_id));

            return;
        }

        // Stagiaire et Auditeur : aucun client avant les autorisations du lot 2.4.
        $query->whereRaw('1 = 0');
    }

    /**
     * Référence courte enregistrée dans le journal d'audit.
     *
     * @return array{id: int, code: string, name: string}
     */
    public function auditReference(): array
    {
        return ['id' => $this->id, 'code' => $this->code, 'name' => $this->name];
    }
}
