<?php

namespace App\Services\Organisation;

use App\Enums\AuditEvent;
use App\Enums\FolderNature;
use App\Models\Client;
use App\Models\Folder;
use App\Models\User;
use App\Services\Security\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Service de gestion de l'arborescence des dossiers cabinet et clients (Lot 2.2).
 *
 * Implémente la structure standardisée du cabinet DC-KNOWING :
 * - 8 Espaces racine standard
 * - Modèle de dossier client (_MODELE_DOSSIER_CLIENT)
 * - Arborescence automatique à la création de chaque client (A_PERMANENT, B_EXERCICES)
 * - Gestion des sous-dossiers libres (création, renommage, suppression) avec règles de gouvernance
 */
class FolderHierarchyService
{
    /**
     * Profondeur maximale absolue autorisée dans l'arbre pour éviter les récursions excessives.
     */
    public const MAX_ABSOLUTE_DEPTH = 8;

    /**
     * Profondeur relative maximale autorisée pour des sous-dossiers libres sous une rubrique.
     */
    public const MAX_CUSTOM_SUBFOLDER_DEPTH = 3;

    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Espaces racine standard du cabinet.
     *
     * @return array<int, array{code: string, name: string, description: string, restricted: bool}>
     */
    public static function rootSpacesDefinitions(): array
    {
        return [
            ['code' => '00_DIRECTION', 'name' => '00_DIRECTION', 'description' => 'Espace réservé à la Direction et aux Associés', 'restricted' => true],
            ['code' => '01_CLIENTS', 'name' => '01_CLIENTS', 'description' => 'Dossiers clients du cabinet (A_PERMANENT, B_EXERCICES)', 'restricted' => false],
            ['code' => '02_FORMATION_ACADEMY', 'name' => '02_FORMATION_ACADEMY', 'description' => 'Supports pédagogiques, programmes et sessions DC-Academy', 'restricted' => false],
            ['code' => '03_RH_CABINET', 'name' => '03_RH_CABINET', 'description' => 'Ressources humaines internes, contrats, fiches de paie', 'restricted' => true],
            ['code' => '04_DIGITAL_SUITE-FLOW', 'name' => '04_DIGITAL_SUITE-FLOW', 'description' => 'Documentation technique, paramétrages logiciels et flux', 'restricted' => false],
            ['code' => '05_COMMERCIAL_COMMUNICATION', 'name' => '05_COMMERCIAL_COMMUNICATION', 'description' => 'Plaquettes, propositions commerciales, supports com', 'restricted' => false],
            ['code' => '06_RESSOURCES_VEILLE', 'name' => '06_RESSOURCES_VEILLE', 'description' => 'Veille fiscale, comptable, sociale, modèles et mémos', 'restricted' => false],
            ['code' => '99_ARCHIVES', 'name' => '99_ARCHIVES', 'description' => 'Archives des clients radiés et anciens exercices clôturés', 'restricted' => true],
        ];
    }

    /**
     * Rubriques permanentes standard (A_PERMANENT).
     *
     * @return array<int, array{code: string, name: string, description: string}>
     */
    public static function permanentRubricsDefinitions(): array
    {
        return [
            ['code' => 'A1_Juridique', 'name' => 'A1_Juridique', 'description' => 'Statuts, PV d\'AG, RCCM, DFE, baux et actes constitutifs'],
            ['code' => 'A2_Contrat', 'name' => 'A2_Contrat', 'description' => 'Lettre de mission, conventions d\'honoraires, avenants'],
            ['code' => 'A3_Identifiants', 'name' => 'A3_Identifiants', 'description' => 'Accès télédéclarations impôts, CNPS, banques, portails'],
            ['code' => 'A4_Banques_Contacts', 'name' => 'A4_Banques_Contacts', 'description' => 'RIB, coordonnées bancaires, annuaire des interlocuteurs'],
        ];
    }

    /**
     * Sous-rubriques annuelles standard pour un exercice (B_EXERCICES/AAAA).
     *
     * @return array<int, array{code: string, name: string, description: string}>
     */
    public static function exerciseSubrubricsDefinitions(): array
    {
        return [
            ['code' => '01_COMPTABILITE_GENERAL', 'name' => '01_COMPTABILITE_GENERAL', 'description' => 'Journaux, grands livres, balances, pièces comptables courantes'],
            ['code' => '02_FISCALITE', 'name' => '02_FISCALITE', 'description' => 'Déclarations fiscales mensuelles, acomptes, DSF/liasse fiscale'],
            ['code' => '03_SOCIAL_PAIE', 'name' => '03_SOCIAL_PAIE', 'description' => 'États de paie, déclarations CNPS/organismes sociaux'],
            ['code' => '04_JURIDIQUE_ANNUEL', 'name' => '04_JURIDIQUE_ANNUEL', 'description' => 'Approbation des comptes de l\'exercice, rapports de gestion'],
            ['code' => '05_RAPPORTS_SYNTHESES', 'name' => '05_RAPPORTS_SYNTHESES', 'description' => 'Tableaux de bord, notes de synthèse, rapports d\'audit'],
        ];
    }

