<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Services\Security\AuditLogger;
use App\Services\Security\LoginService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

/**
 * Authentification de la SPA par cookie de session (Sanctum, mode « stateful »).
 * Le frontend appelle d'abord GET /sanctum/csrf-cookie, puis POST /api/v1/auth/login.
 */
class AuthController extends Controller
{
    public function login(LoginRequest $request, LoginService $login): UserResource|JsonResponse
    {
        // Sans session (requête hors application, sans en-tête Referer/Origin d'un domaine autorisé),
        // la connexion ne peut pas être conservée : refus explicite, avant toute vérification ni journalisation.
        if (! $request->hasSession()) {
            return response()->json([
                'message' => 'La session ne peut pas être ouverte pour cette requête. Connectez-vous depuis l\'application GED, '
                    .'ou, depuis un client d\'API, envoyez l\'en-tête Referer (ou Origin) d\'un domaine autorisé et le jeton X-XSRF-TOKEN.',
                'code' => 'SESSION_REQUIRED',
            ], 400);
        }

        $user = $login->attempt((string) $request->input('email'), (string) $request->input('password'));
        $request->session()->regenerate();

        return new UserResource($user->load('department'));
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load('department'));
    }

    public function logout(Request $request, AuditLogger $audit): Response
    {
        $audit->log(AuditEvent::Logout, true, $request->user());

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
