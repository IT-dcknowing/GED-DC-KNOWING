<?php

namespace App\Http\Resources;

use App\Models\Folder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Folder
 */
class FolderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'client_id' => $this->client_id,
            'client' => $this->whenLoaded('client', fn() => $this->client ? [
                'id' => $this->client->id,
                'code' => $this->client->code,
                'name' => $this->client->name,
            ] : null),
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'path' => $this->path,
            'depth' => $this->depth,
            'sort_order' => $this->sort_order,
            'nature' => $this->nature->value,
            'nature_label' => $this->nature->label(),
            'is_locked' => $this->is_locked,
            'is_restricted' => $this->is_restricted,
            'is_readonly' => $this->is_readonly,
            'can_upload' => $this->canAcceptDocuments(),
            'can_have_custom_subfolders' => $user ? $user->can('create', $this->resource) : $this->canHaveCustomSubfolders(),
            'can_rename' => $user ? $user->can('update', $this->resource) : false,
            'can_delete' => $user ? $user->can('delete', $this->resource) : false,
            'breadcrumbs' => $this->breadcrumbs(),
            'children_count' => $this->whenCounted('children'),
            'children' => FolderResource::collection($this->whenLoaded('children')),
            'created_by' => $this->whenLoaded('creator', fn() => $this->creator?->name),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
