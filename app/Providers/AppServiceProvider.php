<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Politique de mot de passe (règles C1, C2). La règle complète, avec l'historique (C4),
        // est App\Rules\StrongPassword ; celle-ci sert de valeur par défaut cohérente.
        Password::defaults(fn () => Password::min(10)->max(64)->mixedCase()->numbers());

        $this->configureRateLimiting();
    }

    /**
     * Limites par route, chacune avec son propre compteur : des tentatives de connexion
     * ne doivent pas bloquer la demande de réinitialisation, et inversement.
     * Le verrouillage par adresse e-mail (règle A5) est géré à part par LoginLockoutService.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(20)->by('login|'.$request->ip()));

        RateLimiter::for('password-forgot', fn (Request $request) => Limit::perMinute(5)->by('forgot|'.$request->ip()));

        RateLimiter::for('password-reset', fn (Request $request) => Limit::perMinute(10)->by('reset|'.$request->ip()));

        RateLimiter::for('password-update', fn (Request $request) => Limit::perMinute(5)
            ->by('password-update|'.($request->user()?->getAuthIdentifier() ?? $request->ip())));
    }
}
