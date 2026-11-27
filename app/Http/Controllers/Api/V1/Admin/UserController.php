<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use App\Services\Security\LoginLockoutService;
use App\Services\Security\UserAdministrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Gestion des comptes par le Super Administrateur (permission users.manage).
 * Aucune inscription publique n'existe (règle H1) ; aucune suppression : on désactive.
 */
class UserController extends Controller
{
    public function __construct(
        private readonly UserAdministrationService $admin,
        private readonly LoginLockoutService $lockouts,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', Rule::enum(RoleName::class)],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ]);

        $users = User::query()
            ->with(['department', 'roles', 'creator:id,name'])
            ->when($filters['search'] ?? null, function ($q, $search) {
                // « % » et « _ » saisis sont cherchés tels quels (échappement « ! », valable sous MySQL et SQLite).
                $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';
                $q->where(fn ($q) => $q
                    ->whereRaw("name like ? escape '!'", [$pattern])
                    ->orWhereRaw("email like ? escape '!'", [$pattern]));
            })
            ->when($filters['role'] ?? null, fn ($q, $role) => $q->role($role))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('is_active', $status === 'active'))
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString();

        $lockedUntil = $this->lockouts->lockedUntilMany($users->pluck('email'));
        $users->through(fn (User $user) => new AdminUserResource($user, $lockedUntil[$user->email] ?? null));

        return AdminUserResource::collection($users);
    }

    public function show(User $user): AdminUserResource
    {
        return new AdminUserResource(
            $user->load(['department', 'creator:id,name']),
            $this->lockouts->lockedUntilMany([$user->email])[$user->email] ?? null,
        );
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        [$user, $temporary] = $this->admin->create($request->validated(), $request->user());

        return (new AdminUserResource($user))
            ->additional([
                'temporary_password' => $temporary,
                'message' => 'Compte créé. Communiquez ce mot de passe temporaire à la personne : il ne sera plus affiché.',
            ])
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateUserRequest $request, User $user): AdminUserResource
    {
        return new AdminUserResource($this->admin->update($user, $request->validated(), $request->user()));
    }

    public function deactivate(Request $request, User $user): AdminUserResource
    {
        return new AdminUserResource($this->admin->deactivate($user, $request->user()));
    }

    public function activate(Request $request, User $user): AdminUserResource
    {
        return new AdminUserResource($this->admin->activate($user, $request->user()));
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $temporary = $this->admin->resetPassword($user, $request->user());

        return response()->json([
            'temporary_password' => $temporary,
            'message' => 'Nouveau mot de passe temporaire généré. Toutes les sessions de ce compte ont été fermées.',
        ]);
    }

    public function unlock(Request $request, User $user): JsonResponse
    {
        $this->admin->unlock($user, $request->user());

        return response()->json(['message' => 'Le compte a été déverrouillé.']);
    }
}
