<?php

namespace App\Services\Documents;

use App\Enums\AuditEvent;
use App\Models\Document;
use App\Models\Folder;
use App\Models\User;
use App\Services\Security\AuditLogger;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;

class DocumentStorageService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function store(
        Folder $folder,
        UploadedFile $file,
        string $docType,
        string $statusSuffix,
        string $subject,
        User $actor,
    ): Document {
        if (! $folder->canAcceptDocuments()) {
            throw new InvalidArgumentException(sprintf(
                'Le dépôt de documents n\'est pas autorisé dans un dossier de type "%s".',
                $folder->nature->label()
            ));
        }

        $folder->loadMissing('client');

        $today = date('Ymd');
        $clientCode = $folder->client?->code ?? 'CABINET';
        $cleanType = preg_replace('/[^A-Z0-9_-]/', '_', strtoupper(trim($docType))) ?: 'DOC';
        $cleanStatus = preg_replace('/[^A-Z0-9_-]/', '_', strtoupper(trim($statusSuffix))) ?: 'SIGNE';
        $cleanSubject = preg_replace('/[^a-zA-Z0-9_-]/', '_', trim($subject)) ?: 'Document';
        $cleanSubject = trim($cleanSubject, '_');
        if ($cleanSubject === '') {
            $cleanSubject = 'Document';
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');
        $baseNormalized = sprintf('%s_%s_%s_%s_%s', $today, $clientCode, $cleanType, $cleanSubject, $cleanStatus);
        $normalizedName = $this->resolveUniqueNormalizedName($folder->id, $baseNormalized, $extension);

        $disk = 'local';
        $directory = sprintf('documents/%d', $folder->id);
        $storedName = sprintf('%s.%s', (string) Str::uuid(), $extension);
        $storagePath = $file->storeAs($directory, $storedName, $disk);

        if ($storagePath === false) {
            throw new InvalidArgumentException('Impossible d\'enregistrer le fichier sur le disque.');
        }

        $absolutePath = Storage::disk($disk)->path($storagePath);
        $sha256 = is_file($absolutePath) ? hash_file('sha256', $absolutePath) : hash('sha256', $normalizedName);
        $mimeType = $file->getMimeType() ?: $file->getClientMimeType() ?: 'application/octet-stream';
        $sizeBytes = $file->getSize() ?: 0;

        return DB::transaction(function () use (
            $folder,
            $actor,
            $cleanType,
            $cleanStatus,
            $subject,
            $file,
            $normalizedName,
            $extension,
            $mimeType,
            $sizeBytes,
            $disk,
            $storagePath,
            $sha256,
        ) {
            $document = Document::create([
                'folder_id' => $folder->id,
                'client_id' => $folder->client_id,
                'uploaded_by' => $actor->id,
                'doc_type' => $cleanType,
                'status_suffix' => $cleanStatus,
                'subject' => trim($subject),
                'original_name' => $file->getClientOriginalName(),
                'normalized_name' => $normalizedName,
                'extension' => $extension,
                'mime_type' => $mimeType,
                'size_bytes' => $sizeBytes,
                'storage_disk' => $disk,
                'storage_path' => $storagePath,
                'sha256' => $sha256,
            ]);

            $this->audit->log(AuditEvent::DocumentUploaded, true, details: [
                'document' => $document->auditReference(),
                'folder' => $folder->auditReference(),
                'size_bytes' => $sizeBytes,
            ], actor: $actor);

            return $document->load('uploader:id,name');
        });
    }

    public function delete(Document $document, User $actor): void
    {
        DB::transaction(function () use ($document, $actor) {
            $ref = $document->auditReference();
            $document->delete();

            $this->audit->log(AuditEvent::DocumentDeleted, true, details: [
                'document' => $ref,
            ], actor: $actor);
        });
    }

    private function resolveUniqueNormalizedName(int $folderId, string $baseName, string $extension): string
    {
        $candidate = sprintf('%s.%s', $baseName, $extension);
        $counter = 2;

        while (Document::where('folder_id', $folderId)->where('normalized_name', $candidate)->exists()) {
            $candidate = sprintf('%s_%d.%s', $baseName, $counter, $extension);
            $counter++;
        }

        return $candidate;
    }
}
