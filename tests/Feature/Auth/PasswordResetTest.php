<?php

namespace Tests\Feature\Auth;

use App\Enums\AuditEvent;
use App\Http\Controllers\Api\V1\PasswordResetController;
use App\Models\AuditLog;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use App\Services\Security\LoginLockoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Feature\Auth\Concerns\InteractsWithAuth;
use Tests\TestCase;

/**
 * Règles D1 à D6 (mot de passe oublié) et F3 (journal des réinitialisations).
 */
class PasswordResetTest extends TestCase
{
    use InteractsWithAuth, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpAuth();
        Notification::fake();
    }

    private function requestLink(string $email)
    {
        return $this->postJson('/api/v1/auth/forgot-password', ['email' => $email]);
    }

    private function tokenSentTo(User $user): string
    {
        $token = null;
        Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $n) use (&$token) {
            $token = $n->token;

            return true;
        });

        return $token;
    }

    private function reset(string $email, string $token, string $password = 'Nouveau2026Secret')
    {
        return $this->postJson('/api/v1/auth/reset-password', [
            'email' => $email,
            'token' => $token,
            'password' => $password,
            'password_confirmation' => $password,
        ]);
    }

    public function test_d1_d2_a_reset_link_pointing_to_the_frontend_is_emailed(): void
    {
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);

        $this->requestLink('f.bamba@exemple.test')->assertOk();

        Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $n) use ($user) {
            $url = $n->url($user);
            $mail = $n->toMail($user);

            return str_starts_with($url, config('app.frontend_url').'/reinitialisation?')
                && str_contains($url, 'email=f.bamba%40exemple.test')
                && $mail->actionUrl === $url
                && str_contains($mail->subject, 'Réinitialisation');
        });
    }

    public function test_d1_the_email_field_is_validated(): void
    {
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'pas-une-adresse'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'n\'est pas valide']);
    }

    public function test_d3_the_response_is_identical_whether_or_not_the_account_exists(): void
    {
        $active = $this->makeUser(attributes: ['email' => 'actif@exemple.test']);
        $inactive = $this->makeUser(attributes: ['email' => 'inactif@exemple.test', 'is_active' => false]);

        $responses = [
            $this->requestLink('actif@exemple.test'),
            $this->requestLink('inactif@exemple.test'),
            $this->requestLink('inconnu@exemple.test'),
        ];

        foreach ($responses as $response) {
            $response->assertOk()->assertExactJson(['message' => PasswordResetController::REQUEST_ACKNOWLEDGED]);
        }

        Notification::assertSentTo($active, ResetPasswordNotification::class);
        Notification::assertNotSentTo($inactive, ResetPasswordNotification::class);
        Notification::assertCount(1);
    }

    public function test_d4_a_link_can_only_be_used_once(): void
    {
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);
        $this->requestLink('f.bamba@exemple.test');
        $token = $this->tokenSentTo($user);

        $this->reset('f.bamba@exemple.test', $token)->assertOk();
        $this->reset('f.bamba@exemple.test', $token, 'Encore2026Secret')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['token' => 'invalide ou a expiré']);

        $this->attemptLogin('f.bamba@exemple.test', 'Nouveau2026Secret')->assertOk();
    }

    public function test_d5_a_link_expires_after_one_hour(): void
    {
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);
        $this->requestLink('f.bamba@exemple.test');
        $token = $this->tokenSentTo($user);

        $this->travel(61)->minutes();

        $this->reset('f.bamba@exemple.test', $token)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['token' => 'invalide ou a expiré']);
    }

    public function test_d5_a_link_is_still_valid_just_before_one_hour(): void
    {
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);
        $this->requestLink('f.bamba@exemple.test');
        $token = $this->tokenSentTo($user);

        $this->travel(59)->minutes();

        $this->reset('f.bamba@exemple.test', $token)->assertOk();
    }

    public function test_d6_all_sessions_are_closed_and_the_lock_is_lifted_after_a_reset(): void
    {
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);
        $this->insertSession($user, 'session-1');
        $this->insertSession($user, 'session-2');
        for ($i = 1; $i <= 5; $i++) {
            $this->attemptLogin('f.bamba@exemple.test', 'Mauvais2026x');
        }
        $this->assertNotNull(app(LoginLockoutService::class)->lockedUntil('f.bamba@exemple.test'));

        $this->requestLink('f.bamba@exemple.test');
        $this->reset('f.bamba@exemple.test', $this->tokenSentTo($user))->assertOk();

        $this->assertSame(0, $this->sessionCount($user));
        $this->attemptLogin('f.bamba@exemple.test', 'Nouveau2026Secret')->assertOk();
    }

    public function test_reset_also_enforces_the_password_policy_and_history(): void
    {
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);
        $this->requestLink('f.bamba@exemple.test');
        $token = $this->tokenSentTo($user);

        $this->reset('f.bamba@exemple.test', $token, 'faible')->assertJsonValidationErrors(['password']);
        $this->reset('f.bamba@exemple.test', $token, self::PASSWORD)
            ->assertJsonValidationErrors(['password' => '3 derniers mots de passe']);

        // Le lien n'a pas été consommé par ces refus.
        $this->reset('f.bamba@exemple.test', $token)->assertOk();
    }

    public function test_failed_logins_do_not_consume_the_reset_request_limit(): void
    {
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);
        for ($i = 1; $i <= 6; $i++) {
            $this->attemptLogin('f.bamba@exemple.test', 'Mauvais2026x');
        }

        $this->requestLink('f.bamba@exemple.test')->assertOk();
        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_reset_requests_are_rate_limited_per_ip(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            $this->requestLink("inconnu{$i}@exemple.test")->assertOk();
        }

        $this->requestLink('inconnu6@exemple.test')
            ->assertStatus(429)
            ->assertJsonPath('code', 'TOO_MANY_REQUESTS');
    }

    public function test_f3_reset_requests_completions_and_failures_are_logged_without_secrets(): void
    {
        $user = $this->makeUser(attributes: ['email' => 'f.bamba@exemple.test']);
        $this->requestLink('f.bamba@exemple.test');
        $token = $this->tokenSentTo($user);
        $this->reset('f.bamba@exemple.test', 'jeton-invalide');
        $this->reset('f.bamba@exemple.test', $token)->assertOk();

        foreach ([AuditEvent::PasswordResetRequested, AuditEvent::PasswordResetFailed, AuditEvent::PasswordResetCompleted] as $event) {
            $this->assertDatabaseHas('audit_logs', ['event' => $event->value, 'email' => 'f.bamba@exemple.test', 'ip' => '127.0.0.1']);
        }

        $journal = AuditLog::all()->toJson();
        $this->assertStringNotContainsString($token, $journal);
        $this->assertStringNotContainsString('Nouveau2026Secret', $journal);
    }
}
