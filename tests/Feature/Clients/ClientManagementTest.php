<?php

namespace Tests\Feature\Clients;

use App\Enums\AuditEvent;
use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\Client;
use App\Models\Department;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Auth\Concerns\InteractsWithAuth;
use Tests\TestCase;

/**
 * Lot 2.1, module Clients : décisions C1 à C4 (champs, code, visibilité, conservation du code).
 */
class ClientManagementTest extends TestCase
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

    /* Visibilité (C3, Q-14 provisoire) */

    public function test_cabinet_wide_roles_see_every_client(): void
    {
        $this->makeClient('CLI-0001', 'CLIENT COMPTA', [$this->compta]);
        $this->makeClient('CLI-0002', 'CLIENT FISCAL', [$this->fiscal]);

        foreach ([RoleName::SuperAdmin, RoleName::Director, RoleName::GedManager] as $role) {
            $this->actingAs($this->makeUser($role))->getJson('/api/v1/clients')
                ->assertOk()
                ->assertJsonCount(2, 'data')
                ->assertJsonPath('data.0.code', 'CLI-0001')
                ->assertJsonPath('data.1.code', 'CLI-0002');
            $this->newBrowser();
        }
    }

    public function test_department_roles_see_only_the_clients_of_their_department(): void
    {
        $comptaClient = $this->makeClient('CLI-0001', 'CLIENT COMPTA', [$this->compta]);
        $fiscalClient = $this->makeClient('CLI-0002', 'CLIENT FISCAL', [$this->fiscal]);
        $sharedClient = $this->makeClient('CLI-0003', 'CLIENT PARTAGÉ', [$this->compta, $this->fiscal]);

        foreach ([RoleName::DepartmentManager, RoleName::Collaborator] as $role) {
            $user = $this->makeUser($role, ['department_id' => $this->fiscal->id]);

            $this->actingAs($user)->getJson('/api/v1/clients')
                ->assertOk()
                ->assertJsonCount(2, 'data')
                ->assertJsonPath('data.0.code', 'CLI-0002')
                ->assertJsonPath('data.1.code', 'CLI-0003');

            $this->nextRequest();
            $this->actingAs($user)->getJson("/api/v1/clients/{$fiscalClient->id}")->assertOk();

            $this->nextRequest();
            $this->actingAs($user)->getJson("/api/v1/clients/{$sharedClient->id}")->assertOk();

            $this->nextRequest();
            $this->actingAs($user)->getJson("/api/v1/clients/{$comptaClient->id}")
                ->assertForbidden()
                ->assertJsonPath('code', 'FORBIDDEN');

            $this->newBrowser();
        }
    }

    public function test_intern_and_auditor_see_no_client_before_the_access_grants_lot(): void
    {
        $client = $this->makeClient('CLI-0001', 'CLIENT COMPTA', [$this->compta]);

        foreach ([RoleName::Intern, RoleName::Auditor] as $role) {
            $user = $this->makeUser($role, ['department_id' => $this->compta->id]);

            $this->actingAs($user)->getJson('/api/v1/clients')->assertOk()->assertJsonCount(0, 'data');
            $this->nextRequest();
            $this->actingAs($user)->getJson("/api/v1/clients/{$client->id}")->assertForbidden();
            $this->newBrowser();
        }
    }

    public function test_a_department_role_without_department_sees_nothing(): void
    {
        $this->makeClient('CLI-0001', 'CLIENT COMPTA', [$this->compta]);

        $this->actingAs($this->makeUser(RoleName::DepartmentManager))
            ->getJson('/api/v1/clients')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_a_guest_is_refused_and_an_unknown_client_is_not_found(): void
    {
        $this->getJson('/api/v1/clients')->assertUnauthorized()->assertJsonPath('code', 'UNAUTHENTICATED');

        $this->actingAs($this->makeUser(RoleName::Director))->getJson('/api/v1/clients/999999')
            ->assertNotFound()
            ->assertJsonPath('code', 'NOT_FOUND');
    }

    public function test_the_list_returns_the_departments_visible_to_the_account(): void
    {
        Department::create(['code' => 'DEP-03', 'name' => 'Social', 'is_active' => false]);

        $this->actingAs($this->makeUser(RoleName::SuperAdmin))->getJson('/api/v1/clients')
            ->assertOk()
            ->assertJsonCount(2, 'departments')
            ->assertJsonPath('departments.0.code', 'DEP-01')
            ->assertJsonPath('departments.1.code', 'DEP-02');

        $this->newBrowser();
        $this->actingAs($this->makeUser(RoleName::DepartmentManager, ['department_id' => $this->fiscal->id]))
            ->getJson('/api/v1/clients')
            ->assertOk()
            ->assertJsonCount(1, 'departments')
            ->assertJsonPath('departments.0.code', 'DEP-02');

        $this->newBrowser();
        $this->actingAs($this->makeUser(RoleName::Intern, ['department_id' => $this->compta->id]))
            ->getJson('/api/v1/clients')
            ->assertOk()
            ->assertJsonCount(0, 'departments');
    }

    /* Création et modification (C1, C2, C4) */

    public function test_a_client_is_created_with_a_generated_code_and_departments(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);

        $this->actingAs($admin)->postJson('/api/v1/clients', [
            'name' => '  nouvelle affaire sarl ',
            'legal_form' => 'SARL',
            'sector' => 'Commerce de gros',
            'tax_regime' => 'Réel normal',
            'rccm' => 'CI-ABJ-2026-B-00000',
            'dfe' => '0000000 X 0',
            'address' => 'Cocody Riviera 3, Abidjan',
            'phone' => '+225 27 22 00 11 01',
            'email' => 'CONTACT@EXEMPLE.CI',
            'contact_name' => 'Adjoua KOUASSI',
            'started_on' => '2026-01-15',
            'department_ids' => [$this->compta->id, $this->fiscal->id],
        ])
            ->assertCreated()
            ->assertJsonPath('data.code', 'CLI-0001')
            ->assertJsonPath('data.name', 'NOUVELLE AFFAIRE SARL')
            ->assertJsonPath('data.email', 'contact@exemple.ci')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.created_by', ['id' => $admin->id, 'name' => $admin->name])
            ->assertJsonCount(2, 'data.departments')
            ->assertJsonPath('data.documents_count', null)
            ->assertJsonPath('data.last_activity_at', null);

        $this->assertDatabaseHas('clients', ['code' => 'CLI-0001', 'name' => 'NOUVELLE AFFAIRE SARL']);
        $this->assertDatabaseHas('client_department', [
            'client_id' => Client::where('code', 'CLI-0001')->value('id'),
            'department_id' => $this->compta->id,
        ]);

        $log = AuditLog::where('event', AuditEvent::ClientCreated)->sole();
        $this->assertSame($admin->id, $log->actor_id);
        $this->assertSame('CLI-0001', $log->details['client']['code']);
        $this->assertSame(['DEP-01', 'DEP-02'], $log->details['departments']);

        $this->nextRequest();
        $this->actingAs($admin)->postJson('/api/v1/clients', [
            'name' => 'DEUXIÈME CLIENT',
            'department_ids' => [$this->compta->id],
        ])->assertCreated()->assertJsonPath('data.code', 'CLI-0002');
    }

    public function test_name_departments_email_and_code_are_validated(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);

        $this->actingAs($admin)->postJson('/api/v1/clients', [
            'name' => 'AB',
            'email' => 'pas-un-email',
            'code' => 'CLI-9999',
            'department_ids' => [],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'name' => 'au moins 3 caractères',
                'email' => 'adresse e-mail valide',
                'code' => 'généré automatiquement',
                'department_ids' => 'au moins un département',
            ]);

        $this->nextRequest();
        $this->actingAs($admin)->postJson('/api/v1/clients', [
            'name' => 'CLIENT TEST',
            'department_ids' => [999999],
        ])->assertUnprocessable()->assertJsonValidationErrors(['department_ids.0' => 'n\'existe pas']);
    }

    public function test_only_clients_manage_can_create_and_update(): void
    {
        $client = $this->makeClient('CLI-0001', 'CLIENT COMPTA', [$this->compta]);

        foreach ([RoleName::Director, RoleName::DepartmentManager, RoleName::Collaborator, RoleName::Intern, RoleName::Auditor] as $role) {
            $user = $this->makeUser($role, ['department_id' => $this->compta->id]);

            $this->actingAs($user)->postJson('/api/v1/clients', [
                'name' => 'CLIENT REFUSÉ',
                'department_ids' => [$this->compta->id],
            ])->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');

            $this->nextRequest();
            $this->actingAs($user)->patchJson("/api/v1/clients/{$client->id}", ['name' => 'RENOMMÉ'])->assertForbidden();
            $this->newBrowser();
        }

        $this->assertDatabaseMissing('clients', ['name' => 'CLIENT REFUSÉ']);
        $this->assertSame('CLIENT COMPTA', $client->fresh()->name);

        foreach ([RoleName::GedManager, RoleName::SuperAdmin] as $role) {
            $this->actingAs($this->makeUser($role))->postJson('/api/v1/clients', [
                'name' => 'CLIENT '.$role->value,
                'department_ids' => [$this->compta->id],
            ])->assertCreated();
            $this->newBrowser();
        }
    }

    public function test_update_changes_fields_and_departments_but_never_the_code(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $client = $this->makeClient('CLI-0001', 'CLIENT COMPTA', [$this->compta]);

        $this->actingAs($admin)->patchJson("/api/v1/clients/{$client->id}", [
            'name' => 'client modifié',
            'sector' => 'Industrie',
            'department_ids' => [$this->fiscal->id],
        ])
            ->assertOk()
            ->assertJsonPath('data.code', 'CLI-0001')
            ->assertJsonPath('data.name', 'CLIENT MODIFIÉ')
            ->assertJsonPath('data.sector', 'Industrie')
            ->assertJsonCount(1, 'data.departments')
            ->assertJsonPath('data.departments.0.code', 'DEP-02');

        $log = AuditLog::where('event', AuditEvent::ClientUpdated)->sole();
        $this->assertSame(['from' => 'CLIENT COMPTA', 'to' => 'CLIENT MODIFIÉ'], $log->details['changes']['name']);
        $this->assertSame(['from' => ['DEP-01'], 'to' => ['DEP-02']], $log->details['departments']);

        $this->nextRequest();
        $this->actingAs($admin)->patchJson("/api/v1/clients/{$client->id}", ['code' => 'CLI-9999'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => 'pas modifiable']);

        $this->nextRequest();
        $this->actingAs($admin)->patchJson("/api/v1/clients/{$client->id}", ['department_ids' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['department_ids' => 'au moins un département']);

        $this->assertSame('CLI-0001', $client->fresh()->code);
    }

    public function test_an_unchanged_update_is_not_journaled(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $client = $this->makeClient('CLI-0001', 'CLIENT COMPTA', [$this->compta]);

        $this->actingAs($admin)->patchJson("/api/v1/clients/{$client->id}", ['name' => 'CLIENT COMPTA'])->assertOk();

        $this->assertSame(0, AuditLog::where('event', AuditEvent::ClientUpdated)->count());
    }

    /* Recherche, filtre, absence de suppression */

    public function test_search_is_literal_and_the_department_filter_is_applied(): void
    {
        $this->makeClient('CLI-0001', 'SOCIÉTÉ 100%', [$this->compta]);
        $this->makeClient('CLI-0002', 'SOCIÉTÉ 100_', [$this->fiscal]);
        $this->makeClient('CLI-0003', 'AUTRE CLIENT', [$this->compta]);

        $admin = $this->makeUser(RoleName::SuperAdmin);

        $this->actingAs($admin)->getJson('/api/v1/clients?search=100%25')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'CLI-0001');

        $this->nextRequest();
        $this->actingAs($admin)->getJson('/api/v1/clients?search=100_')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'CLI-0002');

        $this->nextRequest();
        $this->actingAs($admin)->getJson("/api/v1/clients?department={$this->compta->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.code', 'CLI-0003')
            ->assertJsonPath('data.1.code', 'CLI-0001');

        $this->nextRequest();
        $this->actingAs($admin)->getJson('/api/v1/clients?search=CLI-0002')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'CLI-0002');
    }

    public function test_no_route_deletes_a_client(): void
    {
        $client = $this->makeClient('CLI-0001', 'CLIENT COMPTA', [$this->compta]);

        $this->actingAs($this->makeUser(RoleName::SuperAdmin))
            ->deleteJson("/api/v1/clients/{$client->id}")
            ->assertMethodNotAllowed()
            ->assertJsonPath('code', 'METHOD_NOT_ALLOWED');

        $this->assertDatabaseHas('clients', ['id' => $client->id]);
    }

    /**
     * @param  list<Department>  $departments
     */
    private function makeClient(string $code, string $name, array $departments = []): Client
    {
        $client = Client::create(['code' => $code, 'name' => $name, 'is_active' => true]);
        $client->departments()->attach(array_map(fn (Department $department) => $department->id, $departments));

        return $client;
    }
}
