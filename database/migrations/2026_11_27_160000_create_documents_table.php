<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('folder_id')->constrained('folders')->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->string('doc_type', 32);
            $table->string('status_suffix', 32);
            $table->string('subject', 120);
            $table->string('original_name', 255);
            $table->string('normalized_name', 255);
            $table->string('extension', 16);
            $table->string('mime_type', 128);
            $table->unsignedBigInteger('size_bytes');
            $table->string('storage_disk', 32)->default('local');
            $table->string('storage_path', 500);
            $table->string('sha256', 64);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['folder_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
