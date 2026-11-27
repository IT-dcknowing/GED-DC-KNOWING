<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Folders\StoreFolderRequest;
use App\Http\Requests\Folders\UpdateFolderRequest;
use App\Http\Resources\FolderResource;
use App\Models\Folder;
use App\Services\Organisation\FolderHierarchyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

/**
 * Contrôleur de l'Explorateur et de l'arborescence des dossiers (Lot 2.2).
 */
class FolderController extends Controller
{
    public function __construct(private readonly FolderHierarchyService $service)
    {
    }

    /**
     * Arborescence hiérarchique complète ou filtrée pour le panneau de gauche.
     */
    public function tree(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        Gate::authorize('viewAny', Folder::class);

        $clientId = $request->query('client_id');

        $query = Folder::query()
            ->with(['client:id,code,name'])
            ->withCount('children')
            ->orderBy('sort_order')
            ->orderBy('name');

        if (!$user->roleName()?->hasCabinetWideScope()) {
            $query->where('is_restricted', false);
        }

        if ($clientId) {
            $query->where(function ($sub) use ($clientId) {
                $sub->whereNull('client_id')->orWhere('client_id', $clientId);
            });
        }

        // Filtrer les dossiers clients selon le département pour les rôles non-transverses
        $all = $query->get()->filter(fn(Folder $f) => $user->can('view', $f));

        // Construction de l'arbre en mémoire en O(N)
        $grouped = $all->groupBy('parent_id');
        foreach ($all as $folder) {
            $folder->setRelation('children', $grouped->get($folder->id, collect())->values());
        }

        $roots = $grouped->get(null, collect())->values();

        return FolderResource::collection($roots);
    }

    /**
     * Liste des dossiers ou consultation d'un dossier avec son contenu.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        Gate::authorize('viewAny', Folder::class);

        $parentId = $request->query('parent_id');
        $clientId = $request->query('client_id');

        $query = Folder::query()->with(['client:id,code,name', 'creator:id,name'])->withCount('children');

        if ($parentId !== null && $parentId !== '') {
            $query->where('parent_id', $parentId);
        } elseif ($clientId !== null && $clientId !== '') {
            $query->where('client_id', $clientId);
        } else {
            $query->whereNull('parent_id');
        }

        if (!$user->roleName()?->hasCabinetWideScope()) {
            $query->where('is_restricted', false);
        }

        $folders = $query->orderBy('sort_order')->orderBy('name')->get();

        return FolderResource::collection($folders);
    }

    /**
     * Détails complets d'un dossier pour le volet central et le volet de droite.
     */
    public function show(Request $request, Folder $folder): JsonResponse
    {
        Gate::authorize('view', $folder);

        $folder->load([
            'client:id,code,name',
            'creator:id,name',
            'children' => fn($q) => $q->withCount('children')->orderBy('sort_order')->orderBy('name'),
        ]);

        return response()->json([
            'data' => (new FolderResource($folder))->resolve(),
        ]);
    }

    /**
     * Création d'un sous-dossier libre.
     */
    public function store(StoreFolderRequest $request): JsonResponse
    {
        $parent = Folder::findOrFail($request->validated('parent_id'));
        Gate::authorize('create', [Folder::class, $parent]);

        try {
            $folder = $this->service->createCustomFolder(
                parent: $parent,
                name: $request->validated('name'),
                description: $request->validated('description'),
                actor: $request->user()
            );

            return response()->json([
                'message' => 'Dossier créé avec succès.',
                'data' => (new FolderResource($folder->load(['client:id,code,name', 'creator:id,name'])))->resolve(),
            ], Response::HTTP_CREATED);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    /**
     * Renommage d'un sous-dossier libre.
     */
    public function update(UpdateFolderRequest $request, Folder $folder): JsonResponse
    {
        Gate::authorize('update', $folder);

        try {
            $updated = $this->service->renameCustomFolder(
                folder: $folder,
                newName: $request->validated('name'),
                actor: $request->user()
            );

            return response()->json([
                'message' => 'Dossier renommé avec succès.',
                'data' => (new FolderResource($updated->load(['client:id,code,name', 'creator:id,name'])))->resolve(),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    /**
     * Suppression d'un sous-dossier libre.
     */
    public function destroy(Request $request, Folder $folder): JsonResponse
    {
        Gate::authorize('delete', $folder);

        try {
            $this->service->deleteCustomFolder($folder, $request->user());

            return response()->json([
                'message' => 'Dossier supprimé avec succès.',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }
}
