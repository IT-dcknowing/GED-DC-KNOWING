<?php

namespace Tests\Feature\Auth;

use App\Enums\AuditEvent;
use App\Enums\RoleName;
use App\Models\Department;
use App\Services\Security\LoginService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Auth\Concerns\InteractsWithAuth;
use Tests\TestCase;

/**
 * Règles A1 à A7 (connexion), F1 et F2 (journal des connexions et verrouillages).
 */
class LoginTest extends TestCase
{
    use InteractsWithAuth, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpAuth();
    }

    public function test_a1_a2_valid_credentials_open_a_session_verified_by_the_server(): void
    {
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);

        $this->attemptLogin('F.Bamba@Exemple.test')
            ->assertOk()
            ->assertJsonPath('data.email', 'f.bamba@exemple.test')
            ->assertJsonMissingPath('data.password');

        $this->assertAuthenticatedAs($user);
        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_a3_missing_fields_are_reported_in_french(): void
    {
        $this->postJson('/api/v1/auth/login', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'email' => 'Saisissez votre adresse e-mail.',
                'password' => 'Saisissez votre mot de passe.',
            ]);
    }

    public function test_a3_a_deactivated_account_is_refused_with_an_explicit_message(): void
    {
        $this->makeUser(attributes: ['email' => 'inactif@exemple.test', 'is_active' => false]);

        $this->attemptLogin('inactif@exemple.test')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'Ce compte est désactivé.']);

        $this->assertGuest();
    }

    public function test_a4_unknown_email_and_wrong_password_get_exactly_the_same_response(): void
    {
        $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);

        $wrongPassword = $this->attemptLogin('f.bamba@exemple.test', 'Mauvais2026x');
        $unknownEmail = $this->attemptLogin('inconnu@exemple.test', 'Mauvais2026x');

        $wrongPassword->assertUnprocessable();
        $unknownEmail->assertUnprocessable();
        $this->assertSame($wrongPassword->json(), $unknownEmail->json());
        $this->assertSame(LoginService::INVALID_CREDENTIALS, $wrongPassword->json('errors.email.0'));
        $this->assertGuest();
    }

    public function test_a5_account_is_locked_after_5_consecutive_failures_even_with_the_right_password(): void
    {
        $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);

        for ($i = 1; $i <= 4; $i++) {
            $this->attemptLogin('f.bamba@exemple.test', 'Mauvais2026x')
                ->assertJsonValidationErrors(['email' => LoginService::INVALID_CREDENTIALS]);
        }

        $this->attemptLogin('f.bamba@exemple.test', 'Mauvais2026x')
            ->assertJsonValidationErrors(['email' => 'bloquée pendant 15 minutes']);

        $this->attemptLogin('f.bamba@exemple.test')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'bloquée pendant 15 minutes']);

        $this->assertGuest();
    }

    public function test_a5_lock_lasts_15_minutes_then_login_works_again(): void
    {
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);

        for ($i = 1; $i <= 5; $i++) {
            $this->attemptLogin('f.bamba@exemple.test', 'Mauvais2026x');
        }

        $this->travel(14)->minutes();
        $this->attemptLogin('f.bamba@exemple.test')->assertUnprocessable();

        $this->travel(61)->seconds();
        $this->attemptLogin('f.bamba@exemple.test')->assertOk();
        $this->assertAuthenticatedAs($user);
    }

    public function test_a5_an_unknown_address_is_locked_the_same_way_so_accounts_cannot_be_guessed(): void
    {
        $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);

        for ($i = 1; $i <= 5; $i++) {
            $known = $this->attemptLogin('f.bamba@exemple.test', 'Mauvais2026x');
            $unknown = $this->attemptLogin('inconnu@exemple.test', 'Mauvais2026x');
        }

        $this->assertSame($known->json(), $unknown->json());
        $this->assertStringContainsString('bloquée pendant 15 minutes', $unknown->json('errors.email.0'));
    }

    public function test_a6_a_successful_login_resets_the_failure_counter(): void
    {
        $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);

        for ($i = 1; $i <= 4; $i++) {
            $this->attemptLogin('f.bamba@exemple.test', 'Mauvais2026x');
        }
        $this->attemptLogin('f.bamba@exemple.test')->assertOk();
        $this->postJson('/api/v1/auth/logout')->assertNoContent();

        // 4 nouveaux échecs : sans remise à zéro, le 1er aurait déjà verrouillé le compte.
        for ($i = 1; $i <= 4; $i++) {
            $this->attemptLogin('f.bamba@exemple.test', 'Mauvais2026x')
                ->assertJsonValidationErrors(['email' => LoginService::INVALID_CREDENTIALS]);
        }
    }

    public function test_a7_login_returns_role_permissions_and_password_status_for_redirection(): void
    {
        $department = Department::create(['code' => 'DEP-TEST', 'name' => 'Département de test']);
        $this->makeUser(RoleName::DepartmentManager, ['email' => 'resp@exemple.test', 'department_id' => $department->id]);

        $response = $this->attemptLogin('resp@exemple.test')->assertOk()
            ->assertJsonPath('data.role.key', 'resp_dept')
            ->assertJsonPath('data.role.label', 'Responsable de Département')
            ->assertJsonPath('data.department.code', 'DEP-TEST')
            ->assertJsonPath('data.must_change_password', false);

        $this->assertContains('documents.validate', $response->json('data.permissions'));
        $this->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.permissions', $response->json('data.permissions'));
    }

    public function test_login_without_a_session_is_refused_cleanly_and_not_logged(): void
    {
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);

        // Sans Referer/Origin d'un domaine autorisé, Sanctum n'ouvre pas de session.
        $this->withHeader('Referer', '')
            ->postJson('/api/v1/auth/login', ['email' => 'f.bamba@exemple.test', 'password' => self::PASSWORD])
            ->assertStatus(400)
            ->assertJsonPath('code', 'SESSION_REQUIRED')
            ->assertJsonMissingPath('trace');

        $this->assertGuest();
        $this->assertNull($user->fresh()->last_login_at);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_f1_successful_and_failed_logins_are_logged_with_date_email_and_ip(): void
    {
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);

        $this->attemptLogin('f.bamba@exemple.test', 'Mauvais2026x');
        $this->attemptLogin('inconnu@exemple.test', 'Mauvais2026x');
        $this->attemptLogin('f.bamba@exemple.test');

        $this->assertDatabaseHas('audit_logs', [
            'event' => AuditEvent::LoginFailed->value, 'result' => 'failure',
            'email' => 'f.bamba@exemple.test', 'user_id' => $user->id, 'ip' => '127.0.0.1',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'event' => AuditEvent::LoginFailed->value, 'email' => 'inconnu@exemple.test', 'user_id' => null,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'event' => AuditEvent::LoginSucceeded->value, 'result' => 'success',
            'email' => 'f.bamba@exemple.test', 'ip' => '127.0.0.1',
        ]);
        $this->assertDatabaseMissing('audit_logs', ['occurred_at' => null]);
    }

    public function test_f2_lockouts_are_logged(): void
    {
        $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);

        for ($i = 1; $i <= 5; $i++) {
            $this->attemptLogin('f.bamba@exemple.test', 'Mauvais2026x');
        }

        $this->assertDatabaseHas('audit_logs', [
            'event' => AuditEvent::AccountLocked->value,
            'email' => 'f.bamba@exemple.test',
            'ip' => '127.0.0.1',
        ]);
    }
}
