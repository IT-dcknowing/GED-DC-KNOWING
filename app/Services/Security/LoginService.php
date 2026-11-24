<?php

namespace App\Services\Security;

use App\Enums\AuditEvent;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Vérification des identifiants avec verrouillage et journal (règles A1 à A6, F1, F2).
 */
class LoginService
{
    public const INVALID_CREDENTIALS = 'Adresse e-mail ou mot de passe incorrect.';

    /** Empreinte factice : le temps de réponse reste le même que l'adresse existe ou non. */
    private ?string $dummyHash = null;

    public function __construct(
        private readonly LoginLockoutService $lockouts,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Ouvre la session si les identifiants sont valides, sinon lève une erreur de validation.
     *
     * @throws ValidationException
     */
    public function attempt(string $email, #[\SensitiveParameter] string $password): User
    {
        $email = mb_strtolower(trim($email));

        if ($lockedUntil = $this->lockouts->lockedUntil($email)) {
            $this->audit->log(AuditEvent::LoginFailed, false, email: $email, details: ['reason' => 'account_locked']);

            throw ValidationException::withMessages(['email' => $this->lockedMessage($lockedUntil)]);
        }

        $user = User::query()->where('email', $email)->first();
        $valid = Hash::check($password, $user?->password ?? $this->dummyHash()) && $user !== null;

        if (! $valid) {
            $lockedUntil = $this->lockouts->recordFailure($email);
            $this->audit->log(AuditEvent::LoginFailed, false, $user, $email, ['reason' => 'invalid_credentials']);

            if ($lockedUntil) {
                $this->audit->log(AuditEvent::AccountLocked, false, $user, $email, [
                    'locked_until' => $lockedUntil->toIso8601String(),
                    'attempts' => LoginLockoutService::MAX_ATTEMPTS,
                ]);

                throw ValidationException::withMessages(['email' => $this->lockedMessage($lockedUntil)]);
            }

            throw ValidationException::withMessages(['email' => self::INVALID_CREDENTIALS]);
        }

        // Mot de passe correct mais compte désactivé : ce message ne permet pas de deviner une adresse.
        if (! $user->is_active) {
            $this->audit->log(AuditEvent::LoginFailed, false, $user, $email, ['reason' => 'account_inactive']);

            throw ValidationException::withMessages([
                'email' => 'Ce compte est désactivé. Contactez l\'administrateur de la GED.',
            ]);
        }

        $this->lockouts->clear($email);
        Auth::guard('web')->login($user);
        $user->forceFill(['last_login_at' => now()])->saveQuietly();
        $this->audit->log(AuditEvent::LoginSucceeded, true, $user, $email);

        return $user;
    }

    private function dummyHash(): string
    {
        return $this->dummyHash ??= Hash::make(Str::random(40));
    }

    private function lockedMessage(CarbonInterface $until): string
    {
        $minutes = max(1, (int) ceil(now()->diffInSeconds($until, true) / 60));

        return 'Trop de tentatives échouées : la connexion à ce compte est bloquée pendant '
            .LoginLockoutService::LOCK_MINUTES." minutes. Réessayez dans {$minutes} minute(s).";
    }
}
