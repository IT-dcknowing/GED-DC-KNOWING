<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Département du cabinet (RG-01). Jamais supprimé par l'application : on le désactive (décision D6).
 */
#[Fillable(['code', 'name', 'manager_id', 'is_active'])]
class Department extends Model
{
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Clients suivis par ce département (RG-02, lot 2.1).
     *
     * @return BelongsToMany<Client, $this>
     */
    public function clients(): BelongsToMany
    {
        return $this->belongsToMany(Client::class)->withTimestamps();
    }

    /**
     * Ajoute « active_members_count » : nombre de comptes actifs rattachés.
     *
     * @param  Builder<Department>  $query
     */
    public function scopeWithActiveMembersCount(Builder $query): void
    {
        $query->withCount(['users as active_members_count' => fn (Builder $q) => $q->where('is_active', true)]);
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
