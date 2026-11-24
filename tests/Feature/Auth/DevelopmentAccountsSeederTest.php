<?php

namespace Tests\Feature\Auth;

use App\Enums\RoleName;
use App\Models\User;
use Database\Seeders\DevelopmentAccountsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class DevelopmentAccountsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_one_test_account_per_role_with_a_temporary_password(): void
    {
        $this->seed(DevelopmentAccountsSeeder::class);

        $users = User::where('email', 'like', '%@'.DevelopmentAccountsSeeder::DOMAIN)->get();
        $this->assertCount(count(RoleName::cases()), $users);

        foreach (RoleName::cases() as $role) {
            $user = $users->first(fn (User $u) => $u->roleName() === $role);
            $this->assertNotNull($user, "Aucun compte de test pour le rôle {$role->value}");
            $this->assertTrue($user->must_change_password);
            $this->assertTrue($user->is_active);
            $this->assertStringStartsWith('Test · ', $user->name);
        }

        $this->assertSame('DEP-TEST', User::where('email', 'collaborateur@ged.test')->first()->department->code);
    }

    public function test_it_can_be_run_again_without_duplicating_or_changing_accounts(): void
    {
        $this->seed(DevelopmentAccountsSeeder::class);
        $hash = User::where('email', 'auditeur@ged.test')->value('password');

        $this->seed(DevelopmentAccountsSeeder::class);

        $this->assertSame(7, User::where('email', 'like', '%@ged.test')->count());
        $this->assertSame($hash, User::where('email', 'auditeur@ged.test')->value('password'));
    }

    public function test_it_refuses_to_run_in_production(): void
    {
        $this->app['env'] = 'production';

        try {
            (new DevelopmentAccountsSeeder)->setContainer($this->app)->__invoke();
            $this->fail('Le seeder aurait dû refuser de s\'exécuter en production.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('production', $e->getMessage());
        }

        $this->assertSame(0, User::count());
    }
}
