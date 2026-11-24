<?php

namespace Tests\Feature\Auth;

use App\Enums\AuditEvent;
use App\Enums\RoleName;
use App\Models\User;
use App\Rules\StrongPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Validator;
use Tests\Feature\Auth\Concerns\InteractsWithAuth;
use Tests\TestCase;

/**
 * Règles B1 à B4 (première connexion) et H1 (pas d'inscription publique).
 */
class FirstLoginTest extends TestCase
{
    use InteractsWithAuth, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpAuth();
    }

    private function createAccountAsAdmin(string $email = 'nouveau@exemple.test'): string
    {
        $admin = $this->makeUser(RoleName::SuperAdmin, ['email' => 'admin@exemple.test']);

        $temporary = $this->actingAs($admin)
            ->postJson('/api/v1/admin/users', ['name' => 'Nouveau Compte', 'email' => $email, 'role' => 'collaborateur'])
            ->assertCreated()
            ->json('temporary_password');

        $this->newBrowser();

        return $temporary;
    }

    public function test_b1_only_the_super_administrator_can_create_accounts(): void
    {
        $director = $this->makeUser(RoleName::Director);

        $this->actingAs($director)
            ->postJson('/api/v1/admin/users', ['name' => 'X', 'email' => 'x@exemple.test', 'role' => 'collaborateur'])
            ->assertForbidden()
            ->assertJsonPath('code', 'FORBIDDEN');

        $admin = $this->makeUser(RoleName::SuperAdmin);

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/users', ['name' => 'Fatou Bamba', 'email' => 'F.Bamba@Exemple.test', 'role' => 'collaborateur'])
            ->assertCreated()
            ->assertJsonPath('data.email', 'f.bamba@exemple.test')
            ->assertJsonPath('data.role.key', 'collaborateur')
            ->assertJsonPath('data.must_change_password', true);

        $this->assertDatabaseHas('users', ['email' => 'f.bamba@exemple.test', 'created_by' => $admin->id]);
        $this->assertDatabaseHas('audit_logs', ['event' => AuditEvent::UserCreated->value, 'actor_id' => $admin->id]);
    }

    public function test_b2_a_compliant_temporary_password_is_generated_and_shown_once(): void
    {
        $temporary = $this->createAccountAsAdmin();

        $this->assertSame(14, strlen($temporary));
        $this->assertTrue(Validator::make(['p' => $temporary], ['p' => [new StrongPassword]])->passes());
        $this->assertDatabaseMissing('users', ['password' => $temporary]);

        // Il n'est plus jamais renvoyé ensuite.
        $admin = User::where('email', 'admin@exemple.test')->first();
        $user = User::where('email', 'nouveau@exemple.test')->first();
        $this->actingAs($admin)->getJson("/api/v1/admin/users/{$user->id}")
            ->assertOk()
            ->assertJsonMissingPath('temporary_password');
    }

    public function test_b3_first_login_requires_choosing_a_new_password(): void
    {
        $temporary = $this->createAccountAsAdmin();

        $this->attemptLogin('nouveau@exemple.test', $temporary)
            ->assertOk()
            ->assertJsonPath('data.must_change_password', true);

        $this->putJson('/api/v1/auth/password', [
            'current_password' => $temporary,
            'password' => 'NouveauSecret2026',
            'password_confirmation' => 'NouveauSecret2026',
        ])->assertOk()->assertJsonPath('data.must_change_password', false);

        $this->assertDatabaseHas('audit_logs', ['event' => AuditEvent::PasswordChanged->value, 'email' => 'nouveau@exemple.test']);
    }

    public function test_b3_the_temporary_password_cannot_be_kept_as_the_new_password(): void
    {
        $temporary = $this->createAccountAsAdmin();
        $this->attemptLogin('nouveau@exemple.test', $temporary)->assertOk();

        $this->putJson('/api/v1/auth/password', [
            'current_password' => $temporary,
            'password' => $temporary,
            'password_confirmation' => $temporary,
        ])->assertUnprocessable()->assertJsonValidationErrors(['password' => '3 derniers mots de passe']);
    }

    public function test_b4_nothing_else_is_accessible_before_the_password_is_changed(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin, ['must_change_password' => true]);

        $this->actingAs($admin)->getJson('/api/v1/admin/users')
            ->assertForbidden()
            ->assertJsonPath('code', 'PASSWORD_CHANGE_REQUIRED');

        // Seuls le profil, le changement de mot de passe et la déconnexion restent accessibles.
        $this->actingAs($admin)->getJson('/api/v1/auth/me')->assertOk();

        $this->actingAs($admin)->putJson('/api/v1/auth/password', [
            'current_password' => self::PASSWORD,
            'password' => 'NouveauSecret2026',
            'password_confirmation' => 'NouveauSecret2026',
        ])->assertOk();

        $this->actingAs($admin->fresh())->getJson('/api/v1/admin/users')->assertOk();
    }

    public function test_h1_there_is_no_public_registration(): void
    {
        $this->postJson('/api/v1/auth/register', ['email' => 'a@b.c', 'password' => 'x'])->assertNotFound();
        $this->postJson('/register')->assertNotFound();

        $registrationRoutes = collect(Route::getRoutes()->getRoutes())
            ->filter(fn ($route) => str_contains($route->uri(), 'register') || str_contains((string) $route->getName(), 'register'));

        $this->assertCount(0, $registrationRoutes);
    }
}
