<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Empreinte d'un mot de passe utilisé par un compte (règle C4).
 */
class PasswordHistory extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'password'];

    protected $hidden = ['password'];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
