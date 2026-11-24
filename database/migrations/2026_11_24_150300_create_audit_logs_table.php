<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Journal d'audit en ajout seul (règles F1 à F5). Aucune mise à jour ni suppression
     * n'est permise par l'application. Ne contient jamais de mot de passe ni de jeton.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->timestamp('occurred_at', precision: 3)->index();
            $table->string('event', 64)->index();
            $table->string('result', 16);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('email')->nullable()->index();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->json('details')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
