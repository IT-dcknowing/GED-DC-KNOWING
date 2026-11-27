<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lot 2.2 : Arborescence et modèle de dossier client.
     */
    public function up(): void
    {
        Schema::create('folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('folders')->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->string('name', 160);
            $table->string('slug', 180);
            $table->string('path', 500)->index();
            $table->unsignedTinyInteger('depth')->default(0);
            $table->string('nature', 32);
            $table->boolean('is_locked')->default(true);
            $table->boolean('is_restricted')->default(false);
            $table->boolean('is_readonly')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['parent_id', 'slug']);
            $table->index(['nature', 'is_locked']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('folders');
    }
};
