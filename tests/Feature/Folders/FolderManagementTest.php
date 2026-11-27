<?php

namespace Tests\Feature\Folders;

use App\Enums\AuditEvent;
use App\Enums\FolderNature;
use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\Client;
use App\Models\Department;
use App\Models\Folder;
use App\Services\Organisation\FolderHierarchyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Auth\Concerns\InteractsWithAuth;
use Tests\TestCase;

/**
 * Lot 2.2 — Arborescence et modèle de dossier client.
 */
class FolderManagementTest extends TestCase
{
    use InteractsWithAuth, RefreshDatabase;

    private Department $compta;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpAuth();

        $this->compta = Department::create(['code' => 'DEP-01', 'name' => 'Comptabilité', 'is_active' => true]);

        // Initialiser les espaces racine
        app(FolderHierarchyService::class)->ensureRootSpaces();
    }

    public function test_root_spaces_and_model_are_provisioned(): void
    {
        $this->assertDatabaseHas('folders', ['name' => '00_DIRECTION', 'depth' => 0, 'is_locked' => true, 'is_restricted' => true]);
        $this->assertDatabaseHas('folders', ['name' => '01_CLIENTS', 'depth' => 0, 'is_locked' => true, 'is_restricted' => false]);
        $this->assertDatabaseHas('folders', ['name' => '99_ARCHIVES', 'depth' => 0, 'is_locked' => true, 'is_restricted' => true]);

        // Modèle de dossier client
        $model = Folder::where('name', '_MODELE_DOSSIER_CLIENT')->first();
        $this->assertNotNull($model);
        $this->assertTrue($model->is_readonly);

        // Sous-rubriques du modèle
        $this->assertDatabaseHas('folders', ['parent_id' => $model->id, 'name' => 'A_PERMANENT']);
        $this->assertDatabaseHas('folders', ['parent_id' => $model->id, 'name' => 'B_EXERCICES']);
    }

    public function test_client_creation_automatically_provisions_folder_structure(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);

        $response = $this->actingAs($admin)->postJson('/api/v1/clients', [
            'name' => 'ENTREPRISE IVOIRIENNE SA',
            'department_ids' => [$this->compta->id],
        ]);

        $response->assertCreated();
        $clientId = $response->json('data.id');
        $clientCode = $response->json('data.code');

        // Vérifier l'arborescence générée
        $clientFolder = Folder::where('client_id', $clientId)->where('nature', FolderNature::ClientRoot)->first();
        $this->assertNotNull($clientFolder);
        $this->assertStringContainsString($clientCode, $clientFolder->name);

        // Vérifier A_PERMANENT et ses 4 rubriques
        $perm = Folder::where('parent_id', $clientFolder->id)->where('name', 'A_PERMANENT')->first();
        $this->assertNotNull($perm);

        $this->assertDatabaseHas('folders', ['parent_id' => $perm->id, 'name' => 'A1_Juridique']);
        $this->assertDatabaseHas('folders', ['parent_id' => $perm->id, 'name' => 'A2_Contrat']);
        $this->assertDatabaseHas('folders', ['parent_id' => $perm->id, 'name' => 'A3_Identifiants']);
        $this->assertDatabaseHas('folders', ['parent_id' => $perm->id, 'name' => 'A4_Banques_Contacts']);

        // Vérifier B_EXERCICES et l'année courante
        $ex = Folder::where('parent_id', $clientFolder->id)->where('name', 'B_EXERCICES')->first();
        $this->assertNotNull($ex);

        $currentYear = (string) date('Y');
        $yearFolder = Folder::where('parent_id', $ex->id)->where('name', $currentYear)->first();
        $this->assertNotNull($yearFolder);

        $this->assertDatabaseHas('folders', ['parent_id' => $yearFolder->id, 'name' => '01_COMPTABILITE_GENERAL']);
        $this->assertDatabaseHas('folders', ['parent_id' => $yearFolder->id, 'name' => '02_FISCALITE']);
    }

    public function test_folder_tree_respects_visibility_rules(): void
    {
        // 1. SuperAdmin voit tous les espaces
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $this->actingAs($admin)->getJson('/api/v1/folders/tree')
            ->assertOk()
            ->assertJsonCount(8, 'data');

        $this->newBrowser();

        // 2. Collaborateur sans scope direction ne voit pas les espaces restreints (00_DIRECTION, 03_RH_CABINET, 99_ARCHIVES)
        $collab = $this->makeUser(RoleName::Collaborator, ['department_id' => $this->compta->id]);
        $response = $this->actingAs($collab)->getJson('/api/v1/folders/tree')->assertOk();

        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertNotContains('00_DIRECTION', $names);
        $this->assertNotContains('03_RH_CABINET', $names);
        $this->assertNotContains('99_ARCHIVES', $names);
        $this->assertContains('01_CLIENTS', $names);
        $this->assertContains('02_FORMATION_ACADEMY', $names);
    }

    public function test_can_create_custom_subfolder_in_allowed_rubric(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);

        // Récupérer une sous-rubrique autorisant les sous-dossiers
        $a1 = Folder::where('name', 'A1_Juridique')->firstOrFail();
        $this->assertTrue($a1->canHaveCustomSubfolders());

        $response = $this->actingAs($admin)->postJson('/api/v1/folders', [
            'parent_id' => $a1->id,
            'name' => 'Statuts originaux 2020',
            'description' => 'Scans des statuts constitutifs signés',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Statuts originaux 2020')
            ->assertJsonPath('data.nature', 'custom')
            ->assertJsonPath('data.is_locked', false);

        $this->assertDatabaseHas('audit_logs', [
            'event' => AuditEvent::FolderCreated->value,
            'actor_id' => $admin->id,
        ]);
    }

    public function test_can_create_custom_folder_in_client_root_and_internal_space_but_not_in_clients_container_or_model(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);

        $clientRes = $this->actingAs($admin)->postJson('/api/v1/clients', [
            'name' => 'CABINET TEST SARL',
            'department_ids' => [$this->compta->id],
        ])->assertCreated();

        $clientRoot = Folder::where('client_id', $clientRes->json('data.id'))
            ->where('nature', FolderNature::ClientRoot)
            ->firstOrFail();

        $this->actingAs($admin)->postJson('/api/v1/folders', [
            'parent_id' => $clientRoot->id,
            'name' => 'Dossier Mission Spéciale',
        ])->assertCreated()
            ->assertJsonPath('data.nature', 'custom');

        $directionSpace = Folder::where('name', '00_DIRECTION')->firstOrFail();
        $this->actingAs($admin)->postJson('/api/v1/folders', [
            'parent_id' => $directionSpace->id,
            'name' => 'Comité Direction 2026',
        ])->assertCreated()
            ->assertJsonPath('data.nature', 'custom');

        $clientsContainer = Folder::where('name', '01_CLIENTS')->firstOrFail();
        $this->actingAs($admin)->postJson('/api/v1/folders', [
            'parent_id' => $clientsContainer->id,
            'name' => 'Dossier interdit',
        ])->assertForbidden();

        $model = Folder::where('name', '_MODELE_DOSSIER_CLIENT')->firstOrFail();
        $this->actingAs($admin)->postJson('/api/v1/folders', [
            'parent_id' => $model->id,
            'name' => 'Modèle interdit',
        ])->assertForbidden();
    }

    public function test_cannot_create_custom_subfolder_in_locked_parent_not_allowing_it(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);

        // A_PERMANENT n'autorise pas la création directe de sous-dossiers libres (réservé aux sous-rubriques)
        $perm = Folder::where('name', 'A_PERMANENT')->firstOrFail();
        $this->assertFalse($perm->canHaveCustomSubfolders());

        $response = $this->actingAs($admin)->postJson('/api/v1/folders', [
            'parent_id' => $perm->id,
            'name' => 'Dossier illégal',
        ]);

        $response->assertForbidden();
    }

    public function test_can_rename_and_delete_custom_folder_but_not_structural_folder(): void
    {
        $admin = $this->makeUser(RoleName::SuperAdmin);
        $a1 = Folder::where('name', 'A1_Juridique')->firstOrFail();

        // 1. Création
        $createRes = $this->actingAs($admin)->postJson('/api/v1/folders', [
            'parent_id' => $a1->id,
            'name' => 'Actes préliminaires',
        ])->assertCreated();

        $customFolderId = $createRes->json('data.id');

        // 2. Renommage du sous-dossier libre : SUCCÈS
        $this->actingAs($admin)->patchJson("/api/v1/folders/{$customFolderId}", [
            'name' => 'Actes préliminaires annotés',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Actes préliminaires annotés');

        // 3. Renommage d'un dossier structurel : REFUS
        $this->actingAs($admin)->patchJson("/api/v1/folders/{$a1->id}", [
            'name' => 'A1_Nouveau_Nom',
        ])->assertForbidden();

        // 4. Suppression d'un dossier structurel : REFUS
        $this->actingAs($admin)->deleteJson("/api/v1/folders/{$a1->id}")->assertForbidden();

        // 5. Suppression du sous-dossier libre : SUCCÈS
        $this->actingAs($admin)->deleteJson("/api/v1/folders/{$customFolderId}")->assertOk();

        $this->assertSoftDeleted('folders', ['id' => $customFolderId]);

        $this->assertDatabaseHas('audit_logs', [
            'event' => AuditEvent::FolderDeleted->value,
            'actor_id' => $admin->id,
        ]);
    }
}
