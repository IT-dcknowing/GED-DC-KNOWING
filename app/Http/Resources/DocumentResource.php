<?php

namespace App\Http\Resources;

use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Document
 */
class DocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $this->id,
            'folder_id' => $this->folder_id,
            'client_id' => $this->client_id,
            'doc_type' => $this->doc_type,
            'status_suffix' => $this->status_suffix,
            'subject' => $this->subject,
            'original_name' => $this->original_name,
            'normalized_name' => $this->normalized_name,
            'extension' => $this->extension,
            'mime_type' => $this->mime_type,
            'size_bytes' => $this->size_bytes,
            'uploaded_by' => $this->whenLoaded('uploader', fn () => $this->uploader ? [
                'id' => $this->uploader->id,
                'name' => $this->uploader->name,
            ] : null),
            'can_download' => $user ? $user->can('download', $this->resource) : false,
            'can_delete' => $user ? $user->can('delete', $this->resource) : false,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
