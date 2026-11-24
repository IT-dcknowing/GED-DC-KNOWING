<?php

namespace Tests\Feature;

use App\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Auth\Concerns\InteractsWithAuth;
use Tests\TestCase;

/**
 * Contrat d'erreur de l'API : message en français, code exploitable, aucune trace technique,
 * même lorsque le mode débogage est actif.
 */
class ApiErrorFormatTest extends TestCase
{
    use InteractsWithAuth, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpAuth();
        config(['app.debug' => true]);
    }

    public function test_unknown_api_route_returns_a_clean_french_404(): void
    {
        $this->postJson('/api/v1/auth/register')
            ->assertNotFound()
            ->assertExactJson(['message' => 'La ressource demandée est introuvable.', 'code' => 'NOT_FOUND']);
    }

    public function test_unknown_resource_identifier_returns_a_clean_french_404(): void
    {
        $this->actingAs($this->makeUser(RoleName::SuperAdmin))
            ->getJson('/api/v1/admin/users/999999')
            ->assertNotFound()
            ->assertJsonPath('code', 'NOT_FOUND')
            ->assertJsonMissingPath('trace');
    }

    public function test_wrong_http_method_returns_a_clean_french_405(): void
    {
        $this->getJson('/api/v1/auth/login')
            ->assertStatus(405)
            ->assertJsonPath('code', 'METHOD_NOT_ALLOWED')
            ->assertJsonMissingPath('trace');
    }
}
