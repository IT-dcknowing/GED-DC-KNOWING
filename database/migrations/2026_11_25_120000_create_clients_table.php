<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lot 2.1 (Clients) : référentiel des clients et départements de suivi (RG-02).
     * Aucune suppression : un client est radié plus tard (lot 5.2), son code est conservé (C4).
     */
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('name', 160);
            $table->string('legal_form', 30)->nullable();
            $table->string('sector', 120)->nullable();
            $table->string('tax_regime', 40)->nullable();
            $table->string('rccm', 60)->nullable();
            $table->string('dfe', 60)->nullable();
            $table->string('address', 255)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('email', 160)->nullable();
            $table->string('contact_name', 120)->nullable();
            $table->date('started_on')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('radiated_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('name');
        });

        Schema::create('client_department', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['client_id', 'department_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_department');
        Schema::dropIfExists('clients');
    }
};
