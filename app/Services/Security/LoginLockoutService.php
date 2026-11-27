<?php

namespace App\Services\Security;

use App\Models\LoginLockout;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Verrouillage après échecs consécutifs, par adresse e-mail (règles A4, A5, A6).
 * Le même traitement s'applique aux adresses inconnues : la réponse ne révèle pas
 * si un compte existe.
 */
class LoginLockoutService
{
    public const MAX_ATTEMPTS = 5;

    public const LOCK_MINUTES = 15;

    /**
     * Fin du verrouillage en cours, ou null si l'adresse n'est pas verrouillée.
     */
    public function lockedUntil(string $email): ?CarbonInterface
    {
        $lockout = LoginLockout::find(LoginLockout::hashEmail($email));

        if (! $lockout?->locked_until) {
            return null;
        }

        if ($lockout->locked_until->isFuture()) {
            return $lockout->locked_until;
        }

        // Verrouillage terminé : le compteur repart de zéro.
        $lockout->delete();

        return null;
    }

    /**
     * Enregistre un échec. Retourne la fin du verrouillage si cet échec le déclenche.
     */
    public function recordFailure(string $email): ?CarbonInterface
    {
        return DB::transaction(function () use ($email) {
            $hash = LoginLockout::hashEmail($email);
            $lockout = LoginLockout::query()->lockForUpdate()->find($hash)
                ?? new LoginLockout(['email_hash' => $hash, 'failed_attempts' => 0]);

            $lockout->failed_attempts++;

            if ($lockout->failed_attempts >= self::MAX_ATTEMPTS) {
                $lockout->locked_until = now()->addMinutes(self::LOCK_MINUTES);
            }

            $lockout->save();

            return $lockout->failed_attempts >= self::MAX_ATTEMPTS ? $lockout->locked_until : null;
        });
    }

    /**
     * Remet le compteur à zéro (connexion réussie, réinitialisation, déverrouillage).
     */
    public function clear(string $email): void
    {
        LoginLockout::query()->whereKey(LoginLockout::hashEmail($email))->delete();
    }

    /**
     * Fin de verrouillage pour plusieurs adresses (liste des comptes de l'administration).
     *
     * @param  iterable<string>  $emails
     * @return array<string, CarbonInterface> clé : e-mail en minuscules
     */
    public function lockedUntilMany(iterable $emails): array
    {
        $byHash = [];
        foreach ($emails as $email) {
            $byHash[LoginLockout::hashEmail($email)] = mb_strtolower(trim($email));
        }

        if ($byHash === []) {
            return [];
        }

        return LoginLockout::query()
            ->whereIn('email_hash', array_keys($byHash))
            ->where('locked_until', '>', now())
            ->get()
            ->mapWithKeys(fn (LoginLockout $l) => [$byHash[$l->email_hash] => $l->locked_until])
            ->all();
    }
}
