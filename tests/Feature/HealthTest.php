<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_reports_api_and_database_status(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertExactJson(['status' => 'ok', 'database' => 'ok']);
    }

    public function test_unknown_api_routes_return_json_404(): void
    {
        $this->getJson('/api/v1/route-inexistante')
            ->assertNotFound()
            ->assertJsonStructure(['message']);
    }
}
