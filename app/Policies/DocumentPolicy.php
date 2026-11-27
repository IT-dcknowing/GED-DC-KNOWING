<?php

namespace App\Policies;

use App\Enums\PermissionName;
use App\Models\Document;
use App\Models\Folder;
use App\Models\User;

class DocumentPolicy
{
    public function view(User $user, Document $document): bool
    {
        $folder = $document->folder;

        return $folder ? $user->can('view', $folder) : false;
    }

    public function create(User $user, Folder $folder): bool
    {
        if (! $user->can('view', $folder)) {
            return false;
        }

        if (! $folder->canAcceptDocuments()) {
            return false;
        }

        return $user->hasPermissionTo(PermissionName::DocumentsUpload->value);
    }

    public function download(User $user, Document $document): bool
    {
        if (! $this->view($user, $document)) {
            return false;
        }

        return $user->hasPermissionTo(PermissionName::DocumentsDownload->value);
    }

    public function delete(User $user, Document $document): bool
    {
        if (! $this->view($user, $document)) {
            return false;
        }

        if ($user->hasPermissionTo(PermissionName::DocumentsDelete->value)) {
            return true;
        }

        return $document->uploaded_by === $user->id;
    }
}
