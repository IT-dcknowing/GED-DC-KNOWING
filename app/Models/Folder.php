<?php

namespace App\Models;

use App\Enums\FolderNature;
use App\Enums\RoleName;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Dossier de l'arborescence documentaire GED (Lot 2.2).
 */
#[Fillable([
    'parent_id', 'client_id', 'name', 'slug', 'description', 'path', 'depth', 'sort_order',
    'nature', 'is_locked', 'is_restricted', 'is_readonly', 'created_by',
])]
class Folder extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'nature' => FolderNature::class,
            'depth' => 'integer',
            'sort_order' => 'integer',
            'is_locked' => 'boolean',
            'is_restricted' => 'boolean',
            'is_readonly' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Folder, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * @return HasMany<Folder, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order')->orderBy('name');
    }

    /**
     * @return BelongsTo<Client, $this>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<Document, $this>
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class)->orderByDesc('created_at');
    }

    /**
     * Vrai si la nature et l'état du dossier permettent la création de sous-dossiers libres.
     */
    public function canHaveCustomSubfolders(): bool
    {
        if ($this->is_readonly || $this->slug === '01-clients') {
            return false;
        }

        return $this->nature->allowsCustomSubfolders();
    }

    /**
     * Vrai si le dossier accepte le dépôt direct de documents.
     */
    public function canAcceptDocuments(): bool
    {
        if ($this->is_readonly || $this->slug === '01-clients') {
            return false;
        }

        return $this->nature->allowsUpload();
    }

    /**
     * Vrai si le dossier peut être renommé par l'utilisateur.
     */
    public function canBeRenamed(): bool
    {
        return ! $this->is_locked && ! $this->is_readonly && $this->nature === FolderNature::Custom;
    }

    /**
     * Vrai si le dossier peut être supprimé par l'utilisateur.
     */
    public function canBeDeleted(): bool
    {
        return ! $this->is_locked && ! $this->is_readonly && $this->nature === FolderNature::Custom;
    }

    /**
     * Espace racine de niveau 1 (parent_id is null).
     *
     * @param  Builder<Folder>  $query
     */
    public function scopeRootSpaces(Builder $query): void
    {
        $query->whereNull('parent_id')->orderBy('name');
    }

    /**
     * Calcul de l'arbre d'ancêtres (pour le fil d'Ariane).
     *
     * @return list<array{id: int, name: string, slug: string}>
     */
    public function breadcrumbs(): array
    {
        $crumbs = [];
        $current = $this;

        while ($current !== null) {
            array_unshift($crumbs, [
                'id' => $current->id,
                'name' => $current->name,
                'slug' => $current->slug,
            ]);
            $current = $current->parent;
        }

        return $crumbs;
    }

    /**
     * Référence courte pour journalisation d'audit.
     *
     * @return array{id: int, name: string, path: string}
     */
    public function auditReference(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'path' => $this->path,
        ];
    }
}
