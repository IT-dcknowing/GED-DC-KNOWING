<?php

namespace Tests\Feature\Auth;

use App\Enums\AuditEvent;
use App\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Session\DatabaseSessionHandler;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Auth\Concerns\InteractsWithAuth;
use Tests\TestCase;

/**
 * Règles E1 à E4 (sessions et autorisations) et F5 (journal des déconnexions).
 */
class SessionTest extends TestCase
{
    use InteractsWithAuth, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpAuth();
    }

    public function test_e1_sessions_expire_after_30_minutes_of_inactivity(): void
    {
        $this->assertSame(30, config('session.lifetime'));
        $this->assertFalse((bool) config('session.expire_on_close'));

        $user = $this->makeUser();
        $handler = new DatabaseSessionHandler(DB::connection(), 'sessions', config('session.lifetime'), $this->app);

        DB::table('sessions')->insert([
            ['id' => 'active-29-min', 'user_id' => $user->id, 'payload' => base64_encode('donnees'),
                'last_activity' => now()->subMinutes(29)->getTimestamp(), 'ip_address' => null, 'user_agent' => null],
            ['id' => 'idle-31-min', 'user_id' => $user->id, 'payload' => base64_encode('donnees'),
                'last_activity' => now()->subMinutes(31)->getTimestamp(), 'ip_address' => null, 'user_agent' => null],
        ]);

        $this->assertSame('donnees', $handler->read('active-29-min'));
        $this->assertSame('', $handler->read('idle-31-min'));
    }

    public function test_e2_f5_logout_closes_the_session_on_the_server_and_is_logged(): void
    {
        $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);
        $this->attemptLogin('f.bamba@exemple.test')->assertOk();

        $this->postJson('/api/v1/auth/logout')->assertNoContent();

        $this->assertGuest('web');
        $this->nextRequest();
        $this->getJson('/api/v1/auth/me')->assertUnauthorized()->assertJsonPath('code', 'UNAUTHENTICATED');
        $this->assertDatabaseHas('audit_logs', [
            'event' => AuditEvent::Logout->value, 'email' => 'f.bamba@exemple.test', 'ip' => '127.0.0.1',
        ]);
    }

    public function test_e3_deactivating_an_account_closes_its_sessions_and_blocks_it_immediately(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $user = $this->makeUser();
        $this->insertSession($user, 'session-1');
        $this->insertSession($user, 'session-2');

        $this->actingAs($admin)->postJson("/api/v1/admin/users/{$user->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->assertSame(0, $this->sessionCount($user));

        // Même avec une session encore ouverte côté navigateur, la requête suivante est refusée.
        $this->actingAs($user->fresh())->getJson('/api/v1/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('code', 'ACCOUNT_DISABLED');
    }

    public function test_e3_changing_the_role_closes_the_sessions(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $user = $this->makeUser(RoleName::Collaborator);
        $this->insertSession($user, 'session-1');

        $this->actingAs($admin)->patchJson("/api/v1/admin/users/{$user->id}", ['role' => 'stagiaire'])
            ->assertOk()
            ->assertJsonPath('data.role.key', 'stagiaire');

        $this->assertSame(0, $this->sessionCount($user));
        $this->assertDatabaseHas('audit_logs', ['event' => AuditEvent::UserUpdated->value, 'user_id' => $user->id]);
    }

    public function test_e3_changing_other_fields_does_not_close_the_sessions(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $user = $this->makeUser();
        $this->insertSession($user, 'session-1');

        $this->actingAs($admin)->patchJson("/api/v1/admin/users/{$user->id}", ['name' => 'Nom corrigé'])->assertOk();

        $this->assertSame(1, $this->sessionCount($user));
    }

    public function test_e4_permissions_are_checked_on_every_request_and_follow_role_changes(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $manager = $this->makeUser(RoleName::GedManager);

        $this->actingAs($manager)->getJson('/api/v1/admin/audit-logs')->assertOk();
        $this->actingAs($manager)->getJson('/api/v1/admin/users')->assertForbidden();

        $this->actingAs($admin)->patchJson("/api/v1/admin/users/{$manager->id}", ['role' => 'collaborateur'])->assertOk();

        $this->actingAs($manager->fresh())->getJson('/api/v1/admin/audit-logs')
            ->assertForbidden()
            ->assertJsonPath('code', 'FORBIDDEN');
    }

    public function test_e4_protected_routes_require_authentication(): void
    {
        foreach (['/api/v1/auth/me', '/api/v1/admin/users', '/api/v1/admin/audit-logs'] as $uri) {
            $this->getJson($uri)->assertUnauthorized()->assertJsonPath('code', 'UNAUTHENTICATED');
        }
    }
}
