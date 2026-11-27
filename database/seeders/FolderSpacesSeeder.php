<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\User;
use App\Services\Organisation\FolderHierarchyService;
use Illuminate\Database\Seeder;

/**
 * Initialise les 8 espaces racine du cabinet, le modèle client
 * et rétro-génère l'arborescence des clients existants (Lot 2.2).
 */
class FolderSpacesSeeder extends Seeder
{
    public function __construct(private readonly FolderHierarchyService $service) {}

    public function run(): void
    {
        $admin = User::first();

        // 1. Espaces racine et dossier modèle
        $this->service->ensureRootSpaces($admin);

        // 2. Dossiers des clients existants
        $clients = Client::all();
        foreach ($clients as $client) {
            $actor = $client->creator ?? $admin;
            if ($actor) {
                $this->service->generateClientStructure($client, $actor);
            }
        }
    }
}
