<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'folder_id', 'client_id', 'uploaded_by', 'doc_type', 'status_suffix',
    'subject', 'original_name', 'normalized_name', 'extension', 'mime_type',
    'size_bytes', 'storage_disk', 'storage_path', 'sha256',
])]
class Document extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Folder, $this>
     */
    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
    }

    /**
     * @return BelongsTo<Client, $this>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * @return array{id: int, name: string, folder_id: int}
     */
    public function auditReference(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->normalized_name,
            'folder_id' => $this->folder_id,
        ];
    }
}
