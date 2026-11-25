<?php

namespace Tests\Feature\Auth;

use App\Enums\AuditEvent;
use App\Enums\PermissionName;
use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\User;
use App\Services\Security\LoginLockoutService;
use App\Services\Security\UserAdministrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
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

    /*
    | Règle G2. Par l'API, seul un Super Administrateur actif peut agir et il ne peut ni se désactiver (G1)
    | ni changer son propre rôle (A1) : la règle G2 est donc vérifiée au niveau du service, où elle
    | s'applique en défense en profondeur quel que soit l'appelant.
    */

    public function test_g2_the_last_active_super_administrator_cannot_lose_the_role(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $actor = $this->makeUser(RoleName::Director);

        try {
            app(UserAdministrationService::class)->update($admin, ['role' => 'directeur'], $actor);
            $this->fail('Le dernier Super Administrateur actif aurait dû conserver son rôle.');
        } catch (ValidationException $e) {
            $this->assertStringContainsString('au moins un Super Administrateur actif', $e->errors()['role'][0]);
        }

        $this->assertSame(RoleName::SuperAdmin, $admin->fresh()->roleName());
    }

    public function test_g2_the_last_active_super_administrator_cannot_be_deactivated(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $actor = $this->makeUser(RoleName::Director);

        $this->expectException(ValidationException::class);
        app(UserAdministrationService::class)->deactivate($admin, $actor);
    }

    public function test_g2_an_inactive_super_administrator_does_not_count(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $this->makeUser(RoleName::SuperAdmin, ['is_active' => false]);
        $actor = $this->makeUser(RoleName::Director);

        $this->expectException(ValidationException::class);
        app(UserAdministrationService::class)->update($admin, ['role' => 'directeur'], $actor);
    }

    public function test_g2_super_administrators_can_be_managed_while_another_one_stays_active(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $second = $this->makeUser(RoleName::SuperAdmin);

        $this->actingAs($admin)->postJson("/api/v1/admin/users/{$second->id}/deactivate")->assertOk();
        $this->actingAs($admin)->postJson("/api/v1/admin/users/{$second->id}/activate")->assertOk();
        $this->actingAs($admin)->patchJson("/api/v1/admin/users/{$second->id}", ['role' => 'directeur'])->assertOk();

        $this->assertSame(1, User::role('super_admin')->where('is_active', true)->count());
    }

    public function test_a1_an_administrator_cannot_change_their_own_role(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin, ['name' => 'Nom initial']);
        $this->makeUser(RoleName::SuperAdmin);
        $this->insertSession($admin, 'session-admin');

        $this->actingAs($admin)->patchJson("/api/v1/admin/users/{$admin->id}", ['role' => 'directeur'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role' => 'Vous ne pouvez pas modifier votre propre rôle.']);

        $this->assertSame(RoleName::SuperAdmin, $admin->fresh()->roleName());
        $this->assertSame(1, $this->sessionCount($admin), 'Sa session ne doit pas être fermée.');
    }

    public function test_a1_an_administrator_can_still_update_other_fields_of_their_own_account(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin, ['name' => 'Nom initial']);

        // Le même rôle renvoyé avec le formulaire n'est pas un changement de rôle.
        $this->actingAs($admin)->patchJson("/api/v1/admin/users/{$admin->id}", ['name' => 'Nom corrigé', 'role' => 'super_admin'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Nom corrigé');
    }

    public function test_a2_percent_and_underscore_are_searched_literally(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin, ['name' => 'Admin Principal', 'email' => 'admin@exemple.test']);
        $this->makeUser(attributes: ['name' => 'Taux 100% atteint', 'email' => 'taux@exemple.test']);
        $this->makeUser(attributes: ['name' => 'Jean_Paul Martin', 'email' => 'jean@exemple.test']);
        $this->makeUser(attributes: ['name' => 'Jean Paul Durand', 'email' => 'jp@exemple.test']);

        $names = fn (string $search) => collect(
            $this->actingAs($admin)->getJson('/api/v1/admin/users?search='.urlencode($search))->assertOk()->json('data')
        )->pluck('name')->all();

        $this->assertSame(['Taux 100% atteint'], $names('%'));
        $this->assertSame(['Jean_Paul Martin'], $names('_'));
        $this->assertSame(['Jean_Paul Martin'], $names('Jean_Paul'));
        $this->assertSame([], $names('!'));
        $this->assertCount(2, $names('Jean'));
    }

    public function test_a3_lock_status_is_reported_per_account_in_list_and_detail(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin, ['name' => 'Admin']);
        $locked = $this->makeUser(attributes: ['name' => 'Bloqué', 'email' => 'bloque@exemple.test']);
        $this->makeUser(attributes: ['name' => 'Libre', 'email' => 'libre@exemple.test']);
        for ($i = 1; $i <= 5; $i++) {
            app(LoginLockoutService::class)->recordFailure('bloque@exemple.test');
        }

        $list = collect($this->actingAs($admin)->getJson('/api/v1/admin/users')->assertOk()->json('data'))->keyBy('email');
        $this->assertNotNull($list['bloque@exemple.test']['locked_until']);
        $this->assertNull($list['libre@exemple.test']['locked_until']);

        $this->actingAs($admin)->getJson("/api/v1/admin/users/{$locked->id}")->assertOk()
            ->assertJsonPath('data.locked_until', fn ($v) => is_string($v));
    }

    public function test_a4_account_detail_shows_creation_date_and_creator(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin, ['name' => 'Admin Créateur']);

        $id = $this->actingAs($admin)
            ->postJson('/api/v1/admin/users', ['name' => 'Nouveau', 'email' => 'nouveau@exemple.test', 'role' => 'collaborateur'])
            ->assertCreated()
            ->assertJsonPath('data.created_by.name', 'Admin Créateur')
            ->json('data.id');

        $this->actingAs($admin)->getJson("/api/v1/admin/users/{$id}")->assertOk()
            ->assertJsonPath('data.created_by.id', $admin->id)
            ->assertJsonPath('data.created_at', fn ($v) => is_string($v));

        // Compte créé sans administrateur (ligne de commande, seeder) : créateur non renseigné.
        $this->actingAs($admin)->getJson("/api/v1/admin/users/{$admin->id}")->assertOk()
            ->assertJsonPath('data.created_by', null);
    }

    public function test_roles_list_exposes_descriptions_applied_permissions_and_account_counts(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $this->makeUser(RoleName::Auditor);
        $this->makeUser(RoleName::Auditor);

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/roles')->assertOk();
        $roles = collect($response->json('data'))->keyBy('key');

        $this->assertCount(7, $roles);
        $this->assertSame(2, $roles['auditeur']['users_count']);
        $this->assertSame(1, $roles['super_admin']['users_count']);
        $this->assertStringContainsString('Consultation seule', $roles['auditeur']['description']);
        $this->assertCount(count(PermissionName::cases()), $response->json('meta.permissions'));

        // Les permissions affichées sont celles réellement appliquées par l'application.
        foreach (RoleName::cases() as $role) {
            $expected = collect($role->permissions())->map->value->sort()->values()->all();
            $this->assertSame($expected, collect($roles[$role->value]['permissions'])->pluck('key')->all(), $role->value);
        }
        $this->assertSame(
            ['key' => 'documents.download', 'label' => 'Télécharger des documents'],
            $roles['auditeur']['permissions'][0],
        );
    }

    public function test_roles_list_is_refused_without_the_users_permission(): void
    {
        $this->actingAs($this->makeUser(RoleName::Director))
            ->getJson('/api/v1/admin/roles')
            ->assertForbidden()
            ->assertJsonPath('code', 'FORBIDDEN');
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
