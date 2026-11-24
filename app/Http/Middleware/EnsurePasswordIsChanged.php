<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tant que le mot de passe temporaire n'a pas été changé, seules les routes de profil,
 * de changement de mot de passe et de déconnexion restent accessibles (règle B4).
 */
class EnsurePasswordIsChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->must_change_password) {
            return response()->json([
                'message' => 'Vous devez choisir un nouveau mot de passe avant de continuer.',
                'code' => 'PASSWORD_CHANGE_REQUIRED',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
