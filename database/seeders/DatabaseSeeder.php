<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Données de référence uniquement. Aucune donnée fictive n'est insérée ici :
     * le premier compte se crée avec « php artisan ged:create-admin ».
     */
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            FolderSpacesSeeder::class,
        ]);
    }
}
