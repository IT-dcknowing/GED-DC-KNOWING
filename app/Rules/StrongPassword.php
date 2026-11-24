<?php

namespace App\Rules;

use App\Models\User;
use App\Services\Security\PasswordService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Politique de mot de passe de la GED (règles C1, C2, C4).
 */
class StrongPassword implements ValidationRule
{
    public const MIN_LENGTH = 10;

    public const MAX_LENGTH = 64;

    /** bcrypt ignore ce qui dépasse 72 octets. */
    private const MAX_BYTES = 72;

    /**
     * @param  User|null  $user  si fourni, le mot de passe est aussi comparé à l'historique du compte
     */
    public function __construct(private readonly ?User $user = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('Le mot de passe est invalide.');

            return;
        }

        $length = mb_strlen($value);

        if ($length < self::MIN_LENGTH) {
            $fail('Le mot de passe doit contenir au moins '.self::MIN_LENGTH.' caractères.');
        }

        if ($length > self::MAX_LENGTH || strlen($value) > self::MAX_BYTES) {
            $fail('Le mot de passe est trop long ('.self::MAX_LENGTH.' caractères au maximum).');
        }

        if (! preg_match('/\p{Lu}/u', $value)) {
            $fail('Le mot de passe doit contenir au moins une lettre majuscule.');
        }

        if (! preg_match('/\p{Ll}/u', $value)) {
            $fail('Le mot de passe doit contenir au moins une lettre minuscule.');
        }

        if (! preg_match('/\d/', $value)) {
            $fail('Le mot de passe doit contenir au moins un chiffre.');
        }

        if ($this->user && app(PasswordService::class)->isRecentlyUsed($this->user, $value)) {
            $fail('Ce mot de passe fait partie de vos 3 derniers mots de passe. Choisissez-en un nouveau.');
        }
    }
}
