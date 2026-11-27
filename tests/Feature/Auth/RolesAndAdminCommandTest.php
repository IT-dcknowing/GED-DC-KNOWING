<?php

namespace Tests\Feature\Auth;

use App\Enums\PermissionName;
use App\Enums\RoleName;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RolesAndAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_creates_the_seven_roles_and_is_idempotent(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->assertSame(7, Role::count());
        $this->assertCount(
            count(PermissionName::cases()),
            Role::findByName(RoleName::SuperAdmin->value, 'web')->permissions,
        );
    }

    public function test_auditor_is_read_only(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $auditor = User::factory()->create();
        $auditor->assignRole(RoleName::Auditor->value);

        $this->assertFalse($auditor->can(PermissionName::DocumentsUpload->value));
        $this->assertFalse($auditor->can(PermissionName::DocumentsEdit->value));
        $this->assertFalse($auditor->can(PermissionName::DocumentsValidate->value));
    }

    public function test_create_admin_command_creates_an_active_super_administrator(): void
    {
        $this->artisan('ged:create-admin', ['email' => 'Admin@Exemple.test', '--name' => 'Admin Test'])
            ->expectsQuestion('Mot de passe', 'MotDePasse2026')
            ->expectsQuestion('Confirmez le mot de passe', 'MotDePasse2026')
            ->assertSuccessful();

        $user = User::where('email', 'admin@exemple.test')->firstOrFail();
        $this->assertTrue($user->is_active);
        $this->assertSame(RoleName::SuperAdmin, $user->roleName());
    }

    public function test_create_admin_command_refuses_an_existing_email(): void
    {
        User::factory()->create(['email' => 'admin@exemple.test']);

        $this->artisan('ged:create-admin', ['email' => 'admin@exemple.test', '--name' => 'Admin'])
            ->assertFailed();
    }

    public function test_create_admin_command_refuses_mismatched_passwords(): void
    {
        $this->artisan('ged:create-admin', ['email' => 'admin@exemple.test', '--name' => 'Admin'])
            ->expectsQuestion('Mot de passe', 'MotDePasse2026')
            ->expectsQuestion('Confirmez le mot de passe', 'AutreMotDePasse1')
            ->assertFailed();

        $this->assertDatabaseMissing('users', ['email' => 'admin@exemple.test']);
    }
}