    /**
     * Initialise de manière idempotente les 8 espaces racine et le dossier modèle client.
     */
    public function ensureRootSpaces(?User $actor = null): void
    {
        DB::transaction(function () use ($actor) {
            $sortOrder = 0;
            foreach (self::rootSpacesDefinitions() as $def) {
                Folder::updateOrCreate(
                    [
                        'parent_id' => null,
                        'slug' => Str::slug($def['code']),
                    ],
                    [
                        'client_id' => null,
                        'name' => $def['name'],
                        'nature' => $def['code'] === '99_ARCHIVES' ? FolderNature::Archived : FolderNature::RootSpace,
                        'is_locked' => true,
                        'is_restricted' => $def['restricted'],
                        'is_readonly' => false,
                        'path' => '/' . $def['name'],
                        'depth' => 0,
                        'sort_order' => $sortOrder++,
                        'description' => $def['description'],
                        'created_by' => $actor?->id,
                    ]
                );
            }

            // Création / vérification du modèle de dossier client
            $clientsRoot = Folder::whereNull('parent_id')
                ->where('slug', Str::slug('01_CLIENTS'))
                ->firstOrFail();

            $modelFolder = Folder::updateOrCreate(
                [
                    'parent_id' => $clientsRoot->id,
                    'slug' => Str::slug('_MODELE_DOSSIER_CLIENT'),
                ],
                [
                    'client_id' => null,
                    'name' => '_MODELE_DOSSIER_CLIENT',
                    'nature' => FolderNature::Model,
                    'is_locked' => true,
                    'is_restricted' => false,
                    'is_readonly' => true,
                    'path' => $clientsRoot->path . '/_MODELE_DOSSIER_CLIENT',
                    'depth' => 1,
                    'sort_order' => 0,
                    'description' => 'Modèle référence d\'arborescence client du cabinet DC-KNOWING',
                    'created_by' => $actor?->id,
                ]
            );

            $this->ensurePermanentAndExerciseFolders($modelFolder, null, $actor);
        });
    }

    /**
     * Génère l'arborescence complète pour un nouveau client.
     */
    public function generateClientStructure(Client $client, User $actor): Folder
    {
        return DB::transaction(function () use ($client, $actor) {
            $clientsRoot = Folder::whereNull('parent_id')
                ->where('slug', Str::slug('01_CLIENTS'))
                ->first();

            if (! $clientsRoot) {
                $this->ensureRootSpaces($actor);
                $clientsRoot = Folder::whereNull('parent_id')
                    ->where('slug', Str::slug('01_CLIENTS'))
                    ->firstOrFail();
            }

            $folderName = sprintf('%s · %s', $client->code, $client->name);
            $slug = Str::slug($client->code . '-' . $client->name);

            // Vérifier si un dossier client existe déjà
            $existing = Folder::where('parent_id', $clientsRoot->id)
                ->where('client_id', $client->id)
                ->first();

            if ($existing) {
                return $existing;
            }

            $clientFolder = Folder::create([
                'parent_id' => $clientsRoot->id,
                'client_id' => $client->id,
                'name' => $folderName,
                'slug' => $slug,
                'nature' => FolderNature::ClientRoot,
                'is_locked' => true,
                'is_restricted' => false,
                'is_readonly' => false,
                'path' => $clientsRoot->path . '/' . $folderName,
                'depth' => 1,
                'sort_order' => 10,
                'description' => sprintf('Dossier principal du client %s (%s)', $client->name, $client->code),
                'created_by' => $actor->id,
            ]);

            // Arborescence A_PERMANENT et B_EXERCICES
            $this->ensurePermanentAndExerciseFolders($clientFolder, $client, $actor);

            // Exercice de l'année en cours
            $currentYear = (int) date('Y');
            $this->ensureExerciseYearFolder($clientFolder, $currentYear, $client, $actor);

            $this->audit->log(AuditEvent::FolderCreated, true, details: [
                'folder' => $clientFolder->auditReference(),
                'client' => $client->auditReference(),
                'context' => 'automatic_client_provisioning',
            ], actor: $actor);

            return $clientFolder;
        });
    }

