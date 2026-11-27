<?php

namespace App\Http\Resources;

use App\Models\Client;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Client tel que présenté par le module Clients (lot 2.1).
 *
 * Les compteurs de documents et la dernière activité restent nuls tant que le
 * module Documents (lot 3) n'existe pas : aucun faux chiffre n'est affiché.
 *
 * @mixin Client
 */
class ClientResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'legal_form' => $this->legal_form,
            'sector' => $this->sector,
            'tax_regime' => $this->tax_regime,
            'rccm' => $this->rccm,
            'dfe' => $this->dfe,
            'address' => $this->address,
            'phone' => $this->phone,
            'email' => $this->email,
            'contact_name' => $this->contact_name,
            'started_on' => $this->started_on?->toDateString(),
            'is_active' => $this->is_active,
            'radiated_at' => $this->radiated_at?->toIso8601String(),
            'departments' => $this->whenLoaded('departments', fn () => $this->departments->map(fn (Department $department) => [
                'id' => $department->id,
                'code' => $department->code,
                'name' => $department->name,
            ])->values()),
            'created_at' => $this->created_at?->toIso8601String(),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name] : null),
            'documents_count' => null,
            'last_activity_at' => null,
        ];
    }
}
