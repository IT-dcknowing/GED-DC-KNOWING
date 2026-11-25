<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Clients\StoreClientRequest;
use App\Http\Requests\Clients\UpdateClientRequest;
use App\Http\Resources\ClientResource;
use App\Models\Client;
use App\Models\Department;
use App\Models\User;
use App\Policies\ClientPolicy;
use App\Services\Organisation\ClientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;

/**
 * Module Clients (lot 2.1). La consultation est limitée par ClientPolicy et par
 * le périmètre du compte (Q-14 provisoire) ; l'écriture exige clients.manage.
 */
class ClientController extends Controller
{
    public function __construct(
        private readonly ClientService $clients,
        private readonly ClientPolicy $policy,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Client::class);

        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'department' => ['nullable', 'integer'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $user = $request->user();

        $clients = Client::query()
            ->visibleTo($user)
            ->with(['departments:id,code,name', 'creator:id,name'])
            ->when($filters['search'] ?? null, function ($q, $search) {
                // « % » et « _ » saisis sont cherchés tels quels (échappement « ! », valable sous MySQL et SQLite).
                $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';
                $q->where(fn ($q) => $q
                    ->whereRaw("name like ? escape '!'", [$pattern])
                    ->orWhereRaw("code like ? escape '!'", [$pattern])
                    ->orWhereRaw("sector like ? escape '!'", [$pattern])
                    ->orWhereRaw("contact_name like ? escape '!'", [$pattern]));
            })
            ->when($filters['department'] ?? null, fn ($q, $department) => $q->whereHas(
                'departments',
                fn ($q) => $q->whereKey($department),
            ))
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString();

        return ClientResource::collection($clients)->additional([
            'departments' => $this->visibleDepartments($user),
        ]);
    }

    public function show(Client $client): ClientResource
    {
        Gate::authorize('view', $client);

        return new ClientResource($client->load(['departments', 'creator:id,name']));
    }

    public function store(StoreClientRequest $request): JsonResponse
    {
        Gate::authorize('create', Client::class);

        $client = $this->clients->create($request->validated(), $request->user());

        return (new ClientResource($client))
            ->additional(['message' => 'Client créé. Son code est définitif et son dossier documentaire sera généré avec le module Documents.'])
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateClientRequest $request, Client $client): ClientResource
    {
        Gate::authorize('update', $client);

        return new ClientResource($this->clients->update($client, $request->validated(), $request->user()));
    }

    /**
     * Départements proposés dans le filtre de l'écran : tout le cabinet pour les
     * rôles transverses, le sien pour un compte rattaché, aucun sinon.
     *
     * @return Collection<int, array{id: int, code: string, name: string}>
     */
    private function visibleDepartments(User $user): Collection
    {
        $query = Department::query()->where('is_active', true)->orderBy('name');

        if (! $this->policy->seesAll($user)) {
            $query->when(
                $this->policy->seesDepartmentScope($user) && $user->department_id !== null,
                fn ($q) => $q->whereKey($user->department_id),
                fn ($q) => $q->whereRaw('1 = 0'),
            );
        }

        return $query->get(['id', 'code', 'name'])
            ->map(fn (Department $department) => [
                'id' => $department->id,
                'code' => $department->code,
                'name' => $department->name,
            ]);
    }
}
