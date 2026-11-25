<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Departments\StoreDepartmentRequest;
use App\Http\Requests\Departments\UpdateDepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Models\Department;
use App\Policies\DepartmentPolicy;
use App\Services\Organisation\DepartmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/**
 * Module Départements (lot 1.3). Les droits sont vérifiés par DepartmentPolicy (D1, D2),
 * en plus de la permission departments.manage posée sur les routes d'écriture.
 * Aucune suppression : un département se désactive (D6).
 */
class DepartmentController extends Controller
{
    public function __construct(
        private readonly DepartmentService $departments,
        private readonly DepartmentPolicy $policy,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Department::class);
        $user = $request->user();

        $departments = Department::query()
            ->with('manager:id,name')
            ->withActiveMembersCount()
            // Le Responsable de Département ne voit que le sien (aucun s'il n'est rattaché à aucun).
            ->unless($this->policy->seesAll($user), fn ($q) => $q->whereKey($user->department_id ?? 0))
            ->orderBy('name')
            ->get();

        return DepartmentResource::collection($departments);
    }

    public function show(Department $department): DepartmentResource
    {
        Gate::authorize('view', $department);

        return new DepartmentResource($this->loadDetail($department));
    }

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        Gate::authorize('create', Department::class);
        $department = $this->departments->create($request->validated(), $request->user());

        return (new DepartmentResource($this->loadDetail($department)))
            ->additional(['message' => 'Département créé. Rattachez-y ses collaborateurs depuis « Utilisateurs et rôles », puis désignez son responsable.'])
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateDepartmentRequest $request, Department $department): DepartmentResource
    {
        Gate::authorize('update', $department);

        return new DepartmentResource($this->loadDetail(
            $this->departments->update($department, $request->validated(), $request->user())
        ));
    }

    public function deactivate(Request $request, Department $department): DepartmentResource
    {
        Gate::authorize('update', $department);

        return new DepartmentResource($this->loadDetail($this->departments->deactivate($department, $request->user())));
    }

    public function activate(Request $request, Department $department): DepartmentResource
    {
        Gate::authorize('update', $department);

        return new DepartmentResource($this->loadDetail($this->departments->activate($department, $request->user())));
    }

    private function loadDetail(Department $department): Department
    {
        return $department
            ->load([
                'manager:id,name',
                'creator:id,name',
                'users' => fn ($q) => $q->with('roles')->orderByDesc('is_active')->orderBy('name'),
            ])
            ->loadCount(['users as active_members_count' => fn ($q) => $q->where('is_active', true)]);
    }
}
