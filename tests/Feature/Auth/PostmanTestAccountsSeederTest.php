<?php

namespace Tests\Feature\Auth;

use App\Enums\RoleName;
use App\Models\User;
use App\Services\Security\LoginLockoutService;
use Database\Seeders\PostmanTestAccountsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class PostmanTestAccountsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_the_documented_accounts_with_their_states(): void
    {
        $this->seed(PostmanTestAccountsSeeder::class);

        foreach (PostmanTestAccountsSeeder::ACCOUNTS as [$email, $role, $password, $active, $mustChange]) {
            $user = User::where('email', $email)->firstOrFail();
            $this->assertSame($role, $user->roleName());
            $this->assertTrue(Hash::check($password, $user->password));
            $this->assertSame($active, $user->is_active);
            $this->assertSame($mustChange, $user->must_change_password);
        }
    }

    public function test_running_it_again_restores_the_initial_state_without_touching_other_accounts(): void
    {
        $this->seed(PostmanTestAccountsSeeder::class);
        $other = User::factory()->create(['email' => 'autre@exemple.test']);
        $other->assignRole(RoleName::SuperAdmin->value);

        // État modifié par une exécution de la collection.
        $standard = User::where('email', 'postman.collaborateur@postman.test')->first();
        $standard->forceFill(['password' => 'Modifie2026xx', 'is_active' => false])->save();
        User::factory()->create(['email' => 'postman.cree.123@postman.test']);
        $lockouts = app(LoginLockoutService::class);
        for ($i = 0; $i < 5; $i++) {
            $lockouts->recordFailure('postman.verrouillage@postman.test');
            $lockouts->recordFailure(PostmanTestAccountsSeeder::UNKNOWN_EMAIL);
        }

        $this->seed(PostmanTestAccountsSeeder::class);

        $standard = User::where('email', 'postman.collaborateur@postman.test')->first();
        $this->assertTrue(Hash::check('PostmanCollab2026', $standard->password));
        $this->assertTrue($standard->is_active);
        $this->assertDatabaseMissing('users', ['email' => 'postman.cree.123@postman.test']);
        $this->assertNull($lockouts->lockedUntil('postman.verrouillage@postman.test'));
        $this->assertNull($lockouts->lockedUntil(PostmanTestAccountsSeeder::UNKNOWN_EMAIL));
        $this->assertSame(count(PostmanTestAccountsSeeder::ACCOUNTS), User::where('email', 'like', '%@postman.test')->count());
        $this->assertTrue($other->fresh()->exists);
    }

    public function test_it_refuses_to_run_outside_local_and_testing(): void
    {
        foreach (['production', 'staging'] as $environment) {
            $this->app['env'] = $environment;

            try {
                (new PostmanTestAccountsSeeder)->setContainer($this->app)->__invoke();
                $this->fail("Le seeder aurait dû refuser l'environnement {$environment}.");
            } catch (RuntimeException $e) {
                $this->assertStringContainsString('local', $e->getMessage());
            }
        }

        $this->assertSame(0, User::count());
    }
}
