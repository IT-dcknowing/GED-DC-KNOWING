<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Échecs de connexion consécutifs par adresse e-mail (règles A4, A5, A6).
     * L'adresse est stockée sous forme d'empreinte SHA-256 : on compte aussi les adresses
     * inconnues (réponse identique) sans conserver en clair des saisies erronées.
     */
    public function up(): void
    {
        Schema::create('login_lockouts', function (Blueprint $table) {
            $table->char('email_hash', 64)->primary();
            $table->unsignedSmallInteger('failed_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();
            $table->timestamp('updated_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_lockouts');
    }
};
