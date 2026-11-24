<?php

namespace App\Services\Security;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Changement de mot de passe, historique (règle C4) et mots de passe temporaires (règle B2).
 */
class PasswordService
{
    /** Le mot de passe actuel et les 2 précédents ne peuvent pas être réutilisés. */
    public const HISTORY_DEPTH = 3;

    private const TEMPORARY_LENGTH = 14;

    // Sans caractères ambigus (0/O, 1/l/I).
    private const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

    private const LOWER = 'abcdefghijkmnopqrstuvwxyz';

    private const DIGITS = '23456789';

    /**
     * Enregistre un nouveau mot de passe et l'ajoute à l'historique.
     */
    public function setPassword(User $user, #[\SensitiveParameter] string $plain, bool $mustChange): void
    {
        DB::transaction(function () use ($user, $plain, $mustChange) {
            $user->forceFill([
                'password' => $plain,
                'must_change_password' => $mustChange,
                'password_changed_at' => now(),
            ])->save();

            $this->recordCurrent($user);
        });
    }

    /**
     * Ajoute le mot de passe actuel (déjà haché) à l'historique.
     */
    public function recordCurrent(User $user): void
    {
        $user->passwordHistories()->create(['password' => $user->password]);
    }

    /**
     * Vrai si le mot de passe correspond à l'actuel ou à l'un des 2 précédents.
     */
    public function isRecentlyUsed(User $user, #[\SensitiveParameter] string $plain): bool
    {
        $hashes = $user->passwordHistories()
            ->latest('created_at')
            ->latest('id')
            ->limit(self::HISTORY_DEPTH)
            ->pluck('password');

        // Comptes créés avant la mise en place de l'historique : le mot de passe actuel compte toujours.
        if ($user->password && ! $hashes->contains($user->password)) {
            $hashes->prepend($user->password);
        }

        return $hashes->contains(fn (string $hash) => Hash::check($plain, $hash));
    }

    /**
     * Mot de passe temporaire conforme à la politique (au moins une majuscule, une minuscule, un chiffre).
     */
    public function generateTemporary(): string
    {
        $all = self::UPPER.self::LOWER.self::DIGITS;
        $chars = [
            self::UPPER[random_int(0, strlen(self::UPPER) - 1)],
            self::LOWER[random_int(0, strlen(self::LOWER) - 1)],
            self::DIGITS[random_int(0, strlen(self::DIGITS) - 1)],
        ];

        while (count($chars) < self::TEMPORARY_LENGTH) {
            $chars[] = $all[random_int(0, strlen($all) - 1)];
        }

        // Mélange de Fisher-Yates avec un générateur cryptographique.
        for ($i = count($chars) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$chars[$i], $chars[$j]] = [$chars[$j], $chars[$i]];
        }

        return implode('', $chars);
    }
}
