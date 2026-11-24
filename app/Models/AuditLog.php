<?php

namespace App\Models;

use App\Enums\AuditEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * Entrée du journal d'audit, en ajout seul : toute modification ou suppression est refusée.
 *
 * @property AuditEvent $event
 */
class AuditLog extends Model
{
    public $timestamps = false;

    /** Horodatage à la milliseconde : l'ordre des événements reste précis dans une même seconde. */
    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'event' => AuditEvent::class,
            'details' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Le journal d\'audit ne peut pas être modifié.'));
        static::deleting(fn () => throw new LogicException('Le journal d\'audit ne peut pas être supprimé.'));
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
