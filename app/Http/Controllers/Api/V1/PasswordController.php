<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Resources\UserResource;
use App\Services\Security\AuditLogger;
use App\Services\Security\PasswordService;
use App\Services\Security\SessionInvalidator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Changement de mot de passe par l'utilisateur connecté : depuis le profil (règle C5)
 * ou à la première connexion (règle B3).
 */
class PasswordController extends Controller
{
    public function update(
        ChangePasswordRequest $request,
        PasswordService $passwords,
        SessionInvalidator $sessions,
        AuditLogger $audit,
    ): UserResource {
        $user = $request->user();

        if (! Hash::check((string) $request->input('current_password'), $user->password)) {
            $audit->log(AuditEvent::PasswordChanged, false, $user, details: ['reason' => 'wrong_current_password']);

            throw ValidationException::withMessages([
                'current_password' => 'Le mot de passe actuel est incorrect.',
            ]);
        }

        $firstLogin = (bool) $user->must_change_password;
        $passwords->setPassword($user, (string) $request->input('password'), mustChange: false);

        // Règle C6 : les autres sessions sont fermées, la session en cours est conservée.
        $closed = $sessions->forUser($user, $request->session()->getId());
        // Nouvel identifiant de session, l'ancien est détruit : un cookie dérobé avant le changement ne sert plus.
        $request->session()->regenerate(destroy: true);

        $audit->log(AuditEvent::PasswordChanged, true, $user, details: [
            'first_login' => $firstLogin,
            'other_sessions_closed' => $closed,
        ]);

        return new UserResource($user->fresh('department'));
    }
}