    /**
     * Construit les dossiers A_PERMANENT et B_EXERCICES sous le dossier client racine.
     */
    private function ensurePermanentAndExerciseFolders(Folder $rootFolder, ?Client $client, ?User $actor): void
    {
        // 1. A_PERMANENT
        $permanent = Folder::updateOrCreate(
            [
                'parent_id' => $rootFolder->id,
                'slug' => Str::slug('A_PERMANENT'),
            ],
            [
                'client_id' => $client?->id,
                'name' => 'A_PERMANENT',
                'nature' => FolderNature::Permanent,
                'is_locked' => true,
                'is_restricted' => false,
                'is_readonly' => false,
                'path' => $rootFolder->path . '/A_PERMANENT',
                'depth' => $rootFolder->depth + 1,
                'sort_order' => 1,
                'description' => 'Dossier permanent du client (statuts, baux, contrats, pièces d\'identité, RIB)',
                'created_by' => $actor?->id,
            ]
        );

        // Sous-rubriques A1 à A4
        $sort = 1;
        foreach (self::permanentRubricsDefinitions() as $def) {
            Folder::updateOrCreate(
                [
                    'parent_id' => $permanent->id,
                    'slug' => Str::slug($def['code']),
                ],
                [
                    'client_id' => $client?->id,
                    'name' => $def['name'],
                    'nature' => FolderNature::PermSub,
                    'is_locked' => true,
                    'is_restricted' => false,
                    'is_readonly' => false,
                    'path' => $permanent->path . '/' . $def['name'],
                    'depth' => $permanent->depth + 1,
                    'sort_order' => $sort++,
                    'description' => $def['description'],
                    'created_by' => $actor?->id,
                ]
            );
        }

        // 2. B_EXERCICES
        Folder::updateOrCreate(
            [
                'parent_id' => $rootFolder->id,
                'slug' => Str::slug('B_EXERCICES'),
            ],
            [
                'client_id' => $client?->id,
                'name' => 'B_EXERCICES',
                'nature' => FolderNature::Exercises,
                'is_locked' => true,
                'is_restricted' => false,
                'is_readonly' => false,
                'path' => $rootFolder->path . '/B_EXERCICES',
                'depth' => $rootFolder->depth + 1,
                'sort_order' => 2,
                'description' => 'Dossiers des exercices comptables et fiscaux annuels',
                'created_by' => $actor?->id,
            ]
        );
    }

    /**
     * Crée ou vérifie le dossier d'un exercice annuel spécifique (ex: 2026) avec ses sous-rubriques.
     */
    public function ensureExerciseYearFolder(Folder $clientRootFolder, int $year, ?Client $client, ?User $actor): Folder
    {
        $exercicesFolder = Folder::where('parent_id', $clientRootFolder->id)
            ->where('slug', Str::slug('B_EXERCICES'))
            ->firstOrFail();

        $yearName = (string) $year;

        $yearFolder = Folder::updateOrCreate(
            [
                'parent_id' => $exercicesFolder->id,
                'slug' => Str::slug($yearName),
            ],
            [
                'client_id' => $client?->id,
                'name' => $yearName,
                'nature' => FolderNature::Year,
                'is_locked' => true,
                'is_restricted' => false,
                'is_readonly' => false,
                'path' => $exercicesFolder->path . '/' . $yearName,
                'depth' => $exercicesFolder->depth + 1,
                'sort_order' => 9999 - $year, // Ordre antichronologique naturel
                'description' => sprintf('Exercice comptable et fiscal %d', $year),
                'created_by' => $actor?->id,
            ]
        );

        $sort = 1;
        foreach (self::exerciseSubrubricsDefinitions() as $def) {
            Folder::updateOrCreate(
                [
                    'parent_id' => $yearFolder->id,
                    'slug' => Str::slug($def['code']),
                ],
                [
                    'client_id' => $client?->id,
                    'name' => $def['name'],
                    'nature' => FolderNature::Rubrique,
                    'is_locked' => true,
                    'is_restricted' => false,
                    'is_readonly' => false,
                    'path' => $yearFolder->path . '/' . $def['name'],
                    'depth' => $yearFolder->depth + 1,
                    'sort_order' => $sort++,
                    'description' => $def['description'],
                    'created_by' => $actor?->id,
                ]
            );
        }

        return $yearFolder;
    }

