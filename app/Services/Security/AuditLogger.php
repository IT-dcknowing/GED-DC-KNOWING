<?php

namespace App\Services\Security;

use App\Enums\AuditEvent;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Écrit dans le journal d'audit. Ne jamais passer de mot de passe, de jeton
 * ou de mot de passe temporaire dans $details.
 */
class AuditLogger
{
    public function __construct(private readonly Request $request) {}

    /**
     * @param  array<string, mixed>  $details
     */
    public function log(
        AuditEvent $event,
        bool $success,
        ?User $user = null,
        ?string $email = null,
        array $details = [],
        ?User $actor = null,
    ): AuditLog {
        return AuditLog::create([
            'occurred_at' => now(),
            'event' => $event,
            'result' => $success ? 'success' : 'failure',
            'user_id' => $user?->id,
            'actor_id' => $actor?->id ?? $user?->id,
            'email' => $email !== null ? Str::limit(mb_strtolower(trim($email)), 255, '') : $user?->email,
            'ip' => $this->request->ip(),
            'user_agent' => Str::limit((string) $this->request->userAgent(), 255, ''),
            'details' => $details ?: null,
        ]);
    }
}
