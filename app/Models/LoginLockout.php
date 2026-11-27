<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Compteur d'échecs de connexion consécutifs pour une adresse e-mail (empreinte SHA-256).
 */
class LoginLockout extends Model
{
    public const CREATED_AT = null;

    protected $primaryKey = 'email_hash';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'failed_attempts' => 'integer',
            'locked_until' => 'datetime',
        ];
    }

    public static function hashEmail(string $email): string
    {
        return hash('sha256', mb_strtolower(trim($email)));
    }
}
