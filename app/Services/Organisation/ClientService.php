<?php

namespace App\Services\Organisation;

use App\Enums\AuditEvent;
use App\Models\Client;
use App\Models\User;
use App\Services\Security\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Gestion des clients (lot 2.1).
 *
 * C2 : le code est généré par le serveur, au format CLI-0001, à partir de
 * l'identifiant technique. C4 : il n'est jamais modifié, même après radiation.
 */
class ClientService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly FolderHierarchyService $folderHierarchy,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $actor): Client
    {
        $client = DB::transaction(function () use ($data, $actor) {
            // Code provisoire unique, remplacé par le code définitif dès que l'identifiant existe.
            $client = Client::create([
                ...$this->attributes($data),
                'code' => 'TMP-'.Str::upper(Str::random(8)),
                'is_active' => true,
            ]);
            $client->forceFill([
                'code' => 'CLI-'.str_pad((string) $client->id, 4, '0', STR_PAD_LEFT),
                'created_by' => $actor->id,
            ])->save();

            $client->departments()->sync($data['department_ids']);

            $this->audit->log(AuditEvent::ClientCreated, true, details: [
                'client' => $client->auditReference(),
                'departments' => $client->departments()->orderBy('code')->pluck('code')->all(),
            ], actor: $actor);

            // Génération automatique de l'arborescence standardisée (Lot 2.2)
            $this->folderHierarchy->generateClientStructure($client, $actor);

            return $client;
        });

        return $client->load(['departments', 'creator:id,name']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Client $client, array $data, User $actor): Client
    {
        $details = DB::transaction(function () use ($client, $data) {
            $client->refresh();
            $previousDepartments = $client->departments()->orderBy('code')->pluck('code')->all();

            $client->fill($this->attributes($data));
            $changes = collect($client->getDirty())
                ->mapWithKeys(fn ($value, $field) => [$field => ['from' => $client->getOriginal($field), 'to' => $value]])
                ->all();
            $client->save();

            $departmentChanges = null;

            if (array_key_exists('department_ids', $data)) {
                $client->departments()->sync($data['department_ids']);
                $currentDepartments = $client->departments()->orderBy('code')->pluck('code')->all();

                if ($currentDepartments !== $previousDepartments) {
                    $departmentChanges = ['from' => $previousDepartments, 'to' => $currentDepartments];
                }
            }

            return $changes === [] && $departmentChanges === null
                ? []
                : ['client' => $client->auditReference(), 'changes' => $changes] + ($departmentChanges ? ['departments' => $departmentChanges] : []);
        });

        if ($details !== []) {
            $this->audit->log(AuditEvent::ClientUpdated, true, details: $details, actor: $actor);
        }

        return $client->load(['departments', 'creator:id,name']);
    }

    /**
     * Champs modifiables d'un client. Le code, l'état et la radiation ne le sont pas ici.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function attributes(array $data): array
    {
        return collect($data)
            ->only([
                'name', 'legal_form', 'sector', 'tax_regime', 'rccm', 'dfe',
                'address', 'phone', 'email', 'contact_name', 'started_on',
            ])
            ->all();
    }
}
