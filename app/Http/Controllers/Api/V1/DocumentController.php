<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Documents\StoreDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Models\Document;
use App\Models\Folder;
use App\Services\Documents\DocumentStorageService;
use App\Services\Security\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function __construct(
        private readonly DocumentStorageService $service,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $folderId = $request->integer('folder_id');
        $folder = Folder::findOrFail($folderId);

        $this->authorize('view', $folder);

        $documents = Document::query()
            ->where('folder_id', $folder->id)
            ->with('uploader:id,name')
            ->orderByDesc('created_at')
            ->get();

        return DocumentResource::collection($documents);
    }

    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $folder = Folder::findOrFail($request->integer('folder_id'));

        $this->authorize('create', [Document::class, $folder]);

        $document = $this->service->store(
            folder: $folder,
            file: $request->file('file'),
            docType: $request->string('doc_type')->toString(),
            statusSuffix: $request->string('status_suffix')->toString(),
            subject: $request->string('subject')->toString(),
            actor: $request->user(),
        );

        return (new DocumentResource($document))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function download(Request $request, Document $document): StreamedResponse
    {
        $document->loadMissing('folder');
        $this->authorize('download', $document);

        if (! Storage::disk($document->storage_disk)->exists($document->storage_path)) {
            abort(Response::HTTP_NOT_FOUND, 'Le fichier physique est introuvable.');
        }

        $this->audit->log(AuditEvent::DocumentDownloaded, true, details: [
            'document' => $document->auditReference(),
        ], actor: $request->user());

        return Storage::disk($document->storage_disk)->download(
            $document->storage_path,
            $document->normalized_name,
            ['Content-Type' => $document->mime_type]
        );
    }

    public function destroy(Request $request, Document $document): JsonResponse
    {
        $document->loadMissing('folder');
        $this->authorize('delete', $document);

        $this->service->delete($document, $request->user());

        return response()->json(['message' => 'Document supprimé avec succès.']);
    }
}
