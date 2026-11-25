<?php

namespace Tests\Feature\Departments;

use App\Enums\AuditEvent;
use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\Department;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Auth\Concerns\InteractsWithAuth;
use Tests\TestCase;

/**
 * Lot 1.3, module Départements : décisions D1 (consultation), D2 (gestion), D4 (responsable),
 * D6 (désactivation) et D7 (code).
 */
class DepartmentManagementTest extends TestCase
{
    use InteractsWithAuth, RefreshDatabase;

    private Department $compta;

    private Department $fiscal;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpAuth();

        $this->compta = Department::create(['code' => 'DEP-01', 'name' => 'Comptabilité', 'is_active' => true]);
        $this->fiscal = Department::create(['code' => 'DEP-02', 'name' => 'Fiscalité', 'is_active' => true]);
    }

    /* D1 : consultation */

    public function test_d1_cabinet_wide_roles_see_every_department(): void
    {
        foreach ([RoleName::SuperAdmin, RoleName::Director, RoleName::GedManager] as $role) {
            $this->actingAs($this->makeUser($role))->getJson('/api/v1/departments')
                ->assertOk()
                ->assertJsonCount(2, 'data')
                ->assertJsonPath('data.0.code', 'DEP-01')
                ->assertJsonPath('data.1.code', 'DEP-02');
            $this->newBrowser();
        }
    }

    public function test_d1_a_department_manager_sees_only_their_own_department(): void
    {
        $manager = $this->makeUser(RoleName::DepartmentManager, ['department_id' => $this->fiscal->id]);

        $this->actingAs($manager)->getJson('/api/v1/departments')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'DEP-02');

        $this->nextRequest();
        $this->actingAs($manager)->getJson("/api/v1/departments/{$this->fiscal->id}")->assertOk();

        $this->nextRequest();
        $this->actingAs($manager)->getJson("/api/v1/departments/{$this->compta->id}")
            ->assertForbidden()
            ->assertJson(['code' => 'FORBIDDEN', 'message' => 'Vous n\'avez pas les droits nécessaires pour cette action.']);
    }

    public function test_d1_a_department_manager_without_department_sees_an_empty_list(): void
    {
        $this->actingAs($this->makeUser(RoleName::DepartmentManager))->getJson('/api/v1/departments')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_d1_other_roles_are_refused_even_for_their_own_department(): void
    {
        foreach ([RoleName::Collaborator, RoleName::Intern, RoleName::Auditor] as $role) {
            $user = $this->makeUser($role, ['department_id' => $this->compta->id]);

            $this->actingAs($user)->getJson('/api/v1/departments')->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');
            $this->nextRequest();

            $this->actingAs($user)->getJson("/api/v1/departments/{$this->compta->id}")->assertForbidden();
            $this->newBrowser();
        }
    }

    public function test_d1_a_guest_is_refused_and_an_unknown_department_is_not_found(): void
    {
        $this->getJson('/api/v1/departments')->assertUnauthorized()->assertJsonPath('code', 'UNAUTHENTICATED');

        $this->actingAs($this->makeUser(RoleName::Director))->getJson('/api/v1/departments/999999')
            ->assertNotFound()
            ->assertJsonPath('code', 'NOT_FOUND');
    }

    public function test_list_shows_manager_and_active_members_count_only(): void
    {
        $manager = $this->makeUser(RoleName::DepartmentManager, ['department_id' => $this->compta->id, 'name' => 'Awa Koné']);
        $this->compta->forceFill(['manager_id' => $manager->id])->save();
        $this->makeUser(RoleName::Collaborator, ['department_id' => $this->compta->id]);
        $this->makeUser(RoleName::Collaborator, ['department_id' => $this->compta->id, 'is_active' => false]);

        $this->actingAs($this->makeUser(RoleName::Director))->getJson('/api/v1/departments')
            ->assertOk()
            ->assertJsonPath('data.0.manager', ['id' => $manager->id, 'name' => 'Awa Koné'])
            ->assertJsonPath('data.0.active_members_count', 2)
            ->assertJsonPath('data.1.manager', null)
            ->assertJsonPath('data.1.active_members_count', 0)
            ->assertJsonMissingPath('data.0.members');
    }

    public function test_detail_lists_members_with_role_status_and_manager_flag(): void
    {
        $manager = $this->makeUser(RoleName::DepartmentManager, ['department_id' => $this->compta->id, 'name' => 'Awa Koné']);
        $this->compta->forceFill(['manager_id' => $manager->id])->save();
        $this->makeUser(RoleName::Collaborator, ['department_id' => $this->compta->id, 'name' => 'Bakary Touré', 'is_active' => false]);
        $this->makeUser(RoleName::Collaborator, ['department_id' => $this->fiscal->id]);

        $this->actingAs($this->makeUser(RoleName::GedManager))->getJson("/api/v1/departments/{$this->compta->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data.members')
            ->assertJsonPath('data.members.0', [
                'id' => $manager->id, 'name' => 'Awa Koné',
                'role' => ['key' => 'resp_dept', 'label' => 'Responsable de Département'],
                'is_active' => true, 'is_manager' => true,
            ])
            ->assertJsonPath('data.members.1.name', 'Bakary Touré')
            ->assertJsonPath('data.members.1.is_active', false)
            ->assertJsonPath('data.members.1.is_manager', false);
    }

    /* D2 : gestion réservée à departments.manage ; D7 : code */

    public function test_d2_super_administrator_creates_a_department_without_manager(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);

        $this->actingAs($admin)->postJson('/api/v1/departments', ['code' => ' dep-03 ', 'name' => '  Social   et Paie '])
            ->assertCreated()
            ->assertJsonPath('data.code', 'DEP-03')
            ->assertJsonPath('data.name', 'Social et Paie')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.manager', null)
            ->assertJsonPath('data.created_by', ['id' => $admin->id, 'name' => $admin->name])
            ->assertJsonPath('data.members', []);

        $log = AuditLog::where('event', AuditEvent::DepartmentCreated)->sole();
        $this->assertSame($admin->id, $log->actor_id);
        $this->assertNull($log->user_id);
        $this->assertSame('DEP-03', $log->details['department']['code']);
    }

    public function test_d2_only_the_super_administrator_can_write(): void
    {
        foreach ([RoleName::Director, RoleName::GedManager, RoleName::DepartmentManager, RoleName::Collaborator] as $role) {
            $user = $this->makeUser($role, ['department_id' => $this->compta->id]);

            $this->actingAs($user)->postJson('/api/v1/departments', ['code' => 'DEP-09', 'name' => 'Nouveau'])
                ->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');
            $this->nextRequest();

            $this->actingAs($user)->patchJson("/api/v1/departments/{$this->compta->id}", ['name' => 'Renommé'])->assertForbidden();
            $this->nextRequest();

            $this->actingAs($user)->postJson("/api/v1/departments/{$this->fiscal->id}/deactivate")->assertForbidden();
            $this->nextRequest();

            $this->actingAs($user)->postJson("/api/v1/departments/{$this->fiscal->id}/activate")->assertForbidden();
            $this->newBrowser();
        }

        $this->assertDatabaseMissing('departments', ['code' => 'DEP-09']);
        $this->assertSame('Comptabilité', $this->compta->fresh()->name);
        $this->assertTrue($this->fiscal->fresh()->is_active);
    }

    public function test_d7_code_format_and_uniqueness_are_enforced(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);

        foreach (['DEP_04', 'D', 'DÉP-04', 'DEP 04', str_repeat('A', 21)] as $code) {
            $this->actingAs($admin)->postJson('/api/v1/departments', ['code' => $code, 'name' => 'Nom '.$code])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('code');
            $this->nextRequest();
        }

        $this->actingAs($admin)->postJson('/api/v1/departments', ['code' => 'dep-01', 'name' => 'Autre nom'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => 'déjà ce code']);

        $this->nextRequest();
        $this->actingAs($admin)->postJson('/api/v1/departments', ['code' => 'DEP-05', 'name' => 'Comptabilité'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => 'déjà ce nom']);
    }

    public function test_d7_code_cannot_be_changed(): void
    {
        $this->actingAs($this->makeUser(RoleName::SuperAdmin))
            ->patchJson("/api/v1/departments/{$this->compta->id}", ['code' => 'DEP-99', 'name' => 'Comptabilité générale'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => 'ne peut pas être modifié']);

        $this->assertSame('DEP-01', $this->compta->fresh()->code);
        $this->assertSame('Comptabilité', $this->compta->fresh()->name);
    }

    public function test_renaming_is_journaled_and_an_unchanged_update_is_not(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);

        $this->actingAs($admin)->patchJson("/api/v1/departments/{$this->compta->id}", ['name' => 'Comptabilité'])->assertOk();
        $this->assertSame(0, AuditLog::where('event', AuditEvent::DepartmentUpdated)->count());

        $this->nextRequest();
        $this->actingAs($admin)->patchJson("/api/v1/departments/{$this->compta->id}", ['name' => 'Comptabilité générale'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Comptabilité générale')
            ->assertJsonPath('data.code', 'DEP-01');

        $log = AuditLog::where('event', AuditEvent::DepartmentUpdated)->sole();
        $this->assertSame(['from' => 'Comptabilité', 'to' => 'Comptabilité générale'], $log->details['name']);
    }

    /* D4 : responsable */

    public function test_d4_an_eligible_account_is_designated_and_the_change_is_journaled(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $manager = $this->makeUser(RoleName::DepartmentManager, ['department_id' => $this->compta->id, 'name' => 'Awa Koné']);

        $this->actingAs($admin)->patchJson("/api/v1/departments/{$this->compta->id}", ['manager_id' => $manager->id])
            ->assertOk()
            ->assertJsonPath('data.manager', ['id' => $manager->id, 'name' => 'Awa Koné'])
            ->assertJsonPath('data.members.0.is_manager', true);

        $this->nextRequest();
        $this->actingAs($admin)->patchJson("/api/v1/departments/{$this->compta->id}", ['manager_id' => null])
            ->assertOk()
            ->assertJsonPath('data.manager', null);

        $logs = AuditLog::where('event', AuditEvent::DepartmentUpdated)->orderBy('id')->get();
        $this->assertCount(2, $logs);
        $this->assertSame(['from' => null, 'to' => ['id' => $manager->id, 'name' => 'Awa Koné']], $logs[0]->details['manager']);
        $this->assertSame(['from' => ['id' => $manager->id, 'name' => 'Awa Koné'], 'to' => null], $logs[1]->details['manager']);
    }

    public function test_d4_ineligible_accounts_are_refused(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $cases = [
            'rôle « Responsable de Département »' => $this->makeUser(RoleName::Collaborator, ['department_id' => $this->compta->id]),
            'pas rattaché à ce département' => $this->makeUser(RoleName::DepartmentManager, ['department_id' => $this->fiscal->id]),
            'est désactivé' => $this->makeUser(RoleName::DepartmentManager, ['department_id' => $this->compta->id, 'is_active' => false]),
        ];

        foreach ($cases as $message => $candidate) {
            $this->actingAs($admin)->patchJson("/api/v1/departments/{$this->compta->id}", ['manager_id' => $candidate->id])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['manager_id' => $message]);
            $this->nextRequest();
        }

        $this->actingAs($admin)->patchJson("/api/v1/departments/{$this->compta->id}", ['manager_id' => 999999])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['manager_id' => 'n\'existe pas']);

        $this->assertNull($this->compta->fresh()->manager_id);
        $this->assertSame(0, AuditLog::where('event', AuditEvent::DepartmentUpdated)->count());
    }

    public function test_d4_an_account_cannot_manage_two_departments(): void
    {
        $manager = $this->makeUser(RoleName::DepartmentManager, ['department_id' => $this->compta->id]);
        // État anormal (antérieur aux règles D4) : responsable d'un département auquel il n'est plus rattaché.
        $this->fiscal->forceFill(['manager_id' => $manager->id])->save();

        $this->actingAs($this->makeUser(RoleName::SuperAdmin))
            ->patchJson("/api/v1/departments/{$this->compta->id}", ['manager_id' => $manager->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['manager_id' => 'déjà responsable d\'un autre département']);
    }

    public function test_d4_designation_is_removed_when_the_manager_is_deactivated(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $manager = $this->makeUser(RoleName::DepartmentManager, ['department_id' => $this->compta->id]);
        $this->compta->forceFill(['manager_id' => $manager->id])->save();

        $this->actingAs($admin)->postJson("/api/v1/admin/users/{$manager->id}/deactivate")->assertOk();

        $this->assertNull($this->compta->fresh()->manager_id);
        $log = AuditLog::where('event', AuditEvent::DepartmentManagerRemoved)->sole();
        $this->assertSame($manager->id, $log->user_id);
        $this->assertSame($admin->id, $log->actor_id);
        $this->assertSame('inactive', $log->details['reason']);
        $this->assertSame('DEP-01', $log->details['department']['code']);
    }

    public function test_d4_designation_is_removed_when_the_manager_changes_role_or_department(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $first = $this->makeUser(RoleName::DepartmentManager, ['department_id' => $this->compta->id]);
        $second = $this->makeUser(RoleName::DepartmentManager, ['department_id' => $this->fiscal->id]);
        $this->compta->forceFill(['manager_id' => $first->id])->save();
        $this->fiscal->forceFill(['manager_id' => $second->id])->save();

        $this->actingAs($admin)->patchJson("/api/v1/admin/users/{$first->id}", ['role' => 'collaborateur'])->assertOk();
        $this->nextRequest();
        $this->actingAs($admin)->patchJson("/api/v1/admin/users/{$second->id}", ['department_id' => $this->compta->id])->assertOk();

        $this->assertNull($this->compta->fresh()->manager_id);
        $this->assertNull($this->fiscal->fresh()->manager_id);
        $this->assertSame(['role', 'department'], AuditLog::where('event', AuditEvent::DepartmentManagerRemoved)
            ->orderBy('id')->get()->map(fn (AuditLog $log) => $log->details['reason'])->all());
    }

    public function test_d4_designation_is_kept_when_other_fields_of_the_manager_change(): void
    {
        $manager = $this->makeUser(RoleName::DepartmentManager, ['department_id' => $this->compta->id]);
        $this->compta->forceFill(['manager_id' => $manager->id])->save();

        $this->actingAs($this->makeUser(RoleName::SuperAdmin))
            ->patchJson("/api/v1/admin/users/{$manager->id}", ['name' => 'Nouveau nom', 'role' => 'resp_dept', 'department_id' => $this->compta->id])
            ->assertOk();

        $this->assertSame($manager->id, (int) $this->compta->fresh()->manager_id);
        $this->assertSame(0, AuditLog::where('event', AuditEvent::DepartmentManagerRemoved)->count());
    }

    /* D6 : désactivation */

    public function test_d6_a_department_with_active_accounts_cannot_be_deactivated(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $this->makeUser(RoleName::Collaborator, ['department_id' => $this->compta->id]);

        $this->actingAs($admin)->postJson("/api/v1/departments/{$this->compta->id}/deactivate")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['department' => '1 compte actif y est encore rattaché']);

        $this->makeUser(RoleName::Intern, ['department_id' => $this->compta->id]);
        $this->nextRequest();
        $this->actingAs($admin)->postJson("/api/v1/departments/{$this->compta->id}/deactivate")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['department' => '2 comptes actifs y sont encore rattachés']);

        $this->assertTrue($this->compta->fresh()->is_active);
        $this->assertSame(0, AuditLog::where('event', AuditEvent::DepartmentDeactivated)->count());
    }

    public function test_d6_deactivation_and_reactivation_are_journaled_once(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $this->makeUser(RoleName::Collaborator, ['department_id' => $this->compta->id, 'is_active' => false]);

        $this->actingAs($admin)->postJson("/api/v1/departments/{$this->compta->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);
        $this->nextRequest();
        $this->actingAs($admin)->postJson("/api/v1/departments/{$this->compta->id}/deactivate")->assertOk();
        $this->nextRequest();
        $this->actingAs($admin)->postJson("/api/v1/departments/{$this->compta->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->assertSame(1, AuditLog::where('event', AuditEvent::DepartmentDeactivated)->count());
        $this->assertSame(1, AuditLog::where('event', AuditEvent::DepartmentActivated)->count());
        $this->assertDatabaseHas('departments', ['id' => $this->compta->id]);
    }

    public function test_d6_a_deactivated_department_can_no_longer_receive_accounts(): void
    {
        $this->compta->forceFill(['is_active' => false])->save();

        $this->actingAs($this->makeUser(RoleName::SuperAdmin))->postJson('/api/v1/admin/users', [
            'name' => 'Nouvelle personne', 'email' => 'nouvelle@ged.test', 'role' => 'collaborateur', 'department_id' => $this->compta->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('department_id');
    }

    public function test_no_route_deletes_a_department(): void
    {
        $this->actingAs($this->makeUser(RoleName::SuperAdmin))->deleteJson("/api/v1/departments/{$this->compta->id}")
            ->assertStatus(405)
            ->assertJsonPath('code', 'METHOD_NOT_ALLOWED');

        $this->assertDatabaseHas('departments', ['id' => $this->compta->id]);
    }
}
