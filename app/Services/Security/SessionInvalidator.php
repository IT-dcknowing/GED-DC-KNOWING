<?php

namespace App\Services\Security;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Ferme côté serveur les sessions d'un utilisateur (règles C6, D6, E3).
 * Les sessions sont stockées dans la table « sessions » (SESSION_DRIVER=database).
 */
class SessionInvalidator
{
    /**
     * @param  string|null  $exceptSessionId  session à conserver (celle de la requête en cours)
     * @return int nombre de sessions fermées
     */
    public function forUser(User $user, ?string $exceptSessionId = null): int
    {
        // Rend aussi caducs d'éventuels cookies « se souvenir de moi ».
        $user->forceFill(['remember_token' => Str::random(60)])->saveQuietly();

        return DB::table(config('session.table', 'sessions'))
            ->where('user_id', $user->id)
            ->when($exceptSessionId, fn ($query) => $query->where('id', '!=', $exceptSessionId))
            ->delete();
    }
}
