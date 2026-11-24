<?php

namespace Tests\Feature\Auth;

use App\Enums\AuditEvent;
use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\User;
use App\Services\Security\LoginLockoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Tests\Feature\Auth\Concerns\InteractsWithAuth;
use Tests\TestCase;

/**
 * Règles G1 et G2 (protection du Super Administrateur), administration des comptes
 * et consultation du journal d'audit.
 */
class AccountAdministrationTest extends TestCase
{
    use InteractsWithAuth, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpAuth();
    }

    public function test_g1_an_administrator_cannot_deactivate_their_own_account(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $this->makeUser(RoleName::SuperAdmin);

        $this->actingAs($admin)->postJson("/api/v1/admin/users/{$admin->id}/deactivate")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user' => 'propre compte']);

        $this->assertTrue($admin->fresh()->is_active);
    }

    public function test_g2_the_last_active_super_administrator_cannot_lose_the_role(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);

        $this->actingAs($admin)->patchJson("/api/v1/admin/users/{$admin->id}", ['role' => 'directeur'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role' => 'au moins un Super Administrateur actif']);

        $this->assertSame(RoleName::SuperAdmin, $admin->fresh()->roleName());
    }

    public function test_g2_an_inactive_super_administrator_does_not_count(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $this->makeUser(RoleName::SuperAdmin, ['is_active' => false]);

        $this->actingAs($admin)->patchJson("/api/v1/admin/users/{$admin->id}", ['role' => 'directeur'])
            ->assertUnprocessable();
    }

    public function test_g2_super_administrators_can_be_managed_while_another_one_stays_active(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $second = $this->makeUser(RoleName::SuperAdmin);

        $this->actingAs($admin)->postJson("/api/v1/admin/users/{$second->id}/deactivate")->assertOk();
        $this->actingAs($admin)->postJson("/api/v1/admin/users/{$second->id}/activate")->assertOk();
        $this->actingAs($admin)->patchJson("/api/v1/admin/users/{$admin->id}", ['role' => 'directeur'])->assertOk();

        $this->assertSame(1, User::role('super_admin')->where('is_active', true)->count());
    }

    public function test_account_creation_validates_input(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin, ['email' => 'admin@exemple.test']);

        $this->actingAs($admin)->postJson('/api/v1/admin/users', [
            'name' => 'Doublon', 'email' => 'ADMIN@exemple.test', 'role' => 'inexistant', 'department_id' => 999,
        ])->assertUnprocessable()->assertJsonValidationErrors(['email', 'role', 'department_id']);
    }

    public function test_account_can_be_linked_to_a_department(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $department = Department::create(['code' => 'DEP-TEST', 'name' => 'Département de test']);

        $this->actingAs($admin)->postJson('/api/v1/admin/users', [
            'name' => 'Membre', 'email' => 'membre@exemple.test', 'role' => 'collaborateur', 'department_id' => $department->id,
        ])->assertCreated()->assertJsonPath('data.department.code', 'DEP-TEST');
    }

    public function test_admin_reset_generates_a_new_temporary_password_and_closes_sessions(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);
        $this->insertSession($user, 'session-1');

        $temporary = $this->actingAs($admin)->postJson("/api/v1/admin/users/{$user->id}/reset-password")
            ->assertOk()
            ->json('temporary_password');

        $this->assertSame(0, $this->sessionCount($user));
        $this->assertTrue($user->fresh()->must_change_password);
        $this->newBrowser();
        $this->attemptLogin('f.bamba@exemple.test', $temporary)->assertOk()->assertJsonPath('data.must_change_password', true);
        $this->assertDatabaseHas('audit_logs', ['event' => AuditEvent::UserPasswordReset->value, 'actor_id' => $admin->id]);
    }

    public function test_admin_sees_and_lifts_a_lock(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);
        for ($i = 1; $i <= 5; $i++) {
            $this->attemptLogin('f.bamba@exemple.test', 'Mauvais2026x');
        }

        $listed = collect($this->actingAs($admin)->getJson('/api/v1/admin/users')->assertOk()->json('data'))
            ->firstWhere('email', 'f.bamba@exemple.test');
        $this->assertNotNull($listed['locked_until']);

        $this->actingAs($admin)->postJson("/api/v1/admin/users/{$user->id}/unlock")->assertOk();

        $this->assertNull(app(LoginLockoutService::class)->lockedUntil('f.bamba@exemple.test'));
        $this->assertDatabaseHas('audit_logs', ['event' => AuditEvent::UserUnlocked->value, 'user_id' => $user->id]);
    }

    public function test_user_list_can_be_filtered(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin, ['name' => 'Admin']);
        $this->makeUser(RoleName::Auditor, ['name' => 'Claire Auditrice']);
        $this->makeUser(RoleName::Collaborator, ['name' => 'Yann Inactif', 'is_active' => false]);

        $this->actingAs($admin)->getJson('/api/v1/admin/users?role=auditeur')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Claire Auditrice');
        $this->actingAs($admin)->getJson('/api/v1/admin/users?status=inactive')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Yann Inactif');
        $this->actingAs($admin)->getJson('/api/v1/admin/users?search=claire')
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_reference_lists_are_available_to_the_administrator(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);

        $this->actingAs($admin)->getJson('/api/v1/admin/roles')->assertOk()->assertJsonCount(7, 'data');
        $this->actingAs($admin)->getJson('/api/v1/admin/departments')->assertOk();
    }

    public function test_audit_log_is_readable_only_with_the_journal_permission(): void
    {
        $this->actingAs($this->makeUser(RoleName::Collaborator))->getJson('/api/v1/admin/audit-logs')->assertForbidden();

        $director = $this->makeUser(RoleName::Director, ['email' => 'direction@exemple.test']);
        $this->attemptLogin('direction@exemple.test')->assertOk();

        $this->actingAs($director)->getJson('/api/v1/admin/audit-logs?event=auth.login.succeeded')
            ->assertOk()
            ->assertJsonPath('data.0.event.label', 'Connexion réussie')
            ->assertJsonPath('data.0.email', 'direction@exemple.test')
            ->assertJsonPath('data.0.ip', '127.0.0.1');
    }

    public function test_audit_log_entries_cannot_be_modified_or_deleted(): void
    {
        $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);
        $this->attemptLogin('f.bamba@exemple.test');
        $entry = AuditLog::firstOrFail();

        try {
            $entry->update(['result' => 'failure']);
            $this->fail('La modification aurait dû être refusée.');
        } catch (LogicException) {
        }

        try {
            $entry->delete();
            $this->fail('La suppression aurait dû être refusée.');
        } catch (LogicException) {
        }

        $this->assertSame('success', $entry->fresh()->result);
    }
}
