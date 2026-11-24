<?php

namespace App\Http\Resources;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AuditLog
 */
class AuditLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'occurred_at' => $this->occurred_at->toIso8601String(),
            'event' => ['key' => $this->event->value, 'label' => $this->event->label()],
            'result' => $this->result,
            'email' => $this->email,
            'user' => $this->user ? ['id' => $this->user->id, 'name' => $this->user->name] : null,
            'actor' => $this->actor ? ['id' => $this->actor->id, 'name' => $this->actor->name] : null,
            'ip' => $this->ip,
            'user_agent' => $this->user_agent,
            'details' => $this->details,
        ];
    }
}
