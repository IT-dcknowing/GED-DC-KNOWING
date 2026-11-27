<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Consultation du journal d'audit (permission journal.view). Lecture seule.
 */
class AuditLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'event' => ['nullable', Rule::enum(AuditEvent::class)],
            'result' => ['nullable', Rule::in(['success', 'failure'])],
            'email' => ['nullable', 'string', 'max:255'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $logs = AuditLog::query()
            ->with(['user:id,name', 'actor:id,name'])
            ->when($filters['event'] ?? null, fn ($q, $event) => $q->where('event', $event))
            ->when($filters['result'] ?? null, fn ($q, $result) => $q->where('result', $result))
            ->when($filters['email'] ?? null, fn ($q, $email) => $q->where('email', 'like', '%'.mb_strtolower($email).'%'))
            ->when($filters['from'] ?? null, fn ($q, $from) => $q->where('occurred_at', '>=', $from))
            ->when($filters['to'] ?? null, fn ($q, $to) => $q->where('occurred_at', '<', now()->parse($to)->addDay()->startOfDay()))
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->paginate(50)
            ->withQueryString();

        return AuditLogResource::collection($logs);
    }
}
