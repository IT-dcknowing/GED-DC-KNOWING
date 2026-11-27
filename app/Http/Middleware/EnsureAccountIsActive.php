<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Un compte désactivé perd immédiatement l'accès, même avec une session ouverte (règles E3, E4).
 */
class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_active) {
            Auth::guard('web')->logout();

            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return response()->json([
                'message' => 'Votre compte a été désactivé. Contactez l\'administrateur de la GED.',
                'code' => 'ACCOUNT_DISABLED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        return $next($request);
    }
}