    /**
     * Crée un sous-dossier personnalisé dans le respect des règles de gouvernance.
     */
    public function createCustomFolder(Folder $parent, string $name, ?string $description, User $actor): Folder
    {
        $name = trim($name);

        if ($name === '') {
            throw new InvalidArgumentException('Le nom du dossier ne peut pas être vide.');
        }

        if (preg_match('~[/\\\\:*?"<>|]~', $name)) {
            throw new InvalidArgumentException('Le nom du dossier contient des caractères interdits (/ \\ : * ? " < > |).');
        }

        if (! $parent->canHaveCustomSubfolders()) {
            throw new InvalidArgumentException(sprintf(
                'La création de sous-dossiers libres n\'est pas autorisée dans un dossier de type "%s".',
                $parent->nature->label()
            ));
        }

        if ($parent->depth >= self::MAX_ABSOLUTE_DEPTH) {
            throw new InvalidArgumentException(sprintf(
                'La profondeur maximale de l\'arborescence (%d niveaux) est atteinte.',
                self::MAX_ABSOLUTE_DEPTH
            ));
        }

        $slug = Str::slug($name);

        // Vérification de doublon insensible à la casse sous le même parent
        $exists = Folder::where('parent_id', $parent->id)
            ->where(function ($q) use ($name, $slug) {
                $q->where('name', $name)->orWhere('slug', $slug);
            })
            ->exists();

        if ($exists) {
            throw new InvalidArgumentException(sprintf('Un dossier nommé "%s" existe déjà à cet emplacement.', $name));
        }

        return DB::transaction(function () use ($parent, $name, $slug, $description, $actor) {
            $folder = Folder::create([
                'parent_id' => $parent->id,
                'client_id' => $parent->client_id,
                'name' => $name,
                'slug' => $slug,
                'nature' => FolderNature::Custom,
                'is_locked' => false,
                'is_restricted' => $parent->is_restricted,
                'is_readonly' => false,
                'path' => $parent->path . '/' . $name,
                'depth' => $parent->depth + 1,
                'sort_order' => 50,
                'description' => $description ? trim($description) : null,
                'created_by' => $actor->id,
            ]);

            $this->audit->log(AuditEvent::FolderCreated, true, details: [
                'folder' => $folder->auditReference(),
                'parent' => $parent->auditReference(),
            ], actor: $actor);

            return $folder;
        });
    }

    /**
     * Renomme un dossier personnalisé non verrouillé et recalcule les chemins de ses descendants.
     */
    public function renameCustomFolder(Folder $folder, string $newName, User $actor): Folder
    {
        $newName = trim($newName);

        if (! $folder->canBeRenamed()) {
            throw new InvalidArgumentException('Ce dossier fait partie de la structure normalisée et ne peut pas être renommé.');
        }

        if ($newName === '' || $newName === $folder->name) {
            return $folder;
        }

        if (preg_match('~[/\\\\:*?"<>|]~', $newName)) {
            throw new InvalidArgumentException('Le nom du dossier contient des caractères interdits (/ \\ : * ? " < > |).');
        }

        $newSlug = Str::slug($newName);

        $exists = Folder::where('parent_id', $folder->parent_id)
            ->where('id', '!=', $folder->id)
            ->where(function ($q) use ($newName, $newSlug) {
                $q->where('name', $newName)->orWhere('slug', $newSlug);
            })
            ->exists();

        if ($exists) {
            throw new InvalidArgumentException(sprintf('Un dossier nommé "%s" existe déjà à cet emplacement.', $newName));
        }

        return DB::transaction(function () use ($folder, $newName, $newSlug, $actor) {
            $oldName = $folder->name;
            $oldPath = $folder->path;

            $parent = $folder->parent;
            $newPath = ($parent ? $parent->path : '') . '/' . $newName;

            $folder->update([
                'name' => $newName,
                'slug' => $newSlug,
                'path' => $newPath,
            ]);

            // Mettre à jour le path de tous les descendants récursifs
            $descendants = Folder::where('path', 'like', $oldPath . '/%')->get();
            foreach ($descendants as $descendant) {
                $descendantPath = $newPath . substr($descendant->path, strlen($oldPath));
                $descendant->update(['path' => $descendantPath]);
            }

            $this->audit->log(AuditEvent::FolderRenamed, true, details: [
                'folder' => $folder->auditReference(),
                'from' => $oldName,
                'to' => $newName,
            ], actor: $actor);

            return $folder->fresh();
        });
    }

    /**
     * Supprime logiquement un dossier personnalisé non verrouillé.
     */
    public function deleteCustomFolder(Folder $folder, User $actor): void
    {
        if (! $folder->canBeDeleted()) {
            throw new InvalidArgumentException('Ce dossier fait partie de la structure normalisée et ne peut pas être supprimé.');
        }

        DB::transaction(function () use ($folder, $actor) {
            $ref = $folder->auditReference();

            // Vérifier s'il contient des descendants verrouillés
            $hasLockedDescendants = Folder::where('path', 'like', $folder->path . '/%')
                ->where('is_locked', true)
                ->exists();

            if ($hasLockedDescendants) {
                throw new InvalidArgumentException('Ce dossier contient des éléments verrouillés et ne peut pas être supprimé.');
            }

            // Suppression logique en cascade des descendants
            Folder::where('path', 'like', $folder->path . '/%')->delete();
            $folder->delete();

            $this->audit->log(AuditEvent::FolderDeleted, true, details: [
                'folder' => $ref,
            ], actor: $actor);
        });
    }
}
