<?php

namespace Tests\Feature\Auth\Concerns;

use App\Enums\RoleName;
use App\Models\User;
use App\Services\Security\PasswordService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;

/**
 * Outils communs aux tests d'authentification.
 */
trait InteractsWithAuth
{
    protected const PASSWORD = 'MotDePasse2026';

    protected function setUpAuth(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        // Requêtes émises « depuis la SPA » : Sanctum active la session sur les routes API.
        config(['sanctum.stateful' => ['localhost']]);
        $this->withHeader('Referer', 'http://localhost/');
    }

    protected function makeUser(RoleName $role = RoleName::Collaborator, array $attributes = [], string $password = self::PASSWORD): User
    {
        $user = User::factory()->create($attributes + ['password' => $password]);
        $user->assignRole($role->value);
        app(PasswordService::class)->recordCurrent($user);

        return $user->fresh();
    }

    protected function attemptLogin(string $email, string $password = self::PASSWORD): TestResponse
    {
        return $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => $password]);
    }

    /**
     * Dans les tests, toutes les requêtes partagent la même instance de l'application :
     * les gardes d'authentification gardent l'utilisateur de la requête précédente en mémoire.
     * Ces méthodes reproduisent ce qui se passe réellement entre deux requêtes HTTP.
     */
    protected function nextRequest(): void
    {
        $this->app['auth']->forgetGuards();
        config(['auth.defaults.guard' => 'web']);
    }

    /** Nouvelle requête depuis un autre navigateur (aucune session ouverte). */
    protected function newBrowser(): void
    {
        $this->nextRequest();
        $this->app['session.store']->flush();
    }

    protected function insertSession(User $user, string $id): void
    {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $user->id,
            'ip_address' => '10.0.0.1',
            'user_agent' => 'Test',
            'payload' => base64_encode('session'),
            'last_activity' => now()->getTimestamp(),
        ]);
    }

    protected function sessionCount(User $user): int
    {
        return DB::table('sessions')->where('user_id', $user->id)->count();
    }
}
