<?php

namespace Tests\Feature\Auth;

use App\Enums\AuditEvent;
use App\Models\AuditLog;
use App\Services\Security\PasswordService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Auth\Concerns\InteractsWithAuth;
use Tests\TestCase;

/**
 * Règles C1 à C6 (mots de passe) et F4 (journal des modifications).
 */
class PasswordPolicyTest extends TestCase
{
    use InteractsWithAuth, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpAuth();
    }

    private function changePassword(string $new, string $current = self::PASSWORD, ?string $confirmation = null)
    {
        return $this->putJson('/api/v1/auth/password', [
            'current_password' => $current,
            'password' => $new,
            'password_confirmation' => $confirmation ?? $new,
        ]);
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function weakPasswords(): array
    {
        return [
            'C1 moins de 10 caractères' => ['Abcdefg12', 'au moins 10 caractères'],
            'C2 sans majuscule' => ['abcdefgh12', 'au moins une lettre majuscule'],
            'C2 sans minuscule' => ['ABCDEFGH12', 'au moins une lettre minuscule'],
            'C2 sans chiffre' => ['Abcdefghij', 'au moins un chiffre'],
            'plus de 64 caractères' => [str_repeat('Ab1', 22), 'trop long'],
        ];
    }

    #[DataProvider('weakPasswords')]
    public function test_c1_c2_passwords_not_meeting_the_policy_are_refused(string $password, string $message): void
    {
        $this->actingAs($this->makeUser());

        $this->changePassword($password)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => $message]);
    }

    public function test_c1_c2_a_compliant_password_is_accepted(): void
    {
        $this->actingAs($this->makeUser());

        $this->changePassword('Conforme2026')->assertOk();
    }

    public function test_c3_passwords_are_stored_hashed_with_bcrypt(): void
    {
        $user = $this->makeUser();
        $this->actingAs($user);
        $this->changePassword('Conforme2026')->assertOk();

        $stored = $user->fresh()->password;
        $this->assertNotSame('Conforme2026', $stored);
        $this->assertSame('bcrypt', password_get_info($stored)['algoName']);
        $this->assertSame('bcrypt', password_get_info($user->passwordHistories()->latest('id')->value('password'))['algoName']);
    }

    public function test_c4_the_current_and_two_previous_passwords_cannot_be_reused(): void
    {
        $user = $this->makeUser(password: 'Ancien0Secret');
        $passwords = app(PasswordService::class);
        $passwords->setPassword($user, 'Ancien1Secret', false);
        $passwords->setPassword($user, 'Ancien2Secret', false);
        $passwords->setPassword($user, 'Actuel3Secret', false);
        $this->actingAs($user->fresh());

        foreach (['Actuel3Secret', 'Ancien2Secret', 'Ancien1Secret'] as $recent) {
            $this->changePassword($recent, 'Actuel3Secret')
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['password' => '3 derniers mots de passe']);
        }

        // Le 4e plus ancien redevient utilisable.
        $this->changePassword('Ancien0Secret', 'Actuel3Secret')->assertOk();
    }

    public function test_c5_the_current_password_must_be_provided_and_correct(): void
    {
        $this->actingAs($this->makeUser());

        $this->changePassword('Conforme2026', 'Faux2026Secret')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password' => 'Le mot de passe actuel est incorrect.']);

        $this->putJson('/api/v1/auth/password', ['password' => 'Conforme2026', 'password_confirmation' => 'Conforme2026'])
            ->assertJsonValidationErrors(['current_password']);

        $this->changePassword('Conforme2026', confirmation: 'Different2026')
            ->assertJsonValidationErrors(['password' => 'La confirmation ne correspond pas']);
    }

    public function test_c5_password_change_requires_authentication(): void
    {
        $this->changePassword('Conforme2026')->assertUnauthorized()->assertJsonPath('code', 'UNAUTHENTICATED');
    }

    public function test_c6_other_sessions_are_closed_after_a_change_and_the_current_one_is_kept(): void
    {
        $user = $this->makeUser();
        $other = $this->makeUser();
        $this->insertSession($user, 'session-ordinateur-bureau');
        $this->insertSession($user, 'session-telephone');
        $this->insertSession($other, 'session-autre-utilisateur');

        $this->actingAs($user);
        $this->changePassword('Conforme2026')->assertOk();

        $this->assertSame(0, $this->sessionCount($user));
        $this->assertSame(1, $this->sessionCount($other));
        $this->getJson('/api/v1/auth/me')->assertOk();
    }

    public function test_f4_password_changes_are_logged_without_the_password(): void
    {
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);
        $this->actingAs($user);

        $this->changePassword('Conforme2026', 'Faux2026Secret');
        $this->changePassword('Conforme2026')->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'event' => AuditEvent::PasswordChanged->value, 'result' => 'failure', 'email' => 'f.bamba@exemple.test',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'event' => AuditEvent::PasswordChanged->value, 'result' => 'success',
            'email' => 'f.bamba@exemple.test', 'ip' => '127.0.0.1',
        ]);
        $this->assertStringNotContainsString('Conforme2026', AuditLog::all()->toJson());
    }
}
