<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use App\Services\Security\AuditLogger;
use App\Services\Security\LoginLockoutService;
use App\Services\Security\PasswordService;
use App\Services\Security\SessionInvalidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

/**
 * Mot de passe oublié (règles D1 à D6). Les jetons sont gérés par le « password broker »
 * de Laravel : 60 minutes de validité, usage unique.
 */
class PasswordResetController extends Controller
{
    public const REQUEST_ACKNOWLEDGED = 'Si un compte actif correspond à cette adresse, un e-mail contenant un lien de '
        .'réinitialisation vient d\'être envoyé. Ce lien est valable une heure.';

    public const INVALID_LINK = 'Ce lien de réinitialisation est invalide ou a expiré. Faites une nouvelle demande.';

    public function forgot(ForgotPasswordRequest $request, AuditLogger $audit): JsonResponse
    {
        $email = mb_strtolower(trim((string) $request->input('email')));
        $user = User::query()->where('email', $email)->first();
        $sent = false;

        if ($user?->is_active) {
            // Laravel limite à un envoi par minute pour un même compte ; la réponse ne change pas.
            $sent = Password::broker()->sendResetLink(['email' => $email]) === Password::RESET_LINK_SENT;
        }

        $audit->log(AuditEvent::PasswordResetRequested, true, $user, $email, [
            'account_found' => $user !== null,
            'link_sent' => $sent,
        ]);

        // Règle D3 : réponse identique dans tous les cas.
        return response()->json(['message' => self::REQUEST_ACKNOWLEDGED]);
    }

    public function reset(
        ResetPasswordRequest $request,
        PasswordService $passwords,
        SessionInvalidator $sessions,
        LoginLockoutService $lockouts,
        AuditLogger $audit,
    ): JsonResponse {
        $email = mb_strtolower(trim((string) $request->input('email')));
        $credentials = [
            'email' => $email,
            'password' => $request->input('password'),
            'password_confirmation' => $request->input('password_confirmation'),
            'token' => $request->input('token'),
        ];

        $status = Password::broker()->reset($credentials, function (User $user, string $password) use ($passwords, $sessions, $lockouts, $audit) {
            if (! $user->is_active) {
                throw ValidationException::withMessages(['token' => self::INVALID_LINK]);
            }

            if ($passwords->isRecentlyUsed($user, $password)) {
                throw ValidationException::withMessages([
                    'password' => 'Ce mot de passe fait partie de vos 3 derniers mots de passe. Choisissez-en un nouveau.',
                ]);
            }

            $passwords->setPassword($user, $password, mustChange: false);
            $closed = $sessions->forUser($user);
            $lockouts->clear($user->email);

            $audit->log(AuditEvent::PasswordResetCompleted, true, $user, details: ['sessions_closed' => $closed]);
        });

        if ($status !== Password::PASSWORD_RESET) {
            $audit->log(AuditEvent::PasswordResetFailed, false, email: $email, details: ['reason' => $status]);

            throw ValidationException::withMessages(['token' => self::INVALID_LINK]);
        }

        return response()->json([
            'message' => 'Votre mot de passe a été réinitialisé. Vous pouvez vous connecter.',
        ]);
    }
}
